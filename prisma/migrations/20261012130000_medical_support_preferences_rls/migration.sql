BEGIN;

-- Keep the least-privilege column policy aligned with the columns exposed by
-- the list UI, including needsMedicalSupport for every read-only role.
DROP POLICY IF EXISTS core_preferences_insert ON public.user_preferences;
CREATE POLICY core_preferences_insert ON public.user_preferences FOR INSERT TO geoalerta_runtime WITH CHECK (
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
        WHEN p.role IN ('CONSULTA', 'VOLUNTARIO') THEN '["protocol","createdAt","status","priority","type","groupId","needsMedicalSupport"]'::jsonb
        ELSE '["protocol","createdAt","status","priority","type","groupId","needsMedicalSupport","reporterName","reporterContact"]'::jsonb
      END
  )
);

DROP POLICY IF EXISTS core_preferences_update ON public.user_preferences;
CREATE POLICY core_preferences_update ON public.user_preferences FOR UPDATE TO geoalerta_runtime USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.admin_profiles p
    WHERE p.user_id = auth.uid()
      AND p.state = 'ATIVO'
      AND p.municipality_id = 'sa_patrulha'
  )
) WITH CHECK (
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
        WHEN p.role IN ('CONSULTA', 'VOLUNTARIO') THEN '["protocol","createdAt","status","priority","type","groupId","needsMedicalSupport"]'::jsonb
        ELSE '["protocol","createdAt","status","priority","type","groupId","needsMedicalSupport","reporterName","reporterContact"]'::jsonb
      END
  )
);

COMMIT;
