begin;

do $$
begin
  if to_regprocedure('private.create_default_criterion_for_event()') is not null then
    raise exception 'private.create_default_criterion_for_event() already exists';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.events'::pg_catalog.regclass
      and tgname = 'events_after_insert_create_default_criterion'
      and not tgisinternal
  ) then
    raise exception 'events_after_insert_create_default_criterion already exists';
  end if;
end;
$$;

create function private.create_default_criterion_for_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.criteria (event_id, label, source, created_by)
  values (new.id, '興味ある？', 'default', null);

  return new;
end;
$$;

alter function private.create_default_criterion_for_event() owner to postgres;

revoke all on function private.create_default_criterion_for_event()
  from public, anon, authenticated, service_role;

create trigger events_after_insert_create_default_criterion
after insert on public.events
for each row
execute function private.create_default_criterion_for_event();

commit;
