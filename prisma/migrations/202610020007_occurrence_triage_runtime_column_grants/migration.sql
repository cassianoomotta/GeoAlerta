BEGIN;

-- New structured detail columns are guarded by the same occurrence RLS policy.
-- Runtime receives only the column reads needed by the authenticated detail API.
GRANT SELECT (
  registering_institution_code,neighborhood_code,locality_code,occurrence_situation,
  damage_location_code,damage_location_detail,has_victims,has_displaced
) ON public.occurrences TO geoalerta_runtime;

COMMIT;
