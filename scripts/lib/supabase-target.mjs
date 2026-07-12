import { chmod, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

import { assertLocalBindings } from "./supabase-local.mjs";

const PROFILE_KEYS = new Set(["SUPABASE_URL", "SUPABASE_ANON_KEY"]);

async function readTargetContract(repoRoot) {
  const raw = await readFile(
    path.join(repoRoot, "config", "supabase-targets.json"),
    "utf8"
  );
  return JSON.parse(raw);
}

async function readProfile(profilePath) {
  const raw = await readFile(profilePath, "utf8");
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

export async function loadSupabaseTarget(repoRoot, target) {
  if (target !== "local" && target !== "remote") {
    throw new Error(`Unknown Supabase target: ${target}`);
  }

  const profilePath = path.join(repoRoot, `.env.supabase.${target}`);
  const [profile, contract] = await Promise.all([
    readProfile(profilePath),
    readTargetContract(repoRoot)
  ]);

  assertTargetUrl(target, profile.SUPABASE_URL, contract);
  if (target === "local") {
    assertLocalBindings();
  }

  return profile;
}

export function sanitizedChildEnvironment(profile, target) {
  const childEnvironment = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (
      /^(SUPABASE_|POSTGRES_|PGPASSWORD$|DATABASE_URL$)/.test(key) &&
      !PROFILE_KEYS.has(key)
    ) {
      continue;
    }
    childEnvironment[key] = value;
  }

  return {
    ...childEnvironment,
    SUPABASE_URL: profile.SUPABASE_URL,
    SUPABASE_ANON_KEY: profile.SUPABASE_ANON_KEY,
    KIMENOSUKE_SUPABASE_TARGET: target
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

  const saved = await readProfile(destination);
  assertTargetUrl("remote", saved.SUPABASE_URL, contract);
  await unlink(source);
}
