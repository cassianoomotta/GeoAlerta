BEGIN;
CREATE FUNCTION public.core_guard_occurrence_state_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE actor uuid; actor_role text; transition_enabled boolean; allowed_roles jsonb;
  requires_reason boolean; reason_text text; change_details jsonb;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.version <> OLD.version + 1 OR NEW.group_id IS DISTINCT FROM OLD.group_id OR NEW.priority IS DISTINCT FROM OLD.priority THEN
    RAISE EXCEPTION 'A status transition must increment one version and cannot change group or priority.' USING ERRCODE='40001';
  END IF;
  IF OLD.status IN ('RESOLVIDA','CANCELADA') AND NEW.status='EM_TRIAGEM' THEN
    RAISE EXCEPTION 'Reopening requires the dedicated capability.' USING ERRCODE='42501';
  END IF;
  actor := auth.uid();
  reason_text := nullif(btrim(current_setting('core.mutation_reason',true)), '');
  IF actor IS NULL THEN RAISE EXCEPTION 'An active actor is required.' USING ERRCODE='42501'; END IF;
  SELECT role INTO actor_role FROM public.admin_profiles
    WHERE user_id=actor AND state='ATIVO' AND municipality_id='sa_patrulha';
  IF actor_role IS NULL THEN RAISE EXCEPTION 'An active Core profile is required.' USING ERRCODE='42501'; END IF;
  SELECT enabled,roles,reason_required INTO transition_enabled,allowed_roles,requires_reason
    FROM public.status_transitions WHERE from_status=OLD.status AND to_status=NEW.status;
  IF NOT coalesce(transition_enabled,false) OR NOT coalesce(allowed_roles @> jsonb_build_array(actor_role),false) THEN
    RAISE EXCEPTION 'Status transition is disabled or not allowed for this role.' USING ERRCODE='42501';
  END IF;
  IF coalesce(requires_reason,false) AND (reason_text IS NULL OR length(reason_text)<10) THEN
    RAISE EXCEPTION 'A reason is required for this transition.' USING ERRCODE='42501';
  END IF;
  change_details := jsonb_build_object('status',jsonb_build_object('from',OLD.status,'to',NEW.status));
  INSERT INTO public.occurrence_events(occurrence_id,kind,actor_id,reason,changes)
    VALUES(OLD.id,'STATUS_TRANSITIONED',actor,reason_text,change_details);
  INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes)
    VALUES(actor,OLD.id,'STATUS_TRANSITIONED',reason_text,change_details);
  RETURN NEW;
END
$$;
CREATE TRIGGER core_occurrence_state_change_guard BEFORE UPDATE OF status ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.core_guard_occurrence_state_change();
REVOKE ALL ON FUNCTION public.core_guard_occurrence_state_change() FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;
COMMIT;
