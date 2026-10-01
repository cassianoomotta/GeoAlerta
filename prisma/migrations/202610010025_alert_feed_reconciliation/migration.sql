BEGIN;
-- SECURITY INVOKER preserves the feed's existing role/group/state RLS.
-- A server-issued cursor avoids relying on the operator device's clock.
CREATE FUNCTION public.core_alert_snapshot(after_cursor timestamptz DEFAULT NULL)
RETURNS TABLE(server_time timestamptz,events jsonb)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path=pg_catalog,public AS $$
  SELECT statement_timestamp(),coalesce((
    SELECT jsonb_agg(to_jsonb(alert) ORDER BY alert.at DESC,alert.event_id)
    FROM (
      SELECT event_id,occurrence_id,group_id,priority,status,at
      FROM public.occurrence_alerts
      WHERE after_cursor IS NULL OR at>=after_cursor-interval '30 seconds'
      ORDER BY at DESC,event_id LIMIT 50
    ) alert
  ),'[]'::jsonb)
$$;
REVOKE ALL ON FUNCTION public.core_alert_snapshot(timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.core_alert_snapshot(timestamptz) TO authenticated,geoalerta_runtime;
NOTIFY pgrst,'reload schema';
COMMIT;
