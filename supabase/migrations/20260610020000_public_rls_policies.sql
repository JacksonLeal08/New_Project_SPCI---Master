-- Migration: 20260610020000_public_rls_policies.sql
-- Descrição: Políticas de RLS flexíveis permitindo acesso anônimo autenticado via token HTTP.

-- Função para validar se o header contém um token válido
CREATE OR REPLACE FUNCTION public.current_request_has_valid_token()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token_str TEXT;
    v_token UUID;
BEGIN
    v_token_str := current_setting('request.headers', true)::json->>'x-shared-token';
    IF v_token_str IS NULL OR v_token_str = '' THEN
        RETURN FALSE;
    END IF;
    
    BEGIN
        v_token := v_token_str::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    RETURN EXISTS (
        SELECT 1 FROM public.shared_sessions
        WHERE id = v_token AND status = 'active' AND expires_at > now()
    );
END;
$$;

-- 1. Tabela: locais (SELECT, INSERT)
DROP POLICY IF EXISTS "Leitura de locais para autenticados" ON public.locais;
CREATE POLICY "Leitura de locais flexível" ON public.locais 
FOR SELECT TO authenticated, anon 
USING (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

DROP POLICY IF EXISTS "Inserção de locais para autenticados" ON public.locais;
CREATE POLICY "Inserção de locais flexível" ON public.locais 
FOR INSERT TO authenticated, anon 
WITH CHECK (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

-- 2. Tabela: sub_locais (SELECT, INSERT)
DROP POLICY IF EXISTS "Leitura de sub_locais para autenticados" ON public.sub_locais;
CREATE POLICY "Leitura de sub_locais flexível" ON public.sub_locais 
FOR SELECT TO authenticated, anon 
USING (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

DROP POLICY IF EXISTS "Inserção de sub_locais para autenticados" ON public.sub_locais;
CREATE POLICY "Inserção de sub_locais flexível" ON public.sub_locais 
FOR INSERT TO authenticated, anon 
WITH CHECK (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

-- 3. Tabela: modelos_extintores (SELECT, INSERT)
DROP POLICY IF EXISTS "Leitura de modelos para autenticados" ON public.modelos_extintores;
CREATE POLICY "Leitura de modelos flexível" ON public.modelos_extintores 
FOR SELECT TO authenticated, anon 
USING (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

DROP POLICY IF EXISTS "Inserção de modelos para autenticados" ON public.modelos_extintores;
CREATE POLICY "Inserção de modelos flexível" ON public.modelos_extintores 
FOR INSERT TO authenticated, anon 
WITH CHECK (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

-- 4. Tabela: ativos_extintores (SELECT, INSERT, UPDATE)
-- Nota: SELECT para buscar dados e INSERT para novos cadastros em campo.
DROP POLICY IF EXISTS "Leitura de ativos_extintores para autenticados" ON public.ativos_extintores;
CREATE POLICY "Leitura de ativos_extintores flexível" ON public.ativos_extintores 
FOR SELECT TO authenticated, anon 
USING (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

DROP POLICY IF EXISTS "Inserção de ativos_extintores para autenticados" ON public.ativos_extintores;
CREATE POLICY "Inserção de ativos_extintores flexível" ON public.ativos_extintores 
FOR INSERT TO authenticated, anon 
WITH CHECK ((auth.role() = 'authenticated' AND NOT public.is_my_account_expired()) OR public.current_request_has_valid_token());

DROP POLICY IF EXISTS "Update de ativos_extintores para autenticados" ON public.ativos_extintores;
CREATE POLICY "Update de ativos_extintores flexível" ON public.ativos_extintores 
FOR UPDATE TO authenticated, anon 
USING (auth.role() = 'authenticated' OR public.current_request_has_valid_token())
WITH CHECK (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

-- 5. Tabela: inspecoes_realizadas (SELECT, INSERT)
DROP POLICY IF EXISTS "Leitura de inspecoes para autenticados" ON public.inspecoes_realizadas;
CREATE POLICY "Leitura de inspecoes flexível" ON public.inspecoes_realizadas 
FOR SELECT TO authenticated, anon 
USING ((auth.role() = 'authenticated' AND NOT public.is_my_account_expired()) OR public.current_request_has_valid_token());

DROP POLICY IF EXISTS "Inserção de inspecoes para autenticados" ON public.inspecoes_realizadas;
CREATE POLICY "Inserção de inspecoes flexível" ON public.inspecoes_realizadas 
FOR INSERT TO authenticated, anon 
WITH CHECK ((auth.role() = 'authenticated' AND NOT public.is_my_account_expired()) OR public.current_request_has_valid_token());
