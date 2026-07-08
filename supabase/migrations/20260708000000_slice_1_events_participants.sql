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

grant usage on schema public to anon;
grant select, insert, update on table public.events to anon;
grant select, insert on table public.participants to anon;
