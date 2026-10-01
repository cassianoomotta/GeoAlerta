BEGIN;
-- Preserve original objects and historical URLs, while retiring permanent
-- anonymous downloads. Existing deployed bytes are copied/verified separately
-- by scripts/migrate-legacy-photos.mjs before activating this migration.
UPDATE storage.buckets SET public=false WHERE id='occurrence_photos';
CREATE POLICY core_legacy_evidence_deny ON storage.objects AS RESTRICTIVE
  FOR ALL TO PUBLIC USING(bucket_id<>'occurrence_photos')
  WITH CHECK(bucket_id<>'occurrence_photos');
COMMIT;
