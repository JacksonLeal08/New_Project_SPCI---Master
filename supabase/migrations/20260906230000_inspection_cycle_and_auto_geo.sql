-- ============================================================================
-- MIGRAÇÃO: Ciclo Mensal de Inspeções, Enriquecimento Zero-GPS e Histórico
-- ============================================================================

-- 1. Colunas de ciclo de inspeção e geolocalização em ativos_extintores
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ativos_extintores') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'data_ultima_inspecao') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN data_ultima_inspecao TIMESTAMP WITH TIME ZONE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'status_inspecao_mes') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN status_inspecao_mes VARCHAR(50) DEFAULT 'PENDENTE';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'justificativa_reinspecao') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN justificativa_reinspecao TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'latitude') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN latitude DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'longitude') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN longitude DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'precisao_gps') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN precisao_gps DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'data_primeira_localizacao') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN data_primeira_localizacao TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;
END $$;

-- 2. Colunas de ciclo de inspeção e geolocalização na tabela assets
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'data_ultima_inspecao') THEN
            ALTER TABLE public.assets ADD COLUMN data_ultima_inspecao TIMESTAMP WITH TIME ZONE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'status_inspecao_mes') THEN
            ALTER TABLE public.assets ADD COLUMN status_inspecao_mes VARCHAR(50) DEFAULT 'PENDENTE';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'justificativa_reinspecao') THEN
            ALTER TABLE public.assets ADD COLUMN justificativa_reinspecao TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'data_primeira_localizacao') THEN
            ALTER TABLE public.assets ADD COLUMN data_primeira_localizacao TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;
END $$;

-- 3. Atualizar a View Pública de Extintores para expor data_ultima_inspecao e status do ciclo
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

-- 4. Função e Trigger para enriquecimento automático de inspeção e geolocalização
CREATE OR REPLACE FUNCTION public.fn_sync_inspecao_to_asset()
RETURNS TRIGGER AS $$
DECLARE
    v_patrimonio VARCHAR(100);
BEGIN
    v_patrimonio := UPPER(TRIM(NEW.asset_patrimonio));

    -- Atualiza na tabela ativos_extintores se for extintor
    IF v_patrimonio LIKE 'EXT-%' THEN
        UPDATE public.ativos_extintores
        SET 
            data_ultima_inspecao = NEW.data_inspecao,
            status_inspecao_mes = 'INSPECIONADO',
            latitude = COALESCE(ativos_extintores.latitude, NEW.latitude),
            longitude = COALESCE(ativos_extintores.longitude, NEW.longitude),
            precisao_gps = COALESCE(ativos_extintores.precisao_gps, NEW.precisao_gps),
            data_primeira_localizacao = CASE 
                WHEN ativos_extintores.latitude IS NULL AND NEW.latitude IS NOT NULL THEN NEW.data_inspecao
                ELSE ativos_extintores.data_primeira_localizacao 
            END,
            updated_at = timezone('utc'::text, now())
        WHERE UPPER(TRIM(numero_patrimonio)) = v_patrimonio
           OR id::text = NEW.asset_id::text;
    END IF;

    -- Atualiza na tabela genérica assets
    UPDATE public.assets
    SET 
        data_ultima_inspecao = NEW.data_inspecao,
        status_inspecao_mes = 'INSPECIONADO',
        status = NEW.status,
        latitude = COALESCE(assets.latitude, NEW.latitude),
        longitude = COALESCE(assets.longitude, NEW.longitude),
        data_primeira_localizacao = CASE 
            WHEN assets.latitude IS NULL AND NEW.latitude IS NOT NULL THEN NEW.data_inspecao
            ELSE assets.data_primeira_localizacao 
        END,
        updated_at = timezone('utc'::text, now())
    WHERE UPPER(TRIM(COALESCE(id_ativo, patrimonio))) = v_patrimonio
       OR id::text = NEW.asset_id::text;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_inspecao_to_asset ON public.inspecoes_realizadas;
CREATE TRIGGER tr_sync_inspecao_to_asset
    AFTER INSERT ON public.inspecoes_realizadas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_inspecao_to_asset();
