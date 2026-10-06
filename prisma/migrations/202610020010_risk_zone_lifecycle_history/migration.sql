BEGIN;

CREATE OR REPLACE FUNCTION geoalerta_private.effective_risk_zone_version(
  target_zone uuid,
  at_instant timestamptz
) RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, geoalerta_private
AS $$
  SELECT z.version
  FROM public.risk_zones AS z
  WHERE z.zone_id = target_zone
    AND (z.valid_from <= at_instant OR (z.valid_from IS NULL AND z.version = 1))
  ORDER BY z.valid_from DESC NULLS FIRST, z.version DESC
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION geoalerta_private.effective_risk_zone_version(uuid,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION geoalerta_private.effective_risk_zone_version(uuid,timestamptz)
  TO geoalerta_runtime, geoalerta_ingest;

CREATE OR REPLACE FUNCTION geoalerta_private.is_current_risk_zone(
  target_zone uuid,
  target_version integer
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, geoalerta_private
AS $$
  SELECT target_version = geoalerta_private.effective_risk_zone_version(target_zone, transaction_timestamp())
$$;
REVOKE ALL ON FUNCTION geoalerta_private.is_current_risk_zone(uuid,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION geoalerta_private.is_current_risk_zone(uuid,integer)
  TO geoalerta_runtime, geoalerta_ingest;

CREATE OR REPLACE FUNCTION geoalerta_private.zone_is_classifiable(
  target_zone uuid,
  target_version integer
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, geoalerta_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.risk_zones AS z
    WHERE z.zone_id = target_zone
      AND z.version = target_version
      AND z.version = geoalerta_private.effective_risk_zone_version(target_zone, transaction_timestamp())
      AND z.active
      AND (z.valid_from IS NULL OR z.valid_from <= transaction_timestamp())
      AND (z.valid_to IS NULL OR z.valid_to > transaction_timestamp())
  )
  AND EXISTS (
    SELECT 1
    FROM public.groups AS g
    WHERE g.municipality_id = 'sa_patrulha'
      AND public.core_has_access(g.id, 'operate')
  )
$$;
REVOKE ALL ON FUNCTION geoalerta_private.zone_is_classifiable(uuid,integer)
  FROM PUBLIC, anon, authenticated, geoalerta_ingest;
GRANT EXECUTE ON FUNCTION geoalerta_private.zone_is_classifiable(uuid,integer)
  TO geoalerta_runtime;

DROP POLICY IF EXISTS core_current_risk_zone_classification ON public.risk_zones;
CREATE POLICY core_current_risk_zone_classification ON public.risk_zones
  FOR SELECT TO geoalerta_runtime
  USING (
    active
    AND (valid_from IS NULL OR valid_from <= transaction_timestamp())
    AND (valid_to IS NULL OR valid_to > transaction_timestamp())
    AND geoalerta_private.is_current_risk_zone(zone_id, version)
    AND EXISTS (
      SELECT 1 FROM public.groups AS g
      WHERE g.municipality_id = 'sa_patrulha'
        AND public.core_has_access(g.id, 'operate')
    )
  );

DROP POLICY IF EXISTS ingest_zones ON public.risk_zones;
CREATE POLICY ingest_zones ON public.risk_zones
  FOR SELECT TO geoalerta_ingest
  USING (
    active
    AND (valid_from IS NULL OR valid_from <= transaction_timestamp())
    AND (valid_to IS NULL OR valid_to > transaction_timestamp())
    AND geoalerta_private.is_current_risk_zone(zone_id, version)
  );

COMMIT;
