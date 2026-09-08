-- ============================================================================
-- SPCI MASTER - POLÍTICAS DE RLS PARA BUCKET fotos_extintores
-- Data: 07-09-2026
-- Objetivo: Garantir upload e leitura sem bloqueios no bucket fotos_extintores
-- ============================================================================

-- 1. Garante que o bucket fotos_extintores existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos_extintores', 'fotos_extintores', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Habilita políticas de leitura irrestrita no bucket fotos_extintores
DROP POLICY IF EXISTS "Leitura pública fotos_extintores" ON storage.objects;
CREATE POLICY "Leitura pública fotos_extintores"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos_extintores');

-- 3. Habilita políticas de inserção pública/anônima e autenticada no bucket fotos_extintores
DROP POLICY IF EXISTS "Inserção pública fotos_extintores" ON storage.objects;
CREATE POLICY "Inserção pública fotos_extintores"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fotos_extintores');

-- 4. Habilita políticas de atualização no bucket fotos_extintores
DROP POLICY IF EXISTS "Atualização pública fotos_extintores" ON storage.objects;
CREATE POLICY "Atualização pública fotos_extintores"
ON storage.objects FOR UPDATE
USING (bucket_id = 'fotos_extintores')
WITH CHECK (bucket_id = 'fotos_extintores');
