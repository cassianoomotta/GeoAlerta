BEGIN;

-- Codes are stable references used by occurrences, transition history and alerts.
CREATE FUNCTION public.core_protect_status_codes() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Core status codes cannot be deleted.' USING ERRCODE='42501';
  END IF;
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'Core status codes cannot be changed.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER core_status_codes_immutable
  BEFORE UPDATE OR DELETE ON public.status_presentations
  FOR EACH ROW EXECUTE FUNCTION public.core_protect_status_codes();
REVOKE ALL ON FUNCTION public.core_protect_status_codes() FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;

GRANT UPDATE(label,display_order) ON public.status_presentations TO geoalerta_runtime;
CREATE POLICY core_admin_status_presentations_update ON public.status_presentations
  FOR UPDATE TO geoalerta_runtime
  USING(public.core_is_admin())
  WITH CHECK(public.core_is_admin());

GRANT UPDATE(enabled) ON public.status_transitions TO geoalerta_runtime;
CREATE POLICY core_admin_status_transitions_update ON public.status_transitions
  FOR UPDATE TO geoalerta_runtime
  USING(public.core_is_admin())
  WITH CHECK(public.core_is_admin());

CREATE POLICY core_admin_status_audit_insert ON public.audit_events
  FOR INSERT TO geoalerta_runtime
  WITH CHECK(actor_id=auth.uid() AND public.core_is_admin() AND kind IN (
    'ADMIN_STATUS_PRESENTATIONS_UPDATED','ADMIN_STATUS_TRANSITION_UPDATED'
  ));

COMMIT;
