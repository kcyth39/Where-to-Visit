create extension if not exists pgcrypto;

do $$
begin
  create type public.event_attribute as enum (
    '食事',
    '宿泊',
    'アクティビティ',
    'そのた'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  memo text,
  attribute public.event_attribute not null,
  owner_participant_id uuid,
  share_token text not null unique,
  owner_token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  guest_token text not null,
  created_at timestamptz not null default now(),
  unique (event_id, guest_token)
);

do $$
begin
  alter table public.events
    add constraint events_owner_participant_id_fkey
    foreign key (owner_participant_id)
    references public.participants(id)
    on delete restrict;
exception
  when duplicate_object then null;
end $$;

create index if not exists events_share_token_idx
  on public.events (share_token);

create index if not exists events_owner_token_idx
  on public.events (owner_token);

create index if not exists participants_event_id_idx
  on public.participants (event_id);

create or replace function public.request_header(header_name text)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> lower(header_name),
    nullif(current_setting('request.headers', true), '')::jsonb ->> header_name,
    ''
  );
$$;

create or replace function public.request_owner_token_matches_event(target_event_id uuid)
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
      and public.request_header('x-owner-token') <> ''
      and e.owner_token = public.request_header('x-owner-token')
  );
$$;

create or replace function public.request_guest_owns_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.participants p
      on p.id = e.owner_participant_id
    where e.id = target_event_id
      and public.request_header('x-guest-token') <> ''
      and p.guest_token = public.request_header('x-guest-token')
  );
$$;

create or replace function public.request_event_accepts_owner_participant(target_event_id uuid)
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
      and e.owner_participant_id is null
      and public.request_header('x-owner-token') <> ''
      and e.owner_token = public.request_header('x-owner-token')
  );
$$;

create or replace function public.event_owner_participant_is_consistent(
  target_event_id uuid,
  target_owner_participant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_owner_participant_id is null
    or exists (
      select 1
      from public.participants p
      where p.id = target_owner_participant_id
        and p.event_id = target_event_id
    );
$$;

alter table public.events enable row level security;
alter table public.participants enable row level security;

drop policy if exists events_select_by_share_owner_or_owner_guest on public.events;
drop policy if exists events_insert_with_request_tokens on public.events;
drop policy if exists events_update_by_owner_token_or_owner_guest on public.events;
drop policy if exists participants_select_own_or_owner_token on public.participants;
drop policy if exists participants_insert_owner_during_event_creation on public.participants;
drop policy if exists participants_update_own_record on public.participants;

create policy events_select_by_share_owner_or_owner_guest
  on public.events
  for select
  to anon
  using (
    share_token = public.request_header('x-share-token')
    or owner_token = public.request_header('x-owner-token')
    or public.request_guest_owns_event(id)
  );

create policy events_insert_with_request_tokens
  on public.events
  for insert
  to anon
  with check (
    owner_participant_id is null
    and public.request_header('x-share-token') <> ''
    and public.request_header('x-owner-token') <> ''
    and char_length(share_token) >= 32
    and char_length(owner_token) >= 32
    and share_token = public.request_header('x-share-token')
    and owner_token = public.request_header('x-owner-token')
    and share_token <> owner_token
  );

create policy events_update_by_owner_token_or_owner_guest
  on public.events
  for update
  to anon
  using (
    public.request_owner_token_matches_event(id)
    or public.request_guest_owns_event(id)
  )
  with check (
    (
      public.request_owner_token_matches_event(id)
      or public.request_guest_owns_event(id)
    )
    and public.event_owner_participant_is_consistent(id, owner_participant_id)
  );

create policy participants_select_own_or_owner_token
  on public.participants
  for select
  to anon
  using (
    (
      public.request_header('x-guest-token') <> ''
      and guest_token = public.request_header('x-guest-token')
    )
    or public.request_owner_token_matches_event(event_id)
  );

create policy participants_insert_owner_during_event_creation
  on public.participants
  for insert
  to anon
  with check (
    public.request_header('x-guest-token') <> ''
    and char_length(guest_token) >= 32
    and guest_token = public.request_header('x-guest-token')
    and public.request_event_accepts_owner_participant(event_id)
  );

create policy participants_update_own_record
  on public.participants
  for update
  to anon
  using (
    public.request_header('x-guest-token') <> ''
    and guest_token = public.request_header('x-guest-token')
  )
  with check (
    public.request_header('x-guest-token') <> ''
    and guest_token = public.request_header('x-guest-token')
  );

grant usage on schema public to anon;
grant usage on type public.event_attribute to anon;

revoke all on table public.events from anon;
revoke all on table public.participants from anon;

grant select (
  id,
  title,
  memo,
  attribute,
  owner_participant_id,
  share_token,
  created_at
) on table public.events to anon;

grant insert (
  title,
  memo,
  attribute,
  share_token,
  owner_token
) on table public.events to anon;

grant update (
  title,
  memo,
  owner_participant_id
) on table public.events to anon;

grant select (
  id,
  event_id,
  display_name,
  guest_token,
  created_at
) on table public.participants to anon;

grant insert (
  event_id,
  display_name,
  guest_token
) on table public.participants to anon;

grant update (
  display_name
) on table public.participants to anon;

revoke all on function public.request_header(text) from public;
revoke all on function public.request_owner_token_matches_event(uuid) from public;
revoke all on function public.request_guest_owns_event(uuid) from public;
revoke all on function public.request_event_accepts_owner_participant(uuid) from public;
revoke all on function public.event_owner_participant_is_consistent(uuid, uuid) from public;

grant execute on function public.request_header(text) to anon;
grant execute on function public.request_owner_token_matches_event(uuid) to anon;
grant execute on function public.request_guest_owns_event(uuid) to anon;
grant execute on function public.request_event_accepts_owner_participant(uuid) to anon;
grant execute on function public.event_owner_participant_is_consistent(uuid, uuid) to anon;
