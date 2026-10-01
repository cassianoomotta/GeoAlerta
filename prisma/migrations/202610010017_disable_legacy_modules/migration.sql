BEGIN;

-- Preserve historical rows while making the retired modules inaccessible to
-- API roles. A restrictive policy keeps old permissive policies from reopening
-- these tables if grants are restored later.
DO $$
DECLARE
  legacy_table text;
  legacy_tables text[] := ARRAY[
    'resources','resource_movements','shelters','shelter_people',
    'teams','team_members','team_locations','volunteers'
  ];
BEGIN
  FOREACH legacy_table IN ARRAY legacy_tables LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest',
      legacy_table
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',legacy_table);
    EXECUTE format(
      'CREATE POLICY core_legacy_modules_disabled ON public.%I AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)',
      legacy_table
    );
  END LOOP;
END $$;

-- Stop broadcasting operational data without deleting any stored locations.
DO $$
DECLARE
  published_table text;
BEGIN
  FOR published_table IN
    SELECT tablename
    FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename IN ('resources','resource_movements','shelters','shelter_people','teams','team_members','team_locations','volunteers')
  LOOP
    EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I',published_table);
  END LOOP;
END $$;

COMMIT;
