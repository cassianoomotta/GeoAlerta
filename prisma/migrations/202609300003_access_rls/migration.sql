BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='geoalerta_runtime') THEN CREATE ROLE geoalerta_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='geoalerta_ingest') THEN CREATE ROLE geoalerta_ingest NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname IN ('geoalerta_runtime','geoalerta_ingest') AND (rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'Unsafe Core runtime role'; END IF;
END $$;
-- Helpers inspect CURRENT persisted access, never JWT role/group/user_metadata.
-- Fixed search_path and qualified relations prevent object substitution.
CREATE FUNCTION public.core_has_access(target_group uuid, capability text DEFAULT 'read') RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_profiles p JOIN public.groups g ON g.id=target_group
    WHERE p.user_id=auth.uid() AND p.state='ATIVO' AND p.municipality_id='sa_patrulha'
    AND g.municipality_id=p.municipality_id
    AND (p.role='ADMINISTRADOR' OR EXISTS (SELECT 1 FROM public.user_group_memberships m WHERE m.user_id=p.user_id AND m.group_id=g.id))
    AND CASE capability WHEN 'read' THEN true WHEN 'privateData' THEN p.role<>'CONSULTA'
      WHEN 'operate' THEN p.role IN ('OPERADOR','GESTOR','ADMINISTRADOR')
      WHEN 'reclassify' THEN p.role IN ('GESTOR','ADMINISTRADOR')
      WHEN 'export' THEN p.role IN ('GESTOR','ADMINISTRADOR')
      WHEN 'administer' THEN p.role='ADMINISTRADOR' ELSE false END)
$$;
REVOKE ALL ON FUNCTION public.core_has_access(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.core_has_access(uuid,text) TO geoalerta_runtime,authenticated;
GRANT USAGE ON SCHEMA public,auth TO geoalerta_runtime,geoalerta_ingest,authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO geoalerta_runtime,authenticated;
-- Remove permissive historical occurrence policies, preserving tables/data.
DO $$ DECLARE p record; t text; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='occurrences' LOOP
    EXECUTE format('DROP POLICY %I ON public.occurrences',p.policyname);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['occurrences','groups','admin_profiles','user_group_memberships','user_preferences','status_presentations','status_transitions','risk_zones','occurrence_private_data','occurrence_events','occurrence_classification_zones','audit_events','idempotency_keys','occurrence_alerts'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,geoalerta_runtime,geoalerta_ingest',t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  END LOOP;
END $$;
-- Legacy personal columns remain preserved but have no runtime SELECT grant.
GRANT SELECT(id,protocol,type,description,location,status,priority,group_id,version,created_at,updated_at,deleted_at,accuracy,needs_sanitation) ON public.occurrences TO geoalerta_runtime;
GRANT INSERT(id,protocol,type,description,location,status,priority,group_id,version,accuracy) ON public.occurrences TO geoalerta_runtime;
GRANT UPDATE(type,description,status,priority,group_id,version,updated_at,deleted_at) ON public.occurrences TO geoalerta_runtime;
CREATE POLICY core_occurrence_read ON public.occurrences FOR SELECT TO geoalerta_runtime USING(public.core_has_access(group_id));
CREATE POLICY core_occurrence_insert ON public.occurrences FOR INSERT TO geoalerta_runtime WITH CHECK(public.core_has_access(group_id,'operate'));
CREATE POLICY core_occurrence_update ON public.occurrences FOR UPDATE TO geoalerta_runtime USING(public.core_has_access(group_id,'operate')) WITH CHECK(public.core_has_access(group_id,'operate'));
GRANT SELECT ON public.admin_profiles,public.user_group_memberships,public.groups,public.status_presentations,public.status_transitions TO geoalerta_runtime;
CREATE POLICY core_own_profile ON public.admin_profiles FOR SELECT TO geoalerta_runtime USING(user_id=auth.uid());
CREATE POLICY core_own_memberships ON public.user_group_memberships FOR SELECT TO geoalerta_runtime USING(user_id=auth.uid() AND public.core_has_access(group_id));
CREATE POLICY core_groups ON public.groups FOR SELECT TO geoalerta_runtime USING(public.core_has_access(id));
CREATE POLICY core_status_labels ON public.status_presentations FOR SELECT TO geoalerta_runtime USING(EXISTS(SELECT 1 FROM public.groups));
CREATE POLICY core_status_rules ON public.status_transitions FOR SELECT TO geoalerta_runtime USING(EXISTS(SELECT 1 FROM public.groups));
GRANT SELECT,INSERT,UPDATE ON public.occurrence_private_data TO geoalerta_runtime;
CREATE POLICY core_private_read ON public.occurrence_private_data FOR SELECT TO geoalerta_runtime USING(EXISTS(SELECT 1 FROM public.occurrences o WHERE o.id=occurrence_id AND public.core_has_access(o.group_id,'privateData')));
CREATE POLICY core_private_insert ON public.occurrence_private_data FOR INSERT TO geoalerta_runtime WITH CHECK(EXISTS(SELECT 1 FROM public.occurrences o WHERE o.id=occurrence_id AND public.core_has_access(o.group_id,'operate')));
CREATE POLICY core_private_update ON public.occurrence_private_data FOR UPDATE TO geoalerta_runtime USING(EXISTS(SELECT 1 FROM public.occurrences o WHERE o.id=occurrence_id AND public.core_has_access(o.group_id,'operate'))) WITH CHECK(EXISTS(SELECT 1 FROM public.occurrences o WHERE o.id=occurrence_id AND public.core_has_access(o.group_id,'operate')));
GRANT SELECT,INSERT ON public.occurrence_events,public.occurrence_alerts TO geoalerta_runtime;
CREATE POLICY core_event_read ON public.occurrence_events FOR SELECT TO geoalerta_runtime USING(EXISTS(SELECT 1 FROM public.occurrences o WHERE o.id=occurrence_id AND public.core_has_access(o.group_id,'privateData')));
CREATE POLICY core_event_insert ON public.occurrence_events FOR INSERT TO geoalerta_runtime WITH CHECK(actor_id=auth.uid() AND EXISTS(SELECT 1 FROM public.occurrences o WHERE o.id=occurrence_id AND public.core_has_access(o.group_id,'operate')));
CREATE POLICY core_alert_read ON public.occurrence_alerts FOR SELECT TO geoalerta_runtime,authenticated USING(public.core_has_access(group_id));
CREATE POLICY core_alert_insert ON public.occurrence_alerts FOR INSERT TO geoalerta_runtime WITH CHECK(public.core_has_access(group_id,'operate'));
GRANT SELECT ON public.occurrence_alerts TO authenticated;
-- Stop publishing legacy columns containing citizen identity/photo URLs.
DO $$ BEGIN
  IF EXISTS(SELECT FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='occurrences') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.occurrences;
  END IF;
END $$;
COMMIT;
