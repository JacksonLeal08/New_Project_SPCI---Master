-- ==============================================================================
-- MIGRAÇÃO SUPABASE: Tabela de Checklists Configuráveis do SPCI
-- Data: 13/08/2026
-- Descrição: Cria a tabela checklists_ativos para armazenar quesitos NBR de vistorias
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.checklists_ativos (
    id TEXT PRIMARY KEY,
    ordem INTEGER NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'extintores',
    item TEXT NOT NULL,
    tipos_aplicaveis JSONB DEFAULT '["Todos"]'::jsonb,
    pesos_aplicaveis JSONB DEFAULT '["Todos"]'::jsonb,
    status TEXT NOT NULL DEFAULT 'Ativado',
    is_impeditivo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona a coluna is_impeditivo caso a tabela já exista em estruturas legadas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'checklists_ativos' 
          AND column_name = 'is_impeditivo'
    ) THEN
        ALTER TABLE public.checklists_ativos ADD COLUMN is_impeditivo BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Índice para acelerar a busca por categoria e ordem
CREATE INDEX IF NOT EXISTS idx_checklists_ativos_categoria_ordem 
ON public.checklists_ativos (categoria, ordem);

-- Habilita RLS (Row Level Security) e libera leitura/escrita para usuários autenticados e anon
ALTER TABLE public.checklists_ativos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de checklists" ON public.checklists_ativos;
CREATE POLICY "Permitir leitura pública de checklists" 
ON public.checklists_ativos FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir alteração pública de checklists" ON public.checklists_ativos;
CREATE POLICY "Permitir alteração pública de checklists" 
ON public.checklists_ativos FOR ALL 
USING (true) 
WITH CHECK (true);
