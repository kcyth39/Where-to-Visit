begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

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
    where table_schema = 'public' and table_name = 'events' and column_name = 'owner_token'
  ),
  'events.owner_token is removed'
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
  to_regprocedure('private.request_owner_token_matches_event(uuid)') is null,
  'the owner-token helper is removed'
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

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.events'::pg_catalog.regclass
      and conname = 'events_share_token_shape_check'
      and contype = 'c'
      and convalidated
  ),
  'Event share tokens have the exact final shape constraint'
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
  'Event memo normalization has a validated database constraint'
);

select ok(
  exists (
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
      and rolpassword is null
  ),
  'the dedicated Event creator has the approved role attributes and no password'
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
    )
    and not has_table_privilege(
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
    ),
  'the dedicated Event creator has only the approved Event INSERT columns'
);

select ok(
  (
    select array_agg(policyname::text order by policyname)
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'events'
  ) = array[
    'events_insert_by_event_creator',
    'events_select_by_share_token',
    'events_update_memo_by_share_token'
  ],
  'Event policies are the exact ownerless select, insert, and memo-update set'
);

select ok(
  has_column_privilege('anon', 'public.events', 'memo', 'UPDATE')
    and not has_column_privilege('anon', 'public.events', 'title', 'UPDATE')
    and not has_column_privilege('anon', 'public.events', 'share_token', 'INSERT'),
  'anon can update only Event memo and cannot insert an Event'
);

select ok(
  not has_schema_privilege(
    'kimenosuke_event_creator',
    'private',
    'USAGE'
  )
    and not has_function_privilege(
      'kimenosuke_event_creator',
      'private.create_default_criterion_for_event()',
      'EXECUTE'
    ),
  'the dedicated Event creator cannot invoke private functions directly'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'prepare_event_row'
      and p.proowner = 'postgres'::pg_catalog.regrole
      and p.proconfig = array['search_path=pg_catalog']
  ),
  'the Event preparation trigger is owned by postgres with a fixed search_path'
);

select * from finish();

rollback;
