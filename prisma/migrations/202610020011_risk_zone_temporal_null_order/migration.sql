BEGIN;

-- Descending timestamps must put the open-start initial version last, so any
-- eligible dated version wins while version 1 remains the fallback before it.
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
  ORDER BY z.valid_from DESC NULLS LAST, z.version DESC
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION geoalerta_private.effective_risk_zone_version(uuid,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION geoalerta_private.effective_risk_zone_version(uuid,timestamptz)
  TO geoalerta_runtime, geoalerta_ingest;

COMMIT;
