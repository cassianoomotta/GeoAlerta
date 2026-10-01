BEGIN;

-- Deleted records stay hidden from operational roles but remain discoverable to Administrators.
CREATE POLICY core_occurrence_admin_deleted_read ON public.occurrences
  FOR SELECT TO geoalerta_runtime
  USING(deleted_at IS NOT NULL AND public.core_has_access(group_id,'administer'));

CREATE FUNCTION public.core_audit_occurrence_soft_delete() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
DECLARE
  actor uuid;
  reason_text text;
  event_kind text;
  change_details jsonb;
BEGIN
  IF NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at THEN
    RETURN NEW;
  END IF;
  actor := auth.uid();
  reason_text := nullif(btrim(current_setting('core.mutation_reason',true)), '');
  IF actor IS NULL OR NOT public.core_has_access(OLD.group_id,'administer') THEN
    RAISE EXCEPTION 'Only an active Administrator may delete or restore an occurrence.' USING ERRCODE='42501';
  END IF;
  IF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'A delete/restore must increment version once.' USING ERRCODE='40001';
  END IF;
  IF reason_text IS NULL OR length(reason_text)<10 THEN
    RAISE EXCEPTION 'A reason of at least 10 characters is required.' USING ERRCODE='42501';
  END IF;

  event_kind := CASE WHEN NEW.deleted_at IS NULL THEN 'OCCURRENCE_RESTORED' ELSE 'OCCURRENCE_DELETED' END;
  change_details := jsonb_build_object('deletedAt',jsonb_build_object('from',OLD.deleted_at,'to',NEW.deleted_at));
  INSERT INTO public.occurrence_events(occurrence_id,kind,actor_id,reason,changes)
    VALUES(OLD.id,event_kind,actor,reason_text,change_details);
  INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes)
    VALUES(actor,OLD.id,event_kind,reason_text,change_details);
  RETURN NEW;
END
$$;

CREATE TRIGGER core_occurrence_soft_delete_audit
  BEFORE UPDATE OF deleted_at ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.core_audit_occurrence_soft_delete();

REVOKE ALL ON FUNCTION public.core_audit_occurrence_soft_delete() FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest;

COMMIT;
