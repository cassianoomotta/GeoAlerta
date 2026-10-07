BEGIN;

ALTER POLICY core_preferences_insert ON public.user_preferences
WITH CHECK (
  user_id = auth.uid()
  AND jsonb_typeof(columns) = 'array'
  AND jsonb_array_length(columns) BETWEEN 1 AND 9
  AND EXISTS (
    SELECT 1
    FROM public.admin_profiles p
    WHERE p.user_id = auth.uid()
      AND p.state = 'ATIVO'
      AND p.municipality_id = 'sa_patrulha'
      AND columns <@ CASE
        WHEN p.role = 'CONSULTA' THEN '["protocol","createdAt","status","priority","type","groupId","needsMedicalSupport"]'::jsonb
        ELSE '["protocol","createdAt","status","priority","type","groupId","needsMedicalSupport","reporterName","reporterContact"]'::jsonb
      END
  )
);

ALTER POLICY core_preferences_update ON public.user_preferences
WITH CHECK (
  user_id = auth.uid()
  AND jsonb_typeof(columns) = 'array'
  AND jsonb_array_length(columns) BETWEEN 1 AND 9
  AND EXISTS (
    SELECT 1
    FROM public.admin_profiles p
    WHERE p.user_id = auth.uid()
      AND p.state = 'ATIVO'
      AND p.municipality_id = 'sa_patrulha'
      AND columns <@ CASE
        WHEN p.role = 'CONSULTA' THEN '["protocol","createdAt","status","priority","type","groupId","needsMedicalSupport"]'::jsonb
        ELSE '["protocol","createdAt","status","priority","type","groupId","needsMedicalSupport","reporterName","reporterContact"]'::jsonb
      END
  )
);

COMMIT;
