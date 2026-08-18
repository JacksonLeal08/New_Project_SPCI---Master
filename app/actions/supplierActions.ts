'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

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
      persistSession: false,
    },
  });
};

export interface FornecedorRecord {
  id: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  registro_inmetro?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  contato_responsavel?: string | null;
  endereco?: string | null;
  cidade_uf?: string | null;
  ativo: boolean;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SaveSupplierPayload {
  id?: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  registro_inmetro?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  contato_responsavel?: string;
  endereco?: string;
  cidade_uf?: string;
  ativo?: boolean;
  observacoes?: string;
}

/**
 * Consulta todos os fornecedores cadastrados
 */
export async function getSuppliersAction(onlyActive: boolean = false): Promise<{
  success: boolean;
  suppliers?: FornecedorRecord[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from('fornecedores_manutencao')
      .select('*')
      .order('ativo', { ascending: false })
      .order('razao_social', { ascending: true });

    if (onlyActive) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query;

    if (error) {
      // Fallback caso a tabela não tenha sido criada no remote ainda
      console.warn('[getSuppliersAction] Aviso Supabase:', error.message);
      return { success: true, suppliers: [] };
    }

    return {
      success: true,
      suppliers: (data as FornecedorRecord[]) || [],
    };
  } catch (err: any) {
    console.error('[getSuppliersAction] Erro inesperado:', err);
    return { success: false, error: err.message || 'Erro ao carregar fornecedores.' };
  }
}

/**
 * Salva ou atualiza um fornecedor / prestador de serviços
 */
export async function saveSupplierAction(payload: SaveSupplierPayload): Promise<{
  success: boolean;
  supplier?: FornecedorRecord;
  error?: string;
}> {
  try {
    if (!payload.razao_social || !payload.razao_social.trim()) {
      return { success: false, error: 'A Razão Social é obrigatória.' };
    }

    const supabase = getSupabaseAdminClient();
    const cleanData = {
      razao_social: payload.razao_social.trim(),
      nome_fantasia: payload.nome_fantasia?.trim() || null,
      cnpj: payload.cnpj?.trim() || null,
      registro_inmetro: payload.registro_inmetro?.trim() || null,
      telefone: payload.telefone?.trim() || null,
      whatsapp: payload.whatsapp?.trim() || null,
      email: payload.email?.trim() || null,
      contato_responsavel: payload.contato_responsavel?.trim() || null,
      endereco: payload.endereco?.trim() || null,
      cidade_uf: payload.cidade_uf?.trim() || null,
      ativo: payload.ativo !== undefined ? payload.ativo : true,
      observacoes: payload.observacoes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let resultData: FornecedorRecord | null = null;

    if (payload.id) {
      // Update
      const { data, error } = await supabase
        .from('fornecedores_manutencao')
        .update(cleanData)
        .eq('id', payload.id)
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('fornecedores_manutencao')
        .insert({
          ...cleanData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    }

    revalidatePath('/configuracoes');
    return { success: true, supplier: resultData || undefined };
  } catch (err: any) {
    console.error('[saveSupplierAction] Erro ao salvar fornecedor:', err);
    const isSchemaError = err?.message?.includes('schema cache') || err?.message?.includes('does not exist') || err?.message?.includes('Could not find');
    const customMsg = isSchemaError
      ? "A tabela de fornecedores ainda não foi criada no seu banco Supabase. Por favor, execute o script 'EXECUTAR_NO_SUPABASE_SPCI_MASTER.sql' no SQL Editor do Supabase."
      : (err.message || 'Erro ao registrar fornecedor no banco de dados.');
    return { success: false, error: customMsg };
  }
}

/**
 * Remove ou desativa um fornecedor
 */
export async function deleteSupplierAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from('fornecedores_manutencao')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/configuracoes');
    return { success: true };
  } catch (err: any) {
    console.error('[deleteSupplierAction] Erro ao remover fornecedor:', err);
    return { success: false, error: err.message || 'Erro ao excluir fornecedor.' };
  }
}

/**
 * Alterna status Ativo / Inativo
 */
export async function toggleSupplierStatusAction(id: string, ativo: boolean): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from('fornecedores_manutencao')
      .update({ ativo, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/configuracoes');
    return { success: true };
  } catch (err: any) {
    console.error('[toggleSupplierStatusAction] Erro ao alterar status:', err);
    return { success: false, error: err.message || 'Erro ao atualizar status do fornecedor.' };
  }
}
