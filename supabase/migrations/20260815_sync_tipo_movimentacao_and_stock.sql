-- ==============================================================================
-- MIGRAÇÃO SUPABASE: SINCRONIZAÇÃO E PADRONIZAÇÃO DE TIPO_MOVIMENTACAO E ESTOQUE
-- Data: 15/08/2026
-- Objetivo: Garantir que todos os ativos em estoque e em área possuam tipo_movimentacao
--           e status_estoque 100% consistentes e rastreáveis.
-- ==============================================================================

-- 1. Garantir que as colunas tipo_movimentacao e status_estoque existam na tabela assets
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'tipo_movimentacao') THEN
            ALTER TABLE public.assets ADD COLUMN tipo_movimentacao TEXT DEFAULT 'na_area_aplicado';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'status_estoque') THEN
            ALTER TABLE public.assets ADD COLUMN status_estoque TEXT DEFAULT 'ESTOQUE APLICAÇÃO';
        END IF;

        -- Sincronizar tipo_movimentacao com base em status_estoque para os 51 ativos
        UPDATE public.assets 
        SET tipo_movimentacao = 'estoque_aplicacao' 
        WHERE status_estoque = 'ESTOQUE APLICAÇÃO' 
           OR status_estoque ILIKE '%APLICA%' 
           OR tipo_movimentacao = 'estoque_aplicacao';

        UPDATE public.assets 
        SET tipo_movimentacao = 'estoque_ag_manut' 
        WHERE status_estoque = 'ESTOQUE MANUTENÇÃO' 
           OR status_estoque ILIKE '%AG. MANUT%' 
           OR status_estoque ILIKE '%MANUTENÇÃO%'
           OR tipo_movimentacao = 'estoque_ag_manut';

        UPDATE public.assets 
        SET tipo_movimentacao = 'condenado' 
        WHERE status_estoque = 'CONDENADOS' 
           OR status_estoque ILIKE '%CONDENAD%' 
           OR tipo_movimentacao = 'condenado';

        UPDATE public.assets 
        SET tipo_movimentacao = 'na_area_aplicado' 
        WHERE status_estoque = 'NA ÁREA (APLICADO)' 
           OR status_estoque ILIKE '%ÁREA%' 
           OR status_estoque ILIKE '%AREA%';

        CREATE INDEX IF NOT EXISTS idx_assets_tipo_movimentacao ON public.assets(tipo_movimentacao);
        CREATE INDEX IF NOT EXISTS idx_assets_status_estoque ON public.assets(status_estoque);
    END IF;
END $$;

-- 2. Garantir que as colunas existam na tabela ativos_extintores
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ativos_extintores') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ativos_extintores' AND column_name = 'tipo_movimentacao') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN tipo_movimentacao TEXT DEFAULT 'na_area_aplicado';
        END IF;

        UPDATE public.ativos_extintores 
        SET tipo_movimentacao = 'na_area_aplicado' 
        WHERE tipo_movimentacao IS NULL;

        CREATE INDEX IF NOT EXISTS idx_ativos_extintores_tipo_movimentacao ON public.ativos_extintores(tipo_movimentacao);
    END IF;
END $$;

-- 3. Atualizar a view pública vw_extintores_publico para expor tipo_movimentacao
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
