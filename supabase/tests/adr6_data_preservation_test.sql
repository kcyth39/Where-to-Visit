begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select is((select count(*) from public.events), 12::bigint, 'all fixture events are preserved');
select is((select count(*) from public.participants), 12::bigint, 'all fixture participants are preserved');
select is((select count(*) from public.criteria), 12::bigint, 'all fixture criteria are preserved');

select is(
  (select count(*)
   from generate_series(1, 12) item
   join public.events e on e.id = md5('adr6-event-' || item)::uuid),
  12::bigint,
  'event IDs are preserved'
);

select is(
  (select count(*)
   from generate_series(1, 12) item
   join public.participants p on p.id = md5('adr6-participant-' || item)::uuid),
  12::bigint,
  'participant IDs are preserved'
);

select is(
  (select count(*)
   from generate_series(1, 12) item
   join public.criteria cr on cr.id = md5('adr6-criterion-' || item)::uuid),
  12::bigint,
  'criterion IDs are preserved'
);

select is(
  (select display_name from public.participants where id = md5('adr6-participant-1')::uuid),
  '[FIXTURE] Person 1',
  'participant names are deterministically trimmed'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and ((table_name = 'events' and column_name = 'owner_participant_id')
        or (table_name = 'participants' and column_name = 'guest_token'))
  ),
  'legacy identity columns are removed after preserving rows'
);

select * from finish();

rollback;
