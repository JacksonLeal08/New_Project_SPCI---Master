-- ====================================================================
-- MIGRAÇÃO SPCI MASTER: ADIÇÃO DO CAMPO TIPO_MOVIMENTACAO EM EXTINTORES
-- Data: 14-08-2026
-- ====================================================================

-- 1. Adicionar coluna tipo_movimentacao na tabela extintores (se existir) com valor default 'na_area_aplicado'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'extintores') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extintores' AND column_name = 'tipo_movimentacao') THEN
            ALTER TABLE extintores ADD COLUMN tipo_movimentacao TEXT DEFAULT 'na_area_aplicado';
        END IF;

        -- Atualizar registros existentes nulos
        UPDATE extintores SET tipo_movimentacao = 'na_area_aplicado' WHERE tipo_movimentacao IS NULL;

        -- Adicionar constraint de validação de valores permitidos
        ALTER TABLE extintores DROP CONSTRAINT IF EXISTS extintores_tipo_movimentacao_check;
        ALTER TABLE extintores ADD CONSTRAINT extintores_tipo_movimentacao_check 
        CHECK (tipo_movimentacao IN (
            'na_area_aplicado',
            'estoque_aplicacao',
            'estoque_ag_manut',
            'em_manutencao',
            'condenado',
            'extraviado'
        ));

        -- Criar índice de performance para filtros rápidos
        CREATE INDEX IF NOT EXISTS idx_extintores_tipo_movimentacao ON extintores(tipo_movimentacao);

        COMMENT ON COLUMN extintores.tipo_movimentacao IS 
        'Tipo de movimentação do extintor: na_area_aplicado, estoque_aplicacao, estoque_ag_manut, em_manutencao, condenado, extraviado';
    END IF;
END $$;

-- 2. Adicionar coluna tipo_movimentacao na tabela assets (se existir) para sincronização de estoque
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'tipo_movimentacao') THEN
            ALTER TABLE assets ADD COLUMN tipo_movimentacao TEXT DEFAULT 'na_area_aplicado';
        END IF;

        UPDATE assets SET tipo_movimentacao = 'na_area_aplicado' WHERE tipo_movimentacao IS NULL;
        CREATE INDEX IF NOT EXISTS idx_assets_tipo_movimentacao ON assets(tipo_movimentacao);
    END IF;
END $$;
