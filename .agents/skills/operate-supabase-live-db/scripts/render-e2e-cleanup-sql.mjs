#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROFILE_VERSION =
  "where-to-visit-collaborative-response-row-20260725010551";
const EXPECTED_SCHEMA = "public";
const EXPECTED_PREFIX = "[E2E]";
const COMMIT_AUTHORIZATION = "APPROVED_E2E_CLEANUP_COMMIT";
const RESCOPED_CONTRACT_VERSION =
  "S1-C1B-PRODUCTION-SMOKE-CLEANUP-RESCOPED-v1.0";
const RESCOPED_DATABASE = "postgres";
const RESCOPED_ROLE = "postgres";
const RESCOPED_SCHEMA = "public";
const RESCOPED_SQL_FILENAMES = {
  rollback: "rollback-validation.sql",
  commit: "commit-cleanup.sql"
};
const RESCOPED_GENERATION_RECORD_FILENAME = "generation-record.json";
const RESCOPED_COMPLETE_FILENAME = "COMPLETE";
const RESCOPED_TEST_FAULT_ENV =
  "WHERE_TO_VISIT_CLEANUP_RENDERER_TEST_FAULT";
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const COUNT_KEYS = [
  "events",
  "participants",
  "candidates",
  "criteria",
  "votes",
  "reactions",
  "concerns",
  "comments"
];
const LEGACY_TOP_LEVEL_FIELDS = new Set([
  "profileVersion",
  "schema",
  "prefix",
  "targetEventIds",
  "expectedCounts",
  "expectedRemainingPrefixEvents",
  "timeouts",
  "rollbackVerification",
  "commitAuthorization"
]);
const RESCOPED_ONLY_TOP_LEVEL_FIELDS = [
  "contractIdentity",
  "targetIdentity",
  "exactScope",
  "transactionSnapshotPolicy",
  "runtimeRequiredGuards",
  "runtimeNonRequiredGuards",
  "scopeDigestInput",
  "scopeDigest",
  "relevantSchemaIdentity",
  "provenance",
  "postcheckContract",
  "authorizationState"
];
const RESCOPED_TOP_LEVEL_FIELDS = new Set([
  ...LEGACY_TOP_LEVEL_FIELDS,
  ...RESCOPED_ONLY_TOP_LEVEL_FIELDS
]);
const RESCOPED_SNAPSHOT_POLICY = {
  discoveryPrimaryKeyEqualityRequired: false,
  deletionRoot: "exact Event UUID",
  lockCurrentEventAndChildRoots: true,
  stableLockOrderingRequired: true,
  snapshotCurrentTargetPrimaryKeysInsideTransaction: true,
  compareCurrentCountsWithExpectedCounts: true,
  requireSnapshotPrimaryKeysRemainingAfterDelete: 0,
  scopeExpansionBeyondExactEventGraphAllowed: false
};
const RESCOPED_REQUIRED_GUARDS = [
  "current_database equals postgres",
  "current_user equals postgres",
  "exact Event UUID matches exactly one row",
  "Event title matches [E2E]% marker",
  "all eight current entity counts match expectedCounts",
  "current Event and child roots are locked in stable order",
  "relevant FK identity and delete behavior match the schema profile",
  "delete-affecting trigger identity matches the schema profile",
  "boundary FK violation count is zero",
  "external reference count is zero",
  "all six cross-event invariant violation counts are zero",
  "DELETE root is limited to the exact Event UUID",
  "every generated explicit operation count matches its approved expectation",
  "target root remaining count is zero after deletion",
  "all eight transaction-snapshot primary-key remaining counts are zero",
  "all target-related row remaining counts are zero",
  "exactly one cleanup evidence result set is produced",
  "transaction terminator matches the separately authorized generation mode"
];
const RESCOPED_NON_REQUIRED_GUARDS = [
  "discovery-time child primary keys equal runtime child primary keys",
  "global Events total",
  "global non-target Events total",
  "Event created_at equals discovery-time value",
  "Criterion label and source equal discovery-time values",
  "all 15 PK and unique constraints are revalidated",
  "S1-b function attributes are revalidated",
  "project ref is compared inside SQL",
  "artifact SHA-256 is compared inside SQL"
];
const RESCOPED_FK_IDENTITY = {
  expected: 15,
  matched: 15,
  validated: 15,
  deferrable: 0,
  initiallyDeferred: 0,
  allDeleteBehaviorsMatchProfile: true
};
const RESCOPED_TRIGGER_IDENTITY = {
  expected: 13,
  matched: 13,
  definitionDigestMismatch: 0,
  deleteEventTriggerCount: 0
};
const RESCOPED_POSTCHECK_CONTRACT = {
  exactEventUuidRemaining: 0,
  targetRelatedRowsRemaining: 0,
  markerRemaining: 0,
  globalTotalsArePassConditions: false
};
const RESCOPED_TRANSACTION_EVIDENCE = {
  relevantForeignKeyIdentityVerified: true,
  relevantTriggerIdentityVerified: true,
  crossEventInvariantsVerified: true
};
const NULLABILITY_PROFILE = [
  ["participants", "event_id", "NO"],
  ["candidates", "event_id", "NO"],
  ["candidates", "created_by", "YES"],
  ["criteria", "event_id", "NO"],
  ["criteria", "created_by", "YES"],
  ["votes", "candidate_id", "NO"],
  ["votes", "participant_id", "NO"],
  ["reactions", "candidate_id", "NO"],
  ["reactions", "participant_id", "NO"],
  ["reactions", "criterion_id", "NO"],
  ["concerns", "candidate_id", "NO"],
  ["concerns", "participant_id", "NO"],
  ["concerns", "criterion_id", "NO"],
  ["comments", "candidate_id", "NO"],
  ["comments", "participant_id", "NO"]
];
const FK_PROFILE = [
  ["participants_event_id_fkey", "participants", ["event_id"], "events", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["candidates_event_id_fkey", "candidates", ["event_id"], "events", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["candidates_created_by_fkey", "candidates", ["created_by"], "participants", ["id"], "SET NULL", "NO ACTION", "SIMPLE", true, false, false],
  ["criteria_event_id_fkey", "criteria", ["event_id"], "events", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["criteria_created_by_fkey", "criteria", ["created_by"], "participants", ["id"], "SET NULL", "NO ACTION", "SIMPLE", true, false, false],
  ["votes_candidate_id_fkey", "votes", ["candidate_id"], "candidates", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["votes_participant_id_fkey", "votes", ["participant_id"], "participants", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["reactions_candidate_id_fkey", "reactions", ["candidate_id"], "candidates", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["reactions_participant_id_fkey", "reactions", ["participant_id"], "participants", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["reactions_criterion_id_fkey", "reactions", ["criterion_id"], "criteria", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["concerns_candidate_id_fkey", "concerns", ["candidate_id"], "candidates", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["concerns_participant_id_fkey", "concerns", ["participant_id"], "participants", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["concerns_criterion_id_fkey", "concerns", ["criterion_id"], "criteria", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["comments_candidate_id_fkey", "comments", ["candidate_id"], "candidates", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false],
  ["comments_participant_id_fkey", "comments", ["participant_id"], "participants", ["id"], "CASCADE", "NO ACTION", "SIMPLE", true, false, false]
];
const TRIGGER_PROFILE = [
  ["events", "events_prepare_row", "75c56d463a116b0fa7e201d4a56bf0a3898500cc1f48454790520c2deae3ac8f"],
  ["events", "events_after_insert_create_default_criterion", "fa2b9fc8ef4cf4cf68421183ed010e3aa7a7889c9391b4cac747fd2d5c97dc34"],
  ["participants", "participants_prepare_row", "550bac688efeb6d2ef2fd177da5a0068850a0771aeb7752530ce2046204611f1"],
  ["candidates", "candidates_prepare_row", "0dde3731ea75b5fe2b16ee94312d477c44f1e70f1862b7431d2ef1ef060edfec"],
  ["criteria", "criteria_prepare_row", "54ae997b8cee96afa228dbefdaab898e824042f2284376b25d5ee6194fc129c7"],
  ["votes", "votes_prepare_row", "fd3fa14caf93b8cc0b312971586815c607a440e3b228321eb34aef48da98ba31"],
  ["comments", "comments_prepare_row", "fba125ae772644c523a2233fdf7f00b28a17aea5ca5860b9e98d8360ef63f163"],
  ["votes", "votes_event_guard", "a8a2aab30f3baa193a87603e44211b55d8b55de5c425453932cc695f5ddbb378"],
  ["reactions", "reactions_event_guard", "a7d60da74b37c5734851de2e4b1ec61339fec2bf4d4987b5f5779ad94b9f909e"],
  ["concerns", "concerns_event_guard", "3941836089b15b8176e7e0a71786b3b4580e6b59abb9ec4b693de4344384d40c"],
  ["comments", "comments_event_guard", "6dc548819ef271d8cd2731add9f490d12dfa2ae9d8d85defd5896bc531cc5c9f"],
  ["reactions", "reactions_reject_update", "d255a51b23eae2406288505eec8161938cd08d8ed286b7686d0366d2c2069079"],
  ["concerns", "concerns_reject_update", "46a917f7406719055511f8f994601ab44a81d70907b5934371167c52bc2b8596"]
];
const MODES = new Set(["discovery", "rollback", "commit", "postcheck"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMEOUT_PATTERN = /^[1-9][0-9]*(ms|s|min)$/;

function usage() {
  return [
    "Usage:",
    "  node render-e2e-cleanup-sql.mjs --manifest <path> --mode <mode>",
    "  node render-e2e-cleanup-sql.mjs --manifest <absolute-path> --manifest-sha256 <sha256> \\",
    "    --authorization-record <absolute-path> --authorization-record-sha256 <sha256> \\",
    "    --mode rollback|commit --artifact-directory <absolute-path>",
    "  node render-e2e-cleanup-sql.mjs --validate-artifact-directory <absolute-path>",
    "",
    "Modes:",
    "  discovery  Render SELECT-only inventory, FK, and trigger queries.",
    "  rollback   Render guarded deletion validation ending in ROLLBACK.",
    "  commit     Render guarded permanent deletion ending in COMMIT.",
    "  postcheck  Render SELECT-only checks after COMMIT."
  ].join("\n");
}

function fail(message) {
  process.stderr.write("Error: " + message + "\n\n" + usage() + "\n");
  process.exit(1);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(usage() + "\n");
    process.exit(0);
  }
  if (argv[0] === "--validate-artifact-directory") {
    if (argv.length !== 2 || !argv[1]) {
      fail("--validate-artifact-directory requires exactly one path");
    }
    return { validationArtifactDirectory: argv[1] };
  }

  let manifestPath;
  let manifestSha256;
  let authorizationRecordPath;
  let authorizationRecordSha256;
  let mode;
  let artifactDirectory;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") {
      manifestPath = argv[index + 1];
      index += 1;
    } else if (arg === "--manifest-sha256") {
      manifestSha256 = argv[index + 1];
      index += 1;
    } else if (arg === "--authorization-record") {
      authorizationRecordPath = argv[index + 1];
      index += 1;
    } else if (arg === "--authorization-record-sha256") {
      authorizationRecordSha256 = argv[index + 1];
      index += 1;
    } else if (arg === "--mode") {
      mode = argv[index + 1];
      index += 1;
    } else if (arg === "--artifact-directory") {
      artifactDirectory = argv[index + 1];
      index += 1;
    } else {
      fail("unknown argument: " + arg);
    }
  }

  if (!manifestPath) fail("--manifest is required");
  if (!mode) fail("--mode is required");
  if (!MODES.has(mode)) fail("unsupported mode: " + mode);

  return {
    manifestPath,
    manifestSha256,
    authorizationRecordPath,
    authorizationRecordSha256,
    mode,
    artifactDirectory
  };
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function loadJsonFile(path, label) {
  const absolutePath = resolve(path);
  let raw;
  try {
    raw = readFileSync(absolutePath);
  } catch (error) {
    fail("cannot read " + label + ": " + error.message);
  }

  let value;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch (error) {
    fail(label + " is not valid JSON: " + error.message);
  }

  return { absolutePath, raw, sha256: sha256(raw), value };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireExact(actual, expected, label) {
  if (actual !== expected) {
    fail(label + " must be exactly " + JSON.stringify(expected));
  }
}

function requireNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(label + " must be a non-negative integer");
  }
}

function canonicalJsonValue(value) {
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalJsonValue(value[key])])
  );
}

function requireJsonExact(actual, expected, label) {
  if (
    JSON.stringify(canonicalJsonValue(actual)) !==
    JSON.stringify(canonicalJsonValue(expected))
  ) {
    fail(label + " does not match the rescoped contract");
  }
}

function isRescopedManifest(manifest) {
  return (
    manifest?.contractIdentity?.version === RESCOPED_CONTRACT_VERSION
  );
}

function classifyManifestFamily(manifest) {
  if (!isRecord(manifest)) fail("manifest root must be an object");

  const fields = Object.keys(manifest);
  const hasContractIdentity = Object.prototype.hasOwnProperty.call(
    manifest,
    "contractIdentity"
  );
  const presentRescopedFields = RESCOPED_ONLY_TOP_LEVEL_FIELDS.filter(
    (field) =>
      field !== "contractIdentity" &&
      Object.prototype.hasOwnProperty.call(manifest, field)
  );

  if (hasContractIdentity) {
    if (!isRecord(manifest.contractIdentity)) {
      fail("contractIdentity must be an object; legacy fallback is forbidden");
    }
    if (manifest.contractIdentity.version !== RESCOPED_CONTRACT_VERSION) {
      fail("unknown contract identity; legacy fallback is forbidden");
    }
    const unexpected = fields.filter(
      (field) => !RESCOPED_TOP_LEVEL_FIELDS.has(field)
    );
    if (unexpected.length > 0) {
      fail(
        "rescoped manifest contains unsupported top-level fields: " +
          unexpected.sort().join(", ")
      );
    }
    return "rescoped";
  }

  if (presentRescopedFields.length > 0) {
    fail(
      "ambiguous manifest contains rescoped-only fields without contractIdentity: " +
        presentRescopedFields.sort().join(", ") +
        "; legacy fallback is forbidden"
    );
  }

  const unexpected = fields.filter(
    (field) => !LEGACY_TOP_LEVEL_FIELDS.has(field)
  );
  if (unexpected.length > 0) {
    fail(
      "legacy manifest contains unsupported top-level fields: " +
        unexpected.sort().join(", ")
    );
  }
  return "legacy";
}

function rescopedScopeDigestInput(manifest) {
  const input = manifest.scopeDigestInput;
  if (!isRecord(input)) fail("scopeDigestInput must be an object");

  return {
    projectRef: input.projectRef,
    database: input.database,
    role: input.role,
    schema: input.schema,
    targetEventIds: [...(input.targetEventIds ?? [])],
    expectedCounts: Object.fromEntries(
      COUNT_KEYS.map((key) => [key, input.expectedCounts?.[key]])
    ),
    markerRequirement: input.markerRequirement,
    expectedMarkerRemainder: input.expectedMarkerRemainder,
    schemaProfileVersion: input.schemaProfileVersion,
    relevantForeignKeyIdentity: {
      expected: input.relevantForeignKeyIdentity?.expected,
      matched: input.relevantForeignKeyIdentity?.matched,
      validated: input.relevantForeignKeyIdentity?.validated,
      deferrable: input.relevantForeignKeyIdentity?.deferrable,
      initiallyDeferred:
        input.relevantForeignKeyIdentity?.initiallyDeferred,
      allDeleteBehaviorsMatchProfile:
        input.relevantForeignKeyIdentity?.allDeleteBehaviorsMatchProfile
    },
    relevantTriggerIdentity: {
      expected: input.relevantTriggerIdentity?.expected,
      matched: input.relevantTriggerIdentity?.matched,
      definitionDigestMismatch:
        input.relevantTriggerIdentity?.definitionDigestMismatch,
      deleteEventTriggerCount:
        input.relevantTriggerIdentity?.deleteEventTriggerCount
    },
    relationshipResults: {
      boundaryViolationCount:
        input.relationshipResults?.boundaryViolationCount,
      externalReferenceCount:
        input.relationshipResults?.externalReferenceCount,
      crossEventInvariantViolationCounts: {
        candidatesCreatedByEvent:
          input.relationshipResults?.crossEventInvariantViolationCounts
            ?.candidatesCreatedByEvent,
        criteriaCreatedByEvent:
          input.relationshipResults?.crossEventInvariantViolationCounts
            ?.criteriaCreatedByEvent,
        votesReferenceEvent:
          input.relationshipResults?.crossEventInvariantViolationCounts
            ?.votesReferenceEvent,
        reactionsReferenceEvent:
          input.relationshipResults?.crossEventInvariantViolationCounts
            ?.reactionsReferenceEvent,
        concernsReferenceEvent:
          input.relationshipResults?.crossEventInvariantViolationCounts
            ?.concernsReferenceEvent,
        commentsReferenceEvent:
          input.relationshipResults?.crossEventInvariantViolationCounts
            ?.commentsReferenceEvent
      }
    },
    transactionSnapshotPolicy: {
      discoveryPrimaryKeyEqualityRequired:
        input.transactionSnapshotPolicy?.discoveryPrimaryKeyEqualityRequired,
      deletionRoot: input.transactionSnapshotPolicy?.deletionRoot,
      lockCurrentEventAndChildRoots:
        input.transactionSnapshotPolicy?.lockCurrentEventAndChildRoots,
      stableLockOrderingRequired:
        input.transactionSnapshotPolicy?.stableLockOrderingRequired,
      snapshotCurrentTargetPrimaryKeysInsideTransaction:
        input.transactionSnapshotPolicy
          ?.snapshotCurrentTargetPrimaryKeysInsideTransaction,
      compareCurrentCountsWithExpectedCounts:
        input.transactionSnapshotPolicy?.compareCurrentCountsWithExpectedCounts,
      requireSnapshotPrimaryKeysRemainingAfterDelete:
        input.transactionSnapshotPolicy
          ?.requireSnapshotPrimaryKeysRemainingAfterDelete,
      scopeExpansionBeyondExactEventGraphAllowed:
        input.transactionSnapshotPolicy
          ?.scopeExpansionBeyondExactEventGraphAllowed
    },
    runtimeRequiredGuards: [...(input.runtimeRequiredGuards ?? [])],
    runtimeNonRequiredGuards: [...(input.runtimeNonRequiredGuards ?? [])],
    postcheckContract: {
      exactEventUuidRemaining:
        input.postcheckContract?.exactEventUuidRemaining,
      targetRelatedRowsRemaining:
        input.postcheckContract?.targetRelatedRowsRemaining,
      markerRemaining: input.postcheckContract?.markerRemaining,
      globalTotalsArePassConditions:
        input.postcheckContract?.globalTotalsArePassConditions
    }
  };
}

function cleanupScope(manifest) {
  return {
    profileVersion: manifest.profileVersion,
    schema: manifest.schema,
    prefix: manifest.prefix,
    targetEventIds: [...manifest.targetEventIds].sort(),
    expectedCounts: Object.fromEntries(
      COUNT_KEYS.map((key) => [key, manifest.expectedCounts[key]])
    ),
    expectedRemainingPrefixEvents: manifest.expectedRemainingPrefixEvents,
    timeouts: {
      lock: manifest.timeouts.lock,
      statement: manifest.timeouts.statement
    }
  };
}

function scopeDigest(manifest) {
  if (isRescopedManifest(manifest)) {
    return sha256(JSON.stringify(rescopedScopeDigestInput(manifest)));
  }
  return createHash("sha256")
    .update(JSON.stringify(cleanupScope(manifest)))
    .digest("hex");
}

function validateRescopedManifest(manifest) {
  requireExact(
    manifest.contractIdentity.verdict,
    "CLEANUP_CONTRACT_RESCOPED",
    "contractIdentity.verdict"
  );
  requireExact(
    manifest.targetIdentity.sqlDatabase,
    RESCOPED_DATABASE,
    "targetIdentity.sqlDatabase"
  );
  requireExact(
    manifest.targetIdentity.role,
    RESCOPED_ROLE,
    "targetIdentity.role"
  );
  requireExact(
    manifest.targetIdentity.schema,
    RESCOPED_SCHEMA,
    "targetIdentity.schema"
  );
  if (
    typeof manifest.targetIdentity.projectRef !== "string" ||
    manifest.targetIdentity.projectRef.length === 0
  ) {
    fail("targetIdentity.projectRef must be a non-empty provenance value");
  }

  requireExact(
    manifest.exactScope.eventId,
    manifest.targetEventIds[0],
    "exactScope.eventId"
  );
  requireExact(
    manifest.exactScope.markerRequirement,
    manifest.prefix + "%",
    "exactScope.markerRequirement"
  );
  requireExact(
    manifest.exactScope.expectedMarkerRemainder,
    manifest.expectedRemainingPrefixEvents,
    "exactScope.expectedMarkerRemainder"
  );
  requireJsonExact(
    manifest.exactScope.expectedCounts,
    manifest.expectedCounts,
    "exactScope.expectedCounts"
  );
  requireJsonExact(
    manifest.transactionSnapshotPolicy,
    manifest.scopeDigestInput.transactionSnapshotPolicy,
    "transactionSnapshotPolicy"
  );
  requireJsonExact(
    manifest.runtimeRequiredGuards,
    manifest.scopeDigestInput.runtimeRequiredGuards,
    "runtimeRequiredGuards"
  );
  requireJsonExact(
    manifest.runtimeNonRequiredGuards.map((value) =>
      value
        .replace("global Events total equals 9", "global Events total")
        .replace(
          "global non-target Events total equals 8",
          "global non-target Events total"
        )
    ),
    manifest.scopeDigestInput.runtimeNonRequiredGuards,
    "runtimeNonRequiredGuards"
  );

  const input = rescopedScopeDigestInput(manifest);
  requireExact(input.projectRef, manifest.targetIdentity.projectRef, "scope projectRef");
  requireExact(input.database, RESCOPED_DATABASE, "scope database");
  requireExact(input.role, RESCOPED_ROLE, "scope role");
  requireExact(input.schema, RESCOPED_SCHEMA, "scope schema");
  requireJsonExact(input.targetEventIds, manifest.targetEventIds, "scope targetEventIds");
  requireJsonExact(input.expectedCounts, manifest.expectedCounts, "scope expectedCounts");
  requireExact(input.markerRequirement, manifest.prefix + "%", "scope markerRequirement");
  requireExact(
    input.expectedMarkerRemainder,
    manifest.expectedRemainingPrefixEvents,
    "scope expectedMarkerRemainder"
  );
  requireExact(
    input.schemaProfileVersion,
    manifest.profileVersion,
    "scope schemaProfileVersion"
  );
  requireJsonExact(
    input.relevantForeignKeyIdentity,
    RESCOPED_FK_IDENTITY,
    "scope relevantForeignKeyIdentity"
  );
  requireJsonExact(
    input.relevantTriggerIdentity,
    RESCOPED_TRIGGER_IDENTITY,
    "scope relevantTriggerIdentity"
  );
  requireExact(
    input.relationshipResults.boundaryViolationCount,
    0,
    "scope boundaryViolationCount"
  );
  requireExact(
    input.relationshipResults.externalReferenceCount,
    0,
    "scope externalReferenceCount"
  );
  for (const [key, value] of Object.entries(
    input.relationshipResults.crossEventInvariantViolationCounts
  )) {
    requireExact(value, 0, "scope invariant " + key);
  }
  requireJsonExact(
    input.transactionSnapshotPolicy,
    RESCOPED_SNAPSHOT_POLICY,
    "scope transactionSnapshotPolicy"
  );
  requireJsonExact(
    input.runtimeRequiredGuards,
    RESCOPED_REQUIRED_GUARDS,
    "scope runtimeRequiredGuards"
  );
  requireJsonExact(
    input.runtimeNonRequiredGuards,
    RESCOPED_NON_REQUIRED_GUARDS,
    "scope runtimeNonRequiredGuards"
  );
  requireJsonExact(
    input.postcheckContract,
    RESCOPED_POSTCHECK_CONTRACT,
    "scope postcheckContract"
  );
  requireJsonExact(
    {
      ...manifest.postcheckContract?.required,
      globalTotalsArePassConditions:
        manifest.postcheckContract?.globalTotalsArePassConditions
    },
    RESCOPED_POSTCHECK_CONTRACT,
    "postcheckContract"
  );
  requireJsonExact(
    manifest.postcheckContract?.confirmedByCleanupTransactionEvidence,
    RESCOPED_TRANSACTION_EVIDENCE,
    "postcheckContract.confirmedByCleanupTransactionEvidence"
  );
  requireJsonExact(
    {
      expected: manifest.relevantSchemaIdentity?.foreignKeys?.expected,
      matched: manifest.relevantSchemaIdentity?.foreignKeys?.matched,
      validated: manifest.relevantSchemaIdentity?.foreignKeys?.validated,
      deferrable: manifest.relevantSchemaIdentity?.foreignKeys?.deferrable,
      initiallyDeferred:
        manifest.relevantSchemaIdentity?.foreignKeys?.initiallyDeferred,
      allDeleteBehaviorsMatchProfile:
        manifest.relevantSchemaIdentity?.foreignKeys
          ?.allDeleteBehaviorsMatchProfile
    },
    RESCOPED_FK_IDENTITY,
    "relevantSchemaIdentity.foreignKeys"
  );
  requireJsonExact(
    manifest.relevantSchemaIdentity?.triggers,
    RESCOPED_TRIGGER_IDENTITY,
    "relevantSchemaIdentity.triggers"
  );

  if (!isRecord(manifest.scopeDigest)) fail("scopeDigest must be an object");
  requireExact(manifest.scopeDigest.algorithm, "SHA-256", "scopeDigest.algorithm");
  requireExact(manifest.scopeDigest.value, scopeDigest(manifest), "scopeDigest.value");
}

function validateManifest(manifest, mode, family = classifyManifestFamily(manifest)) {
  requireExact(
    family,
    isRescopedManifest(manifest) ? "rescoped" : "legacy",
    "manifest family"
  );

  requireExact(manifest.profileVersion, PROFILE_VERSION, "profileVersion");
  requireExact(manifest.schema, EXPECTED_SCHEMA, "schema");
  requireExact(manifest.prefix, EXPECTED_PREFIX, "prefix");

  if (!isRecord(manifest.expectedCounts)) {
    fail("expectedCounts must be an object");
  }
  for (const key of COUNT_KEYS) {
    requireNonNegativeInteger(
      manifest.expectedCounts[key],
      "expectedCounts." + key
    );
  }

  requireNonNegativeInteger(
    manifest.expectedRemainingPrefixEvents,
    "expectedRemainingPrefixEvents"
  );

  if (!isRecord(manifest.timeouts)) fail("timeouts must be an object");
  if (!TIMEOUT_PATTERN.test(manifest.timeouts.lock ?? "")) {
    fail("timeouts.lock must be a positive PostgreSQL duration using ms, s, or min");
  }
  if (!TIMEOUT_PATTERN.test(manifest.timeouts.statement ?? "")) {
    fail(
      "timeouts.statement must be a positive PostgreSQL duration using ms, s, or min"
    );
  }

  if (!Array.isArray(manifest.targetEventIds)) {
    fail("targetEventIds must be an array");
  }

  if (mode === "discovery") return;

  if (manifest.targetEventIds.length === 0) {
    fail("targetEventIds must not be empty for " + mode);
  }

  const normalizedIds = manifest.targetEventIds.map((id, index) => {
    if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
      fail("targetEventIds[" + index + "] is not a valid UUID");
    }
    return id.toLowerCase();
  });

  if (new Set(normalizedIds).size !== normalizedIds.length) {
    fail("targetEventIds contains duplicate UUIDs");
  }

  if (manifest.expectedCounts.events !== normalizedIds.length) {
    fail(
      "expectedCounts.events must equal targetEventIds length (" +
        normalizedIds.length +
        ")"
    );
  }

  if (
    !Number.isSafeInteger(
      manifest.expectedCounts.events + manifest.expectedRemainingPrefixEvents
    )
  ) {
    fail("target and remaining prefix event counts exceed the safe range");
  }

  manifest.targetEventIds = normalizedIds;

  if (isRescopedManifest(manifest)) {
    if (normalizedIds.length !== 1) {
      fail("rescoped targetEventIds must contain exactly one Event UUID");
    }
    validateRescopedManifest(manifest);
  }

  if (mode === "commit") {
    const verification = manifest.rollbackVerification;
    if (!isRecord(verification)) {
      fail("rollbackVerification must be an object");
    }
    if (verification.completed !== true) {
      fail("rollbackVerification.completed must be true");
    }
    if (verification.baselineRestored !== true) {
      fail("rollbackVerification.baselineRestored must be true");
    }
    if (
      typeof verification.verifiedAt !== "string" ||
      Number.isNaN(Date.parse(verification.verifiedAt))
    ) {
      fail("rollbackVerification.verifiedAt must be a valid timestamp");
    }
    requireExact(
      verification.scopeDigest,
      scopeDigest(manifest),
      "rollbackVerification.scopeDigest"
    );
    if (!isRescopedManifest(manifest)) {
      requireExact(
        manifest.commitAuthorization,
        COMMIT_AUTHORIZATION,
        "commitAuthorization"
      );
    }
  }
}

function validateOwnerOnlyRegularFile(path, label) {
  if (!isAbsolute(path)) fail(label + " path must be absolute");
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    fail("cannot inspect " + label + ": " + error.message);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail(label + " must be a regular non-symlink file");
  }
  if ((stat.mode & 0o777) !== 0o600) {
    fail(label + " must have mode 0600");
  }
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    fail(label + " must be owned by the current user");
  }
}

function requireRescopedArguments(args) {
  for (const [name, value] of [
    ["--manifest-sha256", args.manifestSha256],
    ["--authorization-record", args.authorizationRecordPath],
    ["--authorization-record-sha256", args.authorizationRecordSha256],
    ["--artifact-directory", args.artifactDirectory]
  ]) {
    if (!value) fail(name + " is required for rescoped " + args.mode);
  }
  if (!SHA256_PATTERN.test(args.manifestSha256)) {
    fail("--manifest-sha256 must be a lowercase SHA-256 digest");
  }
  if (!SHA256_PATTERN.test(args.authorizationRecordSha256)) {
    fail("--authorization-record-sha256 must be a lowercase SHA-256 digest");
  }
}

function validateAuthorizationRecord(record, manifestMetadata, manifest, args) {
  if (!isRecord(record)) fail("authorization record root must be an object");
  requireExact(
    record.contractVersion,
    RESCOPED_CONTRACT_VERSION,
    "authorization contractVersion"
  );
  if (!isRecord(record.manifest)) {
    fail("authorization manifest identity must be an object");
  }
  if (typeof record.manifest.path !== "string") {
    fail("authorization manifest.path must be an absolute path");
  }
  requireExact(
    resolve(record.manifest.path),
    manifestMetadata.absolutePath,
    "authorization manifest.path"
  );
  requireExact(
    record.manifest.sha256,
    manifestMetadata.sha256,
    "authorization manifest.sha256"
  );
  requireExact(
    record.manifest.scopeDigest,
    scopeDigest(manifest),
    "authorization manifest.scopeDigest"
  );
  requireExact(
    record.permittedGenerationMode,
    args.mode,
    "authorization permittedGenerationMode"
  );
  requireExact(
    record.artifactGenerationAuthorized,
    true,
    "authorization artifactGenerationAuthorized"
  );
  requireExact(
    record.sqlExecutionAuthorized,
    false,
    "authorization sqlExecutionAuthorized"
  );
  requireExact(
    record.permanentDeletionAuthorized,
    false,
    "authorization permanentDeletionAuthorized"
  );
}

function assertOwnerOnlyPath(path, label, expectedType, expectedMode) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    throw new Error("cannot inspect " + label + ": " + error.message);
  }
  if (stat.isSymbolicLink()) {
    throw new Error(label + " must not be a symlink");
  }
  if (
    (expectedType === "file" && !stat.isFile()) ||
    (expectedType === "directory" && !stat.isDirectory())
  ) {
    throw new Error(label + " must be a regular " + expectedType);
  }
  if ((stat.mode & 0o777) !== expectedMode) {
    throw new Error(
      label + " must have mode " + expectedMode.toString(8).padStart(4, "0")
    );
  }
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    throw new Error(label + " must be owned by the current user");
  }
  return stat;
}

function reserveArtifactBundle(path) {
  if (!isAbsolute(path)) {
    throw new Error("artifact directory path must be absolute");
  }
  const absolutePath = resolve(path);
  const parent = dirname(absolutePath);
  assertOwnerOnlyPath(parent, "artifact directory parent", "directory", 0o700);
  try {
    mkdirSync(absolutePath, { mode: 0o700 });
  } catch (error) {
    throw new Error("cannot reserve artifact directory: " + error.message);
  }
  assertOwnerOnlyPath(absolutePath, "artifact directory", "directory", 0o700);
  return absolutePath;
}

function writeExclusiveOwnerOnly(path, contents) {
  let descriptor;
  try {
    descriptor = openSync(path, "wx", 0o600);
    writeFileSync(descriptor, contents);
    fsyncSync(descriptor);
    const stat = fstatSync(descriptor);
    if (!stat.isFile()) throw new Error("artifact is not regular");
    closeSync(descriptor);
    descriptor = undefined;
    chmodSync(path, 0o600);
  } catch (error) {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {}
    }
    throw error;
  }
}

function publishExclusive(temporaryPath, finalPath) {
  linkSync(temporaryPath, finalPath);
  unlinkSync(temporaryPath);
}

function maybeInjectTestFault(point) {
  if (
    process.env.NODE_ENV === "test" &&
    process.env[RESCOPED_TEST_FAULT_ENV] === point
  ) {
    throw new Error("injected test fault: " + point);
  }
}

function parseArtifactJson(path, label) {
  let raw;
  try {
    raw = readFileSync(path);
  } catch (error) {
    throw new Error("cannot read " + label + ": " + error.message);
  }
  let value;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch (error) {
    throw new Error(label + " is not valid JSON: " + error.message);
  }
  return { raw, value };
}

function assertGeneratedSqlMode(sql, mode) {
  const expectedTerminator = mode === "rollback" ? "ROLLBACK;" : "COMMIT;";
  const forbiddenTerminator = mode === "rollback" ? "COMMIT;" : "ROLLBACK;";
  const terminators = sql.match(/^(?:ROLLBACK|COMMIT);$/gm) ?? [];
  if (
    terminators.length !== 1 ||
    terminators[0] !== expectedTerminator ||
    !sql.trimEnd().endsWith(expectedTerminator)
  ) {
    throw new Error("generated SQL terminal statement does not match mode " + mode);
  }
  if (sql.match(new RegExp("^" + forbiddenTerminator + "$", "gm"))) {
    throw new Error("generated SQL contains the opposite terminal statement");
  }
  if (!sql.includes(sqlString(mode) + "::text as mode")) {
    throw new Error("generated SQL evidence mode does not match " + mode);
  }
}

function assertExactValue(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(label + " must be exactly " + JSON.stringify(expected));
  }
}

function assertJsonValue(actual, expected, label) {
  if (
    JSON.stringify(canonicalJsonValue(actual)) !==
    JSON.stringify(canonicalJsonValue(expected))
  ) {
    throw new Error(label + " does not match the completed artifact bundle");
  }
}

export function validateRescopedArtifactBundle(path) {
  if (!isAbsolute(path)) {
    throw new Error("artifact directory path must be absolute");
  }
  const artifactDirectory = resolve(path);
  assertOwnerOnlyPath(
    artifactDirectory,
    "artifact directory",
    "directory",
    0o700
  );

  const completePath = resolve(
    artifactDirectory,
    RESCOPED_COMPLETE_FILENAME
  );
  assertOwnerOnlyPath(completePath, "COMPLETE", "file", 0o600);
  const completeMetadata = parseArtifactJson(completePath, "COMPLETE");
  const complete = completeMetadata.value;
  if (!isRecord(complete)) throw new Error("COMPLETE root must be an object");
  assertExactValue(
    complete.contractVersion,
    RESCOPED_CONTRACT_VERSION,
    "COMPLETE contractVersion"
  );
  if (complete.generationMode !== "rollback" && complete.generationMode !== "commit") {
    throw new Error("COMPLETE generationMode must be rollback or commit");
  }
  const mode = complete.generationMode;
  const expectedSqlFilename = RESCOPED_SQL_FILENAMES[mode];
  assertExactValue(complete.sqlFilename, expectedSqlFilename, "COMPLETE sqlFilename");
  assertExactValue(
    complete.generationRecordFilename,
    RESCOPED_GENERATION_RECORD_FILENAME,
    "COMPLETE generationRecordFilename"
  );
  if (!SHA256_PATTERN.test(complete.sqlSha256 ?? "")) {
    throw new Error("COMPLETE sqlSha256 must be a lowercase SHA-256 digest");
  }
  if (!SHA256_PATTERN.test(complete.generationRecordSha256 ?? "")) {
    throw new Error(
      "COMPLETE generationRecordSha256 must be a lowercase SHA-256 digest"
    );
  }
  if (!SHA256_PATTERN.test(complete.scopeDigest ?? "")) {
    throw new Error("COMPLETE scopeDigest must be a lowercase SHA-256 digest");
  }
  assertExactValue(complete.generationCount, 1, "COMPLETE generationCount");
  if (
    typeof complete.completedAt !== "string" ||
    Number.isNaN(Date.parse(complete.completedAt))
  ) {
    throw new Error("COMPLETE completedAt must be a valid timestamp");
  }

  const sqlPath = resolve(artifactDirectory, expectedSqlFilename);
  const generationRecordPath = resolve(
    artifactDirectory,
    RESCOPED_GENERATION_RECORD_FILENAME
  );
  assertOwnerOnlyPath(sqlPath, "generated SQL", "file", 0o600);
  assertOwnerOnlyPath(
    generationRecordPath,
    "generation record",
    "file",
    0o600
  );
  const sqlRaw = readFileSync(sqlPath);
  const sql = sqlRaw.toString("utf8");
  const recordMetadata = parseArtifactJson(
    generationRecordPath,
    "generation record"
  );
  const record = recordMetadata.value;
  if (!isRecord(record)) {
    throw new Error("generation record root must be an object");
  }
  assertExactValue(
    record.contractVersion,
    RESCOPED_CONTRACT_VERSION,
    "generation record contractVersion"
  );
  assertExactValue(sha256(sqlRaw), complete.sqlSha256, "COMPLETE SQL SHA-256");
  assertExactValue(
    sha256(recordMetadata.raw),
    complete.generationRecordSha256,
    "COMPLETE generation record SHA-256"
  );
  assertExactValue(record.generationMode, mode, "generation record mode");
  assertExactValue(
    record.artifactDirectory,
    artifactDirectory,
    "generation record artifact directory"
  );
  assertExactValue(record.outputSqlPath, sqlPath, "generation record SQL path");
  assertExactValue(record.outputSqlSha256, complete.sqlSha256, "generation record SQL SHA-256");
  assertExactValue(record.scopeDigest, complete.scopeDigest, "generation record scope digest");
  assertExactValue(record.generationCount, 1, "generation record generationCount");
  assertExactValue(
    record.rollbackExecutionAuthorized,
    false,
    "generation record rollbackExecutionAuthorized"
  );
  assertExactValue(
    record.commitExecutionAuthorized,
    false,
    "generation record commitExecutionAuthorized"
  );
  assertExactValue(
    record.permanentDeletionAuthorized,
    false,
    "generation record permanentDeletionAuthorized"
  );
  assertExactValue(record.generatorExit, 0, "generation record generatorExit");
  if (
    typeof record.generatedAt !== "string" ||
    Number.isNaN(Date.parse(record.generatedAt))
  ) {
    throw new Error("generation record generatedAt must be a valid timestamp");
  }
  assertGeneratedSqlMode(sql, mode);

  const expectedFiles = [
    RESCOPED_COMPLETE_FILENAME,
    RESCOPED_GENERATION_RECORD_FILENAME,
    expectedSqlFilename
  ].sort();
  const actualFiles = readdirSync(artifactDirectory).sort();
  assertJsonValue(actualFiles, expectedFiles, "artifact directory contents");
  return {
    artifactDirectory,
    completePath,
    sqlPath,
    generationRecordPath,
    mode,
    scopeDigest: complete.scopeDigest,
    sqlSha256: complete.sqlSha256,
    generationRecordSha256: complete.generationRecordSha256
  };
}

function writeRescopedArtifacts(sql, manifestMetadata, authorizationMetadata, args) {
  try {
    const artifactDirectory = reserveArtifactBundle(args.artifactDirectory);
    const sqlFilename = RESCOPED_SQL_FILENAMES[args.mode];
    const sqlPath = resolve(artifactDirectory, sqlFilename);
    const sqlTemporaryPath = resolve(artifactDirectory, "." + sqlFilename + ".tmp");
    const generationRecordPath = resolve(
      artifactDirectory,
      RESCOPED_GENERATION_RECORD_FILENAME
    );
    const generationRecordTemporaryPath = resolve(
      artifactDirectory,
      "." + RESCOPED_GENERATION_RECORD_FILENAME + ".tmp"
    );
    const completePath = resolve(
      artifactDirectory,
      RESCOPED_COMPLETE_FILENAME
    );
    const normalizedSql = sql.trimEnd() + "\n";
    assertGeneratedSqlMode(normalizedSql, args.mode);
    const outputSqlSha256 = sha256(normalizedSql);
    const rendererPath = fileURLToPath(import.meta.url);
    const skillPath = resolve(dirname(rendererPath), "..", "SKILL.md");
    const record = {
      contractVersion: RESCOPED_CONTRACT_VERSION,
      manifestPath: manifestMetadata.absolutePath,
      manifestSha256: manifestMetadata.sha256,
      authorizationRecordPath: authorizationMetadata.absolutePath,
      authorizationRecordSha256: authorizationMetadata.sha256,
      scopeDigest: scopeDigest(manifestMetadata.value),
      generatorSourceSha256: sha256(readFileSync(rendererPath)),
      skill: {
        identity: "operate-supabase-live-db",
        sourceSha256: sha256(readFileSync(skillPath))
      },
      generationMode: args.mode,
      artifactDirectory,
      outputSqlPath: sqlPath,
      outputSqlSha256,
      generationCount: 1,
      rollbackExecutionAuthorized: false,
      commitExecutionAuthorized: false,
      permanentDeletionAuthorized: false,
      generatedAt: new Date().toISOString(),
      generatorExit: 0
    };
    const recordContents = JSON.stringify(record, null, 2) + "\n";

    if (
      process.env.NODE_ENV === "test" &&
      process.env[RESCOPED_TEST_FAULT_ENV] === "sql-temporary-exists"
    ) {
      writeExclusiveOwnerOnly(sqlTemporaryPath, "pre-existing SQL temporary\n");
    }
    writeExclusiveOwnerOnly(sqlTemporaryPath, normalizedSql);
    maybeInjectTestFault("after-sql-temporary-write");
    requireExact(
      sha256(readFileSync(sqlTemporaryPath)),
      outputSqlSha256,
      "temporary SQL SHA-256"
    );

    if (
      process.env.NODE_ENV === "test" &&
      process.env[RESCOPED_TEST_FAULT_ENV] === "record-temporary-exists"
    ) {
      writeExclusiveOwnerOnly(
        generationRecordTemporaryPath,
        "pre-existing generation record temporary\n"
      );
    }
    writeExclusiveOwnerOnly(generationRecordTemporaryPath, recordContents);
    requireExact(
      sha256(readFileSync(generationRecordTemporaryPath)),
      sha256(recordContents),
      "temporary generation record SHA-256"
    );

    if (
      process.env.NODE_ENV === "test" &&
      process.env[RESCOPED_TEST_FAULT_ENV] === "sql-final-exists"
    ) {
      writeExclusiveOwnerOnly(sqlPath, "pre-existing final SQL\n");
    }
    publishExclusive(sqlTemporaryPath, sqlPath);
    maybeInjectTestFault("after-sql-final-publish");
    if (
      process.env.NODE_ENV === "test" &&
      process.env[RESCOPED_TEST_FAULT_ENV] === "record-final-exists"
    ) {
      writeExclusiveOwnerOnly(
        generationRecordPath,
        "pre-existing final generation record\n"
      );
    }
    publishExclusive(generationRecordTemporaryPath, generationRecordPath);
    maybeInjectTestFault("after-record-final-publish");

    requireExact(sha256(readFileSync(sqlPath)), outputSqlSha256, "final SQL SHA-256");
    const generationRecordSha256 = sha256(readFileSync(generationRecordPath));
    requireExact(
      generationRecordSha256,
      sha256(recordContents),
      "final generation record SHA-256"
    );

    if (
      process.env.NODE_ENV === "test" &&
      process.env[RESCOPED_TEST_FAULT_ENV] === "complete-exists"
    ) {
      writeExclusiveOwnerOnly(completePath, "pre-existing COMPLETE\n");
    }
    const complete = {
      contractVersion: RESCOPED_CONTRACT_VERSION,
      generationMode: args.mode,
      sqlFilename,
      sqlSha256: outputSqlSha256,
      generationRecordFilename: RESCOPED_GENERATION_RECORD_FILENAME,
      generationRecordSha256,
      scopeDigest: scopeDigest(manifestMetadata.value),
      completedAt: new Date().toISOString(),
      generationCount: 1
    };
    writeExclusiveOwnerOnly(
      completePath,
      JSON.stringify(complete, null, 2) + "\n"
    );
    validateRescopedArtifactBundle(artifactDirectory);
  } catch (error) {
    fail(
      "cannot complete rescoped artifact bundle; incomplete output must not be executed or reused: " +
        error.message
    );
  }
}

function sqlString(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}

function qualified(schema, table) {
  return schema + "." + table;
}

function targetValues(ids) {
  return ids
    .map((id) => "  (" + sqlString(id) + "::uuid)")
    .join(",\n");
}

function tableNameList() {
  return COUNT_KEYS.map((name) => sqlString(name)).join(", ");
}

function nullabilityValues() {
  return NULLABILITY_PROFILE.map(
    ([table, column, nullable]) =>
      `    (${sqlString(table)}, ${sqlString(column)}, ${sqlString(nullable)})`
  ).join(",\n");
}

function fkValues() {
  return FK_PROFILE.map(([name, source, sourceColumns, target, targetColumns, onDelete, onUpdate, match, validated, deferrable, initiallyDeferred]) =>
    `    (${sqlString(name)}, ${sqlString(source)}, ${sqlString("{" + sourceColumns.join(",") + "}")}, ${sqlString(target)}, ${sqlString("{" + targetColumns.join(",") + "}")}, ${sqlString(onDelete)}, ${sqlString(onUpdate)}, ${sqlString(match)}, ${validated}, ${deferrable}, ${initiallyDeferred})`
  ).join(",\n");
}

function triggerValues() {
  return TRIGGER_PROFILE.map(([table, name, digest]) =>
    `    (${sqlString(table)}, ${sqlString(name)}, 'O', ${sqlString(digest)})`
  ).join(",\n");
}

function renderDiscovery(manifest) {
  const schema = manifest.schema;
  const prefixLike = sqlString(manifest.prefix + "%");
  const tables = tableNameList();

  return `-- Generated by operate-supabase-live-db.
-- SELECT ONLY. Confirm project, database, and role before running the full query.

select
  e.id,
  e.title,
  e.created_at,
  (select count(*)
   from ${qualified(schema, "participants")} p
   where p.event_id = e.id) as participants,
  (select count(*)
   from ${qualified(schema, "candidates")} c
   where c.event_id = e.id) as candidates,
  (select count(*)
   from ${qualified(schema, "criteria")} cr
   where cr.event_id = e.id) as criteria,
  (select count(*)
   from ${qualified(schema, "votes")} v
   join ${qualified(schema, "candidates")} c on c.id = v.candidate_id
   where c.event_id = e.id) as votes,
  (select count(*)
   from ${qualified(schema, "reactions")} r
   join ${qualified(schema, "candidates")} c on c.id = r.candidate_id
   where c.event_id = e.id) as reactions,
  (select count(*)
   from ${qualified(schema, "concerns")} co
   join ${qualified(schema, "candidates")} c on c.id = co.candidate_id
   where c.event_id = e.id) as concerns,
  (select count(*)
   from ${qualified(schema, "comments")} cm
   join ${qualified(schema, "candidates")} c on c.id = cm.candidate_id
   where c.event_id = e.id) as comments
from ${qualified(schema, "events")} e
where e.title like ${prefixLike}
order by e.created_at, e.id;

select
  (select count(*)
   from ${qualified(schema, "events")} e
   where e.title like ${prefixLike}) as events,
  (select count(*)
   from ${qualified(schema, "participants")} p
   join ${qualified(schema, "events")} e on e.id = p.event_id
   where e.title like ${prefixLike}) as participants,
  (select count(*)
   from ${qualified(schema, "candidates")} c
   join ${qualified(schema, "events")} e on e.id = c.event_id
   where e.title like ${prefixLike}) as candidates,
  (select count(*)
   from ${qualified(schema, "criteria")} cr
   join ${qualified(schema, "events")} e on e.id = cr.event_id
   where e.title like ${prefixLike}) as criteria,
  (select count(*)
   from ${qualified(schema, "votes")} v
   join ${qualified(schema, "candidates")} c on c.id = v.candidate_id
   join ${qualified(schema, "events")} e on e.id = c.event_id
   where e.title like ${prefixLike}) as votes,
  (select count(*)
   from ${qualified(schema, "reactions")} r
   join ${qualified(schema, "candidates")} c on c.id = r.candidate_id
   join ${qualified(schema, "events")} e on e.id = c.event_id
   where e.title like ${prefixLike}) as reactions,
  (select count(*)
   from ${qualified(schema, "concerns")} co
   join ${qualified(schema, "candidates")} c on c.id = co.candidate_id
   join ${qualified(schema, "events")} e on e.id = c.event_id
   where e.title like ${prefixLike}) as concerns,
  (select count(*)
   from ${qualified(schema, "comments")} cm
   join ${qualified(schema, "candidates")} c on c.id = cm.candidate_id
   join ${qualified(schema, "events")} e on e.id = c.event_id
   where e.title like ${prefixLike}) as comments;

with expected(table_name, column_name, expected_is_nullable) as (
  values
${nullabilityValues()}
)
select
  e.table_name,
  e.column_name,
  e.expected_is_nullable,
  c.is_nullable as actual_is_nullable,
  c.data_type,
  c.is_nullable is not distinct from e.expected_is_nullable
    as nullability_matches_profile
from expected e
left join information_schema.columns c
  on c.table_schema = ${sqlString(schema)}
 and c.table_name = e.table_name
 and c.column_name = e.column_name
order by e.table_name, e.column_name;

select sn.nspname as referencing_schema, src.relname as referencing_table,
  con.conname as constraint_name,
  array(select a.attname from unnest(con.conkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.attnum order by k.ord) as source_columns,
  tn.nspname as referenced_schema, tgt.relname as referenced_table,
  array(select a.attname from unnest(con.confkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid=con.confrelid and a.attnum=k.attnum order by k.ord) as referenced_columns,
  case con.confdeltype when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'r' then 'RESTRICT' when 'a' then 'NO ACTION' else con.confdeltype::text end as on_delete,
  case con.confupdtype when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'r' then 'RESTRICT' when 'a' then 'NO ACTION' else con.confupdtype::text end as on_update,
  case con.confmatchtype when 's' then 'SIMPLE' when 'f' then 'FULL' when 'p' then 'PARTIAL' else 'UNKNOWN:' || con.confmatchtype::text end as match_type,
  con.convalidated, con.condeferrable, con.condeferred,
  (sn.nspname=${sqlString(schema)} and src.relname in (${tables})) <> (tn.nspname=${sqlString(schema)} and tgt.relname in (${tables})) as is_boundary_fk
from pg_constraint con join pg_class src on src.oid=con.conrelid join pg_namespace sn on sn.oid=src.relnamespace
join pg_class tgt on tgt.oid=con.confrelid join pg_namespace tn on tn.oid=tgt.relnamespace
where con.contype='f' and ((sn.nspname=${sqlString(schema)} and src.relname in (${tables})) or (tn.nspname=${sqlString(schema)} and tgt.relname in (${tables})))
order by sn.nspname, src.relname, con.conname;

select
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name, t.tgenabled,
  case when (t.tgtype & 2)=2 then 'BEFORE' when (t.tgtype & 64)=64 then 'INSTEAD OF' else 'AFTER' end as timing,
  (t.tgtype & 4)=4 as insert_event,
  (t.tgtype & 8)=8 as delete_event,
  (t.tgtype & 16)=16 as update_event,
  coalesce((select array_agg(a.attname order by u.ord) from unnest(t.tgattr) with ordinality u(attnum,ord) join pg_attribute a on a.attrelid=c.oid and a.attnum=u.attnum), array[]::text[]) as update_columns,
  case when (t.tgtype & 1)=1 then 'ROW' else 'STATEMENT' end as level,
  pn.nspname as function_schema, p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as function_identity_arguments,
  pg_catalog.octet_length(pg_get_triggerdef(t.oid, true)) as definition_bytes,
  pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_get_triggerdef(t.oid, true), 'UTF8')), 'hex') as definition_sha256
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid=t.tgfoid
join pg_namespace pn on pn.oid=p.pronamespace
where not t.tgisinternal
  and n.nspname = ${sqlString(schema)}
  and c.relname in (${tables})
order by c.relname, t.tgname;

select 'candidates_created_by_event' as cross_event_invariant, count(*) as violations
from ${qualified(schema, "candidates")} c
left join ${qualified(schema, "participants")} p on p.id = c.created_by
where c.created_by is not null
  and (p.id is null or p.event_id is distinct from c.event_id)

union all

select 'criteria_created_by_event', count(*)
from ${qualified(schema, "criteria")} cr
left join ${qualified(schema, "participants")} p on p.id = cr.created_by
where cr.created_by is not null
  and (p.id is null or p.event_id is distinct from cr.event_id)

union all

select 'votes_reference_event', count(*)
from ${qualified(schema, "votes")} v
left join ${qualified(schema, "candidates")} c on c.id = v.candidate_id
left join ${qualified(schema, "participants")} p on p.id = v.participant_id
where c.id is null or p.id is null or p.event_id is distinct from c.event_id

union all

select 'reactions_reference_event', count(*)
from ${qualified(schema, "reactions")} r
left join ${qualified(schema, "candidates")} c on c.id = r.candidate_id
left join ${qualified(schema, "participants")} p on p.id = r.participant_id
left join ${qualified(schema, "criteria")} cr on cr.id = r.criterion_id
where r.candidate_id is null
   or r.participant_id is null
   or r.criterion_id is null
   or c.id is null
   or p.id is null
   or cr.id is null
   or p.event_id is distinct from c.event_id
   or cr.event_id is distinct from c.event_id

union all

select 'concerns_reference_event', count(*)
from ${qualified(schema, "concerns")} co
left join ${qualified(schema, "candidates")} c on c.id = co.candidate_id
left join ${qualified(schema, "participants")} p on p.id = co.participant_id
left join ${qualified(schema, "criteria")} cr on cr.id = co.criterion_id
where co.candidate_id is null
   or co.participant_id is null
   or co.criterion_id is null
   or c.id is null
   or p.id is null
   or cr.id is null
   or p.event_id is distinct from c.event_id
   or cr.event_id is distinct from c.event_id

union all

select 'comments_reference_event', count(*)
from ${qualified(schema, "comments")} cm
left join ${qualified(schema, "candidates")} c on c.id = cm.candidate_id
left join ${qualified(schema, "participants")} p on p.id = cm.participant_id
where cm.candidate_id is null
   or cm.participant_id is null
   or c.id is null
   or p.id is null
   or p.event_id is distinct from c.event_id

order by cross_event_invariant;`;
}

function renderPreCountGuard(expectedCounts) {
  const checks = COUNT_KEYS.map((entity) => {
    const expected = expectedCounts[entity];
    return `  select count(*) into actual_count
  from cleanup_target_rows
  where entity = ${sqlString(entity)};

  if actual_count <> ${expected} then
    raise exception
      'pre-delete count mismatch for ${entity}: expected ${expected}, actual %',
      actual_count;
  end if;`;
  });

  return `do $$
declare
  actual_count bigint;
begin
${checks.join("\n\n")}
end;
$$;`;
}

function renderSchemaShapeGuard(schema) {
  return `do $$
declare
  mismatch_count bigint;
  fk_exact_match boolean;
  boundary_fk_count bigint;
  trigger_mismatch_count bigint;
begin
  with expected(table_name, column_name, expected_is_nullable) as (
    values
${nullabilityValues()}
  )
  select count(*) into mismatch_count
  from expected e
  left join information_schema.columns c
    on c.table_schema = ${sqlString(schema)}
   and c.table_name = e.table_name
   and c.column_name = e.column_name
  where c.column_name is null
     or c.is_nullable is distinct from e.expected_is_nullable;

  if mismatch_count <> 0 then
    raise exception
      'schema nullability mismatch: % required columns are missing or changed',
      mismatch_count;
  end if;

  with expected(name, source_table, source_columns, target_table, target_columns, on_delete, on_update, match_type, fk_is_validated, fk_is_deferrable, fk_is_initially_deferred) as (
    values
${fkValues()}
  ), actual as (
    select con.conname as name, src.relname as source_table,
      array(select a.attname from unnest(con.conkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.attnum order by k.ord)::text as source_columns,
      tgt.relname as target_table,
      array(select a.attname from unnest(con.confkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid=con.confrelid and a.attnum=k.attnum order by k.ord)::text as target_columns,
      case con.confdeltype when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'r' then 'RESTRICT' when 'a' then 'NO ACTION' else con.confdeltype::text end as on_delete,
      case con.confupdtype when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'r' then 'RESTRICT' when 'a' then 'NO ACTION' else con.confupdtype::text end as on_update,
      case con.confmatchtype when 's' then 'SIMPLE' when 'f' then 'FULL' when 'p' then 'PARTIAL' else 'UNKNOWN:' || con.confmatchtype::text end as match_type,
      con.convalidated as fk_is_validated,
      con.condeferrable as fk_is_deferrable,
      con.condeferred as fk_is_initially_deferred
    from pg_constraint con join pg_class src on src.oid=con.conrelid join pg_namespace sn on sn.oid=src.relnamespace
    join pg_class tgt on tgt.oid=con.confrelid join pg_namespace tn on tn.oid=tgt.relnamespace
    where con.contype='f' and sn.nspname=${sqlString(schema)} and tn.nspname=${sqlString(schema)}
      and src.relname in (${tableNameList()}) and tgt.relname in (${tableNameList()})
  )
  select
    not exists (select * from expected except select * from actual)
    and not exists (select * from actual except select * from expected)
  into fk_exact_match;

  if fk_exact_match is not true then
    raise exception 'FK profile mismatch';
  end if;

  select count(*) into boundary_fk_count
  from pg_constraint con join pg_class src on src.oid=con.conrelid join pg_namespace sn on sn.oid=src.relnamespace
  join pg_class tgt on tgt.oid=con.confrelid join pg_namespace tn on tn.oid=tgt.relnamespace
  where con.contype='f' and (
    (sn.nspname=${sqlString(schema)} and src.relname in (${tableNameList()}))
    <> (tn.nspname=${sqlString(schema)} and tgt.relname in (${tableNameList()}))
  );
  if boundary_fk_count <> 0 then
    raise exception 'boundary FK safety check failed: % edges', boundary_fk_count;
  end if;

  with expected(table_name, trigger_name, enabled, definition_sha256) as (values
${triggerValues()}
  ), actual as (
    select c.relname, t.tgname, t.tgenabled::text,
      pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_get_triggerdef(t.oid, true), 'UTF8')), 'hex')
    from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where not t.tgisinternal and n.nspname=${sqlString(schema)} and c.relname in (${tableNameList()})
  )
  select count(*) into trigger_mismatch_count from (
    (select * from expected except select * from actual)
    union all
    (select * from actual except select * from expected)
  ) d;
  if trigger_mismatch_count <> 0 then
    raise exception 'trigger profile mismatch: % differences', trigger_mismatch_count;
  end if;
end;
$$;`;
}

function renderDeleteBlock(schema, entity, expected) {
  const operation = entity + "_deleted";
  return `do $$
declare
  affected_count bigint;
begin
  delete from ${qualified(schema, entity)} x
  using cleanup_target_rows s
  where s.entity = ${sqlString(entity)}
    and s.id = x.id;

  get diagnostics affected_count = row_count;

  if affected_count <> ${expected} then
    raise exception
      '${entity} delete count mismatch: expected ${expected}, actual %',
      affected_count;
  end if;

  insert into cleanup_operation_counts (operation, affected)
  values (${sqlString(operation)}, affected_count);
end;
$$;`;
}

function renderInvariantGuard(schema) {
  return `do $$
declare violation_count bigint;
begin
  select count(*) into violation_count from (
    select c.id from ${qualified(schema, "candidates")} c left join ${qualified(schema, "participants")} p on p.id=c.created_by
    where c.created_by is not null and (p.id is null or p.event_id is distinct from c.event_id)
    union all
    select cr.id from ${qualified(schema, "criteria")} cr left join ${qualified(schema, "participants")} p on p.id=cr.created_by
    where cr.created_by is not null and (p.id is null or p.event_id is distinct from cr.event_id)
    union all
    select v.id from ${qualified(schema, "votes")} v left join ${qualified(schema, "candidates")} c on c.id=v.candidate_id left join ${qualified(schema, "participants")} p on p.id=v.participant_id
    where c.id is null or p.id is null or p.event_id is distinct from c.event_id
    union all
    select r.id from ${qualified(schema, "reactions")} r left join ${qualified(schema, "candidates")} c on c.id=r.candidate_id left join ${qualified(schema, "participants")} p on p.id=r.participant_id left join ${qualified(schema, "criteria")} cr on cr.id=r.criterion_id
    where c.id is null or p.id is null or cr.id is null or p.event_id is distinct from c.event_id or cr.event_id is distinct from c.event_id
    union all
    select co.id from ${qualified(schema, "concerns")} co left join ${qualified(schema, "candidates")} c on c.id=co.candidate_id left join ${qualified(schema, "participants")} p on p.id=co.participant_id left join ${qualified(schema, "criteria")} cr on cr.id=co.criterion_id
    where c.id is null or p.id is null or cr.id is null or p.event_id is distinct from c.event_id or cr.event_id is distinct from c.event_id
    union all
    select cm.id from ${qualified(schema, "comments")} cm left join ${qualified(schema, "candidates")} c on c.id=cm.candidate_id left join ${qualified(schema, "participants")} p on p.id=cm.participant_id
    where c.id is null or p.id is null or p.event_id is distinct from c.event_id
  ) violations;
  if violation_count <> 0 then raise exception 'cross-event invariant safety check failed: % violations', violation_count; end if;
end;
$$;`;
}

function renderExternalReferenceGuard(schema) {
  return `do $$
declare
  actual_count bigint;
begin
  select count(*) into actual_count
  from ${qualified(schema, "candidates")} c
  join cleanup_target_rows p
    on p.entity = 'participants'
   and p.id = c.created_by
  where not exists (
    select 1
    from cleanup_target_rows s
    where s.entity = 'candidates'
      and s.id = c.id
  );

  if actual_count <> 0 then
    raise exception
      'external reference safety check failed: % non-target candidates reference target participants',
      actual_count;
  end if;

  select count(*) into actual_count
  from ${qualified(schema, "votes")} v
  where not exists (
    select 1 from cleanup_target_rows s
    where s.entity = 'votes' and s.id = v.id
  ) and (
    exists (select 1 from cleanup_target_rows c where c.entity = 'candidates' and c.id = v.candidate_id)
    or exists (select 1 from cleanup_target_rows p where p.entity = 'participants' and p.id = v.participant_id)
  );

  if actual_count <> 0 then
    raise exception 'external reference safety check failed: % non-target votes reference target rows', actual_count;
  end if;

  select count(*) into actual_count
  from ${qualified(schema, "criteria")} cr
  join cleanup_target_rows p
    on p.entity = 'participants'
   and p.id = cr.created_by
  where not exists (
    select 1
    from cleanup_target_rows s
    where s.entity = 'criteria'
      and s.id = cr.id
  );

  if actual_count <> 0 then
    raise exception
      'external reference safety check failed: % non-target criteria reference target participants',
      actual_count;
  end if;

  select count(*) into actual_count
  from ${qualified(schema, "reactions")} r
  where not exists (
    select 1
    from cleanup_target_rows s
    where s.entity = 'reactions'
      and s.id = r.id
  )
    and (
      exists (
        select 1
        from cleanup_target_rows p
        where p.entity = 'participants'
          and p.id = r.participant_id
      )
      or exists (
        select 1
        from cleanup_target_rows cr
        where cr.entity = 'criteria'
          and cr.id = r.criterion_id
      )
      or exists (
        select 1 from cleanup_target_rows c
        where c.entity = 'candidates' and c.id = r.candidate_id
      )
    );

  if actual_count <> 0 then
    raise exception
      'external reference safety check failed: % non-target reactions reference target participants or criteria',
      actual_count;
  end if;

  select count(*) into actual_count
  from ${qualified(schema, "concerns")} co
  where not exists (
    select 1
    from cleanup_target_rows s
    where s.entity = 'concerns'
      and s.id = co.id
  )
    and (
      exists (select 1 from cleanup_target_rows c where c.entity = 'candidates' and c.id = co.candidate_id)
      or exists (select 1 from cleanup_target_rows p where p.entity = 'participants' and p.id = co.participant_id)
      or exists (select 1 from cleanup_target_rows cr where cr.entity = 'criteria' and cr.id = co.criterion_id)
    );

  if actual_count <> 0 then
    raise exception
      'external reference safety check failed: % non-target concerns reference target rows',
      actual_count;
  end if;

  select count(*) into actual_count
  from ${qualified(schema, "comments")} cm
  where not exists (
    select 1
    from cleanup_target_rows s
    where s.entity = 'comments'
      and s.id = cm.id
  )
    and (
      exists (select 1 from cleanup_target_rows c where c.entity = 'candidates' and c.id = cm.candidate_id)
      or exists (select 1 from cleanup_target_rows p where p.entity = 'participants' and p.id = cm.participant_id)
    );

  if actual_count <> 0 then
    raise exception
      'external reference safety check failed: % non-target comments reference target participants',
      actual_count;
  end if;
end;
$$;`;
}

function renderRemainingGuard(schema) {
  const terms = COUNT_KEYS.map(
    (entity) => `    (select count(*)
     from ${qualified(schema, entity)} x
     join cleanup_target_rows s
       on s.entity = ${sqlString(entity)}
      and s.id = x.id)`
  );

  return `do $$
declare
  remaining_count bigint;
begin
  select
${terms.join("\n    +\n")}
  into remaining_count;

  if remaining_count <> 0 then
    raise exception
      'post-delete safety check failed: % target rows remain',
      remaining_count;
  end if;
end;
$$;`;
}

function renderEvidenceSelect(schema, mode, digest, ids, expected) {
  const expectedPreCounts = COUNT_KEYS.map(
    (entity) => `    (${sqlString(entity)}, ${expected[entity]}::bigint)`
  ).join(",\n");
  const expectedOperationCounts = ["votes", "comments", "reactions", "concerns", "events"].map(
    (entity) => `    (${sqlString(entity + "_deleted")}, ${expected[entity]}::bigint)`
  ).join(",\n");
  const remainingRows = COUNT_KEYS.map((entity, index) => {
    const lead = index === 0 ? "  select" : "  union all\n  select";
    return `${lead} ${sqlString(entity)} as entity, count(*)::bigint as actual
  from ${qualified(schema, entity)} x
  join cleanup_target_rows s
    on s.entity = ${sqlString(entity)}
   and s.id = x.id`;
  }).join("\n");

  return `with expected_pre_counts(entity, expected) as (
  values
${expectedPreCounts}
), actual_pre_counts as (
  select entity, count(*)::bigint as actual
  from cleanup_target_rows
  group by entity
), pre_counts as (
  select e.entity, coalesce(a.actual, 0::bigint) as actual, e.expected,
    coalesce(a.actual, 0::bigint) = e.expected as matches
  from expected_pre_counts e
  left join actual_pre_counts a using (entity)
), expected_operation_counts(operation, expected) as (
  values
${expectedOperationCounts}
), operation_counts as (
  select e.operation, coalesce(a.affected, 0::bigint) as actual, e.expected,
    coalesce(a.affected, 0::bigint) = e.expected as matches
  from expected_operation_counts e
  left join cleanup_operation_counts a using (operation)
), remaining_counts as (
${remainingRows}
), evidence_context as (
  select
    ${sqlString(mode)}::text as mode,
    ${sqlString(digest)}::text as scope_digest,
    ${ids.length}::bigint as expected_target_event_count,
    (select count(*)::bigint from cleanup_target_events) as actual_target_event_count,
    prefix_event_count as pre_delete_prefix_event_count,
    expected_prefix_event_count
  from cleanup_evidence_context
)
select jsonb_build_object(
  'mode', c.mode,
  'scope_digest', c.scope_digest,
  'target_event_ids', (
    select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
    from cleanup_target_events
  ),
  'target_event_count', jsonb_build_object(
    'actual', c.actual_target_event_count,
    'expected', c.expected_target_event_count,
    'matches', c.actual_target_event_count = c.expected_target_event_count
  ),
  'prefix_event_count', jsonb_build_object(
    'actual', c.pre_delete_prefix_event_count,
    'expected', c.expected_prefix_event_count,
    'matches', c.pre_delete_prefix_event_count = c.expected_prefix_event_count
  ),
  'pre_delete_counts', (
    select jsonb_object_agg(
      entity,
      jsonb_build_object('actual', actual, 'expected', expected, 'matches', matches)
      order by entity
    )
    from pre_counts
  ),
  'operation_counts', (
    select jsonb_object_agg(
      operation,
      jsonb_build_object('actual', actual, 'expected', expected, 'matches', matches)
      order by operation
    )
    from operation_counts
  ),
  'saved_pk_remaining', (
    select jsonb_object_agg(entity, actual order by entity)
    from remaining_counts
  ),
  'all_guards_passed',
    c.actual_target_event_count = c.expected_target_event_count
    and c.pre_delete_prefix_event_count = c.expected_prefix_event_count
    and (select bool_and(matches) from pre_counts)
    and (select bool_and(matches) from operation_counts)
    and (select bool_and(actual = 0) from remaining_counts)
) as cleanup_evidence
from evidence_context c;`;
}

function renderDatabaseRoleGuard(database, role) {
  return `do $$
begin
  if current_database() is distinct from ${sqlString(database)} then
    raise exception 'cleanup database mismatch';
  end if;

  if current_user::text is distinct from ${sqlString(role)} then
    raise exception 'cleanup role mismatch';
  end if;
end;
$$;`;
}

function renderTransaction(manifest, mode) {
  const schema = manifest.schema;
  const ids = manifest.targetEventIds;
  const expected = manifest.expectedCounts;
  const prefixLike = sqlString(manifest.prefix + "%");
  const rescoped = isRescopedManifest(manifest);
  const expectedPrefixTotal =
    manifest.expectedCounts.events + manifest.expectedRemainingPrefixEvents;
  const digest = scopeDigest(manifest);
  const finalStatement = mode === "rollback" ? "ROLLBACK;" : "COMMIT;";
  const finalLabel =
    mode === "rollback"
      ? "Validation only: every successful change below is rolled back."
      : "Permanent deletion: all guards must pass before COMMIT.";

  return `-- Generated by operate-supabase-live-db.
-- ${finalLabel}
-- Profile: ${manifest.profileVersion}
-- Target events: ${ids.length}
-- Scope digest: ${digest}

BEGIN;

set local lock_timeout = ${sqlString(manifest.timeouts.lock)};
set local statement_timeout = ${sqlString(manifest.timeouts.statement)};

${rescoped ? renderDatabaseRoleGuard(RESCOPED_DATABASE, RESCOPED_ROLE) + "\n\n" : ""}${renderSchemaShapeGuard(schema)}

create temporary table cleanup_target_events (
  id uuid primary key
) on commit drop;

create temporary table cleanup_evidence_context (
  prefix_event_count bigint not null,
  expected_prefix_event_count bigint not null
) on commit drop;

insert into cleanup_target_events (id) values
${targetValues(ids)};

do $$
declare
  requested_count bigint;
  matched_count bigint;
  prefix_count bigint;
begin
  select count(*) into requested_count
  from cleanup_target_events;

  select count(*) into matched_count
  from cleanup_target_events t
  join ${qualified(schema, "events")} e on e.id = t.id
  where e.title like ${prefixLike};

  ${
    rescoped
      ? "prefix_count := matched_count;"
      : `select count(*) into prefix_count
  from ${qualified(schema, "events")} e
  where e.title like ${prefixLike};`
  }

  if requested_count <> ${ids.length}
    or matched_count <> requested_count
  then
    raise exception
      'target safety check failed: expected ${ids.length}, requested %, matched prefix %',
      requested_count,
      matched_count;
  end if;

  if prefix_count <> ${rescoped ? ids.length : expectedPrefixTotal} then
    raise exception
      '${rescoped ? "target marker mismatch" : "prefix inventory drift"}: expected ${rescoped ? ids.length : expectedPrefixTotal}, actual %',
      prefix_count;
  end if;

  insert into cleanup_evidence_context (
    prefix_event_count,
    expected_prefix_event_count
  ) values (prefix_count, ${rescoped ? ids.length : expectedPrefixTotal});
end;
$$;

-- Lock every target FK root in a stable order so new cross-scope references
-- cannot appear after the external-reference guard.
do $$
begin
  perform e.id
  from ${qualified(schema, "events")} e
  join cleanup_target_events t on t.id = e.id
  order by e.created_at, e.id
  for update of e;

  perform p.id
  from ${qualified(schema, "participants")} p
  join cleanup_target_events t on t.id = p.event_id
  order by p.id
  for update of p;

  perform c.id
  from ${qualified(schema, "candidates")} c
  join cleanup_target_events t on t.id = c.event_id
  order by c.id
  for update of c;

  perform cr.id
  from ${qualified(schema, "criteria")} cr
  join cleanup_target_events t on t.id = cr.event_id
  order by cr.id
  for update of cr;
end;
$$;

create temporary table cleanup_target_rows (
  entity text not null,
  id uuid not null,
  primary key (entity, id)
) on commit drop;

insert into cleanup_target_rows (entity, id)
select 'events', e.id
from ${qualified(schema, "events")} e
join cleanup_target_events t on t.id = e.id

union all

select 'participants', p.id
from ${qualified(schema, "participants")} p
join cleanup_target_events t on t.id = p.event_id

union all

select 'candidates', c.id
from ${qualified(schema, "candidates")} c
join cleanup_target_events t on t.id = c.event_id

union all

select 'criteria', cr.id
from ${qualified(schema, "criteria")} cr
join cleanup_target_events t on t.id = cr.event_id

union all

select 'votes', v.id
from ${qualified(schema, "votes")} v
join ${qualified(schema, "candidates")} c on c.id = v.candidate_id
join cleanup_target_events t on t.id = c.event_id

union all

select 'reactions', r.id
from ${qualified(schema, "reactions")} r
join ${qualified(schema, "candidates")} c on c.id = r.candidate_id
join cleanup_target_events t on t.id = c.event_id

union all

select 'concerns', co.id
from ${qualified(schema, "concerns")} co
join ${qualified(schema, "candidates")} c on c.id = co.candidate_id
join cleanup_target_events t on t.id = c.event_id

union all

select 'comments', cm.id
from ${qualified(schema, "comments")} cm
join ${qualified(schema, "candidates")} c on c.id = cm.candidate_id
join cleanup_target_events t on t.id = c.event_id;

${renderPreCountGuard(expected)}

${renderInvariantGuard(schema)}

${renderExternalReferenceGuard(schema)}

create temporary table cleanup_operation_counts (
  operation text primary key,
  affected bigint not null
) on commit drop;

-- Delete feedback first for explicit operation counts; root deletion then uses
-- the verified CASCADE / SET NULL graph for participants, candidates, criteria.
${renderDeleteBlock(schema, "votes", expected.votes)}

${renderDeleteBlock(schema, "comments", expected.comments)}

${renderDeleteBlock(schema, "reactions", expected.reactions)}

${renderDeleteBlock(schema, "concerns", expected.concerns)}

create temporary table cleanup_deleted_events (
  id uuid primary key,
  title text not null
) on commit drop;

with deleted as (
  delete from ${qualified(schema, "events")} e
  using cleanup_target_events t
  where e.id = t.id
    and e.title like ${prefixLike}
  returning e.id, e.title
)
insert into cleanup_deleted_events (id, title)
select id, title
from deleted;

do $$
declare
  affected_count bigint;
begin
  select count(*) into affected_count
  from cleanup_deleted_events;

  if affected_count <> ${expected.events} then
    raise exception
      'event delete count mismatch: expected ${expected.events}, actual %',
      affected_count;
  end if;

  insert into cleanup_operation_counts (operation, affected)
  values ('events_deleted', affected_count);
end;
$$;

${renderRemainingGuard(schema)}

-- SQL Editor evidence: this is the transaction's only top-level
-- result-producing statement and must remain immediately before the terminator.
${renderEvidenceSelect(schema, mode, digest, ids, expected)}

${finalStatement}`;
}

function renderPostcheck(manifest) {
  const schema = manifest.schema;
  const prefixLike = sqlString(manifest.prefix + "%");
  const expectedRemaining = manifest.expectedRemainingPrefixEvents;

  return `-- Generated by operate-supabase-live-db.
-- SELECT ONLY. Run in a new query after the committed cleanup.

with target_ids(id) as (
  values
${targetValues(manifest.targetEventIds)}
)
select t.id, e.title, e.created_at
from target_ids t
join ${qualified(schema, "events")} e on e.id = t.id
order by t.id;

select
  count(*) as actual_remaining_prefix_events,
  ${expectedRemaining}::bigint as expected_remaining_prefix_events,
  count(*) = ${expectedRemaining} as matches_expectation
from ${qualified(schema, "events")}
where title like ${prefixLike};`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.validationArtifactDirectory) {
    try {
      const validation = validateRescopedArtifactBundle(
        args.validationArtifactDirectory
      );
      process.stdout.write(
        JSON.stringify({
          valid: true,
          generationMode: validation.mode,
          scopeDigest: validation.scopeDigest,
          sqlSha256: validation.sqlSha256,
          generationRecordSha256: validation.generationRecordSha256
        }) + "\n"
      );
      return;
    } catch (error) {
      fail("artifact bundle validation failed: " + error.message);
    }
  }
  const { manifestPath, mode } = args;
  const manifestMetadata = loadJsonFile(manifestPath, "manifest");
  const manifest = manifestMetadata.value;
  const manifestFamily = classifyManifestFamily(manifest);
  const rescopedGeneration =
    manifestFamily === "rescoped" &&
    (mode === "rollback" || mode === "commit");

  let authorizationMetadata;
  if (rescopedGeneration) {
    requireRescopedArguments(args);
    validateOwnerOnlyRegularFile(manifestMetadata.absolutePath, "manifest");
    requireExact(
      manifestMetadata.sha256,
      args.manifestSha256,
      "manifest raw SHA-256"
    );
    validateOwnerOnlyRegularFile(
      resolve(args.authorizationRecordPath),
      "authorization record"
    );
    authorizationMetadata = loadJsonFile(
      args.authorizationRecordPath,
      "authorization record"
    );
    requireExact(
      authorizationMetadata.sha256,
      args.authorizationRecordSha256,
      "authorization record raw SHA-256"
    );
  } else if (
    args.manifestSha256 ||
    args.authorizationRecordPath ||
    args.authorizationRecordSha256 ||
    args.artifactDirectory
  ) {
    fail(
      "rescoped generation arguments are only valid for rescoped rollback or commit"
    );
  }

  validateManifest(manifest, mode, manifestFamily);
  if (rescopedGeneration) {
    validateAuthorizationRecord(
      authorizationMetadata.value,
      manifestMetadata,
      manifest,
      args
    );
  }

  let sql;
  if (mode === "discovery") {
    sql = renderDiscovery(manifest);
  } else if (mode === "postcheck") {
    sql = renderPostcheck(manifest);
  } else {
    sql = renderTransaction(manifest, mode);
  }

  if (rescopedGeneration) {
    writeRescopedArtifacts(
      sql,
      manifestMetadata,
      authorizationMetadata,
      args
    );
  } else {
    process.stdout.write(sql.trimEnd() + "\n");
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
