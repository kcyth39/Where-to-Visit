import {
  chmod,
  chown,
  lstat,
  mkdir,
  readFile,
  rename,
  writeFile
} from "node:fs/promises";
import path from "node:path";

export const N5_LOCAL_PROFILE_NAME = ".env.n5-event-creator.local";
export const N5_DATABASE_URL_KEY =
  "KIMENOSUKE_EVENT_CREATOR_DATABASE_URL";
export const N5_DATABASE_CA_KEY =
  "KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM";

function profileError() {
  return new Error("N5 local Event creator profile is invalid.");
}

function credentialProvisioningError() {
  return new Error("N5 local Event creator credential provisioning failed.");
}

function assertGeneratedPassword(password) {
  if (
    typeof password !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(password)
  ) {
    throw credentialProvisioningError();
  }
}

function assertLocalDatabaseUrl(rawValue) {
  if (!rawValue || rawValue.trim() !== rawValue) {
    throw profileError();
  }

  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw profileError();
  }

  let username;
  try {
    username = decodeURIComponent(parsed.username);
  } catch {
    throw profileError();
  }

  if (
    (parsed.protocol !== "postgres:" &&
      parsed.protocol !== "postgresql:") ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.port !== "54322" ||
    parsed.pathname !== "/postgres" ||
    username !== "kimenosuke_event_creator" ||
    !parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw profileError();
  }
}

export async function assertN5EventCreatorLocalProfileAbsent(repoRoot) {
  const profilePath = path.join(repoRoot, N5_LOCAL_PROFILE_NAME);
  try {
    await lstat(profilePath);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw credentialProvisioningError();
  }
  throw credentialProvisioningError();
}

export async function loadN5EventCreatorLocalProfile(repoRoot) {
  const profilePath = path.join(repoRoot, N5_LOCAL_PROFILE_NAME);
  let stats;
  try {
    stats = await lstat(profilePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw profileError();
  }

  const currentUser = process.getuid?.();
  const currentGroup = process.getgid?.();
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    (stats.mode & 0o777) !== 0o600 ||
    (currentUser !== undefined && stats.uid !== currentUser) ||
    (currentGroup !== undefined && stats.gid !== currentGroup)
  ) {
    throw profileError();
  }

  let contents;
  try {
    contents = await readFile(profilePath, "utf8");
  } catch {
    throw profileError();
  }
  const prefix = `${N5_DATABASE_URL_KEY}=`;
  if (
    !contents.endsWith("\n") ||
    contents.includes("\r") ||
    contents.slice(0, -1).includes("\n") ||
    !contents.startsWith(prefix)
  ) {
    throw profileError();
  }

  const databaseUrl = contents.slice(prefix.length, -1);
  assertLocalDatabaseUrl(databaseUrl);
  return { [N5_DATABASE_URL_KEY]: databaseUrl };
}

export async function inspectN5EventCreatorLocalProfile(repoRoot) {
  const profilePath = path.join(repoRoot, N5_LOCAL_PROFILE_NAME);
  const profile = await loadN5EventCreatorLocalProfile(repoRoot);
  if (profile === null) {
    throw profileError();
  }
  const stats = await lstat(profilePath);
  return {
    profilePath,
    mode: stats.mode & 0o777,
    keyCount: 1,
    localhostTarget: true,
    finalNewline: true
  };
}

export async function quarantineN5EventCreatorLocalProfile(
  repoRoot,
  quarantineDirectory
) {
  if (!path.isAbsolute(quarantineDirectory)) {
    throw credentialProvisioningError();
  }

  const profilePath = path.join(repoRoot, N5_LOCAL_PROFILE_NAME);
  try {
    await inspectN5EventCreatorLocalProfile(repoRoot);
    const parentStats = await lstat(path.dirname(quarantineDirectory));
    const currentUser = process.getuid?.();
    const currentGroup = process.getgid?.();
    if (
      !parentStats.isDirectory() ||
      parentStats.isSymbolicLink() ||
      (parentStats.mode & 0o777) !== 0o700 ||
      (currentUser !== undefined && parentStats.uid !== currentUser) ||
      (currentGroup !== undefined && parentStats.gid !== currentGroup)
    ) {
      throw credentialProvisioningError();
    }
    await mkdir(quarantineDirectory, { mode: 0o700 });
    await chmod(quarantineDirectory, 0o700);
    const directoryStats = await lstat(quarantineDirectory);
    if (
      !directoryStats.isDirectory() ||
      directoryStats.isSymbolicLink() ||
      (directoryStats.mode & 0o777) !== 0o700 ||
      (currentUser !== undefined && directoryStats.uid !== currentUser) ||
      (currentGroup !== undefined && directoryStats.gid !== currentGroup)
    ) {
      throw credentialProvisioningError();
    }
    const quarantinedProfilePath = path.join(
      quarantineDirectory,
      N5_LOCAL_PROFILE_NAME
    );
    await rename(profilePath, quarantinedProfilePath);
    const quarantinedStats = await lstat(quarantinedProfilePath);
    if (
      !quarantinedStats.isFile() ||
      quarantinedStats.isSymbolicLink() ||
      (quarantinedStats.mode & 0o777) !== 0o600
    ) {
      throw credentialProvisioningError();
    }
    return {
      quarantineDirectory,
      mode: quarantinedStats.mode & 0o777,
      profileMovedCount: 1
    };
  } catch {
    throw credentialProvisioningError();
  }
}

export async function createN5EventCreatorLocalProfile(
  repoRoot,
  password
) {
  assertGeneratedPassword(password);
  const profilePath = path.join(repoRoot, N5_LOCAL_PROFILE_NAME);
  const databaseUrl =
    `postgresql://kimenosuke_event_creator:${password}` +
    "@127.0.0.1:54322/postgres";
  const contents = `${N5_DATABASE_URL_KEY}=${databaseUrl}\n`;

  try {
    await writeFile(profilePath, contents, {
      flag: "wx",
      mode: 0o600
    });
    const currentUser = process.getuid?.();
    const currentGroup = process.getgid?.();
    if (currentUser !== undefined && currentGroup !== undefined) {
      await chown(profilePath, currentUser, currentGroup);
    }
    await chmod(profilePath, 0o600);
    const stats = await lstat(profilePath);
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      (stats.mode & 0o777) !== 0o600 ||
      (currentUser !== undefined && stats.uid !== currentUser) ||
      (currentGroup !== undefined && stats.gid !== currentGroup) ||
      !contents.endsWith("\n")
    ) {
      throw credentialProvisioningError();
    }
    await loadN5EventCreatorLocalProfile(repoRoot);
  } catch {
    throw credentialProvisioningError();
  }

  return {
    profilePath,
    mode: 0o600,
    keyCount: 1,
    finalNewline: true
  };
}

export function sanitizedN5EventCreatorEnvironment(
  environment,
  profile = null
) {
  const sanitized = {};
  for (const [key, value] of Object.entries(environment)) {
    if (key === N5_DATABASE_URL_KEY || key === N5_DATABASE_CA_KEY) continue;
    sanitized[key] = value;
  }
  return profile ? { ...sanitized, ...profile } : sanitized;
}
