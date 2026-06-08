-- Migração: Adicionar campo ano_fabricacao em ativos_extintores e atualizar view de conformidade
-- Autor: Arquiteto de Banco de Dados Master & Especialista Supabase
-- Data: 2026-06-08

-- 1. ADICIONAR COLUNA NA TABELA DE ATIVOS DE EXTINTORES
ALTER TABLE public.ativos_extintores 
ADD COLUMN IF NOT EXISTS ano_fabricacao INTEGER CHECK (ano_fabricacao BETWEEN 1900 AND 2100);

-- 2. POPULAR DADOS EXISTENTES (FALLBACK PARA O ANO DO TESTE HIDROSTÁTICO)
UPDATE public.ativos_extintores 
SET ano_fabricacao = ano_ultimo_teste_hidro 
WHERE ano_fabricacao IS NULL;

-- 3. DEFINIR CONSTRAINT NOT NULL COM VALOR DEFAULT CASO NÃO ESPECIFICADO NA CRIAÇÃO
-- ALTER TABLE public.ativos_extintores ALTER COLUMN ano_fabricacao SET NOT NULL;

-- 4. RECREAR A VIEW DE CONSULTA PÚBLICA & CONFORMIDADE INCLUINDO A COLUNA
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
    ae.ano_fabricacao, -- Nova coluna exposta na view para sincronização
    ae.foto_url,
    
    -- Datas Limite de Validade Calculadas
    (ae.data_ultima_recarga + (ae.meses_validade_recarga * INTERVAL '1 month'))::DATE AS data_limite_recarga,
    (make_date(ae.ano_ultimo_teste_hidro + 5, 12, 31))::DATE AS data_limite_hidro,
    
    -- Lógica de status de conformidade
    CASE 
        -- Regra 1: Qualquer um vencido
        WHEN CURRENT_DATE > (ae.data_ultima_recarga + (ae.meses_validade_recarga * INTERVAL '1 month')) 
             OR CURRENT_DATE > (make_date(ae.ano_ultimo_teste_hidro + 5, 12, 31)) 
        THEN 'VENCIDO'
        
        -- Regra 2: Faltando 30 dias ou menos para vencer
        WHEN (ae.data_ultima_recarga + (ae.meses_validade_recarga * INTERVAL '1 month'))::DATE - CURRENT_DATE <= 30
             OR (make_date(ae.ano_ultimo_teste_hidro + 5, 12, 31))::DATE - CURRENT_DATE <= 30
        THEN 'A VENCER'
        
        ELSE 'NO PRAZO'
    END AS status_conformidade
FROM public.ativos_extintores ae
JOIN public.locais l ON ae.local_id = l.id
LEFT JOIN public.sub_locais sl ON ae.sub_local_id = sl.id
JOIN public.modelos_extintores me ON ae.modelo_id = me.id;
