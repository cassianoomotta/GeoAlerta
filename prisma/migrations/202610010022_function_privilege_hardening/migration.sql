BEGIN;
-- Hosted Supabase default privileges can grant anon directly even after a
-- REVOKE FROM PUBLIC. Authorization helpers are internal to server policies.
REVOKE ALL ON FUNCTION public.core_has_access(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.core_has_access(uuid,text) TO geoalerta_runtime;
ALTER FUNCTION public.protect_legacy_provenance() SET search_path=pg_catalog,public;
REVOKE ALL ON FUNCTION public.protect_legacy_provenance() FROM PUBLIC,anon,authenticated;
-- This optional hosted event-trigger helper has no client-callable purpose.
DO $$ BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC,anon,authenticated';
  END IF;
END $$;
COMMIT;
