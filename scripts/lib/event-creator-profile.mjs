import { constants as fsConstants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

import { loadN5EventCreatorLocalProfile } from "./n5-event-creator-local-profile.mjs";

export const EVENT_CREATOR_DATABASE_URL =
  "KIMENOSUKE_EVENT_CREATOR_DATABASE_URL";
export const EVENT_CREATOR_DATABASE_CA_PEM =
  "KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM";

export const N9_LOCAL_EVENT_CREATOR_PROFILE = ".env.n9-event-creator.local";
export const QA_EVENT_CREATOR_PROFILE = ".env.n9-event-creator.qa";

const CREATOR_KEYS = new Set([
  EVENT_CREATOR_DATABASE_URL,
  EVENT_CREATOR_DATABASE_CA_PEM
]);

function profileError(name) {
  return new Error(`${name} Event creator profile is invalid.`);
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

async function readCreatorProfile(profilePath, name, { afterOpenForTest = null } = {}) {
  let handle;
  let opened;
  let raw;
  try {
    handle = await open(profilePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    opened = await handle.stat();
    const uid = process.getuid?.();
    const gid = process.getgid?.();
    if (
      !opened.isFile() ||
      (opened.mode & 0o777) !== 0o600 ||
      (uid !== undefined && opened.uid !== uid) ||
      (gid !== undefined && opened.gid !== gid)
    ) {
      throw profileError(name);
    }
    await afterOpenForTest?.();
    raw = await handle.readFile("utf8");
    const finalPath = await lstat(profilePath);
    if (finalPath.isSymbolicLink() || !sameIdentity(opened, finalPath)) {
      throw profileError(name);
    }
  } catch (error) {
    if (error?.message === `${name} Event creator profile is invalid.`) {
      throw error;
    }
    throw profileError(name);
  } finally {
    await handle?.close();
  }

  const values = parseEnv(raw);
  const keys = Object.keys(values).sort();
  if (
    keys.length !== CREATOR_KEYS.size ||
    keys.some((key) => !CREATOR_KEYS.has(key)) ||
    !values[EVENT_CREATOR_DATABASE_URL] ||
    values[EVENT_CREATOR_DATABASE_CA_PEM] === undefined
  ) {
    throw profileError(name);
  }
  return values;
}

function parseDatabaseUrl(rawValue, name) {
  if (!rawValue || rawValue.trim() !== rawValue) {
    throw profileError(name);
  }
  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw profileError(name);
  }
  if (
    (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") ||
    !parsed.password ||
    parsed.pathname !== "/postgres" ||
    parsed.search ||
    parsed.hash
  ) {
    throw profileError(name);
  }
  let username;
  try {
    username = decodeURIComponent(parsed.username);
  } catch {
    throw profileError(name);
  }
  return { parsed, username };
}

function assertCertificate(value, name) {
  const normalized = value.trim();
  if (
    !normalized.startsWith("-----BEGIN CERTIFICATE-----\n") ||
    !normalized.endsWith("\n-----END CERTIFICATE-----") ||
    normalized.slice(
      "-----BEGIN CERTIFICATE-----\n".length,
      -"\n-----END CERTIFICATE-----".length
    ).trim().length === 0 ||
    normalized.includes("\0")
  ) {
    throw profileError(name);
  }
  return normalized;
}

export async function loadN9EventCreatorLocalProfile(repoRoot, options = {}) {
  const profilePath = path.join(repoRoot, N9_LOCAL_EVENT_CREATOR_PROFILE);
  const values = await readCreatorProfile(profilePath, "N9 local", options);
  const { parsed, username } = parseDatabaseUrl(
    values[EVENT_CREATOR_DATABASE_URL],
    "N9 local"
  );
  if (
    parsed.hostname !== "127.0.0.1" ||
    parsed.port !== "55322" ||
    username !== "kimenosuke_event_creator" ||
    values[EVENT_CREATOR_DATABASE_CA_PEM] !== ""
  ) {
    throw profileError("N9 local");
  }
  return values;
}

export async function loadQaEventCreatorProfile(repoRoot, options = {}) {
  const profilePath = path.join(repoRoot, QA_EVENT_CREATOR_PROFILE);
  const values = await readCreatorProfile(profilePath, "QA", options);
  const { parsed, username } = parseDatabaseUrl(
    values[EVENT_CREATOR_DATABASE_URL],
    "QA"
  );
  if (
    !parsed.hostname.endsWith(".pooler.supabase.com") ||
    parsed.port !== "6543" ||
    username !== "kimenosuke_event_creator.twcbycyyrxbovtgiqaun"
  ) {
    throw profileError("QA");
  }
  return {
    ...values,
    [EVENT_CREATOR_DATABASE_CA_PEM]: assertCertificate(
      values[EVENT_CREATOR_DATABASE_CA_PEM],
      "QA"
    )
  };
}

export async function loadEventCreatorProfileForTarget(repoRoot, target) {
  if (target === "local") return loadN5EventCreatorLocalProfile(repoRoot);
  if (target === "n9-stage1") return loadN9EventCreatorLocalProfile(repoRoot);
  if (target === "qa") return loadQaEventCreatorProfile(repoRoot);
  if (target === "remote") return null;
  throw new Error(`Unknown Supabase creator target: ${target}`);
}

export function sanitizedEventCreatorEnvironment(environment, profile = null) {
  const sanitized = {};
  for (const [key, value] of Object.entries(environment)) {
    if (CREATOR_KEYS.has(key)) continue;
    sanitized[key] = value;
  }
  if (profile === null) return sanitized;

  const keys = Object.keys(profile).sort();
  const n5Keys = [EVENT_CREATOR_DATABASE_URL];
  const fullKeys = [...CREATOR_KEYS].sort();
  if (
    keys.join(",") !== n5Keys.join(",") &&
    keys.join(",") !== fullKeys.join(",")
  ) {
    throw new Error("Selected Event creator profile has an invalid key set.");
  }
  if (
    !profile[EVENT_CREATOR_DATABASE_URL] ||
    (keys.length === 2 && profile[EVENT_CREATOR_DATABASE_CA_PEM] === undefined)
  ) {
    throw new Error("Selected Event creator profile is incomplete.");
  }
  return {
    ...sanitized,
    ...(keys.length === 1
      ? { [EVENT_CREATOR_DATABASE_URL]: profile[EVENT_CREATOR_DATABASE_URL] }
      : {
          [EVENT_CREATOR_DATABASE_URL]: profile[EVENT_CREATOR_DATABASE_URL],
          [EVENT_CREATOR_DATABASE_CA_PEM]: profile[EVENT_CREATOR_DATABASE_CA_PEM]
        })
  };
}
