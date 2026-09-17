-- ==============================================================================
-- SUBSISTEMA CORPORATIVO DE LOCALIZAÇÃO OPERACIONAL (SSOT)
-- SPCI Master - Gestão Centralizada de Setores e Sub-Locais da Planta
-- ==============================================================================

-- 1. Criação da Tabela Mestre: localizacoes_operacionais
CREATE TABLE IF NOT EXISTS public.localizacoes_operacionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id TEXT NOT NULL DEFAULT 'ONÇA PUMA',
    projeto_site TEXT NOT NULL DEFAULT 'ONÇA PUMA',
    setor_planta TEXT NOT NULL,
    sub_local TEXT NOT NULL,
    prancha_projeto TEXT,
    area_operacional TEXT,
    codigo_instalacao_vale TEXT,
    gerencia_responsavel TEXT,
    diretoria_responsavel TEXT,
    is_ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Trava de Deduplicação Estrita (LOWER + TRIM em Setor e Sub-local por Contrato)
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_localizacoes_operacionais_unique 
ON public.localizacoes_operacionais (
    contrato_id, 
    LOWER(TRIM(setor_planta)), 
    LOWER(TRIM(sub_local))
);

-- 3. Índices de Alta Performance para Listagens, Filtros e Roteiros de Inspeção
CREATE INDEX IF NOT EXISTS idx_loc_op_contrato ON public.localizacoes_operacionais (contrato_id);
CREATE INDEX IF NOT EXISTS idx_loc_op_projeto ON public.localizacoes_operacionais (projeto_site);
CREATE INDEX IF NOT EXISTS idx_loc_op_setor ON public.localizacoes_operacionais (setor_planta);
CREATE INDEX IF NOT EXISTS idx_loc_op_sub_local ON public.localizacoes_operacionais (sub_local);
CREATE INDEX IF NOT EXISTS idx_loc_op_gerencia ON public.localizacoes_operacionais (gerencia_responsavel);
CREATE INDEX IF NOT EXISTS idx_loc_op_area ON public.localizacoes_operacionais (area_operacional);

-- 4. Gatilho para Atualização Automática de updated_at
CREATE OR REPLACE FUNCTION public.trg_fn_localizacoes_operacionais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_localizacoes_operacionais_updated_at ON public.localizacoes_operacionais;
CREATE TRIGGER trg_localizacoes_operacionais_updated_at
    BEFORE UPDATE ON public.localizacoes_operacionais
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_localizacoes_operacionais_updated_at();

-- 5. Configuração de RLS (Row Level Security)
ALTER TABLE public.localizacoes_operacionais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de localizacoes_operacionais" ON public.localizacoes_operacionais;
CREATE POLICY "Permitir leitura de localizacoes_operacionais" 
ON public.localizacoes_operacionais 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir escrita e edicao de localizacoes_operacionais" ON public.localizacoes_operacionais;
CREATE POLICY "Permitir escrita e edicao de localizacoes_operacionais" 
ON public.localizacoes_operacionais 
FOR ALL 
USING (true) 
WITH CHECK (true);
