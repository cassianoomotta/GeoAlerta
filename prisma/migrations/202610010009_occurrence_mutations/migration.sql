BEGIN;

-- Seed only missing Core transitions; administrator-configured rules already present are preserved.
INSERT INTO public.status_transitions(from_status,to_status,enabled,roles,reason_required) VALUES
  ('NOVA','EM_TRIAGEM',true,'["OPERADOR","GESTOR","ADMINISTRADOR"]'::jsonb,false),
  ('NOVA','CANCELADA',true,'["OPERADOR","GESTOR","ADMINISTRADOR"]'::jsonb,false),
  ('EM_TRIAGEM','EM_ATENDIMENTO',true,'["OPERADOR","GESTOR","ADMINISTRADOR"]'::jsonb,false),
  ('EM_TRIAGEM','CANCELADA',true,'["OPERADOR","GESTOR","ADMINISTRADOR"]'::jsonb,false),
  ('EM_ATENDIMENTO','RESOLVIDA',true,'["OPERADOR","GESTOR","ADMINISTRADOR"]'::jsonb,false),
  ('EM_ATENDIMENTO','EM_TRIAGEM',true,'["OPERADOR","GESTOR","ADMINISTRADOR"]'::jsonb,false)
ON CONFLICT(from_status,to_status) DO NOTHING;

-- Keep mutation evidence append-only while allowing the runtime role to record authorized Core edits/transitions.
CREATE POLICY core_occurrence_mutation_audit_insert ON public.audit_events
  FOR INSERT TO geoalerta_runtime
  WITH CHECK (
    actor_id = auth.uid()
    AND kind IN ('OCCURRENCE_EDITED','STATUS_TRANSITIONED')
    AND EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id = entity_id
        AND public.core_has_access(o.group_id,'operate')
    )
  );

COMMIT;
