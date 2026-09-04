-- ============================================================================
-- Migração: Rastreamento Geoespacial Automático e Histórico de Localização SPCI
-- Data: 2026-09-04
-- ============================================================================

-- 1. Adicionar colunas de geolocalização na tabela principal 'assets' (se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'latitude') THEN
        ALTER TABLE public.assets ADD COLUMN latitude DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'longitude') THEN
        ALTER TABLE public.assets ADD COLUMN longitude DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'precisao_gps') THEN
        ALTER TABLE public.assets ADD COLUMN precisao_gps DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'data_ultima_localizacao') THEN
        ALTER TABLE public.assets ADD COLUMN data_ultima_localizacao TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'origem_localizacao') THEN
        ALTER TABLE public.assets ADD COLUMN origem_localizacao VARCHAR(50);
    END IF;
END $$;

-- 2. Adicionar colunas de geolocalização na tabela 'ativos_extintores'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ativos_extintores') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'latitude') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN latitude DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'longitude') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN longitude DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'precisao_gps') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN precisao_gps DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'data_ultima_localizacao') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN data_ultima_localizacao TIMESTAMP WITH TIME ZONE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ativos_extintores' AND column_name = 'origem_localizacao') THEN
            ALTER TABLE public.ativos_extintores ADD COLUMN origem_localizacao VARCHAR(50);
        END IF;
    END IF;
END $$;

-- 3. Adicionar colunas de geolocalização e foto na tabela 'inspecoes_realizadas'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspecoes_realizadas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inspecoes_realizadas' AND column_name = 'latitude') THEN
            ALTER TABLE public.inspecoes_realizadas ADD COLUMN latitude DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inspecoes_realizadas' AND column_name = 'longitude') THEN
            ALTER TABLE public.inspecoes_realizadas ADD COLUMN longitude DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inspecoes_realizadas' AND column_name = 'precisao_gps') THEN
            ALTER TABLE public.inspecoes_realizadas ADD COLUMN precisao_gps DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inspecoes_realizadas' AND column_name = 'foto_evidencia_url') THEN
            ALTER TABLE public.inspecoes_realizadas ADD COLUMN foto_evidencia_url TEXT;
        END IF;
    END IF;
END $$;

-- 4. Criação da Tabela de Auditoria Imutável de Histórico de Localização
CREATE TABLE IF NOT EXISTS public.historico_localizacao_ativo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ativo_id VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) DEFAULT 'extintores',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    precisao DOUBLE PRECISION,
    distancia_deslocada_metros DOUBLE PRECISION DEFAULT 0,
    foto_evidencia_url TEXT,
    usuario_id UUID,
    usuario_nome VARCHAR(255),
    tipo_evento VARCHAR(50) NOT NULL, -- 'CADASTRO_ESTOQUE', 'RONDA_CAMPO', 'INSPECAO'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_hist_loc_ativo_id ON public.historico_localizacao_ativo(ativo_id);
CREATE INDEX IF NOT EXISTS idx_hist_loc_created_at ON public.historico_localizacao_ativo(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hist_loc_tipo_evento ON public.historico_localizacao_ativo(tipo_evento);

-- 5. Configuração de RLS
ALTER TABLE public.historico_localizacao_ativo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de historico_localizacao_ativo para todos autenticados" ON public.historico_localizacao_ativo;
CREATE POLICY "Leitura de historico_localizacao_ativo para todos autenticados"
    ON public.historico_localizacao_ativo FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "Insercao de historico_localizacao_ativo permitida" ON public.historico_localizacao_ativo;
CREATE POLICY "Insercao de historico_localizacao_ativo permitida"
    ON public.historico_localizacao_ativo FOR INSERT TO public
    WITH CHECK (true);
