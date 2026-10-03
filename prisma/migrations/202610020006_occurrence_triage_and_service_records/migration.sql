BEGIN;

CREATE TABLE public.occurrence_registering_institutions (
  code text PRIMARY KEY,
  label text NOT NULL UNIQUE,
  display_order smallint NOT NULL
);
CREATE TABLE public.occurrence_neighborhoods (
  code text PRIMARY KEY,
  label text NOT NULL UNIQUE,
  display_order smallint NOT NULL
);
CREATE TABLE public.occurrence_localities (
  code text PRIMARY KEY,
  label text NOT NULL UNIQUE,
  display_order smallint NOT NULL
);
CREATE TABLE public.occurrence_damage_locations (
  code text PRIMARY KEY,
  label text NOT NULL UNIQUE,
  display_order smallint NOT NULL
);
CREATE TABLE public.occurrence_service_agencies (
  code text PRIMARY KEY,
  label text NOT NULL UNIQUE,
  display_order smallint NOT NULL
);

INSERT INTO public.occurrence_registering_institutions(code,label,display_order) VALUES
  ('CIDADAO','Cidadão',0),
  ('BOMBEIROS_MILITAR','BOMBEIROS MILITAR',1),
  ('DEFESA_CIVIL','DEFESA CIVIL',2);

INSERT INTO public.occurrence_neighborhoods(code,label,display_order) VALUES
  ('BOM_PRINCIPIO','BOM PRINCÍPIO',1),
  ('CENTRO','CENTRO',2),
  ('CIDADE_ALTA','CIDADE ALTA',3),
  ('IMIGRANTES','IMIGRANTES',4),
  ('JAU','JAÚ',5),
  ('MADRE_TEREZA','MADRE TEREZA',6),
  ('MENINO_DEUS','MENINO DEUS',7),
  ('OSOLOPES','OSOLOPES',8),
  ('PASSO_DOS_RAMOS','PASSO DOS RAMOS',9),
  ('PITANGUEIRAS','PITANGUEIRAS',10),
  ('SANTA_TERESINHA','SANTA TERESINHA',11),
  ('VARZEA','VÁRZEA',12);

INSERT INTO public.occurrence_localities(code,label,display_order) VALUES
  ('PINHEIRINHOS_4D','PINHEIRINHOS - 4D',1),
  ('RESTINGA_4D','RESTINGA - 4D',2),
  ('CAMPESTRE_4D','CAMPESTRE - 4D',3),
  ('CATANDUVA_GRANDE_3D','CATANDUVA GRANDE - 3D',4),
  ('TAQUARAL_3D','TAQUARAL - 3D',5),
  ('PORTO_RAMOS_3D','PORTO RAMOS - 3D',6),
  ('SERRARIA_VELHA_3D','SERRARIA VELHA - 3D',7),
  ('ROCA_GRANDE_3D','ROÇA GRANDE - 3D',8),
  ('MACEGAO_3D','MACEGÃO - 3D',9),
  ('IMBIRUCU_2D','IMBIRUÇU - 2D',10),
  ('PEDRAS_BRANCA_2D','PEDRAS BRANCA - 2D',11),
  ('COSTA_DA_MIRAGUAI_2D','COSTA DA MIRAGUAI - 2D',12),
  ('PASSO_DAS_MOCAS_2D','PASSO DAS MOÇAS - 2D',13),
  ('VENTUROSA_2D','VENTUROSA - 2D',14),
  ('CATANDUVINHA_2D','CATANDUVINHA - 2D',15),
  ('MORRO_AGUDO_2D','MORRO AGUDO - 2D',16),
  ('VILA_PALMEIRA_2D','VILA PALMEIRA - 2D',17),
  ('PASSO_DO_SABIA_2D','PÁSSO DO SABIÁ - 2D',18),
  ('TAPUMES_6D','TAPUMES - 6D',19),
  ('LOMBAS_6D','LOMBAS - 6D',20),
  ('BARROCADAS_6D','BARROCADAS - 6D',21),
  ('CHICO_LUMA_6D','CHICO LUMÃ - 6D',22),
  ('MORRO_GRANDE_6D','MORRO GRANDE - 6D',23),
  ('PASSO_DA_FORQUILHA_5D','PASSO DA FORQUILHA - 5D',24),
  ('ARROIO_GRANDE_5D','ARROIO GRANDE - 5D',25),
  ('MONJOLO_5D','MONJOLO - 5D',26),
  ('EVARISTO_5D','EVARISTO - 5D',27),
  ('CANTO_DOS_GUILHERMES_5D','CANTO DOS GUILHERMES - 5D',28),
  ('BAIXA_GRANDE_5D','BAIXA GRANDE - 5D',29),
  ('SERTAO_CANTAGALO_5D','SERTÃO CANTAGALO - 5D',30),
  ('CANTA_GALO_5D','CANTA GALO - 5D',31),
  ('FURNAS_5D','FURNAS - 5D',32),
  ('RIBEIRAO_DO_MEIO_1D','RIBEIRÃO DO MEIO - 1D',33),
  ('RINCAO_DO_HERVAL_1D','RINCÃO DO HERVAL -1D',34),
  ('HERVAL_1D','HERVAL - 1D',35),
  ('MORRO_DO_PUPITO_1D','MORRO DO PUPITO - 1D',36),
  ('ARROIO_DO_CARVALHO_1D','ARROIO DO CARVALHO - 1D',37),
  ('ARROIO_DO_CARTUCHO_1D','ARROIO DO CARTUCHO - 1D',38),
  ('CANCELA_PRETA_1D','CANCELA PRETA - 1D',39),
  ('RIBEIRAO_1D','RIBEIRÃO - 1D',40),
  ('SERTAO_1D','SERTÃO - 1D',41),
  ('PALMEIRA_DO_SERTAO_1D','PALMEIRA DO SERTÃO - 1D',42),
  ('MONTENEGRO_1D','MONTENEGRO - 1D',43),
  ('PORTAO_1_1D','PORTÃO 1 - 1D',44),
  ('PORTAO_2_1D','PORTÃO 2 - 1D',45),
  ('CASQUEIRO_1D','CASQUEIRO - 1D',46),
  ('LAGOA_1D','LAGOA - 1D',47),
  ('RINCAO_DO_CAPIM_1D','RINCÃO DO CAPIM - 1D',48),
  ('AGASA_1D','AGASA - 1D',49),
  ('ALTO_RIBEIRAO_1D','ALTO RIBEIRÃO - 1D',50);

INSERT INTO public.occurrence_damage_locations(code,label,display_order) VALUES
  ('SEM_DANOS','SEM DANOS',1),
  ('CALCADA','CALÇADA',2),
  ('CONTAMINACAO_DO_AR','Contaminação do Ar',3),
  ('CURSO_D_AGUA','Curso d''água',4),
  ('EDIFICACAO_PRIVADA','Edificação Privada',5),
  ('EDIFICACAO_PUBLICA','Edificação Pública',6),
  ('OUTROS','Outros',7),
  ('PRACA','Praça',8),
  ('PREDIO','Prédio',9),
  ('VEICULOS','Veículos',10),
  ('VIA_PUBLICA_MUNICIPAL','Via Pública Municipal',11),
  ('HOSPITAL','Hospital',12),
  ('EMPRESA','Empresa',13),
  ('RESIDENCIA','Residencia',14),
  ('PAVILHAO','Pavilhão',15),
  ('VIA_PUBLICA_FEDERAL','Via Pública Federal',16),
  ('VIA_PUBLICA_ESTADUAL','Via Pública Estadual',17);

INSERT INTO public.occurrence_service_agencies(code,label,display_order) VALUES
  ('DEFESA_CIVIL','DEFESA CIVIL',1),
  ('BOMBEIROS_MILITAR','BOMBEIROS MILITAR',2),
  ('PREFEITURA','PREFEITURA',3),
  ('BRIGADA_MILITAR','BRIGADA MILITAR',4),
  ('POLICIA_CIVIL','POLICIA CIVIL',5),
  ('ESTADO','ESTADO',6),
  ('UNIAO','UNIÃO',7),
  ('BPRV','BPRv',8);

ALTER TABLE public.occurrences
  ADD COLUMN registering_institution_code text,
  ADD COLUMN neighborhood_code text,
  ADD COLUMN locality_code text,
  ADD COLUMN occurrence_situation text,
  ADD COLUMN damage_location_code text,
  ADD COLUMN damage_location_detail text,
  ADD COLUMN has_victims boolean,
  ADD COLUMN has_displaced boolean,
  ADD CONSTRAINT occurrences_registering_institution_fk FOREIGN KEY (registering_institution_code)
    REFERENCES public.occurrence_registering_institutions(code) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT occurrences_neighborhood_fk FOREIGN KEY (neighborhood_code)
    REFERENCES public.occurrence_neighborhoods(code) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT occurrences_locality_fk FOREIGN KEY (locality_code)
    REFERENCES public.occurrence_localities(code) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT occurrences_damage_location_fk FOREIGN KEY (damage_location_code)
    REFERENCES public.occurrence_damage_locations(code) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT occurrences_situation_valid CHECK (occurrence_situation IS NULL OR occurrence_situation IN ('EM_RISCO','JA_OCORREU')),
  ADD CONSTRAINT occurrences_damage_location_detail_valid CHECK (
    (damage_location_code='OUTROS' AND nullif(btrim(damage_location_detail),'') IS NOT NULL)
    OR (damage_location_code IS DISTINCT FROM 'OUTROS' AND damage_location_detail IS NULL)
  );

CREATE INDEX occurrences_registering_created ON public.occurrences(registering_institution_code,created_at DESC,id);
CREATE INDEX occurrences_neighborhood_created ON public.occurrences(neighborhood_code,created_at DESC,id);
CREATE INDEX occurrences_locality_created ON public.occurrences(locality_code,created_at DESC,id);
CREATE INDEX occurrences_damage_location_created ON public.occurrences(damage_location_code,created_at DESC,id);

CREATE TABLE public.occurrence_service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL,
  agency_code text NOT NULL,
  attending_person text NOT NULL,
  attended_at timestamptz NOT NULL,
  action text NOT NULL,
  outcome text,
  reinforcement_requested boolean NOT NULL DEFAULT false,
  actor_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  correction_of_id uuid,
  correction_reason text,
  CONSTRAINT occurrence_service_occurrence_fk FOREIGN KEY (occurrence_id)
    REFERENCES public.occurrences(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT occurrence_service_agency_fk FOREIGN KEY (agency_code)
    REFERENCES public.occurrence_service_agencies(code) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT occurrence_service_correction_fk FOREIGN KEY (correction_of_id)
    REFERENCES public.occurrence_service_records(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT occurrence_service_attending_person_valid CHECK (length(btrim(attending_person)) BETWEEN 1 AND 160),
  CONSTRAINT occurrence_service_action_valid CHECK (length(btrim(action)) BETWEEN 1 AND 4000),
  CONSTRAINT occurrence_service_outcome_valid CHECK (outcome IS NULL OR length(outcome) <= 4000),
  CONSTRAINT occurrence_service_correction_valid CHECK (
    (correction_of_id IS NULL AND correction_reason IS NULL)
    OR (correction_of_id IS NOT NULL AND length(btrim(correction_reason)) BETWEEN 10 AND 1000)
  )
);
CREATE INDEX occurrence_service_records_timeline ON public.occurrence_service_records(occurrence_id,attended_at,id);
CREATE INDEX occurrence_service_records_agency ON public.occurrence_service_records(agency_code,occurrence_id);

CREATE FUNCTION public.core_validate_occurrence_service_record() RETURNS trigger
LANGUAGE plpgsql
SET search_path=pg_catalog,public
AS $$
BEGIN
  IF NEW.actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'SERVICE_RECORD_ACTOR_MISMATCH' USING ERRCODE='42501';
  END IF;
  IF NEW.correction_of_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.occurrence_service_records prior
    WHERE prior.id=NEW.correction_of_id AND prior.occurrence_id=NEW.occurrence_id
  ) THEN
    RAISE EXCEPTION 'SERVICE_RECORD_CORRECTION_SCOPE_MISMATCH' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION public.core_validate_occurrence_service_record() FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;
CREATE TRIGGER core_occurrence_service_record_validate
  BEFORE INSERT ON public.occurrence_service_records
  FOR EACH ROW EXECUTE FUNCTION public.core_validate_occurrence_service_record();

ALTER TABLE public.occurrence_registering_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_localities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_damage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_service_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_service_records ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.occurrence_registering_institutions,public.occurrence_neighborhoods,public.occurrence_localities,
  public.occurrence_damage_locations,public.occurrence_service_agencies,public.occurrence_service_records
  FROM PUBLIC,anon,authenticated,geoalerta_ingest;
GRANT SELECT ON public.occurrence_registering_institutions,public.occurrence_neighborhoods,public.occurrence_localities,
  public.occurrence_damage_locations,public.occurrence_service_agencies TO geoalerta_runtime;
GRANT SELECT ON public.occurrence_service_records TO geoalerta_runtime;
GRANT INSERT (occurrence_id,agency_code,attending_person,attended_at,action,outcome,reinforcement_requested,correction_of_id,correction_reason)
  ON public.occurrence_service_records TO geoalerta_runtime;

CREATE POLICY core_occurrence_registering_institutions_read ON public.occurrence_registering_institutions
  FOR SELECT TO geoalerta_runtime USING (true);
CREATE POLICY core_occurrence_neighborhoods_read ON public.occurrence_neighborhoods
  FOR SELECT TO geoalerta_runtime USING (true);
CREATE POLICY core_occurrence_localities_read ON public.occurrence_localities
  FOR SELECT TO geoalerta_runtime USING (true);
CREATE POLICY core_occurrence_damage_locations_read ON public.occurrence_damage_locations
  FOR SELECT TO geoalerta_runtime USING (true);
CREATE POLICY core_occurrence_service_agencies_read ON public.occurrence_service_agencies
  FOR SELECT TO geoalerta_runtime USING (true);
CREATE POLICY core_occurrence_service_records_read ON public.occurrence_service_records
  FOR SELECT TO geoalerta_runtime USING (
    EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id=occurrence_id AND o.deleted_at IS NULL AND public.core_has_access(o.group_id,'read')
    )
  );
CREATE POLICY core_occurrence_service_records_insert ON public.occurrence_service_records
  FOR INSERT TO geoalerta_runtime WITH CHECK (
    actor_id=auth.uid() AND EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id=occurrence_id AND o.deleted_at IS NULL AND public.core_has_access(o.group_id,'operate')
    )
  );

COMMIT;
