BEGIN;

-- Runtime callers may use only the safe event projection directly. The
-- SECURITY DEFINER function below returns the approved timeline shape.
REVOKE SELECT ON public.occurrence_events FROM geoalerta_runtime;
GRANT SELECT(id,occurrence_id,kind,actor_id,at) ON public.occurrence_events TO geoalerta_runtime;

CREATE FUNCTION public.core_occurrence_history(target_occurrence uuid)
RETURNS TABLE(id uuid, kind text, "actorId" uuid, at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT e.id,e.kind,e.actor_id,e.at
  FROM public.occurrence_events e
  JOIN public.occurrences o ON o.id=e.occurrence_id
  WHERE e.occurrence_id=target_occurrence
    AND o.deleted_at IS NULL
    AND public.core_has_access(o.group_id,'read')
  ORDER BY e.at,e.id
$$;
REVOKE ALL ON FUNCTION public.core_occurrence_history(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.core_occurrence_history(uuid) TO geoalerta_runtime;

-- The detail projection needs the immutable classification link and the exact
-- versioned zone label. Both reads remain tied to occurrences the actor can read.
GRANT SELECT ON public.occurrence_classification_zones,public.risk_zones TO geoalerta_runtime;
CREATE POLICY core_classification_read ON public.occurrence_classification_zones
  FOR SELECT TO geoalerta_runtime
  USING(EXISTS(
    SELECT 1 FROM public.occurrences o
    WHERE o.id=occurrence_id AND public.core_has_access(o.group_id,'read')
  ));
CREATE POLICY core_risk_zone_read ON public.risk_zones
  FOR SELECT TO geoalerta_runtime
  USING(EXISTS(
    SELECT 1
    FROM public.occurrence_classification_zones cz
    JOIN public.occurrences o ON o.id=cz.occurrence_id
    WHERE cz.zone_id=risk_zones.zone_id
      AND cz.zone_version=risk_zones.version
      AND public.core_has_access(o.group_id,'read')
  ));

COMMIT;
