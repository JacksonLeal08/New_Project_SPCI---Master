-- ==============================================================================
-- SPCI MASTER - MIGRAÇÃO DE GOVERNANÇA: CONSTRAINTS UNIQUE PARA ON CONFLICT
-- Data: 17/09/2026
-- Descrição: Cria constraints UNIQUE necessárias para suportar operações com 
--            ON CONFLICT (upsert) e garantir integridade referencial estrita.
-- ==============================================================================

-- 1. Tabela 'ativos_extintores' (conflito por numero_patrimonio)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_ativos_extintores_patrimonio'
    ) THEN
        ALTER TABLE public.ativos_extintores 
        ADD CONSTRAINT uq_ativos_extintores_patrimonio UNIQUE (numero_patrimonio);
        RAISE NOTICE 'Constraint uq_ativos_extintores_patrimonio criada com sucesso.';
    ELSE
        RAISE NOTICE 'Constraint uq_ativos_extintores_patrimonio já existe.';
    END IF;
END $$;

-- 2. Tabela 'assets' (conflito por id primário/único)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_assets_id'
    ) THEN
        ALTER TABLE public.assets 
        ADD CONSTRAINT uq_assets_id UNIQUE (id);
        RAISE NOTICE 'Constraint uq_assets_id criada com sucesso.';
    ELSE
        RAISE NOTICE 'Constraint uq_assets_id já existe.';
    END IF;
END $$;

-- 3. Tabela 'locais' (conflito por nome)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_locais_nome'
    ) THEN
        ALTER TABLE public.locais 
        ADD CONSTRAINT uq_locais_nome UNIQUE (nome);
        RAISE NOTICE 'Constraint uq_locais_nome criada com sucesso.';
    ELSE
        RAISE NOTICE 'Constraint uq_locais_nome já existe.';
    END IF;
END $$;

-- 4. Tabela 'modelos_extintores' (conflito por nome)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_modelos_extintores_nome'
    ) THEN
        ALTER TABLE public.modelos_extintores 
        ADD CONSTRAINT uq_modelos_extintores_nome UNIQUE (nome);
        RAISE NOTICE 'Constraint uq_modelos_extintores_nome criada com sucesso.';
    ELSE
        RAISE NOTICE 'Constraint uq_modelos_extintores_nome já existe.';
    END IF;
END $$;

-- 5. Tabela 'sub_locais' (conflito composto por local_id e nome)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_sub_locais_local_nome'
    ) THEN
        ALTER TABLE public.sub_locais 
        ADD CONSTRAINT uq_sub_locais_local_nome UNIQUE (local_id, nome);
        RAISE NOTICE 'Constraint uq_sub_locais_local_nome criada com sucesso.';
    ELSE
        RAISE NOTICE 'Constraint uq_sub_locais_local_nome já existe.';
    END IF;
END $$;

-- 6. Recriação/Garantia de índices de busca rápida
CREATE INDEX IF NOT EXISTS idx_ativos_extintores_patrimonio ON public.ativos_extintores (numero_patrimonio);
CREATE INDEX IF NOT EXISTS idx_assets_id_patrimonio ON public.assets (id, id_ativo);
CREATE INDEX IF NOT EXISTS idx_locais_nome ON public.locais (nome);
CREATE INDEX IF NOT EXISTS idx_modelos_nome ON public.modelos_extintores (nome);
