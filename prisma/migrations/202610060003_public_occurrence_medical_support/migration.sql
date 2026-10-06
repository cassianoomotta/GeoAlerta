BEGIN;

-- Optional operational information; existing rows remain NULL (not informed).
ALTER TABLE public.occurrences
  ADD COLUMN needs_medical_support boolean;

-- Keep the restricted runtime and intake roles on explicit column grants.
GRANT SELECT(needs_medical_support)
  ON public.occurrences TO geoalerta_runtime;
GRANT INSERT(needs_medical_support)
  ON public.occurrences TO geoalerta_runtime,geoalerta_ingest;

COMMIT;
