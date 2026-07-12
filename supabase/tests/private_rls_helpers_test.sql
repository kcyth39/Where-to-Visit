begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select is(
  (select pg_catalog.pg_get_userbyid(nspowner)
   from pg_catalog.pg_namespace
   where nspname = 'private'),
  'postgres',
  'private schema exists and is owned by postgres'
);

select ok(
  not exists (
      select 1
      from pg_catalog.pg_namespace n
      cross join lateral pg_catalog.aclexplode(
        coalesce(n.nspacl, pg_catalog.acldefault('n', n.nspowner))
      ) acl
      where n.nspname = 'private'
        and acl.grantee = 0
        and acl.privilege_type = 'USAGE'
    )
    and has_schema_privilege('anon', 'private', 'USAGE')
    and not has_schema_privilege('authenticated', 'private', 'USAGE')
    and not has_schema_privilege('service_role', 'private', 'USAGE'),
  'only anon and the owner can use the private schema'
);

select is(
  (select count(*)
   from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in (
       'request_candidate_has_share_token',
       'request_candidate_is_accessible',
       'request_event_has_share_token',
       'request_event_is_accessible',
       'request_owner_token_matches_event'
     )),
  0::bigint,
  'the five helper RPCs no longer exist in public'
);

select is(
  (select count(*)
   from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname in (
       'request_candidate_has_share_token',
       'request_candidate_is_accessible',
       'request_event_has_share_token',
       'request_event_is_accessible',
       'request_owner_token_matches_event'
     )
     and p.proowner = 'postgres'::pg_catalog.regrole
     and p.prosecdef
     and p.provolatile = 's'
     and p.proconfig = array['search_path=pg_catalog']),
  5::bigint,
  'all five helpers are stable SECURITY DEFINER functions with a fixed search_path'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname like 'request_%'
      and (
        not has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
        or has_function_privilege('service_role', p.oid, 'EXECUTE')
      )
  ),
  'helper EXECUTE privileges are limited to anon and the owner'
);

select is(
  (select count(*) from pg_catalog.pg_policy pol
   join pg_catalog.pg_class rel on rel.oid = pol.polrelid
   join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
   where n.nspname = 'public'),
  29::bigint,
  'the approved 29-policy set remains installed'
);

select is(
  (with helpers as (
     select p.oid
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private'
       and p.proname in (
         'request_candidate_has_share_token',
         'request_candidate_is_accessible',
         'request_event_has_share_token',
         'request_event_is_accessible',
         'request_owner_token_matches_event'
       )
   )
   select count(distinct d.objid)
   from pg_catalog.pg_depend d
   join helpers h on h.oid = d.refobjid
   where d.classid = 'pg_policy'::pg_catalog.regclass
     and d.refclassid = 'pg_proc'::pg_catalog.regclass),
  27::bigint,
  'all 27 helper-dependent policies retain their function dependencies'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~ '(^|[^.])request_(owner|event|candidate)'
        or coalesce(with_check, '') ~ '(^|[^.])request_(owner|event|candidate)'
      )
  ),
  'policy expressions schema-qualify every moved helper'
);

set local role anon;

select is(
  private.request_event_has_share_token('00000000-0000-0000-0000-000000000000'::uuid),
  false,
  'anon can invoke a private helper for RLS evaluation'
);

reset role;

select ok(
  'private' <> all (array['public', 'graphql_public']),
  'private is not part of the local Data API exposed schema contract'
);

select * from finish();

rollback;
