BEGIN;

-- Scope the battalion idempotency namespace to the authenticated actor and
-- the occurrence group without changing manual or anonymous intake policies.
CREATE POLICY core_battalion_idempotency_read ON public.idempotency_keys
  FOR SELECT TO geoalerta_runtime
  USING (
    key LIKE ('battalion:' || auth.uid()::text || ':%')
    AND EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id = occurrence_id
        AND public.core_has_access(o.group_id, 'operate')
    )
  );

CREATE POLICY core_battalion_idempotency_insert ON public.idempotency_keys
  FOR INSERT TO geoalerta_runtime
  WITH CHECK (
    key LIKE ('battalion:' || auth.uid()::text || ':%')
    AND EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id = occurrence_id
        AND public.core_has_access(o.group_id, 'operate')
    )
  );

COMMIT;
