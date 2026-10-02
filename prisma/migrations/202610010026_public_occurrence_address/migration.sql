BEGIN;

-- Address is optional for new intake and remains NULL on existing occurrences.
ALTER TABLE public.occurrences ADD COLUMN address text;

-- Preserve the restricted column-level access model for both Core database roles.
GRANT SELECT(address) ON public.occurrences TO geoalerta_runtime;
GRANT INSERT(address) ON public.occurrences TO geoalerta_runtime,geoalerta_ingest;

NOTIFY pgrst,'reload schema';
COMMIT;
