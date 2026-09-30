BEGIN;
-- Stop BEFORE any Core DDL. Do not manufacture a location or silently map unknown states.
DO $$ DECLARE report jsonb; BEGIN
  SELECT jsonb_build_object(
    'unknown_statuses', COALESCE((SELECT jsonb_agg(x) FROM (SELECT status, count(*) FROM public.occurrences WHERE status NOT IN ('Aberto','Em Atendimento','Resolvido','Recusado') GROUP BY status) x), '[]'::jsonb),
    'missing_locations', (SELECT count(*) FROM public.occurrences WHERE location IS NULL)) INTO report;
  IF report->'unknown_statuses' <> '[]'::jsonb OR (report->>'missing_locations')::bigint > 0 THEN
    RAISE EXCEPTION 'LEGACY_SANITATION_REQUIRED: %', report;
  END IF;
END $$;

CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), municipality_id text NOT NULL,
  name text NOT NULL, is_default boolean NOT NULL DEFAULT false,
  UNIQUE(municipality_id,name)
);
CREATE UNIQUE INDEX groups_one_default ON public.groups(municipality_id) WHERE is_default;
INSERT INTO public.groups (municipality_id,name,is_default) VALUES ('sa_patrulha','Triagem inicial',true);
CREATE TABLE public.admin_profiles (
  user_id uuid PRIMARY KEY, municipality_id text NOT NULL, name text NOT NULL,
  phone text, role text NOT NULL CHECK(role IN ('CONSULTA','OPERADOR','GESTOR','ADMINISTRADOR')),
  state text NOT NULL DEFAULT 'PENDENTE' CHECK(state IN ('PENDENTE','ATIVO','SUSPENSO','DESATIVADO')),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0)
);
CREATE TABLE public.user_group_memberships (
  user_id uuid REFERENCES public.admin_profiles(user_id), group_id uuid REFERENCES public.groups(id), PRIMARY KEY(user_id,group_id)
);
CREATE TABLE public.user_preferences (user_id uuid PRIMARY KEY REFERENCES public.admin_profiles(user_id), columns jsonb NOT NULL DEFAULT '[]');
CREATE TABLE public.status_presentations (code text PRIMARY KEY CHECK(code IN ('NOVA','EM_TRIAGEM','EM_ATENDIMENTO','RESOLVIDA','CANCELADA')), label text NOT NULL, display_order integer NOT NULL);
INSERT INTO public.status_presentations VALUES ('NOVA','Nova',1),('EM_TRIAGEM','Em triagem',2),('EM_ATENDIMENTO','Em atendimento',3),('RESOLVIDA','Resolvida',4),('CANCELADA','Cancelada',5);
CREATE TABLE public.status_transitions (from_status text REFERENCES public.status_presentations(code), to_status text REFERENCES public.status_presentations(code), enabled boolean NOT NULL DEFAULT true, roles jsonb NOT NULL DEFAULT '[]', reason_required boolean NOT NULL DEFAULT false, PRIMARY KEY(from_status,to_status));
CREATE TABLE public.risk_zones (
  zone_id uuid NOT NULL, version integer NOT NULL CHECK(version > 0), name text NOT NULL, type text NOT NULL,
  active boolean NOT NULL DEFAULT false, valid_from timestamptz, valid_to timestamptz,
  geometry geometry(MultiPolygon,4326) NOT NULL,
  PRIMARY KEY(zone_id,version), CHECK(ST_IsValid(geometry) AND NOT ST_IsEmpty(geometry)),
  CHECK(valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from)
);
CREATE INDEX risk_zones_geometry ON public.risk_zones USING gist(geometry);

ALTER TABLE public.occurrences
  ADD COLUMN legacy_status text,
  ADD COLUMN protocol text,
  ADD COLUMN accuracy double precision,
  ADD COLUMN priority text NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN group_id uuid REFERENCES public.groups(id),
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN needs_sanitation boolean NOT NULL DEFAULT false;
UPDATE public.occurrences SET legacy_status=status,
  status=CASE status WHEN 'Aberto' THEN 'NOVA' WHEN 'Em Atendimento' THEN 'EM_ATENDIMENTO' WHEN 'Resolvido' THEN 'RESOLVIDA' WHEN 'Recusado' THEN 'CANCELADA' END,
  protocol='LEGACY-' || id::text,
  group_id=(SELECT id FROM public.groups WHERE municipality_id='sa_patrulha' AND is_default),
  needs_sanitation=true;
ALTER TABLE public.occurrences
  ALTER COLUMN status SET DEFAULT 'NOVA', ALTER COLUMN location SET NOT NULL,
  ALTER COLUMN protocol SET NOT NULL, ALTER COLUMN group_id SET NOT NULL,
  ADD CONSTRAINT occurrences_protocol_unique UNIQUE(protocol),
  ADD CONSTRAINT occurrences_status CHECK(status IN ('NOVA','EM_TRIAGEM','EM_ATENDIMENTO','RESOLVIDA','CANCELADA')),
  ADD CONSTRAINT occurrences_priority CHECK(priority IN ('NORMAL','ALTA')),
  ADD CONSTRAINT occurrences_version CHECK(version > 0),
  ADD CONSTRAINT occurrences_accuracy CHECK(accuracy >= 0 AND accuracy < 'Infinity'::float8),
  ADD CONSTRAINT occurrences_native_accuracy CHECK(legacy_status IS NOT NULL OR accuracy IS NOT NULL);
CREATE INDEX occurrences_group_created ON public.occurrences(group_id,created_at DESC,id);
CREATE INDEX occurrences_location ON public.occurrences USING gist(location);
CREATE TABLE public.occurrence_private_data (
  occurrence_id uuid PRIMARY KEY REFERENCES public.occurrences(id), reporter_name text, reporter_contact text, photo_object_key text
);
INSERT INTO public.occurrence_private_data (occurrence_id,reporter_name,photo_object_key) SELECT id,reporter_name,photo_url FROM public.occurrences;
CREATE TABLE public.occurrence_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurrence_id uuid NOT NULL REFERENCES public.occurrences(id), kind text NOT NULL, actor_id uuid, at timestamptz NOT NULL DEFAULT now(), reason text, changes jsonb NOT NULL DEFAULT '{}');
CREATE INDEX occurrence_events_history ON public.occurrence_events(occurrence_id,at,id);
CREATE TABLE public.occurrence_classification_zones (occurrence_id uuid REFERENCES public.occurrences(id), zone_id uuid, zone_version integer, classified_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(occurrence_id,zone_id,zone_version), FOREIGN KEY(zone_id,zone_version) REFERENCES public.risk_zones(zone_id,version));
CREATE TABLE public.audit_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid, entity_id uuid NOT NULL, kind text NOT NULL, at timestamptz NOT NULL DEFAULT now(), reason text, changes jsonb NOT NULL DEFAULT '{}');
CREATE TABLE public.idempotency_keys (key text PRIMARY KEY, request_hash text NOT NULL, occurrence_id uuid UNIQUE REFERENCES public.occurrences(id), response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.occurrence_alerts (event_id uuid PRIMARY KEY REFERENCES public.occurrence_events(id), occurrence_id uuid NOT NULL REFERENCES public.occurrences(id), group_id uuid NOT NULL REFERENCES public.groups(id), priority text NOT NULL CHECK(priority IN ('NORMAL','ALTA')), status text NOT NULL REFERENCES public.status_presentations(code), at timestamptz NOT NULL DEFAULT now());
CREATE INDEX occurrence_alerts_group_at ON public.occurrence_alerts(group_id,at,event_id);
-- New tables are deny-by-default until access policies arrive in ticket 02.
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['groups','admin_profiles','user_group_memberships','user_preferences','status_presentations','status_transitions','risk_zones','occurrence_private_data','occurrence_events','occurrence_classification_zones','audit_events','idempotency_keys','occurrence_alerts'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
  END LOOP;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrence_alerts;
COMMIT;
