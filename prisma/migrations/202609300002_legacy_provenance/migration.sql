BEGIN;
-- Only the historical backfill may establish legacy provenance. New callers
-- cannot bypass native accuracy requirements by claiming to be legacy rows.
CREATE FUNCTION public.protect_legacy_provenance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.legacy_status IS NOT NULL THEN
    RAISE EXCEPTION 'LEGACY_PROVENANCE_IMMUTABLE';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.legacy_status IS DISTINCT FROM OLD.legacy_status THEN
    RAISE EXCEPTION 'LEGACY_PROVENANCE_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_legacy_provenance BEFORE INSERT OR UPDATE ON public.occurrences
FOR EACH ROW EXECUTE FUNCTION public.protect_legacy_provenance();
COMMIT;
