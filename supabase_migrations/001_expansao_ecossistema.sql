-- =============================================
-- GeoAlerta - EXPANSÃO DO ECOSSISTEMA (Módulos)
-- Rodar no SQL Editor do Supabase.
-- Módulo base (occurrences) já existente.
-- =============================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 0. SETTINGS (feature flags + dados do município)
-- =============================================
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
-- Gestores autenticados podem ler; só admin escreve (simplificação: autenticados)
CREATE POLICY "settings_leitura_autenticada" ON public.settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_escrita_autenticada" ON public.settings
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Flags iniciais (módulos ativos por município)
INSERT INTO public.settings (key, value) VALUES
  ('modules_v1', '{"monitoramento":true,"recursos":true,"abrigos":true,"equipes":true,"voluntarios":true}')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 1. MÓDULO RECURSOS (Estoque)
-- =============================================
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio TEXT NOT NULL DEFAULT 'sa_patrulha',
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Outros',
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  expiry_date DATE,
  shelter_id UUID,           -- se alocado a um abrigo (opcional)
  status TEXT NOT NULL DEFAULT 'Disponível',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resource_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  type TEXT NOT NULL,        -- 'entrada' | 'saida'
  quantity NUMERIC NOT NULL,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recursos_leitura" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "recursos_escrita" ON public.resources FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "movimentacoes_leitura" ON public.resource_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "movimentacoes_escrita" ON public.resource_movements FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- 2. MÓDULO ABRIGOS (tipos + pessoas associadas)
-- =============================================
CREATE TABLE IF NOT EXISTS public.shelters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio TEXT NOT NULL DEFAULT 'sa_patrulha',
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'humano',   -- 'humano' | 'pet' | 'misto'
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  capacity INTEGER NOT NULL DEFAULT 0,
  occupied INTEGER NOT NULL DEFAULT 0,
  phone TEXT,
  manager TEXT,
  status TEXT NOT NULL DEFAULT 'Aberto',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shelter_people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shelter_id UUID NOT NULL REFERENCES public.shelters(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cpf TEXT,
  age INTEGER,
  phone TEXT,
  has_pet BOOLEAN NOT NULL DEFAULT false,
  pet_details TEXT,          -- ex: "2 cães, 1 gato"
  notes TEXT,
  check_in_at TIMESTAMPTZ DEFAULT NOW(),
  check_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelter_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abrigos_leitura" ON public.shelters FOR SELECT TO authenticated USING (true);
CREATE POLICY "abrigos_escrita" ON public.shelters FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pessoas_leitura" ON public.shelter_people FOR SELECT TO authenticated USING (true);
CREATE POLICY "pessoas_escrita" ON public.shelter_people FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- 3. MÓDULO EQUIPES (resgate/socorro/desobstrução + GPS em tempo real)
-- =============================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio TEXT NOT NULL DEFAULT 'sa_patrulha',
  name TEXT NOT NULL,
  organ TEXT NOT NULL DEFAULT 'Defesa Civil',   -- Defesa Civil | Bombeiros | Obras | Saúde...
  type TEXT NOT NULL DEFAULT 'Resgate',          -- Resgate | Socorro | Desobstrução | Logística | Saúde
  leader TEXT,
  phone TEXT,
  vehicle TEXT,
  capacity TEXT,
  status TEXT NOT NULL DEFAULT 'Disponível',     -- Disponível | Em missão | Indisponível
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Agente',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Heartbeat de localização (GPS do celular dos agentes)
CREATE TABLE IF NOT EXISTS public.team_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_name TEXT,
  member_name TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_team_locations_team_sent ON public.team_locations(team_id, sent_at DESC);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipes_leitura" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipes_escrita" ON public.teams FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "membros_leitura" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "membros_escrita" ON public.team_members FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
-- Localização: agentes podem inserir (para enviar heartbeat); leitura autenticada
CREATE POLICY "localizacao_inserida_anonima" ON public.team_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "localizacao_leitura" ON public.team_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "localizacao_escrita" ON public.team_locations FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- 4. MÓDULO VOLUNTÁRIOS
-- =============================================
CREATE TABLE IF NOT EXISTS public.volunteers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio TEXT NOT NULL DEFAULT 'sa_patrulha',
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL DEFAULT 'Logística',  -- Jipeiro | Saúde | Logística | Barco/Embarcação | Cozinha | Motorista | Outro
  phone TEXT,
  email TEXT,
  vehicle TEXT,               -- ex: "Jipe Toyota Bandeirante"
  capacity TEXT,              -- ex: "4 passageiros", "caixa de resgate"
  available BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'Ativo',   -- Ativo | De prontidão | Indisponível
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voluntarios_leitura" ON public.volunteers FOR SELECT TO authenticated USING (true);
CREATE POLICY "voluntarios_escrita" ON public.volunteers FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);