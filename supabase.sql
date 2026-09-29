-- ==========================================
-- GeoAlerta - SCRIPT DE BANCO DE DADOS
-- ==========================================

-- 1. Ativar a extensão de mapas e geolocalização (PostGIS)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Criar a tabela de Ocorrências
CREATE TABLE public.occurrences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL,
    description TEXT,
    -- location guardará a latitude e longitude nativamente
    location GEOGRAPHY(POINT, 4326),
    photo_url TEXT,
    status TEXT DEFAULT 'Aberto' NOT NULL,
    reporter_name TEXT,
    assigned_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Habilitar o "Realtime" para essa tabela (para o sininho de notificação funcionar)
ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrences;

-- 4. Criar o Bucket de Storage para guardar as fotos do Cidadão
INSERT INTO storage.buckets (id, name, public) 
VALUES ('occurrence_photos', 'occurrence_photos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Criar Políticas de Segurança Básicas (RLS - Row Level Security)
-- ATENÇÃO: Para o MVP, deixaremos aberto para o cidadão inserir e o app ler.
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

-- Permite qualquer pessoa ler (para plotar no mapa)
CREATE POLICY "Permitir leitura pública" ON public.occurrences
    FOR SELECT USING (true);

-- Permite qualquer pessoa inserir (cidadão na rua sem login)
CREATE POLICY "Permitir inserção anônima" ON public.occurrences
    FOR INSERT WITH CHECK (true);

-- Permite apenas gestores autenticados alterarem ocorrências
CREATE POLICY "Permitir apenas gestores autenticados alterarem" ON public.occurrences
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Permite apenas gestores autenticados excluirem ocorrências
CREATE POLICY "Permitir apenas gestores autenticados deletarem" ON public.occurrences
    FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Permite leitura de fotos no Storage
CREATE POLICY "Permitir leitura de fotos" ON storage.objects
    FOR SELECT USING (bucket_id = 'occurrence_photos');

-- Permite envio de fotos para o Storage
CREATE POLICY "Permitir upload de fotos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'occurrence_photos');
