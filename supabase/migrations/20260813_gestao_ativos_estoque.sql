-- ==============================================================================
-- MIGRAÇÃO SUPABASE: Módulo Gestão Ativo (Estoque & Movimentação Operacional)
-- Data: 13/08/2026
-- Descrição: Estrutura os status de estoque e a tabela de auditoria de movimentações.
-- ==============================================================================

-- 1. TIPO ENUM PARA STATUS DE ESTOQUE OPERACIONAL
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_estoque_enum') THEN
        CREATE TYPE status_estoque_enum AS ENUM (
            'ESTOQUE APLICAÇÃO',
            'ESTOQUE MANUTENÇÃO',
            'EM MANUTENÇÃO',
            'CONDENADOS'
        );
    END IF;
END $$;

-- 2. ADEQUAÇÃO NA TABELA DE ASSETS
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS status_estoque TEXT DEFAULT 'ESTOQUE APLICAÇÃO',
ADD COLUMN IF NOT EXISTS numero_serie TEXT,
ADD COLUMN IF NOT EXISTS patrimonio TEXT,
ADD COLUMN IF NOT EXISTS data_fabricacao DATE,
ADD COLUMN IF NOT EXISTS data_vencimento_teste DATE;

-- Índice para acelerar busca por status de estoque e patrimônio
CREATE INDEX IF NOT EXISTS idx_assets_status_estoque ON public.assets(status_estoque);
CREATE INDEX IF NOT EXISTS idx_assets_numero_serie ON public.assets(numero_serie);
CREATE INDEX IF NOT EXISTS idx_assets_patrimonio ON public.assets(patrimonio);

-- 3. TABELA DE RASTREABILIDADE E AUDITORIA DE MOVIMENTAÇÕES DE ATIVO
CREATE TABLE IF NOT EXISTS public.ativo_movimentacoes (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    asset_id TEXT NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    id_ativo TEXT NOT NULL,
    status_anterior TEXT,
    status_novo TEXT NOT NULL,
    motivo_movimentacao TEXT,
    usuario_id TEXT,
    usuario_nome TEXT NOT NULL DEFAULT 'Sistema',
    usuario_email TEXT,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de busca do histórico
CREATE INDEX IF NOT EXISTS idx_ativo_movimentacoes_asset_id ON public.ativo_movimentacoes(asset_id);
CREATE INDEX IF NOT EXISTS idx_ativo_movimentacoes_created_at ON public.ativo_movimentacoes(created_at DESC);

-- Habilita RLS (Row Level Security) em ativo_movimentacoes
ALTER TABLE public.ativo_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de movimentações" ON public.ativo_movimentacoes;
CREATE POLICY "Permitir leitura pública de movimentações" 
ON public.ativo_movimentacoes FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir inserção de movimentações" ON public.ativo_movimentacoes;
CREATE POLICY "Permitir inserção de movimentações" 
ON public.ativo_movimentacoes FOR ALL 
USING (true) 
WITH CHECK (true);
