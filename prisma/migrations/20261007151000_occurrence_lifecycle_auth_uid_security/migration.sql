BEGIN;

-- Some previously provisioned databases have this trigger function, but the
-- repository's historical migrations do not create it. Harden it where present
-- without making a clean install depend on an unversioned database object.
DO $migration$
BEGIN
  IF to_regprocedure('public.set_occurrence_lifecycle()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.set_occurrence_lifecycle() SECURITY DEFINER';
    EXECUTE 'ALTER FUNCTION public.set_occurrence_lifecycle() SET search_path = pg_catalog, public';
    EXECUTE 'REVOKE ALL ON FUNCTION public.set_occurrence_lifecycle() FROM PUBLIC, anon, authenticated, geoalerta_runtime, geoalerta_ingest';
  END IF;
END
$migration$;

COMMIT;
