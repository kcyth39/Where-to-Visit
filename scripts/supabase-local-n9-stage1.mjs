#!/usr/bin/env node

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { link, lstat, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

import { createDockerLocalhostProxy } from "./lib/docker-localhost-proxy.mjs";
import { runCommand, runCommandAsync } from "./lib/command.mjs";
import {
  assertProfileMayProceed,
  captureProfileSnapshot,
  cleanupAttemptResources,
  ensureProfileNetwork,
  inspectDockerProfileResources,
  preflightProfileResources,
  PROFILE_RESOURCE_STATES,
  runLocalDockerCommand,
  safeProfileSummary
} from "./lib/supabase-local-isolation.mjs";
import {
  materializeGeneratedWorkdir,
  parseLocalProfileSelector,
  profileSupabaseArgs,
  resolveLocalProfile,
  validateGeneratedWorkdir
} from "./lib/supabase-local-profile.mjs";
import {
  assertLocalOnlyCommandForTest,
  parseWrapperArguments
} from "./supabase-local-command.mjs";
import { sanitizeCliFailure } from "./lib/supabase-local.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXACT_PROFILE = "n9-stage1";
const STACK_OPERATIONS = new Set(["start", "status", "stop"]);
export const N9_STAGE1_QUERY_DIRECTORY = "supabase/stage1/queries";
export const N9_STAGE1_QUERY_FILES = Object.freeze({
  "supabase/stage1/queries/catalog.sql": "a3ef1761002988e10668feca9a1433acb07555a15d2ee4dd31f3bdf88b08cb94"
});
export const N9_STAGE1_PGTAP_FILES = Object.freeze([
  "supabase/tests/collaborative_response_row_model_test.sql",
  "supabase/tests/private_rls_helpers_test.sql",
  "supabase/tests/ownerless_final_state_test.sql",
  "supabase/tests/candidate_url_safety_test.sql",
  "supabase/tests/event_default_criterion_atomic_create_test.sql"
]);
const N9_STAGE1_PGTAP_FILE_SET = new Set(N9_STAGE1_PGTAP_FILES);
const EXACT_N9_COMMANDS = new Set([
  "migration list --local",
  "migration up --local",
  "db reset --local --no-seed",
  "db advisors --local --type all --level warn --fail-on warn",
  "db advisors --local --type all --level info",
]);

function isDatabaseConnectionEnvironmentName(name) {
  const segments = name.toUpperCase().split("_").filter(Boolean);
  const databaseIndex = segments.findIndex((segment) =>
    ["DATABASE", "DB", "POSTGRES"].includes(segment)
  );
  if (databaseIndex === -1) {
    return false;
  }
  const connectionSegments = new Set([
    "URL", "HOST", "HOSTADDR", "PORT", "NAME", "USER", "PASSWORD", "PASS",
    "SERVICE", "SERVICEFILE", "CA", "CERT", "KEY"
  ]);
  return segments.slice(databaseIndex + 1).some((segment) => connectionSegments.has(segment));
}

function isApprovedStage1QueryPath(value) {
  return (
    typeof value === "string" &&
    Object.hasOwn(N9_STAGE1_QUERY_FILES, value)
  );
}

function sha256FileContent(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isFileBoundQueryArgs(cliArgs) {
  return (
    cliArgs.slice(0, 3).join(" ") === "db query --local" &&
    cliArgs.length === 5 &&
    cliArgs[3] === "--file" &&
    isApprovedStage1QueryPath(cliArgs[4])
  );
}

function isExactStage1PgTapArgs(cliArgs) {
  if (cliArgs.slice(0, 3).join(" ") !== "test db --local") {
    return false;
  }
  const files = cliArgs.slice(3);
  const fullSet =
    files.length === N9_STAGE1_PGTAP_FILES.length &&
    files.every((file, index) => file === N9_STAGE1_PGTAP_FILES[index]);
  const singleFile = files.length === 1 && N9_STAGE1_PGTAP_FILE_SET.has(files[0]);
  return fullSet || singleFile;
}

export function localCliEnvironment(overrides = {}, baseEnvironment = process.env) {
  if (Object.keys(overrides).some((name) => name !== "DOCKER_HOST")) {
    throw new Error("N9 local CLI environment override is not allowed.");
  }
  const environment = { ...baseEnvironment };
  for (const name of Object.keys(baseEnvironment)) {
    if (
      /^(?:DOCKER_HOST|DOCKER_CONTEXT|DOCKER_TLS_VERIFY|DOCKER_CERT_PATH)$/.test(name) ||
      /^(?:SUPABASE_|NEXT_PUBLIC_SUPABASE_)/.test(name) ||
      /^PG[A-Z0-9_]*$/.test(name) ||
      /^(?:DATABASE_URL|DIRECT_URL|POSTGRES_URL(?:_NON_POOLING)?|POSTGRES_(?:HOST|PORT|USER|PASSWORD|DATABASE))$/.test(name) ||
      /(?:^|_)(?:DATABASE_URL|DB_URL|SERVICE_ROLE_KEY|ANON_KEY|PUBLISHABLE_KEY)(?:_|$)/.test(name) ||
      isDatabaseConnectionEnvironmentName(name) ||
      /(?:^|_)(?:ACCESS_KEY|ACCESS_TOKEN|API_KEY|AUTHORIZATION|CREDENTIALS?|PASSWORD|PRIVATE_KEY|SECRET|TOKEN)(?:_|$)/.test(name) ||
      /^(?:SSH_AUTH_SOCK|GIT_ASKPASS|SSH_ASKPASS)$/.test(name)
    ) {
      delete environment[name];
    }
  }
  return { ...environment, ...overrides };
}

function localCliPath() {
  return path.join(repoRoot, "node_modules", ".bin", "supabase");
}

function runProfileCli(profile, args, options = {}) {
  return runCommand(localCliPath(), profileSupabaseArgs(profile, args), {
    cwd: repoRoot,
    ...options,
    env: localCliEnvironment(options.env)
  });
}

const INVALID_STATUS_OUTPUT = "N9 local status credential output is invalid.";

function credentialValuesMatch(left, right) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  try {
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  } finally {
    leftBuffer.fill(0);
    rightBuffer.fill(0);
  }
}

export function parseLocalStatusCredentials(output, profile) {
  let values;
  try {
    values = JSON.parse(output);
  } catch {
    throw new Error(INVALID_STATUS_OUTPUT);
  }
  if (
    values === null ||
    Array.isArray(values) ||
    typeof values !== "object" ||
    Object.hasOwn(values, "PROJECT_REF") ||
    Object.hasOwn(values, "PROJECT_ID") ||
    values.API_URL !== `http://127.0.0.1:${profile.ports.api}`
  ) {
    throw new Error(INVALID_STATUS_OUTPUT);
  }
  const clientKey = typeof values.PUBLISHABLE_KEY === "string" && values.PUBLISHABLE_KEY.length > 0
    ? values.PUBLISHABLE_KEY
    : typeof values.ANON_KEY === "string" && values.ANON_KEY.length > 0
      ? values.ANON_KEY
      : null;
  if (clientKey === null) {
    throw new Error(INVALID_STATUS_OUTPUT);
  }
  return {
    url: values.API_URL,
    anonKey: clientKey
  };
}

export function retrieveLocalStatusCredentials(profile, runner = runProfileCli) {
  let result;
  try {
    result = runner(profile, [
      "status",
      "-o",
      "json",
      "--network-id",
      profile.networkName
    ]);
    return parseLocalStatusCredentials(result.stdout, profile);
  } catch {
    throw new Error("N9 local credential retrieval failed.");
  } finally {
    if (result) {
      result.stdout = "";
      result.stderr = "";
    }
  }
}

export function parseGeneratedAuthEnabled(config) {
  let inAuthSection = false;
  let enabled;
  for (const line of config.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) {
      inAuthSection = trimmed === "[auth]";
      continue;
    }
    if (inAuthSection) {
      enabled = trimmed.match(/^enabled\s*=\s*(true|false)$/)?.[1];
      if (enabled !== undefined) break;
    }
  }
  if (enabled === undefined) {
    throw new Error("N9 local auth configuration is invalid.");
  }
  return enabled === "true";
}

export async function readGeneratedAuthEnabled(profile, reader = readFile) {
  const config = await reader(path.join(profile.workdir, "supabase", "config.toml"), "utf8");
  return parseGeneratedAuthEnabled(config);
}

class LocalDataApiCredentialFailure extends Error {
  constructor(kind) {
    super("N9 local Data API credential validation failed.");
    this.kind = kind;
  }
}

export async function validateLocalDataApiCredential(profile, credentials, fetchImpl = globalThis.fetch) {
  const expectedUrl = `http://127.0.0.1:${profile.ports.api}`;
  if (
    credentials?.url !== expectedUrl ||
    typeof credentials?.anonKey !== "string" ||
    credentials.anonKey.length === 0 ||
    typeof fetchImpl !== "function"
  ) {
    throw new LocalDataApiCredentialFailure("INVALID_TARGET");
  }
  const endpoint = `${expectedUrl}/rest/v1/`;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      headers: {
        apikey: credentials.anonKey,
        Authorization: `Bearer ${credentials.anonKey}`
      },
      redirect: "error",
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    throw new LocalDataApiCredentialFailure("CONNECTION_FAILED");
  }
  if (!response || response.status < 200 || response.status >= 300) {
    throw new LocalDataApiCredentialFailure("REJECTED");
  }
  if (typeof response.body?.cancel === "function") {
    try {
      await response.body.cancel();
    } catch {
      // The status-only request already established the response classification.
    }
  }
  return { state: "ACCEPTED" };
}

function runProfileCliAsync(profile, args, options = {}) {
  return runCommandAsync(localCliPath(), profileSupabaseArgs(profile, args), {
    cwd: repoRoot,
    ...options,
    env: localCliEnvironment(options.env)
  });
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

export async function loadProfileEnv(profile, { afterOpenForTest = null, expectedIdentity = null } = {}) {
  let handle;
  try {
    handle = await open(profile.envPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("PROFILE_SECRET_ENV_MISSING");
    }
    throw new Error("N9 local profile env must be a regular mode-0600 file.");
  }
  let contents;
  try {
    const openedStat = await handle.stat();
    if (
      !openedStat.isFile() ||
      (openedStat.mode & 0o777) !== 0o600 ||
      expectedIdentity !== null && !sameFileIdentity(openedStat, expectedIdentity)
    ) {
      throw new Error("N9 local profile env must be a regular mode-0600 file.");
    }
    await afterOpenForTest?.();
    contents = await handle.readFile("utf8");
    const finalPathStat = await lstat(profile.envPath);
    if (
      finalPathStat.isSymbolicLink() ||
      !sameFileIdentity(openedStat, finalPathStat)
    ) {
      throw new Error("N9 local profile env changed during validation.");
    }
  } finally {
    await handle.close();
  }
  const values = parseEnv(contents);
  const keys = Object.keys(values).sort();
  if (
    keys.join(",") !== "SUPABASE_ANON_KEY,SUPABASE_URL" ||
    values.SUPABASE_URL !== `http://127.0.0.1:${profile.ports.api}` ||
    !values.SUPABASE_ANON_KEY
  ) {
    throw new Error("N9 local profile env does not match the exact local target contract.");
  }
  return values;
}

async function inspectProfileEnvIdentity(profile) {
  let stat;
  try {
    stat = await lstat(profile.envPath);
  } catch {
    throw new Error("N9 local profile env must be a regular mode-0600 file.");
  }
  if (!stat.isFile() || (stat.mode & 0o777) !== 0o600) {
    throw new Error("N9 local profile env must be a regular mode-0600 file.");
  }
  return { dev: stat.dev, ino: stat.ino };
}

async function correlateProfileEnv(profile, credentials, expectedIdentity = null) {
  const values = await loadProfileEnv(profile, { expectedIdentity });
  return credentialValuesMatch(values.SUPABASE_ANON_KEY, credentials.anonKey)
    ? "MATCH"
    : "MISMATCH";
}

class ProfileEnvDispositionFailure extends Error {
  constructor(envState, temporaryEnv = "ABSENT") {
    super("N9 local profile env publication or correlation failed.");
    this.envState = envState;
    this.temporaryEnv = temporaryEnv;
  }
}

async function correlatePreservedProfileEnv(correlate, profile, credentials, expectedIdentity = null) {
  try {
    return await correlate(profile, credentials, expectedIdentity);
  } catch {
    throw new ProfileEnvDispositionFailure(
      expectedIdentity === null ? "PRESERVED_UNCORRELATED" : "CREATED"
    );
  }
}

export async function publishOrCorrelateProfileEnv(profile, credentials, {
  publishLink = link,
  correlate = correlateProfileEnv,
  removeTemporary = unlink
} = {}) {
  const expectedUrl = `http://127.0.0.1:${profile.ports.api}`;
  if (
    credentials?.url !== expectedUrl ||
    typeof credentials?.anonKey !== "string" ||
    credentials.anonKey.length === 0
  ) {
    throw new Error("N9 local profile credential input is invalid.");
  }
  try {
    await lstat(profile.envPath);
    return correlatePreservedProfileEnv(correlate, profile, credentials);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const temporary = `${profile.envPath}.tmp-${process.pid}-${randomUUID()}`;
  let handle = null;
  let temporaryExists = false;
  let temporaryCleanupAttempted = false;
  let createdIdentity = null;
  let publishedEnvState = "ABSENT";
  const removeTemporaryOnce = async () => {
    if (!temporaryExists || temporaryCleanupAttempted) {
      return;
    }
    temporaryCleanupAttempted = true;
    try {
      await removeTemporary(temporary);
      temporaryExists = false;
    } catch {
      throw new ProfileEnvDispositionFailure(
        publishedEnvState,
        "PRESERVED_UNREMOVED"
      );
    }
  };
  try {
    handle = await open(temporary, "wx", 0o600);
    temporaryExists = true;
    await handle.writeFile(
      `SUPABASE_URL=${JSON.stringify(credentials.url)}\n` +
      `SUPABASE_ANON_KEY=${JSON.stringify(credentials.anonKey)}\n`,
      "utf8"
    );
    await handle.chmod(0o600);
    await handle.sync();
    createdIdentity = await handle.stat();
    await handle.close();
    handle = null;
    try {
      await publishLink(temporary, profile.envPath);
      publishedEnvState = "CREATED";
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
      publishedEnvState = "PRESERVED_UNCORRELATED";
      await removeTemporaryOnce();
      return correlatePreservedProfileEnv(correlate, profile, credentials);
    }
    await removeTemporaryOnce();
    const result = await correlatePreservedProfileEnv(
      correlate,
      profile,
      credentials,
      createdIdentity
    );
    if (result !== "MATCH") {
      throw new ProfileEnvDispositionFailure("CREATED");
    }
    return "CREATED";
  } finally {
    await handle?.close().catch(() => {});
    await removeTemporaryOnce();
  }
}

function assertProfileEnvIgnored(profile) {
  runCommand("git", ["check-ignore", "--quiet", "--", profile.envFile], {
    cwd: repoRoot
  });
}

function validateExistingProfile(profile, classification) {
  if (classification.state !== PROFILE_RESOURCE_STATES.TARGET_OWNED_EXISTING) {
    throw new Error(`N9 local stack is not owned and ready: ${classification.state}`);
  }
  return classification;
}

export async function validateProfileHealth(profile, expectedCredentials, {
  preflight = preflightProfileResources,
  retrieveCredentials = retrieveLocalStatusCredentials
} = {}) {
  const ready = validateExistingProfile(profile, await preflight(profile));
  const observedCredentials = await retrieveCredentials(profile);
  if (
    observedCredentials.url !== expectedCredentials.url ||
    !credentialValuesMatch(observedCredentials.anonKey, expectedCredentials.anonKey)
  ) {
    throw new Error("N9 local profile health correlation failed.");
  }
  return ready;
}

export async function validateAuthDisabledLocalRuntimeHealth(profile, credentials, {
  preflight = preflightProfileResources,
  validateDataApi = validateLocalDataApiCredential
} = {}) {
  const ready = validateExistingProfile(profile, await preflight(profile));
  const dataApi = await validateDataApi(profile, credentials);
  if (dataApi?.state !== "ACCEPTED") {
    throw new LocalDataApiCredentialFailure("REJECTED");
  }
  return ready;
}

const START_OUTCOMES = Object.freeze({
  HEALTHY: "N9_STAGE_1_LOCAL_RUNTIME_CREATED_AND_HEALTHY",
  STOP: "N9_STAGE_1_LOCAL_RUNTIME_CREATION_STOP",
  FAILED_CLEANED: "N9_STAGE_1_LOCAL_RUNTIME_CREATION_FAILED_CLEANED",
  OUTCOME_UNKNOWN: "N9_STAGE_1_LOCAL_RUNTIME_CREATION_OUTCOME_UNKNOWN"
});

const START_FAILURE_CODES = new Set([
  "ENTRY_STOP",
  "NETWORK_STOP",
  "PROXY_CREATE_STOP",
  "START_STOP",
  "OWNERSHIP_STOP",
  "CREDENTIAL_STATUS_STOP",
  "DATA_API_STOP",
  "ENV_PUBLICATION_STOP",
  "CREDENTIAL_MISMATCH",
  "ENV_VALIDATION_STOP",
  "HEALTH_STOP",
  "REPORTING_STOP",
  "PROXY_CLOSE_STOP"
]);

class StartStageFailure extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function createStartAttempt() {
  return {
    phase: "ENTRY",
    startCount: 0,
    retryCount: 0,
    runtimeMutation: "NOT_STARTED",
    entryEnv: "ABSENT",
    envState: "ABSENT",
    temporaryEnv: "ABSENT",
    credentials: "NOT_RETRIEVED",
    ownership: "NOT_VALIDATED",
    health: "NOT_VALIDATED",
    authMode: "NOT_READ",
    dataApi: "NOT_VALIDATED",
    primaryFailure: null,
    runtimeCleanup: "NOT_REQUIRED",
    proxyClose: "NOT_REQUIRED",
    terminalClassifications: []
  };
}

async function inspectProfileEnvPresence(profile) {
  try {
    await lstat(profile.envPath);
    return "PRESERVED_UNCORRELATED";
  } catch (error) {
    if (error.code === "ENOENT") {
      return "ABSENT";
    }
    throw new StartStageFailure("ENTRY_STOP");
  }
}

async function runStartStage(attempt, phase, failureCode, operation) {
  attempt.phase = phase;
  try {
    return await operation();
  } catch {
    throw new StartStageFailure(failureCode);
  }
}

function startFailureCode(error, fallback = "ENTRY_STOP") {
  return error instanceof StartStageFailure && START_FAILURE_CODES.has(error.code)
    ? error.code
    : fallback;
}

function envIsPreserved(attempt) {
  return attempt.envState !== "ABSENT";
}

function finalizeFailedStartAttempt(attempt) {
  const cleanupComplete = attempt.runtimeCleanup === "ATTEMPTED_COMPLETE";
  const proxyComplete = attempt.proxyClose !== "ATTEMPTED_INCOMPLETE";
  const temporaryEnvPreserved = attempt.temporaryEnv === "PRESERVED_UNREMOVED";
  let outcome;
  if (attempt.runtimeMutation === "NOT_STARTED") {
    outcome = START_OUTCOMES.STOP;
  } else if (!envIsPreserved(attempt) && !temporaryEnvPreserved && cleanupComplete && proxyComplete) {
    outcome = START_OUTCOMES.FAILED_CLEANED;
  } else {
    outcome = START_OUTCOMES.OUTCOME_UNKNOWN;
  }
  const classifications = [outcome];
  if (envIsPreserved(attempt)) {
    classifications.push("PROFILE_ENV_PRESERVED");
  }
  if (attempt.envState === "MISMATCH") {
    classifications.push("CREDENTIAL_MISMATCH");
  }
  if (attempt.runtimeCleanup === "ATTEMPTED_INCOMPLETE") {
    classifications.push("PARTIAL_N9_RESOURCE_PRESERVED");
  }
  if (attempt.temporaryEnv === "PRESERVED_UNREMOVED") {
    classifications.push("TEMP_PROFILE_ENV_PRESERVED");
  }
  classifications.push("RETRY_0");
  attempt.phase = "FAILED";
  attempt.terminalClassifications = classifications;
  return attempt;
}

function publicStartAttempt(attempt) {
  return Object.freeze({
    phase: attempt.phase,
    startCount: attempt.startCount,
    retryCount: attempt.retryCount,
    runtimeMutation: attempt.runtimeMutation,
    entryEnv: attempt.entryEnv,
    envState: attempt.envState,
    temporaryEnv: attempt.temporaryEnv,
    credentials: attempt.credentials,
    ownership: attempt.ownership,
    health: attempt.health,
    authMode: attempt.authMode,
    dataApi: attempt.dataApi,
    primaryFailure: attempt.primaryFailure,
    runtimeCleanup: attempt.runtimeCleanup,
    proxyClose: attempt.proxyClose,
    terminalClassifications: Object.freeze([...attempt.terminalClassifications])
  });
}

function formatStartAttempt(attempt) {
  return [
    ...attempt.terminalClassifications,
    `FAILURE_STAGE_${attempt.primaryFailure ?? "NONE"}`,
    `ENV_STATE_${attempt.envState}`,
    `TEMP_ENV_STATE_${attempt.temporaryEnv}`,
    `RUNTIME_CLEANUP_${attempt.runtimeCleanup}`,
    `PROXY_CLOSE_${attempt.proxyClose}`
  ].join("\n");
}

class N9RuntimeStartError extends Error {
  constructor(attempt) {
    super(formatStartAttempt(attempt));
    this.name = "N9RuntimeStartError";
    this.attempt = publicStartAttempt(attempt);
  }
}

export async function startStack(profile, dependencies = {}) {
  const operations = {
    assertIgnored: assertProfileEnvIgnored,
    materialize: (selected) => materializeGeneratedWorkdir(repoRoot, selected),
    validateWorkdir: (selected) => validateGeneratedWorkdir(repoRoot, selected),
    preflight: preflightProfileResources,
    snapshot: captureProfileSnapshot,
    ensureNetwork: ensureProfileNetwork,
    createProxy: createDockerLocalhostProxy,
    startCli: (selected, proxy) => runProfileCliAsync(selected, [
      "start",
      "--network-id",
      selected.networkName
    ], {
      env: { DOCKER_HOST: proxy.dockerHost }
    }),
    retrieveCredentials: retrieveLocalStatusCredentials,
    readAuthEnabled: readGeneratedAuthEnabled,
    inspectEnvIdentity: inspectProfileEnvIdentity,
    validateDataApi: validateLocalDataApiCredential,
    publishEnv: publishOrCorrelateProfileEnv,
    validateEnv: loadProfileEnv,
    validateHealth: validateProfileHealth,
    inspectEnv: inspectProfileEnvPresence,
    cleanup: cleanupAttemptResources,
    write: (message) => process.stdout.write(message),
    ...dependencies
  };
  const attempt = createStartAttempt();
  let classification = null;
  let before = null;
  let proxy = null;
  let credentials = null;
  let authEnabled = null;
  let primaryFailure = null;

  try {
    await runStartStage(attempt, "ENTRY", "ENTRY_STOP", () => operations.assertIgnored(profile));
    await runStartStage(attempt, "ENTRY", "ENTRY_STOP", () => operations.materialize(profile));
    await runStartStage(attempt, "ENTRY", "ENTRY_STOP", () => operations.validateWorkdir(profile));
    authEnabled = await runStartStage(
      attempt,
      "ENTRY",
      "ENTRY_STOP",
      () => operations.readAuthEnabled(profile)
    );
    attempt.authMode = authEnabled ? "ENABLED" : "DISABLED";
    attempt.entryEnv = await runStartStage(
      attempt,
      "ENTRY",
      "ENTRY_STOP",
      () => operations.inspectEnv(profile)
    );
    attempt.envState = attempt.entryEnv;
    classification = await runStartStage(attempt, "ENTRY", "ENTRY_STOP", async () =>
      assertProfileMayProceed(await operations.preflight(profile))
    );
    if (classification.state !== PROFILE_RESOURCE_STATES.TARGET_OWNED_ABSENT) {
      throw new StartStageFailure("ENTRY_STOP");
    }
    let prevalidatedEnv = null;
    let prevalidatedEnvIdentity = null;
    if (!authEnabled) {
      prevalidatedEnv = await runStartStage(
        attempt,
        "ENTRY",
        "ENV_VALIDATION_STOP",
        () => operations.validateEnv(profile)
      );
      credentials = {
        url: prevalidatedEnv.SUPABASE_URL,
        anonKey: prevalidatedEnv.SUPABASE_ANON_KEY
      };
      prevalidatedEnvIdentity = await runStartStage(
        attempt,
        "ENTRY",
        "ENV_VALIDATION_STOP",
        () => operations.inspectEnvIdentity(profile)
      );
      attempt.credentials = "ENV_PREVALIDATED";
    }
    before = await runStartStage(attempt, "ENTRY", "ENTRY_STOP", () => operations.snapshot(profile));

    attempt.runtimeMutation = "STARTED";
    await runStartStage(attempt, "MUTATION_STARTED", "NETWORK_STOP", () =>
      operations.ensureNetwork(profile)
    );
    proxy = await runStartStage(attempt, "MUTATION_STARTED", "PROXY_CREATE_STOP", () =>
      operations.createProxy({ expectedProjectId: profile.projectId })
    );
    await runStartStage(attempt, "MUTATION_STARTED", "REPORTING_STOP", () =>
      operations.write(`${safeProfileSummary(profile, classification)}\n`)
    );
    attempt.startCount = 1;
    await runStartStage(attempt, "MUTATION_STARTED", "START_STOP", () =>
      operations.startCli(profile, proxy)
    );
    await runStartStage(attempt, "STACK_OWNED", "OWNERSHIP_STOP", async () =>
      validateExistingProfile(profile, await operations.preflight(profile))
    );
    attempt.ownership = "VALIDATED";
    if (authEnabled) {
      credentials = await runStartStage(attempt, "CREDENTIALS_OBSERVED", "CREDENTIAL_STATUS_STOP", () =>
        operations.retrieveCredentials(profile)
      );
      attempt.credentials = "RETRIEVED";
      attempt.phase = "ENV_DISPOSITION_FIXED";
      try {
        attempt.envState = await operations.publishEnv(profile, credentials);
      } catch (error) {
        if (["CREATED", "PRESERVED_UNCORRELATED"].includes(error?.envState)) {
          attempt.envState = error.envState;
        }
        if (error?.temporaryEnv === "PRESERVED_UNREMOVED") {
          attempt.temporaryEnv = error.temporaryEnv;
        }
        throw new StartStageFailure("ENV_PUBLICATION_STOP");
      }
      if (attempt.envState === "MISMATCH") {
        throw new StartStageFailure("CREDENTIAL_MISMATCH");
      }
      await runStartStage(attempt, "ENV_VALIDATED", "ENV_VALIDATION_STOP", () =>
        operations.validateEnv(profile)
      );
      const ready = await runStartStage(attempt, "HEALTH_VALIDATED", "HEALTH_STOP", () =>
        operations.validateHealth(profile, credentials)
      );
      attempt.health = "VALIDATED";
      attempt.phase = "HEALTH_VALIDATED";
      classification = ready;
    } else {
      try {
        classification = await validateAuthDisabledLocalRuntimeHealth(profile, credentials, {
          preflight: operations.preflight,
          validateDataApi: operations.validateDataApi
        });
        const postvalidatedEnv = await runStartStage(
          attempt,
          "DATA_API_VALIDATED",
          "ENV_VALIDATION_STOP",
          () => operations.validateEnv(profile, { expectedIdentity: prevalidatedEnvIdentity })
        );
        if (
          postvalidatedEnv.SUPABASE_URL !== credentials.url ||
          !credentialValuesMatch(postvalidatedEnv.SUPABASE_ANON_KEY, credentials.anonKey)
        ) {
          attempt.envState = "MISMATCH";
          throw new StartStageFailure("CREDENTIAL_MISMATCH");
        }
        attempt.envState = "MATCH";
        attempt.dataApi = "VALIDATED";
      } catch (error) {
        attempt.dataApi = error?.kind ?? "FAILED";
        if (error instanceof StartStageFailure) throw error;
        throw new StartStageFailure("DATA_API_STOP");
      }
      attempt.health = "VALIDATED";
      attempt.phase = "HEALTH_VALIDATED";
    }
  } catch (error) {
    primaryFailure = startFailureCode(error);
  }

  if (proxy !== null) {
    attempt.proxyClose = "ATTEMPTED_COMPLETE";
    try {
      await proxy.close();
    } catch {
      attempt.proxyClose = "ATTEMPTED_INCOMPLETE";
      primaryFailure ??= "PROXY_CLOSE_STOP";
    }
    proxy = null;
  }

  if (primaryFailure === null) {
    try {
      await runStartStage(attempt, "PROXY_CLOSED", "REPORTING_STOP", () => {
        operations.write(`${safeProfileSummary(profile, classification)}\n`);
        operations.write(`N9 local profile env: ${attempt.envState} (value hidden)\n`);
        operations.write("N9 local Supabase profile: ready (values hidden)\n");
        operations.write(`${START_OUTCOMES.HEALTHY}\n`);
      });
    } catch (error) {
      primaryFailure = startFailureCode(error, "REPORTING_STOP");
    }
  }

  if (primaryFailure !== null) {
    attempt.primaryFailure = primaryFailure;
    if (attempt.runtimeMutation === "STARTED") {
      attempt.runtimeCleanup = "ATTEMPTED_COMPLETE";
      try {
        await operations.cleanup(profile, before);
      } catch {
        attempt.runtimeCleanup = "ATTEMPTED_INCOMPLETE";
      }
    }
    credentials = null;
    throw new N9RuntimeStartError(finalizeFailedStartAttempt(attempt));
  }

  credentials = null;
  attempt.phase = "READY";
  attempt.terminalClassifications = [START_OUTCOMES.HEALTHY];
  return publicStartAttempt(attempt);
}

export async function statusStack(profile) {
  await loadProfileEnv(profile);
  await validateGeneratedWorkdir(repoRoot, profile);
  const classification = await preflightProfileResources(profile);
  process.stdout.write(`${safeProfileSummary(profile, classification)}\n`);
}

export async function stopStack(profile) {
  await loadProfileEnv(profile);
  await validateGeneratedWorkdir(repoRoot, profile);
  const classification = validateExistingProfile(
    profile,
    await preflightProfileResources(profile)
  );
  process.stdout.write(`${safeProfileSummary(profile, classification)}\n`);
  runProfileCli(profile, ["stop", "--project-id", profile.projectId]);
  const after = inspectDockerProfileResources(profile);
  if (after.containers.some((container) =>
    container.projectId === profile.projectId ||
    container.networks.includes(profile.networkName)
  )) {
    throw new Error("N9 stop left selected-profile containers behind.");
  }
  if (after.network !== null) {
    if (
      after.network.Labels?.["wtv.local.profile"] !== profile.id ||
      after.network.Labels?.["wtv.local.project"] !== profile.projectId ||
      Object.keys(after.network.Containers ?? {}).length !== 0
    ) {
      throw new Error("N9 stop preserved a network with unprovable ownership.");
    }
    runLocalDockerCommand(["network", "rm", profile.networkName]);
  }
  process.stdout.write("N9 local Supabase stack: stopped; profile env and persistent volumes retained\n");
}

async function runLocalCommand(profile, rawArgs) {
  assertProfileEnvIgnored(profile);
  await validateGeneratedWorkdir(repoRoot, profile);
  await loadProfileEnv(profile);
  const parsed = validateN9CommandArgs(rawArgs);
  await assertN9TestFilePaths(parsed.cliArgs);
  await assertN9Stage1QueryFilePath(parsed.cliArgs);
  await assertN9Stage1PgTapFilePaths(parsed.cliArgs);
  const classification = validateExistingProfile(
    profile,
    await preflightProfileResources(profile)
  );
  process.stdout.write(`${safeProfileSummary(profile, classification)}\n`);
  const needsDatabaseCreate = parsed.command === "db reset";
  const before = captureProfileSnapshot(profile);
  const abortController = needsDatabaseCreate ? new AbortController() : null;
  const proxy = needsDatabaseCreate
    ? await createDockerLocalhostProxy({
        requireDatabaseCreate: true,
        expectedProjectId: profile.projectId,
        onReject: () => abortController.abort()
      })
    : null;
  try {
    const result = await runProfileCliAsync(profile, [
      ...parsed.cliArgs,
      "--network-id",
      profile.networkName
    ], proxy ? {
      signal: abortController.signal,
      env: { DOCKER_HOST: proxy.dockerHost }
    } : {});
    proxy?.assertExpectedDatabaseCreateObserved();
    validateExistingProfile(profile, await preflightProfileResources(profile));
    process.stdout.write(`N9 local Supabase command completed: ${parsed.command}\n`);
  } catch (error) {
    if (needsDatabaseCreate) {
      try {
        cleanupAttemptResources(profile, before);
      } catch (cleanupError) {
        throw new Error(
          `${sanitizeCliFailure(error)}\nN9 reset cleanup STOP: ${cleanupError.message}`
        );
      }
    }
    throw new Error(sanitizeCliFailure(error));
  } finally {
    await proxy?.close();
  }
}

export function validateN9CommandArgs(rawArgs) {
  const parsed = parseWrapperArguments(rawArgs);
  if (parsed.command.startsWith("credential ")) {
    throw new Error("N9 profile does not authorize N5 credential operations.");
  }
  assertLocalOnlyCommandForTest(parsed.cliArgs);
  if (
    parsed.diagnosticDirectory !== null ||
    parsed.credentialQuarantineDirectory !== undefined
  ) {
    throw new Error("N9 profile does not accept diagnostic or credential side-channel flags.");
  }
  const exactCommand = parsed.cliArgs.join(" ");
  if (
    !EXACT_N9_COMMANDS.has(exactCommand) &&
    !isFileBoundQueryArgs(parsed.cliArgs) &&
    !isExactStage1PgTapArgs(parsed.cliArgs)
  ) {
    throw new Error("N9 profile accepts only the exact bounded local command forms.");
  }
  return parsed;
}

async function assertNoSymlinkPath(absolute, root) {
  const relative = path.relative(root, absolute);
  if (relative === "" || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("N9 artifact path is outside the repository.");
  }
  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) {
      throw new Error("N9 artifact path must not contain symlinks.");
    }
  }
}

export async function assertN9Stage1QueryFilePath(cliArgs, root = repoRoot) {
  if (cliArgs.slice(0, 3).join(" ") !== "db query --local") {
    return;
  }
  if (!isFileBoundQueryArgs(cliArgs)) {
    throw new Error("N9 catalog query must use one approved repository SQL file.");
  }
  const absolute = path.resolve(root, cliArgs[4]);
  const queryRoot = path.resolve(root, N9_STAGE1_QUERY_DIRECTORY);
  const relativeToQueryRoot = path.relative(queryRoot, absolute);
  if (
    relativeToQueryRoot === "" ||
    relativeToQueryRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToQueryRoot)
  ) {
    throw new Error("N9 catalog query path is outside the approved Stage 1 directory.");
  }
  await assertNoSymlinkPath(absolute, path.resolve(root));
  const stat = await lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("N9 catalog query must be a regular non-symlink file.");
  }
  const query = await readFile(absolute, "utf8");
  const expectedSha = N9_STAGE1_QUERY_FILES[cliArgs[4]];
  if (sha256FileContent(query) !== expectedSha) {
    throw new Error("N9 catalog query identity does not match the fixed Stage 1 artifact.");
  }
  if (!query.endsWith("\n") || query.includes("\uFEFF")) {
    throw new Error("N9 catalog query must be UTF-8 without BOM and have a final newline.");
  }
  const withoutComments = query
    .replace(/--[^\r\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
  if (!/^WITH\b[\s\S]*\bSELECT\b[\s\S]*;?$|^SELECT\b[\s\S]*;?$/i.test(withoutComments)) {
    throw new Error("N9 catalog query must contain one SELECT or WITH ... SELECT statement.");
  }
  if (withoutComments.slice(0, -1).includes(";")) {
    throw new Error("N9 catalog query must contain exactly one statement.");
  }
  if (/\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|CALL|DO|COPY|VACUUM|ANALYZE|REFRESH|REINDEX|CLUSTER|SECURITY\s+LABEL)\b/i.test(withoutComments)) {
    throw new Error("N9 catalog query contains a mutation or side-effect statement.");
  }
}

export async function assertN9Stage1PgTapFilePaths(cliArgs, root = repoRoot) {
  if (cliArgs.slice(0, 3).join(" ") !== "test db --local") {
    return;
  }
  if (!isExactStage1PgTapArgs(cliArgs)) {
    throw new Error("N9 pgTAP scope must be the exact Stage 1 set or one exact member.");
  }
  for (const argument of cliArgs.slice(3)) {
    const absolute = path.resolve(root, argument);
    await assertNoSymlinkPath(absolute, path.resolve(root));
    const stat = await lstat(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error("N9 pgTAP file must be a regular non-symlink file.");
    }
  }
}

export async function assertN9TestFilePaths(cliArgs, root = repoRoot) {
  if (cliArgs.slice(0, 2).join(" ") !== "test db") {
    return;
  }
  const testRoot = path.join(root, "supabase", "tests");
  for (const argument of cliArgs.slice(3)) {
    const absolute = path.resolve(root, argument);
    if (
      path.isAbsolute(argument) ||
      argument.split(/[\\/]/).includes("..") ||
      (absolute !== testRoot && !absolute.startsWith(`${testRoot}${path.sep}`))
    ) {
      throw new Error("N9 test file must remain below supabase/tests.");
    }
    const stat = await lstat(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error("N9 test file must be a real regular file.");
    }
  }
}

export function parseN9WrapperArguments(args) {
  const selected = parseLocalProfileSelector(args, { defaultProfile: "n6" });
  if (!selected.explicit || selected.profileId !== EXACT_PROFILE) {
    throw new Error("N9 wrapper requires exact --profile n9-stage1.");
  }
  if (selected.args.length === 0) {
    throw new Error("N9 wrapper operation is missing.");
  }
  if (selected.args[0] === "stack") {
    if (selected.args.length !== 2 || !STACK_OPERATIONS.has(selected.args[1])) {
      throw new Error("N9 stack operation must be start, status, or stop.");
    }
    return { kind: "stack", operation: selected.args[1], cliArgs: [] };
  }
  return { kind: "command", operation: null, cliArgs: selected.args };
}

async function main() {
  const parsed = parseN9WrapperArguments(process.argv.slice(2));
  const profile = await resolveLocalProfile(repoRoot, EXACT_PROFILE);
  if (parsed.kind === "stack") {
    if (parsed.operation === "start") {
      await startStack(profile);
    } else if (parsed.operation === "status") {
      await statusStack(profile);
    } else {
      await stopStack(profile);
    }
    return;
  }
  await runLocalCommand(profile, parsed.cliArgs);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(`N9 local Supabase wrapper failed: ${error.message}`);
    process.exitCode = 1;
  });
}
