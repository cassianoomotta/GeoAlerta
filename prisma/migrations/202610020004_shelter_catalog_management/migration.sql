BEGIN;

-- Prisma schema diff from the allowlisted Docker database.
ALTER TABLE public.shelter_people
  DROP CONSTRAINT shelter_people_shelter_id_fkey;
ALTER TABLE public.shelters
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.shelter_people
  ADD CONSTRAINT shelter_people_shelter_id_fkey
  FOREIGN KEY (shelter_id) REFERENCES public.shelters(id)
  ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Preserve existing legacy rows as-is. NOT VALID constraints protect new and
-- changed rows while incomplete legacy data can be corrected by an Admin.
ALTER TABLE public.shelters
  ADD CONSTRAINT core_shelters_coordinate_pair_check
    CHECK (
      (lat IS NULL AND lng IS NULL)
      OR (lat IS NOT NULL AND lng IS NOT NULL
        AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
    ) NOT VALID,
  ADD CONSTRAINT core_shelters_active_location_check
    CHECK (
      NOT is_active OR (
        address IS NOT NULL AND btrim(address) <> ''
        AND lat IS NOT NULL AND lng IS NOT NULL
        AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180
      )
    ) NOT VALID,
  ADD CONSTRAINT core_shelters_capacity_nonnegative_check CHECK (capacity >= 0) NOT VALID,
  ADD CONSTRAINT core_shelters_occupied_nonnegative_check CHECK (occupied >= 0) NOT VALID;

ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_legacy_modules_disabled ON public.shelters;
DROP POLICY IF EXISTS "abrigos_leitura" ON public.shelters;
DROP POLICY IF EXISTS "abrigos_escrita" ON public.shelters;

REVOKE ALL ON TABLE public.shelters
  FROM PUBLIC, anon, authenticated, geoalerta_runtime, geoalerta_ingest;
REVOKE ALL ON TABLE public.shelter_people
  FROM PUBLIC, anon, authenticated, geoalerta_runtime, geoalerta_ingest;

GRANT SELECT(id, municipio, name, type, address, lat, lng, status, is_active,
  capacity, occupied, phone, manager, notes, created_at)
  ON public.shelters TO geoalerta_runtime;
GRANT INSERT(municipio, name, type, address, lat, lng, capacity, occupied,
  phone, manager, status, notes, is_active)
  ON public.shelters TO geoalerta_runtime;
GRANT UPDATE(name, type, address, lat, lng, capacity, occupied, phone, manager,
  status, notes, is_active)
  ON public.shelters TO geoalerta_runtime;
GRANT DELETE ON public.shelters TO geoalerta_runtime;

GRANT SELECT(id, municipio, name, type, address, lat, lng, status, is_active)
  ON public.shelters TO geoalerta_ingest;

CREATE POLICY core_shelters_admin_read ON public.shelters
  FOR SELECT TO geoalerta_runtime
  USING (public.core_is_admin() AND municipio = 'sa_patrulha');
CREATE POLICY core_shelters_admin_insert ON public.shelters
  FOR INSERT TO geoalerta_runtime
  WITH CHECK (public.core_is_admin() AND municipio = 'sa_patrulha');
CREATE POLICY core_shelters_admin_update ON public.shelters
  FOR UPDATE TO geoalerta_runtime
  USING (public.core_is_admin() AND municipio = 'sa_patrulha')
  WITH CHECK (public.core_is_admin() AND municipio = 'sa_patrulha');
CREATE POLICY core_shelters_admin_delete ON public.shelters
  FOR DELETE TO geoalerta_runtime
  USING (public.core_is_admin() AND municipio = 'sa_patrulha');

CREATE POLICY core_shelters_public_catalog ON public.shelters
  FOR SELECT TO geoalerta_ingest
  USING (
    municipio = 'sa_patrulha' AND is_active AND status = 'Aberto'
    AND address IS NOT NULL AND btrim(address) <> ''
    AND lat IS NOT NULL AND lng IS NOT NULL
    AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180
  );

CREATE POLICY core_admin_shelter_audit_insert ON public.audit_events
  FOR INSERT TO geoalerta_runtime
  WITH CHECK (
    actor_id = auth.uid() AND public.core_is_admin()
    AND kind IN (
      'ADMIN_SHELTER_CREATED', 'ADMIN_SHELTER_UPDATED',
      'ADMIN_SHELTER_ACTIVATED', 'ADMIN_SHELTER_DEACTIVATED',
      'ADMIN_SHELTER_DELETED'
    )
  );

COMMIT;
