#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROFILE_VERSION = "where-to-visit-slice5-20260710021000";
const EXPECTED_SCHEMA = "public";
const EXPECTED_PREFIX = "[E2E]";
const COMMIT_AUTHORIZATION = "APPROVED_E2E_CLEANUP_COMMIT";
const COUNT_KEYS = [
  "events",
  "participants",
  "candidates",
  "criteria",
  "reactions",
  "concerns",
  "comments"
];
const NULLABILITY_PROFILE = [
  ["events", "owner_participant_id", "YES"],
  ["participants", "event_id", "NO"],
  ["candidates", "event_id", "NO"],
  ["candidates", "created_by", "YES"],
  ["criteria", "event_id", "NO"],
  ["criteria", "created_by", "YES"],
  ["reactions", "candidate_id", "NO"],
  ["reactions", "participant_id", "NO"],
  ["reactions", "criterion_id", "NO"],
  ["concerns", "candidate_id", "NO"],
  ["concerns", "participant_id", "NO"],
  ["comments", "candidate_id", "NO"],
  ["comments", "participant_id", "YES"]
];
const MODES = new Set(["discovery", "rollback", "commit", "postcheck"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMEOUT_PATTERN = /^[1-9][0-9]*(ms|s|min)$/;

function usage() {
  return [
    "Usage:",
    "  node render-e2e-cleanup-sql.mjs --manifest <path> --mode <mode>",
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

  let manifestPath;
  let mode;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") {
      manifestPath = argv[index + 1];
      index += 1;
    } else if (arg === "--mode") {
      mode = argv[index + 1];
      index += 1;
    } else {
      fail("unknown argument: " + arg);
    }
  }

  if (!manifestPath) fail("--manifest is required");
  if (!mode) fail("--mode is required");
  if (!MODES.has(mode)) fail("unsupported mode: " + mode);

  return { manifestPath, mode };
}

function loadManifest(path) {
  let contents;
  try {
    contents = readFileSync(resolve(path), "utf8");
  } catch (error) {
    fail("cannot read manifest: " + error.message);
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    fail("manifest is not valid JSON: " + error.message);
  }
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
  return createHash("sha256")
    .update(JSON.stringify(cleanupScope(manifest)))
    .digest("hex");
}

function validateManifest(manifest, mode) {
  if (!isRecord(manifest)) fail("manifest root must be an object");

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
    requireExact(
      manifest.commitAuthorization,
      COMMIT_AUTHORIZATION,
      "commitAuthorization"
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
  e.owner_participant_id,
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

select
  tc.table_schema as referencing_schema,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as referenced_schema,
  ccu.table_name as referenced_table,
  rc.delete_rule,
  tc.is_deferrable,
  tc.initially_deferred
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
 and kcu.constraint_schema = tc.constraint_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
 and rc.constraint_schema = tc.constraint_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = rc.unique_constraint_name
 and ccu.constraint_schema = rc.unique_constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and (
    (tc.table_schema = ${sqlString(schema)} and tc.table_name in (${tables}))
    or
    (ccu.table_schema = ${sqlString(schema)} and ccu.table_name in (${tables}))
  )
order by tc.table_schema, tc.table_name, kcu.column_name, tc.constraint_name;

select
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid, true) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname = ${sqlString(schema)}
  and c.relname in (${tables})
order by c.relname, t.tgname;

select 'events_owner_participant_event' as cross_event_invariant, count(*) as violations
from ${qualified(schema, "events")} e
left join ${qualified(schema, "participants")} p on p.id = e.owner_participant_id
where e.owner_participant_id is not null
  and (p.id is null or p.event_id is distinct from e.id)

union all

select 'candidates_created_by_event', count(*)
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
where co.candidate_id is null
   or co.participant_id is null
   or c.id is null
   or p.id is null
   or p.event_id is distinct from c.event_id

union all

select 'comments_reference_event', count(*)
from ${qualified(schema, "comments")} cm
left join ${qualified(schema, "candidates")} c on c.id = cm.candidate_id
left join ${qualified(schema, "participants")} p on p.id = cm.participant_id
where cm.candidate_id is null
   or c.id is null
   or (
     cm.participant_id is not null
     and (p.id is null or p.event_id is distinct from c.event_id)
   )

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
  deferred_fk_count bigint;
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

  select count(*) into deferred_fk_count
  from information_schema.table_constraints tc
  join information_schema.referential_constraints rc
    on rc.constraint_name = tc.constraint_name
   and rc.constraint_schema = tc.constraint_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = rc.unique_constraint_name
   and ccu.constraint_schema = rc.unique_constraint_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and (
      (tc.table_schema = ${sqlString(schema)} and tc.table_name in (${tableNameList()}))
      or
      (ccu.table_schema = ${sqlString(schema)} and ccu.table_name in (${tableNameList()}))
    )
    and (
      tc.is_deferrable is distinct from 'NO'
      or tc.initially_deferred is distinct from 'NO'
    );

  if deferred_fk_count <> 0 then
    raise exception
      'deferrable FK safety check failed: % cleanup-graph constraints are deferrable',
      deferred_fk_count;
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

function renderExternalReferenceGuard(schema) {
  return `do $$
declare
  actual_count bigint;
begin
  select count(*) into actual_count
  from ${qualified(schema, "events")} e
  join cleanup_target_rows p
    on p.entity = 'participants'
   and p.id = e.owner_participant_id
  where not exists (
    select 1
    from cleanup_target_rows s
    where s.entity = 'events'
      and s.id = e.id
  );

  if actual_count <> 0 then
    raise exception
      'external reference safety check failed: % non-target events reference target participants',
      actual_count;
  end if;

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
    and exists (
      select 1
      from cleanup_target_rows p
      where p.entity = 'participants'
        and p.id = co.participant_id
    );

  if actual_count <> 0 then
    raise exception
      'external reference safety check failed: % non-target concerns reference target participants',
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
    and exists (
      select 1
      from cleanup_target_rows p
      where p.entity = 'participants'
        and p.id = cm.participant_id
    );

  if actual_count <> 0 then
    raise exception
      'external reference safety check failed: % non-target comments reference target participants',
      actual_count;
  end if;
end;
$$;`;
}

function renderRemainingSelect(schema) {
  return COUNT_KEYS.map((entity, index) => {
    const lead = index === 0 ? "select" : "union all\n\nselect";
    return `${lead} ${sqlString(entity)} as entity, count(*) as remaining
from ${qualified(schema, entity)} x
join cleanup_target_rows s
  on s.entity = ${sqlString(entity)}
 and s.id = x.id`;
  }).join("\n\n") + "\n\norder by entity;";
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

function renderTransaction(manifest, mode) {
  const schema = manifest.schema;
  const ids = manifest.targetEventIds;
  const expected = manifest.expectedCounts;
  const prefixLike = sqlString(manifest.prefix + "%");
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

${renderSchemaShapeGuard(schema)}

create temporary table cleanup_target_events (
  id uuid primary key
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

  select count(*) into prefix_count
  from ${qualified(schema, "events")} e
  where e.title like ${prefixLike};

  if requested_count <> ${ids.length}
    or matched_count <> requested_count
  then
    raise exception
      'target safety check failed: expected ${ids.length}, requested %, matched prefix %',
      requested_count,
      matched_count;
  end if;

  if prefix_count <> ${expectedPrefixTotal} then
    raise exception
      'prefix inventory drift: expected ${expectedPrefixTotal}, actual %',
      prefix_count;
  end if;
end;
$$;

select e.id, e.title, e.created_at, e.owner_participant_id
from ${qualified(schema, "events")} e
join cleanup_target_events t on t.id = e.id
order by e.created_at, e.id
for update of e;

-- Lock every target FK root in a stable order so new cross-scope references
-- cannot appear after the external-reference guard.
select p.id
from ${qualified(schema, "participants")} p
join cleanup_target_events t on t.id = p.event_id
order by p.id
for update of p;

select c.id
from ${qualified(schema, "candidates")} c
join cleanup_target_events t on t.id = c.event_id
order by c.id
for update of c;

select cr.id
from ${qualified(schema, "criteria")} cr
join cleanup_target_events t on t.id = cr.event_id
order by cr.id
for update of cr;

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

select entity, count(*) as rows_before
from cleanup_target_rows
group by entity
order by entity;

${renderPreCountGuard(expected)}

${renderExternalReferenceGuard(schema)}

create temporary table cleanup_operation_counts (
  operation text primary key,
  affected bigint not null
) on commit drop;

-- Delete feedback first to avoid comments SET NULL and event-guard cascade interference.
${renderDeleteBlock(schema, "comments", expected.comments)}

${renderDeleteBlock(schema, "reactions", expected.reactions)}

${renderDeleteBlock(schema, "concerns", expected.concerns)}

do $$
declare
  affected_count bigint;
begin
  update ${qualified(schema, "events")} e
  set owner_participant_id = null
  from cleanup_target_events t
  where e.id = t.id
    and e.title like ${prefixLike};

  get diagnostics affected_count = row_count;

  if affected_count <> ${expected.events} then
    raise exception
      'event owner update count mismatch: expected ${expected.events}, actual %',
      affected_count;
  end if;

  insert into cleanup_operation_counts (operation, affected)
  values ('events_updated', affected_count);
end;
$$;

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

select id, title
from cleanup_deleted_events
order by id;

select operation, affected
from cleanup_operation_counts
order by operation;

${renderRemainingSelect(schema)}

${renderRemainingGuard(schema)}

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

const { manifestPath, mode } = parseArgs(process.argv.slice(2));
const manifest = loadManifest(manifestPath);
validateManifest(manifest, mode);

let sql;
if (mode === "discovery") {
  sql = renderDiscovery(manifest);
} else if (mode === "postcheck") {
  sql = renderPostcheck(manifest);
} else {
  sql = renderTransaction(manifest, mode);
}

process.stdout.write(sql.trimEnd() + "\n");
