BEGIN;

-- Null stays meaningful for historical rows whose channel/position source cannot be proven.
ALTER TABLE public.occurrences
  ADD COLUMN registration_channel text,
  ADD COLUMN location_source text;

ALTER TABLE public.occurrences
  ADD CONSTRAINT occurrences_registration_channel_check
    CHECK (registration_channel IS NULL OR registration_channel IN ('PUBLICO','MANUAL','BATALHAO')),
  ADD CONSTRAINT occurrences_location_source_check
    CHECK (location_source IS NULL OR location_source IN ('GPS_NATIVO','MAPA'));

-- Keep native GPS accuracy for public/manual entries. Only the confirmed map point
-- used by the battalion flow can have unknown precision.
ALTER TABLE public.occurrences
  DROP CONSTRAINT occurrences_native_accuracy,
  ADD CONSTRAINT occurrences_native_accuracy CHECK (COALESCE(
    legacy_status IS NOT NULL
    OR (registration_channel IS NULL AND location_source IS NULL AND accuracy IS NOT NULL)
    OR (registration_channel IN ('PUBLICO','MANUAL') AND location_source='GPS_NATIVO' AND accuracy IS NOT NULL)
    OR (registration_channel='BATALHAO' AND location_source='MAPA' AND accuracy IS NULL),
    false
  ));

GRANT SELECT(registration_channel,location_source)
  ON public.occurrences TO geoalerta_runtime;
GRANT INSERT(registration_channel,location_source)
  ON public.occurrences TO geoalerta_runtime,geoalerta_ingest;

COMMIT;
