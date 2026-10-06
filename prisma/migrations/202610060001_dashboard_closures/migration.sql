BEGIN;

-- Internal aggregate projection: runtime cannot read the private changes/reason
-- columns. Preserve those restrictions rather than granting raw history access.
CREATE FUNCTION public.core_dashboard_closures(period_from timestamptz,period_to timestamptz)
RETURNS TABLE(day text,closed integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT to_char(e.at AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') AS day,
    count(DISTINCT e.occurrence_id)::integer AS closed
  FROM public.occurrence_events e
  JOIN public.occurrences o ON o.id=e.occurrence_id
  WHERE auth.uid() IS NOT NULL
    AND o.deleted_at IS NULL
    AND public.core_has_access(o.group_id,'read')
    AND e.kind='STATUS_TRANSITIONED'
    AND e.changes->'status'->>'from' IN ('NOVA','EM_TRIAGEM','EM_ATENDIMENTO')
    AND e.changes->'status'->>'to' IN ('RESOLVIDA','CANCELADA')
    AND (period_from IS NULL OR e.at>=period_from)
    AND (period_to IS NULL OR e.at<period_to)
  GROUP BY 1 ORDER BY 1
$$;
REVOKE ALL ON FUNCTION public.core_dashboard_closures(timestamptz,timestamptz) FROM PUBLIC,anon,authenticated,geoalerta_ingest;
GRANT EXECUTE ON FUNCTION public.core_dashboard_closures(timestamptz,timestamptz) TO geoalerta_runtime;
CREATE INDEX occurrence_events_dashboard_closures ON public.occurrence_events(at,occurrence_id)
  WHERE kind='STATUS_TRANSITIONED' AND changes->'status'->>'to' IN ('RESOLVIDA','CANCELADA');

COMMIT;
