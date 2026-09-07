-- ============================================================================
-- SPCI MASTER - MIGRAÇÃO DE SUPORTE A JUSTIFICATIVA EM INSPEÇÕES REALIZADAS
-- Data: 07-09-2026
-- Objetivo: Adicionar coluna 'justificativa_reinspecao' na tabela 'inspecoes_realizadas'
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspecoes_realizadas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inspecoes_realizadas' AND column_name = 'justificativa_reinspecao') THEN
            ALTER TABLE public.inspecoes_realizadas ADD COLUMN justificativa_reinspecao TEXT;
        END IF;
    END IF;
END $$;
