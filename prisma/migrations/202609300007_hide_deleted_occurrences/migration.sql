BEGIN;

DROP POLICY core_occurrence_read ON public.occurrences;
CREATE POLICY core_occurrence_read ON public.occurrences
  FOR SELECT TO geoalerta_runtime
  USING(deleted_at IS NULL AND public.core_has_access(group_id,'read'));

COMMIT;
