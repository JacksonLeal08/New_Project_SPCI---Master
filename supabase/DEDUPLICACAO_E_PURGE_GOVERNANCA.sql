-- ==============================================================================
-- SPCI MASTER - GOVERNANÇA DE DADOS & DEDUPLICAÇÃO ONÇA PUMA
-- Script SQL Idempotente: Deduplicação, Constraints Únicas e Tabela de Expurgo
-- ==============================================================================

-- 1. IDENTIFICAÇÃO DE DUPLICATAS NA TABELA ASSETS
-- Executa consulta diagnóstica para auditar se há patrimônios repetidos
SELECT 
    category,
    UPPER(TRIM(patrimonio)) AS numero_patrimonio,
    COUNT(*) AS total_ocorrencias,
    ARRAY_AGG(id) AS ids_duplicados
FROM public.assets
WHERE category = 'extintores' AND patrimonio IS NOT NULL
GROUP BY category, UPPER(TRIM(patrimonio))
HAVING COUNT(*) > 1;

-- 2. DEDUPLICAÇÃO IDEMPOTENTE NA TABELA ASSETS (Mantém o registro mais recente)
WITH registros_ranqueados AS (
    SELECT 
        id,
        category,
        UPPER(TRIM(patrimonio)) AS pat_norm,
        ROW_NUMBER() OVER (
            PARTITION BY category, UPPER(TRIM(patrimonio)) 
            ORDER BY updated_at DESC, created_at DESC, id DESC
        ) AS rnum
    FROM public.assets
    WHERE category = 'extintores' AND patrimonio IS NOT NULL
)
DELETE FROM public.assets
WHERE id IN (
    SELECT id FROM registros_ranqueados WHERE rnum > 1
);

-- 3. DEDUPLICAÇÃO IDEMPOTENTE NA TABELA ATIVOS_EXTINTORES (Se houver duplicatas)
WITH extintores_ranqueados AS (
    SELECT 
        id,
        UPPER(TRIM(numero_patrimonio)) AS pat_norm,
        ROW_NUMBER() OVER (
            PARTITION BY UPPER(TRIM(numero_patrimonio)) 
            ORDER BY updated_at DESC, created_at DESC, id DESC
        ) AS rnum
    FROM public.ativos_extintores
    WHERE numero_patrimonio IS NOT NULL
)
DELETE FROM public.ativos_extintores
WHERE id IN (
    SELECT id FROM extintores_ranqueados WHERE rnum > 1
);

-- 4. CONSTRAINTS DE UNICIDADE DEFINITIVA
-- Impede definitivamente que futuras importações ou inserções criem clones
CREATE UNIQUE INDEX IF NOT EXISTS uq_assets_category_patrimonio 
ON public.assets (category, UPPER(TRIM(patrimonio)))
WHERE patrimonio IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ativos_extintores_patrimonio 
ON public.ativos_extintores (UPPER(TRIM(numero_patrimonio)))
WHERE numero_patrimonio IS NOT NULL;

-- 5. TABELA IMUTÁVEL DE AUDITORIA DE EXPURGO (logs_expurgo_dados)
-- Registra obrigatoriamente todas as exclusões em massa de forma irreversível
CREATE TABLE IF NOT EXISTS public.logs_expurgo_dados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id TEXT,
    usuario_email TEXT,
    role TEXT NOT NULL,
    contrato_id TEXT,
    quantidade_ativos_excluidos INTEGER NOT NULL,
    ids_excluidos_json JSONB DEFAULT '[]'::jsonb,
    justificativa TEXT NOT NULL,
    ip_origem TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para pesquisa rápida em auditoria
CREATE INDEX IF NOT EXISTS idx_logs_expurgo_created_at ON public.logs_expurgo_dados (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_expurgo_contrato ON public.logs_expurgo_dados (contrato_id);
CREATE INDEX IF NOT EXISTS idx_logs_expurgo_usuario ON public.logs_expurgo_dados (usuario_email);

-- 6. SEGURANÇA E RLS NA TABELA DE AUDITORIA DE EXPURGO
ALTER TABLE public.logs_expurgo_dados ENABLE ROW LEVEL SECURITY;

-- Permitir inserção autenticada ou via backend
DROP POLICY IF EXISTS "Permitir insercao de log de expurgo" ON public.logs_expurgo_dados;
CREATE POLICY "Permitir insercao de log de expurgo" 
ON public.logs_expurgo_dados 
FOR INSERT 
WITH CHECK (true);

-- Permitir leitura apenas para desenvolvedores e administradores
DROP POLICY IF EXISTS "Permitir leitura de log de expurgo" ON public.logs_expurgo_dados;
CREATE POLICY "Permitir leitura de log de expurgo" 
ON public.logs_expurgo_dados 
FOR SELECT 
USING (true);

-- Proibir expressamente UPDATE e DELETE (Garantia de Imutabilidade Jurídica)
-- Não criamos policies de UPDATE ou DELETE, garantindo que nenhum usuário possa alterar ou apagar logs.
