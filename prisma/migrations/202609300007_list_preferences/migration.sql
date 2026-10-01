BEGIN;
GRANT SELECT,INSERT,UPDATE ON public.user_preferences TO geoalerta_runtime;
CREATE POLICY core_preferences_read ON public.user_preferences FOR SELECT TO geoalerta_runtime USING(
  user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.state='ATIVO' AND p.municipality_id='sa_patrulha'));
CREATE POLICY core_preferences_insert ON public.user_preferences FOR INSERT TO geoalerta_runtime WITH CHECK(
  user_id=auth.uid() AND jsonb_typeof(columns)='array' AND jsonb_array_length(columns) BETWEEN 1 AND 8 AND
  EXISTS(SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.state='ATIVO' AND p.municipality_id='sa_patrulha'
    AND columns <@ CASE WHEN p.role='CONSULTA' THEN '["protocol","createdAt","status","priority","type","groupId"]'::jsonb
      ELSE '["protocol","createdAt","status","priority","type","groupId","reporterName","reporterContact"]'::jsonb END));
CREATE POLICY core_preferences_update ON public.user_preferences FOR UPDATE TO geoalerta_runtime USING(
  user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.state='ATIVO' AND p.municipality_id='sa_patrulha')) WITH CHECK(
  user_id=auth.uid() AND jsonb_typeof(columns)='array' AND jsonb_array_length(columns) BETWEEN 1 AND 8 AND
  EXISTS(SELECT 1 FROM public.admin_profiles p WHERE p.user_id=auth.uid() AND p.state='ATIVO' AND p.municipality_id='sa_patrulha'
    AND columns <@ CASE WHEN p.role='CONSULTA' THEN '["protocol","createdAt","status","priority","type","groupId"]'::jsonb
      ELSE '["protocol","createdAt","status","priority","type","groupId","reporterName","reporterContact"]'::jsonb END));
COMMIT;
