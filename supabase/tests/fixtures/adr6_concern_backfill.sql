insert into public.events (id, title, share_token, owner_token)
values (
  md5('concern-backfill-event')::uuid,
  '[FIXTURE] Concern backfill',
  'share-concern-backfill-000000000000000000',
  'owner-concern-backfill-000000000000000000'
);

insert into public.participants (id, event_id, display_name, guest_token)
values (
  md5('concern-backfill-participant')::uuid,
  md5('concern-backfill-event')::uuid,
  'Concern Backfill Person',
  'guest-concern-backfill-000000000000000000'
);

insert into public.candidates (id, event_id, title, created_by)
values (
  md5('concern-backfill-candidate')::uuid,
  md5('concern-backfill-event')::uuid,
  'Concern Backfill Candidate',
  md5('concern-backfill-participant')::uuid
);

insert into public.criteria (id, event_id, label, source, created_by)
values (
  md5('concern-backfill-criterion')::uuid,
  md5('concern-backfill-event')::uuid,
  '興味ある？',
  'default',
  null
);

insert into public.concerns (id, candidate_id, participant_id)
values (
  md5('concern-backfill-row')::uuid,
  md5('concern-backfill-candidate')::uuid,
  md5('concern-backfill-participant')::uuid
);
