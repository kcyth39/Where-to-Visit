#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { chmod, lstat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

import { createDockerLocalhostProxy } from "./lib/docker-localhost-proxy.mjs";
import { runCommandAsync } from "./lib/command.mjs";
import {
  assertN5EventCreatorLocalProfileAbsent,
  createN5EventCreatorLocalProfile,
  inspectN5EventCreatorLocalProfile,
  loadN5EventCreatorLocalProfile,
  N5_DATABASE_URL_KEY,
  quarantineN5EventCreatorLocalProfile
} from "./lib/n5-event-creator-local-profile.mjs";
import {
  assertLocalBindings,
  assertNoUnsafeProjectBindings,
  forceRemoveProjectContainers,
  inspectLocalCleanupContainers,
  inspectProjectContainers,
  NETWORK_NAME,
  networkExists,
  PROJECT_ID,
  removeLocalProfile,
  removeNetworkIfUnused,
  runSupabase,
  runSupabaseAsync,
  sanitizeCliFailure,
  selectLocalDbContainer,
  writeLocalProfile
} from "./lib/supabase-local.mjs";
import { dockerExecPsqlArgs } from "./lib/supabase-local-cleanup.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedCommands = new Set([
  "migration list",
  "migration up",
  "db query",
  "db reset",
  "db advisors",
  "test db",
  "credential provision",
  "credential rotate"
]);
const N5_CREDENTIAL_ARGS = Object.freeze([
  "credential",
  "provision",
  "--local"
]);
const N5_CREDENTIAL_ROTATE_ARGS = Object.freeze([
  "credential",
  "rotate",
  "--local"
]);
const N5_CREDENTIAL_CONFIRMATION = "PROVISION";
const N5_CREDENTIAL_ROLE = "kimenosuke_event_creator";
const N5_CREDENTIAL_DATABASE = "postgres";
const RESET_DIAGNOSTIC_DIRECTORY_FLAG = "--wtv-reset-diagnostic-dir";
const PGTAP_DIAGNOSTIC_DIRECTORY_FLAG = "--wtv-pgtap-diagnostic-dir";
const CREDENTIAL_QUARANTINE_DIRECTORY_FLAG =
  "--wtv-credential-quarantine-dir";
const DIAGNOSTIC_FILE_NAMES = Object.freeze({
  stdout: "stdout.raw.log",
  stderr: "stderr.raw.log",
  tap: "tap-combined-view.log",
  preCleanup: "pre-cleanup-record.json",
  manifest: "diagnostic-manifest.json",
  summary: "sanitized-summary.txt"
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function modeOf(stat) {
  return stat.mode & 0o777;
}

function credentialError(message, phase) {
  const error = new Error(message);
  error.phase = phase;
  return error;
}

export function assertN5CredentialDbContainer(container) {
  const exactPort =
    container?.published?.length === 1 &&
    container.published[0]?.hostIp === "127.0.0.1" &&
    container.published[0]?.hostPort === 54322;
  const exactService =
    container?.service === null || container?.service === "db";
  if (
    typeof container?.id !== "string" ||
    container.id.length === 0 ||
    container.running !== true ||
    container.networks?.length !== 1 ||
    container.networks[0] !== NETWORK_NAME ||
    !exactService ||
    container.name !== `supabase_db_${PROJECT_ID}` ||
    !exactPort
  ) {
    throw credentialError(
      "N5 local credential target verification failed.",
      "TARGET"
    );
  }
  return container;
}

function n5RoleGuardSql(requireExistingPassword) {
  const passwordCondition = requireExistingPassword
    ? "target_role.rolpassword IS NULL"
    : "target_role.rolpassword IS NOT NULL";
  return `
DO $wtv_n5_credential_guard$
DECLARE
  target_role pg_catalog.pg_authid%ROWTYPE;
  allowed_management_membership_count bigint;
  prohibited_membership_count bigint;
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'N5 credential target mismatch';
  END IF;

  SELECT *
    INTO target_role
    FROM pg_catalog.pg_authid
   WHERE rolname = 'kimenosuke_event_creator';

  IF NOT FOUND
     OR ${passwordCondition}
     OR target_role.rolsuper
     OR target_role.rolcreaterole
     OR target_role.rolcreatedb
     OR target_role.rolreplication
     OR target_role.rolbypassrls
     OR NOT target_role.rolcanlogin
     OR target_role.rolinherit
     OR target_role.rolconnlimit <> -1 THEN
    RAISE EXCEPTION 'N5 credential role precondition failed';
  END IF;

  SELECT count(*)
    INTO allowed_management_membership_count
    FROM pg_catalog.pg_auth_members AS membership
   WHERE membership.roleid = target_role.oid
     AND membership.member =
       (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user)
     AND membership.grantor = 10
     AND membership.admin_option
     AND NOT membership.set_option
     AND NOT membership.inherit_option;

  SELECT count(*)
    INTO prohibited_membership_count
    FROM pg_catalog.pg_auth_members AS membership
   WHERE membership.member = target_role.oid
      OR (
        membership.roleid = target_role.oid
        AND NOT (
          membership.member =
            (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user)
          AND membership.grantor = 10
          AND membership.admin_option
          AND NOT membership.set_option
          AND NOT membership.inherit_option
        )
      );

  IF allowed_management_membership_count <> 1
     OR prohibited_membership_count <> 0 THEN
    RAISE EXCEPTION 'N5 credential membership precondition failed';
  END IF;
END
$wtv_n5_credential_guard$`;
}

const N5_PASSWORD_POSTCHECK_SQL = `
DO $wtv_n5_credential_postcheck$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_authid
     WHERE rolname = 'kimenosuke_event_creator'
       AND rolpassword IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'N5 credential password postcheck failed';
  END IF;
END
$wtv_n5_credential_postcheck$`;

export function n5CredentialPsqlArgs(
  containerId,
  { requireExistingPassword = false } = {}
) {
  return [
    ...dockerExecPsqlArgs(containerId),
    "--command=BEGIN",
    `--command=${n5RoleGuardSql(requireExistingPassword)}`,
    `--command=\\password ${N5_CREDENTIAL_ROLE}`,
    `--command=${N5_PASSWORD_POSTCHECK_SQL}`,
    "--command=COMMIT"
  ];
}

async function promptForCredentialConfirmation(input, output) {
  const prompt = createInterface({
    input,
    output,
    terminal: true
  });
  try {
    output.write(
      "Target: local 127.0.0.1:54322/postgres; " +
      `role: ${N5_CREDENTIAL_ROLE}\n`
    );
    output.write(
      "A new 32-byte base64url password will be generated without display.\n"
    );
    const first = await prompt.question(
      `Type ${N5_CREDENTIAL_CONFIRMATION} to continue: `
    );
    const second = await prompt.question(
      `Type ${N5_CREDENTIAL_CONFIRMATION} again to confirm: `
    );
    return (
      first === N5_CREDENTIAL_CONFIRMATION &&
      second === N5_CREDENTIAL_CONFIRMATION
    );
  } finally {
    prompt.close();
  }
}

export async function executeN5RolePasswordMutation(
  containerId,
  password,
  execute = runCommandAsync,
  options = {}
) {
  try {
    await execute("docker", n5CredentialPsqlArgs(containerId, options), {
      cwd: repoRoot,
      input: `${password}\n${password}\n`
    });
  } catch {
    throw credentialError(
      "N5 local role password setting failed.",
      "PASSWORD"
    );
  }
}

export async function loginPostcheckN5LocalCredential(
  root,
  createClient = (config) => new Client(config)
) {
  let client;
  try {
    const profile = await loadN5EventCreatorLocalProfile(root);
    if (profile === null) {
      throw new Error("missing profile");
    }
    client = createClient({
      connectionString: profile[N5_DATABASE_URL_KEY],
      ssl: false,
      application_name: "n5-local-credential-postcheck"
    });
    await client.connect();
    const result = await client.query({
      text:
        "SELECT current_user = 'kimenosuke_event_creator' AS user_ok, " +
        "current_database() = 'postgres' AS database_ok"
    });
    if (
      result.rows?.length !== 1 ||
      result.rows[0]?.user_ok !== true ||
      result.rows[0]?.database_ok !== true
    ) {
      throw new Error("identity mismatch");
    }
  } catch {
    throw credentialError(
      "N5 local credential login postcheck failed.",
      "LOGIN"
    );
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }

  return {
    connection: "PASS",
    currentUser: N5_CREDENTIAL_ROLE,
    database: N5_CREDENTIAL_DATABASE,
    mutationCount: 0
  };
}

export async function provisionN5LocalCredential({
  input = process.stdin,
  output = process.stdout,
  confirm = () => promptForCredentialConfirmation(input, output),
  assertTarget = () => {
    const containers = inspectLocalCleanupContainers();
    assertLocalBindings(containers);
    return assertN5CredentialDbContainer(selectLocalDbContainer(containers));
  },
  random = randomBytes,
  setPassword = (containerId, password) =>
    executeN5RolePasswordMutation(containerId, password),
  createProfile = (password) =>
    createN5EventCreatorLocalProfile(repoRoot, password),
  loginPostcheck = () => loginPostcheckN5LocalCredential(repoRoot),
  assertProfileAbsent = () =>
    assertN5EventCreatorLocalProfileAbsent(repoRoot)
} = {}) {
  if (input.isTTY !== true || output.isTTY !== true) {
    throw credentialError(
      "N5 local credential provisioning requires an interactive TTY.",
      "TTY"
    );
  }

  const target = assertTarget();
  await assertProfileAbsent();
  if (!(await confirm())) {
    throw credentialError(
      "N5 local credential confirmation failed.",
      "CONFIRMATION"
    );
  }

  let password;
  try {
    try {
      password = random(32).toString("base64url");
    } catch {
      throw credentialError(
        "N5 local credential password generation failed.",
        "GENERATION"
      );
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(password)) {
      throw credentialError(
        "N5 local credential password generation failed.",
        "GENERATION"
      );
    }
    try {
      await setPassword(target.id, password);
    } catch {
      throw credentialError(
        "N5 local role password setting failed.",
        "PASSWORD"
      );
    }
    let profile;
    try {
      profile = await createProfile(password);
    } catch {
      throw credentialError(
        "N5 local profile creation failed after password setting.",
        "PROFILE"
      );
    }
    let login;
    try {
      login = await loginPostcheck();
    } catch {
      throw credentialError(
        "N5 local credential login postcheck failed.",
        "LOGIN"
      );
    }
    return {
      verdict: "PASS",
      generation: "OS_CSPRNG_32_BYTES_BASE64URL",
      passwordSettingCount: 1,
      profileCreationCount: 1,
      loginPostcheckCount: 1,
      retryCount: 0,
      profile,
      login
    };
  } finally {
    password = null;
  }
}

export async function rotateN5LocalCredential({
  input = process.stdin,
  output = process.stdout,
  quarantineDirectory,
  confirm = () => promptForCredentialConfirmation(input, output),
  assertTarget = () => {
    const containers = inspectLocalCleanupContainers();
    assertLocalBindings(containers);
    return assertN5CredentialDbContainer(selectLocalDbContainer(containers));
  },
  inspectProfile = () => inspectN5EventCreatorLocalProfile(repoRoot),
  random = randomBytes,
  setPassword = (containerId, password) =>
    executeN5RolePasswordMutation(containerId, password, runCommandAsync, {
      requireExistingPassword: true
    }),
  quarantineProfile = () =>
    quarantineN5EventCreatorLocalProfile(repoRoot, quarantineDirectory),
  createProfile = (password) =>
    createN5EventCreatorLocalProfile(repoRoot, password),
  loginPostcheck = () => loginPostcheckN5LocalCredential(repoRoot)
} = {}) {
  if (
    input.isTTY !== true ||
    output.isTTY !== true ||
    typeof quarantineDirectory !== "string" ||
    !path.isAbsolute(quarantineDirectory)
  ) {
    throw credentialError(
      "N5 local credential rotation precondition failed.",
      "ROTATION_PRECONDITION"
    );
  }

  const target = assertTarget();
  await inspectProfile();
  if (!(await confirm())) {
    throw credentialError(
      "N5 local credential confirmation failed.",
      "CONFIRMATION"
    );
  }

  let password;
  try {
    password = random(32).toString("base64url");
    if (!/^[A-Za-z0-9_-]{43}$/.test(password)) {
      throw credentialError(
        "N5 local credential password generation failed.",
        "GENERATION"
      );
    }
    await setPassword(target.id, password);
    const quarantine = await quarantineProfile();
    const profile = await createProfile(password);
    const login = await loginPostcheck();
    return {
      verdict: "PASS",
      generation: "OS_CSPRNG_32_BYTES_BASE64URL",
      passwordSettingCount: 1,
      profileQuarantineCount: quarantine.profileMovedCount,
      profileCreationCount: 1,
      loginPostcheckCount: 1,
      retryCount: 0,
      quarantine,
      profile,
      login
    };
  } catch (error) {
    if (error?.phase) throw error;
    throw credentialError(
      "N5 local credential rotation failed.",
      "ROTATION"
    );
  } finally {
    password = null;
  }
}

function isInsideRoot(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" ||
    relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative);
}

async function assertAbsentDiagnosticDirectory(directory) {
  if (
    typeof directory !== "string" ||
    !path.isAbsolute(directory) ||
    path.resolve(directory) !== directory ||
    isInsideRoot(directory, repoRoot)
  ) {
    throw new Error(
      "The diagnostic evidence directory must be an exact absolute Git-external path."
    );
  }

  const parent = await lstat(path.dirname(directory));
  if (!parent.isDirectory() || parent.isSymbolicLink()) {
    throw new Error(
      "The diagnostic evidence parent must be a regular non-symlink directory."
    );
  }

  try {
    await lstat(directory);
    throw new Error("The diagnostic evidence directory must be absent.");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function reserveDiagnosticDirectory(directory) {
  await assertAbsentDiagnosticDirectory(directory);
  await mkdir(directory, { mode: 0o700 });
  await chmod(directory, 0o700);
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || modeOf(stat) !== 0o700) {
    throw new Error(
      "The diagnostic evidence directory failed its 0700 non-symlink postcheck."
    );
  }
}

async function writeExclusiveDiagnosticFile(filePath, contents) {
  await writeFile(filePath, contents, { flag: "wx", mode: 0o600 });
  await chmod(filePath, 0o600);
  const stat = await lstat(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || modeOf(stat) !== 0o600) {
    throw new Error(
      "A diagnostic evidence file failed its 0600 regular-file postcheck."
    );
  }
}

function countMatches(text, pattern) {
  return [...text.matchAll(new RegExp(pattern.source, pattern.flags))].length;
}

export function inspectDiagnosticSecrets(stdout, stderr, knownValues = []) {
  const combined = `${stdout}\n${stderr}`;
  const detections = {};
  const patterns = [
    ["postgres_url", /\bpostgres(?:ql)?:\/\/[^\s"'<>]+/gi],
    [
      "password_uri",
      /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>:@/]+:[^\s"'<>@/]+@[^\s"'<>]+/gi
    ],
    [
      "database_password",
      /(?:^|[,{]\s*|["'])?(?:postgres(?:ql)?_?password|database_?password|db_?password|password)["']?\s*[:=]\s*["']?(?!(?:null|none|absent|not set)\b)\S+/gim
    ],
    [
      "n5_database_url_variable",
      /\bKIMENOSUKE_EVENT_CREATOR_DATABASE_URL\b/g
    ],
    [
      "n5_database_ca_variable",
      /\bKIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM\b/g
    ],
    [
      "supabase_key",
      /\b(?:sbp|sb_secret|sb_publishable)_[A-Za-z0-9_-]{8,}\b|\bSUPABASE_(?:ACCESS_TOKEN|SERVICE_ROLE_KEY|ANON_KEY|PUBLISHABLE_KEY|SECRET_KEY)\b/g
    ],
    [
      "authorization_header",
      /(?:^|[,{]\s*|["'])authorization["']?\s*[:=]\s*["']?\S+/gim
    ],
    [
      "cookie_header",
      /(?:^|[,{]\s*|["'])(?:set-cookie|cookie)["']?\s*[:=]\s*["']?\S+/gim
    ],
    [
      "jwt",
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g
    ],
    [
      "pem_body",
      /-----BEGIN (?:[A-Z ]+ )?(?:PRIVATE KEY|CERTIFICATE)-----/g
    ]
  ];

  for (const [name, pattern] of patterns) {
    const count = countMatches(combined, pattern);
    if (count > 0) {
      detections[name] = count;
    }
  }

  const environmentAssignments = countMatches(
    combined,
    /^\s*(?:export\s+)?[A-Z_][A-Z0-9_]*\s*=.*$/gm
  );
  const environmentObjectEntries = countMatches(
    combined,
    /(?:[,{]\s*)(?:"[A-Z_][A-Z0-9_]*"|'[A-Z_][A-Z0-9_]*')\s*:\s*["']?[^,}\n]+/gm
  );
  if (environmentAssignments >= 3 || environmentObjectEntries >= 3) {
    detections.environment_dump =
      environmentAssignments + environmentObjectEntries;
  }

  let knownCredentialCount = 0;
  for (const value of new Set(knownValues.filter(
    (item) => typeof item === "string" && item.length >= 8
  ))) {
    let offset = 0;
    while ((offset = combined.indexOf(value, offset)) !== -1) {
      knownCredentialCount += 1;
      offset += value.length;
    }
  }
  if (knownCredentialCount > 0) {
    detections.known_credential_value = knownCredentialCount;
  }

  return detections;
}

function knownCredentialValues(environment) {
  return Object.entries(environment)
    .filter(([name, value]) =>
      /(PASSWORD|SECRET|TOKEN|KEY|DATABASE_URL|CA_PEM|COOKIE|AUTHORIZATION)/i.test(
        name
      ) &&
      typeof value === "string" &&
      value.length >= 8
    )
    .map(([, value]) => value);
}

export function parseWrapperArguments(inputArgs) {
  const cliArgs = [];
  let diagnosticDirectory = null;
  let diagnosticMode = null;
  let credentialQuarantineDirectory = null;

  for (let index = 0; index < inputArgs.length; index += 1) {
    const argument = inputArgs[index];
    const mode = argument === RESET_DIAGNOSTIC_DIRECTORY_FLAG
      ? "reset"
      : argument === PGTAP_DIAGNOSTIC_DIRECTORY_FLAG
        ? "pgtap"
        : null;
    if (argument === CREDENTIAL_QUARANTINE_DIRECTORY_FLAG) {
      if (credentialQuarantineDirectory !== null || index + 1 >= inputArgs.length) {
        throw new Error(
          "A credential quarantine directory flag must occur exactly once with one path."
        );
      }
      credentialQuarantineDirectory = inputArgs[index + 1];
      index += 1;
      continue;
    }
    if (mode === null) {
      cliArgs.push(argument);
      continue;
    }
    if (diagnosticDirectory !== null || index + 1 >= inputArgs.length) {
      throw new Error(
        "A diagnostic directory flag must occur exactly once with one path."
      );
    }
    diagnosticDirectory = inputArgs[index + 1];
    diagnosticMode = mode;
    index += 1;
  }

  const command = cliArgs.slice(0, 2).join(" ");
  if (
    (credentialQuarantineDirectory !== null &&
      (command !== "credential rotate" ||
        JSON.stringify(cliArgs) !== JSON.stringify(N5_CREDENTIAL_ROTATE_ARGS))) ||
    (command === "credential rotate" && credentialQuarantineDirectory === null)
  ) {
    throw new Error(
      `${CREDENTIAL_QUARANTINE_DIRECTORY_FLAG} is only available for the exact local credential rotation command.`
    );
  }
  if (diagnosticDirectory !== null) {
    const exactReset =
      command === "db reset" &&
      JSON.stringify(cliArgs) ===
        JSON.stringify(["db", "reset", "--local", "--no-seed"]);
    const exactLocalPgTap =
      command === "test db" &&
      cliArgs[2] === "--local" &&
      cliArgs.length > 3 &&
      cliArgs.slice(3).every((argument) =>
        !argument.startsWith("-") &&
        argument.startsWith("supabase/tests/") &&
        argument.endsWith(".sql")
      );
    if (
      (diagnosticMode === "reset" && !exactReset) ||
      (diagnosticMode === "pgtap" && !exactLocalPgTap)
    ) {
      throw new Error(
        diagnosticMode === "reset"
          ? `${RESET_DIAGNOSTIC_DIRECTORY_FLAG} is only available for the exact formal local db reset command.`
          : `${PGTAP_DIAGNOSTIC_DIRECTORY_FLAG} is only available for explicit local test db files.`
      );
    }
  }

  const parsed = {
    cliArgs,
    command,
    diagnosticDirectory,
    diagnosticMode
  };
  if (credentialQuarantineDirectory !== null) {
    parsed.credentialQuarantineDirectory = credentialQuarantineDirectory;
  }
  return parsed;
}

function assertLocalOnlyCommand(args, command) {
  if (!allowedCommands.has(command)) {
    throw new Error(`Unsupported local Supabase command: ${command || "<empty>"}`);
  }

  if (command === "credential provision") {
    if (JSON.stringify(args) !== JSON.stringify(N5_CREDENTIAL_ARGS)) {
      throw new Error(
        "N5 local credential provisioning accepts only the exact local command."
      );
    }
    return;
  }

  if (command === "credential rotate") {
    if (JSON.stringify(args) !== JSON.stringify(N5_CREDENTIAL_ROTATE_ARGS)) {
      throw new Error(
        "N5 local credential rotation accepts only the exact local command."
      );
    }
    return;
  }

  if (!args.includes("--local")) {
    throw new Error("Every local database command must include --local.");
  }

  const forbidden = new Set([
    "--linked",
    "--db-url",
    "login",
    "link",
    "pull",
    "push",
    "repair"
  ]);
  if (args.some((argument) => forbidden.has(argument))) {
    throw new Error("Remote or migration-history options are forbidden by the local runner.");
  }

  if (args.includes("--network-id")) {
    throw new Error("The local runner owns the fixed Docker network-id.");
  }

  if (command === "db reset" && !args.includes("--no-seed")) {
    throw new Error("The formal local reset command requires --no-seed.");
  }
}

export function assertLocalOnlyCommandForTest(args) {
  assertLocalOnlyCommand(args, args.slice(0, 2).join(" "));
}

function safeDiagnosticState() {
  try {
    const containers = inspectProjectContainers();
    return {
      observation: "PASS",
      network_present: networkExists(),
      containers: containers
        .map((container) => ({
          name: container.name,
          running: container.running,
          networks: [...container.networks].sort(),
          published: container.published
            .map((binding) => ({
              host_ip: binding.hostIp,
              host_port: binding.hostPort
            }))
            .sort((left, right) =>
              `${left.host_ip}:${left.host_port}`.localeCompare(
                `${right.host_ip}:${right.host_port}`
              )
            )
        }))
        .sort((left, right) => left.name.localeCompare(right.name))
    };
  } catch (error) {
    return {
      observation: "ERROR",
      error_name: error?.name ?? "Error"
    };
  }
}

function extractFailureIdentity(stdout, stderr) {
  const combined = `${stderr}\n${stdout}`;
  const sqlstate =
    combined.match(/\bSQLSTATE(?:\s*[:=]\s*|\s+)([0-9A-Z]{5})\b/i)?.[1] ??
    null;
  const migrationPattern =
    /\bApplying migration\s+(supabase\/migrations\/)?([0-9]{14}_[A-Za-z0-9_]+\.sql)\b/i;
  let activeMigration = null;
  let migrationAtError = null;
  for (const outputLine of combined.split(/\r?\n/)) {
    const applyingMigration = outputLine.match(migrationPattern);
    if (applyingMigration) {
      activeMigration =
        `${applyingMigration[1] ?? ""}${applyingMigration[2]}`;
    }
    if (/\bERROR\b/i.test(outputLine)) {
      migrationAtError = activeMigration;
      break;
    }
  }
  const migration = migrationAtError ?? activeMigration;
  const line = Number(
    combined.match(/\b(?:at\s+)?line\s*[:=]?\s*([0-9]+)\b/i)?.[1] ?? NaN
  );
  const statementOrdinal = Number(
    combined.match(
      /\bstatement(?:\s+(?:number|identity))?\s*[:=]?\s*([0-9]+)\b/i
    )?.[1] ?? NaN
  );
  const statementText =
    combined.match(/^\s*(?:statement|query)\s*:\s*(.+)$/im)?.[1] ?? null;

  return {
    sqlstate,
    migration,
    line: Number.isFinite(line) ? line : null,
    statement_ordinal: Number.isFinite(statementOrdinal)
      ? statementOrdinal
      : null,
    statement_identity: statementText === null
      ? null
      : {
          sha256: sha256(Buffer.from(statementText, "utf8")),
          bytes: Buffer.byteLength(statementText)
        }
  };
}

function nullableMatch(text, pattern) {
  return text.match(pattern)?.[1]?.trim() ?? null;
}

export function extractPgTapFailureIdentity(stdout, stderr, testFiles = []) {
  const combined = `${stdout}\n${stderr}`;
  const lines = combined.split(/\r?\n/);
  const firstFailureIndex = lines.findIndex((line) =>
    /^\s*not ok\b/i.test(line)
  );
  const firstFailureLine =
    firstFailureIndex === -1 ? null : lines[firstFailureIndex];
  const failedAssertion = firstFailureLine?.match(
    /^\s*not ok\s+([0-9]+)(?:\s*-\s*(.*))?$/i
  );
  const planMatches = [
    ...combined.matchAll(/^\s*1\.\.([0-9]+)\s*$/gm)
  ];
  const observedAssertions = countMatches(
    combined,
    /^\s*(?:not )?ok\s+[0-9]+\b/gm
  );
  const badPlanIndex = lines.findIndex((line) => /\bBad plan\b/i.test(line));
  const badPlanContext = badPlanIndex === -1
    ? null
    : lines
      .slice(0, badPlanIndex + 1)
      .filter((line) => line.trim() !== "")
      .slice(-2)
      .join("\n");
  const sqlstate =
    nullableMatch(combined, /\bSQLSTATE(?:\s*[:=]\s*|\s+)([0-9A-Z]{5})\b/i);
  const diagnosticTail = firstFailureIndex === -1
    ? combined
    : lines.slice(firstFailureIndex).join("\n");
  const file_results = testFiles.map((file) => {
    const escapedFile = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const fileLine = combined.match(
      new RegExp(
        `^.*${escapedFile}.*\\.\\.\\s*(not ok|ok|pass|fail)\\b.*$`,
        "im"
      )
    )?.[1]?.toLowerCase() ?? null;
    return {
      file,
      result:
        fileLine === "ok" || fileLine === "pass"
          ? "PASS"
          : fileLine === "not ok" || fileLine === "fail"
            ? "FAIL"
            : null
    };
  });

  return {
    test_file_order: [...testFiles],
    file_results,
    plan_count: planMatches.length === 0
      ? null
      : Number(planMatches.at(-1)[1]),
    observed_test_count: observedAssertions,
    first_failed_assertion_number: failedAssertion
      ? Number(failedAssertion[1])
      : null,
    assertion_description: failedAssertion?.[2]?.trim() || null,
    expected: nullableMatch(
      diagnosticTail,
      /^\s*(?:#\s*)?(?:expected|Expected|want)\s*:\s*(.+)$/m
    ),
    actual: nullableMatch(
      diagnosticTail,
      /^\s*(?:#\s*)?(?:actual|Actual|got|Got|have)\s*:\s*(.+)$/m
    ),
    sqlstate,
    error: nullableMatch(diagnosticTail, /\bERROR\s*:\s*(.+)$/m),
    detail: nullableMatch(diagnosticTail, /\bDETAIL\s*:\s*(.+)$/m),
    hint: nullableMatch(diagnosticTail, /\bHINT\s*:\s*(.+)$/m),
    context: nullableMatch(diagnosticTail, /\bCONTEXT\s*:\s*(.+)$/m),
    bad_plan_context: badPlanContext
  };
}

function streamIdentity(contents, fileName, stored) {
  if (!stored) {
    return {
      file: null,
      stored: false
    };
  }
  const bytes = Buffer.from(contents, "utf8");
  return {
    file: fileName,
    stored: true,
    bytes: bytes.length,
    sha256: sha256(bytes),
    final_newline: bytes.length > 0 && bytes.at(-1) === 0x0a
  };
}

function diagnosticSummary(manifest, evidenceAlias) {
  const field = (value) => value === null ? "NOT_CAPTURED" : String(value);
  const stream = (name, identity) =>
    identity.stored
      ? `${name}: sha256=${identity.sha256} bytes=${identity.bytes} stored=true`
      : `${name}: WITHHELD`;
  return [
    `N5 ${manifest.diagnostic_mode} diagnostic child exit: ${manifest.original_child_exit_code}`,
    `Evidence bundle alias: ${evidenceAlias}`,
    stream("stdout", manifest.stdout),
    stream("stderr", manifest.stderr),
    `SQLSTATE: ${field(manifest.failure_identity?.sqlstate ?? null)}`,
    `Migration: ${field(manifest.failure_identity?.migration ?? null)}`,
    `Line: ${field(manifest.failure_identity?.line ?? null)}`,
    `Statement: ${field(manifest.failure_identity?.statement_ordinal ?? null)}`,
    `Secret scan: ${manifest.secret_scan.verdict}`,
    `${manifest.diagnostic_mode === "reset" ? "Cleanup" : "Stack disposition"}: ${manifest.cleanup.verdict}`,
    `Wrapper exit: ${manifest.wrapper_public_exit_code}`
  ].join("\n") + "\n";
}

export async function captureDiagnosticFailure({
  error,
  evidenceDirectory,
  cliArgs,
  cleanup,
  snapshot = async () => safeDiagnosticState(),
  knownValues = [],
  diagnosticMode = "reset",
  preExecution = null
}) {
  const stdout = error?.stdout ?? "";
  const stderr = error?.stderr ?? "";
  const childExit = Number.isInteger(error?.status) ? error.status : 1;
  const detections = inspectDiagnosticSecrets(stdout, stderr, knownValues);
  const secretScanPassed = Object.keys(detections).length === 0;
  const evidenceAlias = path.basename(evidenceDirectory);
  const testFiles = diagnosticMode === "pgtap" ? cliArgs.slice(3) : [];
  const tapCombinedView = diagnosticMode === "pgtap"
    ? [
        "===== STDOUT =====",
        stdout,
        "===== STDERR =====",
        stderr
      ].join("\n")
    : null;
  let directoryReserved = false;
  let evidenceError = null;

  try {
    await reserveDiagnosticDirectory(evidenceDirectory);
    directoryReserved = true;
    if (secretScanPassed) {
      await writeExclusiveDiagnosticFile(
        path.join(evidenceDirectory, DIAGNOSTIC_FILE_NAMES.stdout),
        stdout
      );
      await writeExclusiveDiagnosticFile(
        path.join(evidenceDirectory, DIAGNOSTIC_FILE_NAMES.stderr),
        stderr
      );
      if (tapCombinedView !== null) {
        await writeExclusiveDiagnosticFile(
          path.join(evidenceDirectory, DIAGNOSTIC_FILE_NAMES.tap),
          tapCombinedView
        );
      }
    }
  } catch (artifactError) {
    evidenceError = artifactError;
  }

  const rawStored = directoryReserved &&
    evidenceError === null &&
    secretScanPassed;
  const stdoutIdentity = streamIdentity(
    stdout,
    DIAGNOSTIC_FILE_NAMES.stdout,
    rawStored
  );
  const stderrIdentity = streamIdentity(
    stderr,
    DIAGNOSTIC_FILE_NAMES.stderr,
    rawStored
  );
  const observe = async (phase) => {
    try {
      return await snapshot(phase);
    } catch (snapshotError) {
      return {
        observation: "ERROR",
        error_name: snapshotError?.name ?? "Error"
      };
    }
  };
  const preCleanup = await observe("pre-cleanup");
  const preCleanupRecord = {
    contract: diagnosticMode === "reset"
      ? "N5_RESET_FAILURE_DIAGNOSTIC_v1"
      : "N5_PGTAP_FAILURE_DIAGNOSTIC_v1",
    diagnostic_mode: diagnosticMode,
    phase: "PRE_CLEANUP_CAPTURED",
    timestamp_utc: new Date().toISOString(),
    command: {
      executable: "node_modules/.bin/supabase",
      arguments: [...cliArgs, "--network-id", NETWORK_NAME],
      retry_count: 0
    },
    original_child_exit_code: childExit,
    wrapper_public_exit_code: 1,
    stdout: stdoutIdentity,
    stderr: stderrIdentity,
    combined_log_sha256: secretScanPassed
      ? sha256(
          Buffer.concat([
            Buffer.from("stdout\0", "utf8"),
            Buffer.from(stdout, "utf8"),
            Buffer.from("\0stderr\0", "utf8"),
            Buffer.from(stderr, "utf8")
          ])
        )
      : null,
    failure_identity: secretScanPassed
      ? diagnosticMode === "pgtap"
        ? extractPgTapFailureIdentity(stdout, stderr, testFiles)
        : extractFailureIdentity(stdout, stderr)
      : null,
    secret_scan: {
      verdict: secretScanPassed ? "PASS" : "FAIL",
      detections
    },
    pre_execution: preExecution,
    pre_cleanup: preCleanup
  };
  const preCleanupRecordText =
    JSON.stringify(preCleanupRecord, null, 2) + "\n";
  let preCleanupRecordStored = false;
  if (directoryReserved && evidenceError === null) {
    try {
      await writeExclusiveDiagnosticFile(
        path.join(evidenceDirectory, DIAGNOSTIC_FILE_NAMES.preCleanup),
        preCleanupRecordText
      );
      preCleanupRecordStored = true;
    } catch (artifactError) {
      evidenceError = artifactError;
    }
  }
  let cleanupError = null;
  try {
    await cleanup();
  } catch (errorDuringCleanup) {
    cleanupError = errorDuringCleanup;
  }
  const postCleanup = await observe("post-cleanup");
  const manifest = {
    contract: preCleanupRecord.contract,
    diagnostic_mode: diagnosticMode,
    timestamp_utc: new Date().toISOString(),
    command: {
      executable: "node_modules/.bin/supabase",
      arguments: [...cliArgs, "--network-id", NETWORK_NAME],
      retry_count: 0
    },
    original_child_exit_code: childExit,
    wrapper_public_exit_code: 1,
    stdout: stdoutIdentity,
    stderr: stderrIdentity,
    combined_log_sha256: preCleanupRecord.combined_log_sha256,
    failure_identity: preCleanupRecord.failure_identity,
    secret_scan: {
      verdict: secretScanPassed ? "PASS" : "FAIL",
      detections
    },
    evidence: {
      verdict:
        evidenceError === null
          ? rawStored ? "COMPLETE" : "RAW_LOG_WITHHELD"
          : "WRITE_FAILED",
      error_name: evidenceError?.name ?? null
    },
    pre_execution: preExecution,
    pre_cleanup: preCleanup,
    cleanup: {
      verdict: cleanupError === null ? "PASS" : "FAIL",
      error_name: cleanupError?.name ?? null
    },
    post_cleanup: postCleanup,
    artifacts: {
      pre_cleanup_record: streamIdentity(
        preCleanupRecordText,
        DIAGNOSTIC_FILE_NAMES.preCleanup,
        preCleanupRecordStored
      )
    }
  };
  if (tapCombinedView !== null) {
    manifest.artifacts.tap_combined_view = streamIdentity(
      tapCombinedView,
      DIAGNOSTIC_FILE_NAMES.tap,
      rawStored
    );
  }
  const summaryText = diagnosticSummary(manifest, evidenceAlias);
  manifest.artifacts.sanitized_summary = streamIdentity(
    summaryText,
    DIAGNOSTIC_FILE_NAMES.summary,
    directoryReserved && evidenceError === null
  );
  if (directoryReserved && evidenceError === null) {
    try {
      await writeExclusiveDiagnosticFile(
        path.join(evidenceDirectory, DIAGNOSTIC_FILE_NAMES.summary),
        summaryText
      );
      await writeExclusiveDiagnosticFile(
        path.join(evidenceDirectory, DIAGNOSTIC_FILE_NAMES.manifest),
        JSON.stringify(manifest, null, 2) + "\n"
      );
    } catch (artifactError) {
      evidenceError = artifactError;
      manifest.evidence = {
        verdict: "WRITE_FAILED",
        error_name: artifactError?.name ?? "Error"
      };
    }
  }

  return {
    manifest,
    summary:
      `${diagnosticSummary(manifest, evidenceAlias)}` +
      `Evidence finalization: ${manifest.evidence.verdict}\n`,
    originalError: error,
    cleanupError,
    evidenceError
  };
}

async function failClosed() {
  runSupabase(repoRoot, ["stop", "--project-id", PROJECT_ID], {
    allowFailure: true
  });
  forceRemoveProjectContainers();
  await removeNetworkIfUnused().catch(() => {});
  await removeLocalProfile(repoRoot).catch(() => {});
}

export async function runChildForFailureRouting(execute) {
  try {
    return {
      result: await execute(),
      failure: null
    };
  } catch (error) {
    return {
      result: null,
      failure: error
    };
  }
}

export async function routeLocalCommandFailure({
  error,
  childFailure,
  diagnosticDirectory,
  cliArgs,
  needsDockerCreateGuard,
  captureDiagnostic = captureDiagnosticFailure,
  cleanup = failClosed,
  assertBindings = assertLocalBindings,
  sanitize = sanitizeCliFailure,
  knownValues = [],
  diagnosticMode = null,
  preExecution = null
}) {
  const isChildNonzeroFailure =
    error === childFailure &&
    Number.isInteger(error?.status) &&
    error.status !== 0;

  if (diagnosticDirectory !== null && isChildNonzeroFailure) {
    const diagnostic = await captureDiagnostic({
      error,
      evidenceDirectory: diagnosticDirectory,
      cliArgs,
      cleanup,
      knownValues,
      diagnosticMode,
      preExecution
    });
    return diagnostic.summary.trimEnd();
  }

  if (needsDockerCreateGuard) {
    await cleanup();
  } else {
    try {
      assertBindings();
    } catch {
      await cleanup();
    }
  }
  return sanitize(error);
}

async function main() {
  const {
    cliArgs: args,
    command,
    diagnosticDirectory,
    diagnosticMode,
    credentialQuarantineDirectory
  } = parseWrapperArguments(process.argv.slice(2));
  assertLocalOnlyCommand(args, command);
  if (command === "credential provision") {
    const result = await provisionN5LocalCredential();
    process.stdout.write(
      "N5 local credential provisioning: PASS\n" +
      `Target alias: local/${N5_CREDENTIAL_DATABASE}/${N5_CREDENTIAL_ROLE}\n` +
      `Generation: ${result.generation}\n` +
      "Password output: 0\n" +
      `Profile: mode=${result.profile.mode.toString(8)} ` +
      `keys=${result.profile.keyCount}\n` +
      `Login: ${result.login.connection}\n` +
      `Retry: ${result.retryCount}\n`
    );
    return;
  }
  if (command === "credential rotate") {
    const result = await rotateN5LocalCredential({
      quarantineDirectory: credentialQuarantineDirectory
    });
    process.stdout.write(
      "N5 local credential rotation: PASS\n" +
      `Target alias: local/${N5_CREDENTIAL_DATABASE}/${N5_CREDENTIAL_ROLE}\n` +
      `Generation: ${result.generation}\n` +
      "Password output: 0\n" +
      `Quarantine: mode=${result.quarantine.mode.toString(8)} ` +
      `moved=${result.profileQuarantineCount}\n` +
      `Profile: mode=${result.profile.mode.toString(8)} ` +
      `keys=${result.profile.keyCount}\n` +
      `Login: ${result.login.connection}\n` +
      `Retry: ${result.retryCount}\n`
    );
    return;
  }
  if (diagnosticDirectory !== null) {
    await assertAbsentDiagnosticDirectory(diagnosticDirectory);
  }
  assertLocalBindings();
  const preExecution = diagnosticMode === "pgtap"
    ? safeDiagnosticState()
    : null;
  const needsDockerCreateGuard = command === "db reset";
  const abortController = needsDockerCreateGuard ? new AbortController() : null;
  const proxy = needsDockerCreateGuard ? await createDockerLocalhostProxy({
    requireDatabaseCreate: true,
    onReject: () => abortController.abort()
  }) : null;
  let monitorError = null;
  const monitor = needsDockerCreateGuard ? setInterval(() => {
    try {
      assertNoUnsafeProjectBindings();
    } catch (error) {
      monitorError = error;
      abortController.abort();
    }
  }, 100) : null;
  let childFailure = null;

  try {
    const child = await runChildForFailureRouting(() =>
      runSupabaseAsync(
        repoRoot,
        [...args, "--network-id", NETWORK_NAME],
        proxy ? {
          signal: abortController.signal,
          env: {
            ...process.env,
            DOCKER_HOST: proxy.dockerHost
          }
        } : {}
      )
    );
    childFailure = child.failure;
    if (childFailure !== null) {
      throw childFailure;
    }
    const result = child.result;
    if (monitorError) {
      throw monitorError;
    }
    proxy?.assertExpectedDatabaseCreateObserved();
    assertLocalBindings();
    await writeLocalProfile(repoRoot);
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    if (proxy) {
      console.log("Local Docker proxy: DB container create observed with localhost-only bindings");
    }
  } catch (error) {
    throw new Error(await routeLocalCommandFailure({
      error,
      childFailure,
      diagnosticDirectory,
      cliArgs: args,
      needsDockerCreateGuard,
      knownValues: knownCredentialValues(process.env),
      diagnosticMode,
      preExecution,
      cleanup: diagnosticMode === "pgtap"
        ? async () => {
            try {
              assertLocalBindings();
            } catch {
              await failClosed();
            }
          }
        : failClosed
    }));
  } finally {
    if (monitor) {
      clearInterval(monitor);
    }
    await proxy?.close();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(`Local Supabase command failed: ${error.message}`);
    process.exitCode = 1;
  });
}
