-- =========================================================================================
-- SPCI MASTER: MIGRATION DE ISOLAMENTO DE DADOS MULTI-TENANT (CROSS-CONTRACT DATA ISOLATION)
-- Objetivo: Blindar o vazamento de dados entre contratos (Ex: Salobo vs Onça Puma)
-- Tabelas afetadas: assets, lotes_manutencao, itens_lote_manutencao, inspecoes_realizadas, substituicoes_ativos
-- Data: 10/09/2026
-- =========================================================================================

-- 1. TABELA DE TROCAS & SUBSTITUIÇÕES (Garantir estrutura persistente e indexada)
CREATE TABLE IF NOT EXISTS public.substituicoes_ativos (
  id TEXT PRIMARY KEY,
  ativo_retirado_id TEXT NOT NULL,
  ativo_retirado_codigo TEXT NOT NULL,
  ativo_retirado_patrimonio TEXT,
  ativo_retirado_chassi TEXT,
  ativo_retirado_modelo TEXT,
  ativo_retirado_capacidade TEXT,
  ativo_substituto_id TEXT NOT NULL,
  ativo_substituto_codigo TEXT NOT NULL,
  ativo_substituto_patrimonio TEXT,
  ativo_substituto_chassi TEXT,
  ativo_substituto_modelo TEXT,
  ativo_substituto_capacidade TEXT,
  setor TEXT NOT NULL,
  sub_local TEXT,
  local_especifico TEXT,
  motivo_troca TEXT NOT NULL,
  descricao_motivo TEXT,
  foto_antes_url TEXT,
  foto_depois_url TEXT,
  tecnico_responsavel_nome TEXT NOT NULL,
  tecnico_responsavel_email TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  status_troca TEXT DEFAULT 'CONCLUIDA',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  contrato_id TEXT,
  site TEXT
);

-- 2. ADIÇÃO DAS COLUNAS DE TENANT (CONTRATO_ID e SITE)
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS contrato_id TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS site TEXT;

ALTER TABLE public.lotes_manutencao ADD COLUMN IF NOT EXISTS contrato_id TEXT;
ALTER TABLE public.lotes_manutencao ADD COLUMN IF NOT EXISTS site TEXT;

ALTER TABLE public.itens_lote_manutencao ADD COLUMN IF NOT EXISTS contrato_id TEXT;
ALTER TABLE public.itens_lote_manutencao ADD COLUMN IF NOT EXISTS site TEXT;

ALTER TABLE public.inspecoes_realizadas ADD COLUMN IF NOT EXISTS contrato_id TEXT;
ALTER TABLE public.inspecoes_realizadas ADD COLUMN IF NOT EXISTS site TEXT;

ALTER TABLE public.substituicoes_ativos ADD COLUMN IF NOT EXISTS contrato_id TEXT;
ALTER TABLE public.substituicoes_ativos ADD COLUMN IF NOT EXISTS site TEXT;

-- 3. CRIAÇÃO DE ÍNDICES DE PERFORMANCE E BARREIRA MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_assets_site ON public.assets(site);
CREATE INDEX IF NOT EXISTS idx_assets_contrato_id ON public.assets(contrato_id);

CREATE INDEX IF NOT EXISTS idx_lotes_site ON public.lotes_manutencao(site);
CREATE INDEX IF NOT EXISTS idx_lotes_contrato_id ON public.lotes_manutencao(contrato_id);

CREATE INDEX IF NOT EXISTS idx_inspecoes_site ON public.inspecoes_realizadas(site);
CREATE INDEX IF NOT EXISTS idx_inspecoes_contrato_id ON public.inspecoes_realizadas(contrato_id);

CREATE INDEX IF NOT EXISTS idx_substituicoes_site ON public.substituicoes_ativos(site);
CREATE INDEX IF NOT EXISTS idx_substituicoes_contrato_id ON public.substituicoes_ativos(contrato_id);

-- 4. ROTINA DE BACKFILL RETROATIVO: ASSETS
-- Preenche a coluna site a partir do JSONB details ou do local
UPDATE public.assets
SET site = COALESCE(
  NULLIF(TRIM(details->>'site'), ''),
  NULLIF(TRIM(details->>'contrato'), ''),
  CASE 
    WHEN UPPER(location) LIKE '%SALOBO%' OR UPPER(sub_location) LIKE '%SALOBO%' THEN 'SALOBO'
    ELSE 'ONÇA PUMA'
  END
)
WHERE site IS NULL OR site = '';

-- Preenche contrato_id com os UUIDs oficiais dos contratos
UPDATE public.assets
SET contrato_id = CASE
  WHEN UPPER(site) LIKE '%SALOBO%' THEN '6ca3347b-1184-4743-afd7-2928a00ccd4f'
  ELSE 'c21d2e1f-5930-4745-9afe-244131eb32d3'
END
WHERE contrato_id IS NULL OR contrato_id = '';

-- 5. ROTINA DE BACKFILL RETROATIVO: INSPEÇÕES REALIZADAS
-- Vincula cada inspeção ao contrato do ativo correspondente
UPDATE public.inspecoes_realizadas ir
SET 
  site = COALESCE(a.site, 'ONÇA PUMA'),
  contrato_id = COALESCE(a.contrato_id, 'c21d2e1f-5930-4745-9afe-244131eb32d3')
FROM public.assets a
WHERE (ir.asset_id = a.id OR ir.asset_patrimonio = a.id_ativo OR ir.asset_patrimonio = a.patrimonio)
  AND (ir.site IS NULL OR ir.contrato_id IS NULL);

-- Inspeções órfãs (caso existam) assumem Onça Puma como padrão histórico
UPDATE public.inspecoes_realizadas
SET 
  site = 'ONÇA PUMA',
  contrato_id = 'c21d2e1f-5930-4745-9afe-244131eb32d3'
WHERE site IS NULL OR contrato_id IS NULL;

-- 6. ROTINA DE BACKFILL RETROATIVO: LOTES DE MANUTENÇÃO & ITENS
-- Vincula cada lote ao contrato dos ativos contidos nele
UPDATE public.lotes_manutencao lm
SET 
  site = COALESCE(sub.site, 'ONÇA PUMA'),
  contrato_id = COALESCE(sub.contrato_id, 'c21d2e1f-5930-4745-9afe-244131eb32d3')
FROM (
  SELECT DISTINCT ilm.lote_id, a.site, a.contrato_id
  FROM public.itens_lote_manutencao ilm
  JOIN public.assets a ON (ilm.asset_id = a.id OR ilm.id_ativo = a.id_ativo OR ilm.patrimonio = a.id_ativo)
  WHERE a.site IS NOT NULL
) sub
WHERE lm.id = sub.lote_id
  AND (lm.site IS NULL OR lm.contrato_id IS NULL);

-- Atualiza lotes restantes
UPDATE public.lotes_manutencao
SET 
  site = 'ONÇA PUMA',
  contrato_id = 'c21d2e1f-5930-4745-9afe-244131eb32d3'
WHERE site IS NULL OR contrato_id IS NULL;

-- 7. ROTINA DE BACKFILL RETROATIVO: SUBSTITUIÇÕES DE ATIVOS
-- Migrar trocas gravadas nos assets/movimentações para a tabela física
INSERT INTO public.substituicoes_ativos (
  id,
  ativo_retirado_id,
  ativo_retirado_codigo,
  ativo_retirado_patrimonio,
  ativo_retirado_chassi,
  ativo_retirado_modelo,
  ativo_substituto_id,
  ativo_substituto_codigo,
  ativo_substituto_patrimonio,
  ativo_substituto_chassi,
  ativo_substituto_modelo,
  setor,
  motivo_troca,
  descricao_motivo,
  tecnico_responsavel_nome,
  status_troca,
  criado_em,
  site,
  contrato_id
)
SELECT 
  'TRC-ea3b2f33-a643-433f-9f36-1b33ed97d0ae-f63372e2-83f3-48d4-a6d9-a862aa9abbb5' AS id,
  'ea3b2f33-a643-433f-9f36-1b33ed97d0ae' AS ativo_retirado_id,
  'EXT-151' AS ativo_retirado_codigo,
  'EXT-151' AS ativo_retirado_patrimonio,
  '1756' AS ativo_retirado_chassi,
  'PQS ABC' AS ativo_retirado_modelo,
  'f63372e2-83f3-48d4-a6d9-a862aa9abbb5' AS ativo_substituto_id,
  'EXT-045' AS ativo_substituto_codigo,
  'EXT-045' AS ativo_substituto_patrimonio,
  '3671' AS ativo_substituto_chassi,
  'PQS ABC' AS ativo_substituto_modelo,
  'INVESTIMENTO CORRENTE - AO LADO DA SALA - IMPLANTAÇÃO DE PROJETOS' AS setor,
  'VENCIDO' AS motivo_troca,
  'Substituição bilateral realizada no ponto. Ativo retirado: EXT-151. Substituto instalado: EXT-045.' AS descricao_motivo,
  'Operador SPCI' AS tecnico_responsavel_nome,
  'CONCLUIDA' AS status_troca,
  NOW() AS criado_em,
  'ONÇA PUMA' AS site,
  'c21d2e1f-5930-4745-9afe-244131eb32d3' AS contrato_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.substituicoes_ativos 
  WHERE id = 'TRC-ea3b2f33-a643-433f-9f36-1b33ed97d0ae-f63372e2-83f3-48d4-a6d9-a862aa9abbb5'
);

-- Sucesso na execução
SELECT 'Migration de Isolamento Multi-Tenant concluída com sucesso!' AS resultado;
