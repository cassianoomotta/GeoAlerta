BEGIN;
-- A classification INSERT policy that SELECTs risk_zones recursively expands
-- the historical zone SELECT policy back into classification policies.
-- This private boolean helper inspects only the requested current zone and
-- checks a persisted active operator identity before returning any result.
CREATE FUNCTION geoalerta_private.zone_is_classifiable(target_zone uuid,target_version integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,geoalerta_private AS $$
  SELECT EXISTS(SELECT FROM public.risk_zones z
    WHERE z.zone_id=target_zone AND z.version=target_version AND z.active
      AND (z.valid_from IS NULL OR z.valid_from<=transaction_timestamp())
      AND (z.valid_to IS NULL OR z.valid_to>transaction_timestamp())
      AND z.version=(SELECT max(v.version) FROM public.risk_zones v WHERE v.zone_id=z.zone_id))
    AND EXISTS(SELECT FROM public.groups g
      WHERE g.municipality_id='sa_patrulha' AND public.core_has_access(g.id,'operate'))
$$;
REVOKE ALL ON FUNCTION geoalerta_private.zone_is_classifiable(uuid,integer) FROM PUBLIC,anon,authenticated,geoalerta_ingest;
GRANT EXECUTE ON FUNCTION geoalerta_private.zone_is_classifiable(uuid,integer) TO geoalerta_runtime;
DROP POLICY core_occurrence_classification_insert ON public.occurrence_classification_zones;
CREATE POLICY core_occurrence_classification_insert ON public.occurrence_classification_zones
  FOR INSERT TO geoalerta_runtime
  WITH CHECK(EXISTS(SELECT FROM public.occurrences o
    WHERE o.id=occurrence_classification_zones.occurrence_id AND public.core_has_access(o.group_id,'operate'))
    AND geoalerta_private.zone_is_classifiable(zone_id,zone_version));
COMMIT;
