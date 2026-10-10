BEGIN;

CREATE OR REPLACE FUNCTION public.core_can_enter_panel() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_profiles p
    WHERE p.user_id=auth.uid()
      AND p.state='ATIVO'
      AND p.municipality_id='sa_patrulha'
      AND p.role IN ('CONSULTA','OPERADOR','GESTOR','ADMINISTRADOR')
      AND (
        p.role='ADMINISTRADOR'
        OR EXISTS (
          SELECT 1
          FROM public.user_group_memberships m
          JOIN public.groups g ON g.id=m.group_id
          WHERE m.user_id=p.user_id
            AND g.municipality_id=p.municipality_id
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.core_can_enter_panel() FROM PUBLIC,anon,geoalerta_ingest;
GRANT EXECUTE ON FUNCTION public.core_can_enter_panel() TO authenticated;

CREATE POLICY geoalerta_panel_presence_read
ON realtime.messages FOR SELECT TO authenticated
USING (
  extension='presence'
  AND (SELECT realtime.topic())='geoalerta:panel-presence'
  AND (SELECT public.core_can_enter_panel())
);

CREATE POLICY geoalerta_panel_presence_track
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  extension='presence'
  AND (SELECT realtime.topic())='geoalerta:panel-presence'
  AND (SELECT public.core_can_enter_panel())
);

COMMIT;
