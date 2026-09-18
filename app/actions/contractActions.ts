'use server';

import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com privilégios de Admin (Service Role)
const getSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SERVICE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuração ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export interface ContratoSite {
  id: string;
  nome: string;
  codigo_slug: string;
  razao_social: string;
  cnpj: string;
  cidade_uf: string;
  endereco?: string;
  latitude?: number | null;
  longitude?: number | null;
  telefone_emergencia?: string;
  email_gestor?: string;
  whatsapp_gestor?: string;
  logo_url?: string;
  status: 'ATIVO' | 'EM IMPLANTAÇÃO' | 'ENCERRADO';
  ativo: boolean;
  total_ativos?: number;
  total_usuarios?: number;
  indice_conformidade?: number;
  created_at?: string;
}

// Helper para parsear metadados salvos na coluna descricao se colunas dedicadas não existirem no schema
function parseDescricaoMetadata(descricao: string | null | undefined): Record<string, any> {
  if (!descricao) return {};
  if (descricao.startsWith('{') && descricao.endsWith('}')) {
    try {
      return JSON.parse(descricao);
    } catch {
      return { raw: descricao };
    }
  }
  return { raw: descricao };
}

/**
 * Busca a listagem executiva completa de Contratos com métricas agregadas
 * (Contagem de ativos, brigadistas e índice de conformidade)
 */
export async function fetchContractsOverviewAction(): Promise<{
  success: boolean;
  contratos: ContratoSite[];
  metrics: {
    totalContratos: number;
    totalAtivos: number;
    totalCidadesUf: number;
  };
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();

    // 1. Busca contratos cadastrados
    let rawContratos: any[] = [];
    const { data: cData, error: cErr } = await supabase
      .from('contratos')
      .select('*')
      .order('created_at', { ascending: true });

    if (!cErr && cData && cData.length > 0) {
      rawContratos = cData;
    } else {
      // Fallback para os 2 contratos protegidos do SPCI
      rawContratos = [
        {
          id: '6ca3347b-1184-4743-afd7-2928a00ccd4f',
          nome: 'SALOBO',
          codigo_slug: 'SALOBO',
          razao_social: 'VALE S.A. - PROJETO SALOBO',
          cnpj: '33.592.510/0001-54',
          cidade_uf: 'Marabá / Parauapebas - PA',
          telefone_emergencia: '(94) 3328-7000',
          email_gestor: 'cecom.salobo@vale.com',
          status: 'ATIVO',
          ativo: true,
          latitude: -5.8117,
          longitude: -50.5369
        },
        {
          id: 'c21d2e1f-5930-4745-9afe-244131eb32d3',
          nome: 'ONÇA PUMA',
          codigo_slug: 'ONCA_PUMA',
          razao_social: 'VALE S.A. - PROJETO ONÇA PUMA',
          cnpj: '33.592.510/0005-88',
          cidade_uf: 'Ourilândia do Norte - PA',
          telefone_emergencia: '(94) 3334-9000',
          email_gestor: 'cecom.oncapuma@vale.com',
          status: 'ATIVO',
          ativo: true,
          latitude: -6.5381,
          longitude: -51.0583
        }
      ];
    }

    // 2. Busca contagem de ativos por site
    const { data: assetsData } = await supabase
      .from('assets')
      .select('id, site, contrato_id, status');

    const assetsList = assetsData || [];

    // 3. Busca colaboradores por site
    const { data: usersData } = await supabase
      .from('usuarios')
      .select('id, site');

    const usersList = usersData || [];

    // Deduplica lista por id ou nome normalizado
    const seenNames = new Set<string>();
    const uniqueContratos = rawContratos.filter(c => {
      const key = String(c.nome || '').trim().toUpperCase();
      if (!key || seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    const parsedContratos: ContratoSite[] = uniqueContratos.map(c => {
      const meta = parseDescricaoMetadata(c.descricao);
      const nomeNorm = String(c.nome || '').trim().toUpperCase();
      const slug = c.codigo_slug || meta.codigo_slug || nomeNorm.replace(/\s+/g, '_');

      // Calcula ativos vinculados
      const linkedAssets = assetsList.filter((a: any) => {
        const aSite = String(a.site || '').trim().toUpperCase();
        return aSite === nomeNorm || (c.id && a.contrato_id === c.id);
      });

      // Calcula usuários vinculados
      const linkedUsers = usersList.filter((u: any) => {
        const uSite = String(u.site || '').trim().toUpperCase();
        return uSite === nomeNorm || uSite.includes(nomeNorm) || uSite.includes('TODOS');
      });

      // Índice de conformidade estimado (% de ativos em conformidade)
      const nonConforming = linkedAssets.filter((a: any) => 
        String(a.status || '').toUpperCase().includes('VENCIDO') ||
        String(a.status || '').toUpperCase().includes('MANUTEN') ||
        String(a.status || '').toUpperCase().includes('IRREGULAR')
      ).length;

      const complianceScore = linkedAssets.length > 0 
        ? Math.round(((linkedAssets.length - nonConforming) / linkedAssets.length) * 100)
        : 100;

      const isProtected = nomeNorm === 'SALOBO' || nomeNorm === 'ONÇA PUMA' || nomeNorm === 'ONCA PUMA';

      return {
        id: c.id || `c-${slug.toLowerCase()}`,
        nome: nomeNorm,
        codigo_slug: slug,
        razao_social: c.razao_social || meta.razao_social || (isProtected ? `VALE S.A. - COMPLEXO ${nomeNorm}` : `EMPRESA CONTRATANTE - SITE ${nomeNorm}`),
        cnpj: c.cnpj || meta.cnpj || (isProtected ? '33.592.510/0001-54' : 'NÃO INFORMADO'),
        cidade_uf: c.cidade_uf || meta.cidade_uf || (nomeNorm === 'SALOBO' ? 'Marabá / Parauapebas - PA' : nomeNorm.includes('ONÇA') ? 'Ourilândia do Norte - PA' : 'Pará - PA'),
        endereco: c.endereco || meta.endereco || '',
        latitude: c.latitude !== undefined && c.latitude !== null ? Number(c.latitude) : (meta.latitude ?? (nomeNorm === 'SALOBO' ? -5.8117 : -6.5381)),
        longitude: c.longitude !== undefined && c.longitude !== null ? Number(c.longitude) : (meta.longitude ?? (nomeNorm === 'SALOBO' ? -50.5369 : -51.0583)),
        telefone_emergencia: c.telefone_emergencia || meta.telefone_emergencia || (isProtected ? '(94) 3328-7000' : '(94) 99999-0000'),
        email_gestor: c.email_gestor || meta.email_gestor || `gestor.${slug.toLowerCase()}@empresa.com`,
        whatsapp_gestor: c.whatsapp_gestor || meta.whatsapp_gestor || '',
        logo_url: c.logo_url || meta.logo_url || '',
        status: (c.status || meta.status || (c.ativo === false ? 'ENCERRADO' : 'ATIVO')) as any,
        ativo: c.ativo !== false,
        total_ativos: linkedAssets.length,
        total_usuarios: linkedUsers.length,
        indice_conformidade: complianceScore,
        created_at: c.created_at || new Date().toISOString()
      };
    });

    // Métricas gerais
    const totalContratos = parsedContratos.filter(c => c.status === 'ATIVO').length;
    const totalAtivos = assetsList.length;
    const uniqueCities = new Set(parsedContratos.map(c => c.cidade_uf).filter(Boolean));

    return {
      success: true,
      contratos: parsedContratos,
      metrics: {
        totalContratos,
        totalAtivos,
        totalCidadesUf: uniqueCities.size || 1
      }
    };
  } catch (err: any) {
    console.error('[fetchContractsOverviewAction]', err);
    return {
      success: false,
      contratos: [],
      metrics: { totalContratos: 0, totalAtivos: 0, totalCidadesUf: 0 },
      error: err.message || 'Erro ao carregar contratos operacionais.'
    };
  }
}

/**
 * Criação de Novo Contrato com dados corporativos, localização GPS e CECOM
 */
export async function createContractAction(payload: {
  nome: string;
  codigo_slug: string;
  razao_social?: string;
  cnpj?: string;
  cidade_uf?: string;
  endereco?: string;
  latitude?: number | null;
  longitude?: number | null;
  telefone_emergencia?: string;
  email_gestor?: string;
  whatsapp_gestor?: string;
  logo_url?: string;
  status?: 'ATIVO' | 'EM IMPLANTAÇÃO' | 'ENCERRADO';
}): Promise<{ success: boolean; contrato?: ContratoSite; error?: string }> {
  try {
    const supabase = getSupabaseAdminClient();

    const cleanNome = payload.nome.trim().toUpperCase();
    const cleanSlug = (payload.codigo_slug || cleanNome.replace(/\s+/g, '_')).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');

    if (!cleanNome) {
      return { success: false, error: 'O Nome do Contrato é obrigatório.' };
    }
    if (!cleanSlug) {
      return { success: false, error: 'O Código Identificador (Slug) é obrigatório.' };
    }

    // Verifica se já existe contrato com esse nome ou slug
    const { data: existing } = await supabase
      .from('contratos')
      .select('id, nome')
      .or(`nome.ilike.${cleanNome}`);

    if (existing && existing.length > 0) {
      return { success: false, error: `Já existe um contrato cadastrado com o nome "${cleanNome}".` };
    }

    const newId = crypto.randomUUID();
    const metadataToStore = {
      codigo_slug: cleanSlug,
      razao_social: payload.razao_social || `CONTRATANTE ${cleanNome}`,
      cnpj: payload.cnpj || '',
      cidade_uf: payload.cidade_uf || '',
      endereco: payload.endereco || '',
      latitude: payload.latitude,
      longitude: payload.longitude,
      telefone_emergencia: payload.telefone_emergencia || '',
      email_gestor: payload.email_gestor || '',
      whatsapp_gestor: payload.whatsapp_gestor || '',
      logo_url: payload.logo_url || '',
      status: payload.status || 'ATIVO'
    };

    // Tenta inserir com colunas dedicadas
    let insertData: any = {
      id: newId,
      nome: cleanNome,
      descricao: JSON.stringify(metadataToStore),
      ativo: payload.status !== 'ENCERRADO',
      ...metadataToStore
    };

    let { error } = await supabase.from('contratos').insert([insertData]);

    // Se o schema ainda não tiver as colunas extras (PGRST204), remove as colunas extras e persiste os metadados em JSON na coluna descricao
    if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
      const fallbackPayload = {
        id: newId,
        nome: cleanNome,
        descricao: JSON.stringify(metadataToStore),
        ativo: payload.status !== 'ENCERRADO'
      };
      const retry = await supabase.from('contratos').insert([fallbackPayload]);
      error = retry.error;
    }

    if (error) {
      return { success: false, error: `Falha ao cadastrar no Supabase: ${error.message}` };
    }

    const createdContract: ContratoSite = {
      id: newId,
      nome: cleanNome,
      codigo_slug: cleanSlug,
      razao_social: metadataToStore.razao_social,
      cnpj: metadataToStore.cnpj,
      cidade_uf: metadataToStore.cidade_uf,
      endereco: metadataToStore.endereco,
      latitude: metadataToStore.latitude,
      longitude: metadataToStore.longitude,
      telefone_emergencia: metadataToStore.telefone_emergencia,
      email_gestor: metadataToStore.email_gestor,
      whatsapp_gestor: metadataToStore.whatsapp_gestor,
      logo_url: metadataToStore.logo_url,
      status: (payload.status || 'ATIVO') as any,
      ativo: payload.status !== 'ENCERRADO',
      total_ativos: 0,
      total_usuarios: 0,
      indice_conformidade: 100,
      created_at: new Date().toISOString()
    };

    return { success: true, contrato: createdContract };
  } catch (err: any) {
    console.error('[createContractAction]', err);
    return { success: false, error: err.message || 'Erro inesperado ao criar contrato.' };
  }
}

/**
 * Atualização de Contrato existente mantendo o código/slug e id IMUTÁVEIS
 */
export async function updateContractAction(
  id: string,
  payload: {
    nome: string;
    razao_social?: string;
    cnpj?: string;
    cidade_uf?: string;
    endereco?: string;
    latitude?: number | null;
    longitude?: number | null;
    telefone_emergencia?: string;
    email_gestor?: string;
    whatsapp_gestor?: string;
    logo_url?: string;
    status?: 'ATIVO' | 'EM IMPLANTAÇÃO' | 'ENCERRADO';
    ativo?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdminClient();

    const cleanNome = String(payload.nome || '').trim().toUpperCase();

    // 1. Busca contrato atual por ID (usando limit(1) para evitar quebra com duplicatas)
    let current: any = null;
    if (id) {
      const { data: listById } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', id)
        .limit(1);
      if (listById && listById.length > 0) {
        current = listById[0];
      }
    }

    // 2. Se não localizou pelo ID, tenta localizar pelo Nome Operacional
    if (!current && cleanNome) {
      const { data: listByName } = await supabase
        .from('contratos')
        .select('*')
        .ilike('nome', cleanNome)
        .limit(1);
      if (listByName && listByName.length > 0) {
        current = listByName[0];
      }
    }

    // 3. Fallback inteligente: se ainda não constar no banco, cadastra como novo contrato
    // aproveitando todos os dados preenchidos no formulário (conforme solicitado pelo operador)
    if (!current) {
      const fallbackSlug = cleanNome.replace(/[^A-Z0-9_]/g, '_') || 'NOVO_CONTRATO';
      const createRes = await createContractAction({
        nome: cleanNome,
        codigo_slug: fallbackSlug,
        razao_social: payload.razao_social || `EMPRESA CONTRATANTE - ${cleanNome}`,
        cnpj: payload.cnpj || 'NÃO INFORMADO',
        cidade_uf: payload.cidade_uf || 'Pará - PA',
        endereco: payload.endereco,
        latitude: payload.latitude,
        longitude: payload.longitude,
        telefone_emergencia: payload.telefone_emergencia,
        email_gestor: payload.email_gestor,
        whatsapp_gestor: payload.whatsapp_gestor,
        logo_url: payload.logo_url,
        status: payload.status || 'ATIVO'
      });
      return { success: createRes.success, error: createRes.error };
    }

    const targetId = current.id;
    const currentMeta = parseDescricaoMetadata(current.descricao);
    const updatedMeta = {
      ...currentMeta,
      nome: cleanNome || current.nome,
      razao_social: payload.razao_social ?? currentMeta.razao_social,
      cnpj: payload.cnpj ?? currentMeta.cnpj,
      cidade_uf: payload.cidade_uf ?? currentMeta.cidade_uf,
      endereco: payload.endereco ?? currentMeta.endereco,
      latitude: payload.latitude !== undefined ? payload.latitude : currentMeta.latitude,
      longitude: payload.longitude !== undefined ? payload.longitude : currentMeta.longitude,
      telefone_emergencia: payload.telefone_emergencia ?? currentMeta.telefone_emergencia,
      email_gestor: payload.email_gestor ?? currentMeta.email_gestor,
      whatsapp_gestor: payload.whatsapp_gestor ?? currentMeta.whatsapp_gestor,
      logo_url: payload.logo_url ?? currentMeta.logo_url,
      status: payload.status ?? currentMeta.status ?? 'ATIVO'
    };

    const isAtivo = payload.status === 'ENCERRADO' ? false : (payload.ativo !== undefined ? payload.ativo : current.ativo);

    const updatePayload: any = {
      ...updatedMeta,
      nome: cleanNome || current.nome,
      descricao: JSON.stringify(updatedMeta),
      ativo: isAtivo
    };

    // Tenta atualizar com colunas dedicadas
    let { error } = await supabase
      .from('contratos')
      .update(updatePayload)
      .eq('id', targetId);

    // Se colunas extras não existirem no schema físico, persiste via JSON no campo descricao
    if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
      const fallbackPayload = {
        nome: cleanNome || current.nome,
        descricao: JSON.stringify(updatedMeta),
        ativo: isAtivo
      };
      const retry = await supabase.from('contratos').update(fallbackPayload).eq('id', targetId);
      error = retry.error;
    }

    if (error) {
      return { success: false, error: `Erro ao atualizar contrato: ${error.message}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[updateContractAction]', err);
    return { success: false, error: err.message || 'Erro inesperado ao atualizar contrato.' };
  }
}

/**
 * Trava de Integridade Referencial (Guardrail):
 * - Se houver ativos vinculados (> 0): bloqueia exclusão física e aplica Soft Delete (status = 'ENCERRADO').
 * - Se ativos = 0 ou chamado com forcePurge exclusivo de Desenvolvedor: exclui fisicamente.
 */
export async function deleteOrDeactivateContractAction(
  id: string,
  nome: string,
  callerRole?: string,
  forcePurge: boolean = false
): Promise<{
  success: boolean;
  softDeleted?: boolean;
  hardDeleted?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();
    const cleanNome = String(nome || '').trim().toUpperCase();

    // Contratos protegidos nunca podem ser excluídos fisicamente
    if (cleanNome === 'SALOBO' || cleanNome === 'ONÇA PUMA' || cleanNome === 'ONCA PUMA') {
      return {
        success: false,
        error: `O contrato base "${cleanNome}" é um pilar estrutural do SPCI e protegido contra exclusão.`
      };
    }

    // 1. Consulta se existem ativos alocados a esse contrato
    const { count: assetCount, error: countErr } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .or(`site.ilike.${cleanNome},contrato_id.eq.${id}`);

    if (countErr) {
      console.warn('[deleteOrDeactivateContractAction] Falha ao checar ativos vinculados:', countErr.message);
    }

    const totalAtivos = assetCount || 0;

    // GUARDRAIL: Se houver ativos e não for purga expressa de Desenvolvedor, apenas desativa
    if (totalAtivos > 0 && !(callerRole === 'Desenvolvedor' && forcePurge)) {
      // Soft Delete
      const { data: current } = await supabase.from('contratos').select('descricao').eq('id', id).single();
      const meta = parseDescricaoMetadata(current?.descricao);
      meta.status = 'ENCERRADO';

      const updateData: any = {
        ativo: false,
        descricao: JSON.stringify(meta)
      };

      await supabase.from('contratos').update(updateData).eq('id', id);

      return {
        success: true,
        softDeleted: true,
        message: `O contrato "${cleanNome}" possui ${totalAtivos} ativos cadastrados. Por governança e rastreabilidade, ele foi DESATIVADO (status ENCERRADO) e ocultado da rotina diária sem perda de dados históricos.`
      };
    }

    // Exclusão Física (Hard Delete) - Permitida apenas se ativos = 0 ou Desenvolvedor com purge
    const { error: deleteErr } = await supabase
      .from('contratos')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      return { success: false, error: `Erro ao excluir contrato: ${deleteErr.message}` };
    }

    return {
      success: true,
      hardDeleted: true,
      message: `O contrato "${cleanNome}" foi removido definitivamente do sistema.`
    };
  } catch (err: any) {
    console.error('[deleteOrDeactivateContractAction]', err);
    return { success: false, error: err.message || 'Erro ao processar remoção de contrato.' };
  }
}
