-- Migration: 20260610010000_shared_sessions_schema.sql
-- Descrição: Criação da tabela shared_sessions para links temporários e RPC de validação.

CREATE TABLE IF NOT EXISTS public.shared_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_by_nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked'))
);

ALTER TABLE public.shared_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para a tabela shared_sessions
DROP POLICY IF EXISTS "Usuarios autenticados criam shared_sessions" ON public.shared_sessions;
CREATE POLICY "Usuarios autenticados criam shared_sessions" 
ON public.shared_sessions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios veem suas proprias shared_sessions" ON public.shared_sessions;
CREATE POLICY "Usuarios veem suas proprias shared_sessions" 
ON public.shared_sessions FOR SELECT TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Usuarios atualizam suas proprias shared_sessions" ON public.shared_sessions;
CREATE POLICY "Usuarios atualizam suas proprias shared_sessions" 
ON public.shared_sessions FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Função RPC de validação de token usada pelo middleware e cliente público
CREATE OR REPLACE FUNCTION public.validate_shared_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session FROM public.shared_sessions 
    WHERE id = p_token AND status = 'active' AND expires_at > now();

    IF FOUND THEN
        RETURN jsonb_build_object(
            'valid', true,
            'created_by', v_session.created_by,
            'created_by_nome', v_session.created_by_nome,
            'expires_at', v_session.expires_at
        );
    ELSE
        RETURN jsonb_build_object('valid', false);
    END IF;
END;
$$;
