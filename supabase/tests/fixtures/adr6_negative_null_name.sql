alter table public.participants alter column display_name drop not null;

insert into public.events (id, title, share_token, owner_token)
values (
  md5('negative-null-event')::uuid,
  '[FIXTURE] Null name',
  'share-negative-null-name-0000000000000000',
  'owner-negative-null-name-0000000000000000'
);

insert into public.participants (id, event_id, display_name, guest_token)
values (
  md5('negative-null-participant')::uuid,
  md5('negative-null-event')::uuid,
  null,
  'guest-negative-null-name-0000000000000000'
);
