-- ==============================================================================
-- MIGRAÇÃO DOS DADOS LEGADOS E FINALIZAÇÃO DA LIMPEZA - SPCI MASTER
-- ==============================================================================

-- PASSO 1: Copiar todos os 486 sub-locais e 78 setores legados para a nova tabela mestre oficial
INSERT INTO public.localizacoes_operacionais (
    contrato_id,
    projeto_site,
    setor_planta,
    sub_local,
    is_ativo,
    created_at,
    updated_at
)
SELECT 
    'SALOBO' AS contrato_id,
    'SALOBO' AS projeto_site,
    UPPER(TRIM(l.nome)) AS setor_planta,
    UPPER(TRIM(sl.nome)) AS sub_local,
    true AS is_ativo,
    NOW() AS created_at,
    NOW() AS updated_at
FROM public.sub_locais sl
JOIN public.locais l ON l.id = sl.local_id
ON CONFLICT (contrato_id, LOWER(TRIM(setor_planta)), LOWER(TRIM(sub_local))) DO NOTHING;

-- PASSO 2: Agora que os dados estão salvos na nova tabela mestre e nos backups (_bkp_legado_...),
-- podemos remover de vez as tabelas legadas do painel do Supabase:
DROP TABLE IF EXISTS public.sub_locais CASCADE;
DROP TABLE IF EXISTS public.locais CASCADE;

-- ==============================================================================
-- FIM DA MIGRAÇÃO
-- ==============================================================================
