-- ==============================================================================
-- SPCI MASTER DATABASE SCHEMA (SUPABASE)
-- Versão: 2.0 (Consolidado)
-- Data: 13/08/2026
-- Descrição: Script Mestre Idempotente para criação de todas as tabelas do SPCI.
-- Seguro para rodar em bancos novos ou existentes sem perder dados cadastrados.
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FUNÇÃO AUXILIAR PARA ATUALIZAÇÃO AUTOMÁTICA DE TIMESTAMP (updated_at)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- TABELA 1: USUÁRIOS E PERFIS DE ACESSO (usuarios)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    user_name TEXT,
    photo_url TEXT,
    logo_url TEXT,
    perfil_acesso TEXT DEFAULT 'Usuário',
    status_conta TEXT DEFAULT 'Ativo',
    telefone_whatsapp TEXT,
    data_expiracao TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at em usuarios
DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- TABELA 2: ATIVOS E EQUIPAMENTOS UNIFICADOS (assets)
-- (Extintores, Hidrantes, Sinalizações, Iluminação de Emergência e Bombas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.assets (
    id TEXT PRIMARY KEY,
    id_ativo TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'extintores',
    model TEXT,
    location TEXT,
    sub_location TEXT,
    status TEXT DEFAULT 'Conforme',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance para busca de ativos
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_id_ativo ON public.assets(id_ativo);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_location ON public.assets(location);

-- Trigger para updated_at em assets
DROP TRIGGER IF EXISTS trg_assets_updated_at ON public.assets;
CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- TABELA 3: INSPEÇÕES E LAUDOS TÉCNICOS DE VISTORIA (inspecoes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inspecoes (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    asset_category TEXT NOT NULL DEFAULT 'extintores',
    status_result TEXT NOT NULL DEFAULT 'Conforme',
    tecnico_nome TEXT,
    tecnico_email TEXT,
    inspection_notes TEXT,
    photo_patrimonio TEXT,
    photo_frontal TEXT,
    item_states JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de busca de inspeções
CREATE INDEX IF NOT EXISTS idx_inspecoes_asset_id ON public.inspecoes(asset_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_asset_category ON public.inspecoes(asset_category);
CREATE INDEX IF NOT EXISTS idx_inspecoes_status_result ON public.inspecoes(status_result);
CREATE INDEX IF NOT EXISTS idx_inspecoes_created_at ON public.inspecoes(created_at DESC);

-- ==============================================================================
-- TABELA 4: CHECKLISTS CONFIGURÁVEIS NBR E QUESITOS IMPEDITIVOS (checklists_ativos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.checklists_ativos (
    id TEXT PRIMARY KEY,
    ordem INTEGER NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'extintores',
    item TEXT NOT NULL,
    tipos_aplicaveis JSONB DEFAULT '["Todos"]'::jsonb,
    pesos_aplicaveis JSONB DEFAULT '["Todos"]'::jsonb,
    status TEXT NOT NULL DEFAULT 'Ativado',
    is_impeditivo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona coluna is_impeditivo se a tabela for legada
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'checklists_ativos' 
          AND column_name = 'is_impeditivo'
    ) THEN
        ALTER TABLE public.checklists_ativos ADD COLUMN is_impeditivo BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Índice para ordem e categoria dos checklists
CREATE INDEX IF NOT EXISTS idx_checklists_ativos_categoria_ordem ON public.checklists_ativos(categoria, ordem);

-- Trigger para updated_at em checklists_ativos
DROP TRIGGER IF EXISTS trg_checklists_ativos_updated_at ON public.checklists_ativos;
CREATE TRIGGER trg_checklists_ativos_updated_at
    BEFORE UPDATE ON public.checklists_ativos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- TABELA 5: ESTRUTURA DE LOCAIS E SUB-LOCAIS DA PLANTA (locais_planta / sub_locais)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.locais_planta (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    setor TEXT,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sub_locais (
    id TEXT PRIMARY KEY,
    local_id TEXT REFERENCES public.locais_planta(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers para locais
DROP TRIGGER IF EXISTS trg_locais_planta_updated_at ON public.locais_planta;
CREATE TRIGGER trg_locais_planta_updated_at
    BEFORE UPDATE ON public.locais_planta
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_sub_locais_updated_at ON public.sub_locais;
CREATE TRIGGER trg_sub_locais_updated_at
    BEFORE UPDATE ON public.sub_locais
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- TABELA 6: RASTREABILIDADE E AUDITORIA DO SISTEMA (audit_logs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT,
    user_email TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- CONFIGURAÇÃO DE SEGURANÇA E POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ==============================================================================

-- Habilita RLS em todas as tabelas do sistema
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspecoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais_planta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Público / Autenticado RLS (Segurança e Operação Fluida)

-- 1. Políticas usuarios
DROP POLICY IF EXISTS "Permitir leitura pública de usuarios" ON public.usuarios;
CREATE POLICY "Permitir leitura pública de usuarios" ON public.usuarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir alteração pública de usuarios" ON public.usuarios;
CREATE POLICY "Permitir alteração pública de usuarios" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);

-- 2. Políticas assets
DROP POLICY IF EXISTS "Permitir leitura pública de assets" ON public.assets;
CREATE POLICY "Permitir leitura pública de assets" ON public.assets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir alteração pública de assets" ON public.assets;
CREATE POLICY "Permitir alteração pública de assets" ON public.assets FOR ALL USING (true) WITH CHECK (true);

-- 3. Políticas inspecoes
DROP POLICY IF EXISTS "Permitir leitura pública de inspecoes" ON public.inspecoes;
CREATE POLICY "Permitir leitura pública de inspecoes" ON public.inspecoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir alteração pública de inspecoes" ON public.inspecoes;
CREATE POLICY "Permitir alteração pública de inspecoes" ON public.inspecoes FOR ALL USING (true) WITH CHECK (true);

-- 4. Políticas checklists_ativos
DROP POLICY IF EXISTS "Permitir leitura pública de checklists_ativos" ON public.checklists_ativos;
CREATE POLICY "Permitir leitura pública de checklists_ativos" ON public.checklists_ativos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir alteração pública de checklists_ativos" ON public.checklists_ativos;
CREATE POLICY "Permitir alteração pública de checklists_ativos" ON public.checklists_ativos FOR ALL USING (true) WITH CHECK (true);

-- 5. Políticas locais_planta e sub_locais
DROP POLICY IF EXISTS "Permitir leitura pública de locais_planta" ON public.locais_planta;
CREATE POLICY "Permitir leitura pública de locais_planta" ON public.locais_planta FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir alteração pública de locais_planta" ON public.locais_planta;
CREATE POLICY "Permitir alteração pública de locais_planta" ON public.locais_planta FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura pública de sub_locais" ON public.sub_locais;
CREATE POLICY "Permitir leitura pública de sub_locais" ON public.sub_locais FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir alteração pública de sub_locais" ON public.sub_locais;
CREATE POLICY "Permitir alteração pública de sub_locais" ON public.sub_locais FOR ALL USING (true) WITH CHECK (true);

-- 6. Políticas audit_logs
DROP POLICY IF EXISTS "Permitir leitura pública de audit_logs" ON public.audit_logs;
CREATE POLICY "Permitir leitura pública de audit_logs" ON public.audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir alteração pública de audit_logs" ON public.audit_logs;
CREATE POLICY "Permitir alteração pública de audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- FIM DO SCRIPT MESTRE DO SPCI
-- ==============================================================================
