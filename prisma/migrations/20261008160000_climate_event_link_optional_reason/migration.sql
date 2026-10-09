BEGIN;

CREATE OR REPLACE FUNCTION public.core_audit_occurrence_climate_event_link() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; reason_text text; change_details jsonb;
BEGIN
  IF NEW.climate_event_id IS NOT DISTINCT FROM OLD.climate_event_id THEN RETURN NEW; END IF;
  actor := auth.uid();
  reason_text := nullif(btrim(current_setting('core.mutation_reason',true)), '');
  IF actor IS NULL OR NOT public.core_can_manage_climate_events()
     OR NOT public.core_has_access(OLD.group_id,'operate') THEN
    RAISE EXCEPTION 'Climate event correction is not authorized.' USING ERRCODE='42501';
  END IF;
  IF OLD.deleted_at IS NOT NULL OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.group_id IS DISTINCT FROM OLD.group_id OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.priority IS DISTINCT FROM OLD.priority OR NEW.version<>OLD.version+1 THEN
    RAISE EXCEPTION 'Climate event correction must be an isolated versioned change.' USING ERRCODE='40001';
  END IF;
  IF NEW.climate_event_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.climate_events e JOIN public.groups g ON g.id=OLD.group_id
    WHERE e.id=NEW.climate_event_id AND e.municipality_id=g.municipality_id AND e.state IN ('EM_ANDAMENTO','ENCERRADO')
  ) THEN
    RAISE EXCEPTION 'Climate event is unavailable for this occurrence.' USING ERRCODE='23514';
  END IF;
  NEW.updated_at := transaction_timestamp();
  change_details := jsonb_build_object('climateEventId',jsonb_build_object('from',OLD.climate_event_id,'to',NEW.climate_event_id));
  INSERT INTO public.occurrence_events(occurrence_id,kind,actor_id,reason,changes)
    VALUES(OLD.id,'CLIMATE_EVENT_LINK_CHANGED',actor,reason_text,change_details);
  INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes)
    VALUES(actor,OLD.id,'OCCURRENCE_CLIMATE_EVENT_LINK_CHANGED',reason_text,change_details);
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.core_audit_occurrence_climate_event_link() FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;

COMMIT;
