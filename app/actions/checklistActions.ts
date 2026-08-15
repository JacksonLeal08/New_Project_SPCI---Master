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
    throw new Error(
      'Configuração ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estão configuradas no servidor.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export interface ChecklistItemRecord {
  id: string;
  ordem: number;
  categoria: string;
  item: string;
  tipos_aplicaveis: string[];
  pesos_aplicaveis: string[];
  status: 'Ativado' | 'Desativado';
  is_impeditivo?: boolean;
  isImpeditivo?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Busca todos os itens de checklist configurados no Supabase para uma determinada categoria
 */
export async function getChecklistItemsAction(categoria: string = 'extintores') {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from('checklists_ativos')
      .select('*')
      .eq('categoria', categoria)
      .order('ordem', { ascending: true });

    if (error) {
      const isMissing = error.message.toLowerCase().includes('schema cache') || error.message.toLowerCase().includes('could not find the table');
      return { success: false, error: error.message, isTableMissing: isMissing, items: [] };
    }

    const items: ChecklistItemRecord[] = (data || []).map((row: any) => {
      const tipos = Array.isArray(row.tipos_aplicaveis) ? row.tipos_aplicaveis : ['Todos'];
      const pesos = Array.isArray(row.pesos_aplicaveis) ? row.pesos_aplicaveis : ['Todos'];
      const isImp = typeof row.is_impeditivo === 'boolean' ? row.is_impeditivo : false;
      return {
        id: row.id,
        ordem: row.ordem,
        categoria: row.categoria,
        item: row.item,
        tipos_aplicaveis: tipos,
        pesos_aplicaveis: pesos,
        tiposAplicaveis: tipos,
        pesosAplicaveis: pesos,
        status: row.status === 'Desativado' ? 'Desativado' : 'Ativado',
        is_impeditivo: isImp,
        isImpeditivo: isImp,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    return { success: true, items };
  } catch (err: any) {
    console.warn('[getChecklistItemsAction Catch]:', err.message || err);
    return { success: false, error: err.message || 'Erro ao carregar checklist.', items: [] };
  }
}

/**
 * Salva ou atualiza a lista completa de itens de checklist de uma categoria no Supabase
 */
export async function saveChecklistItemsAction(categoria: string, items: ChecklistItemRecord[]) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();

    const payload = items.map((it, idx) => ({
      id: it.id,
      ordem: idx + 1,
      categoria: categoria,
      item: it.item,
      tipos_aplicaveis: it.tipos_aplicaveis || (it as any).tiposAplicaveis || ['Todos'],
      pesos_aplicaveis: it.pesos_aplicaveis || (it as any).pesosAplicaveis || ['Todos'],
      status: it.status || 'Ativado',
      is_impeditivo: it.is_impeditivo ?? it.isImpeditivo ?? false,
      updated_at: new Date().toISOString()
    }));

    // Tenta upsert dos itens
    const { error } = await supabaseAdmin
      .from('checklists_ativos')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[saveChecklistItemsAction] Aviso ao salvar no banco:', error.message);
      const isMissing = error.message.toLowerCase().includes('schema cache') || error.message.toLowerCase().includes('could not find the table');
      return { success: false, error: error.message, isTableMissing: isMissing };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[saveChecklistItemsAction Catch]:', err);
    const isMissing = err.message ? (err.message.toLowerCase().includes('schema cache') || err.message.toLowerCase().includes('could not find the table')) : false;
    return { success: false, error: err.message || 'Erro ao salvar checklist no Supabase.', isTableMissing: isMissing };
  }
}

/**
 * Deleta um item específico de checklist no Supabase
 */
export async function deleteChecklistItemAction(id: string) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { error } = await supabaseAdmin
      .from('checklists_ativos')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir item de checklist.' };
  }
}
