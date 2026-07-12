create or replace function public.request_header(header_name text)
returns text
language sql
stable
set search_path = pg_catalog
as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> lower(header_name),
    nullif(current_setting('request.headers', true), '')::jsonb ->> header_name,
    ''
  );
$$;

revoke all on function public.request_header(text) from public;
grant execute on function public.request_header(text) to anon;
