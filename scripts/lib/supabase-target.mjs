import { constants as fsConstants } from "node:fs";
import { chmod, lstat, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

import { assertLocalBindings } from "./supabase-local.mjs";
import {
  assertProfileMayProceed,
  preflightProfileResources,
  PROFILE_RESOURCE_STATES
} from "./supabase-local-isolation.mjs";
import { resolveLocalProfile } from "./supabase-local-profile.mjs";
import { sanitizedEventCreatorEnvironment } from "./event-creator-profile.mjs";

const PROFILE_KEYS = new Set(["SUPABASE_URL", "SUPABASE_ANON_KEY"]);

async function readTargetContract(repoRoot) {
  const raw = await readFile(
    path.join(repoRoot, "config", "supabase-targets.json"),
    "utf8"
  );
  return JSON.parse(raw);
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

export async function readSupabaseTargetProfile(profilePath, { afterOpenForTest = null } = {}) {
  let handle;
  let openedStat;
  let raw;
  try {
    handle = await open(profilePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    openedStat = await handle.stat();
    if (!openedStat.isFile() || (openedStat.mode & 0o777) !== 0o600) {
      throw new Error(`${path.basename(profilePath)} must be a regular mode-0600 file.`);
    }
    await afterOpenForTest?.();
    raw = await handle.readFile("utf8");
    const finalPathStat = await lstat(profilePath);
    if (finalPathStat.isSymbolicLink() || !sameFileIdentity(openedStat, finalPathStat)) {
      throw new Error(`${path.basename(profilePath)} changed during validation.`);
    }
  } finally {
    await handle?.close();
  }
  const profile = parseEnv(raw);
  const keys = Object.keys(profile);

  if (
    keys.length !== PROFILE_KEYS.size ||
    keys.some((key) => !PROFILE_KEYS.has(key)) ||
    [...PROFILE_KEYS].some((key) => !profile[key])
  ) {
    throw new Error(
      `${path.basename(profilePath)} must contain only SUPABASE_URL and SUPABASE_ANON_KEY.`
    );
  }

  return profile;
}

function effectivePort(url) {
  if (url.port) {
    return url.port;
  }
  return url.protocol === "https:" ? "443" : "80";
}

function assertTargetUrl(target, rawUrl, contract) {
  const url = new URL(rawUrl);
  const expected = contract[target];
  if (!expected) {
    throw new Error(`Unknown Supabase target: ${target}`);
  }

  if (
    url.protocol !== expected.protocol ||
    url.hostname !== expected.hostname ||
    effectivePort(url) !== expected.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(`Supabase ${target} URL does not match the tracked target contract.`);
  }

  if (target === "local" && rawUrl !== "http://127.0.0.1:54321") {
    throw new Error("The local Supabase URL must match http://127.0.0.1:54321 exactly.");
  }
}

function assertHostedTargetIdentity(target, contract) {
  const expected = contract[target];
  if (
    !expected ||
    expected.environment !== (target === "qa" ? "qa" : "production") ||
    typeof expected.project !== "string" ||
    typeof expected.ref !== "string"
  ) {
    throw new Error(`Supabase ${target} identity contract is incomplete.`);
  }
  if (target === "qa" && expected.fixtureCleanup !== "TASK_CORRELATED_ONLY") {
    throw new Error("Supabase QA fixture cleanup contract is invalid.");
  }
}

function assertN9TargetUrl(rawUrl, profile) {
  const url = new URL(rawUrl);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    effectivePort(url) !== String(profile.ports.api) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error("The N9 local Supabase URL does not match its exact profile.");
  }
}

export async function loadSupabaseTarget(repoRoot, target) {
  if (target !== "local" && target !== "remote" && target !== "qa" && target !== "n9-stage1") {
    throw new Error(`Unknown Supabase target: ${target}`);
  }

  if (target === "n9-stage1") {
    const localProfile = await resolveLocalProfile(repoRoot, target);
    const profile = await readSupabaseTargetProfile(localProfile.envPath);
    assertN9TargetUrl(profile.SUPABASE_URL, localProfile);
    const resources = assertProfileMayProceed(
      await preflightProfileResources(localProfile)
    );
    if (resources.state !== PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING) {
      throw new Error("The N9 local Supabase stack is not running.");
    }
    return profile;
  }

  const profilePath = path.join(repoRoot, `.env.supabase.${target}`);
  const [profile, contract] = await Promise.all([
    readSupabaseTargetProfile(profilePath),
    readTargetContract(repoRoot)
  ]);

  if (target === "qa" || target === "remote") {
    assertHostedTargetIdentity(target, contract);
  }
  assertTargetUrl(target, profile.SUPABASE_URL, contract);
  if (target === "local") {
    assertLocalBindings();
  }

  return profile;
}

export function sanitizedChildEnvironment(
  profile,
  target,
  eventCreatorProfile = null
) {
  if (!["local", "remote", "qa", "n9-stage1"].includes(target)) {
    throw new Error(`Unknown Supabase target: ${target}`);
  }
  if (target === "remote" && eventCreatorProfile !== null) {
    throw new Error(
      "Remote Supabase target cannot receive an Event creator profile."
    );
  }

  const childEnvironment = {};
  for (const [key, value] of Object.entries(
    sanitizedEventCreatorEnvironment(process.env)
  )) {
    if (key === "KIMENOSUKE_SUPABASE_TARGET") {
      continue;
    }
    if (
      /^(SUPABASE_|POSTGRES_|PGPASSWORD$|DATABASE_URL$)/.test(key) &&
      !PROFILE_KEYS.has(key)
    ) {
      continue;
    }
    childEnvironment[key] = value;
  }

  const selectedTargetEnvironment =
    target === "local" || target === "qa" || target === "n9-stage1"
      ? { KIMENOSUKE_SUPABASE_TARGET: target }
      : {};
  const selectedCreatorEnvironment = eventCreatorProfile
    ? sanitizedEventCreatorEnvironment({}, eventCreatorProfile)
    : {};

  return {
    ...childEnvironment,
    SUPABASE_URL: profile.SUPABASE_URL,
    SUPABASE_ANON_KEY: profile.SUPABASE_ANON_KEY,
    ...selectedTargetEnvironment,
    ...selectedCreatorEnvironment
  };
}

export async function migrateLegacyRemoteProfile(repoRoot) {
  const source = path.join(repoRoot, ".env.local");
  const destination = path.join(repoRoot, ".env.supabase.remote");
  const raw = await readFile(source, "utf8");
  const parsed = parseEnv(raw);
  const keys = Object.keys(parsed);

  if (
    keys.length !== PROFILE_KEYS.size ||
    keys.some((key) => !PROFILE_KEYS.has(key)) ||
    [...PROFILE_KEYS].some((key) => !parsed[key])
  ) {
    throw new Error(
      ".env.local must contain only SUPABASE_URL and SUPABASE_ANON_KEY before migration."
    );
  }

  const contract = await readTargetContract(repoRoot);
  assertTargetUrl("remote", parsed.SUPABASE_URL, contract);

  const temporary = `${destination}.tmp-${process.pid}`;
  await writeFile(temporary, raw.endsWith("\n") ? raw : `${raw}\n`, {
    mode: 0o600,
    flag: "wx"
  });
  await chmod(temporary, 0o600);
  await rename(temporary, destination);
  await chmod(destination, 0o600);

  const saved = await readSupabaseTargetProfile(destination);
  assertTargetUrl("remote", saved.SUPABASE_URL, contract);
  await unlink(source);
}
