insert into public.events (id, title, share_token, owner_token)
values (
  md5('negative-comment-event')::uuid,
  '[FIXTURE] Duplicate comment',
  'share-negative-comment-000000000000000000',
  'owner-negative-comment-000000000000000000'
);

insert into public.participants (id, event_id, display_name, guest_token)
values (
  md5('negative-comment-participant')::uuid,
  md5('negative-comment-event')::uuid,
  'Comment Person',
  'guest-negative-comment-000000000000000000'
);

insert into public.candidates (id, event_id, title, created_by)
values (
  md5('negative-comment-candidate')::uuid,
  md5('negative-comment-event')::uuid,
  'Comment Candidate',
  md5('negative-comment-participant')::uuid
);

insert into public.comments (id, candidate_id, participant_id, text)
values
  (
    md5('negative-comment-row-1')::uuid,
    md5('negative-comment-candidate')::uuid,
    md5('negative-comment-participant')::uuid,
    'First'
  ),
  (
    md5('negative-comment-row-2')::uuid,
    md5('negative-comment-candidate')::uuid,
    md5('negative-comment-participant')::uuid,
    'Second'
  );
