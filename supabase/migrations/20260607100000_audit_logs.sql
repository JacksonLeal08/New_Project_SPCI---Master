-- Migração: Criação da Tabela de Auditoria de Logs e Triggers Automáticos
-- Autor: Arquiteto de Banco de Dados Master
-- Data: 2026-06-07

-- 1. TABELA PRINCIPAL DE LOGS DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    usuario_nome VARCHAR(255) NOT NULL,
    usuario_email VARCHAR(255) NOT NULL,
    acao VARCHAR(100) NOT NULL, -- 'LOGIN', 'LOGOUT', 'CADASTRO_ATIVO', 'EDICAO_ATIVO', 'EXCLUSAO_ATIVO', 'INSPECAO', 'IMPORTACAO'
    tipo_ativo VARCHAR(100), -- 'extintores', 'hidrantes', 'sinalizacoes', 'iluminacao', 'bombas'
    patrimonio VARCHAR(100), -- Número do patrimônio do ativo associado
    detalhes TEXT, -- Detalhes descritivos da ação
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Leitura de logs para autenticados" ON public.logs_auditoria;
DROP POLICY IF EXISTS "Inserção de logs para autenticados" ON public.logs_auditoria;

-- Política de Leitura: Usuários autenticados podem ler os logs se não estiverem expirados
CREATE POLICY "Leitura de logs para autenticados" ON public.logs_auditoria 
    FOR SELECT TO authenticated
    USING (NOT public.is_my_account_expired());

-- Política de Escrita: Usuários autenticados podem gravar logs (como logins e logouts do cliente)
CREATE POLICY "Inserção de logs para autenticados" ON public.logs_auditoria 
    FOR INSERT TO authenticated
    WITH CHECK (NOT public.is_my_account_expired());


-- 3. FUNÇÃO DO TRIGGER DE AUDITORIA
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name VARCHAR(255) := 'Sistema';
    v_user_email VARCHAR(255) := 'sistema@spci.com';
    v_acao VARCHAR(100);
    v_tipo_ativo VARCHAR(100);
    v_patrimonio VARCHAR(100);
    v_detalhes TEXT;
BEGIN
    -- 1. Tentar obter dados do usuário da sessão ativa no Supabase
    IF auth.uid() IS NOT NULL THEN
        SELECT name, email INTO v_user_name, v_user_email 
        FROM public.usuarios 
        WHERE id = auth.uid();
        
        IF v_user_name IS NULL THEN
            v_user_name := 'Técnico Autenticado';
        END IF;
    END IF;

    -- 2. Identificar a ação pelo tipo de operação SQL
    IF TG_OP = 'INSERT' THEN
        v_acao := 'CADASTRO_ATIVO';
    ELSIF TG_OP = 'UPDATE' THEN
        v_acao := 'EDICAO_ATIVO';
    ELSIF TG_OP = 'DELETE' THEN
        v_acao := 'EXCLUSAO_ATIVO';
    END IF;

    -- 3. Regras específicas para cada tabela
    IF TG_TABLE_NAME = 'ativos_extintores' THEN
        v_tipo_ativo := 'extintores';
        IF TG_OP = 'DELETE' THEN
            v_patrimonio := old.numero_patrimonio;
            v_detalhes := 'Extintor excluído definitivamente. Patrimônio: ' || old.numero_patrimonio;
        ELSE
            v_patrimonio := new.numero_patrimonio;
            v_detalhes := 'Extintor cadastrado/atualizado. Local ID: ' || COALESCE(new.local_id::text, 'N/A') || 
                          ', Selo: ' || COALESCE(new.selo_inmetro, 'N/A') || 
                          ', Chassi: ' || COALESCE(new.chassi, 'N/A');
        END IF;
        
    ELSIF TG_TABLE_NAME = 'assets' THEN
        IF TG_OP = 'DELETE' THEN
            v_tipo_ativo := old.category;
            v_patrimonio := old.id_ativo;
            v_detalhes := 'Ativo removido definitivamente. Categoria: ' || old.category || 
                          ', Local: ' || COALESCE(old.location, 'N/A');
        ELSE
            v_tipo_ativo := new.category;
            v_patrimonio := new.id_ativo;
            v_detalhes := 'Ativo cadastrado/atualizado. Categoria: ' || new.category || 
                          ', Modelo: ' || COALESCE(new.model, 'N/A') || 
                          ', Local: ' || COALESCE(new.location, 'N/A');
        END IF;
        
    ELSIF TG_TABLE_NAME = 'inspecoes_realizadas' THEN
        v_acao := 'INSPECAO';
        IF TG_OP = 'DELETE' THEN
            v_tipo_ativo := 'inspecoes';
            v_patrimonio := old.asset_patrimonio;
            v_detalhes := 'Relatório de vistoria removido. Técnico: ' || old.tecnico_nome || 
                          ', Status: ' || old.status;
        ELSE
            v_tipo_ativo := 'inspecoes';
            v_patrimonio := new.asset_patrimonio;
            -- Se for inserção no portal aberto e sem auth.uid(), usamos o técnico digitado
            IF auth.uid() IS NULL AND new.tecnico_nome IS NOT NULL THEN
                v_user_name := new.tecnico_nome;
                v_user_email := 'portal_vistoria@spci.com';
            END IF;
            v_detalhes := 'Vistoria registrada. Técnico: ' || new.tecnico_nome || 
                          ', Status: ' || new.status || 
                          ', Observações: ' || COALESCE(new.observacoes, 'Sem observações.');
        END IF;
    END IF;

    -- 4. Gravar o log de auditoria
    INSERT INTO public.logs_auditoria (
        usuario_id,
        usuario_nome,
        usuario_email,
        acao,
        tipo_ativo,
        patrimonio,
        detalhes
    )
    VALUES (
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE auth.uid() END,
        v_user_name,
        v_user_email,
        v_acao,
        v_tipo_ativo,
        v_patrimonio,
        v_detalhes
    );

    RETURN COALESCE(new, old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. ASSOCIAÇÃO DOS TRIGGERS ÀS TABELAS DO SPCI
-- Triggers para ativos_extintores
DROP TRIGGER IF EXISTS tr_ativos_extintores_audit ON public.ativos_extintores;
CREATE TRIGGER tr_ativos_extintores_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.ativos_extintores
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Triggers para assets (hidrantes, sinalização, iluminação, bombas)
DROP TRIGGER IF EXISTS tr_assets_audit ON public.assets;
CREATE TRIGGER tr_assets_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.assets
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Triggers para inspecoes_realizadas
DROP TRIGGER IF EXISTS tr_inspecoes_realizadas_audit ON public.inspecoes_realizadas;
CREATE TRIGGER tr_inspecoes_realizadas_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.inspecoes_realizadas
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
