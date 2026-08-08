begin;

-- This final transition is valid only for the reviewed owner-model schema and
-- an empty business-data surface. Existing rows require a separately approved
-- migration design and must never be transformed or deleted here.
do $$
declare
  business_row_count bigint;
  public_policy_count integer;
  public_trigger_count integer;
begin
  if (
    select count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'events',
        'participants',
        'candidates',
        'criteria',
        'votes',
        'reactions',
        'concerns',
        'comments'
      )
  ) <> 8 then
    raise exception 'N5 old-schema fingerprint mismatch: expected eight business tables';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = 'public.events'::pg_catalog.regclass
      and attname = 'owner_token'
      and attnum > 0
      and not attisdropped
      and attnotnull
  ) then
    raise exception 'N5 old-schema fingerprint mismatch: events.owner_token';
  end if;

  if (
    select array_agg(policyname::text order by policyname)
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'events'
  ) is distinct from array[
    'events_insert_with_request_tokens',
    'events_select_by_share_or_owner',
    'events_update_by_owner_token'
  ] then
    raise exception 'N5 old-schema fingerprint mismatch: Event policies';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.events'::pg_catalog.regclass
      and conname = 'events_owner_token_key'
      and contype = 'u'
      and convalidated
  )
    or to_regclass('public.events_owner_token_idx') is null then
    raise exception 'N5 old-schema fingerprint mismatch: owner token indexes';
  end if;

  if to_regprocedure('private.request_owner_token_matches_event(uuid)') is null
    or to_regprocedure('private.request_event_has_share_token(uuid)') is null
    or to_regprocedure('private.request_event_is_accessible(uuid)') is null
    or to_regprocedure('private.create_default_criterion_for_event()') is null then
    raise exception 'N5 old-schema fingerprint mismatch: required private functions';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'request_owner_token_matches_event'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'target_event_id uuid'
      and p.proowner = 'postgres'::pg_catalog.regrole
      and p.prosecdef
      and p.provolatile = 's'
      and p.proconfig = array['search_path=pg_catalog']
  ) then
    raise exception 'N5 old-schema fingerprint mismatch: owner helper attributes';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.events'::pg_catalog.regclass
      and tgname = 'events_after_insert_create_default_criterion'
      and not tgisinternal
      and tgtype = 5
  ) then
    raise exception 'N5 old-schema fingerprint mismatch: default Criterion trigger';
  end if;

  select count(*)
  into public_policy_count
  from pg_catalog.pg_policy pol
  join pg_catalog.pg_class rel on rel.oid = pol.polrelid
  join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
    and rel.relname in (
      'events',
      'participants',
      'candidates',
      'criteria',
      'votes',
      'reactions',
      'concerns',
      'comments'
    );

  if public_policy_count <> 29 then
    raise exception 'N5 old-schema fingerprint mismatch: expected 29 policies, found %',
      public_policy_count;
  end if;

  select count(*)
  into public_trigger_count
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class rel on rel.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
    and rel.relname in (
      'events',
      'participants',
      'candidates',
      'criteria',
      'votes',
      'reactions',
      'concerns',
      'comments'
    )
    and not t.tgisinternal;

  if public_trigger_count <> 13 then
    raise exception 'N5 old-schema fingerprint mismatch: expected 13 triggers, found %',
      public_trigger_count;
  end if;

  select
      (select count(*) from public.events)
    + (select count(*) from public.participants)
    + (select count(*) from public.candidates)
    + (select count(*) from public.criteria)
    + (select count(*) from public.votes)
    + (select count(*) from public.reactions)
    + (select count(*) from public.concerns)
    + (select count(*) from public.comments)
  into business_row_count;

  if business_row_count <> 0 then
    raise exception 'N5 requires all eight business tables to be empty; found % rows',
      business_row_count;
  end if;
end;
$$;

-- The direct Event creator is a login role with no password until a later
-- Human credential gate. Replaying a clean local database reuses and
-- deterministically hardens a safe cluster-level role. Elevated or owning
-- roles stop before any membership, role, or schema mutation.
do $$
declare
  creator_role record;
  executor_role record;
  granted_role name;
  grantee_role name;
  allowed_management_membership_count bigint;
  expected_management_membership_count bigint;
  inbound_membership_count bigint;
  outbound_membership_count bigint;
  owned_object_count bigint;
begin
  select
    oid,
    rolsuper,
    rolcreaterole
  into strict executor_role
  from pg_catalog.pg_authid
  where rolname = current_user;

  if executor_role.rolsuper then
    expected_management_membership_count := 0;
  else
    expected_management_membership_count := 1;
  end if;

  select
    oid,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolreplication,
    rolconnlimit,
    rolpassword,
    rolbypassrls
  into creator_role
  from pg_catalog.pg_authid
  where rolname = 'kimenosuke_event_creator';

  if not found then
    create role kimenosuke_event_creator
      with login nosuperuser nocreatedb nocreaterole noinherit noreplication
      nobypassrls connection limit -1 password null;

    select
      oid,
      rolsuper,
      rolinherit,
      rolcreaterole,
      rolcreatedb,
      rolcanlogin,
      rolreplication,
      rolconnlimit,
      rolpassword,
      rolbypassrls
    into strict creator_role
    from pg_catalog.pg_authid
    where rolname = 'kimenosuke_event_creator';
  end if;

  select count(*)
  into owned_object_count
  from pg_catalog.pg_shdepend dependency
  where dependency.refclassid =
      'pg_catalog.pg_authid'::pg_catalog.regclass
    and dependency.refobjid = creator_role.oid
    and dependency.deptype = 'o';

  select
    count(*) filter (where membership.member = creator_role.oid),
    count(*) filter (where membership.roleid = creator_role.oid)
  into inbound_membership_count, outbound_membership_count
  from pg_catalog.pg_auth_members membership;

  select count(*)
  into allowed_management_membership_count
  from pg_catalog.pg_auth_members membership
  where membership.roleid = creator_role.oid
    and membership.member = executor_role.oid
    and not executor_role.rolsuper
    and executor_role.rolcreaterole
    and membership.admin_option
    and not membership.set_option
    and not membership.inherit_option
    and membership.grantor = 10;

  if creator_role.rolsuper
    or creator_role.rolcreaterole
    or creator_role.rolcreatedb
    or creator_role.rolreplication
    or creator_role.rolbypassrls then
    raise exception
      'N5 refuses to harden an elevated existing Event creator role';
  end if;

  if owned_object_count <> 0 then
    raise exception
      'N5 refuses to harden an Event creator role that owns database objects';
  end if;

  if not executor_role.rolsuper
    and (
      not executor_role.rolcreaterole
      or allowed_management_membership_count <>
        expected_management_membership_count
    ) then
    raise exception
      'N5 requires one exact non-runtime management membership for a non-superuser executor';
  end if;

  alter role kimenosuke_event_creator
    with login noinherit connection limit -1 password null;

  select
    oid,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolreplication,
    rolconnlimit,
    rolpassword,
    rolbypassrls
  into strict creator_role
  from pg_catalog.pg_authid
  where rolname = 'kimenosuke_event_creator';

  if creator_role.rolsuper
    or creator_role.rolcreaterole
    or creator_role.rolcreatedb
    or creator_role.rolreplication
    or creator_role.rolbypassrls
    or not creator_role.rolcanlogin
    or creator_role.rolinherit
    or creator_role.rolconnlimit <> -1
    or creator_role.rolpassword is not null then
    raise exception
      'N5 Event creator role hardening did not reach the required state';
  end if;

  if inbound_membership_count > 0 then
    for granted_role in
      select parent.rolname
      from pg_catalog.pg_auth_members membership
      join pg_catalog.pg_roles parent on parent.oid = membership.roleid
      join pg_catalog.pg_roles member_role on member_role.oid = membership.member
      where member_role.rolname = 'kimenosuke_event_creator'
      order by parent.rolname
    loop
      execute pg_catalog.format(
        'revoke %I from kimenosuke_event_creator',
        granted_role
      );
    end loop;
  end if;

  if outbound_membership_count > 0 then
    for grantee_role in
      select member_role.rolname
      from pg_catalog.pg_auth_members membership
      join pg_catalog.pg_roles parent on parent.oid = membership.roleid
      join pg_catalog.pg_roles member_role on member_role.oid = membership.member
      where parent.rolname = 'kimenosuke_event_creator'
        and not (
          not executor_role.rolsuper
          and executor_role.rolcreaterole
          and member_role.oid = executor_role.oid
          and membership.admin_option
          and not membership.set_option
          and not membership.inherit_option
          and membership.grantor = 10
        )
      order by
        (member_role.rolname = current_user),
        member_role.rolname
    loop
      execute pg_catalog.format(
        'revoke kimenosuke_event_creator from %I',
        grantee_role
      );
    end loop;
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members membership
    where membership.member = creator_role.oid
  ) then
    raise exception
      'N5 Event creator role remains a member of another role';
  end if;

  select count(*)
  into allowed_management_membership_count
  from pg_catalog.pg_auth_members membership
  where membership.roleid = creator_role.oid
    and membership.member = executor_role.oid
    and not executor_role.rolsuper
    and executor_role.rolcreaterole
    and membership.admin_option
    and not membership.set_option
    and not membership.inherit_option
    and membership.grantor = 10;

  if allowed_management_membership_count <>
      expected_management_membership_count then
    raise exception
      'N5 Event creator management membership form mismatch';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members membership
    where membership.roleid = creator_role.oid
      and not (
        not executor_role.rolsuper
        and executor_role.rolcreaterole
        and membership.member = executor_role.oid
        and membership.admin_option
        and not membership.set_option
        and not membership.inherit_option
        and membership.grantor = 10
      )
  ) then
    raise exception
      'N5 Event creator has an unexpected management membership';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members membership
    where (
        membership.roleid = creator_role.oid
        or membership.member = creator_role.oid
      )
      and (
        membership.set_option
        or membership.inherit_option
      )
  ) then
    raise exception
      'N5 Event creator membership permits runtime privilege use';
  end if;
end;
$$;

do $$
begin
  execute pg_catalog.format(
    'revoke all privileges on database %I from kimenosuke_event_creator',
    current_database()
  );
  execute pg_catalog.format(
    'grant connect on database %I to kimenosuke_event_creator',
    current_database()
  );
end;
$$;

revoke all on schema public from kimenosuke_event_creator;
grant usage on schema public to kimenosuke_event_creator;
revoke all on schema private from kimenosuke_event_creator;

revoke all on all tables in schema public from kimenosuke_event_creator;
revoke all on all sequences in schema public from kimenosuke_event_creator;
revoke all on all functions in schema public from kimenosuke_event_creator;
revoke all on all functions in schema private from kimenosuke_event_creator;

-- Replace the Event boundary before removing owner-specific schema.
drop policy if exists events_select_by_share_or_owner on public.events;
drop policy if exists events_insert_with_request_tokens on public.events;
drop policy if exists events_update_by_owner_token on public.events;

revoke insert, update on table public.events from anon, authenticated;
revoke insert (title, memo, share_token, owner_token)
  on table public.events from anon, authenticated;
revoke update (title, memo)
  on table public.events from anon, authenticated;

create or replace function private.request_event_is_accessible(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.request_event_has_share_token(target_event_id);
$$;

alter function private.request_event_is_accessible(uuid) owner to postgres;
revoke all on function private.request_event_is_accessible(uuid)
  from public, anon, authenticated, service_role, kimenosuke_event_creator;
grant execute on function private.request_event_is_accessible(uuid) to anon;

create policy events_select_by_share_token
  on public.events
  for select
  to anon
  using (private.request_event_has_share_token(id));

create policy events_update_memo_by_share_token
  on public.events
  for update
  to anon
  using (private.request_event_has_share_token(id))
  with check (private.request_event_has_share_token(id));

create policy events_insert_by_event_creator
  on public.events
  for insert
  to kimenosuke_event_creator
  with check (
    share_token ~ '^[A-Za-z0-9_-]{43}$'
    and char_length(title) between 1 and 80
    and (memo is null or (position(E'\r' in memo) = 0 and char_length(memo) <= 1000))
  );

grant update (memo) on table public.events to anon;
grant insert (title, memo, share_token)
  on table public.events to kimenosuke_event_creator;

-- ECMAScript trim characters are listed explicitly so application and DB
-- normalization have the same boundary.
create or replace function public.prepare_event_row()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  trim_characters constant text :=
    U&'\0009\000B\000C\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\202F\205F\3000\FEFF\000A\000D\2028\2029';
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.title is distinct from old.title
    or new.share_token is distinct from old.share_token
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'only event memo can be updated';
  end if;

  if tg_op = 'INSERT' then
    new.title := pg_catalog.btrim(new.title, trim_characters);
  end if;

  new.memo := nullif(
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(new.memo, E'\r\n', E'\n'),
        E'\r',
        E'\n'
      ),
      trim_characters
    ),
    ''
  );

  return new;
end;
$$;

alter function public.prepare_event_row() owner to postgres;
revoke all on function public.prepare_event_row()
  from public, anon, authenticated, service_role, kimenosuke_event_creator;

alter table public.events
  add constraint events_share_token_shape_check
    check (share_token ~ '^[A-Za-z0-9_-]{43}$'),
  add constraint events_memo_normalized_check
    check (
      memo is null
      or (
        position(E'\r' in memo) = 0
        and char_length(memo) between 1 and 1000
      )
    );

drop function private.request_owner_token_matches_event(uuid);

drop index if exists public.events_owner_token_idx;
alter table public.events
  drop constraint if exists events_owner_token_key,
  drop column owner_token;

-- Final fail-closed fingerprint.
do $$
declare
  creator_role record;
  executor_role record;
  allowed_management_membership_count bigint;
  expected_management_membership_count bigint;
  public_policy_count integer;
  public_trigger_count integer;
  forbidden_relation_privilege_count integer;
begin
  if exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = 'public.events'::pg_catalog.regclass
      and attname = 'owner_token'
      and attnum > 0
      and not attisdropped
  ) then
    raise exception 'N5 final fingerprint mismatch: owner_token remains';
  end if;

  if to_regprocedure('private.request_owner_token_matches_event(uuid)') is not null then
    raise exception 'N5 final fingerprint mismatch: owner helper remains';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~ 'owner_token|x-owner-token'
        or coalesce(with_check, '') ~ 'owner_token|x-owner-token'
      )
  ) then
    raise exception 'N5 final fingerprint mismatch: owner policy remains';
  end if;

  select count(*)
  into public_policy_count
  from pg_catalog.pg_policy pol
  join pg_catalog.pg_class rel on rel.oid = pol.polrelid
  join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
    and rel.relname in (
      'events',
      'participants',
      'candidates',
      'criteria',
      'votes',
      'reactions',
      'concerns',
      'comments'
    );

  if public_policy_count <> 29 then
    raise exception 'N5 final fingerprint mismatch: expected 29 policies, found %',
      public_policy_count;
  end if;

  select count(*)
  into public_trigger_count
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class rel on rel.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
    and rel.relname in (
      'events',
      'participants',
      'candidates',
      'criteria',
      'votes',
      'reactions',
      'concerns',
      'comments'
    )
    and not t.tgisinternal;

  if public_trigger_count <> 13 then
    raise exception 'N5 final fingerprint mismatch: expected 13 triggers, found %',
      public_trigger_count;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_authid
    where rolname = 'kimenosuke_event_creator'
      and rolcanlogin
      and not rolsuper
      and not rolcreatedb
      and not rolcreaterole
      and not rolinherit
      and not rolreplication
      and not rolbypassrls
      and rolconnlimit = -1
      and rolpassword is null
  ) then
    raise exception 'N5 final fingerprint mismatch: creator role attributes';
  end if;

  select oid
  into strict creator_role
  from pg_catalog.pg_authid
  where rolname = 'kimenosuke_event_creator';

  select
    oid,
    rolsuper,
    rolcreaterole
  into strict executor_role
  from pg_catalog.pg_authid
  where rolname = current_user;

  if executor_role.rolsuper then
    expected_management_membership_count := 0;
  else
    expected_management_membership_count := 1;
  end if;

  if not executor_role.rolsuper and not executor_role.rolcreaterole then
    raise exception 'N5 final fingerprint mismatch: executor role authority';
  end if;

  select count(*)
  into allowed_management_membership_count
  from pg_catalog.pg_auth_members membership
  where membership.roleid = creator_role.oid
    and membership.member = executor_role.oid
    and not executor_role.rolsuper
    and executor_role.rolcreaterole
    and membership.admin_option
    and not membership.set_option
    and not membership.inherit_option
    and membership.grantor = 10;

  if allowed_management_membership_count <>
      expected_management_membership_count then
    raise exception
      'N5 final fingerprint mismatch: management membership form';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members membership
    where membership.member = creator_role.oid
  ) then
    raise exception
      'N5 final fingerprint mismatch: creator role is a role member';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members membership
    where membership.roleid = creator_role.oid
      and not (
        not executor_role.rolsuper
        and executor_role.rolcreaterole
        and membership.member = executor_role.oid
        and membership.admin_option
        and not membership.set_option
        and not membership.inherit_option
        and membership.grantor = 10
      )
  ) then
    raise exception
      'N5 final fingerprint mismatch: unexpected management membership';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members membership
    where (
        membership.roleid = creator_role.oid
        or membership.member = creator_role.oid
      )
      and (
        membership.set_option
        or membership.inherit_option
      )
  ) then
    raise exception
      'N5 final fingerprint mismatch: runtime-capable membership';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_shdepend dependency
    join pg_catalog.pg_roles owned_role
      on owned_role.oid = dependency.refobjid
    where dependency.refclassid =
        'pg_catalog.pg_authid'::pg_catalog.regclass
      and dependency.deptype = 'o'
      and owned_role.rolname = 'kimenosuke_event_creator'
  ) then
    raise exception 'N5 final fingerprint mismatch: creator role ownership';
  end if;

  if not has_database_privilege(
      'kimenosuke_event_creator',
      current_database(),
      'CONNECT'
    )
    or not has_schema_privilege(
      'kimenosuke_event_creator',
      'public',
      'USAGE'
    )
    or has_schema_privilege(
      'kimenosuke_event_creator',
      'private',
      'USAGE'
    ) then
    raise exception 'N5 final fingerprint mismatch: database or schema privilege';
  end if;

  if not has_column_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'title',
      'INSERT'
    )
    or not has_column_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'memo',
      'INSERT'
    )
    or not has_column_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'share_token',
      'INSERT'
    )
    or has_column_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'id',
      'INSERT'
    )
    or has_table_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'SELECT'
    )
    or has_table_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'UPDATE'
    )
    or has_table_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'DELETE'
    ) then
    raise exception 'N5 final fingerprint mismatch: creator Event privilege';
  end if;

  select count(*)
  into forbidden_relation_privilege_count
  from (
    values
      ('public.participants'::text),
      ('public.candidates'::text),
      ('public.criteria'::text),
      ('public.votes'::text),
      ('public.reactions'::text),
      ('public.concerns'::text),
      ('public.comments'::text)
  ) relation(relation_name)
  where has_table_privilege(
      'kimenosuke_event_creator',
      relation.relation_name,
      'SELECT'
    )
    or has_table_privilege(
      'kimenosuke_event_creator',
      relation.relation_name,
      'INSERT'
    )
    or has_table_privilege(
      'kimenosuke_event_creator',
      relation.relation_name,
      'UPDATE'
    )
    or has_table_privilege(
      'kimenosuke_event_creator',
      relation.relation_name,
      'DELETE'
    )
    or has_table_privilege(
      'kimenosuke_event_creator',
      relation.relation_name,
      'TRUNCATE'
    )
    or has_table_privilege(
      'kimenosuke_event_creator',
      relation.relation_name,
      'REFERENCES'
    )
    or has_table_privilege(
      'kimenosuke_event_creator',
      relation.relation_name,
      'TRIGGER'
    );

  if forbidden_relation_privilege_count <> 0 then
    raise exception 'N5 final fingerprint mismatch: creator related-table privilege';
  end if;

  if has_function_privilege(
      'kimenosuke_event_creator',
      'private.create_default_criterion_for_event()',
      'EXECUTE'
    )
    or has_function_privilege(
      'kimenosuke_event_creator',
      'public.prepare_event_row()',
      'EXECUTE'
    ) then
    raise exception 'N5 final fingerprint mismatch: creator function EXECUTE';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'create_default_criterion_for_event'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
      and p.proowner = 'postgres'::pg_catalog.regrole
      and p.prosecdef
      and p.proconfig = array['search_path=pg_catalog']
  ) then
    raise exception 'N5 final fingerprint mismatch: default Criterion function';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'events',
        'participants',
        'candidates',
        'criteria',
        'votes',
        'reactions',
        'concerns',
        'comments'
      )
      and not c.relrowsecurity
  ) then
    raise exception 'N5 final fingerprint mismatch: RLS disabled';
  end if;
end;
$$;

commit;
