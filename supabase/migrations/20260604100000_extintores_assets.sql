-- Migração: Extintores Assets Schema (Locais, Modelos, Ativos, View de Conformidade & Storage)
-- Autor: Arquiteto de Banco de Dados Master & Especialista Supabase
-- Data: 2026-06-04
--
-- Descrição:
-- Esta migração cria as tabelas relacionais de infraestrutura (locais, sub_locais, modelos_extintores),
-- a tabela principal de ativos de combate a incêndio (ativos_extintores), e a view vw_extintores_publico
-- para controle automático e público de status de conformidade. Adicionalmente, configura o bucket
-- de fotos e suas políticas RLS.

-- ============================================================================
-- 1. TABELAS DE APOIO E INFRAESTRUTURA
-- ============================================================================

-- Tabela: public.locais
CREATE TABLE IF NOT EXISTS public.locais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: public.sub_locais
CREATE TABLE IF NOT EXISTS public.sub_locais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id UUID NOT NULL REFERENCES public.locais(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(local_id, nome)
);

-- Tabela: public.modelos_extintores
CREATE TABLE IF NOT EXISTS public.modelos_extintores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL UNIQUE, -- Ex: "PQS ABC - 8KG", "CO2 - 6KG"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 2. TABELA PRINCIPAL DE ATIVOS DE COMBATE A INCÊNDIO
-- ============================================================================

-- Tabela: public.ativos_extintores
CREATE TABLE IF NOT EXISTS public.ativos_extintores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_hash UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    local_id UUID NOT NULL REFERENCES public.locais(id) ON DELETE RESTRICT,
    sub_local_id UUID REFERENCES public.sub_locais(id) ON DELETE SET NULL,
    numero_patrimonio VARCHAR(100) NOT NULL UNIQUE,
    selo_inmetro VARCHAR(100),
    chassi VARCHAR(100), -- Atua como Número de Série
    modelo_id UUID NOT NULL REFERENCES public.modelos_extintores(id) ON DELETE RESTRICT,
    peso_capacidade VARCHAR(50) NOT NULL, -- Ex: "6KG", "10L"
    data_ultima_recarga DATE NOT NULL,
    meses_validade_recarga INTEGER NOT NULL CHECK (meses_validade_recarga > 0),
    ano_ultimo_teste_hidro INTEGER NOT NULL CHECK (ano_ultimo_teste_hidro BETWEEN 1900 AND 2100),
    data_pesagem_co2 DATE,
    foto_url VARCHAR(512), -- Caminho relativo para o Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar trigger para atualizar updated_at automaticamente na tabela ativos_extintores
DROP TRIGGER IF EXISTS tr_ativos_extintores_timestamp ON public.ativos_extintores;
CREATE TRIGGER tr_ativos_extintores_timestamp
    BEFORE UPDATE ON public.ativos_extintores
    FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

-- Criar índices de busca essenciais para leitura rápida via QR Code e Patrimônio
CREATE INDEX IF NOT EXISTS idx_extintores_qr_hash ON public.ativos_extintores(qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_extintores_patrimonio ON public.ativos_extintores(numero_patrimonio);

-- ============================================================================
-- 3. POLÍTICAS DE ROW LEVEL SECURITY (RLS) DAS TABELAS
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_extintores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ativos_extintores ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Leitura de locais para autenticados" ON public.locais;
DROP POLICY IF EXISTS "Escrita de locais para Devs e Admins" ON public.locais;
DROP POLICY IF EXISTS "Leitura de sub_locais para autenticados" ON public.sub_locais;
DROP POLICY IF EXISTS "Escrita de sub_locais para Devs e Admins" ON public.sub_locais;
DROP POLICY IF EXISTS "Leitura de modelos para autenticados" ON public.modelos_extintores;
DROP POLICY IF EXISTS "Escrita de modelos para Devs e Admins" ON public.modelos_extintores;
DROP POLICY IF EXISTS "Leitura de ativos_extintores para autenticados" ON public.ativos_extintores;
DROP POLICY IF EXISTS "Inserção de ativos_extintores para Admins e Devs" ON public.ativos_extintores;
DROP POLICY IF EXISTS "Atualização de ativos_extintores para autenticados" ON public.ativos_extintores;
DROP POLICY IF EXISTS "Exclusão de ativos_extintores para Admins e Devs" ON public.ativos_extintores;

-- Políticas: locais
CREATE POLICY "Leitura de locais para autenticados" ON public.locais FOR SELECT TO authenticated
    USING (NOT public.is_my_account_expired());

CREATE POLICY "Escrita de locais para Devs e Admins" ON public.locais FOR ALL TO authenticated
    USING ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired())
    WITH CHECK ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired());

-- Políticas: sub_locais
CREATE POLICY "Leitura de sub_locais para autenticados" ON public.sub_locais FOR SELECT TO authenticated
    USING (NOT public.is_my_account_expired());

CREATE POLICY "Escrita de sub_locais para Devs e Admins" ON public.sub_locais FOR ALL TO authenticated
    USING ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired())
    WITH CHECK ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired());

-- Políticas: modelos_extintores
CREATE POLICY "Leitura de modelos para autenticados" ON public.modelos_extintores FOR SELECT TO authenticated
    USING (NOT public.is_my_account_expired());

CREATE POLICY "Escrita de modelos para Devs e Admins" ON public.modelos_extintores FOR ALL TO authenticated
    USING ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired())
    WITH CHECK ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired());

-- Políticas: ativos_extintores
CREATE POLICY "Leitura de ativos_extintores para autenticados" ON public.ativos_extintores FOR SELECT TO authenticated
    USING (NOT public.is_my_account_expired());

CREATE POLICY "Inserção de ativos_extintores para Admins e Devs" ON public.ativos_extintores FOR INSERT TO authenticated
    WITH CHECK ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired());

CREATE POLICY "Atualização de ativos_extintores para autenticados" ON public.ativos_extintores FOR UPDATE TO authenticated
    USING (NOT public.is_my_account_expired())
    WITH CHECK (NOT public.is_my_account_expired());

CREATE POLICY "Exclusão de ativos_extintores para Admins e Devs" ON public.ativos_extintores FOR DELETE TO authenticated
    USING ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired());

-- ============================================================================
-- 4. VIEW DE CONSULTA PÚBLICA & CONFORMIDADE
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_extintores_publico AS
SELECT 
    ae.id,
    ae.qr_code_hash,
    ae.numero_patrimonio,
    ae.selo_inmetro,
    ae.chassi AS numero_serie,
    ae.peso_capacidade,
    me.nome AS modelo_tipo,
    l.nome AS local_instalacao,
    sl.nome AS sub_local_instalacao,
    ae.data_ultima_recarga,
    ae.ano_ultimo_teste_hidro,
    ae.foto_url,
    
    -- Datas Limite de Validade Calculadas
    (ae.data_ultima_recarga + (ae.meses_validade_recarga * INTERVAL '1 month'))::DATE AS data_limite_recarga,
    (make_date(ae.ano_ultimo_teste_hidro + 5, 12, 31))::DATE AS data_limite_hidro,
    
    -- Lógica de status de conformidade
    CASE 
        -- Regra 1: Qualquer um vencido
        WHEN CURRENT_DATE > (ae.data_ultima_recarga + (ae.meses_validade_recarga * INTERVAL '1 month')) 
             OR CURRENT_DATE > (make_date(ae.ano_ultimo_teste_hidro + 5, 12, 31)) 
        THEN 'VENCIDO'
        
        -- Regra 2: Faltando 30 dias ou menos para vencer
        WHEN (ae.data_ultima_recarga + (ae.meses_validade_recarga * INTERVAL '1 month'))::DATE - CURRENT_DATE <= 30
             OR (make_date(ae.ano_ultimo_teste_hidro + 5, 12, 31))::DATE - CURRENT_DATE <= 30
        THEN 'A VENCER'
        
        ELSE 'NO PRAZO'
    END AS status_conformidade
FROM public.ativos_extintores ae
JOIN public.locais l ON ae.local_id = l.id
LEFT JOIN public.sub_locais sl ON ae.sub_local_id = sl.id
JOIN public.modelos_extintores me ON ae.modelo_id = me.id;

-- ============================================================================
-- 5. CONFIGURAÇÃO DO STORAGE BUCKET & RLS
-- ============================================================================

-- 1. Criação do Bucket fotos_extintores
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos_extintores', 'fotos_extintores', true)
ON CONFLICT (id) DO NOTHING;

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Leitura pública para todas as fotos de extintores" ON storage.objects;
DROP POLICY IF EXISTS "Apenas tecnicos autenticados fazem upload" ON storage.objects;
DROP POLICY IF EXISTS "Apenas tecnicos autenticados atualizam ou excluem fotos" ON storage.objects;

-- 2. Política de Leitura Pública
CREATE POLICY "Leitura pública para todas as fotos de extintores"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'fotos_extintores');

-- 3. Política de Upload de Novas Imagens (Apenas Usuários Autenticados)
CREATE POLICY "Apenas tecnicos autenticados fazem upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fotos_extintores');

-- 4. Política de Atualização e Edição de Fotos (Apenas Usuários Autenticados)
CREATE POLICY "Apenas tecnicos autenticados atualizam ou excluem fotos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'fotos_extintores')
WITH CHECK (bucket_id = 'fotos_extintores');
