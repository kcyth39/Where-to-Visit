WITH target_tables(relname) AS (
  VALUES
    ('events'::text),
    ('participants'::text),
    ('candidates'::text),
    ('criteria'::text),
    ('votes'::text),
    ('reactions'::text),
    ('concerns'::text),
    ('comments'::text)
), facts AS (
  SELECT
    target.relname,
    (relation.oid IS NOT NULL) AS exists,
    relation.relkind::text AS relkind,
    relation.relrowsecurity AS rls_enabled,
    relation.relforcerowsecurity AS rls_forced
  FROM target_tables AS target
  LEFT JOIN pg_catalog.pg_class AS relation
    ON relation.relnamespace = pg_catalog.to_regnamespace('public')
   AND relation.relname = target.relname
)
SELECT jsonb_build_object(
  'schema_version', 'n9-stage1-local-catalog-v1',
  'tables', jsonb_agg(to_jsonb(facts) ORDER BY relname)
) AS catalog
FROM facts;
