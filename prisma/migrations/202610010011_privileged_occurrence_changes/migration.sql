BEGIN;

-- Seed only the two privileged reopen paths; preserve any administrator-configured rules.
INSERT INTO public.status_transitions(from_status,to_status,enabled,roles,reason_required) VALUES
  ('RESOLVIDA','EM_TRIAGEM',true,'["GESTOR","ADMINISTRADOR"]'::jsonb,true),
  ('CANCELADA','EM_TRIAGEM',true,'["GESTOR","ADMINISTRADOR"]'::jsonb,true)
ON CONFLICT(from_status,to_status) DO NOTHING;

CREATE OR REPLACE FUNCTION public.core_guard_occurrence_state_change() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
DECLARE
  actor uuid;
  actor_role text;
  transition_enabled boolean;
  allowed_roles jsonb;
  requires_reason boolean;
  reason_text text;
  change_details jsonb;
  event_kind text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.priority IS NOT DISTINCT FROM OLD.priority THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.priority IS DISTINCT FROM OLD.priority THEN
    RAISE EXCEPTION 'Change status and priority in separate versioned operations.' USING ERRCODE='42501';
  END IF;
  IF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'A protected occurrence change must increment version once.' USING ERRCODE='40001';
  END IF;

  actor := auth.uid();
  reason_text := nullif(btrim(current_setting('core.mutation_reason',true)), '');
  IF actor IS NULL THEN
    RAISE EXCEPTION 'An active actor is required.' USING ERRCODE='42501';
  END IF;
  SELECT role INTO actor_role FROM public.admin_profiles
    WHERE user_id=actor AND state='ATIVO' AND municipality_id='sa_patrulha';
  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'An active Core profile is required.' USING ERRCODE='42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT enabled,roles,reason_required INTO transition_enabled,allowed_roles,requires_reason
      FROM public.status_transitions
      WHERE from_status=OLD.status AND to_status=NEW.status;
    IF NOT coalesce(transition_enabled,false) OR NOT coalesce(allowed_roles @> jsonb_build_array(actor_role),false) THEN
      RAISE EXCEPTION 'Status transition is disabled or not allowed for this role.' USING ERRCODE='42501';
    END IF;
    IF (OLD.status IN ('RESOLVIDA','CANCELADA') AND NEW.status='EM_TRIAGEM')
       AND NOT public.core_has_access(OLD.group_id,'reclassify') THEN
      RAISE EXCEPTION 'Reopening requires Gestor or Administrador capability.' USING ERRCODE='42501';
    END IF;
    IF coalesce(requires_reason,false) AND (reason_text IS NULL OR length(reason_text)<10) THEN
      RAISE EXCEPTION 'A reason is required for this transition.' USING ERRCODE='42501';
    END IF;
    IF NEW.group_id IS DISTINCT FROM OLD.group_id OR NEW.priority IS DISTINCT FROM OLD.priority THEN
      RAISE EXCEPTION 'A status transition cannot change group or priority.' USING ERRCODE='42501';
    END IF;
    change_details := jsonb_build_object('status',jsonb_build_object('from',OLD.status,'to',NEW.status));
    event_kind := CASE WHEN OLD.status IN ('RESOLVIDA','CANCELADA') AND NEW.status='EM_TRIAGEM'
      THEN 'STATUS_REOPENED' ELSE 'STATUS_TRANSITIONED' END;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.group_id IS DISTINCT FROM OLD.group_id THEN
      RAISE EXCEPTION 'Priority reclassification cannot change status or group.' USING ERRCODE='42501';
    END IF;
    IF NOT public.core_has_access(OLD.group_id,'reclassify') THEN
      RAISE EXCEPTION 'Priority reclassification requires Gestor or Administrador capability.' USING ERRCODE='42501';
    END IF;
    IF reason_text IS NULL OR length(reason_text)<10 THEN
      RAISE EXCEPTION 'A reason of at least 10 characters is required.' USING ERRCODE='42501';
    END IF;
    change_details := jsonb_build_object('priority',jsonb_build_object('from',OLD.priority,'to',NEW.priority));
    event_kind := 'PRIORITY_RECLASSIFIED';
  END IF;

  INSERT INTO public.occurrence_events(occurrence_id,kind,actor_id,reason,changes)
    VALUES(OLD.id,event_kind,actor,reason_text,change_details);
  INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes)
    VALUES(actor,OLD.id,event_kind,reason_text,change_details);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS core_occurrence_state_change_guard ON public.occurrences;
CREATE TRIGGER core_occurrence_state_change_guard
  BEFORE UPDATE OF status,priority ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.core_guard_occurrence_state_change();

REVOKE ALL ON FUNCTION public.core_guard_occurrence_state_change() FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;

COMMIT;
