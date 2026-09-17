-- ==============================================================================
-- SPCI MASTER - PLANO MESTRE DE CORREÇÃO E GOVERNANÇA DE BANCO DE DADOS
-- Data: 17/09/2026
-- Autor: @backend-specialist
-- Projeto: https://katqbezpcssrmicgnshg.supabase.co
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- FASE 1: REPARO DE INTEGRIDADE RELACIONAL (CORREÇÃO DE ÓRFÃOS)
-- ------------------------------------------------------------------------------
-- Reassocia os 2 extintores com modelo_id inválido/deletado ao modelo 'ABC'
DO $$
DECLARE
    v_modelo_abc_id uuid;
BEGIN
    SELECT id INTO v_modelo_abc_id FROM public.modelos_extintores WHERE nome = 'ABC' LIMIT 1;
    
    IF v_modelo_abc_id IS NOT NULL THEN
        UPDATE public.ativos_extintores
        SET modelo_id = v_modelo_abc_id
        WHERE modelo_id NOT IN (SELECT id FROM public.modelos_extintores);
        RAISE NOTICE 'Extintores com modelo inválido reassociados com sucesso ao modelo ABC.';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- FASE 2: ADIÇÃO DE CHAVES PRIMÁRIAS (PRIMARY KEY)
-- Desbloqueia edição, visualização e exclusão no Supabase Table Editor
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- 1. assets
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.assets'::regclass AND contype = 'p') THEN
        ALTER TABLE public.assets ADD PRIMARY KEY (id);
        RAISE NOTICE 'PRIMARY KEY criada em public.assets.';
    END IF;

    -- 2. ativos_extintores
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ativos_extintores'::regclass AND contype = 'p') THEN
        ALTER TABLE public.ativos_extintores ADD PRIMARY KEY (id);
        RAISE NOTICE 'PRIMARY KEY criada em public.ativos_extintores.';
    END IF;

    -- 3. locais
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.locais'::regclass AND contype = 'p') THEN
        ALTER TABLE public.locais ADD PRIMARY KEY (id);
        RAISE NOTICE 'PRIMARY KEY criada em public.locais.';
    END IF;

    -- 4. sub_locais
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.sub_locais'::regclass AND contype = 'p') THEN
        ALTER TABLE public.sub_locais ADD PRIMARY KEY (id);
        RAISE NOTICE 'PRIMARY KEY criada em public.sub_locais.';
    END IF;

    -- 5. modelos_extintores
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.modelos_extintores'::regclass AND contype = 'p') THEN
        ALTER TABLE public.modelos_extintores ADD PRIMARY KEY (id);
        RAISE NOTICE 'PRIMARY KEY criada em public.modelos_extintores.';
    END IF;

    -- 6. inspecoes_realizadas
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inspecoes_realizadas'::regclass AND contype = 'p') THEN
        ALTER TABLE public.inspecoes_realizadas ADD PRIMARY KEY (id);
        RAISE NOTICE 'PRIMARY KEY criada em public.inspecoes_realizadas.';
    END IF;

    -- 7. logs_auditoria
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.logs_auditoria'::regclass AND contype = 'p') THEN
        ALTER TABLE public.logs_auditoria ADD PRIMARY KEY (id);
        RAISE NOTICE 'PRIMARY KEY criada em public.logs_auditoria.';
    END IF;
EXCEPTION
    WHEN duplicate_object OR duplicate_table THEN
        RAISE NOTICE 'Chaves primárias já configuradas.';
END $$;

-- ------------------------------------------------------------------------------
-- FASE 3: CONSTRAINTS UNIQUE DEFENSIVAS (SUPORTE A ON CONFLICT)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Limpeza preventiva de índices soltos com o mesmo nome para evitar erro 42P07
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'uq_ativos_extintores_patrimonio'
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_ativos_extintores_patrimonio')
    ) THEN
        EXECUTE 'DROP INDEX IF EXISTS public.uq_ativos_extintores_patrimonio CASCADE';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_ativos_extintores_patrimonio') THEN
        ALTER TABLE public.ativos_extintores ADD CONSTRAINT uq_ativos_extintores_patrimonio UNIQUE (numero_patrimonio);
        RAISE NOTICE 'Constraint uq_ativos_extintores_patrimonio criada com sucesso.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_locais_nome') THEN
        ALTER TABLE public.locais ADD CONSTRAINT uq_locais_nome UNIQUE (nome);
        RAISE NOTICE 'Constraint uq_locais_nome criada com sucesso.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_modelos_extintores_nome') THEN
        ALTER TABLE public.modelos_extintores ADD CONSTRAINT uq_modelos_extintores_nome UNIQUE (nome);
        RAISE NOTICE 'Constraint uq_modelos_extintores_nome criada com sucesso.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_sub_locais_local_nome') THEN
        ALTER TABLE public.sub_locais ADD CONSTRAINT uq_sub_locais_local_nome UNIQUE (local_id, nome);
        RAISE NOTICE 'Constraint uq_sub_locais_local_nome criada com sucesso.';
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        RAISE NOTICE 'Constraints UNIQUE já configuradas.';
END $$;

-- ------------------------------------------------------------------------------
-- FASE 4: ÍNDICES DE PERFORMANCE E BUSCA RÁPIDA
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assets_id_patrimonio ON public.assets (id, id_ativo);
CREATE INDEX IF NOT EXISTS idx_ativos_extintores_local_id ON public.ativos_extintores (local_id);
CREATE INDEX IF NOT EXISTS idx_ativos_extintores_modelo_id ON public.ativos_extintores (modelo_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_asset_id ON public.inspecoes_realizadas (asset_id);
CREATE INDEX IF NOT EXISTS idx_sub_locais_local_id ON public.sub_locais (local_id);
