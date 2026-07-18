begin;

do $migration$
declare
  invalid_candidate_url_count bigint;
begin
  select count(*)
    into invalid_candidate_url_count
  from public.candidates
  where url is not null
    and not (
      (url like 'http://%' or url like 'https://%')
      and substring(url from '^https?://([^/?#]+)') is not null
      and position('@' in substring(url from '^https?://([^/?#]+)')) = 0
      and url !~ '[[:cntrl:]]'
      and octet_length(url) <= 4096
    );

  if invalid_candidate_url_count > 0 then
    raise exception
      'candidate URL safety migration blocked: % existing row(s) violate the approved structural contract',
      invalid_candidate_url_count;
  end if;
end
$migration$;

alter table public.candidates
  add constraint candidates_url_safety_check
  check (
    url is null
    or (
      (url like 'http://%' or url like 'https://%')
      and substring(url from '^https?://([^/?#]+)') is not null
      and position('@' in substring(url from '^https?://([^/?#]+)')) = 0
      and url !~ '[[:cntrl:]]'
      and octet_length(url) <= 4096
    )
  );

commit;
