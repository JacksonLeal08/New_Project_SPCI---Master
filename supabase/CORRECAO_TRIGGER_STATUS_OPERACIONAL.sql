-- ==============================================================================
-- CORREÇÃO DO TRIGGER DE SINCRONIZAÇÃO DE STATUS OPERACIONAL
-- SPCI Master - 18/09/2026
-- Objetivo: Alinhar os valores atribuídos pelo trigger ao tipo enum status_estoque_enum
--           ('ESTOQUE APLICAÇÃO', 'ESTOQUE MANUTENÇÃO', 'CONDENADO', 'APLICADO')
-- ==============================================================================

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
        NEW.status_estoque := 'ESTOQUE MANUTENÇÃO';
        NEW.tipo_movimentacao := 'em_manutencao';
        NEW.latitude := NULL;
        NEW.longitude := NULL;
    ELSIF NEW.status_operacional = 'CONDENADO_DESCARTE' THEN
        NEW.status_estoque := 'CONDENADO';
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
