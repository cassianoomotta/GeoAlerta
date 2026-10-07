BEGIN;

-- Prisma datamodel delta; additive only. Existing occurrence rows stay unlinked.
ALTER TABLE public.occurrences ADD COLUMN climate_event_id uuid;
CREATE TABLE public.climate_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  municipality_id text NOT NULL,
  name text NOT NULL,
  planned_start date NOT NULL,
  planned_end date NOT NULL,
  state text NOT NULL DEFAULT 'PLANEJADO',
  started_at timestamptz(6),
  ended_at timestamptz(6),
  created_by uuid NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT climate_events_pkey PRIMARY KEY (id),
  CONSTRAINT climate_events_name_valid CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT climate_events_planned_dates_valid CHECK (planned_end >= planned_start),
  CONSTRAINT climate_events_state_valid CHECK (state IN ('PLANEJADO','EM_ANDAMENTO','ENCERRADO')),
  CONSTRAINT climate_events_lifecycle_timestamps_valid CHECK (
    (state='PLANEJADO' AND started_at IS NULL AND ended_at IS NULL) OR
    (state='EM_ANDAMENTO' AND started_at IS NOT NULL AND ended_at IS NULL) OR
    (state='ENCERRADO' AND started_at IS NOT NULL AND ended_at IS NOT NULL)
  ),
  CONSTRAINT climate_events_version_positive CHECK (version >= 1)
);
CREATE INDEX climate_events_municipality_state
  ON public.climate_events(municipality_id,state,planned_start DESC,id);
CREATE UNIQUE INDEX climate_events_one_active_per_municipality
  ON public.climate_events(municipality_id) WHERE state='EM_ANDAMENTO';
ALTER TABLE public.occurrences ADD CONSTRAINT occurrences_climate_event_id_fkey
  FOREIGN KEY (climate_event_id) REFERENCES public.climate_events(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX occurrences_climate_event_status
  ON public.occurrences(climate_event_id,status,deleted_at);

-- These helpers read only the current persisted profile and current group membership.
CREATE FUNCTION public.core_can_manage_climate_events() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles p
    WHERE p.user_id=(SELECT auth.uid()) AND p.state='ATIVO'
      AND p.municipality_id='sa_patrulha' AND p.role IN ('GESTOR','ADMINISTRADOR')
      AND (p.role='ADMINISTRADOR' OR EXISTS (
        SELECT 1 FROM public.user_group_memberships m
        JOIN public.groups g ON g.id=m.group_id
        WHERE m.user_id=p.user_id AND g.municipality_id=p.municipality_id
      ))
  )
$$;
CREATE FUNCTION public.core_can_read_climate_events() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles p
    WHERE p.user_id=(SELECT auth.uid()) AND p.state='ATIVO'
      AND p.municipality_id='sa_patrulha'
      AND p.role IN ('CONSULTA','OPERADOR','GESTOR','ADMINISTRADOR')
      AND (p.role='ADMINISTRADOR' OR EXISTS (
        SELECT 1 FROM public.user_group_memberships m
        JOIN public.groups g ON g.id=m.group_id
        WHERE m.user_id=p.user_id AND g.municipality_id=p.municipality_id
      ))
  )
$$;
REVOKE ALL ON FUNCTION public.core_can_manage_climate_events() FROM PUBLIC,anon,authenticated,geoalerta_ingest;
REVOKE ALL ON FUNCTION public.core_can_read_climate_events() FROM PUBLIC,anon,authenticated,geoalerta_ingest;
GRANT EXECUTE ON FUNCTION public.core_can_manage_climate_events() TO geoalerta_runtime;
GRANT EXECUTE ON FUNCTION public.core_can_read_climate_events() TO geoalerta_runtime;

ALTER TABLE public.climate_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.climate_events FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;
GRANT SELECT ON public.climate_events TO geoalerta_runtime,geoalerta_ingest;
GRANT INSERT(municipality_id,name,planned_start,planned_end) ON public.climate_events TO geoalerta_runtime;
GRANT UPDATE(name,planned_start,planned_end,state,started_at,ended_at,version,updated_at)
  ON public.climate_events TO geoalerta_runtime;
CREATE POLICY core_climate_events_read ON public.climate_events
  FOR SELECT TO geoalerta_runtime
  USING (municipality_id='sa_patrulha' AND public.core_can_read_climate_events());
CREATE POLICY core_climate_events_insert ON public.climate_events
  FOR INSERT TO geoalerta_runtime
  WITH CHECK (municipality_id='sa_patrulha' AND public.core_can_manage_climate_events());
CREATE POLICY core_climate_events_update ON public.climate_events
  FOR UPDATE TO geoalerta_runtime
  USING (municipality_id='sa_patrulha' AND public.core_can_manage_climate_events())
  WITH CHECK (municipality_id='sa_patrulha' AND public.core_can_manage_climate_events());
CREATE POLICY ingest_active_climate_events_read ON public.climate_events
  FOR SELECT TO geoalerta_ingest
  USING (municipality_id='sa_patrulha' AND state='EM_ANDAMENTO');

-- Keep the new occurrence column within the existing row-level scope.
GRANT SELECT(climate_event_id) ON public.occurrences TO geoalerta_runtime,geoalerta_ingest;
GRANT INSERT(climate_event_id) ON public.occurrences TO geoalerta_runtime,geoalerta_ingest;
GRANT UPDATE(climate_event_id) ON public.occurrences TO geoalerta_runtime;

CREATE FUNCTION public.core_guard_climate_event_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; change_details jsonb; event_kind text;
BEGIN
  actor := auth.uid();
  IF actor IS NULL OR NOT public.core_can_manage_climate_events() THEN
    RAISE EXCEPTION 'Climate event management requires an active municipal manager.' USING ERRCODE='42501';
  END IF;

  IF TG_OP='INSERT' THEN
    IF NEW.municipality_id IS DISTINCT FROM 'sa_patrulha' OR NEW.state<>'PLANEJADO'
       OR NEW.started_at IS NOT NULL OR NEW.ended_at IS NOT NULL OR NEW.version<>1 THEN
      RAISE EXCEPTION 'Climate events must be created as planned in the actor municipality.' USING ERRCODE='42501';
    END IF;
    NEW.created_by := actor;
    NEW.created_at := transaction_timestamp();
    NEW.updated_at := NEW.created_at;
    INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes)
      VALUES(actor,NEW.id,'CLIMATE_EVENT_CREATED','Evento climático cadastrado',
        jsonb_build_object('name',NEW.name,'plannedStart',NEW.planned_start,'plannedEnd',NEW.planned_end));
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.municipality_id IS DISTINCT FROM OLD.municipality_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Climate event identity and authorship are immutable.' USING ERRCODE='42501';
  END IF;
  IF NEW.version<>OLD.version+1 THEN
    RAISE EXCEPTION 'Climate event version conflict.' USING ERRCODE='40001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('climate-event:'||OLD.municipality_id,0));
  NEW.updated_at := transaction_timestamp();

  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NEW.name IS DISTINCT FROM OLD.name OR NEW.planned_start IS DISTINCT FROM OLD.planned_start
       OR NEW.planned_end IS DISTINCT FROM OLD.planned_end THEN
      RAISE EXCEPTION 'Lifecycle transitions cannot edit event details.' USING ERRCODE='42501';
    END IF;
    IF OLD.state='PLANEJADO' AND NEW.state='EM_ANDAMENTO' THEN
      NEW.started_at := transaction_timestamp();
      NEW.ended_at := NULL;
      event_kind := 'CLIMATE_EVENT_STARTED';
    ELSIF OLD.state='EM_ANDAMENTO' AND NEW.state='ENCERRADO' THEN
      IF EXISTS (
        SELECT 1 FROM public.occurrences o
        WHERE o.climate_event_id=OLD.id AND o.status NOT IN ('RESOLVIDA','CANCELADA')
      ) THEN
        RAISE EXCEPTION 'CLIMATE_EVENT_BLOCKED_PENDING_OCCURRENCES' USING ERRCODE='23514';
      END IF;
      NEW.started_at := OLD.started_at;
      NEW.ended_at := transaction_timestamp();
      event_kind := 'CLIMATE_EVENT_CLOSED';
    ELSE
      RAISE EXCEPTION 'Invalid climate event lifecycle transition.' USING ERRCODE='23514';
    END IF;
    change_details := jsonb_build_object('state',jsonb_build_object('from',OLD.state,'to',NEW.state),
      'startedAt',jsonb_build_object('from',OLD.started_at,'to',NEW.started_at),
      'endedAt',jsonb_build_object('from',OLD.ended_at,'to',NEW.ended_at));
  ELSE
    IF OLD.state='ENCERRADO' OR NEW.started_at IS DISTINCT FROM OLD.started_at
       OR NEW.ended_at IS DISTINCT FROM OLD.ended_at THEN
      RAISE EXCEPTION 'Closed climate events are immutable.' USING ERRCODE='42501';
    END IF;
    IF NEW.name IS NOT DISTINCT FROM OLD.name AND NEW.planned_start IS NOT DISTINCT FROM OLD.planned_start
       AND NEW.planned_end IS NOT DISTINCT FROM OLD.planned_end THEN
      RAISE EXCEPTION 'No climate event changes were submitted.' USING ERRCODE='23514';
    END IF;
    change_details := jsonb_build_object(
      'name',jsonb_build_object('from',OLD.name,'to',NEW.name),
      'plannedStart',jsonb_build_object('from',OLD.planned_start,'to',NEW.planned_start),
      'plannedEnd',jsonb_build_object('from',OLD.planned_end,'to',NEW.planned_end));
    event_kind := 'CLIMATE_EVENT_UPDATED';
  END IF;

  INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes)
    VALUES(actor,OLD.id,event_kind,'Alteração do ciclo de vida do evento climático',change_details);
  RETURN NEW;
END
$$;
CREATE TRIGGER core_climate_event_write
  BEFORE INSERT OR UPDATE ON public.climate_events
  FOR EACH ROW EXECUTE FUNCTION public.core_guard_climate_event_write();
REVOKE ALL ON FUNCTION public.core_guard_climate_event_write() FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;

-- Serialize occurrence writes with event closure and validate municipality integrity.
CREATE FUNCTION public.core_lock_occurrence_climate_event_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE group_municipality text; event_municipality text; event_state text;
BEGIN
  SELECT municipality_id INTO group_municipality FROM public.groups WHERE id=NEW.group_id;
  IF group_municipality IS NULL THEN
    RAISE EXCEPTION 'Occurrence group not found.' USING ERRCODE='23503';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('climate-event:'||group_municipality,0));
  IF NEW.climate_event_id IS NOT NULL THEN
    SELECT municipality_id,state INTO event_municipality,event_state
      FROM public.climate_events WHERE id=NEW.climate_event_id;
    IF event_municipality IS NULL OR event_municipality IS DISTINCT FROM group_municipality THEN
      RAISE EXCEPTION 'Occurrence and climate event must belong to the same municipality.' USING ERRCODE='23514';
    END IF;
    IF event_state='PLANEJADO' OR (TG_OP='INSERT' AND event_state<>'EM_ANDAMENTO') THEN
      RAISE EXCEPTION 'Occurrences cannot be linked to a planned or closed event at creation.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER core_a_lock_occurrence_climate_event_write
  BEFORE INSERT OR UPDATE OF climate_event_id,group_id,status,deleted_at ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.core_lock_occurrence_climate_event_write();
REVOKE ALL ON FUNCTION public.core_lock_occurrence_climate_event_write() FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;

CREATE FUNCTION public.core_audit_occurrence_climate_event_link() RETURNS trigger
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
  IF reason_text IS NULL OR char_length(reason_text)<10 THEN
    RAISE EXCEPTION 'A climate event correction reason of at least 10 characters is required.' USING ERRCODE='23514';
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
CREATE TRIGGER core_z_audit_occurrence_climate_event_link
  BEFORE UPDATE OF climate_event_id ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.core_audit_occurrence_climate_event_link();
REVOKE ALL ON FUNCTION public.core_audit_occurrence_climate_event_link() FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;

-- The restricted intake connection can resolve only the active event in the fixed municipality.
GRANT SELECT ON public.climate_events TO geoalerta_ingest;
GRANT INSERT(climate_event_id) ON public.occurrences TO geoalerta_ingest;

COMMIT;
