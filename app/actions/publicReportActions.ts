'use server';

import { createClient } from '@supabase/supabase-js';

const getSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuração ausente do Supabase no servidor.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export interface PublicAnomalyPayload {
  assetId: string;
  anomalias: string[];
  descricao?: string;
  comunicanteNome?: string;
  comunicanteContato?: string;
  fotoUrl?: string;
}

export async function reportPublicAnomalyAction(payload: PublicAnomalyPayload) {
  try {
    const supabase = getSupabaseAdminClient();
    const cleanId = (payload.assetId || '').trim().toUpperCase();

    if (!cleanId) {
      return { success: false, error: 'Identificador do ativo não fornecido.' };
    }

    // 1. Localizar o ativo no banco
    const { data: asset, error: findError } = await supabase
      .from('assets')
      .select('*')
      .or(`id.eq.${cleanId},id_ativo.eq.${cleanId},patrimonio.eq.${cleanId}`)
      .maybeSingle();

    const assetDbId = asset ? asset.id : cleanId;
    const ticketId = `CHAMADO-PUB-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    // 2. Se o ativo for encontrado, atualiza seu status para Atenção / Verificação
    if (asset) {
      const existingDetails = (asset.details as any) || {};
      const updatedDetails = {
        ...existingDetails,
        chamado_pendente: {
          ticket_id: ticketId,
          origem: 'REPORTE_PUBLICO',
          anomalias: payload.anomalias,
          descricao: payload.descricao || '',
          comunicante_nome: payload.comunicanteNome || 'Colaborador Anônimo',
          comunicante_contato: payload.comunicanteContato || '',
          data_reporte: nowIso,
          status_chamado: 'ABERTO'
        }
      };

      await supabase
        .from('assets')
        .update({
          status: 'Atenção / Verificação',
          details: updatedDetails,
          updated_at: nowIso
        })
        .eq('id', asset.id);
    }

    // 3. Registrar auditoria em audit_logs
    await supabase.from('audit_logs').insert({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: 'PUBLIC_ANONYMOUS',
      user_email: payload.comunicanteContato || 'publico@spci-master.local',
      action: 'REPORTE_PUBLICO_ANOMALIA',
      entity: 'assets',
      details: {
        ticket_id: ticketId,
        asset_id: assetDbId,
        id_ativo: asset?.id_ativo || cleanId,
        anomalias: payload.anomalias,
        descricao: payload.descricao,
        comunicante: payload.comunicanteNome || 'Anônimo',
        contato: payload.comunicanteContato || 'Não informado',
        localizacao: asset?.location || 'Não informada'
      },
      created_at: nowIso
    });

    return {
      success: true,
      ticketId,
      message: `Chamado ${ticketId} registrado com sucesso no sistema SPCI.`
    };
  } catch (error: any) {
    console.error('[reportPublicAnomalyAction] Erro ao registrar anomalia:', error);
    return {
      success: false,
      error: error.message || 'Falha ao registrar chamado no servidor.'
    };
  }
}
