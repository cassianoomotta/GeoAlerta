BEGIN;
-- Permissive policies are ORed. Retire the pre-versioning policy so a disabled
-- latest version cannot be bypassed by an older active row.
DROP POLICY IF EXISTS core_active_risk_zones_read ON public.risk_zones;
DROP POLICY IF EXISTS core_current_risk_zone_classification ON public.risk_zones;
CREATE POLICY core_current_risk_zone_classification ON public.risk_zones
  FOR SELECT TO geoalerta_runtime
  USING(active AND (valid_from IS NULL OR valid_from<=transaction_timestamp())
    AND (valid_to IS NULL OR valid_to>transaction_timestamp())
    AND geoalerta_private.is_current_risk_zone(zone_id,version)
    AND EXISTS(SELECT FROM public.groups g
      WHERE g.municipality_id='sa_patrulha' AND public.core_has_access(g.id,'operate')));
COMMIT;
