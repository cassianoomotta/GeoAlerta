BEGIN;
CREATE OR REPLACE FUNCTION public.core_protect_operational_fields() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF current_user='geoalerta_runtime' THEN
    IF NEW.priority IS DISTINCT FROM OLD.priority AND NOT public.core_has_access(OLD.group_id,'reclassify') THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND NOT public.core_has_access(OLD.group_id,'administer') THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND OLD.status IN ('RESOLVIDA','CANCELADA') AND
      (NEW.status<>'EM_TRIAGEM' OR NOT public.core_has_access(OLD.group_id,'reclassify')) THEN
      RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.core_protect_operational_fields() FROM PUBLIC;
COMMIT;
