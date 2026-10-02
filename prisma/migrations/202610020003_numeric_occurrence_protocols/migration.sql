BEGIN;

LOCK TABLE public.occurrences IN ACCESS EXCLUSIVE MODE;

CREATE SEQUENCE public.occurrence_protocol_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE TEMP TABLE occurrence_protocol_remap ON COMMIT DROP AS
WITH last_numeric AS (
  SELECT COALESCE(MAX(protocol::bigint) FILTER (WHERE protocol ~ '^[0-9]+$'), 0) AS protocol
  FROM public.occurrences
), numbered AS (
  SELECT occurrence.id,
    (last_numeric.protocol + row_number() OVER (ORDER BY occurrence.created_at, occurrence.id))::text AS protocol
  FROM public.occurrences AS occurrence
  CROSS JOIN last_numeric
  WHERE occurrence.protocol LIKE 'LEGACY-%'
)
SELECT id, protocol FROM numbered;

ALTER TABLE occurrence_protocol_remap ADD PRIMARY KEY (id);

UPDATE public.occurrences AS occurrence
SET protocol = remap.protocol
FROM occurrence_protocol_remap AS remap
WHERE occurrence.id = remap.id;

UPDATE public.idempotency_keys AS cached
SET response = jsonb_set(cached.response, '{protocol}', to_jsonb(occurrence.protocol), true)
FROM public.occurrences AS occurrence
JOIN occurrence_protocol_remap AS remap ON remap.id = occurrence.id
WHERE cached.occurrence_id = occurrence.id;

ALTER TABLE public.occurrences
  ALTER COLUMN protocol SET DEFAULT nextval('public.occurrence_protocol_seq'::regclass)::text;

SELECT setval(
  'public.occurrence_protocol_seq'::regclass,
  COALESCE(max(protocol::bigint) FILTER (WHERE protocol ~ '^[0-9]+$'), 1),
  count(*) FILTER (WHERE protocol ~ '^[0-9]+$') > 0
)
FROM public.occurrences;

REVOKE ALL ON SEQUENCE public.occurrence_protocol_seq FROM PUBLIC, anon, authenticated, geoalerta_runtime, geoalerta_ingest;
GRANT USAGE ON SEQUENCE public.occurrence_protocol_seq TO geoalerta_runtime, geoalerta_ingest;

COMMIT;