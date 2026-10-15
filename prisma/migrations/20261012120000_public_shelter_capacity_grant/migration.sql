BEGIN;

-- The public shelter catalog filters full shelters before returning records.
-- The ingestion role therefore needs column-level read access to both fields.
GRANT SELECT(capacity, occupied) ON public.shelters TO geoalerta_ingest;

-- Keep the row-level policy aligned with the public catalog contract so full
-- shelters are not visible to the ingestion role through another query path.
ALTER POLICY core_shelters_public_catalog ON public.shelters
  USING (
    municipio = 'sa_patrulha' AND is_active AND status = 'Aberto'
    AND (capacity = 0 OR occupied < capacity)
    AND address IS NOT NULL AND btrim(address) <> ''
    AND lat IS NOT NULL AND lng IS NOT NULL
    AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180
  );

COMMIT;
