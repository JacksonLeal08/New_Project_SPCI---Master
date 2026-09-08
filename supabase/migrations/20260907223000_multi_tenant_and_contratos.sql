-- Migração: Segregação Multi-Tenant por Contrato/Site & Tabela de Contratos (SPCI Master)
-- Data: 2026-09-08
-- Autor: Especialista em Segurança da Informação & Arquiteto Fullstack

-- 1. TABELA DE CONTRATOS (SITES OPERACIONAIS OFICIAIS)
CREATE TABLE IF NOT EXISTS public.contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir os Contratos Oficiais Iniciais
INSERT INTO public.contratos (nome, descricao) VALUES 
    ('SALOBO', 'Contrato Operacional Mina e Usina Salobo'),
    ('ONÇA PUMA', 'Contrato Operacional Complexo Onça Puma')
ON CONFLICT (nome) DO NOTHING;

-- 2. ADICIONAR COLUNA DE CONTRATO/SITE NAS TABELAS DE INFRAESTRUTURA E ATIVOS
ALTER TABLE public.locais 
ADD COLUMN IF NOT EXISTS site VARCHAR(100) DEFAULT 'ONÇA PUMA';

ALTER TABLE public.ativos_extintores 
ADD COLUMN IF NOT EXISTS site VARCHAR(100) DEFAULT 'ONÇA PUMA';

ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS site VARCHAR(100) DEFAULT 'ONÇA PUMA';

ALTER TABLE public.inspecoes_realizadas 
ADD COLUMN IF NOT EXISTS site VARCHAR(100) DEFAULT 'ONÇA PUMA';

-- 3. BACKFILL DE DADOS EXISTENTES (Todos os 601 extintores pertencem ao Contrato ONÇA PUMA)
UPDATE public.locais 
SET site = 'ONÇA PUMA' 
WHERE site IS NULL OR site = '';

UPDATE public.ativos_extintores 
SET site = 'ONÇA PUMA' 
WHERE site IS NULL OR site = '';

UPDATE public.assets 
SET site = 'ONÇA PUMA' 
WHERE site IS NULL OR site = '';

UPDATE public.inspecoes_realizadas 
SET site = 'ONÇA PUMA' 
WHERE site IS NULL OR site = '';

-- 4. ÍNDICES DE ALTA PERFORMANCE PARA ISOLAMENTO MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_ativos_extintores_site ON public.ativos_extintores(site);
CREATE INDEX IF NOT EXISTS idx_assets_site ON public.assets(site);
CREATE INDEX IF NOT EXISTS idx_inspecoes_realizadas_site ON public.inspecoes_realizadas(site);

-- 5. ATUALIZAR VIEW PÚBLICA DE EXTINTORES PARA EXPOR CONTRATO/SITE
CREATE OR REPLACE VIEW public.vw_extintores_publico AS
SELECT 
    ae.id,
    ae.qr_code_hash,
    ae.numero_patrimonio,
    ae.selo_inmetro,
    ae.chassi AS numero_serie,
    ae.peso_capacidade,
    me.nome AS modelo_tipo,
    l.nome AS local_instalacao,
    sl.nome AS sub_local_instalacao,
    ae.data_ultima_recarga,
    ae.ano_ultimo_teste_hidro,
    ae.foto_url,
    COALESCE(ae.tipo_movimentacao, 'na_area_aplicado') AS tipo_movimentacao,
    ae.data_ultima_inspecao,
    ae.latitude,
    ae.longitude,
    ae.precisao_gps,
    COALESCE(ae.site, l.site, 'ONÇA PUMA') AS site,
    
    -- Status da inspeção do mês corrente
    CASE 
        WHEN ae.data_ultima_inspecao IS NOT NULL 
             AND date_trunc('month', ae.data_ultima_inspecao) = date_trunc('month', CURRENT_DATE) 
        THEN 'INSPECIONADO'
        ELSE 'NAO_INSPECIONADO'
    END AS status_inspecao_mes,

    -- Datas Limite de Validade Calculadas
    (ae.data_ultima_recarga + (ae.meses_validade_recarga * INTERVAL '1 month'))::DATE AS data_limite_recarga,
    (make_date(ae.ano_ultimo_teste_hidro + 5, 12, 31))::DATE AS data_limite_hidro,
    
    -- Lógica de status de conformidade
    CASE 
        WHEN CURRENT_DATE > (ae.data_ultima_recarga + (ae.meses_validade_recarga * INTERVAL '1 month')) 
             OR CURRENT_DATE > (make_date(ae.ano_ultimo_teste_hidro + 5, 12, 31)) 
        THEN 'VENCIDO'
        
        WHEN (ae.data_ultima_recarga + (ae.meses_validade_recarga * INTERVAL '1 month'))::DATE - CURRENT_DATE <= 30
             OR (make_date(ae.ano_ultimo_teste_hidro + 5, 12, 31))::DATE - CURRENT_DATE <= 30
        THEN 'A VENCER'
        
        ELSE 'NO PRAZO'
    END AS status_conformidade
FROM public.ativos_extintores ae
JOIN public.locais l ON ae.local_id = l.id
LEFT JOIN public.sub_locais sl ON ae.sub_local_id = sl.id
JOIN public.modelos_extintores me ON ae.modelo_id = me.id;
