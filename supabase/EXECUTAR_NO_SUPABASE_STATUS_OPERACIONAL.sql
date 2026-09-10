-- ==============================================================================
-- SCRIPT PARA EXECUTAR NO SUPABASE SQL EDITOR: SPCI MASTER
-- DATA: 10/09/2026
-- OBJETIVO: STATUS OPERACIONAL ATÔMICO & DISTRIBUIÇÃO MATEMÁTICA EXATA (651 ATIVOS)
-- INSTRUÇÕES: 
-- 1. Acesse o painel Supabase (SQL Editor).
-- 2. Cole este script completo.
-- 3. Clique em RUN.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'assets' 
          AND column_name = 'status_operacional'
    ) THEN
        ALTER TABLE public.assets 
        ADD COLUMN status_operacional TEXT DEFAULT 'NA_AREA_APLICADO';
    END IF;
END $$;

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS chk_assets_status_operacional;
ALTER TABLE public.assets ADD CONSTRAINT chk_assets_status_operacional
CHECK (status_operacional IN (
    'NA_AREA_APLICADO',
    'ESTOQUE_APLICACAO',
    'ESTOQUE_MANUTENCAO',
    'EM_MANUTENCAO_EXTERNA',
    'CONDENADO_DESCARTE'
));

-- Sanitização dos 651 Ativos
UPDATE public.assets
SET status_operacional = 'ESTOQUE_MANUTENCAO',
    status_estoque = 'ESTOQUE MANUTENÇÃO',
    tipo_movimentacao = 'estoque_ag_manut',
    latitude = NULL,
    longitude = NULL
WHERE status_estoque = 'ESTOQUE MANUTENÇÃO' 
   OR tipo_movimentacao = 'estoque_ag_manut';

UPDATE public.assets
SET status_operacional = 'ESTOQUE_APLICACAO',
    status_estoque = 'ESTOQUE APLICAÇÃO',
    tipo_movimentacao = 'estoque_aplicacao'
WHERE (status_estoque = 'ESTOQUE APLICAÇÃO' AND tipo_movimentacao = 'estoque_aplicacao');

UPDATE public.assets
SET status_operacional = 'EM_MANUTENCAO_EXTERNA',
    status_estoque = 'EM MANUTENÇÃO',
    tipo_movimentacao = 'em_manutencao',
    latitude = NULL,
    longitude = NULL
WHERE status_estoque = 'EM MANUTENÇÃO' 
   OR tipo_movimentacao = 'em_manutencao';

UPDATE public.assets
SET status_operacional = 'CONDENADO_DESCARTE',
    status_estoque = 'CONDENADOS',
    tipo_movimentacao = 'condenado'
WHERE status_estoque = 'CONDENADOS' 
   OR tipo_movimentacao = 'condenado';

UPDATE public.assets
SET status_operacional = 'NA_AREA_APLICADO',
    status_estoque = NULL,
    tipo_movimentacao = 'na_area_aplicado'
WHERE status_operacional IS NULL 
   OR status_operacional = 'NA_AREA_APLICADO'
   OR (status_operacional NOT IN ('ESTOQUE_MANUTENCAO', 'ESTOQUE_APLICACAO', 'EM_MANUTENCAO_EXTERNA', 'CONDENADO_DESCARTE'));

CREATE INDEX IF NOT EXISTS idx_assets_status_operacional ON public.assets(status_operacional);

CREATE OR REPLACE FUNCTION public.fn_sync_asset_status_operacional()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status_operacional = 'ESTOQUE_APLICACAO' THEN
        NEW.status_estoque := 'ESTOQUE APLICAÇÃO';
        NEW.tipo_movimentacao := 'estoque_aplicacao';
    ELSIF NEW.status_operacional = 'ESTOQUE_MANUTENCAO' THEN
        NEW.status_estoque := 'ESTOQUE MANUTENÇÃO';
        NEW.tipo_movimentacao := 'estoque_ag_manut';
        NEW.latitude := NULL;
        NEW.longitude := NULL;
    ELSIF NEW.status_operacional = 'EM_MANUTENCAO_EXTERNA' THEN
        NEW.status_estoque := 'EM MANUTENÇÃO';
        NEW.tipo_movimentacao := 'em_manutencao';
        NEW.latitude := NULL;
        NEW.longitude := NULL;
    ELSIF NEW.status_operacional = 'CONDENADO_DESCARTE' THEN
        NEW.status_estoque := 'CONDENADOS';
        NEW.tipo_movimentacao := 'condenado';
    ELSIF NEW.status_operacional = 'NA_AREA_APLICADO' THEN
        NEW.status_estoque := NULL;
        NEW.tipo_movimentacao := 'na_area_aplicado';
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_asset_status_operacional ON public.assets;
CREATE TRIGGER trg_sync_asset_status_operacional
BEFORE INSERT OR UPDATE OF status_operacional ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_asset_status_operacional();

CREATE OR REPLACE VIEW public.vw_kpi_distribuicao_extintores AS
SELECT
    COUNT(*) FILTER (WHERE status_operacional = 'NA_AREA_APLICADO') AS na_area_aplicado,
    COUNT(*) FILTER (WHERE status_operacional = 'ESTOQUE_APLICACAO') AS estoque_aplicacao,
    COUNT(*) FILTER (WHERE status_operacional = 'ESTOQUE_MANUTENCAO') AS estoque_manutencao,
    COUNT(*) FILTER (WHERE status_operacional = 'EM_MANUTENCAO_EXTERNA') AS em_manutencao_externa,
    COUNT(*) FILTER (WHERE status_operacional = 'CONDENADO_DESCARTE') AS condenado_descarte,
    COUNT(*) AS total_extintores
FROM public.assets
WHERE category ILIKE '%extintor%';
