BEGIN;

CREATE OR REPLACE FUNCTION public.core_can_manage_climate_events() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles p
    WHERE p.user_id=(SELECT auth.uid()) AND p.state='ATIVO'
      AND p.role IN ('GESTOR','ADMINISTRADOR')
      AND (p.role='ADMINISTRADOR' OR EXISTS (
        SELECT 1 FROM public.user_group_memberships m
        JOIN public.groups g ON g.id=m.group_id
        WHERE m.user_id=p.user_id AND g.municipality_id=p.municipality_id
      ))
  )
$$;

CREATE OR REPLACE FUNCTION public.core_can_read_climate_events() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles p
    WHERE p.user_id=(SELECT auth.uid()) AND p.state='ATIVO'
      AND p.role IN ('CONSULTA','OPERADOR','GESTOR','ADMINISTRADOR')
      AND (p.role='ADMINISTRADOR' OR EXISTS (
        SELECT 1 FROM public.user_group_memberships m
        JOIN public.groups g ON g.id=m.group_id
        WHERE m.user_id=p.user_id AND g.municipality_id=p.municipality_id
      ))
  )
$$;

DROP POLICY core_climate_events_read ON public.climate_events;
DROP POLICY core_climate_events_insert ON public.climate_events;
DROP POLICY core_climate_events_update ON public.climate_events;
CREATE POLICY core_climate_events_read ON public.climate_events
  FOR SELECT TO geoalerta_runtime
  USING (municipality_id=(SELECT p.municipality_id FROM public.admin_profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.state='ATIVO')
    AND public.core_can_read_climate_events());
CREATE POLICY core_climate_events_insert ON public.climate_events
  FOR INSERT TO geoalerta_runtime
  WITH CHECK (municipality_id=(SELECT p.municipality_id FROM public.admin_profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.state='ATIVO')
    AND public.core_can_manage_climate_events());
CREATE POLICY core_climate_events_update ON public.climate_events
  FOR UPDATE TO geoalerta_runtime
  USING (municipality_id=(SELECT p.municipality_id FROM public.admin_profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.state='ATIVO')
    AND public.core_can_manage_climate_events())
  WITH CHECK (municipality_id=(SELECT p.municipality_id FROM public.admin_profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.state='ATIVO')
    AND public.core_can_manage_climate_events());

CREATE OR REPLACE FUNCTION public.core_guard_climate_event_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; actor_municipality text; change_details jsonb; event_kind text;
BEGIN
  actor := auth.uid();
  SELECT municipality_id INTO actor_municipality FROM public.admin_profiles
    WHERE user_id=actor AND state='ATIVO';
  IF actor IS NULL OR actor_municipality IS NULL OR NOT public.core_can_manage_climate_events() THEN
    RAISE EXCEPTION 'Climate event management requires an active municipal manager.' USING ERRCODE='42501';
  END IF;

  IF TG_OP='INSERT' THEN
    IF NEW.municipality_id IS DISTINCT FROM actor_municipality OR NEW.state<>'PLANEJADO'
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
      NEW.started_at := transaction_timestamp(); NEW.ended_at := NULL; event_kind := 'CLIMATE_EVENT_STARTED';
    ELSIF OLD.state='EM_ANDAMENTO' AND NEW.state='ENCERRADO' THEN
      IF EXISTS (SELECT 1 FROM public.occurrences o WHERE o.climate_event_id=OLD.id AND o.status NOT IN ('RESOLVIDA','CANCELADA')) THEN
        RAISE EXCEPTION 'CLIMATE_EVENT_BLOCKED_PENDING_OCCURRENCES' USING ERRCODE='23514';
      END IF;
      NEW.started_at := OLD.started_at; NEW.ended_at := transaction_timestamp(); event_kind := 'CLIMATE_EVENT_CLOSED';
    ELSE
      RAISE EXCEPTION 'Invalid climate event lifecycle transition.' USING ERRCODE='23514';
    END IF;
    change_details := jsonb_build_object('state',jsonb_build_object('from',OLD.state,'to',NEW.state),
      'startedAt',jsonb_build_object('from',OLD.started_at,'to',NEW.started_at),
      'endedAt',jsonb_build_object('from',OLD.ended_at,'to',NEW.ended_at));
  ELSE
    IF OLD.state='ENCERRADO' OR NEW.started_at IS DISTINCT FROM OLD.started_at OR NEW.ended_at IS DISTINCT FROM OLD.ended_at THEN
      RAISE EXCEPTION 'Closed climate events are immutable.' USING ERRCODE='42501';
    END IF;
    IF NEW.name IS NOT DISTINCT FROM OLD.name AND NEW.planned_start IS NOT DISTINCT FROM OLD.planned_start AND NEW.planned_end IS NOT DISTINCT FROM OLD.planned_end THEN
      RAISE EXCEPTION 'No climate event changes were submitted.' USING ERRCODE='23514';
    END IF;
    change_details := jsonb_build_object('name',jsonb_build_object('from',OLD.name,'to',NEW.name),
      'plannedStart',jsonb_build_object('from',OLD.planned_start,'to',NEW.planned_start),
      'plannedEnd',jsonb_build_object('from',OLD.planned_end,'to',NEW.planned_end));
    event_kind := 'CLIMATE_EVENT_UPDATED';
  END IF;
  INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes)
    VALUES(actor,OLD.id,event_kind,'Alteração do ciclo de vida do evento climático',change_details);
  RETURN NEW;
END
$$;

COMMIT;
