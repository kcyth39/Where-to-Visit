begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select ok(to_regclass('public.votes') is not null, 'votes table exists');

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'owner_participant_id'
  ),
  'events.owner_participant_id is removed'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'participants' and column_name = 'guest_token'
  ),
  'participants.guest_token is removed'
);

select ok(
  (select is_nullable = 'NO' from information_schema.columns
   where table_schema = 'public' and table_name = 'participants' and column_name = 'display_name'),
  'participant display_name is required'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.participants'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (event_id, display_name)'
  ),
  'participant names are unique inside an event'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.votes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%positive%neutral%veto%'
  ),
  'vote values use the approved three-value check'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.votes'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (candidate_id, participant_id)'
  ),
  'votes are unique per candidate and participant'
);

select ok(
  (select is_nullable = 'NO' from information_schema.columns
   where table_schema = 'public' and table_name = 'concerns' and column_name = 'criterion_id'),
  'concern criterion is required'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.concerns'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (candidate_id, participant_id, criterion_id)'
  ),
  'concerns are unique per candidate participant and criterion'
);

select ok(
  (select is_nullable = 'NO' from information_schema.columns
   where table_schema = 'public' and table_name = 'comments' and column_name = 'participant_id'),
  'comment participant is required'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.comments'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (candidate_id, participant_id)'
  ),
  'comments keep one current value per candidate and participant'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.comments'::regclass
      and conname = 'comments_participant_id_fkey'
      and confdeltype = 'c'
  ),
  'participant deletion cascades comments'
);

select ok(
  (select count(*) = 8 from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in ('events','participants','candidates','criteria','votes','reactions','concerns','comments')
     and c.relrowsecurity),
  'all eight exposed application tables have RLS enabled'
);

select ok(
  (select count(*) = 29 from pg_policies
   where schemaname = 'public'
     and tablename in ('events','participants','candidates','criteria','votes','reactions','concerns','comments')),
  'the approved operation-specific policy set is installed'
);

select ok(
  (select proconfig @> array['search_path=pg_catalog']
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'request_header'),
  'request_header has a fixed pg_catalog search_path'
);

select ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'request_guest_owns_event',
        'request_event_accepts_owner_participant',
        'request_guest_is_event_participant',
        'request_guest_participant_id',
        'owner_guest_token_for_request',
        'request_guest_is_candidate_participant'
      )
  ),
  'guest-token helper functions are removed'
);

select ok(
  has_schema_privilege('anon', 'private', 'USAGE')
    and has_function_privilege('anon', 'private.request_event_has_share_token(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.feedback_references_match_event()', 'EXECUTE'),
  'anon can use private request helpers but not trigger guards'
);

select ok(
  has_column_privilege('anon', 'public.votes', 'value', 'UPDATE')
    and not has_column_privilege('anon', 'public.votes', 'candidate_id', 'UPDATE')
    and has_column_privilege('anon', 'public.comments', 'text', 'UPDATE')
    and not has_column_privilege('anon', 'public.comments', 'participant_id', 'UPDATE'),
  'column grants expose only mutable vote and comment fields'
);

select * from finish();

rollback;
