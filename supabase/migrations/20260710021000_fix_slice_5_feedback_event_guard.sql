create or replace function public.feedback_references_match_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_event_id uuid;
  reaction_criterion_id uuid;
begin
  if tg_table_name not in ('reactions', 'concerns', 'comments') then
    raise exception 'unsupported feedback table: %', tg_table_name;
  end if;

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

  if tg_table_name = 'reactions' then
    reaction_criterion_id := nullif(to_jsonb(new) ->> 'criterion_id', '')::uuid;

    if reaction_criterion_id is null or not exists (
      select 1
      from public.criteria cr
      where cr.id = reaction_criterion_id
        and cr.event_id = candidate_event_id
    ) then
      raise exception 'criterion must belong to the candidate event';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.feedback_references_match_event() from public;
