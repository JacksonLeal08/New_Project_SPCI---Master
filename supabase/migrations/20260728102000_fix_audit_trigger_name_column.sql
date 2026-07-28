-- Migração: Correção da Função do Trigger de Auditoria (Coluna nome_completo/user_name)
-- Data: 2026-07-28
-- Descrição: Atualiza public.process_audit_log() para buscar nome_completo ou user_name em vez da coluna inexistente "name" em public.usuarios.

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
        BEGIN
            SELECT COALESCE(nome_completo, user_name, 'Técnico Autenticado'), email 
            INTO v_user_name, v_user_email 
            FROM public.usuarios 
            WHERE id = auth.uid();
        EXCEPTION WHEN OTHERS THEN
            v_user_name := 'Técnico Autenticado';
        END;
        
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

    -- 4. Gravar o log de auditoria sem bloquear a transação principal
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Audit log failed: %', SQLERRM;
    END;

    RETURN COALESCE(new, old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
