BEGIN;

CREATE POLICY core_occurrence_service_audit_insert ON public.audit_events
  FOR INSERT TO geoalerta_runtime
  WITH CHECK (
    actor_id=auth.uid()
    AND kind='SERVICE_ACTION_RECORDED'
    AND EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id=entity_id AND o.deleted_at IS NULL
        AND public.core_has_access(o.group_id,'operate')
    )
  );

COMMIT;
