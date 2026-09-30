BEGIN;
CREATE TABLE public.intake_rate_limits (
  origin_hash text NOT NULL, minute timestamptz NOT NULL, attempts integer NOT NULL CHECK(attempts BETWEEN 1 AND 20),
  PRIMARY KEY(origin_hash,minute)
);
ALTER TABLE public.intake_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intake_rate_limits FROM PUBLIC,anon,authenticated,geoalerta_runtime;
GRANT SELECT,INSERT,UPDATE ON public.intake_rate_limits TO geoalerta_ingest;
CREATE POLICY ingest_rate ON public.intake_rate_limits TO geoalerta_ingest
  USING(origin_hash=current_setting('core.origin_hash',true)) WITH CHECK(origin_hash=current_setting('core.origin_hash',true));
GRANT SELECT ON public.groups,public.risk_zones,public.idempotency_keys TO geoalerta_ingest;
GRANT INSERT ON public.idempotency_keys,public.occurrence_private_data,public.occurrence_events,public.occurrence_alerts,public.occurrence_classification_zones,public.audit_events TO geoalerta_ingest;
GRANT SELECT(id,protocol,status,priority,version,group_id) ON public.occurrences TO geoalerta_ingest;
GRANT INSERT(id,protocol,type,description,location,accuracy,status,priority,group_id) ON public.occurrences TO geoalerta_ingest;
CREATE POLICY ingest_default_group ON public.groups FOR SELECT TO geoalerta_ingest USING(is_default AND municipality_id='sa_patrulha');
CREATE POLICY ingest_zones ON public.risk_zones FOR SELECT TO geoalerta_ingest USING(active AND (valid_from IS NULL OR valid_from<=transaction_timestamp()) AND (valid_to IS NULL OR valid_to>transaction_timestamp()));
CREATE POLICY ingest_idempotency_read ON public.idempotency_keys FOR SELECT TO geoalerta_ingest USING(key=current_setting('core.attempt_key',true));
CREATE POLICY ingest_idempotency_write ON public.idempotency_keys FOR INSERT TO geoalerta_ingest WITH CHECK(key=current_setting('core.attempt_key',true) AND occurrence_id::text=current_setting('core.attempt_id',true));
CREATE POLICY ingest_occurrence_read ON public.occurrences FOR SELECT TO geoalerta_ingest USING(id::text=current_setting('core.attempt_id',true));
CREATE POLICY ingest_occurrence_write ON public.occurrences FOR INSERT TO geoalerta_ingest WITH CHECK(id::text=current_setting('core.attempt_id',true) AND group_id IN(SELECT id FROM public.groups) AND status='NOVA');
CREATE POLICY ingest_private ON public.occurrence_private_data FOR INSERT TO geoalerta_ingest WITH CHECK(occurrence_id::text=current_setting('core.attempt_id',true));
CREATE POLICY ingest_event ON public.occurrence_events FOR INSERT TO geoalerta_ingest WITH CHECK(occurrence_id::text=current_setting('core.attempt_id',true) AND actor_id IS NULL AND kind='OPENED');
CREATE POLICY ingest_alert ON public.occurrence_alerts FOR INSERT TO geoalerta_ingest WITH CHECK(occurrence_id::text=current_setting('core.attempt_id',true) AND group_id IN(SELECT id FROM public.groups));
CREATE POLICY ingest_classification ON public.occurrence_classification_zones FOR INSERT TO geoalerta_ingest WITH CHECK(occurrence_id::text=current_setting('core.attempt_id',true));
CREATE POLICY ingest_audit ON public.audit_events FOR INSERT TO geoalerta_ingest WITH CHECK(entity_id::text=current_setting('core.attempt_id',true) AND actor_id IS NULL AND kind='OPENED');
COMMIT;
