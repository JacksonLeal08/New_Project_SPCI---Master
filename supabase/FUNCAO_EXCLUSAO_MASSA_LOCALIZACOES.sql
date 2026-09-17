-- ==============================================================================
-- FUNÇÃO DE EXCLUSÃO EM MASSA SEGURA & AUDITADA DE LOCALIZAÇÕES OPERACIONAIS
-- SPCI Master - Governança de Dados & Integridade Referencial
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.bulk_delete_localizacoes_operacionais(
    p_ids UUID[],
    p_contrato_id TEXT DEFAULT NULL,
    p_usuario_id TEXT DEFAULT NULL,
    p_usuario_nome TEXT DEFAULT 'Sistema'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bloqueados_count INT := 0;
    v_bloqueados_detalhes JSONB := '[]'::jsonb;
    v_excluidos_count INT := 0;
    v_excluidos_ids UUID[] := ARRAY[]::uuid[];
    v_rec RECORD;
BEGIN
    -- 1. VALIDAÇÃO PREVENTIVA DE INTEGRIDADE REFERENCIAL
    -- Verifica se qualquer uma das localizações possui ativos operacionais vinculados na tabela assets
    FOR v_rec IN (
        SELECT 
            loc.id,
            loc.setor_planta,
            loc.sub_local,
            loc.contrato_id,
            COUNT(ast.id) as total_ativos,
            jsonb_agg(
                jsonb_build_object(
                    'id', ast.id,
                    'id_ativo', COALESCE(ast.id_ativo, ast.patrimonio),
                    'categoria', ast.category,
                    'status', ast.status
                )
            ) as ativos_vinculados
        FROM public.localizacoes_operacionais loc
        JOIN public.assets ast ON (
            (ast.location ILIKE loc.setor_planta AND ast.sub_location ILIKE loc.sub_local)
            AND (loc.contrato_id IS NULL OR ast.site IS NULL OR ast.site ILIKE loc.contrato_id)
            AND (ast.status IS NULL OR ast.status NOT ILIKE '%CONDENADO%')
        )
        WHERE loc.id = ANY(p_ids)
        GROUP BY loc.id, loc.setor_planta, loc.sub_local, loc.contrato_id
    ) LOOP
        IF v_rec.total_ativos > 0 THEN
            v_bloqueados_count := v_bloqueados_count + 1;
            v_bloqueados_detalhes := v_bloqueados_detalhes || jsonb_build_object(
                'id', v_rec.id,
                'setor_planta', v_rec.setor_planta,
                'sub_local', v_rec.sub_local,
                'total_ativos', v_rec.total_ativos,
                'ativos', v_rec.ativos_vinculados
            );
        END IF;
    END LOOP;

    -- Também checa na tabela ativos_extintores caso exista e tenha vínculos por local_id ou sub_local_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ativos_extintores') THEN
        FOR v_rec IN (
            SELECT 
                loc.id,
                loc.setor_planta,
                loc.sub_local,
                COUNT(ext.id) as total_extintores,
                jsonb_agg(
                    jsonb_build_object(
                        'id', ext.id,
                        'id_ativo', ext.numero_patrimonio,
                        'categoria', 'Extintor',
                        'status', ext.status_inspecao
                    )
                ) as extintores_vinculados
            FROM public.localizacoes_operacionais loc
            JOIN public.ativos_extintores ext ON (
                ext.numero_patrimonio IS NOT NULL 
                AND ext.status_operacional NOT IN ('CONDENADO_DESCARTE')
                AND (
                    (ext.setor_planta ILIKE loc.setor_planta AND ext.sub_local ILIKE loc.sub_local)
                    OR (ext.local_id::text = loc.id::text OR ext.sub_local_id::text = loc.id::text)
                )
            )
            WHERE loc.id = ANY(p_ids)
            GROUP BY loc.id, loc.setor_planta, loc.sub_local
        ) LOOP
            IF v_rec.total_extintores > 0 THEN
                -- Se ainda não estiver registrado nos bloqueados, adiciona
                IF NOT (v_bloqueados_detalhes @> jsonb_build_array(jsonb_build_object('id', v_rec.id))) THEN
                    v_bloqueados_count := v_bloqueados_count + 1;
                    v_bloqueados_detalhes := v_bloqueados_detalhes || jsonb_build_object(
                        'id', v_rec.id,
                        'setor_planta', v_rec.setor_planta,
                        'sub_local', v_rec.sub_local,
                        'total_ativos', v_rec.total_extintores,
                        'ativos', v_rec.extintores_vinculados
                    );
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Se existirem locais bloqueados com ativos, ABORTA a transação
    IF v_bloqueados_count > 0 THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'OPERAÇÃO_BLOQUEADA: Existem ativos operacionais vinculados a um ou mais locais selecionados.',
            'total_bloqueados', v_bloqueados_count,
            'locais_bloqueados', v_bloqueados_detalhes
        );
    END IF;

    -- 2. EXPURGO DOS REGISTROS AUTORIZADOS
    WITH deleted AS (
        DELETE FROM public.localizacoes_operacionais
        WHERE id = ANY(p_ids)
        RETURNING id
    )
    SELECT COUNT(*), array_agg(id)
    INTO v_excluidos_count, v_excluidos_ids
    FROM deleted;

    -- 3. REGISTRO EM LOGS DE AUDITORIA
    IF v_excluidos_count > 0 THEN
        INSERT INTO public.logs_auditoria (
            acao,
            tabela,
            usuario_id,
            usuario_nome,
            detalhes,
            created_at
        ) VALUES (
            'EXCLUSAO_MASSA_LOCAIS',
            'localizacoes_operacionais',
            p_usuario_id,
            p_usuario_nome,
            jsonb_build_object(
                'quantidade_excluida', v_excluidos_count,
                'ids_excluidos', v_excluidos_ids,
                'contrato_id', p_contrato_id,
                'timestamp', NOW()
            )::text,
            NOW()
        );
    END IF;

    -- 4. RETORNO POSITIVO
    RETURN jsonb_build_object(
        'sucesso', true,
        'quantidade_excluida', v_excluidos_count,
        'ids_excluidos', v_excluidos_ids
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'sucesso', false,
        'erro', SQLERRM,
        'detalhe', SQLSTATE
    );
END;
$$;
