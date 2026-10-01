-- Apply only through the user-controlled Prisma Migrate deployment.
-- Requires actual Supabase Storage tables; deliberately fails on missing platform.
BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('core-occurrence-evidence','core-occurrence-evidence',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN
  IF NOT EXISTS(SELECT FROM storage.buckets WHERE id='core-occurrence-evidence' AND NOT public AND file_size_limit=5242880 AND allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp']) THEN
    RAISE EXCEPTION 'Core evidence bucket configuration must be reviewed';
  END IF;
END $$;
-- Restrictive policies prevent broad legacy policies from exposing Core objects.
-- No browser role gets upload, overwrite, download or signed-URL privileges here.
-- Storage service_role is restricted to server code and bypasses these policies;
-- the API checks current actor and row scope before requesting a 60-second URL.
CREATE POLICY core_evidence_deny_read ON storage.objects AS RESTRICTIVE FOR SELECT TO PUBLIC
  USING(bucket_id<>'core-occurrence-evidence');
CREATE POLICY core_evidence_deny_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO PUBLIC
  WITH CHECK(bucket_id<>'core-occurrence-evidence');
CREATE POLICY core_evidence_deny_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO PUBLIC
  USING(bucket_id<>'core-occurrence-evidence') WITH CHECK(bucket_id<>'core-occurrence-evidence');
CREATE POLICY core_evidence_deny_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO PUBLIC
  USING(bucket_id<>'core-occurrence-evidence');
COMMIT;
