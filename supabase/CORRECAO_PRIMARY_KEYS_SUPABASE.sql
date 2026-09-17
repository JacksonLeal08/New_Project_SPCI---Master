-- ==============================================================================
-- SPCI MASTER - ADIÇÃO DE PRIMARY KEYS (CHAVES PRIMÁRIAS) NO SUPABASE
-- Data: 17/09/2026
-- Objetivo: Resolver a mensagem do Supabase Studio:
-- "Add a primary key column to your table first to serve as a unique identifier 
-- for each row before updating or deleting the row."
-- ==============================================================================

DO $$
BEGIN
    -- 1. Chave Primária em 'public.assets'
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.assets'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE public.assets ADD PRIMARY KEY (id);
        RAISE NOTICE 'Chave primária adicionada com sucesso em public.assets.';
    ELSE
        RAISE NOTICE 'public.assets já possui chave primária.';
    END IF;

    -- 2. Chave Primária em 'public.ativos_extintores'
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.ativos_extintores'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE public.ativos_extintores ADD PRIMARY KEY (id);
        RAISE NOTICE 'Chave primária adicionada com sucesso em public.ativos_extintores.';
    ELSE
        RAISE NOTICE 'public.ativos_extintores já possui chave primária.';
    END IF;

    -- 3. Chave Primária em 'public.locais'
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.locais'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE public.locais ADD PRIMARY KEY (id);
        RAISE NOTICE 'Chave primária adicionada com sucesso em public.locais.';
    ELSE
        RAISE NOTICE 'public.locais já possui chave primária.';
    END IF;

    -- 4. Chave Primária em 'public.modelos_extintores'
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.modelos_extintores'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE public.modelos_extintores ADD PRIMARY KEY (id);
        RAISE NOTICE 'Chave primária adicionada com sucesso em public.modelos_extintores.';
    ELSE
        RAISE NOTICE 'public.modelos_extintores já possui chave primária.';
    END IF;

    -- 5. Chave Primária em 'public.sub_locais'
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.sub_locais'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE public.sub_locais ADD PRIMARY KEY (id);
        RAISE NOTICE 'Chave primária adicionada com sucesso em public.sub_locais.';
    ELSE
        RAISE NOTICE 'public.sub_locais já possui chave primária.';
    END IF;

    -- 6. Chave Primária em 'public.logs_auditoria'
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.logs_auditoria'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE public.logs_auditoria ADD PRIMARY KEY (id);
        RAISE NOTICE 'Chave primária adicionada com sucesso em public.logs_auditoria.';
    ELSE
        RAISE NOTICE 'public.logs_auditoria já possui chave primária.';
    END IF;
EXCEPTION
    WHEN duplicate_object OR duplicate_table THEN
        RAISE NOTICE 'Chaves primárias já estão ativas.';
    WHEN others THEN
        RAISE NOTICE 'Aviso na verificação de chaves primárias: %', SQLERRM;
END $$;
