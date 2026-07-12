begin;

-- Validate every data-dependent conversion before changing schema objects.
do $$
begin
  if exists (
    select 1
    from public.participants
    where display_name is null
      or btrim(display_name) = ''
      or char_length(btrim(display_name)) not between 1 and 60
  ) then
    raise exception 'participant display names must normalize to 1 through 60 characters';
  end if;

  if exists (
    select 1
    from public.participants
    group by event_id, btrim(display_name)
    having count(*) > 1
  ) then
    raise exception 'participant display names must be unique per event after trimming';
  end if;

  if exists (
    select 1
    from public.candidates c
    join public.participants p on p.id = c.created_by
    where p.event_id <> c.event_id
  ) then
    raise exception 'candidate created_by must belong to the candidate event';
  end if;

  if exists (
    select 1
    from public.criteria cr
    join public.participants p on p.id = cr.created_by
    where p.event_id <> cr.event_id
  ) then
    raise exception 'criterion created_by must belong to the criterion event';
  end if;

  if exists (
    select 1
    from public.reactions r
    join public.candidates c on c.id = r.candidate_id
    join public.participants p on p.id = r.participant_id
    join public.criteria cr on cr.id = r.criterion_id
    where p.event_id <> c.event_id
       or cr.event_id <> c.event_id
  ) then
    raise exception 'reaction references must belong to one event';
  end if;

  if exists (
    select 1
    from public.concerns co
    join public.candidates c on c.id = co.candidate_id
    join public.participants p on p.id = co.participant_id
    where p.event_id <> c.event_id
  ) then
    raise exception 'concern participant must belong to the candidate event';
  end if;

  if exists (
    select 1
    from public.concerns co
    join public.candidates c on c.id = co.candidate_id
    where (
      select count(*)
      from public.criteria cr
      where cr.event_id = c.event_id
        and cr.source = 'default'
        and cr.label = '興味ある？'
    ) <> 1
  ) then
    raise exception 'each concern event must have exactly one default interest criterion';
  end if;

  if exists (
    select 1
    from public.comments cm
    left join public.candidates c on c.id = cm.candidate_id
    left join public.participants p on p.id = cm.participant_id
    where cm.participant_id is null
       or c.id is null
       or p.id is null
       or p.event_id <> c.event_id
  ) then
    raise exception 'comments require a participant from the candidate event';
  end if;

  if exists (
    select 1
    from public.comments
    group by candidate_id, participant_id
    having count(*) > 1
  ) then
    raise exception 'comments must be unique per candidate and participant';
  end if;
end $$;

-- Normalize only values whose deterministic trimmed representation differs.
update public.participants
set display_name = btrim(display_name)
where display_name is distinct from btrim(display_name);

-- Remove policies that depend on the browser-owned guest participant model.
drop policy if exists events_select_by_share_owner_or_owner_guest on public.events;
drop policy if exists events_insert_with_request_tokens on public.events;
drop policy if exists events_update_by_owner_token_or_owner_guest on public.events;

drop policy if exists participants_select_own_or_owner_token on public.participants;
drop policy if exists participants_insert_owner_during_event_creation on public.participants;
drop policy if exists participants_update_own_record on public.participants;
drop policy if exists participants_select_event_viewers on public.participants;
drop policy if exists participants_insert_guest_from_accessible_event on public.participants;

drop policy if exists candidates_select_event_viewers on public.candidates;
drop policy if exists candidates_insert_own_participant on public.candidates;
drop policy if exists candidates_update_by_share_token on public.candidates;
drop policy if exists candidates_delete_by_share_token on public.candidates;

drop policy if exists criteria_select_event_viewers on public.criteria;
drop policy if exists criteria_insert_by_share_token on public.criteria;
drop policy if exists criteria_update_by_share_token on public.criteria;
drop policy if exists criteria_delete_by_share_token on public.criteria;

drop policy if exists reactions_select_event_viewers on public.reactions;
drop policy if exists reactions_insert_current_participant on public.reactions;
drop policy if exists reactions_delete_by_share_token on public.reactions;

drop policy if exists concerns_select_event_viewers on public.concerns;
drop policy if exists concerns_insert_current_participant on public.concerns;
drop policy if exists concerns_delete_by_share_token on public.concerns;

drop policy if exists comments_select_event_viewers on public.comments;
drop policy if exists comments_insert_current_participant on public.comments;
drop policy if exists comments_update_by_share_token on public.comments;
drop policy if exists comments_delete_by_share_token on public.comments;

-- Remove triggers and functions whose contracts change in this migration.
drop trigger if exists candidates_created_by_event_guard on public.candidates;
drop trigger if exists criteria_prepare_row on public.criteria;
drop trigger if exists comments_prepare_row on public.comments;
drop trigger if exists reactions_event_guard on public.reactions;
drop trigger if exists concerns_event_guard on public.concerns;
drop trigger if exists comments_event_guard on public.comments;
drop trigger if exists reactions_reject_update on public.reactions;
drop trigger if exists concerns_reject_update on public.concerns;

drop function if exists public.request_guest_owns_event(uuid);
drop function if exists public.request_event_accepts_owner_participant(uuid);
drop function if exists public.event_owner_participant_is_consistent(uuid, uuid);
drop function if exists public.request_guest_is_event_participant(uuid, uuid);
drop function if exists public.request_guest_participant_id(uuid);
drop function if exists public.owner_guest_token_for_request(uuid);
drop function if exists public.request_guest_is_candidate_participant(uuid, uuid);
drop function if exists public.criterion_matches_candidate(uuid, uuid);
drop function if exists public.candidate_created_by_matches_event();
drop function if exists public.prepare_criterion_row();
drop function if exists public.prepare_comment_row();
drop function if exists public.feedback_references_match_event();
drop function if exists public.reject_feedback_update();

-- Owner capability and respondent rows are independent.
alter table public.events
  drop constraint if exists events_owner_participant_id_fkey;

alter table public.events
  drop column owner_participant_id;

alter table public.participants
  drop constraint if exists participants_event_id_guest_token_key;

alter table public.participants
  drop column guest_token,
  alter column display_name set not null;

alter table public.participants
  add constraint participants_event_id_display_name_key
  unique (event_id, display_name);

create index participants_event_created_idx
  on public.participants (event_id, created_at, id);

create index candidates_event_created_idx
  on public.candidates (event_id, created_at, id);

create index criteria_event_created_idx
  on public.criteria (event_id, created_at, id);

-- Votes persist only active positive / neutral / veto values. No row means unrated.
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  value text not null check (value in ('positive', 'neutral', 'veto')),
  unique (candidate_id, participant_id)
);

create index votes_participant_id_idx
  on public.votes (participant_id);

-- Concerns become criterion-specific and comments become one current value per respondent.
alter table public.concerns
  drop constraint if exists concerns_candidate_id_participant_id_key,
  add column criterion_id uuid;

update public.concerns co
set criterion_id = cr.id
from public.candidates c
join public.criteria cr
  on cr.event_id = c.event_id
 and cr.source = 'default'
 and cr.label = '興味ある？'
where c.id = co.candidate_id;

alter table public.concerns
  alter column criterion_id set not null,
  add constraint concerns_criterion_id_fkey
    foreign key (criterion_id) references public.criteria(id) on delete cascade,
  add constraint concerns_candidate_participant_criterion_key
    unique (candidate_id, participant_id, criterion_id);

create index concerns_criterion_id_idx
  on public.concerns (criterion_id);

alter table public.comments
  drop constraint if exists comments_participant_id_fkey,
  alter column participant_id set not null,
  add constraint comments_participant_id_fkey
    foreign key (participant_id) references public.participants(id) on delete cascade,
  add constraint comments_candidate_id_participant_id_key
    unique (candidate_id, participant_id);

-- Shared token helpers remain the only request capabilities used by RLS.
create or replace function public.request_owner_token_matches_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and public.request_header('x-owner-token') <> ''
      and e.owner_token = public.request_header('x-owner-token')
  );
$$;

create or replace function public.request_event_has_share_token(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
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
set search_path = pg_catalog, public
as $$
  select public.request_event_has_share_token(target_event_id)
    or public.request_owner_token_matches_event(target_event_id);
$$;

create or replace function public.request_candidate_is_accessible(target_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
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
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.candidates c
    where c.id = target_candidate_id
      and public.request_event_has_share_token(c.event_id)
  );
$$;

-- Normalize input and prevent clients from changing immutable columns.
create function public.prepare_event_row()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.title := btrim(new.title);
  new.memo := nullif(btrim(new.memo), '');

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.share_token is distinct from old.share_token
    or new.owner_token is distinct from old.owner_token
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'only event title and memo can be updated';
  end if;

  return new;
end;
$$;

create function public.prepare_participant_row()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.display_name := btrim(new.display_name);

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.event_id is distinct from old.event_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'only participant display_name can be updated';
  end if;

  return new;
end;
$$;

create function public.prepare_candidate_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.title := nullif(btrim(new.title), '');
  new.url := nullif(btrim(new.url), '');

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.event_id is distinct from old.event_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'candidate identity and created_at cannot be updated';
  end if;

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

create function public.prepare_criterion_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.label := btrim(new.label);

  if tg_op = 'UPDATE' then
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

  if new.created_by is not null and not exists (
    select 1
    from public.participants p
    where p.id = new.created_by
      and p.event_id = new.event_id
  ) then
    raise exception 'criterion created_by must belong to the criterion event';
  end if;

  return new;
end;
$$;

create function public.prepare_vote_row()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.candidate_id is distinct from old.candidate_id
    or new.participant_id is distinct from old.participant_id
  ) then
    raise exception 'only vote value can be updated';
  end if;

  return new;
end;
$$;

create function public.prepare_comment_row()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.text := btrim(new.text);

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.candidate_id is distinct from old.candidate_id
    or new.participant_id is distinct from old.participant_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'only comment text can be updated';
  end if;

  return new;
end;
$$;

create function public.feedback_references_match_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  candidate_event_id uuid;
  feedback_criterion_id uuid;
begin
  if tg_table_name not in ('votes', 'reactions', 'concerns', 'comments') then
    raise exception 'unsupported feedback table: %', tg_table_name;
  end if;

  select c.event_id into candidate_event_id
  from public.candidates c
  where c.id = new.candidate_id;

  if candidate_event_id is null then
    raise exception 'candidate not found';
  end if;

  if not exists (
    select 1
    from public.participants p
    where p.id = new.participant_id
      and p.event_id = candidate_event_id
  ) then
    raise exception 'participant must belong to the candidate event';
  end if;

  if tg_table_name in ('reactions', 'concerns') then
    feedback_criterion_id := nullif(to_jsonb(new) ->> 'criterion_id', '')::uuid;

    if feedback_criterion_id is null or not exists (
      select 1
      from public.criteria cr
      where cr.id = feedback_criterion_id
        and cr.event_id = candidate_event_id
    ) then
      raise exception 'criterion must belong to the candidate event';
    end if;
  end if;

  return new;
end;
$$;

create function public.reject_feedback_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception '% rows cannot be updated', tg_table_name;
end;
$$;

create trigger events_prepare_row
before insert or update on public.events
for each row execute function public.prepare_event_row();

create trigger participants_prepare_row
before insert or update on public.participants
for each row execute function public.prepare_participant_row();

create trigger candidates_prepare_row
before insert or update on public.candidates
for each row execute function public.prepare_candidate_row();

create trigger criteria_prepare_row
before insert or update on public.criteria
for each row execute function public.prepare_criterion_row();

create trigger votes_prepare_row
before insert or update on public.votes
for each row execute function public.prepare_vote_row();

create trigger comments_prepare_row
before insert or update on public.comments
for each row execute function public.prepare_comment_row();

create trigger votes_event_guard
before insert or update on public.votes
for each row execute function public.feedback_references_match_event();

create trigger reactions_event_guard
before insert or update on public.reactions
for each row execute function public.feedback_references_match_event();

create trigger concerns_event_guard
before insert or update on public.concerns
for each row execute function public.feedback_references_match_event();

create trigger comments_event_guard
before insert or update on public.comments
for each row execute function public.feedback_references_match_event();

create trigger reactions_reject_update
before update on public.reactions
for each row execute function public.reject_feedback_update();

create trigger concerns_reject_update
before update on public.concerns
for each row execute function public.reject_feedback_update();

alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.candidates enable row level security;
alter table public.criteria enable row level security;
alter table public.votes enable row level security;
alter table public.reactions enable row level security;
alter table public.concerns enable row level security;
alter table public.comments enable row level security;

create policy events_select_by_share_or_owner
  on public.events for select to anon
  using (
    share_token = public.request_header('x-share-token')
    or owner_token = public.request_header('x-owner-token')
  );

create policy events_insert_with_request_tokens
  on public.events for insert to anon
  with check (
    public.request_header('x-share-token') <> ''
    and public.request_header('x-owner-token') <> ''
    and char_length(share_token) >= 32
    and char_length(owner_token) >= 32
    and share_token = public.request_header('x-share-token')
    and owner_token = public.request_header('x-owner-token')
    and share_token <> owner_token
  );

create policy events_update_by_owner_token
  on public.events for update to anon
  using (public.request_owner_token_matches_event(id))
  with check (public.request_owner_token_matches_event(id));

create policy participants_select_event_viewers
  on public.participants for select to anon
  using (public.request_event_is_accessible(event_id));

create policy participants_insert_by_share_token
  on public.participants for insert to anon
  with check (public.request_event_has_share_token(event_id));

create policy participants_update_by_share_token
  on public.participants for update to anon
  using (public.request_event_has_share_token(event_id))
  with check (public.request_event_has_share_token(event_id));

create policy participants_delete_by_share_token
  on public.participants for delete to anon
  using (public.request_event_has_share_token(event_id));

create policy candidates_select_event_viewers
  on public.candidates for select to anon
  using (public.request_event_is_accessible(event_id));

create policy candidates_insert_by_share_token
  on public.candidates for insert to anon
  with check (public.request_event_has_share_token(event_id));

create policy candidates_update_by_share_token
  on public.candidates for update to anon
  using (public.request_event_has_share_token(event_id))
  with check (public.request_event_has_share_token(event_id));

create policy candidates_delete_by_share_token
  on public.candidates for delete to anon
  using (public.request_event_has_share_token(event_id));

create policy criteria_select_event_viewers
  on public.criteria for select to anon
  using (public.request_event_is_accessible(event_id));

create policy criteria_insert_by_share_token
  on public.criteria for insert to anon
  with check (public.request_event_has_share_token(event_id));

create policy criteria_update_by_share_token
  on public.criteria for update to anon
  using (public.request_event_has_share_token(event_id))
  with check (public.request_event_has_share_token(event_id));

create policy criteria_delete_by_share_token
  on public.criteria for delete to anon
  using (public.request_event_has_share_token(event_id));

create policy votes_select_event_viewers
  on public.votes for select to anon
  using (public.request_candidate_is_accessible(candidate_id));

create policy votes_insert_by_share_token
  on public.votes for insert to anon
  with check (public.request_candidate_has_share_token(candidate_id));

create policy votes_update_by_share_token
  on public.votes for update to anon
  using (public.request_candidate_has_share_token(candidate_id))
  with check (public.request_candidate_has_share_token(candidate_id));

create policy votes_delete_by_share_token
  on public.votes for delete to anon
  using (public.request_candidate_has_share_token(candidate_id));

create policy reactions_select_event_viewers
  on public.reactions for select to anon
  using (public.request_candidate_is_accessible(candidate_id));

create policy reactions_insert_by_share_token
  on public.reactions for insert to anon
  with check (public.request_candidate_has_share_token(candidate_id));

create policy reactions_delete_by_share_token
  on public.reactions for delete to anon
  using (public.request_candidate_has_share_token(candidate_id));

create policy concerns_select_event_viewers
  on public.concerns for select to anon
  using (public.request_candidate_is_accessible(candidate_id));

create policy concerns_insert_by_share_token
  on public.concerns for insert to anon
  with check (public.request_candidate_has_share_token(candidate_id));

create policy concerns_delete_by_share_token
  on public.concerns for delete to anon
  using (public.request_candidate_has_share_token(candidate_id));

create policy comments_select_event_viewers
  on public.comments for select to anon
  using (public.request_candidate_is_accessible(candidate_id));

create policy comments_insert_by_share_token
  on public.comments for insert to anon
  with check (public.request_candidate_has_share_token(candidate_id));

create policy comments_update_by_share_token
  on public.comments for update to anon
  using (public.request_candidate_has_share_token(candidate_id))
  with check (public.request_candidate_has_share_token(candidate_id));

create policy comments_delete_by_share_token
  on public.comments for delete to anon
  using (public.request_candidate_has_share_token(candidate_id));

revoke all on table public.events from anon;
revoke all on table public.participants from anon;
revoke all on table public.candidates from anon;
revoke all on table public.criteria from anon;
revoke all on table public.votes from anon;
revoke all on table public.reactions from anon;
revoke all on table public.concerns from anon;
revoke all on table public.comments from anon;

grant select (id, title, memo, share_token, created_at)
  on table public.events to anon;
grant insert (title, memo, share_token, owner_token)
  on table public.events to anon;
grant update (title, memo)
  on table public.events to anon;

grant select on table public.participants to anon;
grant insert (event_id, display_name) on table public.participants to anon;
grant update (display_name) on table public.participants to anon;
grant delete on table public.participants to anon;

grant select on table public.candidates to anon;
grant insert (event_id, title, url, created_by) on table public.candidates to anon;
grant update (title, url, created_by) on table public.candidates to anon;
grant delete on table public.candidates to anon;

grant select on table public.criteria to anon;
grant insert (event_id, label, source, created_by) on table public.criteria to anon;
grant update (label) on table public.criteria to anon;
grant delete on table public.criteria to anon;

grant select on table public.votes to anon;
grant insert (candidate_id, participant_id, value) on table public.votes to anon;
grant update (value) on table public.votes to anon;
grant delete on table public.votes to anon;

grant select on table public.reactions to anon;
grant insert (candidate_id, participant_id, criterion_id) on table public.reactions to anon;
grant delete on table public.reactions to anon;

grant select on table public.concerns to anon;
grant insert (candidate_id, participant_id, criterion_id) on table public.concerns to anon;
grant delete on table public.concerns to anon;

grant select on table public.comments to anon;
grant insert (candidate_id, participant_id, text) on table public.comments to anon;
grant update (text) on table public.comments to anon;
grant delete on table public.comments to anon;

revoke all on function public.request_owner_token_matches_event(uuid) from public, anon, authenticated, service_role;
revoke all on function public.request_event_has_share_token(uuid) from public, anon, authenticated, service_role;
revoke all on function public.request_event_is_accessible(uuid) from public, anon, authenticated, service_role;
revoke all on function public.request_candidate_is_accessible(uuid) from public, anon, authenticated, service_role;
revoke all on function public.request_candidate_has_share_token(uuid) from public, anon, authenticated, service_role;
revoke all on function public.prepare_event_row() from public, anon, authenticated, service_role;
revoke all on function public.prepare_participant_row() from public, anon, authenticated, service_role;
revoke all on function public.prepare_candidate_row() from public, anon, authenticated, service_role;
revoke all on function public.prepare_criterion_row() from public, anon, authenticated, service_role;
revoke all on function public.prepare_vote_row() from public, anon, authenticated, service_role;
revoke all on function public.prepare_comment_row() from public, anon, authenticated, service_role;
revoke all on function public.feedback_references_match_event() from public, anon, authenticated, service_role;
revoke all on function public.reject_feedback_update() from public, anon, authenticated, service_role;

grant execute on function public.request_owner_token_matches_event(uuid) to anon;
grant execute on function public.request_event_has_share_token(uuid) to anon;
grant execute on function public.request_event_is_accessible(uuid) to anon;
grant execute on function public.request_candidate_is_accessible(uuid) to anon;
grant execute on function public.request_candidate_has_share_token(uuid) to anon;

commit;
