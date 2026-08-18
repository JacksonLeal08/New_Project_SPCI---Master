-- ==============================================================================
-- SCRIPT CONSOLIDADO SPCI MASTER: LOTES DE MANUTENÇÃO & FORNECEDORES
-- Data: 18/08/2026
-- Instruções: Copie todo este conteúdo, cole no SQL Editor do seu Dashboard Supabase e clique em RUN.
-- ==============================================================================

-- 1. TABELA DE FORNECEDORES / PRESTADORES DE MANUTENÇÃO
CREATE TABLE IF NOT EXISTS public.fornecedores_manutencao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT,
    registro_inmetro TEXT,
    telefone TEXT,
    whatsapp TEXT,
    email TEXT,
    contato_responsavel TEXT,
    endereco TEXT,
    cidade_uf TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_razao_social ON public.fornecedores_manutencao(razao_social);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON public.fornecedores_manutencao(cnpj);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON public.fornecedores_manutencao(ativo);

ALTER TABLE public.fornecedores_manutencao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura para todos autenticados" ON public.fornecedores_manutencao;
CREATE POLICY "Permitir leitura para todos autenticados"
    ON public.fornecedores_manutencao FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir inserção e edição para todos autenticados" ON public.fornecedores_manutencao;
CREATE POLICY "Permitir inserção e edição para todos autenticados"
    ON public.fornecedores_manutencao FOR ALL
    USING (true)
    WITH CHECK (true);

-- Fornecedores de referência iniciais
INSERT INTO public.fornecedores_manutencao (razao_social, nome_fantasia, cnpj, registro_inmetro, telefone, email, contato_responsavel, cidade_uf)
VALUES 
('Extinwal Comércio e Manutenção de Equipamentos de Segurança Ltda', 'Extinwal Segurança Contra Incêndio', '61.458.742/0001-90', 'INMETRO 002145/2023', '(11) 3245-8800', 'contato@extinwal.com.br', 'Eng. Roberto Silva', 'São Paulo / SP'),
('Bucka Spiero Engenharia e Equipamentos Contra Incêndio Ltda', 'Bucka Spiero Equipamentos', '52.124.987/0001-33', 'INMETRO 004891/2024', '(11) 4004-9200', 'engenharia@bucka.com.br', 'Carlos Eduardo', 'São Paulo / SP'),
('Mocelin Extintores & Engenharia de Prevenção Ltda', 'Mocelin Extintores', '14.982.341/0001-12', 'INMETRO 008712/2023', '(41) 3340-5500', 'comercial@mocelin.com.br', 'Juliana Ramos', 'Curitiba / PR'),
('Kidde Brasil Manutenções e Soluções de Incêndio Ltda', 'Kidde Brasil Manutenções', '48.910.231/0001-05', 'INMETRO 001923/2025', '(19) 3887-9000', 'suporte@kidde.com.br', 'Marcos Vinicius', 'Campinas / SP'),
('Resmat Engenharia e Combate a Incêndio Ltda', 'Resmat Engenharia', '09.334.812/0001-78', 'INMETRO 003450/2024', '(21) 2590-4400', 'tecnico@resmat.com.br', 'Fabio Almeida', 'Rio de Janeiro / RJ')
ON CONFLICT DO NOTHING;


-- 2. TABELA DE LOTES DE MANUTENÇÃO (CABEÇALHO DA EXPEDIÇÃO)
CREATE TABLE IF NOT EXISTS public.lotes_manutencao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_lote TEXT NOT NULL UNIQUE,
    fornecedor_id UUID REFERENCES public.fornecedores_manutencao(id) ON DELETE SET NULL,
    fornecedor_nome TEXT NOT NULL,
    fornecedor_cnpj TEXT,
    fornecedor_contato TEXT,
    data_envio TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    previsao_retorno DATE,
    data_conclusao TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO')),
    total_itens INTEGER NOT NULL DEFAULT 0,
    total_aprovados INTEGER NOT NULL DEFAULT 0,
    total_condenados INTEGER NOT NULL DEFAULT 0,
    usuario_envio_nome TEXT NOT NULL,
    usuario_envio_email TEXT,
    usuario_triagem_nome TEXT,
    usuario_triagem_email TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.lotes_manutencao ADD COLUMN IF NOT EXISTS fornecedor_contato TEXT;

CREATE INDEX IF NOT EXISTS idx_lotes_numero ON public.lotes_manutencao(numero_lote);
CREATE INDEX IF NOT EXISTS idx_lotes_status ON public.lotes_manutencao(status);
CREATE INDEX IF NOT EXISTS idx_lotes_fornecedor_nome ON public.lotes_manutencao(fornecedor_nome);
CREATE INDEX IF NOT EXISTS idx_lotes_data_envio ON public.lotes_manutencao(data_envio);

ALTER TABLE public.lotes_manutencao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de lotes" ON public.lotes_manutencao;
CREATE POLICY "Permitir leitura de lotes"
    ON public.lotes_manutencao FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir escrita de lotes" ON public.lotes_manutencao;
CREATE POLICY "Permitir escrita de lotes"
    ON public.lotes_manutencao FOR ALL
    USING (true)
    WITH CHECK (true);


-- 3. TABELA DE ITENS DO LOTE DE MANUTENÇÃO (EXTINTORES ENVIADOS E RETORNADOS)
CREATE TABLE IF NOT EXISTS public.itens_lote_manutencao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id UUID NOT NULL REFERENCES public.lotes_manutencao(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL,
    id_ativo TEXT NOT NULL,
    patrimonio TEXT,
    numero_serie TEXT,
    modelo_tipo TEXT,
    capacidade TEXT,
    fabricante TEXT,
    
    -- Snapshot do envio
    selo_inmetro_anterior TEXT,
    data_ultimo_hidro TEXT,
    data_ultima_recarga TEXT,
    
    -- Resultado da Triagem / Retorno
    status_triagem TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status_triagem IN ('PENDENTE', 'APROVADO', 'CONDENADO')),
    novo_selo_inmetro TEXT,
    nova_validade_recarga DATE,
    nova_validade_hidro DATE,
    motivo_condenacao TEXT,
    laudo_tecnico_url TEXT,
    observacoes_triagem TEXT,
    triado_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_itens_lote_id ON public.itens_lote_manutencao(lote_id);
CREATE INDEX IF NOT EXISTS idx_itens_asset_id ON public.itens_lote_manutencao(asset_id);
CREATE INDEX IF NOT EXISTS idx_itens_status_triagem ON public.itens_lote_manutencao(status_triagem);

ALTER TABLE public.itens_lote_manutencao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de itens do lote" ON public.itens_lote_manutencao;
CREATE POLICY "Permitir leitura de itens do lote"
    ON public.itens_lote_manutencao FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir escrita de itens do lote" ON public.itens_lote_manutencao;
CREATE POLICY "Permitir escrita de itens do lote"
    ON public.itens_lote_manutencao FOR ALL
    USING (true)
    WITH CHECK (true);


-- 4. TABELA DE HISTÓRICO PERPÉTUO DE MOVIMENTAÇÕES DE ATIVOS
CREATE TABLE IF NOT EXISTS public.historico_movimentacoes_ativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id TEXT NOT NULL,
    id_ativo TEXT NOT NULL,
    lote_id UUID REFERENCES public.lotes_manutencao(id) ON DELETE SET NULL,
    numero_lote TEXT,
    status_origem TEXT NOT NULL,
    status_destino TEXT NOT NULL,
    tipo_evento TEXT NOT NULL,
    descricao_evento TEXT NOT NULL,
    usuario_responsavel_nome TEXT NOT NULL,
    usuario_responsavel_email TEXT,
    detalhes_alteracao JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_hist_mov_asset_id ON public.historico_movimentacoes_ativos(asset_id);
CREATE INDEX IF NOT EXISTS idx_hist_mov_lote_id ON public.historico_movimentacoes_ativos(lote_id);
CREATE INDEX IF NOT EXISTS idx_hist_mov_created_at ON public.historico_movimentacoes_ativos(created_at DESC);

ALTER TABLE public.historico_movimentacoes_ativos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de historico" ON public.historico_movimentacoes_ativos;
CREATE POLICY "Permitir leitura de historico"
    ON public.historico_movimentacoes_ativos FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir escrita de historico" ON public.historico_movimentacoes_ativos;
CREATE POLICY "Permitir escrita de historico"
    ON public.historico_movimentacoes_ativos FOR ALL
    USING (true)
    WITH CHECK (true);


-- 5. ADIÇÃO DE COLUNA DE CONTROLE NA TABELA ASSETS (SE EXISTIR)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'assets'
    ) THEN
        ALTER TABLE public.assets 
        ADD COLUMN IF NOT EXISTS lote_manutencao_atual_id UUID REFERENCES public.lotes_manutencao(id) ON DELETE SET NULL;
    END IF;
END $$;
