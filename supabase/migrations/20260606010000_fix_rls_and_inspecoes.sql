-- Migração: Correção de Segurança (RLS PL/pgSQL) e Tabela de Inspeções Sem Constraints de FK Conflitantes
-- Autor: Arquiteto de Banco de Dados Master & Especialista Supabase
-- Data: 2026-06-06

-- ============================================================================
-- 1. CORREÇÃO DA RECURSÃO INFINITA (RLS)
-- ============================================================================

-- Redefine get_my_role usando plpgsql para evitar inlining e recursão no RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role public.user_role;
BEGIN
    SELECT role INTO v_role FROM public.usuarios WHERE id = auth.uid();
    RETURN v_role;
END;
$$;

-- Redefine is_my_account_expired usando plpgsql para evitar inlining e recursão no RLS
CREATE OR REPLACE FUNCTION public.is_my_account_expired()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_expired boolean;
BEGIN
    SELECT COALESCE(data_expiracao < now(), false) INTO v_expired FROM public.usuarios WHERE id = auth.uid();
    RETURN v_expired;
END;
$$;


-- ============================================================================
-- 2. CRIAÇÃO DA TABELA DE INSPEÇÕES (Se não existir)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inspecoes_realizadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    asset_patrimonio VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Conforme', 'Não Conforme')),
    observacoes TEXT,
    tecnico_nome VARCHAR(255) NOT NULL,
    data_inspecao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ============================================================================
-- 3. REMOÇÃO DE CHAVE ESTRANGEIRA CONFLITANTE
-- ============================================================================

-- Remove a restrição de chave estrangeira que causa conflito ao referenciar o id de extintores
ALTER TABLE public.inspecoes_realizadas 
DROP CONSTRAINT IF EXISTS inspecoes_realizadas_asset_id_fkey;


-- ============================================================================
-- 4. HABILITAÇÃO DO RLS E CONFIGURAÇÃO DE POLÍTICAS
-- ============================================================================

-- Habilita Row Level Security
ALTER TABLE public.inspecoes_realizadas ENABLE ROW LEVEL SECURITY;

-- Remove políticas legadas se existirem
DROP POLICY IF EXISTS "Leitura de inspecoes para autenticados" ON public.inspecoes_realizadas;
DROP POLICY IF EXISTS "Inserção de inspecoes para autenticados" ON public.inspecoes_realizadas;
DROP POLICY IF EXISTS "Exclusão de inspecoes para Devs e Admins" ON public.inspecoes_realizadas;

-- Política 1: Permite que usuários autenticados e ativos visualizem as inspeções
CREATE POLICY "Leitura de inspecoes para autenticados" 
ON public.inspecoes_realizadas 
FOR SELECT 
TO authenticated 
USING (NOT public.is_my_account_expired());

-- Política 2: Permite que técnicos autenticados e ativos registrem novos laudos
CREATE POLICY "Inserção de inspecoes para autenticados" 
ON public.inspecoes_realizadas 
FOR INSERT 
TO authenticated 
WITH CHECK (NOT public.is_my_account_expired());

-- Política 3: Permite que apenas Devs e Admins excluam registros de inspeção
CREATE POLICY "Exclusão de inspecoes para Devs e Admins" 
ON public.inspecoes_realizadas 
FOR DELETE 
TO authenticated 
USING ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired());
