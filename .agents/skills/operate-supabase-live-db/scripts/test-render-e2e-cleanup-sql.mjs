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
  assert.match(discovery.stdout, /is_deferrable/);
  assert.match(discovery.stdout, /initially_deferred/);
  assert.match(discovery.stdout, /nullability_matches_profile/);
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
    /select 'concerns_reference_event'[\s\S]*?left join public\.candidates c[\s\S]*?left join public\.participants p[\s\S]*?co\.candidate_id is null[\s\S]*?co\.participant_id is null/
  );
  assert.match(
    discovery.stdout,
    /select 'comments_reference_event'[\s\S]*?left join public\.candidates c[\s\S]*?left join public\.participants p[\s\S]*?cm\.candidate_id is null[\s\S]*?cm\.participant_id is not null/
  );
  assert.match(discovery.stdout, /cross_event_invariant/);
  assert.equal(mutationFree(discovery.stdout), true);

  const rollback = run("rollback", unverifiedPath);
  assert.equal(rollback.status, 0, rollback.stderr);
  assert.match(rollback.stdout, /prefix inventory drift: expected 3/);
  assert.match(rollback.stdout, /external reference safety check failed/);
  assert.match(rollback.stdout, /schema nullability mismatch/);
  assert.match(rollback.stdout, /deferrable FK safety check failed/);
  assert.match(rollback.stdout, /for update of p/);
  assert.match(rollback.stdout, /for update of c/);
  assert.match(rollback.stdout, /for update of cr/);
  assert.match(rollback.stdout, /primary key \(entity, id\)/);
  assert.match(rollback.stdout, /post-delete safety check failed/);
  assert.equal(rollback.stdout.trimEnd().endsWith("ROLLBACK;"), true);
  assert.doesNotMatch(rollback.stdout, /COMMIT;/);

  const digestMatch = rollback.stdout.match(
    /^-- Scope digest: ([0-9a-f]{64})$/m
  );
  assert.ok(digestMatch, "rollback scope digest is missing");
  const digest = digestMatch[1];

  const commentAt = rollback.stdout.indexOf("delete from public.comments");
  const reactionAt = rollback.stdout.indexOf("delete from public.reactions");
  const concernAt = rollback.stdout.indexOf("delete from public.concerns");
  const ownerAt = rollback.stdout.indexOf("set owner_participant_id = null");
  const eventAt = rollback.stdout.indexOf("delete from public.events");
  assert.ok(
    commentAt >= 0 &&
      commentAt < reactionAt &&
      reactionAt < concernAt &&
      concernAt < ownerAt &&
      ownerAt < eventAt,
    "delete order is unsafe"
  );

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
  assert.doesNotMatch(commit.stdout, /ROLLBACK;/);
  assert.match(commit.stdout, new RegExp("Scope digest: " + digest));

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

  process.stdout.write(
    JSON.stringify({
      discoveryLines: discovery.stdout.split("\n").length,
      rollbackLines: rollback.stdout.split("\n").length,
      commitLines: commit.stdout.split("\n").length,
      postcheckLines: postcheck.stdout.split("\n").length,
      scopeDigest: digest,
      guards: "PASS"
    }) + "\n"
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
