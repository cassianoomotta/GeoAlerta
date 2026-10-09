BEGIN;

ALTER TABLE public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_role_check;
ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_role_check
  CHECK (role IN ('CONSULTA','VOLUNTARIO','OPERADOR','GESTOR','ADMINISTRADOR'));

-- Volunteers use the same least-privilege read-only scope as Consulta.
CREATE OR REPLACE FUNCTION geoalerta_private.accessible_groups(capability text)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
  SELECT coalesce(array_agg(g.id ORDER BY g.id),'{}'::uuid[])
  FROM public.admin_profiles p JOIN public.groups g ON g.municipality_id=p.municipality_id
  WHERE p.user_id=(SELECT auth.uid()) AND p.state='ATIVO' AND p.municipality_id='sa_patrulha'
    AND (p.role='ADMINISTRADOR' OR EXISTS(
      SELECT FROM public.user_group_memberships m WHERE m.user_id=p.user_id AND m.group_id=g.id))
    AND CASE capability
      WHEN 'read' THEN p.role IN ('CONSULTA','VOLUNTARIO','OPERADOR','GESTOR','ADMINISTRADOR')
      WHEN 'privateData' THEN p.role NOT IN ('CONSULTA','VOLUNTARIO')
      WHEN 'operate' THEN p.role IN ('OPERADOR','GESTOR','ADMINISTRADOR')
      WHEN 'reclassify' THEN p.role IN ('GESTOR','ADMINISTRADOR')
      WHEN 'export' THEN p.role IN ('GESTOR','ADMINISTRADOR')
      WHEN 'administer' THEN p.role='ADMINISTRADOR'
      ELSE false END
$$;

CREATE OR REPLACE FUNCTION public.core_can_read_climate_events() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles p
    WHERE p.user_id=(SELECT auth.uid()) AND p.state='ATIVO'
      AND p.role IN ('CONSULTA','VOLUNTARIO','OPERADOR','GESTOR','ADMINISTRADOR')
      AND (p.role='ADMINISTRADOR' OR EXISTS (
        SELECT 1 FROM public.user_group_memberships m
        JOIN public.groups g ON g.id=m.group_id
        WHERE m.user_id=p.user_id AND g.municipality_id=p.municipality_id
      ))
  )
$$;

DROP POLICY core_preferences_insert ON public.user_preferences;
CREATE POLICY core_preferences_insert ON public.user_preferences FOR INSERT TO geoalerta_runtime WITH CHECK(
  user_id=auth.uid() AND jsonb_typeof(columns)='array' AND jsonb_array_length(columns) BETWEEN 1 AND 8 AND
  EXISTS(SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.state='ATIVO' AND p.municipality_id='sa_patrulha'
    AND columns <@ CASE WHEN p.role IN ('CONSULTA','VOLUNTARIO') THEN '["protocol","createdAt","status","priority","type","groupId"]'::jsonb
      ELSE '["protocol","createdAt","status","priority","type","groupId","reporterName","reporterContact"]'::jsonb END));
DROP POLICY core_preferences_update ON public.user_preferences;
CREATE POLICY core_preferences_update ON public.user_preferences FOR UPDATE TO geoalerta_runtime USING(
  user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.state='ATIVO' AND p.municipality_id='sa_patrulha')) WITH CHECK(
  user_id=auth.uid() AND jsonb_typeof(columns)='array' AND jsonb_array_length(columns) BETWEEN 1 AND 8 AND
  EXISTS(SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.state='ATIVO' AND p.municipality_id='sa_patrulha'
    AND columns <@ CASE WHEN p.role IN ('CONSULTA','VOLUNTARIO') THEN '["protocol","createdAt","status","priority","type","groupId"]'::jsonb
      ELSE '["protocol","createdAt","status","priority","type","groupId","reporterName","reporterContact"]'::jsonb END));

COMMIT;
