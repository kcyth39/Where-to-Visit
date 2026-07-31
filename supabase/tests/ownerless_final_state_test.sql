begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'owner_token'
  ),
  'the final Event schema has no owner token'
);

select ok(
  to_regprocedure('private.request_owner_token_matches_event(uuid)') is null,
  'the owner-token helper is absent'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~ 'owner_token|x-owner-token'
        or coalesce(with_check, '') ~ 'owner_token|x-owner-token'
      )
  ),
  'no RLS policy uses owner-token authorization'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_roles
    where rolname = 'kimenosuke_event_creator'
      and rolcanlogin
      and not rolinherit
      and rolconnlimit = -1
  ),
  'the Event creator has exact login, inheritance, and connection settings'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_roles
    where rolname = 'kimenosuke_event_creator'
      and not rolsuper
      and not rolcreatedb
      and not rolcreaterole
      and not rolreplication
      and not rolbypassrls
  ),
  'the Event creator has no elevated cluster attributes'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_authid
    where rolname = 'kimenosuke_event_creator'
      and rolpassword is null
  ),
  'the Event creator has no password before the credential gate'
);

select ok(
  coalesce(
    (
      select case
        when executor_role.rolsuper then (
          select count(*) = 0
          from pg_catalog.pg_auth_members membership
          where membership.roleid = creator_role.oid
        )
        else executor_role.rolcreaterole and (
          select count(*) = 1
          from pg_catalog.pg_auth_members membership
          where membership.roleid = creator_role.oid
            and membership.member = executor_role.oid
            and membership.admin_option
            and not membership.set_option
            and not membership.inherit_option
            and membership.grantor = 10
        )
      end
      from pg_catalog.pg_roles creator_role
      cross join pg_catalog.pg_roles executor_role
      where creator_role.rolname = 'kimenosuke_event_creator'
        and executor_role.rolname = current_user
    ),
    false
  ),
  coalesce(
    (
      select pg_catalog.format(
        'the Event creator has the exact %s management membership form',
        case
          when rolsuper then 'SUPERUSER_CREATED'
          else 'NON_SUPERUSER_CREATEROLE_CREATED'
        end
      )
      from pg_catalog.pg_roles
      where rolname = current_user
    ),
    'the Event creator management membership form is observable'
  )
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_auth_members membership
    join pg_catalog.pg_roles creator_role
      on creator_role.oid = membership.member
    where creator_role.rolname = 'kimenosuke_event_creator'
  ),
  'the Event creator is not a member of another role'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_auth_members membership
    join pg_catalog.pg_roles creator_role
      on creator_role.oid = membership.roleid
    join pg_catalog.pg_roles executor_role
      on executor_role.rolname = current_user
    where creator_role.rolname = 'kimenosuke_event_creator'
      and not (
        not executor_role.rolsuper
        and executor_role.rolcreaterole
        and membership.member = executor_role.oid
        and membership.admin_option
        and not membership.set_option
        and not membership.inherit_option
        and membership.grantor = 10
      )
  ),
  'the Event creator has no unexpected management membership'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_auth_members membership
    join pg_catalog.pg_roles creator_role
      on creator_role.oid in (membership.roleid, membership.member)
    where creator_role.rolname = 'kimenosuke_event_creator'
      and (
        membership.set_option
        or membership.inherit_option
      )
  ),
  'no Event creator membership permits SET ROLE or privilege inheritance'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_shdepend dependency
    join pg_catalog.pg_roles creator_role
      on creator_role.oid = dependency.refobjid
    where dependency.refclassid =
        'pg_catalog.pg_authid'::pg_catalog.regclass
      and dependency.deptype = 'o'
      and creator_role.rolname = 'kimenosuke_event_creator'
  ),
  'the Event creator owns no database object'
);

select ok(
  has_database_privilege(
    'kimenosuke_event_creator',
    current_database(),
    'CONNECT'
  )
    and has_schema_privilege(
      'kimenosuke_event_creator',
      'public',
      'USAGE'
    )
    and not has_schema_privilege(
      'kimenosuke_event_creator',
      'private',
      'USAGE'
    ),
  'the Event creator has required database/public access and no private-schema access'
);

select ok(
  has_column_privilege(
    'kimenosuke_event_creator',
    'public.events',
    'title',
    'INSERT'
  )
    and has_column_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'memo',
      'INSERT'
    )
    and has_column_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'share_token',
      'INSERT'
    )
    and not has_column_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'id',
      'INSERT'
    ),
  'the Event creator can insert only title, memo, and share_token'
);

select ok(
  not has_table_privilege(
    'kimenosuke_event_creator',
    'public.events',
    'SELECT'
  )
    and not has_table_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'UPDATE'
    )
    and not has_table_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'DELETE'
    )
    and not has_table_privilege(
      'kimenosuke_event_creator',
      'public.events',
      'TRUNCATE'
    ),
  'the Event creator cannot read, mutate, delete, or truncate Events'
);

select ok(
  not exists (
    select 1
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
  ),
  'the Event creator has no direct privilege on related tables'
);

select ok(
  not has_function_privilege(
    'kimenosuke_event_creator',
    'private.create_default_criterion_for_event()',
    'EXECUTE'
  )
    and not has_function_privilege(
      'kimenosuke_event_creator',
      'public.prepare_event_row()',
      'EXECUTE'
    ),
  'the Event creator cannot execute trigger functions directly'
);

select is(
  (
    select array_agg(policyname::text order by policyname)
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'events'
  ),
  array[
    'events_insert_by_event_creator',
    'events_select_by_share_token',
    'events_update_memo_by_share_token'
  ],
  'Event RLS contains the exact final policy set'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in (
        'events',
        'participants',
        'candidates',
        'criteria',
        'votes',
        'reactions',
        'concerns',
        'comments'
      )
  ),
  29::bigint,
  'the approved 29-policy set remains installed'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.events'::pg_catalog.regclass
      and conname = 'events_share_token_shape_check'
      and contype = 'c'
      and convalidated
  ),
  'the exact share-token shape is constrained'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.events'::pg_catalog.regclass
      and conname = 'events_memo_normalized_check'
      and contype = 'c'
      and convalidated
  ),
  'normalized Event memo storage is constrained'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'create_default_criterion_for_event'
      and p.proowner = 'postgres'::pg_catalog.regrole
      and p.prosecdef
      and p.proconfig = array['search_path=pg_catalog']
  ),
  'default Criterion creation keeps its private SECURITY DEFINER boundary'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.events'::pg_catalog.regclass
      and tgname = 'events_after_insert_create_default_criterion'
      and not tgisinternal
      and tgtype = 5
  ),
  'default Criterion creation remains an AFTER INSERT row trigger'
);

select lives_ok(
  $$insert into public.events (title, memo, share_token)
    values (
      '  N5 ownerless final fixture  ',
      E'\r\n  shared memo  \r',
      'OwnerlessFinalShareToken0000000000000000001'
    )$$,
  'the test executor can create one complete Event fixture'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_policy policy
    join pg_catalog.pg_class relation
      on relation.oid = policy.polrelid
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    join pg_catalog.pg_roles creator_role
      on creator_role.rolname = 'kimenosuke_event_creator'
    where namespace.nspname = 'public'
      and relation.relname = 'events'
      and policy.polname = 'events_insert_by_event_creator'
      and policy.polcmd = 'a'
      and policy.polroles = array[creator_role.oid]
      and policy.polwithcheck is not null
  ),
  'the Event insert policy is restricted to the dedicated creator role'
);

select ok(
  not has_table_privilege(
    'kimenosuke_event_creator',
    'public.events',
    'SELECT'
  ),
  'the dedicated creator cannot read Events'
);

select is(
  (
    select title || '|' || memo
    from public.events
    where share_token = 'OwnerlessFinalShareToken0000000000000000001'
  ),
  E'N5 ownerless final fixture|shared memo',
  'title and memo use the approved normalization'
);

select is(
  (
    select count(*)
    from public.criteria
    where event_id = (
      select id
      from public.events
      where share_token = 'OwnerlessFinalShareToken0000000000000000001'
    )
      and label = '興味ある？'
      and source = 'default'
      and created_by is null
  ),
  1::bigint,
  'Event creation atomically creates the exact default Criterion'
);

select is(
  (
    select count(*)
    from public.participants
    where event_id = (
      select id
      from public.events
      where share_token = 'OwnerlessFinalShareToken0000000000000000001'
    )
  ),
  0::bigint,
  'Event creation does not create a Participant'
);

select set_config(
  'request.headers',
  '{"x-share-token":"OwnerlessFinalShareToken0000000000000000001"}',
  true
);
set local role anon;

select is(
  (
    select count(*)
    from public.events
    where share_token = 'OwnerlessFinalShareToken0000000000000000001'
  ),
  1::bigint,
  'the share capability can read its Event'
);

select lives_ok(
  $$update public.events
    set memo = E'  jointly edited\r\nmemo  '
    where share_token = 'OwnerlessFinalShareToken0000000000000000001'$$,
  'the share capability can update Event memo'
);

select throws_ok(
  $$update public.events
    set title = 'forbidden title update'
    where share_token = 'OwnerlessFinalShareToken0000000000000000001'$$,
  '42501',
  null,
  'the share capability cannot update Event title'
);

reset role;

select is(
  (
    select memo
    from public.events
    where share_token = 'OwnerlessFinalShareToken0000000000000000001'
  ),
  E'jointly edited\nmemo',
  'a shared memo update stores the normalized value'
);

select throws_ok(
  $$update public.events
    set title = 'postgres must not bypass title immutability'
    where share_token = 'OwnerlessFinalShareToken0000000000000000001'$$,
  'P0001',
  'only event memo can be updated',
  'the DB trigger rejects title mutation even outside the application role'
);

select set_config(
  'request.headers',
  '{"x-owner-token":"obsolete-owner-capability"}',
  true
);
set local role anon;

select is(
  (select count(*) from public.events),
  0::bigint,
  'an obsolete owner header grants no Event visibility'
);

reset role;

select * from finish();

rollback;
