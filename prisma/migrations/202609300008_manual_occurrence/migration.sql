BEGIN;

GRANT SELECT ON public.risk_zones TO geoalerta_runtime;
CREATE POLICY core_active_risk_zones_read ON public.risk_zones
  FOR SELECT TO geoalerta_runtime
  USING (
    active
    AND (valid_from IS NULL OR valid_from <= transaction_timestamp())
    AND (valid_to IS NULL OR valid_to > transaction_timestamp())
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.municipality_id = 'sa_patrulha'
        AND public.core_has_access(g.id, 'operate')
    )
  );

GRANT SELECT, INSERT ON public.occurrence_classification_zones TO geoalerta_runtime;
CREATE POLICY core_occurrence_classification_read ON public.occurrence_classification_zones
  FOR SELECT TO geoalerta_runtime
  USING (
    EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id = occurrence_id
        AND public.core_has_access(o.group_id, 'read')
    )
  );
CREATE POLICY core_occurrence_classification_insert ON public.occurrence_classification_zones
  FOR INSERT TO geoalerta_runtime
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.occurrences o
      JOIN public.risk_zones z ON z.zone_id = occurrence_classification_zones.zone_id
        AND z.version = occurrence_classification_zones.zone_version
      WHERE o.id = occurrence_classification_zones.occurrence_id
        AND public.core_has_access(o.group_id, 'operate')
        AND z.active
        AND (z.valid_from IS NULL OR z.valid_from <= transaction_timestamp())
        AND (z.valid_to IS NULL OR z.valid_to > transaction_timestamp())
    )
  );

GRANT INSERT ON public.audit_events TO geoalerta_runtime;
CREATE POLICY core_occurrence_open_audit_insert ON public.audit_events
  FOR INSERT TO geoalerta_runtime
  WITH CHECK (
    actor_id = auth.uid()
    AND kind = 'OPENED'
    AND EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id = entity_id
        AND public.core_has_access(o.group_id, 'operate')
    )
  );

GRANT SELECT, INSERT ON public.idempotency_keys TO geoalerta_runtime;
CREATE POLICY core_manual_idempotency_read ON public.idempotency_keys
  FOR SELECT TO geoalerta_runtime
  USING (
    key LIKE ('manual:' || auth.uid()::text || ':%')
    AND EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id = occurrence_id
        AND public.core_has_access(o.group_id, 'operate')
    )
  );
CREATE POLICY core_manual_idempotency_insert ON public.idempotency_keys
  FOR INSERT TO geoalerta_runtime
  WITH CHECK (
    key LIKE ('manual:' || auth.uid()::text || ':%')
    AND EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id = occurrence_id
        AND public.core_has_access(o.group_id, 'operate')
    )
  );

COMMIT;
