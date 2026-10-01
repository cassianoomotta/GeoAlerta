BEGIN;

CREATE FUNCTION public.core_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles p
    WHERE p.user_id=auth.uid() AND p.state='ATIVO'
      AND p.role='ADMINISTRADOR' AND p.municipality_id='sa_patrulha'
  )
$$;
REVOKE ALL ON FUNCTION public.core_is_admin() FROM PUBLIC,anon,authenticated,geoalerta_ingest;
GRANT EXECUTE ON FUNCTION public.core_is_admin() TO geoalerta_runtime;

GRANT INSERT(user_id,municipality_id,name,phone,role,state),UPDATE(name,phone,role,state)
  ON public.admin_profiles TO geoalerta_runtime;
CREATE POLICY core_admin_profiles_read ON public.admin_profiles
  FOR SELECT TO geoalerta_runtime USING(public.core_is_admin() AND municipality_id='sa_patrulha');
CREATE POLICY core_admin_profiles_insert ON public.admin_profiles
  FOR INSERT TO geoalerta_runtime WITH CHECK(public.core_is_admin() AND municipality_id='sa_patrulha' AND state='PENDENTE');
CREATE POLICY core_admin_profiles_update ON public.admin_profiles
  FOR UPDATE TO geoalerta_runtime
  USING(public.core_is_admin() AND municipality_id='sa_patrulha')
  WITH CHECK(public.core_is_admin() AND municipality_id='sa_patrulha');

GRANT INSERT,UPDATE(name,is_default) ON public.groups TO geoalerta_runtime;
CREATE POLICY core_admin_groups_insert ON public.groups
  FOR INSERT TO geoalerta_runtime WITH CHECK(public.core_is_admin() AND municipality_id='sa_patrulha');
CREATE POLICY core_admin_groups_update ON public.groups
  FOR UPDATE TO geoalerta_runtime
  USING(public.core_is_admin() AND municipality_id='sa_patrulha')
  WITH CHECK(public.core_is_admin() AND municipality_id='sa_patrulha');

GRANT INSERT,DELETE ON public.user_group_memberships TO geoalerta_runtime;
CREATE POLICY core_admin_memberships_read ON public.user_group_memberships
  FOR SELECT TO geoalerta_runtime USING(public.core_is_admin());
CREATE POLICY core_admin_memberships_insert ON public.user_group_memberships
  FOR INSERT TO geoalerta_runtime WITH CHECK(public.core_is_admin() AND EXISTS(
    SELECT 1 FROM public.admin_profiles p
    JOIN public.groups g ON g.id=user_group_memberships.group_id
    WHERE p.user_id=user_group_memberships.user_id
      AND p.municipality_id=g.municipality_id AND g.municipality_id='sa_patrulha'
  ));
CREATE POLICY core_admin_memberships_delete ON public.user_group_memberships
  FOR DELETE TO geoalerta_runtime USING(public.core_is_admin());

GRANT SELECT,INSERT ON public.audit_events TO geoalerta_runtime;
CREATE POLICY core_admin_access_audit_read ON public.audit_events
  FOR SELECT TO geoalerta_runtime USING(public.core_is_admin());
CREATE POLICY core_admin_access_audit_insert ON public.audit_events
  FOR INSERT TO geoalerta_runtime WITH CHECK(actor_id=auth.uid() AND public.core_is_admin() AND kind IN (
    'ADMIN_USER_PROVISIONED','ADMIN_USER_PROVISIONING_RETRIED','ADMIN_USER_ACCESS_UPDATED',
    'ADMIN_GROUP_CREATED','ADMIN_GROUP_UPDATED'
  ));

CREATE OR REPLACE FUNCTION public.core_bump_profile_version() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.role IS DISTINCT FROM OLD.role OR NEW.state IS DISTINCT FROM OLD.state THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS core_profile_version ON public.admin_profiles;
CREATE TRIGGER core_profile_version
  BEFORE UPDATE OF name,phone,role,state ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.core_bump_profile_version();

COMMIT;
