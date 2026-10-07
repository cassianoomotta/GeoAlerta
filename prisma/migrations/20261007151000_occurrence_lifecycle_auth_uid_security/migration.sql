BEGIN;

-- The runtime role cannot use the auth schema, but this trigger must read the
-- authenticated actor from auth.uid(). Keep the function owned by postgres
-- and its search_path pinned so the trigger can read the JWT identity safely.
ALTER FUNCTION public.set_occurrence_lifecycle()
  SECURITY DEFINER;

ALTER FUNCTION public.set_occurrence_lifecycle()
  SET search_path = pg_catalog, public;

-- Trigger execution does not require callers to invoke this function directly.
REVOKE ALL ON FUNCTION public.set_occurrence_lifecycle()
  FROM PUBLIC, anon, authenticated, geoalerta_runtime, geoalerta_ingest;

COMMIT;
