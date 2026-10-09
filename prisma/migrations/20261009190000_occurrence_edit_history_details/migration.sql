BEGIN;

-- Keep the occurrence timeline group-scoped and expose only safe edit fields.
DROP FUNCTION public.core_occurrence_history(uuid);

CREATE FUNCTION public.core_occurrence_history(target_occurrence uuid)
RETURNS TABLE(id uuid, kind text, "actorId" uuid, "actorName" text, at timestamptz, changes jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT e.id,e.kind,e.actor_id,actor_profile.name,e.at,
    CASE WHEN e.kind IN ('OCCURRENCE_EDITED','PRIORITY_RECLASSIFIED') THEN jsonb_strip_nulls(jsonb_build_object(
      'type',e.changes->'type',
      'priority',e.changes->'priority',
      'groupId',CASE WHEN e.changes ? 'groupId' THEN jsonb_build_object(
        'from',COALESCE(
          (SELECT to_jsonb(old_group.name) FROM public.groups old_group WHERE old_group.id::text=e.changes#>>'{groupId,from}'),
          e.changes#>'{groupId,from}'),
        'to',COALESCE(
          (SELECT to_jsonb(new_group.name) FROM public.groups new_group WHERE new_group.id::text=e.changes#>>'{groupId,to}'),
          e.changes#>'{groupId,to}')
      ) END
    )) ELSE NULL::jsonb END
  FROM public.occurrence_events e
  JOIN public.occurrences o ON o.id=e.occurrence_id
  JOIN public.groups occurrence_group ON occurrence_group.id=o.group_id
  LEFT JOIN public.admin_profiles actor_profile
    ON actor_profile.user_id=e.actor_id
    AND actor_profile.municipality_id=occurrence_group.municipality_id
  WHERE e.occurrence_id=target_occurrence
    AND o.deleted_at IS NULL
    AND public.core_has_access(o.group_id,'read')
  ORDER BY e.at,e.id
$$;

REVOKE ALL ON FUNCTION public.core_occurrence_history(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.core_occurrence_history(uuid) TO geoalerta_runtime;

COMMIT;
