alter table public.participants
  alter column display_name drop not null;

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text,
  url text,
  created_by uuid references public.participants(id) on delete set null,
  created_at timestamptz not null default now(),
  check (title is not null or url is not null)
);

create index candidates_event_id_idx on public.candidates (event_id);
create index candidates_created_by_idx on public.candidates (created_by);

create or replace function public.request_event_has_share_token(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and public.request_header('x-share-token') <> ''
      and e.share_token = public.request_header('x-share-token')
  );
$$;

create or replace function public.request_event_is_accessible(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.request_event_has_share_token(target_event_id)
    or public.request_owner_token_matches_event(target_event_id);
$$;

create or replace function public.request_guest_is_event_participant(
  target_event_id uuid,
  target_participant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participants p
    where p.id = target_participant_id
      and p.event_id = target_event_id
      and public.request_header('x-guest-token') <> ''
      and p.guest_token = public.request_header('x-guest-token')
  );
$$;

create or replace function public.request_guest_participant_id(target_event_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.participants p
  where p.event_id = target_event_id
    and public.request_header('x-guest-token') <> ''
    and p.guest_token = public.request_header('x-guest-token')
  limit 1;
$$;

create or replace function public.owner_guest_token_for_request(target_event_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.guest_token
  from public.events e
  join public.participants p on p.id = e.owner_participant_id
  where e.id = target_event_id
    and public.request_owner_token_matches_event(target_event_id)
  limit 1;
$$;

create or replace function public.candidate_created_by_matches_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.created_by is not null and not exists (
    select 1
    from public.participants p
    where p.id = new.created_by
      and p.event_id = new.event_id
  ) then
    raise exception 'candidate created_by must belong to the candidate event';
  end if;

  return new;
end;
$$;

create trigger candidates_created_by_event_guard
before insert or update of event_id, created_by on public.candidates
for each row
execute function public.candidate_created_by_matches_event();

alter table public.candidates enable row level security;

create policy participants_select_event_viewers
  on public.participants
  for select
  to anon
  using (public.request_event_is_accessible(event_id));

create policy participants_insert_guest_from_accessible_event
  on public.participants
  for insert
  to anon
  with check (
    public.request_event_is_accessible(event_id)
    and public.request_header('x-guest-token') <> ''
    and char_length(guest_token) >= 32
    and guest_token = public.request_header('x-guest-token')
  );

create policy candidates_select_event_viewers
  on public.candidates
  for select
  to anon
  using (public.request_event_is_accessible(event_id));

create policy candidates_insert_own_participant
  on public.candidates
  for insert
  to anon
  with check (
    created_by is not null
    and public.request_guest_is_event_participant(event_id, created_by)
  );

create policy candidates_update_by_share_token
  on public.candidates
  for update
  to anon
  using (public.request_event_has_share_token(event_id))
  with check (public.request_event_has_share_token(event_id));

create policy candidates_delete_by_share_token
  on public.candidates
  for delete
  to anon
  using (public.request_event_has_share_token(event_id));

grant select, insert, update, delete on table public.candidates to anon;
revoke select (guest_token) on table public.participants from anon;
grant execute on function public.request_event_has_share_token(uuid) to anon;
grant execute on function public.request_event_is_accessible(uuid) to anon;
grant execute on function public.request_guest_is_event_participant(uuid, uuid) to anon;
grant execute on function public.request_guest_participant_id(uuid) to anon;
grant execute on function public.owner_guest_token_for_request(uuid) to anon;
