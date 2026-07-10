create table public.criteria (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null,
  source text not null check (source in ('default', 'preset', 'custom')),
  created_by uuid references public.participants(id) on delete set null,
  created_at timestamptz not null default now(),
  check (char_length(label) between 1 and 60)
);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  criterion_id uuid not null references public.criteria(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (candidate_id, participant_id, criterion_id)
);

create table public.concerns (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (candidate_id, participant_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  text text not null,
  created_at timestamptz not null default now(),
  check (char_length(text) between 1 and 500)
);

create index criteria_event_id_idx on public.criteria (event_id);
create index criteria_created_by_idx on public.criteria (created_by);
create index reactions_candidate_id_idx on public.reactions (candidate_id);
create index reactions_participant_id_idx on public.reactions (participant_id);
create index reactions_criterion_id_idx on public.reactions (criterion_id);
create index concerns_candidate_id_idx on public.concerns (candidate_id);
create index concerns_participant_id_idx on public.concerns (participant_id);
create index comments_candidate_id_idx on public.comments (candidate_id);
create index comments_participant_id_idx on public.comments (participant_id);

create or replace function public.request_candidate_is_accessible(target_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.candidates c
    where c.id = target_candidate_id
      and public.request_event_is_accessible(c.event_id)
  );
$$;

create or replace function public.request_candidate_has_share_token(target_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.candidates c
    where c.id = target_candidate_id
      and public.request_event_has_share_token(c.event_id)
  );
$$;

create or replace function public.request_guest_is_candidate_participant(
  target_candidate_id uuid,
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
    from public.candidates c
    join public.participants p on p.event_id = c.event_id
    where c.id = target_candidate_id
      and p.id = target_participant_id
      and public.request_guest_is_event_participant(c.event_id, p.id)
  );
$$;

create or replace function public.criterion_matches_candidate(
  target_candidate_id uuid,
  target_criterion_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.candidates c
    join public.criteria cr on cr.event_id = c.event_id
    where c.id = target_candidate_id
      and cr.id = target_criterion_id
  );
$$;

create or replace function public.prepare_criterion_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.label := btrim(new.label);

  if tg_op = 'INSERT' then
    if new.created_by is not null then
      raise exception 'criterion created_by is assigned by the database';
    end if;

    if new.source = 'default' then
      new.created_by := null;
    else
      new.created_by := public.request_guest_participant_id(new.event_id);
    end if;
  else
    if new.id is distinct from old.id
      or new.event_id is distinct from old.event_id
      or new.source is distinct from old.source
      or new.created_at is distinct from old.created_at then
      raise exception 'only criterion label can be updated';
    end if;

    if new.created_by is distinct from old.created_by
      and not (pg_trigger_depth() > 1 and new.created_by is null) then
      raise exception 'criterion created_by cannot be updated';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prepare_comment_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.text := btrim(new.text);

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.candidate_id is distinct from old.candidate_id
      or new.created_at is distinct from old.created_at then
      raise exception 'only comment text can be updated';
    end if;

    if new.participant_id is distinct from old.participant_id
      and not (pg_trigger_depth() > 1 and new.participant_id is null) then
      raise exception 'comment participant cannot be updated';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.feedback_references_match_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_event_id uuid;
begin
  select c.event_id into candidate_event_id
  from public.candidates c
  where c.id = new.candidate_id;

  if candidate_event_id is null then
    raise exception 'candidate not found';
  end if;

  if new.participant_id is not null and not exists (
    select 1
    from public.participants p
    where p.id = new.participant_id
      and p.event_id = candidate_event_id
  ) then
    raise exception 'participant must belong to the candidate event';
  end if;

  if tg_table_name = 'reactions' and not exists (
    select 1
    from public.criteria cr
    where cr.id = new.criterion_id
      and cr.event_id = candidate_event_id
  ) then
    raise exception 'criterion must belong to the candidate event';
  end if;

  return new;
end;
$$;

create or replace function public.reject_feedback_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception '% rows cannot be updated', tg_table_name;
end;
$$;

create trigger criteria_prepare_row
before insert or update on public.criteria
for each row
execute function public.prepare_criterion_row();

create trigger comments_prepare_row
before insert or update on public.comments
for each row
execute function public.prepare_comment_row();

create trigger reactions_event_guard
before insert or update on public.reactions
for each row
execute function public.feedback_references_match_event();

create trigger concerns_event_guard
before insert or update on public.concerns
for each row
execute function public.feedback_references_match_event();

create trigger comments_event_guard
before insert or update of candidate_id, participant_id on public.comments
for each row
execute function public.feedback_references_match_event();

create trigger reactions_reject_update
before update on public.reactions
for each row
execute function public.reject_feedback_update();

create trigger concerns_reject_update
before update on public.concerns
for each row
execute function public.reject_feedback_update();

alter table public.criteria enable row level security;
alter table public.reactions enable row level security;
alter table public.concerns enable row level security;
alter table public.comments enable row level security;

create policy criteria_select_event_viewers
  on public.criteria
  for select
  to anon
  using (public.request_event_is_accessible(event_id));

create policy criteria_insert_by_share_token
  on public.criteria
  for insert
  to anon
  with check (public.request_event_has_share_token(event_id));

create policy criteria_update_by_share_token
  on public.criteria
  for update
  to anon
  using (public.request_event_has_share_token(event_id))
  with check (public.request_event_has_share_token(event_id));

create policy criteria_delete_by_share_token
  on public.criteria
  for delete
  to anon
  using (public.request_event_has_share_token(event_id));

create policy reactions_select_event_viewers
  on public.reactions
  for select
  to anon
  using (public.request_candidate_is_accessible(candidate_id));

create policy reactions_insert_current_participant
  on public.reactions
  for insert
  to anon
  with check (
    public.request_candidate_has_share_token(candidate_id)
    and public.request_guest_is_candidate_participant(candidate_id, participant_id)
    and public.criterion_matches_candidate(candidate_id, criterion_id)
  );

create policy reactions_delete_by_share_token
  on public.reactions
  for delete
  to anon
  using (public.request_candidate_has_share_token(candidate_id));

create policy concerns_select_event_viewers
  on public.concerns
  for select
  to anon
  using (public.request_candidate_is_accessible(candidate_id));

create policy concerns_insert_current_participant
  on public.concerns
  for insert
  to anon
  with check (
    public.request_candidate_has_share_token(candidate_id)
    and public.request_guest_is_candidate_participant(candidate_id, participant_id)
  );

create policy concerns_delete_by_share_token
  on public.concerns
  for delete
  to anon
  using (public.request_candidate_has_share_token(candidate_id));

create policy comments_select_event_viewers
  on public.comments
  for select
  to anon
  using (public.request_candidate_is_accessible(candidate_id));

create policy comments_insert_current_participant
  on public.comments
  for insert
  to anon
  with check (
    participant_id is not null
    and public.request_candidate_has_share_token(candidate_id)
    and public.request_guest_is_candidate_participant(candidate_id, participant_id)
  );

create policy comments_update_by_share_token
  on public.comments
  for update
  to anon
  using (public.request_candidate_has_share_token(candidate_id))
  with check (public.request_candidate_has_share_token(candidate_id));

create policy comments_delete_by_share_token
  on public.comments
  for delete
  to anon
  using (public.request_candidate_has_share_token(candidate_id));

revoke all on table public.criteria from anon;
revoke all on table public.reactions from anon;
revoke all on table public.concerns from anon;
revoke all on table public.comments from anon;

grant select on table public.criteria to anon;
grant insert (event_id, label, source) on table public.criteria to anon;
grant update (label) on table public.criteria to anon;
grant delete on table public.criteria to anon;

grant select on table public.reactions to anon;
grant insert (candidate_id, participant_id, criterion_id) on table public.reactions to anon;
grant delete on table public.reactions to anon;

grant select on table public.concerns to anon;
grant insert (candidate_id, participant_id) on table public.concerns to anon;
grant delete on table public.concerns to anon;

grant select on table public.comments to anon;
grant insert (candidate_id, participant_id, text) on table public.comments to anon;
grant update (text) on table public.comments to anon;
grant delete on table public.comments to anon;

revoke all on function public.request_candidate_is_accessible(uuid) from public;
revoke all on function public.request_candidate_has_share_token(uuid) from public;
revoke all on function public.request_guest_is_candidate_participant(uuid, uuid) from public;
revoke all on function public.criterion_matches_candidate(uuid, uuid) from public;
revoke all on function public.prepare_criterion_row() from public;
revoke all on function public.prepare_comment_row() from public;
revoke all on function public.feedback_references_match_event() from public;
revoke all on function public.reject_feedback_update() from public;

grant execute on function public.request_candidate_is_accessible(uuid) to anon;
grant execute on function public.request_candidate_has_share_token(uuid) to anon;
grant execute on function public.request_guest_is_candidate_participant(uuid, uuid) to anon;
grant execute on function public.criterion_matches_candidate(uuid, uuid) to anon;

insert into public.criteria (event_id, label, source, created_by)
select e.id, '興味ある？', 'default', null
from public.events e
where not exists (
  select 1
  from public.criteria cr
  where cr.event_id = e.id
);
