BEGIN;
-- Adoption bridge: the deployed legacy has a risk_zones table absent from
-- 0_legacy. Preserve its physical rows before Core claims that name.
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public'
    AND table_name='risk_zones' AND column_name='geojson') THEN
    IF to_regclass('public.legacy_risk_zones') IS NOT NULL THEN
      RAISE EXCEPTION 'LEGACY_RISK_ZONE_ARCHIVE_ALREADY_EXISTS';
    END IF;
    ALTER TABLE public.risk_zones RENAME TO legacy_risk_zones;
    ALTER TABLE public.legacy_risk_zones RENAME CONSTRAINT risk_zones_pkey TO legacy_risk_zones_pkey;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.legacy_risk_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  description text, risk_level text NOT NULL DEFAULT 'Alto',
  color text NOT NULL DEFAULT '#ef4444', coordinates jsonb NOT NULL,
  geojson jsonb NOT NULL, municipio text NOT NULL DEFAULT 'Santo Antônio da Patrulha',
  created_by text, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legacy_risk_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY core_legacy_zones_archived ON public.legacy_risk_zones
  AS RESTRICTIVE FOR ALL TO PUBLIC USING(false) WITH CHECK(false);
REVOKE ALL ON public.legacy_risk_zones FROM PUBLIC,authenticated;
DO $$ BEGIN
  IF EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON public.legacy_risk_zones FROM anon;
  END IF;
  IF EXISTS(SELECT FROM pg_publication_tables WHERE pubname='supabase_realtime'
    AND schemaname='public' AND tablename='legacy_risk_zones') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.legacy_risk_zones;
  END IF;
END $$;
COMMIT;
