#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const renderer = join(skillRoot, "scripts", "render-e2e-cleanup-sql.mjs");
const templatePath = join(
  skillRoot,
  "assets",
  "cleanup-manifest.template.json"
);
const temporaryRoot = mkdtempSync(join(tmpdir(), "operate-supabase-live-db-"));

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
      testCount: 50,
      guards: "PASS"
    }) + "\n"
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
