begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

insert into public.events (id, title, memo, share_token, owner_token)
values (
  '10000000-0000-4000-8000-000000000001',
  '[E2E] Candidate URL DB contract',
  null,
  'candidate-url-safety-share-token-000000000001',
  'candidate-url-safety-owner-token-000000000001'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.candidates'::regclass
      and conname = 'candidates_url_safety_check'
      and contype = 'c'
      and convalidated
  ),
  'the named Candidate URL safety constraint exists and is validated'
);

select is(
  (
    select count(*)
    from public.candidates
    where url is not null
      and not (
        (url like 'http://%' or url like 'https://%')
        and substring(url from '^https?://([^/?#]+)') is not null
        and position('@' in substring(url from '^https?://([^/?#]+)')) = 0
        and url !~ '[[:cntrl:]]'
        and octet_length(url) <= 4096
      )
  ),
  0::bigint,
  'all stored Candidate URLs satisfy the structural database contract'
);

select lives_ok(
  $$insert into public.candidates (id, event_id, title, url)
    values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'title only', null)$$,
  'a title-only Candidate remains valid'
);

select lives_ok(
  $$insert into public.candidates (id, event_id, title, url)
    values ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', null, 'http://example.com/')$$,
  'a normalized HTTP URL is accepted'
);

select lives_ok(
  $$insert into public.candidates (id, event_id, title, url)
    values (
      '20000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000001',
      null,
      'https://example.com/' || repeat('a', 4096 - octet_length('https://example.com/'))
    )$$,
  'a normalized HTTPS URL of exactly 4096 bytes is accepted'
);

select throws_ok(
  $$update public.candidates set url = null
    where id = '20000000-0000-4000-8000-000000000003'$$,
  '23514',
  null,
  'a URL-only Candidate cannot be updated to an empty URL'
);

select lives_ok(
  $$insert into public.candidates (id, event_id, title, url)
    values (
      '20000000-0000-4000-8000-000000000004',
      '10000000-0000-4000-8000-000000000001',
      'IPv6 and at signs outside authority',
      'https://[2001:db8::1]:8443/path@segment?q=@value#@fragment'
    )$$,
  'IPv6, ports, query, fragment, and at signs outside authority remain valid'
);

select lives_ok(
  $$insert into public.candidates (id, event_id, title, url)
    values ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'IDN', 'https://xn--r8jz45g.xn--zckzah/')$$,
  'a normalized IDN URL is accepted'
);

select throws_ok(
  $$insert into public.candidates (event_id, title, url)
    values ('10000000-0000-4000-8000-000000000001', 'bad scheme', 'ftp://example.com/file')$$,
  '23514',
  null,
  'a non-HTTP scheme is rejected'
);

select throws_ok(
  $$insert into public.candidates (event_id, title, url)
    values ('10000000-0000-4000-8000-000000000001', 'uppercase direct DB URL', 'HTTPS://example.com/')$$,
  '23514',
  null,
  'a non-normalized uppercase scheme is rejected at the database boundary'
);

select throws_ok(
  $$insert into public.candidates (event_id, title, url)
    values ('10000000-0000-4000-8000-000000000001', 'empty authority', 'https:///path')$$,
  '23514',
  null,
  'an empty authority is rejected'
);

select throws_ok(
  $$insert into public.candidates (event_id, title, url)
    values ('10000000-0000-4000-8000-000000000001', 'credentials', 'https://user:password@example.com/')$$,
  '23514',
  null,
  'credentials in authority are rejected'
);

select throws_ok(
  $$insert into public.candidates (event_id, title, url)
    values ('10000000-0000-4000-8000-000000000001', 'control', 'https://example.com/path' || chr(10) || 'next')$$,
  '23514',
  null,
  'control characters are rejected'
);

select throws_ok(
  $$insert into public.candidates (event_id, title, url)
    values (
      '10000000-0000-4000-8000-000000000001',
      'too long',
      'https://example.com/' || repeat('a', 4097 - octet_length('https://example.com/'))
    )$$,
  '23514',
  null,
  'a 4097-byte URL is rejected'
);

insert into public.candidates (id, event_id, title, url)
values (
  '20000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000001',
  'update target',
  'https://example.com/original'
);

select throws_ok(
  $$update public.candidates set url = 'javascript:alert(1)'
    where id = '20000000-0000-4000-8000-000000000006'$$,
  '23514',
  null,
  'an invalid scheme is rejected on update'
);

select throws_ok(
  $$update public.candidates set url = 'https://user@example.com/'
    where id = '20000000-0000-4000-8000-000000000006'$$,
  '23514',
  null,
  'credentials are rejected on update'
);

select throws_ok(
  $$update public.candidates set url = 'https://example.com/path' || chr(9) || 'next'
    where id = '20000000-0000-4000-8000-000000000006'$$,
  '23514',
  null,
  'control characters are rejected on update'
);

select throws_ok(
  $$update public.candidates
    set url = 'https://example.com/' || repeat('a', 4097 - octet_length('https://example.com/'))
    where id = '20000000-0000-4000-8000-000000000006'$$,
  '23514',
  null,
  'a 4097-byte URL is rejected on update'
);

select is(
  (select url from public.candidates where id = '20000000-0000-4000-8000-000000000006'),
  'https://example.com/original',
  'failed updates preserve the prior URL'
);

select lives_ok(
  $$update public.candidates
    set url = 'https://example.com/path@segment?q=@value#@fragment'
    where id = '20000000-0000-4000-8000-000000000006'$$,
  'at signs in path, query, and fragment remain valid on update'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.candidates'::regclass),
  'Candidate RLS remains enabled'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.prepare_candidate_row()'::regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  )
    and not has_function_privilege('anon', 'public.prepare_candidate_row()', 'EXECUTE'),
  'the Candidate preparation trigger function does not gain execute privileges'
);

select ok(
  has_column_privilege('anon', 'public.candidates', 'url', 'INSERT')
    and has_column_privilege('anon', 'public.candidates', 'url', 'UPDATE'),
  'existing anon Candidate URL column grants remain available'
);

select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'candidates'),
  4::bigint,
  'the existing Candidate policy set is unchanged'
);

select * from finish();

rollback;
