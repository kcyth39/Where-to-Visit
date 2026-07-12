insert into public.events (id, title, share_token, owner_token)
values
  (
    md5('negative-cross-event-1')::uuid,
    '[FIXTURE] Cross event 1',
    'share-negative-cross-event-1000000000000000',
    'owner-negative-cross-event-1000000000000000'
  ),
  (
    md5('negative-cross-event-2')::uuid,
    '[FIXTURE] Cross event 2',
    'share-negative-cross-event-2000000000000000',
    'owner-negative-cross-event-2000000000000000'
  );

insert into public.participants (id, event_id, display_name, guest_token)
values (
  md5('negative-cross-participant')::uuid,
  md5('negative-cross-event-1')::uuid,
  'Cross Person',
  'guest-negative-cross-event-1000000000000000'
);

alter table public.candidates disable trigger candidates_created_by_event_guard;

insert into public.candidates (id, event_id, title, created_by)
values (
  md5('negative-cross-candidate')::uuid,
  md5('negative-cross-event-2')::uuid,
  'Cross Candidate',
  md5('negative-cross-participant')::uuid
);

alter table public.candidates enable trigger candidates_created_by_event_guard;
