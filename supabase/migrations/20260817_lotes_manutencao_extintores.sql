-- ==============================================================================
-- MIGRAÇÃO SUPABASE: GESTÃO E RASTREABILIDADE DE LOTES DE MANUTENÇÃO DE EXTINTORES
-- Data: 17/08/2026
-- Objetivo: Criar entidades para Lote de Envio, Itens do Lote, Triagem de Retorno
--           e Histórico Perpétuo de Auditoria.
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE LOTES DE MANUTENÇÃO
CREATE TABLE IF NOT EXISTS public.lotes_manutencao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_lote TEXT UNIQUE NOT NULL,
    fornecedor_nome TEXT NOT NULL,
    fornecedor_cnpj TEXT,
    fornecedor_contato TEXT,
    status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO', -- 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO'
    total_itens INTEGER NOT NULL DEFAULT 0,
    total_aprovados INTEGER NOT NULL DEFAULT 0,
    total_condenados INTEGER NOT NULL DEFAULT 0,
    data_envio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    previsao_retorno DATE,
    data_finalizacao TIMESTAMPTZ,
    usuario_envio_id UUID,
    usuario_envio_nome TEXT NOT NULL DEFAULT 'Operador SPCI',
    usuario_envio_email TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABELA DE ITENS CONTIDOS NO LOTE
CREATE TABLE IF NOT EXISTS public.itens_lote_manutencao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id UUID NOT NULL REFERENCES public.lotes_manutencao(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    id_ativo TEXT NOT NULL,
    patrimonio TEXT,
    numero_serie TEXT,
    modelo_tipo TEXT,
    capacidade TEXT,
    fabricante TEXT,
    selo_inmetro_anterior TEXT,
    data_ultimo_hidro TEXT,
    data_ultima_recarga TEXT,
    status_triagem TEXT NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE', 'APROVADO', 'CONDENADO'
    novo_selo_inmetro TEXT,
    nova_validade_recarga DATE,
    nova_validade_hidro DATE,
    motivo_condenacao TEXT,
    laudo_url TEXT,
    data_triagem TIMESTAMPTZ,
    usuario_triagem_nome TEXT,
    observacoes_triagem TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. GARANTIR COLUNA DE VÍNCULO NO ATIVO (ASSETS)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'lote_manutencao_atual_id') THEN
            ALTER TABLE public.assets ADD COLUMN lote_manutencao_atual_id UUID REFERENCES public.lotes_manutencao(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 4. TABELA DE HISTÓRICO PERPÉTUO DE MOVIMENTAÇÕES E AUDITORIA (SE NÃO EXISTIR)
CREATE TABLE IF NOT EXISTS public.historico_movimentacoes_ativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID,
    id_ativo TEXT NOT NULL,
    tipo_evento TEXT NOT NULL, -- 'ENVIO_MANUTENCAO', 'RETORNO_APROVADO', 'CONDENACAO_ATIVO', 'MOVIMENTACAO_ESTOQUE'
    lote_id UUID REFERENCES public.lotes_manutencao(id) ON DELETE SET NULL,
    lote_numero TEXT,
    status_anterior TEXT,
    status_novo TEXT,
    usuario_nome TEXT NOT NULL DEFAULT 'Sistema SPCI',
    usuario_email TEXT,
    motivo TEXT,
    detalhes_tecnicos JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lotes_manutencao_status ON public.lotes_manutencao(status);
CREATE INDEX IF NOT EXISTS idx_lotes_manutencao_numero ON public.lotes_manutencao(numero_lote);
CREATE INDEX IF NOT EXISTS idx_lotes_manutencao_data_envio ON public.lotes_manutencao(data_envio DESC);

CREATE INDEX IF NOT EXISTS idx_itens_lote_lote_id ON public.itens_lote_manutencao(lote_id);
CREATE INDEX IF NOT EXISTS idx_itens_lote_asset_id ON public.itens_lote_manutencao(asset_id);
CREATE INDEX IF NOT EXISTS idx_itens_lote_status_triagem ON public.itens_lote_manutencao(status_triagem);

CREATE INDEX IF NOT EXISTS idx_hist_mov_asset_id ON public.historico_movimentacoes_ativos(asset_id);
CREATE INDEX IF NOT EXISTS idx_hist_mov_id_ativo ON public.historico_movimentacoes_ativos(id_ativo);
CREATE INDEX IF NOT EXISTS idx_hist_mov_lote_id ON public.historico_movimentacoes_ativos(lote_id);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.lotes_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_lote_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_movimentacoes_ativos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS permissivas para usuários autenticados e service_role
CREATE POLICY "Permitir leitura de lotes para todos autenticados" 
ON public.lotes_manutencao FOR SELECT USING (true);

CREATE POLICY "Permitir modificação de lotes para autenticados" 
ON public.lotes_manutencao FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir leitura de itens de lote para todos autenticados" 
ON public.itens_lote_manutencao FOR SELECT USING (true);

CREATE POLICY "Permitir modificação de itens de lote para autenticados" 
ON public.itens_lote_manutencao FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir leitura de historico para todos autenticados" 
ON public.historico_movimentacoes_ativos FOR SELECT USING (true);

CREATE POLICY "Permitir insercao de historico para autenticados" 
ON public.historico_movimentacoes_ativos FOR INSERT WITH CHECK (true);
