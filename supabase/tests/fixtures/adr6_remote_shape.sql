do $$
declare
  item integer;
  event_id uuid;
  participant_id uuid;
begin
  for item in 1..12 loop
    event_id := md5('adr6-event-' || item)::uuid;
    participant_id := md5('adr6-participant-' || item)::uuid;

    insert into public.events (
      id, title, memo, share_token, owner_token, created_at
    ) values (
      event_id,
      '[FIXTURE] Event ' || item,
      'preserve me',
      'share-' || lpad(item::text, 32, '0'),
      'owner-' || lpad(item::text, 32, '0'),
      '2026-07-12 00:00:00+00'::timestamptz + item * interval '1 minute'
    );

    insert into public.participants (
      id, event_id, display_name, guest_token, created_at
    ) values (
      participant_id,
      event_id,
      case when item = 1 then '  [FIXTURE] Person 1  ' else '[FIXTURE] Person ' || item end,
      'guest-' || lpad(item::text, 32, '0'),
      '2026-07-12 00:00:00+00'::timestamptz + item * interval '1 minute'
    );

    update public.events
    set owner_participant_id = participant_id
    where id = event_id;

    insert into public.criteria (
      id, event_id, label, source, created_by, created_at
    ) values (
      md5('adr6-criterion-' || item)::uuid,
      event_id,
      '興味ある？',
      'default',
      null,
      '2026-07-12 00:00:00+00'::timestamptz + item * interval '1 minute'
    );
  end loop;
end $$;
