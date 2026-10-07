BEGIN;

-- Operators need the server to resolve the municipality's default group even
-- when they are not members. Visibility does not grant permission to operate.
CREATE POLICY core_default_group_lookup ON public.groups
  FOR SELECT TO geoalerta_runtime
  USING (
    is_default
    AND EXISTS (
      SELECT 1 FROM public.admin_profiles p
      WHERE p.user_id = auth.uid()
        AND p.state = 'ATIVO'
        AND p.municipality_id = groups.municipality_id
    )
  );

COMMIT;
