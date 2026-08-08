import { createHash } from "node:crypto";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";

const DESCRIPTOR_PATH = path.join("config", "supabase-local-profiles.json");
const GENERATED_MARKER = ".wtv-local-profile.json";
const SKIPPED_SUPABASE_ENTRIES = new Set([".branches", ".temp", "config.toml"]);
const PROFILE_KEYS = new Set([
  "projectId",
  "networkName",
  "containerSuffix",
  "workdir",
  "generatedWorkdir",
  "envFile",
  "ports"
]);
const PORT_KEYS = ["shadow", "api", "db", "studio", "mailpit", "analytics", "pooler"];
// supabase/config.toml keeps db.pooler.enabled=false. The shadow and pooler
// ports remain reserved for this profile even though neither is a persistent
// host binding in the running local stack.
const EXPECTED_PUBLISHED_PORT_KEYS = ["api", "db", "studio", "mailpit", "analytics"];

function assertPlainObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object.`);
  }
}

function assertSafeToken(value, name, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${name} is invalid.`);
  }
}

function freezeProfile(repoRoot, profileId, raw) {
  assertPlainObject(raw, `Profile ${profileId}`);
  const keys = Object.keys(raw);
  if (keys.length !== PROFILE_KEYS.size || keys.some((key) => !PROFILE_KEYS.has(key))) {
    throw new Error(`Profile ${profileId} has an unexpected field set.`);
  }
  assertSafeToken(profileId, "Profile ID", /^[a-z0-9][a-z0-9-]*$/);
  assertSafeToken(raw.projectId, "Supabase project ID", /^[A-Za-z0-9][A-Za-z0-9-]*$/);
  assertSafeToken(raw.networkName, "Docker network name", /^[a-z0-9][a-z0-9-]*$/);
  if (raw.containerSuffix !== raw.projectId) {
    throw new Error(`Profile ${profileId} container suffix must equal its project ID.`);
  }
  if (typeof raw.generatedWorkdir !== "boolean") {
    throw new Error(`Profile ${profileId} generatedWorkdir must be boolean.`);
  }
  if (
    typeof raw.workdir !== "string" ||
    path.isAbsolute(raw.workdir) ||
    raw.workdir.split(path.sep).includes("..")
  ) {
    throw new Error(`Profile ${profileId} workdir must stay below the repository root.`);
  }
  assertSafeToken(raw.envFile, "Profile env filename", /^\.env\.supabase\.[a-z0-9.-]+$/);
  assertPlainObject(raw.ports, `Profile ${profileId} ports`);
  if (
    Object.keys(raw.ports).length !== PORT_KEYS.length ||
    PORT_KEYS.some((key) => !Number.isInteger(raw.ports[key]) || raw.ports[key] < 1024 || raw.ports[key] > 65535) ||
    new Set(PORT_KEYS.map((key) => raw.ports[key])).size !== PORT_KEYS.length
  ) {
    throw new Error(`Profile ${profileId} ports are invalid or overlap.`);
  }

  const workdir = path.resolve(repoRoot, raw.workdir);
  const relativeWorkdir = path.relative(repoRoot, workdir);
  if (relativeWorkdir.startsWith("..") || path.isAbsolute(relativeWorkdir)) {
    throw new Error(`Profile ${profileId} workdir escapes the repository root.`);
  }
  return Object.freeze({
    id: profileId,
    projectId: raw.projectId,
    networkName: raw.networkName,
    containerSuffix: raw.containerSuffix,
    workdir,
    generatedWorkdir: raw.generatedWorkdir,
    envFile: raw.envFile,
    envPath: path.join(repoRoot, raw.envFile),
    ports: Object.freeze({ ...raw.ports }),
    allReservedPorts: Object.freeze(PORT_KEYS.map((key) => raw.ports[key])),
    expectedPublishedPorts: Object.freeze(
      EXPECTED_PUBLISHED_PORT_KEYS.map((key) => raw.ports[key])
    ),
    ownershipLabel: `wtv.local.profile=${profileId}`
  });
}

export async function loadLocalProfileDescriptor(repoRoot) {
  const raw = JSON.parse(await readFile(path.join(repoRoot, DESCRIPTOR_PATH), "utf8"));
  assertPlainObject(raw, "Local profile descriptor");
  if (raw.version !== 1 || typeof raw.defaultProfile !== "string") {
    throw new Error("Unsupported local profile descriptor version.");
  }
  assertPlainObject(raw.profiles, "Local profiles");
  if (new Set(Object.keys(raw.profiles)).size !== Object.keys(raw.profiles).length) {
    throw new Error("Duplicate local profile IDs are forbidden.");
  }
  const profiles = Object.fromEntries(
    Object.entries(raw.profiles).map(([profileId, profile]) => [
      profileId,
      freezeProfile(repoRoot, profileId, profile)
    ])
  );
  const profileIds = Object.keys(profiles).sort();
  if (profileIds.join(",") !== "n6,n9-stage1") {
    throw new Error("Local profile descriptor must contain only n6 and n9-stage1.");
  }
  if (raw.defaultProfile !== "n6") {
    throw new Error("The existing N6 profile must remain the exact default.");
  }
  for (let leftIndex = 0; leftIndex < profileIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < profileIds.length; rightIndex += 1) {
      const left = profiles[profileIds[leftIndex]];
      const right = profiles[profileIds[rightIndex]];
      const leftPorts = new Set(left.allReservedPorts);
      if (
        left.projectId === right.projectId ||
        left.networkName === right.networkName ||
        left.workdir === right.workdir ||
        left.envPath === right.envPath ||
        right.allReservedPorts.some((port) => leftPorts.has(port))
      ) {
        throw new Error(`Local profiles ${left.id} and ${right.id} overlap.`);
      }
    }
  }
  if (!profiles[raw.defaultProfile]) {
    throw new Error("Default local profile is missing.");
  }
  return Object.freeze({
    version: raw.version,
    defaultProfile: raw.defaultProfile,
    profiles: Object.freeze(profiles)
  });
}

export async function resolveLocalProfile(repoRoot, profileId = null) {
  const descriptor = await loadLocalProfileDescriptor(repoRoot);
  const selected = profileId ?? descriptor.defaultProfile;
  const profile = descriptor.profiles[selected];
  if (!profile) {
    throw new Error(`Unknown local Supabase profile: ${selected}`);
  }
  return profile;
}

export function parseLocalProfileSelector(args, { defaultProfile = "n6" } = {}) {
  let selected = defaultProfile;
  let seen = false;
  const remaining = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--profile") {
      if (seen || index + 1 >= args.length) {
        throw new Error("Local Supabase profile selector is missing or duplicated.");
      }
      selected = args[index + 1];
      seen = true;
      index += 1;
      continue;
    }
    if (argument.startsWith("--profile=")) {
      if (seen) {
        throw new Error("Local Supabase profile selector is duplicated.");
      }
      selected = argument.slice("--profile=".length);
      seen = true;
      continue;
    }
    remaining.push(argument);
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(selected)) {
    throw new Error("Local Supabase profile selector is invalid.");
  }
  return { profileId: selected, args: remaining, explicit: seen };
}

export function profileSupabaseArgs(profile, args) {
  return profile.generatedWorkdir
    ? ["--workdir", profile.workdir, ...args]
    : args;
}

export function renderProfileConfig(source, profile) {
  const replacements = new Map([
    ["<root>:project_id", `project_id = ${JSON.stringify(profile.projectId)}`],
    ["api:port", `port = ${profile.ports.api}`],
    ["db:port", `port = ${profile.ports.db}`],
    ["db:shadow_port", `shadow_port = ${profile.ports.shadow}`],
    ["db.pooler:port", `port = ${profile.ports.pooler}`],
    ["studio:port", `port = ${profile.ports.studio}`],
    ["local_smtp:port", `port = ${profile.ports.mailpit}`],
    ["analytics:port", `port = ${profile.ports.analytics}`]
  ]);
  const seen = new Set();
  let section = "<root>";
  const lines = source.split("\n").map((line) => {
    const sectionMatch = line.match(/^\[([^\]]+)\]\s*$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      return line;
    }
    const assignment = line.match(/^([a-z_]+)\s*=/);
    if (!assignment) {
      return line;
    }
    const key = `${section}:${assignment[1]}`;
    if (!replacements.has(key)) {
      return line;
    }
    if (seen.has(key)) {
      throw new Error(`Duplicate Supabase config field: ${key}`);
    }
    seen.add(key);
    return replacements.get(key);
  });
  for (const key of replacements.keys()) {
    if (!seen.has(key)) {
      throw new Error(`Required Supabase config field is missing: ${key}`);
    }
  }
  return lines.join("\n");
}

async function copySafeTree(source, destination) {
  await mkdir(destination, { mode: 0o700 });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (SKIPPED_SUPABASE_ENTRIES.has(entry.name)) {
      continue;
    }
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    const stat = await lstat(sourcePath);
    if (stat.isSymbolicLink()) {
      throw new Error("Symlinks are forbidden in the generated Supabase workdir source.");
    }
    if (entry.isDirectory()) {
      await copySafeTree(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      await copyFile(sourcePath, destinationPath);
      await chmod(destinationPath, stat.mode & 0o777);
    } else {
      throw new Error("Unsupported entry in the generated Supabase workdir source.");
    }
  }
}

async function sourceTreeIdentity(root, { virtualDirectories = [] } = {}) {
  const entries = new Set();
  async function visit(directory, relative = "") {
    for (const entry of (await readdir(directory, { withFileTypes: true }))
      .sort((left, right) => left.name.localeCompare(right.name))) {
      if (relative === "" && SKIPPED_SUPABASE_ENTRIES.has(entry.name)) {
        continue;
      }
      const absolute = path.join(directory, entry.name);
      const childRelative = path.posix.join(relative, entry.name);
      const stat = await lstat(absolute);
      if (stat.isSymbolicLink()) {
        throw new Error("Symlinks are forbidden in the generated Supabase workdir source.");
      }
      if (entry.isDirectory()) {
        entries.add(`D\0${childRelative}`);
        await visit(absolute, childRelative);
      } else if (entry.isFile()) {
        const digest = createHash("sha256").update(await readFile(absolute)).digest("hex");
        entries.add(`F\0${childRelative}\0${digest}`);
      } else {
        throw new Error("Unsupported entry in the generated Supabase workdir source.");
      }
    }
  }
  await visit(root);
  for (const directory of virtualDirectories) {
    entries.add(`D\0${directory}`);
  }
  return createHash("sha256")
    .update([...entries].sort().join("\n"))
    .digest("hex");
}

async function assertSafeWorkdirAncestors(repoRoot, workdir) {
  const canonicalRepoRoot = await realpath(repoRoot);
  const relative = path.relative(repoRoot, workdir);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Generated Supabase workdir escapes the repository root.");
  }
  let current = repoRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if (error.code === "ENOENT") {
        return;
      }
      throw error;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("Generated Supabase workdir ancestor must be a real directory.");
    }
    const canonicalCurrent = await realpath(current);
    if (
      canonicalCurrent !== canonicalRepoRoot &&
      !canonicalCurrent.startsWith(`${canonicalRepoRoot}${path.sep}`)
    ) {
      throw new Error("Generated Supabase workdir ancestor escapes the repository root.");
    }
  }
}

export async function materializeGeneratedWorkdir(repoRoot, profile) {
  if (!profile.generatedWorkdir) {
    return { created: false, workdir: repoRoot };
  }
  await assertSafeWorkdirAncestors(repoRoot, profile.workdir);
  const sourceRoot = path.join(repoRoot, "supabase");
  const sourceIdentity = await sourceTreeIdentity(sourceRoot, {
    virtualDirectories: ["snippets"]
  });
  const marker = {
    contract: "WTV_LOCAL_SUPABASE_GENERATED_WORKDIR_v1",
    profileId: profile.id,
    projectId: profile.projectId,
    networkName: profile.networkName,
    repositoryRoot: await realpath(repoRoot),
    sourceIdentity
  };
  const markerText = `${JSON.stringify(marker, null, 2)}\n`;
  try {
    const existing = JSON.parse(await readFile(path.join(profile.workdir, GENERATED_MARKER), "utf8"));
    if (JSON.stringify(existing) !== JSON.stringify(marker)) {
      throw new Error("Generated Supabase workdir ownership or source identity mismatch.");
    }
    await validateGeneratedWorkdir(repoRoot, profile);
    return { created: false, workdir: profile.workdir, sourceIdentity };
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const parent = path.dirname(profile.workdir);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const temporary = `${profile.workdir}.tmp-${process.pid}`;
  await mkdir(temporary, { mode: 0o700 });
  try {
    const generatedSupabase = path.join(temporary, "supabase");
    await copySafeTree(sourceRoot, generatedSupabase);
    await mkdir(path.join(generatedSupabase, "snippets"), {
      recursive: true,
      mode: 0o700
    });
    const baseConfig = await readFile(path.join(sourceRoot, "config.toml"), "utf8");
    await writeFile(
      path.join(generatedSupabase, "config.toml"),
      renderProfileConfig(baseConfig, profile),
      { mode: 0o600, flag: "wx" }
    );
    await writeFile(path.join(temporary, GENERATED_MARKER), markerText, {
      mode: 0o600,
      flag: "wx"
    });
    await rename(temporary, profile.workdir);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
  return { created: true, workdir: profile.workdir, sourceIdentity };
}

export async function validateGeneratedWorkdir(repoRoot, profile) {
  if (!profile.generatedWorkdir) {
    return { verdict: "NOT_APPLICABLE" };
  }
  await assertSafeWorkdirAncestors(repoRoot, profile.workdir);
  const workdirStat = await lstat(profile.workdir);
  const generatedSupabasePath = path.join(profile.workdir, "supabase");
  const generatedSupabaseStat = await lstat(generatedSupabasePath);
  if (
    !workdirStat.isDirectory() ||
    workdirStat.isSymbolicLink() ||
    !generatedSupabaseStat.isDirectory() ||
    generatedSupabaseStat.isSymbolicLink()
  ) {
    throw new Error("Generated Supabase workdir must be real non-symlink directories.");
  }
  const markerPath = path.join(profile.workdir, GENERATED_MARKER);
  const markerStat = await lstat(markerPath);
  if (!markerStat.isFile() || markerStat.isSymbolicLink()) {
    throw new Error("Generated Supabase workdir marker must be a real regular file.");
  }
  const sourceIdentity = await sourceTreeIdentity(path.join(repoRoot, "supabase"), {
    virtualDirectories: ["snippets"]
  });
  const marker = JSON.parse(
    await readFile(markerPath, "utf8")
  );
  const expected = {
    contract: "WTV_LOCAL_SUPABASE_GENERATED_WORKDIR_v1",
    profileId: profile.id,
    projectId: profile.projectId,
    networkName: profile.networkName,
    repositoryRoot: await realpath(repoRoot),
    sourceIdentity
  };
  if (JSON.stringify(marker) !== JSON.stringify(expected)) {
    throw new Error("Generated Supabase workdir validation failed.");
  }
  const generatedIdentity = await sourceTreeIdentity(generatedSupabasePath);
  if (generatedIdentity !== sourceIdentity) {
    throw new Error("Generated Supabase workdir content drift detected.");
  }
  const rendered = await readFile(path.join(generatedSupabasePath, "config.toml"), "utf8");
  const source = await readFile(path.join(repoRoot, "supabase", "config.toml"), "utf8");
  if (rendered !== renderProfileConfig(source, profile)) {
    throw new Error("Generated Supabase config drift detected.");
  }
  return { verdict: "PASS", sourceIdentity };
}
