#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const renderer = join(skillRoot, "scripts", "render-e2e-cleanup-sql.mjs");
const templatePath = join(
  skillRoot,
  "assets",
  "cleanup-manifest.template.json"
);
const rescopedTemplatePath = join(
  skillRoot,
  "assets",
  "cleanup-manifest.rescoped.template.json"
);
const temporaryRoot = mkdtempSync(join(tmpdir(), "operate-supabase-live-db-"));
const CURRENT_PROFILE_VERSION =
  "where-to-visit-collaborative-response-row-20260725010551";
const PRE_S1B_PROFILE_VERSION =
  "where-to-visit-collaborative-response-row-20260712144228";
const LEGACY_ROLLBACK_SHA256 =
  "286e987f4a17baf6a51ccf80ac78d225258d1c5a7f1bee48d4fdc6812c9958c1";
const RESCOPED_TEST_FAULT_ENV =
  "WHERE_TO_VISIT_CLEANUP_RENDERER_TEST_FAULT";
const { validateRescopedArtifactBundle } = await import(
  pathToFileURL(renderer).href
);

function run(mode, manifestPath) {
  return spawnSync(
    process.execPath,
    [renderer, "--manifest", manifestPath, "--mode", mode],
    { encoding: "utf8" }
  );
}

function writeManifest(name, manifest) {
  const path = join(temporaryRoot, name + ".json");
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
  return path;
}

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function writeOwnerOnlyJson(name, value) {
  const path = join(temporaryRoot, name + ".json");
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

function authorizationFor(mode, manifestPath, manifestSha256, scopeDigest) {
  return {
    contractVersion: "S1-C1B-PRODUCTION-SMOKE-CLEANUP-RESCOPED-v1.0",
    manifest: {
      path: manifestPath,
      sha256: manifestSha256,
      scopeDigest
    },
    permittedGenerationMode: mode,
    artifactGenerationAuthorized: true,
    sqlExecutionAuthorized: false,
    permanentDeletionAuthorized: false
  };
}

function runRescoped(
  mode,
  manifestPath,
  authorizationPath,
  suffix,
  extra = [],
  fault
) {
  const artifactDirectory = join(temporaryRoot, suffix);
  const outputPath = join(
    artifactDirectory,
    mode === "rollback" ? "rollback-validation.sql" : "commit-cleanup.sql"
  );
  const generationRecordPath = join(
    artifactDirectory,
    "generation-record.json"
  );
  const completePath = join(artifactDirectory, "COMPLETE");
  const result = spawnSync(
    process.execPath,
    [
      renderer,
      "--manifest",
      manifestPath,
      "--manifest-sha256",
      fileSha256(manifestPath),
      "--authorization-record",
      authorizationPath,
      "--authorization-record-sha256",
      fileSha256(authorizationPath),
      "--mode",
      mode,
      "--artifact-directory",
      artifactDirectory,
      ...extra
    ],
    {
      encoding: "utf8",
      env: fault
        ? {
            ...process.env,
            NODE_ENV: "test",
            [RESCOPED_TEST_FAULT_ENV]: fault
          }
        : process.env
    }
  );
  return {
    result,
    artifactDirectory,
    outputPath,
    generationRecordPath,
    completePath
  };
}

function assertIncompleteBundle(render) {
  assert.notEqual(render.result.status, 0);
  assert.equal(existsSync(render.artifactDirectory), true);
  assert.throws(() =>
    validateRescopedArtifactBundle(render.artifactDirectory)
  );
}

function assertRejectedBeforeArtifact(render, errorPattern) {
  assert.notEqual(render.result.status, 0);
  assert.equal(render.result.stdout, "");
  assert.match(render.result.stderr, errorPattern);
  assert.equal(existsSync(render.artifactDirectory), false);
  assert.equal(existsSync(render.generationRecordPath), false);
  assert.equal(existsSync(render.completePath), false);
}

function digestForProfile(manifest, profileVersion) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        profileVersion,
        schema: manifest.schema,
        prefix: manifest.prefix,
        targetEventIds: [...manifest.targetEventIds].sort(),
        expectedCounts: {
          events: manifest.expectedCounts.events,
          participants: manifest.expectedCounts.participants,
          candidates: manifest.expectedCounts.candidates,
          criteria: manifest.expectedCounts.criteria,
          votes: manifest.expectedCounts.votes,
          reactions: manifest.expectedCounts.reactions,
          concerns: manifest.expectedCounts.concerns,
          comments: manifest.expectedCounts.comments
        },
        expectedRemainingPrefixEvents: manifest.expectedRemainingPrefixEvents,
        timeouts: {
          lock: manifest.timeouts.lock,
          statement: manifest.timeouts.statement
        }
      })
    )
    .digest("hex");
}

function mutationFree(sql) {
  const withoutComments = sql.replace(/^--.*$/gm, "");
  return !/\b(BEGIN|COMMIT|ROLLBACK|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE)\b/i.test(
    withoutComments
  );
}

function topLevelStatements(sql) {
  const statements = [];
  let current = "";
  let state = "normal";
  let blockDepth = 0;
  let dollarTag = "";

  const finish = () => {
    const normalized = current.replace(/\s+/g, " ").trim();
    if (normalized) statements.push(normalized);
    current = "";
  };

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    if (state === "line-comment") {
      if (char === "\n" || char === "\r") {
        state = "normal";
        current += " ";
      }
      continue;
    }
    if (state === "block-comment") {
      if (char === "/" && next === "*") {
        blockDepth += 1;
        index += 1;
      } else if (char === "*" && next === "/") {
        blockDepth -= 1;
        index += 1;
        if (blockDepth === 0) state = "normal";
      }
      continue;
    }
    if (state === "single-quote") {
      current += char;
      if (char === "'" && next === "'") current += sql[++index];
      else if (char === "'") state = "normal";
      continue;
    }
    if (state === "double-quote") {
      current += char;
      if (char === '"' && next === '"') current += sql[++index];
      else if (char === '"') state = "normal";
      continue;
    }
    if (state === "dollar-quote") {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length - 1;
        state = "normal";
      }
      continue;
    }
    if (char === "-" && next === "-") {
      state = "line-comment";
      index += 1;
    } else if (char === "/" && next === "*") {
      state = "block-comment";
      blockDepth = 1;
      index += 1;
    } else if (char === "'") {
      state = "single-quote";
      current += char;
    } else if (char === '"') {
      state = "double-quote";
      current += char;
    } else if (char === "$") {
      const match = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length - 1;
        state = "dollar-quote";
      } else current += char;
    } else if (char === ";") finish();
    else current += char;
  }
  finish();
  return statements;
}

function transactionBodyForComparison(sql) {
  return topLevelStatements(sql)
    .slice(0, -1)
    .join(";\n")
    .replace(/'rollback'::text/g, "'<mode>'::text")
    .replace(/'commit'::text/g, "'<mode>'::text");
}

function triggerProfileFromGuard(sql) {
  const match = sql.match(
    /with expected\(table_name, trigger_name, enabled, definition_sha256\) as \(values\n([\s\S]*?)\n  \), actual as \(/i
  );
  assert.ok(match, "trigger profile guard is missing");
  return [...match[1].matchAll(/\('([^']+)', '([^']+)', '([^']+)', '([0-9a-f]{64})'\)/g)].map(
    ([, table, name, enabled, digest]) => [table, name, enabled, digest]
  );
}

function exactTriggerProfile(expected, actual) {
  const tuple = (entry) => JSON.stringify(entry);
  const expectedTuples = new Set(expected.map(tuple));
  const actualTuples = new Set(actual.map(tuple));
  return (
    expected.length === expectedTuples.size &&
    actual.length === actualTuples.size &&
    expectedTuples.size === actualTuples.size &&
    [...expectedTuples].every((entry) => actualTuples.has(entry))
  );
}

function fkProfileFromGuard(sql) {
  const match = sql.match(
    /with expected\(name, source_table, source_columns, target_table, target_columns, on_delete, on_update, match_type, fk_is_validated, fk_is_deferrable, fk_is_initially_deferred\) as \(\n    values\n([\s\S]*?)\n  \), actual as \(/i
  );
  assert.ok(match, "FK profile guard is missing");
  return [...match[1].matchAll(/\('([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', (true|false), (true|false), (true|false)\)/g)].map(
    ([, name, source, sourceColumns, target, targetColumns, onDelete, onUpdate, matchType, validated, deferrable, initiallyDeferred]) => [
      name,
      source,
      sourceColumns,
      target,
      targetColumns,
      onDelete,
      onUpdate,
      matchType,
      validated === "true",
      deferrable === "true",
      initiallyDeferred === "true"
    ]
  );
}

function exactFkProfile(expected, actual) {
  const tuple = (entry) => JSON.stringify(entry);
  const expectedTuples = new Set(expected.map(tuple));
  const actualTuples = new Set(actual.map(tuple));
  return (
    expected.length === expectedTuples.size &&
    actual.length === actualTuples.size &&
    expectedTuples.size === actualTuples.size &&
    [...expectedTuples].every((entry) => actualTuples.has(entry))
  );
}

try {
  const template = JSON.parse(readFileSync(templatePath, "utf8"));
  assert.equal(template.profileVersion, CURRENT_PROFILE_VERSION);
  const unverified = {
    ...template,
    targetEventIds: [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222"
    ],
    expectedCounts: {
      events: 2,
      participants: 3,
      candidates: 2,
      criteria: 2,
      votes: 2,
      reactions: 1,
      concerns: 1,
      comments: 1
    },
    expectedRemainingPrefixEvents: 1
  };
  const unverifiedPath = writeManifest("unverified", unverified);

  const discovery = run("discovery", unverifiedPath);
  assert.equal(discovery.status, 0, discovery.stderr);
  assert.match(discovery.stdout, /SELECT ONLY/);
  assert.match(discovery.stdout, /referencing_schema/);
  assert.match(discovery.stdout, /referenced_schema/);
  assert.match(discovery.stdout, /condeferrable/);
  assert.match(discovery.stdout, /condeferred/);
  assert.match(discovery.stdout, /when 's' then 'SIMPLE'/);
  assert.match(discovery.stdout, /else 'UNKNOWN:' \|\| con\.confmatchtype::text/);
  assert.match(discovery.stdout, /nullability_matches_profile/);
  assert.match(discovery.stdout, /as votes/);
  assert.match(discovery.stdout, /\('concerns', 'criterion_id', 'NO'\)/);
  assert.match(discovery.stdout, /\('comments', 'participant_id', 'NO'\)/);
  assert.doesNotMatch(discovery.stdout, /owner_participant_id/);
  assert.doesNotMatch(discovery.stdout, /guest_token/);
  assert.match(
    discovery.stdout,
    /\('reactions', 'participant_id', 'NO'\)/
  );
  assert.match(
    discovery.stdout,
    /\('reactions', 'criterion_id', 'NO'\)/
  );
  assert.match(
    discovery.stdout,
    /select 'reactions_reference_event'[\s\S]*?left join public\.candidates c[\s\S]*?left join public\.participants p[\s\S]*?left join public\.criteria cr[\s\S]*?r\.candidate_id is null[\s\S]*?r\.participant_id is null[\s\S]*?r\.criterion_id is null/
  );
  assert.match(
    discovery.stdout,
    /select 'concerns_reference_event'[\s\S]*?left join public\.candidates c[\s\S]*?left join public\.participants p[\s\S]*?left join public\.criteria cr[\s\S]*?co\.criterion_id is null/
  );
  assert.match(
    discovery.stdout,
    /select 'comments_reference_event'[\s\S]*?left join public\.candidates c[\s\S]*?left join public\.participants p[\s\S]*?cm\.participant_id is null/
  );
  assert.match(discovery.stdout, /cross_event_invariant/);
  assert.match(discovery.stdout, /delete_event/);
  assert.match(discovery.stdout, /function_schema/);
  assert.equal(mutationFree(discovery.stdout), true);

  const rollback = run("rollback", unverifiedPath);
  assert.equal(rollback.status, 0, rollback.stderr);
  assert.equal(
    createHash("sha256").update(rollback.stdout).digest("hex"),
    LEGACY_ROLLBACK_SHA256,
    "legacy rollback SQL output changed"
  );
  assert.match(rollback.stdout, /prefix inventory drift: expected 3/);
  assert.match(rollback.stdout, /external reference safety check failed/);
  assert.match(rollback.stdout, /schema nullability mismatch/);
  assert.match(rollback.stdout, /FK profile mismatch/);
  assert.match(rollback.stdout, /fk_is_validated/);
  assert.match(rollback.stdout, /fk_is_deferrable/);
  assert.match(rollback.stdout, /fk_is_initially_deferred/);
  assert.match(rollback.stdout, /'SIMPLE'/);
  assert.match(rollback.stdout, /when 's' then 'SIMPLE'/);
  assert.match(rollback.stdout, /else 'UNKNOWN:' \|\| con\.confmatchtype::text/);
  assert.doesNotMatch(rollback.stdout, /'NONE'/);
  assert.match(rollback.stdout, /con\.condeferrable/);
  assert.match(rollback.stdout, /con\.condeferred/);
  assert.doesNotMatch(rollback.stdout, /\bas deferrable\b/);
  assert.doesNotMatch(rollback.stdout, /\bas initially_deferred\b/);
  assert.doesNotMatch(rollback.stdout, /match_type, validated, deferrable, initially_deferred/);
  assert.match(rollback.stdout, /boundary FK safety check failed/);
  assert.match(
    rollback.stdout,
    /select\s+not exists \(select \* from expected except select \* from actual\)\s+and not exists \(select \* from actual except select \* from expected\)\s+into fk_exact_match;/i
  );
  assert.match(rollback.stdout, /if fk_exact_match is not true then/i);
  const fkGuard = rollback.stdout.match(
    /with expected\(name, source_table, source_columns, target_table, target_columns, on_delete, on_update, match_type, fk_is_validated, fk_is_deferrable, fk_is_initially_deferred\) as \([\s\S]*?\n  end if;\n\n  select count\(\*\) into boundary_fk_count/i
  );
  assert.ok(fkGuard, "FK guard block is missing");
  assert.doesNotMatch(fkGuard[0], /union all/i);
  assert.match(rollback.stdout, /trigger profile mismatch/);
  assert.match(rollback.stdout, /cross-event invariant safety check failed/);
  assert.match(rollback.stdout, /for update of p/);
  assert.match(rollback.stdout, /for update of c/);
  assert.match(rollback.stdout, /for update of cr/);
  assert.match(rollback.stdout, /primary key \(entity, id\)/);
  assert.match(rollback.stdout, /post-delete safety check failed/);
  assert.equal(rollback.stdout.trimEnd().endsWith("ROLLBACK;"), true);
  assert.doesNotMatch(rollback.stdout, /COMMIT;/);

  const triggerProfile = triggerProfileFromGuard(rollback.stdout);
  const fkProfile = fkProfileFromGuard(rollback.stdout);
  const s1bTrigger = [
    "events",
    "events_after_insert_create_default_criterion",
    "O",
    "fa2b9fc8ef4cf4cf68421183ed010e3aa7a7889c9391b4cac747fd2d5c97dc34"
  ];
  assert.equal(triggerProfile.length, 13, "expected exact 13-trigger profile");
  assert.equal(
    exactTriggerProfile(triggerProfile, triggerProfile),
    true,
    "exact 13-trigger profile must match"
  );
  assert.ok(
    triggerProfile.some((entry) => JSON.stringify(entry) === JSON.stringify(s1bTrigger)),
    "S1-b AFTER INSERT trigger must be in the guarded profile"
  );

  const isS1bTrigger = (entry) =>
    JSON.stringify(entry) === JSON.stringify(s1bTrigger);

  const changedDefinition = (label) => [
    "events",
    "events_after_insert_create_default_criterion",
    "O",
    label.repeat(64).slice(0, 64)
  ];
  const negativeTriggerProfiles = [
    ["S1-b trigger missing", triggerProfile.filter((entry) => !isS1bTrigger(entry))],
    ["trigger name differs", triggerProfile.map((entry) => isS1bTrigger(entry) ? [entry[0], "events_after_insert_create_default_criteria", entry[2], entry[3]] : entry)],
    ["trigger table differs", triggerProfile.map((entry) => isS1bTrigger(entry) ? ["criteria", entry[1], entry[2], entry[3]] : entry)],
    ["BEFORE INSERT definition differs", triggerProfile.map((entry) => isS1bTrigger(entry) ? changedDefinition("b") : entry)],
    ["AFTER DELETE definition differs", triggerProfile.map((entry) => isS1bTrigger(entry) ? changedDefinition("d") : entry)],
    ["STATEMENT definition differs", triggerProfile.map((entry) => isS1bTrigger(entry) ? changedDefinition("s") : entry)],
    ["called function differs", triggerProfile.map((entry) => isS1bTrigger(entry) ? changedDefinition("f") : entry)],
    ["trigger enabled state differs", triggerProfile.map((entry) => isS1bTrigger(entry) ? [entry[0], entry[1], "D", entry[3]] : entry)],
    ["unknown fourteenth trigger exists", [...triggerProfile, ["events", "unknown_trigger", "O", "0".repeat(64)]]]
  ];
  for (const [name, actualProfile] of negativeTriggerProfiles) {
    assert.equal(exactTriggerProfile(triggerProfile, actualProfile), false, name);
  }

  assert.equal(fkProfile.length, 15, "expected exact 15-FK profile");
  assert.equal(
    exactFkProfile(fkProfile, fkProfile),
    true,
    "exact 15-FK profile must match"
  );
  const missingFk = fkProfile.slice(1);
  const unexpectedFk = [
    ...fkProfile,
    [
      "unexpected_fk",
      "events",
      "{id}",
      "events",
      "{id}",
      "CASCADE",
      "NO ACTION",
      "SIMPLE",
      true,
      false,
      false
    ]
  ];
  const bidirectionalFkDifference = [
    ...missingFk,
    unexpectedFk.at(-1)
  ];
  for (const [name, actualProfile] of [
    ["expected FK missing", missingFk],
    ["unexpected FK added", unexpectedFk],
    ["bidirectional FK differences", bidirectionalFkDifference]
  ]) {
    assert.equal(exactFkProfile(fkProfile, actualProfile), false, name);
  }

  const digestMatch = rollback.stdout.match(
    /^-- Scope digest: ([0-9a-f]{64})$/m
  );
  assert.ok(digestMatch, "rollback scope digest is missing");
  const digest = digestMatch[1];

  const voteAt = rollback.stdout.indexOf("delete from public.votes");
  const commentAt = rollback.stdout.indexOf("delete from public.comments");
  const reactionAt = rollback.stdout.indexOf("delete from public.reactions");
  const concernAt = rollback.stdout.indexOf("delete from public.concerns");
  const eventAt = rollback.stdout.indexOf("delete from public.events");
  assert.ok(
    voteAt >= 0 &&
      voteAt < commentAt &&
      commentAt < reactionAt &&
      reactionAt < concernAt &&
      concernAt < eventAt,
    "delete order is unsafe"
  );
  assert.doesNotMatch(rollback.stdout, /owner_participant_id|guest_token/);
  assert.match(rollback.stdout, /s\.entity = 'votes'/);
  for (const entity of ["events", "participants", "candidates", "criteria", "votes", "reactions", "concerns", "comments"]) {
    assert.match(rollback.stdout, new RegExp("entity = '" + entity + "'"));
  }

  const verified = {
    ...unverified,
    rollbackVerification: {
      completed: true,
      baselineRestored: true,
      verifiedAt: "2026-07-11T00:00:00.000Z",
      scopeDigest: digest
    },
    commitAuthorization: "APPROVED_E2E_CLEANUP_COMMIT"
  };
  const verifiedPath = writeManifest("verified", verified);
  const commit = run("commit", verifiedPath);
  assert.equal(commit.status, 0, commit.stderr);
  assert.equal(commit.stdout.trimEnd().endsWith("COMMIT;"), true);
  assert.match(commit.stdout, /fk_is_validated/);
  assert.match(commit.stdout, /fk_is_deferrable/);
  assert.match(commit.stdout, /fk_is_initially_deferred/);
  assert.match(commit.stdout, /'SIMPLE'/);
  assert.match(commit.stdout, /when 's' then 'SIMPLE'/);
  assert.doesNotMatch(commit.stdout, /ROLLBACK;/);
  assert.match(commit.stdout, new RegExp("Scope digest: " + digest));

  assert.equal(digest, digestForProfile(verified, CURRENT_PROFILE_VERSION));
  const preS1bDigest = digestForProfile(verified, PRE_S1B_PROFILE_VERSION);
  assert.notEqual(digest, preS1bDigest);

  const staleProfilePath = writeManifest("stale-profile", {
    ...verified,
    profileVersion: PRE_S1B_PROFILE_VERSION,
    rollbackVerification: {
      ...verified.rollbackVerification,
      scopeDigest: preS1bDigest
    }
  });
  const deniedStaleProfile = run("commit", staleProfilePath);
  assert.notEqual(deniedStaleProfile.status, 0);
  assert.match(deniedStaleProfile.stderr, /profileVersion/);

  for (const [name, profileVersion] of [
    ["missing-profile", undefined],
    ["modified-profile", CURRENT_PROFILE_VERSION + "-modified"],
    ["mismatched-profile", "where-to-visit-collaborative-response-row-20260725010552"]
  ]) {
    const deniedPath = writeManifest(name, {
      ...verified,
      profileVersion
    });
    const deniedProfile = run("commit", deniedPath);
    assert.notEqual(deniedProfile.status, 0);
    assert.match(deniedProfile.stderr, /profileVersion/);
  }

  for (const [name, sql, terminal] of [
    ["ROLLBACK", rollback.stdout, "ROLLBACK"],
    ["COMMIT", commit.stdout, "COMMIT"]
  ]) {
    const statements = topLevelStatements(sql);
    const evidenceStatements = statements.filter((statement) =>
      /\bas cleanup_evidence\s+from evidence_context\b/i.test(statement)
    );
    assert.equal(
      statements.filter((statement) => /^select\b/i.test(statement)).length,
      0,
      `${name} must not expose an intermediate top-level SELECT`
    );
    assert.equal(evidenceStatements.length, 1, `${name} must have one evidence result statement`);
    assert.equal(statements.at(-2), evidenceStatements[0], `${name} evidence must be penultimate`);
    assert.equal(statements.at(-1).toUpperCase(), terminal, `${name} terminator must follow evidence`);
    assert.match(evidenceStatements[0], /'scope_digest'/, `${name} evidence must include scope digest`);
    assert.match(evidenceStatements[0], /'all_guards_passed'/, `${name} evidence must include final boolean`);
    for (const entity of ["events", "participants", "candidates", "criteria", "votes", "reactions", "concerns", "comments"]) {
      assert.match(evidenceStatements[0], new RegExp("\\('" + entity + "', "), `${name} evidence must include ${entity} pre-count`);
      assert.match(evidenceStatements[0], new RegExp("select '" + entity + "' as entity"), `${name} evidence must include ${entity} remaining count`);
    }
    for (const entity of ["votes", "comments", "reactions", "concerns", "events"]) {
      assert.match(evidenceStatements[0], new RegExp("\\('" + entity + "_deleted', "), `${name} evidence must include ${entity} operation count`);
    }
  }
  assert.equal(
    transactionBodyForComparison(rollback.stdout),
    transactionBodyForComparison(commit.stdout),
    "ROLLBACK and COMMIT transaction bodies must match apart from mode evidence"
  );

  const tamperedScopes = [
    {
      name: "target",
      manifest: {
        ...verified,
        targetEventIds: [
          "33333333-3333-4333-8333-333333333333",
          verified.targetEventIds[1]
        ]
      }
    },
    {
      name: "count",
      manifest: {
        ...verified,
        expectedCounts: {
          ...verified.expectedCounts,
          participants: verified.expectedCounts.participants + 1
        }
      }
    },
    {
      name: "remaining",
      manifest: {
        ...verified,
        expectedRemainingPrefixEvents:
          verified.expectedRemainingPrefixEvents + 1
      }
    },
    {
      name: "timeout",
      manifest: {
        ...verified,
        timeouts: { ...verified.timeouts, lock: "6s" }
      }
    }
  ];

  for (const tampered of tamperedScopes) {
    const tamperedPath = writeManifest(tampered.name, tampered.manifest);
    const deniedTamper = run("commit", tamperedPath);
    assert.notEqual(deniedTamper.status, 0);
    assert.match(deniedTamper.stderr, /rollbackVerification\.scopeDigest/);
  }

  const deniedUnverified = run("commit", unverifiedPath);
  assert.notEqual(deniedUnverified.status, 0);
  assert.match(
    deniedUnverified.stderr,
    /rollbackVerification\.completed must be true/
  );

  const wrongAuthorizationPath = writeManifest("wrong-authorization", {
    ...verified,
    commitAuthorization: "NO"
  });
  const deniedAuthorization = run("commit", wrongAuthorizationPath);
  assert.notEqual(deniedAuthorization.status, 0);
  assert.match(deniedAuthorization.stderr, /commitAuthorization/);

  const unknownContractPath = writeManifest("unknown-contract", {
    ...unverified,
    contractIdentity: {
      verdict: "UNKNOWN",
      version: "LEGACY-LIKE-v99"
    }
  });
  const deniedUnknownContract = run("rollback", unknownContractPath);
  assert.notEqual(deniedUnknownContract.status, 0);
  assert.equal(deniedUnknownContract.stdout, "");
  assert.match(
    deniedUnknownContract.stderr,
    /unknown contract identity; legacy fallback is forbidden/
  );

  const rescopedTemplate = JSON.parse(
    readFileSync(rescopedTemplatePath, "utf8")
  );
  const modeNeutralTerminator =
    "transaction terminator matches the separately authorized generation mode";
  assert.equal(
    rescopedTemplate.runtimeRequiredGuards.at(-1),
    modeNeutralTerminator
  );
  assert.equal(
    rescopedTemplate.scopeDigestInput.runtimeRequiredGuards.at(-1),
    modeNeutralTerminator
  );
  assert.equal(
    JSON.stringify(rescopedTemplate).includes(
      "transaction terminates with ROLLBACK"
    ),
    false
  );
  assert.deepEqual(
    Object.keys(rescopedTemplate.postcheckContract.required).sort(),
    [
      "exactEventUuidRemaining",
      "markerRemaining",
      "targetRelatedRowsRemaining"
    ]
  );
  assert.deepEqual(
    rescopedTemplate.postcheckContract.confirmedByCleanupTransactionEvidence,
    {
      relevantForeignKeyIdentityVerified: true,
      relevantTriggerIdentityVerified: true,
      crossEventInvariantsVerified: true
    }
  );
  for (const key of [
    "relevantForeignKeyIdentityUnchanged",
    "relevantTriggerIdentityUnchanged",
    "crossEventInvariantViolations"
  ]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        rescopedTemplate.scopeDigestInput.postcheckContract,
        key
      ),
      false
    );
  }
  const rescopedEventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const rescopedCounts = {
    events: 1,
    participants: 1,
    candidates: 1,
    criteria: 1,
    votes: 0,
    reactions: 0,
    concerns: 0,
    comments: 0
  };
  const rescopedProjectRef = "syntheticprojectref01";
  const rescopedScopeInput = {
    ...rescopedTemplate.scopeDigestInput,
    projectRef: rescopedProjectRef,
    targetEventIds: [rescopedEventId],
    expectedCounts: rescopedCounts
  };
  const rescopedDigest = createHash("sha256")
    .update(JSON.stringify(rescopedScopeInput))
    .digest("hex");
  const rescopedRollbackManifest = {
    ...rescopedTemplate,
    targetEventIds: [rescopedEventId],
    expectedCounts: rescopedCounts,
    targetIdentity: {
      ...rescopedTemplate.targetIdentity,
      projectRef: rescopedProjectRef
    },
    exactScope: {
      ...rescopedTemplate.exactScope,
      eventId: rescopedEventId,
      expectedCounts: rescopedCounts,
      discoveredCounts: rescopedCounts
    },
    scopeDigestInput: rescopedScopeInput,
    scopeDigest: {
      algorithm: "SHA-256",
      value: rescopedDigest
    }
  };
  const rescopedRollbackManifestPath = writeOwnerOnlyJson(
    "rescoped-rollback-manifest",
    rescopedRollbackManifest
  );
  const rescopedRollbackAuthorizationPath = writeOwnerOnlyJson(
    "rescoped-rollback-authorization",
    authorizationFor(
      "rollback",
      rescopedRollbackManifestPath,
      fileSha256(rescopedRollbackManifestPath),
      rescopedDigest
    )
  );

  const {
    contractIdentity: omittedContractIdentity,
    ...rescopedWithoutContractIdentity
  } = rescopedRollbackManifest;
  assert.ok(omittedContractIdentity);
  const downgradedManifestPath = writeOwnerOnlyJson(
    "rescoped-without-contract-identity",
    rescopedWithoutContractIdentity
  );
  assertRejectedBeforeArtifact(
    runRescoped(
      "rollback",
      downgradedManifestPath,
      rescopedRollbackAuthorizationPath,
      "rescoped-without-contract-identity"
    ),
    /rescoped-only fields without contractIdentity/
  );

  const unknownRescopedVersionPath = writeOwnerOnlyJson(
    "rescoped-with-unknown-version",
    {
      ...rescopedRollbackManifest,
      contractIdentity: {
        ...rescopedRollbackManifest.contractIdentity,
        version: "S1-C1B-PRODUCTION-SMOKE-CLEANUP-RESCOPED-v99"
      }
    }
  );
  assertRejectedBeforeArtifact(
    runRescoped(
      "rollback",
      unknownRescopedVersionPath,
      rescopedRollbackAuthorizationPath,
      "rescoped-with-unknown-version"
    ),
    /unknown contract identity; legacy fallback is forbidden/
  );

  const rescopedOnlyTopLevelFields = [
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
  for (const field of rescopedOnlyTopLevelFields) {
    const mixedManifestPath = writeOwnerOnlyJson(
      "legacy-with-" + field,
      {
        ...unverified,
        [field]: rescopedRollbackManifest[field]
      }
    );
    assertRejectedBeforeArtifact(
      runRescoped(
        "rollback",
        mixedManifestPath,
        rescopedRollbackAuthorizationPath,
        "legacy-with-" + field
      ),
      field === "contractIdentity"
        ? /rescoped targetEventIds must contain exactly one Event UUID/
        : /rescoped-only fields without contractIdentity/
    );
  }

  const legacyWithUnknownFieldPath = writeOwnerOnlyJson(
    "legacy-with-unknown-field",
    {
      ...unverified,
      targetIdentit: rescopedRollbackManifest.targetIdentity
    }
  );
  assertRejectedBeforeArtifact(
    runRescoped(
      "rollback",
      legacyWithUnknownFieldPath,
      rescopedRollbackAuthorizationPath,
      "legacy-with-unknown-field"
    ),
    /legacy manifest contains unsupported top-level fields: targetIdentit/
  );

  const rescopedRollback = runRescoped(
    "rollback",
    rescopedRollbackManifestPath,
    rescopedRollbackAuthorizationPath,
    "rescoped-rollback"
  );
  assert.equal(
    rescopedRollback.result.status,
    0,
    rescopedRollback.result.stderr
  );
  assert.equal(rescopedRollback.result.stdout, "");
  assert.equal(statSync(rescopedRollback.artifactDirectory).mode & 0o777, 0o700);
  assert.equal(existsSync(rescopedRollback.outputPath), true);
  assert.equal(existsSync(rescopedRollback.generationRecordPath), true);
  assert.equal(existsSync(rescopedRollback.completePath), true);
  assert.equal(statSync(rescopedRollback.outputPath).mode & 0o777, 0o600);
  assert.equal(
    statSync(rescopedRollback.generationRecordPath).mode & 0o777,
    0o600
  );
  assert.equal(statSync(rescopedRollback.completePath).mode & 0o777, 0o600);
  const validatedRollbackBundle = validateRescopedArtifactBundle(
    rescopedRollback.artifactDirectory
  );
  assert.equal(validatedRollbackBundle.mode, "rollback");
  const rollbackBundleCliValidation = spawnSync(
    process.execPath,
    [
      renderer,
      "--validate-artifact-directory",
      rescopedRollback.artifactDirectory
    ],
    { encoding: "utf8" }
  );
  assert.equal(
    rollbackBundleCliValidation.status,
    0,
    rollbackBundleCliValidation.stderr
  );
  assert.equal(
    JSON.parse(rollbackBundleCliValidation.stdout).valid,
    true
  );

  const rescopedRollbackSql = readFileSync(
    rescopedRollback.outputPath,
    "utf8"
  );
  const rescopedRollbackRecord = JSON.parse(
    readFileSync(rescopedRollback.generationRecordPath, "utf8")
  );
  const rescopedRollbackComplete = JSON.parse(
    readFileSync(rescopedRollback.completePath, "utf8")
  );
  assert.match(
    rescopedRollbackSql,
    new RegExp("Scope digest: " + rescopedDigest)
  );
  assert.match(rescopedRollbackSql, /current_database\(\) is distinct from 'postgres'/);
  assert.match(rescopedRollbackSql, /current_user::text is distinct from 'postgres'/);
  assert.ok(
    rescopedRollbackSql.indexOf("set local statement_timeout") <
      rescopedRollbackSql.indexOf("cleanup database mismatch")
  );
  assert.ok(
    rescopedRollbackSql.indexOf("cleanup database mismatch") <
      rescopedRollbackSql.indexOf("information_schema.columns")
  );
  assert.ok(
    rescopedRollbackSql.indexOf("cleanup role mismatch") <
      rescopedRollbackSql.indexOf("delete from public.votes")
  );
  assert.doesNotMatch(
    rescopedRollbackSql,
    /select count\(\*\) into prefix_count\s+from public\.events/
  );
  assert.doesNotMatch(
    rescopedRollbackSql,
    /19123d74dc11ed47fabca11634633d978854543cbf79e62cd7e8fd9eebd93538/
  );
  assert.doesNotMatch(rescopedRollbackSql, new RegExp(rescopedProjectRef));
  assert.doesNotMatch(
    rescopedRollbackSql,
    new RegExp(fileSha256(rescopedRollbackManifestPath))
  );
  assert.doesNotMatch(rescopedRollbackSql, /global Events total/);
  assert.doesNotMatch(rescopedRollbackSql, /Criterion label and source/);
  assert.equal(rescopedRollbackRecord.manifestSha256, fileSha256(rescopedRollbackManifestPath));
  assert.equal(
    rescopedRollbackRecord.authorizationRecordSha256,
    fileSha256(rescopedRollbackAuthorizationPath)
  );
  assert.equal(rescopedRollbackRecord.outputSqlSha256, fileSha256(rescopedRollback.outputPath));
  assert.equal(rescopedRollbackRecord.scopeDigest, rescopedDigest);
  assert.equal(rescopedRollbackRecord.generationMode, "rollback");
  assert.equal(rescopedRollbackRecord.generationCount, 1);
  assert.equal(rescopedRollbackRecord.rollbackExecutionAuthorized, false);
  assert.equal(rescopedRollbackRecord.commitExecutionAuthorized, false);
  assert.equal(rescopedRollbackRecord.permanentDeletionAuthorized, false);
  assert.equal(rescopedRollbackComplete.generationMode, "rollback");
  assert.equal(
    rescopedRollbackComplete.sqlSha256,
    fileSha256(rescopedRollback.outputPath)
  );
  assert.equal(
    rescopedRollbackComplete.generationRecordSha256,
    fileSha256(rescopedRollback.generationRecordPath)
  );
  assert.equal(rescopedRollbackComplete.scopeDigest, rescopedDigest);
  assert.equal(rescopedRollbackComplete.generationCount, 1);
  assert.equal(
    topLevelStatements(rescopedRollbackSql).at(-1),
    "ROLLBACK"
  );
  assert.equal(
    topLevelStatements(rescopedRollbackSql).filter(
      (statement) => statement === "COMMIT"
    ).length,
    0
  );

  const reorderedScopeInput = Object.fromEntries(
    Object.entries(rescopedScopeInput).reverse()
  );
  const reorderedManifest = {
    ...rescopedRollbackManifest,
    scopeDigestInput: reorderedScopeInput
  };
  const reorderedManifestPath = writeOwnerOnlyJson(
    "rescoped-reordered-manifest",
    reorderedManifest
  );
  const reorderedAuthorizationPath = writeOwnerOnlyJson(
    "rescoped-reordered-authorization",
    authorizationFor(
      "rollback",
      reorderedManifestPath,
      fileSha256(reorderedManifestPath),
      rescopedDigest
    )
  );
  const reorderedRender = runRescoped(
    "rollback",
    reorderedManifestPath,
    reorderedAuthorizationPath,
    "rescoped-reordered"
  );
  assert.equal(reorderedRender.result.status, 0, reorderedRender.result.stderr);
  const tamperedComplete = JSON.parse(
    readFileSync(reorderedRender.completePath, "utf8")
  );
  tamperedComplete.sqlSha256 = "0".repeat(64);
  writeFileSync(
    reorderedRender.completePath,
    JSON.stringify(tamperedComplete, null, 2) + "\n"
  );
  assert.throws(
    () => validateRescopedArtifactBundle(reorderedRender.artifactDirectory),
    /COMPLETE SQL SHA-256/
  );

  const rescopedCommitManifest = {
    ...rescopedRollbackManifest,
    rollbackVerification: {
      completed: true,
      baselineRestored: true,
      verifiedAt: "2026-07-27T00:00:00.000Z",
      scopeDigest: rescopedDigest
    }
  };
  const rescopedCommitManifestPath = writeOwnerOnlyJson(
    "rescoped-commit-manifest",
    rescopedCommitManifest
  );
  const rescopedCommitAuthorizationPath = writeOwnerOnlyJson(
    "rescoped-commit-authorization",
    authorizationFor(
      "commit",
      rescopedCommitManifestPath,
      fileSha256(rescopedCommitManifestPath),
      rescopedDigest
    )
  );
  const rescopedCommit = runRescoped(
    "commit",
    rescopedCommitManifestPath,
    rescopedCommitAuthorizationPath,
    "rescoped-commit"
  );
  assert.equal(rescopedCommit.result.status, 0, rescopedCommit.result.stderr);
  const validatedCommitBundle = validateRescopedArtifactBundle(
    rescopedCommit.artifactDirectory
  );
  assert.equal(validatedCommitBundle.mode, "commit");
  const rescopedCommitSql = readFileSync(rescopedCommit.outputPath, "utf8");
  const rescopedCommitRecord = JSON.parse(
    readFileSync(rescopedCommit.generationRecordPath, "utf8")
  );
  const rescopedCommitComplete = JSON.parse(
    readFileSync(rescopedCommit.completePath, "utf8")
  );
  assert.equal(rescopedCommitSql.trimEnd().endsWith("COMMIT;"), true);
  assert.equal(rescopedCommitRecord.generationMode, "commit");
  assert.equal(rescopedCommitComplete.generationMode, "commit");
  assert.equal(rescopedCommitComplete.scopeDigest, rescopedDigest);
  assert.equal(
    topLevelStatements(rescopedCommitSql).at(-1),
    "COMMIT"
  );
  assert.equal(
    topLevelStatements(rescopedCommitSql).filter(
      (statement) => statement === "ROLLBACK"
    ).length,
    0
  );
  assert.equal(
    transactionBodyForComparison(rescopedRollbackSql),
    transactionBodyForComparison(rescopedCommitSql)
  );

  for (const [name, change, expectedError] of [
    [
      "database-mismatch",
      (manifest) => ({
        ...manifest,
        targetIdentity: { ...manifest.targetIdentity, sqlDatabase: "other" },
        scopeDigestInput: { ...manifest.scopeDigestInput, database: "other" }
      }),
      /targetIdentity\.sqlDatabase/
    ],
    [
      "role-mismatch",
      (manifest) => ({
        ...manifest,
        targetIdentity: { ...manifest.targetIdentity, role: "other" },
        scopeDigestInput: { ...manifest.scopeDigestInput, role: "other" }
      }),
      /targetIdentity\.role/
    ],
    [
      "schema-mismatch",
      (manifest) => ({
        ...manifest,
        schema: "private",
        targetIdentity: { ...manifest.targetIdentity, schema: "private" },
        scopeDigestInput: { ...manifest.scopeDigestInput, schema: "private" }
      }),
      /schema/
    ],
    [
      "scope-digest-mismatch",
      (manifest) => ({
        ...manifest,
        scopeDigest: { ...manifest.scopeDigest, value: "0".repeat(64) }
      }),
      /scopeDigest\.value/
    ]
  ]) {
    const changed = change(rescopedRollbackManifest);
    const changedPath = writeOwnerOnlyJson(name + "-manifest", changed);
    const changedAuthorizationPath = writeOwnerOnlyJson(
      name + "-authorization",
      authorizationFor(
        "rollback",
        changedPath,
        fileSha256(changedPath),
        changed.scopeDigest.value
      )
    );
    const denied = runRescoped(
      "rollback",
      changedPath,
      changedAuthorizationPath,
      name
    );
    assert.notEqual(denied.result.status, 0);
    assert.match(denied.result.stderr, expectedError);
    assert.equal(existsSync(denied.artifactDirectory), false);
  }

  const badManifestSha = runRescoped(
    "rollback",
    rescopedRollbackManifestPath,
    rescopedRollbackAuthorizationPath,
    "bad-manifest-sha",
    ["--manifest-sha256", "0".repeat(64)]
  );
  assert.notEqual(badManifestSha.result.status, 0);
  assert.match(badManifestSha.result.stderr, /manifest raw SHA-256/);

  const badAuthorizationSha = runRescoped(
    "rollback",
    rescopedRollbackManifestPath,
    rescopedRollbackAuthorizationPath,
    "bad-authorization-sha",
    ["--authorization-record-sha256", "0".repeat(64)]
  );
  assert.notEqual(badAuthorizationSha.result.status, 0);
  assert.match(
    badAuthorizationSha.result.stderr,
    /authorization record raw SHA-256/
  );

  const wrongModeAuthorizationPath = writeOwnerOnlyJson(
    "wrong-mode-authorization",
    {
      ...authorizationFor(
        "commit",
        rescopedCommitManifestPath,
        fileSha256(rescopedCommitManifestPath),
        rescopedDigest
      ),
      permittedGenerationMode: "rollback"
    }
  );
  const wrongMode = runRescoped(
    "commit",
    rescopedCommitManifestPath,
    wrongModeAuthorizationPath,
    "wrong-authorization-mode"
  );
  assert.notEqual(wrongMode.result.status, 0);
  assert.match(wrongMode.result.stderr, /permittedGenerationMode/);

  const executionAuthorizedPath = writeOwnerOnlyJson(
    "execution-authorized",
    {
      ...authorizationFor(
        "rollback",
        rescopedRollbackManifestPath,
        fileSha256(rescopedRollbackManifestPath),
        rescopedDigest
      ),
      sqlExecutionAuthorized: true
    }
  );
  const deniedExecutionAuthorization = runRescoped(
    "rollback",
    rescopedRollbackManifestPath,
    executionAuthorizedPath,
    "execution-authorized"
  );
  assert.notEqual(deniedExecutionAuthorization.result.status, 0);
  assert.match(
    deniedExecutionAuthorization.result.stderr,
    /sqlExecutionAuthorized/
  );

  const missingAuthorization = spawnSync(
    process.execPath,
    [
      renderer,
      "--manifest",
      rescopedRollbackManifestPath,
      "--manifest-sha256",
      fileSha256(rescopedRollbackManifestPath),
      "--authorization-record",
      join(temporaryRoot, "missing-authorization.json"),
      "--authorization-record-sha256",
      "0".repeat(64),
      "--mode",
      "rollback",
      "--artifact-directory",
      join(temporaryRoot, "missing-authorization-bundle")
    ],
    { encoding: "utf8" }
  );
  assert.notEqual(missingAuthorization.status, 0);
  assert.match(missingAuthorization.stderr, /cannot inspect authorization record/);

  const missingRescopedArguments = spawnSync(
    process.execPath,
    [
      renderer,
      "--manifest",
      rescopedRollbackManifestPath,
      "--mode",
      "rollback"
    ],
    { encoding: "utf8" }
  );
  assert.notEqual(missingRescopedArguments.status, 0);
  assert.match(missingRescopedArguments.stderr, /required for rescoped rollback/);

  const deniedOverwrite = runRescoped(
    "rollback",
    rescopedRollbackManifestPath,
    rescopedRollbackAuthorizationPath,
    "rescoped-rollback"
  );
  assert.notEqual(deniedOverwrite.result.status, 0);
  assert.match(deniedOverwrite.result.stderr, /cannot reserve artifact directory/);
  assert.equal(
    fileSha256(rescopedRollback.outputPath),
    rescopedRollbackComplete.sqlSha256
  );
  assert.equal(
    fileSha256(rescopedRollback.generationRecordPath),
    rescopedRollbackComplete.generationRecordSha256
  );

  const existingFileBundlePath = join(temporaryRoot, "existing-file-bundle");
  writeFileSync(existingFileBundlePath, "preserve-existing-file\n", {
    mode: 0o600
  });
  const existingFileBundle = runRescoped(
    "rollback",
    rescopedRollbackManifestPath,
    rescopedRollbackAuthorizationPath,
    "existing-file-bundle"
  );
  assert.notEqual(existingFileBundle.result.status, 0);
  assert.match(
    existingFileBundle.result.stderr,
    /cannot reserve artifact directory/
  );
  assert.equal(
    readFileSync(existingFileBundlePath, "utf8"),
    "preserve-existing-file\n"
  );

  const existingDirectoryBundlePath = join(
    temporaryRoot,
    "existing-directory-bundle"
  );
  mkdirSync(existingDirectoryBundlePath, { mode: 0o700 });
  const existingSentinelPath = join(existingDirectoryBundlePath, "sentinel");
  writeFileSync(existingSentinelPath, "preserve-existing-directory\n", {
    mode: 0o600
  });
  const existingDirectoryBundle = runRescoped(
    "rollback",
    rescopedRollbackManifestPath,
    rescopedRollbackAuthorizationPath,
    "existing-directory-bundle"
  );
  assert.notEqual(existingDirectoryBundle.result.status, 0);
  assert.match(
    existingDirectoryBundle.result.stderr,
    /cannot reserve artifact directory/
  );
  assert.equal(
    readFileSync(existingSentinelPath, "utf8"),
    "preserve-existing-directory\n"
  );

  for (const [suffix, fault] of [
    ["sql-temporary-exists", "sql-temporary-exists"],
    ["record-temporary-exists", "record-temporary-exists"],
    ["after-sql-temporary-write", "after-sql-temporary-write"],
    ["sql-final-exists", "sql-final-exists"],
    ["after-sql-final-publish", "after-sql-final-publish"],
    ["record-final-exists", "record-final-exists"],
    ["after-record-final-publish", "after-record-final-publish"],
    ["complete-exists", "complete-exists"]
  ]) {
    const incomplete = runRescoped(
      "rollback",
      rescopedRollbackManifestPath,
      rescopedRollbackAuthorizationPath,
      suffix,
      [],
      fault
    );
    assertIncompleteBundle(incomplete);
    assert.match(
      incomplete.result.stderr,
      /incomplete output must not be executed or reused/
    );
    if (fault === "sql-final-exists") {
      assert.equal(
        readFileSync(incomplete.outputPath, "utf8"),
        "pre-existing final SQL\n"
      );
    }
    if (fault === "record-final-exists") {
      assert.equal(
        readFileSync(incomplete.generationRecordPath, "utf8"),
        "pre-existing final generation record\n"
      );
    }
  }

  assert.doesNotMatch(rollback.stdout, /cleanup database mismatch/);
  assert.doesNotMatch(rollback.stdout, /cleanup role mismatch/);

  const postcheck = run("postcheck", unverifiedPath);
  assert.equal(postcheck.status, 0, postcheck.stderr);
  assert.match(postcheck.stdout, /matches_expectation/);
  assert.equal(mutationFree(postcheck.stdout), true);

  const emptyPath = writeManifest("empty", template);
  const deniedEmpty = run("rollback", emptyPath);
  assert.notEqual(deniedEmpty.status, 0);
  assert.match(deniedEmpty.stderr, /targetEventIds must not be empty/);

  const duplicatePath = writeManifest("duplicate", {
    ...unverified,
    targetEventIds: [unverified.targetEventIds[0], unverified.targetEventIds[0]]
  });
  const deniedDuplicate = run("rollback", duplicatePath);
  assert.notEqual(deniedDuplicate.status, 0);
  assert.match(deniedDuplicate.stderr, /duplicate UUIDs/);

  const malformedPath = writeManifest("malformed", {
    ...unverified,
    targetEventIds: ["not-a-uuid"],
    expectedCounts: {...unverified.expectedCounts, events: 1}
  });
  const deniedMalformed = run("rollback", malformedPath);
  assert.notEqual(deniedMalformed.status, 0);
  assert.match(deniedMalformed.stderr, /not a valid UUID/);

  process.stdout.write(
    JSON.stringify({
      discoveryLines: discovery.stdout.split("\n").length,
      rollbackLines: rollback.stdout.split("\n").length,
      commitLines: commit.stdout.split("\n").length,
      postcheckLines: postcheck.stdout.split("\n").length,
      scopeDigest: digest,
      legacyRollbackSha256: createHash("sha256")
        .update(rollback.stdout)
        .digest("hex"),
      legacyTestCount: 56,
      rescopedTestCount: 64,
      testCount: 120,
      guards: "PASS"
    }) + "\n"
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
