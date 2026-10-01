BEGIN;

-- RLS must recognize a newly inserted inactive/future version so an older
-- active row cannot remain classifiable. The helper sees all versions but
-- returns only the current-version predicate and is not publicly executable.
CREATE SCHEMA IF NOT EXISTS geoalerta_private;
REVOKE ALL ON SCHEMA geoalerta_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA geoalerta_private TO geoalerta_runtime,geoalerta_ingest;
CREATE FUNCTION geoalerta_private.is_current_risk_zone(target_zone uuid,target_version integer) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,geoalerta_private AS $$
  SELECT target_version=(SELECT max(z.version) FROM public.risk_zones z WHERE z.zone_id=target_zone)
$$;
REVOKE ALL ON FUNCTION geoalerta_private.is_current_risk_zone(uuid,integer) FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;
GRANT EXECUTE ON FUNCTION geoalerta_private.is_current_risk_zone(uuid,integer) TO geoalerta_runtime,geoalerta_ingest;

-- Runtime remains append-only: every administrative change adds a new version.
REVOKE INSERT,UPDATE,DELETE ON public.risk_zones FROM geoalerta_runtime;
GRANT INSERT(zone_id,version,name,type,active,valid_from,valid_to,geometry) ON public.risk_zones TO geoalerta_runtime;
CREATE POLICY core_admin_risk_zones_read ON public.risk_zones
  FOR SELECT TO geoalerta_runtime USING(public.core_is_admin());
CREATE POLICY core_admin_risk_zones_insert ON public.risk_zones
  FOR INSERT TO geoalerta_runtime WITH CHECK(public.core_is_admin());
CREATE POLICY core_current_risk_zone_classification ON public.risk_zones
  FOR SELECT TO geoalerta_runtime
  USING(active AND (valid_from IS NULL OR valid_from<=transaction_timestamp())
    AND (valid_to IS NULL OR valid_to>transaction_timestamp())
    AND geoalerta_private.is_current_risk_zone(zone_id,version));

DROP POLICY IF EXISTS ingest_zones ON public.risk_zones;
CREATE POLICY ingest_zones ON public.risk_zones
  FOR SELECT TO geoalerta_ingest
  USING(active AND (valid_from IS NULL OR valid_from<=transaction_timestamp())
    AND (valid_to IS NULL OR valid_to>transaction_timestamp())
    AND geoalerta_private.is_current_risk_zone(zone_id,version));

CREATE POLICY core_admin_risk_zone_audit_insert ON public.audit_events
  FOR INSERT TO geoalerta_runtime
  WITH CHECK(actor_id=auth.uid() AND public.core_is_admin() AND kind IN (
    'ADMIN_RISK_ZONE_CREATED','ADMIN_RISK_ZONE_VERSION_CREATED'
  ));

COMMIT;
