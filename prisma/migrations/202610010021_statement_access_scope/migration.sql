BEGIN;
-- The scope depends on the current persisted actor, never on a target row or
-- editable JWT metadata. Scalar SELECT callers let PostgreSQL compute it once
-- per statement without retaining privileges across later statements.
CREATE FUNCTION geoalerta_private.accessible_groups(capability text)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
  SELECT coalesce(array_agg(g.id ORDER BY g.id),'{}'::uuid[])
  FROM public.admin_profiles p JOIN public.groups g ON g.municipality_id=p.municipality_id
  WHERE p.user_id=(SELECT auth.uid()) AND p.state='ATIVO' AND p.municipality_id='sa_patrulha'
    AND (p.role='ADMINISTRADOR' OR EXISTS(
      SELECT FROM public.user_group_memberships m WHERE m.user_id=p.user_id AND m.group_id=g.id))
    AND CASE capability
      WHEN 'read' THEN true
      WHEN 'privateData' THEN p.role<>'CONSULTA'
      WHEN 'operate' THEN p.role IN ('OPERADOR','GESTOR','ADMINISTRADOR')
      WHEN 'reclassify' THEN p.role IN ('GESTOR','ADMINISTRADOR')
      WHEN 'export' THEN p.role IN ('GESTOR','ADMINISTRADOR')
      WHEN 'administer' THEN p.role='ADMINISTRADOR'
      ELSE false END
$$;
REVOKE ALL ON FUNCTION geoalerta_private.accessible_groups(text) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA geoalerta_private TO authenticated;
GRANT EXECUTE ON FUNCTION geoalerta_private.accessible_groups(text) TO geoalerta_runtime,authenticated;

DROP POLICY core_occurrence_read ON public.occurrences;
CREATE POLICY core_occurrence_read ON public.occurrences FOR SELECT TO geoalerta_runtime
  USING(deleted_at IS NULL AND group_id=ANY((SELECT geoalerta_private.accessible_groups('read'))::uuid[]));
DROP POLICY core_occurrence_admin_deleted_read ON public.occurrences;
CREATE POLICY core_occurrence_admin_deleted_read ON public.occurrences FOR SELECT TO geoalerta_runtime
  USING(deleted_at IS NOT NULL AND group_id=ANY((SELECT geoalerta_private.accessible_groups('administer'))::uuid[]));
DROP POLICY core_private_read ON public.occurrence_private_data;
CREATE POLICY core_private_read ON public.occurrence_private_data FOR SELECT TO geoalerta_runtime
  USING(EXISTS(SELECT FROM public.occurrences o WHERE o.id=occurrence_id
    AND o.group_id=ANY((SELECT geoalerta_private.accessible_groups('privateData'))::uuid[])));
DROP POLICY core_alert_read ON public.occurrence_alerts;
CREATE POLICY core_alert_read ON public.occurrence_alerts FOR SELECT TO geoalerta_runtime,authenticated
  USING(group_id=ANY((SELECT geoalerta_private.accessible_groups('read'))::uuid[]));
COMMIT;
