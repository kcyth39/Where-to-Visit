begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'create_default_criterion_for_event'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
      and p.proowner = 'postgres'::pg_catalog.regrole
      and p.prosecdef
      and p.proconfig = array['search_path=pg_catalog']
  ),
  'the private default Criterion trigger function is owned by postgres with SECURITY DEFINER and a fixed search_path'
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
  'the Event AFTER INSERT FOR EACH ROW trigger exists'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_default_criterion_for_event'
  ),
  'no public RPC exists for default Criterion creation'
);

select ok(
  not has_function_privilege('public', 'private.create_default_criterion_for_event()', 'EXECUTE')
    and not has_function_privilege('anon', 'private.create_default_criterion_for_event()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'private.create_default_criterion_for_event()', 'EXECUTE')
    and not has_function_privilege('service_role', 'private.create_default_criterion_for_event()', 'EXECUTE')
    and not has_function_privilege(
      'kimenosuke_event_creator',
      'private.create_default_criterion_for_event()',
      'EXECUTE'
    ),
  'application roles cannot directly execute the trigger function'
);

insert into public.events (id, title, memo, share_token)
values (
  '81000000-0000-4000-8000-000000000001',
  '[E2E] S1-b atomic success',
  null,
  'S1bAtomicSuccessShareToken00000000000000001'
);

select is(
  (select count(*) from public.events where id = '81000000-0000-4000-8000-000000000001'),
  1::bigint,
  'a successful Event INSERT creates one Event'
);

select is(
  (select count(*) from public.criteria where event_id = '81000000-0000-4000-8000-000000000001'),
  1::bigint,
  'a successful Event INSERT creates one Criterion'
);

select is(
  (select count(*) from public.participants where event_id = '81000000-0000-4000-8000-000000000001'),
  0::bigint,
  'a successful Event INSERT creates no Participant'
);

select is(
  (
    select format('%s|%s|%s', label, source, created_by is null)
    from public.criteria
    where event_id = '81000000-0000-4000-8000-000000000001'
  ),
  '興味ある？|default|t',
  'the default Criterion uses the fixed label, source, and NULL creator'
);

select lives_ok(
  $$insert into public.criteria (event_id, label, source, created_by)
    values ('81000000-0000-4000-8000-000000000001', 'S1-b criterion CRUD', 'custom', null)$$,
  'existing Criterion creation remains available'
);

select lives_ok(
  $$update public.criteria
    set label = 'S1-b criterion CRUD updated'
    where event_id = '81000000-0000-4000-8000-000000000001'
      and label = 'S1-b criterion CRUD'$$,
  'existing Criterion update remains available'
);

select lives_ok(
  $$delete from public.criteria
    where event_id = '81000000-0000-4000-8000-000000000001'
      and label = 'S1-b criterion CRUD updated'$$,
  'existing Criterion deletion remains available'
);

set local role anon;

select throws_ok(
  $$insert into public.events (title, memo, share_token)
    values ('anon insert', null, 'S1bAnonRejectedShareToken000000000000000001')$$,
  '42501',
  null,
  'anon cannot insert an Event'
);

select throws_ok(
  $$select private.create_default_criterion_for_event()$$,
  '42501',
  null,
  'anon cannot directly execute the private trigger function'
);

reset role;

select lives_ok(
  $$insert into public.events (title, memo, share_token)
    values (
      '[E2E] N5 dedicated creator success',
      null,
      'S1bCreatorSuccessShareToken0000000000000001'
    )$$,
  'the test executor can insert an Event for the atomicity fixture'
);

select is(
  (
    select count(*)
    from public.events
    where share_token = 'S1bCreatorSuccessShareToken0000000000000001'
  ),
  1::bigint,
  'the atomicity fixture insert creates one Event'
);

select is(
  (
    select count(*)
    from public.criteria
    where event_id = (
      select id
      from public.events
      where share_token = 'S1bCreatorSuccessShareToken0000000000000001'
    )
  ),
  1::bigint,
  'the atomicity fixture insert creates one default Criterion'
);

savepoint s1b_failure_injection;

create function public.s1b_reject_default_criterion_fixture()
returns trigger
language plpgsql
as $$
begin
  raise exception 'S1-b test default Criterion failure';
end;
$$;

create trigger s1b_reject_default_criterion_fixture
before insert on public.criteria
for each row
when (
  new.event_id = '81000000-0000-4000-8000-000000000002'::uuid
  and new.label = '興味ある？'
  and new.source = 'default'
  and new.created_by is null
)
execute function public.s1b_reject_default_criterion_fixture();

select throws_ok(
  $$insert into public.events (id, title, memo, share_token)
    values (
      '81000000-0000-4000-8000-000000000002',
      '[E2E] S1-b atomic failure',
      null,
      'S1bAtomicFailureShareToken00000000000000001'
    )$$,
  'P0001',
  'S1-b test default Criterion failure',
  'a targeted default Criterion failure aborts the Event INSERT'
);

select is(
  (select count(*) from public.events where id = '81000000-0000-4000-8000-000000000002'),
  0::bigint,
  'the failed creation leaves no Event'
);

select is(
  (select count(*) from public.criteria where event_id = '81000000-0000-4000-8000-000000000002'),
  0::bigint,
  'the failed creation leaves no Criterion'
);

select is(
  (select count(*) from public.participants where event_id = '81000000-0000-4000-8000-000000000002'),
  0::bigint,
  'the failed creation leaves no Participant'
);

rollback to savepoint s1b_failure_injection;

select ok(
  to_regprocedure('public.s1b_reject_default_criterion_fixture()') is null
    and not exists (
      select 1
      from pg_catalog.pg_trigger
      where tgrelid = 'public.criteria'::pg_catalog.regclass
        and tgname = 's1b_reject_default_criterion_fixture'
        and not tgisinternal
    ),
  'rolling back the test savepoint removes the failure-injection objects'
);

select * from finish();

rollback;
