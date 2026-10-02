BEGIN;

GRANT SELECT (name, active, display_order)
  ON public.occurrence_types
  TO geoalerta_runtime;

CREATE POLICY core_read_occurrence_type_catalog
  ON public.occurrence_types
  FOR SELECT
  TO geoalerta_runtime
  USING (true);

COMMIT;