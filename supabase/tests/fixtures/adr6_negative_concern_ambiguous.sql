insert into public.events (id, title, share_token, owner_token)
values (
  md5('negative-concern-event')::uuid,
  '[FIXTURE] Ambiguous concern',
  'share-negative-concern-000000000000000000',
  'owner-negative-concern-000000000000000000'
);

insert into public.participants (id, event_id, display_name, guest_token)
values (
  md5('negative-concern-participant')::uuid,
  md5('negative-concern-event')::uuid,
  'Concern Person',
  'guest-negative-concern-000000000000000000'
);

insert into public.candidates (id, event_id, title, created_by)
values (
  md5('negative-concern-candidate')::uuid,
  md5('negative-concern-event')::uuid,
  'Concern Candidate',
  md5('negative-concern-participant')::uuid
);

insert into public.concerns (id, candidate_id, participant_id)
values (
  md5('negative-concern-row')::uuid,
  md5('negative-concern-candidate')::uuid,
  md5('negative-concern-participant')::uuid
);
