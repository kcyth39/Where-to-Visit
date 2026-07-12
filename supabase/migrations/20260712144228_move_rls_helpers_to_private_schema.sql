begin;

do $$
declare
  helper_count integer;
  policy_count integer;
  helper_policy_count integer;
begin
  if exists (
    select 1
    from pg_catalog.pg_namespace
    where nspname = 'private'
  ) then
    raise exception 'private schema already exists';
  end if;

  select count(*)
  into helper_count
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'request_candidate_has_share_token',
      'request_candidate_is_accessible',
      'request_event_has_share_token',
      'request_event_is_accessible',
      'request_owner_token_matches_event'
    )
    and pg_catalog.pg_get_function_identity_arguments(p.oid) in (
      'target_candidate_id uuid',
      'target_event_id uuid'
    )
    and p.proowner = 'postgres'::pg_catalog.regrole
    and p.prosecdef
    and p.provolatile = 's';

  if helper_count <> 5 then
    raise exception 'expected 5 public SECURITY DEFINER token helpers, found %', helper_count;
  end if;

  select count(*)
  into policy_count
  from pg_catalog.pg_policy pol
  join pg_catalog.pg_class rel on rel.oid = pol.polrelid
  join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public';

  if policy_count <> 29 then
    raise exception 'expected 29 public policies, found %', policy_count;
  end if;

  with helpers as (
    select p.oid
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'request_candidate_has_share_token',
        'request_candidate_is_accessible',
        'request_event_has_share_token',
        'request_event_is_accessible',
        'request_owner_token_matches_event'
      )
  ), dependent_policies as (
    select distinct d.objid
    from pg_catalog.pg_depend d
    join helpers h on h.oid = d.refobjid
    where d.classid = 'pg_policy'::pg_catalog.regclass
      and d.refclassid = 'pg_proc'::pg_catalog.regclass
  )
  select count(*)
  into helper_policy_count
  from dependent_policies;

  if helper_policy_count <> 27 then
    raise exception 'expected 27 helper-dependent policies, found %', helper_policy_count;
  end if;
end;
$$;

create schema private authorization postgres;

revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to anon;

alter function public.request_owner_token_matches_event(uuid) set schema private;
alter function public.request_event_has_share_token(uuid) set schema private;
alter function public.request_event_is_accessible(uuid) set schema private;
alter function public.request_candidate_is_accessible(uuid) set schema private;
alter function public.request_candidate_has_share_token(uuid) set schema private;

create or replace function private.request_owner_token_matches_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and public.request_header('x-owner-token') <> ''
      and e.owner_token = public.request_header('x-owner-token')
  );
$$;

create or replace function private.request_event_has_share_token(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and public.request_header('x-share-token') <> ''
      and e.share_token = public.request_header('x-share-token')
  );
$$;

create or replace function private.request_event_is_accessible(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.request_event_has_share_token(target_event_id)
    or private.request_owner_token_matches_event(target_event_id);
$$;

create or replace function private.request_candidate_is_accessible(target_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.candidates c
    where c.id = target_candidate_id
      and private.request_event_is_accessible(c.event_id)
  );
$$;

create or replace function private.request_candidate_has_share_token(target_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.candidates c
    where c.id = target_candidate_id
      and private.request_event_has_share_token(c.event_id)
  );
$$;

revoke all on function private.request_owner_token_matches_event(uuid) from public, anon, authenticated, service_role;
revoke all on function private.request_event_has_share_token(uuid) from public, anon, authenticated, service_role;
revoke all on function private.request_event_is_accessible(uuid) from public, anon, authenticated, service_role;
revoke all on function private.request_candidate_is_accessible(uuid) from public, anon, authenticated, service_role;
revoke all on function private.request_candidate_has_share_token(uuid) from public, anon, authenticated, service_role;

grant execute on function private.request_owner_token_matches_event(uuid) to anon;
grant execute on function private.request_event_has_share_token(uuid) to anon;
grant execute on function private.request_event_is_accessible(uuid) to anon;
grant execute on function private.request_candidate_is_accessible(uuid) to anon;
grant execute on function private.request_candidate_has_share_token(uuid) to anon;

commit;
