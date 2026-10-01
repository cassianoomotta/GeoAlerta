BEGIN;

-- Self-service access is limited to the caller's own active profile and editable columns.
GRANT UPDATE(name,phone) ON public.admin_profiles TO geoalerta_runtime;
CREATE POLICY core_own_profile_update ON public.admin_profiles
  FOR UPDATE TO geoalerta_runtime
  USING(user_id=auth.uid() AND state='ATIVO' AND municipality_id='sa_patrulha')
  WITH CHECK(user_id=auth.uid() AND state='ATIVO' AND municipality_id='sa_patrulha');

CREATE FUNCTION public.core_bump_profile_version() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name OR NEW.phone IS DISTINCT FROM OLD.phone THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER core_profile_version
  BEFORE UPDATE OF name,phone ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.core_bump_profile_version();
REVOKE ALL ON FUNCTION public.core_bump_profile_version() FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;

COMMIT;
