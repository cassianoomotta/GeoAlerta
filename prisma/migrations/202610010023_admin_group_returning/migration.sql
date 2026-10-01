BEGIN;
-- INSERT RETURNING must see a newly inserted group in the same statement.
-- core_has_access looks up existing groups through a stable helper and cannot
-- authorize that new row yet; the administrator's persisted municipal scope can.
CREATE POLICY core_admin_groups_read ON public.groups FOR SELECT TO geoalerta_runtime
  USING(municipality_id='sa_patrulha' AND (SELECT public.core_is_admin()));
COMMIT;
