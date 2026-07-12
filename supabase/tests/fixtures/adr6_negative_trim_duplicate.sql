insert into public.events (id, title, share_token, owner_token)
values (
  md5('negative-duplicate-event')::uuid,
  '[FIXTURE] Trim duplicate',
  'share-negative-duplicate-00000000000000000',
  'owner-negative-duplicate-00000000000000000'
);

insert into public.participants (id, event_id, display_name, guest_token)
values
  (
    md5('negative-duplicate-participant-1')::uuid,
    md5('negative-duplicate-event')::uuid,
    'Same Name',
    'guest-negative-duplicate-1000000000000000'
  ),
  (
    md5('negative-duplicate-participant-2')::uuid,
    md5('negative-duplicate-event')::uuid,
    ' Same Name ',
    'guest-negative-duplicate-2000000000000000'
  );
