#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROFILE_VERSION =
  "where-to-visit-collaborative-response-row-20260712144228";
const EXPECTED_SCHEMA = "public";
const EXPECTED_PREFIX = "[E2E]";
const COMMIT_AUTHORIZATION = "APPROVED_E2E_CLEANUP_COMMIT";
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
  fk_mismatch_count bigint;
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
  select count(*) into fk_mismatch_count from (
    (select * from expected except select * from actual)
    union all
    (select * from actual except select * from expected)
  ) d;

  if fk_mismatch_count <> 0 then
    raise exception 'FK profile mismatch: % differences', fk_mismatch_count;
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

select e.id, e.title, e.created_at
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

select entity, count(*) as rows_before
from cleanup_target_rows
group by entity
order by entity;

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
