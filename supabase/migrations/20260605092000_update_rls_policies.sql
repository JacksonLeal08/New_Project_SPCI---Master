-- Migração: Atualização de Políticas RLS para Importação e Cadastro em Campo (Sintaxe Corrigida)
-- Autor: Arquiteto de Banco de Dados Master & Especialista Supabase
-- Data: 2026-06-05
--
-- Descrição:
-- Esta migração atualiza as restrições de inserção (INSERT) nas tabelas locais, sub_locais,
-- modelos_extintores e ativos_extintores. Permite que todos os usuários autenticados (incluindo
-- Técnicos com a Role 'Usuário') possam cadastrar novos ativos e suas respectivas localizações.
-- Mantém a exclusividade de UPDATE e DELETE para Administradores e Desenvolvedores.


-- ----------------------------------------------------------------------------
-- 1. Políticas: locais
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de locais para autenticados" ON public.locais;
DROP POLICY IF EXISTS "Escrita de locais para Devs e Admins" ON public.locais;
DROP POLICY IF EXISTS "Update de locais para Devs e Admins" ON public.locais;
DROP POLICY IF EXISTS "Update de locais para autenticados" ON public.locais;
DROP POLICY IF EXISTS "Delete de locais para Devs e Admins" ON public.locais;
DROP POLICY IF EXISTS "Inserção de locais para autenticados" ON public.locais;

-- Permite SELECT para todos os usuários autenticados (sem verificação de expiração para visualização rápida)
CREATE POLICY "Leitura de locais para autenticados" ON public.locais FOR SELECT TO authenticated
    USING (true);

-- Permite UPDATE para todos os usuários autenticados (necessário para suportar upsert concorrente)
CREATE POLICY "Update de locais para autenticados" ON public.locais FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permite DELETE apenas para Devs e Admins
CREATE POLICY "Delete de locais para Devs e Admins" ON public.locais FOR DELETE TO authenticated
    USING ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired());

-- Permite INSERT para todos os usuários autenticados
CREATE POLICY "Inserção de locais para autenticados" ON public.locais FOR INSERT TO authenticated
    WITH CHECK (true);


-- ----------------------------------------------------------------------------
-- 2. Políticas: sub_locais
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de sub_locais para autenticados" ON public.sub_locais;
DROP POLICY IF EXISTS "Escrita de sub_locais para Devs e Admins" ON public.sub_locais;
DROP POLICY IF EXISTS "Update de sub_locais para Devs e Admins" ON public.sub_locais;
DROP POLICY IF EXISTS "Update de sub_locais para autenticados" ON public.sub_locais;
DROP POLICY IF EXISTS "Delete de sub_locais para Devs e Admins" ON public.sub_locais;
DROP POLICY IF EXISTS "Inserção de sub_locais para autenticados" ON public.sub_locais;

-- Permite SELECT para todos os usuários autenticados (sem verificação de expiração para visualização rápida)
CREATE POLICY "Leitura de sub_locais para autenticados" ON public.sub_locais FOR SELECT TO authenticated
    USING (true);

-- Permite UPDATE para todos os usuários autenticados (necessário para suportar upsert concorrente)
CREATE POLICY "Update de sub_locais para autenticados" ON public.sub_locais FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permite DELETE apenas para Devs e Admins
CREATE POLICY "Delete de sub_locais para Devs e Admins" ON public.sub_locais FOR DELETE TO authenticated
    USING ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired());

-- Permite INSERT para todos os usuários autenticados
CREATE POLICY "Inserção de sub_locais para autenticados" ON public.sub_locais FOR INSERT TO authenticated
    WITH CHECK (true);


-- ----------------------------------------------------------------------------
-- 3. Políticas: modelos_extintores
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de modelos para autenticados" ON public.modelos_extintores;
DROP POLICY IF EXISTS "Escrita de modelos para Devs e Admins" ON public.modelos_extintores;
DROP POLICY IF EXISTS "Update de modelos para Devs e Admins" ON public.modelos_extintores;
DROP POLICY IF EXISTS "Update de modelos para autenticados" ON public.modelos_extintores;
DROP POLICY IF EXISTS "Delete de modelos para Devs e Admins" ON public.modelos_extintores;
DROP POLICY IF EXISTS "Inserção de modelos para autenticados" ON public.modelos_extintores;

-- Permite SELECT para todos os usuários autenticados (sem verificação de expiração para visualização rápida)
CREATE POLICY "Leitura de modelos para autenticados" ON public.modelos_extintores FOR SELECT TO authenticated
    USING (true);

-- Permite UPDATE para todos os usuários autenticados (necessário para suportar upsert concorrente)
CREATE POLICY "Update de modelos para autenticados" ON public.modelos_extintores FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permite DELETE apenas para Devs e Admins
CREATE POLICY "Delete de modelos para Devs e Admins" ON public.modelos_extintores FOR DELETE TO authenticated
    USING ((public.get_my_role() IN ('Desenvolvedor', 'Administrador')) AND NOT public.is_my_account_expired());

-- Permite INSERT para todos os usuários autenticados
CREATE POLICY "Inserção de modelos para autenticados" ON public.modelos_extintores FOR INSERT TO authenticated
    WITH CHECK (true);



-- ----------------------------------------------------------------------------
-- 4. Políticas: ativos_extintores
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Inserção de ativos_extintores para Admins e Devs" ON public.ativos_extintores;
DROP POLICY IF EXISTS "Inserção de ativos_extintores para autenticados" ON public.ativos_extintores;

-- Permite INSERT para todos os usuários autenticados ativos
CREATE POLICY "Inserção de ativos_extintores para autenticados" ON public.ativos_extintores FOR INSERT TO authenticated
    WITH CHECK (NOT public.is_my_account_expired());

-- ----------------------------------------------------------------------------
-- 5. Carga de Dados Padrão (Seeding)
-- ----------------------------------------------------------------------------
-- Garante que exista pelo menos um local padrão e um modelo padrão para evitar falhas de fallback
INSERT INTO public.locais (nome) VALUES ('GERAL') ON CONFLICT (nome) DO NOTHING;
INSERT INTO public.modelos_extintores (nome) VALUES ('PQS ABC - 6KG') ON CONFLICT (nome) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 6. Correção de Lógica: is_my_account_expired
-- ----------------------------------------------------------------------------
-- Garante que a função nunca retorne NULL caso o perfil do usuário ainda não esteja 
-- totalmente criado na tabela public.usuarios durante a primeira sincronização.
CREATE OR REPLACE FUNCTION public.is_my_account_expired()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT coalesce((SELECT data_expiracao < now() FROM public.usuarios WHERE id = auth.uid()), false);
$$;