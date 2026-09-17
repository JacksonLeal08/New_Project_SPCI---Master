-- ==============================================================================
-- SPCI MASTER - MIGRAÇÃO DE GOVERNANÇA: CONSTRAINTS UNIQUE PARA ON CONFLICT
-- Data: 17/09/2026
-- Descrição: Cria constraints UNIQUE necessárias para suportar operações com 
--            ON CONFLICT (upsert) e garantir integridade referencial estrita.
--            Inclui limpeza preventiva de índices soltos com mesmo nome (42P07).
-- ==============================================================================

-- 1. Tabela 'ativos_extintores' (conflito por numero_patrimonio)
DO $$
BEGIN
    -- Se existir índice solto no pg_class que não seja constraint, remove com segurança
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'uq_ativos_extintores_patrimonio'
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_ativos_extintores_patrimonio')
    ) THEN
        EXECUTE 'DROP INDEX IF EXISTS public.uq_ativos_extintores_patrimonio CASCADE';
        RAISE NOTICE 'Índice solto pré-existente uq_ativos_extintores_patrimonio removido para recriação como constraint.';
    END IF;

    -- Cria a constraint formal UNIQUE
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
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        RAISE NOTICE 'Constraint/relação uq_ativos_extintores_patrimonio já configurada.';
END $$;

-- 2. Tabela 'assets' (conflito por id primário/único)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'uq_assets_id'
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_assets_id')
    ) THEN
        EXECUTE 'DROP INDEX IF EXISTS public.uq_assets_id CASCADE';
    END IF;

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
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        RAISE NOTICE 'Constraint/relação uq_assets_id já configurada.';
END $$;

-- 3. Tabela 'locais' (conflito por nome)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'uq_locais_nome'
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_locais_nome')
    ) THEN
        EXECUTE 'DROP INDEX IF EXISTS public.uq_locais_nome CASCADE';
    END IF;

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
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        RAISE NOTICE 'Constraint/relação uq_locais_nome já configurada.';
END $$;

-- 4. Tabela 'modelos_extintores' (conflito por nome)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'uq_modelos_extintores_nome'
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_modelos_extintores_nome')
    ) THEN
        EXECUTE 'DROP INDEX IF EXISTS public.uq_modelos_extintores_nome CASCADE';
    END IF;

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
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        RAISE NOTICE 'Constraint/relação uq_modelos_extintores_nome já configurada.';
END $$;

-- 5. Tabela 'sub_locais' (conflito composto por local_id e nome)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'uq_sub_locais_local_nome'
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_sub_locais_local_nome')
    ) THEN
        EXECUTE 'DROP INDEX IF EXISTS public.uq_sub_locais_local_nome CASCADE';
    END IF;

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
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        RAISE NOTICE 'Constraint/relação uq_sub_locais_local_nome já configurada.';
END $$;

-- 6. Recriação/Garantia de índices de busca rápida (apenas onde não há constraint correspondente)
CREATE INDEX IF NOT EXISTS idx_assets_id_patrimonio ON public.assets (id, id_ativo);
