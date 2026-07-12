select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events'
      and column_name = 'owner_participant_id'
  ) as owner_participant_id_still_exists,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'participants'
      and column_name = 'guest_token'
  ) as guest_token_still_exists,
  to_regclass('public.votes') is null as votes_table_still_absent;
