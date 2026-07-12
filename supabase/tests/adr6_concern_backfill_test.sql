begin;

create extension if not exists pgtap with schema extensions;

select plan(3);

select is((select count(*) from public.concerns), 1::bigint, 'existing concern is preserved');

select is(
  (select criterion_id from public.concerns where id = md5('concern-backfill-row')::uuid),
  md5('concern-backfill-criterion')::uuid,
  'existing concern receives the deterministic default criterion'
);

select ok(
  (select criterion_id is not null
   from public.concerns
   where id = md5('concern-backfill-row')::uuid),
  'backfilled concern satisfies the new not-null contract'
);

select * from finish();

rollback;
