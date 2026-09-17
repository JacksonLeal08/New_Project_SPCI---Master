-- ==============================================================================
-- PLANO DE AUDITORIA & EXPURGO DE TABELAS OBSOLETAS - SPCI MASTER
-- Especialista de Backend & DBA (@backend-specialist)
-- Banco de Dados: SPCI Master | JIMMP Info Org | Supabase (katqbezpcssrmicgnshg)
-- ==============================================================================

-- 1. EXPURGO DE TABELAS FANTASMAS / VAZIAS (Sem uso no frontend nem dados)
-- A tabela locais_planta foi criada em migração legada e está com 0 registros.
DROP TABLE IF EXISTS public.locais_planta CASCADE;

-- A tabela audit_logs foi criada duplicada com 0 registros (o sistema oficial usa logs_auditoria).
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- 2. DESATIVAÇÃO E ARQUIVAMENTO DAS TABELAS LEGADAS DE SETORES E SUB-LOCAIS
-- IMPORTANTE: Após a importação oficial da planilha Vale na nova tabela localizacoes_operacionais,
-- as tabelas locais e sub_locais tornam-se obsoletas.
-- Para arquivar com segurança antes de remover definitivamente:

DO $$
BEGIN
    -- Se desejar criar backup prévio antes do drop definitivo:
    CREATE TABLE IF NOT EXISTS public._bkp_legado_locais AS TABLE public.locais;
    CREATE TABLE IF NOT EXISTS public._bkp_legado_sub_locais AS TABLE public.sub_locais;
    RAISE NOTICE 'Backups de segurança criados: _bkp_legado_locais e _bkp_legado_sub_locais.';
END $$;

-- 3. REMOÇÃO DAS TABELAS LEGADAS DE SETORES E SUB-LOCAIS (Executar após confirmar a carga da nova tabela)
-- DROP TABLE IF EXISTS public.sub_locais CASCADE;
-- DROP TABLE IF EXISTS public.locais CASCADE;

-- ==============================================================================
-- FIM DO SCRIPT DE LIMPEZA E GOVERNANÇA
-- ==============================================================================
