import { supabase } from './supabaseClient';
import { InspecaoRealizada, normalizeTipoMovimentacao, TIPO_MOVIMENTACAO_MAP } from './types';
import { getUsersListAction } from '@/app/actions/userActions';


export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  userName: string;
  photoURL: string;
  logoUrl: string;
  role: 'Desenvolvedor' | 'Administrador' | 'Usuário';
  status: string;
  site?: string;
  telefoneWhatsapp: string;
  dataExpiracao?: string | null;
  createdAt: string;
  updatedAt: string;
  permissions?: string[];
}

// --- PROFILE SERIALIZATION & DESERIALIZATION HELPER ---
const serializeProfile = (profile: UserProfile) => {
  const dbStatus = (profile.status === 'active' || profile.status === 'Ativo') ? 'Ativo' : 'Inativo/Suspenso';
  return {
    id: profile.uid,
    nome_completo: profile.name,
    email: profile.email,
    user_name: profile.userName,
    foto_perfil_url: profile.photoURL || null,
    perfil_acesso: profile.role,
    status_conta: dbStatus,
    telefone_whatsapp: profile.telefoneWhatsapp || null,
    updated_at: new Date().toISOString()
  };
};

const deserializeProfile = (data: any): UserProfile => {
  const mappedRole = (data.perfil_acesso === 'Desenvolvedor' || data.perfil_acesso === 'Administrador' || data.perfil_acesso === 'Usuário')
    ? data.perfil_acesso
    : 'Usuário';

  const mappedStatus = (data.status_conta === 'active' || data.status_conta === 'Ativo')
    ? 'Ativo'
    : (data.status_conta === 'pending' || data.status_conta === 'Pendente')
    ? 'Pendente'
    : 'Inativo/Suspenso';

  return {
    uid: data.id,
    name: data.nome_completo || 'Usuário Sem Nome',
    email: data.email || '',
    userName: data.user_name || (data.email ? data.email.split('@')[0] : 'user'),
    photoURL: data.foto_perfil_url || '',
    logoUrl: data.logo_url || '',
    role: mappedRole,
    status: mappedStatus,
    site: data.site || 'TODOS OS SITES (Acesso Global)',
    telefoneWhatsapp: data.telefone_whatsapp || '',
    dataExpiracao: data.data_expiracao || null,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
    permissions: Array.isArray(data.permissions) ? data.permissions : []
  };
};

// --- SYSTEM AUDIT LOGGING ---
export async function logSystemAction(
  acao: string, 
  tipoAtivo?: string, 
  patrimonio?: string, 
  detalhes?: string,
  userOverride?: { id?: string; nome?: string; email?: string }
): Promise<void> {
  try {
    let uId = userOverride?.id || null;
    let uName = userOverride?.nome || 'Sistema';
    let uEmail = userOverride?.email || null;

    if (!userOverride) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        uId = user.id;
        uEmail = user.email || null;
        uName = user.user_metadata?.nome_completo || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
      }
    }

    await supabase.from('logs_auditoria').insert([{
      usuario_id: uId,
      usuario_nome: uName,
      usuario_email: uEmail,
      acao: acao,
      tipo_ativo: tipoAtivo || null,
      patrimonio: patrimonio || null,
      detalhes: detalhes || null,
      created_at: new Date().toISOString()
    }]);
  } catch (err) {
    console.warn('[logSystemAction] Aviso ao registrar log:', err);
  }
}

// --- ASSETS SERIALIZATION & DESERIALIZATION HELPER ---
const getNormalizedCategory = (collectionName: string) => {
  if (collectionName === 'extintores') return 'extintores';
  if (collectionName === 'hidrantes') return 'hidrantes';
  if (collectionName === 'sinalizacoes') return 'sinalizacoes';
  if (collectionName === 'iluminacao') return 'iluminacao';
  if (collectionName === 'bombas') return 'bombas';
  return collectionName;
};

const serializeAsset = (category: string, id: string, asset: any) => {
  const {
    idAtivo,
    patrimonio,
    model,
    location,
    subLocation,
    status,
    status_estoque,
    tipo_movimentacao,
    numero_serie,
    chassi,
    seloInmetro,
    peso,
    peso_capacidade,
    validadeRecarga,
    data_vencimento_teste,
    data_fabricacao,
    fabricante,
    geolocation,
    category: omittedCategory,
    ...details
  } = asset;

  const tipoMov = normalizeTipoMovimentacao(tipo_movimentacao || status_estoque || details?.tipo_movimentacao);
  const stEstoque = status_estoque || TIPO_MOVIMENTACAO_MAP[tipoMov]?.label || 'NA ÁREA (APLICADO)';
  const pat = patrimonio || idAtivo || id;
  const numSerie = numero_serie || chassi || details?.serialNumber || '';

  return {
    id: id,
    id_ativo: pat,
    patrimonio: pat,
    numero_serie: numSerie,
    category: category,
    model: model || details?.model || null,
    location: location || null,
    sub_location: subLocation || null,
    status: status || 'Conforme',
    status_estoque: stEstoque,
    tipo_movimentacao: tipoMov,
    data_fabricacao: data_fabricacao || null,
    data_vencimento_teste: data_vencimento_teste || validadeRecarga || null,
    latitude: geolocation?.lat || null,
    longitude: geolocation?.lng || null,
    details: {
      ...details,
      fabricante: fabricante || details?.fabricante || '',
      peso_capacidade: peso_capacidade || peso || details?.peso_capacidade || '',
      seloInmetro: seloInmetro || details?.seloInmetro || '',
      serialNumber: numSerie,
      validadeRecarga: validadeRecarga || data_vencimento_teste || null,
      tipo_movimentacao: tipoMov,
      status_estoque: stEstoque
    },
    created_at: asset.createdAt || asset.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

const deserializeAsset = (row: any) => {
  const geolocation = (row.latitude !== null && row.longitude !== null) ? {
    lat: Number(row.latitude),
    lng: Number(row.longitude)
  } : null;

  const tipoMov = normalizeTipoMovimentacao(row.tipo_movimentacao || row.status_estoque || row.details?.tipo_movimentacao);
  const statusEstoque = row.status_estoque || TIPO_MOVIMENTACAO_MAP[tipoMov]?.label || 'NA ÁREA (APLICADO)';

  return {
    id: row.id,
    idAtivo: row.id_ativo || row.patrimonio || row.id,
    numero_patrimonio: row.patrimonio || row.id_ativo || row.id,
    model: row.model || row.details?.model || '',
    location: row.location || '',
    subLocation: row.sub_location || '',
    status: row.status || 'Conforme',
    tipo_movimentacao: tipoMov,
    status_estoque: statusEstoque,
    numero_serie: row.numero_serie || row.details?.serialNumber || '',
    seloInmetro: row.selo_inmetro || row.details?.seloInmetro || '',
    chassi: row.numero_serie || row.chassi || '',
    peso: row.peso_capacidade || row.peso || row.details?.peso_capacidade || '',
    peso_capacidade: row.peso_capacidade || row.peso || row.details?.peso_capacidade || '',
    validadeRecarga: row.data_vencimento_teste || row.validadeRecarga || row.details?.validadeRecarga || '',
    data_vencimento_teste: row.data_vencimento_teste || row.validadeRecarga || row.details?.validadeRecarga || '',
    geolocation,
    category: row.category || 'extintores',
    ...row.details
  };
};

const deserializeExtintor = (row: any) => {
  const geolocation = (row.latitude !== null && row.longitude !== null) ? {
    lat: Number(row.latitude),
    lng: Number(row.longitude)
  } : null;

  const tipoMov = normalizeTipoMovimentacao(row.tipo_movimentacao || row.status_estoque);
  const statusEstoque = row.status_estoque || TIPO_MOVIMENTACAO_MAP[tipoMov]?.label || 'NA ÁREA (APLICADO)';

  return {
    id: row.id,
    idAtivo: row.id_ativo || row.patrimonio || row.id,
    numero_patrimonio: row.id_ativo || row.patrimonio || row.id,
    category: row.category || 'extintores',
    location: row.location || '',
    subLocation: row.sub_location || '',
    status: row.status || 'Conforme',
    tipo_movimentacao: tipoMov,
    status_estoque: statusEstoque,
    geolocation,
    // Mapeamento específico de extintores
    fabricante: row.fabricante || '',
    model: row.modelo || row.model || '',
    peso: row.peso_capacidade || row.peso || '',
    peso_capacidade: row.peso_capacidade || row.peso || '',
    capacidadeExtintora: row.capacidade_extintora || '',
    seloInmetro: row.selo_inmetro || '',
    chassi: row.chassi || row.numero_serie || '',
    numero_serie: row.chassi || row.numero_serie || '',
    anoFabricacao: row.ano_fabricacao || new Date().getFullYear(),
    ultimoTesteHidro: row.ultimo_teste_hidro || new Date().getFullYear(),
    lastRecarga: row.data_ultima_recarga || '',
    validadeRecargaMeses: row.validade_recarga_meses || 12,
    validadeRecarga: row.validade_recarga_data || row.validadeRecarga || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const getMonthsDiff = (d1Str: string, d2Str: string): number => {
  if (!d1Str || !d2Str) return 12;
  try {
    const d1 = new Date(d1Str);
    const d2 = new Date(d2Str);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 12;
    const years = d2.getFullYear() - d1.getFullYear();
    const months = d2.getMonth() - d1.getMonth();
    return years * 12 + months;
  } catch (e) {
    return 12;
  }
};

const normalizeToIsoDate = (val: any): string => {
  if (!val) return new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    // Excel date serial number
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const dateStr = String(val).trim();
  const ddMmYyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  if (ddMmYyyy.test(dateStr)) {
    const [, d, m, y] = dateStr.match(ddMmYyyy) || [];
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const yyyyMmDd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
  if (yyyyMmDd.test(dateStr)) {
    const [, y, m, d] = dateStr.match(yyyyMmDd) || [];
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
};

const deserializeNewExtintor = (row: any) => {
  // Map status_conformidade to display status: 'VENCIDO' -> 'Vencido', 'NO PRAZO' -> 'Conforme', 'A VENCER' -> 'Atenção'
  let displayStatus = 'Conforme';
  if (row.status_conformidade === 'VENCIDO') {
    displayStatus = 'Vencido';
  } else if (row.status_conformidade === 'A VENCER') {
    displayStatus = 'Atenção';
  }

  const recargaDate = row.data_ultima_recarga || '';
  const limiteRecargaDate = row.data_limite_recarga || '';
  const tipoMov = normalizeTipoMovimentacao(row.tipo_movimentacao || row.status_estoque);
  const statusEstoque = row.status_estoque || TIPO_MOVIMENTACAO_MAP[tipoMov]?.label || 'NA ÁREA (APLICADO)';

  return {
    id: row.id,
    idAtivo: row.numero_patrimonio || row.id,
    numero_patrimonio: row.numero_patrimonio || row.id,
    qr_code_hash: row.qr_code_hash,
    category: 'extintores',
    location: row.local_instalacao || row.location || '',
    subLocation: row.sub_local_instalacao || row.subLocation || '',
    status: displayStatus,
    tipo_movimentacao: tipoMov,
    status_estoque: statusEstoque,
    // specific fields
    model: row.modelo_tipo || row.modelo || row.model || '',
    peso: row.peso_capacidade || row.peso || '',
    peso_capacidade: row.peso_capacidade || row.peso || '',
    seloInmetro: row.selo_inmetro || '',
    chassi: row.numero_serie || row.chassi || '',
    numero_serie: row.numero_serie || row.chassi || '',
    lastRecarga: recargaDate,
    anoUltimoTesteHidro: row.ano_ultimo_teste_hidro || new Date().getFullYear(),
    ultimoTesteHidro: row.ano_ultimo_teste_hidro || new Date().getFullYear(),
    fotoUrl: row.foto_url || '',
    validadeRecarga: limiteRecargaDate,
    validadeTesteHidro: row.data_limite_hidro || '',
    statusConformidade: row.status_conformidade,
    validadeRecargaMeses: getMonthsDiff(recargaDate, limiteRecargaDate),
    anoFabricacao: row.ano_fabricacao || row.ano_ultimo_teste_hidro || new Date().getFullYear()
  };
};

// --- PROFILE DATABASE FUNCTIONS ---

/**
 * Recovers or registers a user profile on login.
 * If the user's email matches 'jackson602@gmail.com', they are bootstrapped as a 'Desenvolvedor'.
 */
/**
 * Recovers or registers a user profile on login.
 * Only 'jacksonflr@outlook.com.br' is the Master Developer.
 * All other accounts fetch their role dynamically from Supabase database / Auth metadata.
 */
export async function registerOrLoginUserProfile(user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }): Promise<UserProfile> {
  const cachedAvatar = typeof window !== 'undefined' ? localStorage.getItem(`spci_user_avatar_${user.uid}`) : null;
  const isMasterDev = user.email?.toLowerCase() === 'jacksonflr@outlook.com.br';

  const getSafeUserName = (email: string | null) => {
    const prefix = email?.split('@')[0] || 'usuario';
    return prefix.length >= 3 ? prefix : `${prefix}_usr`;
  };

  try {
    const { data: profileRow, error: selectErr } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.uid)
      .maybeSingle();

    if (profileRow && !selectErr) {
      const p = deserializeProfile(profileRow);
      if (cachedAvatar) p.logoUrl = cachedAvatar;
      if (isMasterDev) p.role = 'Desenvolvedor';
      return p;
    }

    // Fallback: tentar recuperar via Server Action com service role se a consulta anônima no cliente falhar
    try {
      const res = await getUsersListAction();
      if (res.success && res.users) {
        const found = res.users.find((u: any) => u.uid === user.uid || u.email?.toLowerCase() === user.email?.toLowerCase());
        if (found) {
          return {
            uid: found.uid,
            name: found.name,
            email: found.email,
            userName: found.username,
            photoURL: user.photoURL || '',
            logoUrl: cachedAvatar || '',
            role: (isMasterDev ? 'Desenvolvedor' : found.role) as any,
            status: found.status,
            telefoneWhatsapp: found.phone || '',
            dataExpiracao: found.dataExpiracao,
            createdAt: found.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
      }
    } catch (sErr) {
      console.warn('[registerOrLoginUserProfile] Aviso no fallback admin:', sErr);
    }

    const initialRole = isMasterDev ? 'Desenvolvedor' : 'Usuário';
    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Usuário SPCI',
      email: user.email || '',
      userName: getSafeUserName(user.email),
      photoURL: user.photoURL || '',
      logoUrl: cachedAvatar || '',
      role: initialRole,
      status: 'active',
      telefoneWhatsapp: '',
      dataExpiracao: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { error: insertErr } = await supabase
      .from('usuarios')
      .insert(serializeProfile(newProfile));

    if (insertErr) {
      console.warn('[registerOrLoginUserProfile] Aviso ao inserir no banco (RSL/Permissão):', insertErr.message);
    }
    return newProfile;
  } catch (error: any) {
    console.warn('[registerOrLoginUserProfile] Retornando perfil seguro com cache local:', error.message || error);
    return {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Usuário SPCI',
      email: user.email || '',
      userName: getSafeUserName(user.email),
      photoURL: user.photoURL || '',
      logoUrl: cachedAvatar || '',
      role: isMasterDev ? 'Desenvolvedor' : 'Usuário',
      status: 'active',
      telefoneWhatsapp: '',
      dataExpiracao: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

/**
 * Fetch a user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const cachedAvatar = typeof window !== 'undefined' ? localStorage.getItem(`spci_user_avatar_${uid}`) : null;
    const isMasterDevEmail = (email: string) => email?.toLowerCase() === 'jacksonflr@outlook.com.br';

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      const p = deserializeProfile(data);
      if (cachedAvatar) p.logoUrl = cachedAvatar;
      if (isMasterDevEmail(p.email)) {
        p.role = 'Desenvolvedor';
      }
      return p;
    }
    return null;
  } catch (error: any) {
    console.warn('Erro em getUserProfile (usando fallback local):', error.message);
    return null;
  }
}

/**
 * Updates a user's chosen custom logo
 */
export async function updateUserLogo(uid: string, logoUrl: string, name?: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && logoUrl) {
      localStorage.setItem(`spci_user_avatar_${uid}`, logoUrl);
    }

    const updatePayload: any = {
      logo_url: logoUrl,
      updated_at: new Date().toISOString()
    };
    if (name) {
      updatePayload.nome_completo = name;
    }

    const { error } = await supabase
      .from('usuarios')
      .update(updatePayload)
      .eq('id', uid);

    if (error) {
      console.warn('[updateUserLogo] Aviso ao atualizar no banco (salvo no cache local):', error.message);
    }
  } catch (error: any) {
    console.warn('[updateUserLogo] Atualização salva localmente:', error.message || error);
  }
}

/**
 * Admin updates a user's role and/or status
 */
export async function updateUserRoleAndStatus(
  uid: string, 
  role: 'Desenvolvedor' | 'Administrador' | 'Usuário', 
  status: string
): Promise<void> {
  try {
    const dbStatus = (status === 'active' || status === 'Ativo') ? 'Ativo' : 'Inativo/Suspenso';
    const { error } = await supabase
      .from('usuarios')
      .update({
        perfil_acesso: role,
        status_conta: dbStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', uid);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error in updateUserRoleAndStatus:', error);
    throw new Error(`Erro ao atualizar cargo e status de usuário: ${error.message || error}`);
  }
}

/**
 * Admin fetches all users registered in the system
 */
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const res = await getUsersListAction();
    if (res.success && res.users && res.users.length > 0) {
      const list = res.users.map((u: any) => ({
        uid: u.uid,
        name: u.name,
        email: u.email,
        userName: u.username,
        photoURL: '',
        logoUrl: '',
        role: u.role as any,
        status: u.status,
        site: u.site || 'TODOS OS SITES (Acesso Global)',
        telefoneWhatsapp: u.phone || '',
        dataExpiracao: u.dataExpiracao,
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      return list.sort((a, b) => {
        if (a.role !== b.role) {
          if (a.role === 'Desenvolvedor') return -1;
          if (b.role === 'Desenvolvedor') return 1;
          return a.role === 'Administrador' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    }

    const { data, error } = await supabase.from('usuarios').select('*');
    if (error) throw error;
    const list = (data || []).map(deserializeProfile);
    
    return list.sort((a, b) => {
      if (a.role !== b.role) {
        if (a.role === 'Desenvolvedor') return -1;
        if (b.role === 'Desenvolvedor') return 1;
        return a.role === 'Administrador' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error: any) {
    console.error('Error in getAllUserProfiles:', error);
    return [];
  }
}

/**
 * Admin deletes a user profile
 */
export async function deleteUserProfileByAdmin(uid: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('delete_user_by_admin', {
      p_uid: uid
    });

    if (error) throw error;
  } catch (error: any) {
    console.error('Error in deleteUserProfileByAdmin:', error);
    throw new Error(`Erro ao deletar perfil: ${error.message || error}`);
  }
}

/**
 * Busca as permissões de abas/elementos do usuário pelo UID.
 */
export async function getUserPermissions(uid: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_permissions', {
      p_uid: uid
    });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Erro em getUserPermissions:', error);
    return [];
  }
}

// --- ASSET DATABASE FUNCTIONS ---

/**
 * Generic Asset operations for Extintores, Hidrantes, etc
 */
export async function getAssetsList(collectionName: string): Promise<any[]> {
  try {
    const category = getNormalizedCategory(collectionName);
    
    if (category === 'extintores') {
      const { data, error } = await supabase
        .from('vw_extintores_publico')
        .select('*');

      if (error) {
        console.warn('Erro ao buscar de vw_extintores_publico, tentando view_extintores...', error);
        const { data: oldData, error: oldErr } = await supabase
          .from('view_extintores')
          .select('*');
        if (oldErr) throw oldErr;
        return (oldData || []).map(deserializeExtintor);
      }
      return (data || []).map(deserializeNewExtintor);
    }

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('category', category);

    if (error) throw error;
    return (data || []).map(deserializeAsset);
  } catch (error: any) {
    console.warn(`Could not get ${collectionName} from Supabase.`, error);
    return [];
  }
}

export async function saveAssetToDb(collectionName: string, id: string, asset: any, silent?: boolean): Promise<void> {
  try {
    if (collectionName === 'audit_logs') {
      const { error } = await supabase
        .from('logs_auditoria')
        .insert([{
          id: asset.id,
          usuario_id: asset.usuario_id || null,
          usuario_nome: asset.usuario_nome,
          usuario_email: asset.usuario_email,
          acao: asset.acao,
          tipo_ativo: asset.tipo_ativo || null,
          patrimonio: asset.patrimonio || null,
          detalhes: asset.detalhes || null,
          created_at: asset.created_at || new Date().toISOString()
        }]);
      if (error) throw error;
      return;
    }

    const category = getNormalizedCategory(collectionName);

    if (category === 'extintores') {
      let localId = asset.local_id;
      let subLocalId = asset.sub_local_id;
      let modeloId = asset.modelo_id;

      // Se local_id não estiver presente, resolvemos pelo nome do local
      if (!localId && asset.location) {
        const { data: locData } = await supabase
          .from('locais')
          .select('id')
          .eq('nome', asset.location.toUpperCase())
          .maybeSingle();
        
        if (locData) {
          localId = locData.id;
        } else {
          // Insere ou obtém o local se não existir (upsert seguro contra concorrência paralela)
          const { data: newLoc, error: locErr } = await supabase
            .from('locais')
            .upsert({ nome: asset.location.toUpperCase() }, { onConflict: 'nome' })
            .select('id')
            .single();
          if (locErr) {
            const detailMsg = locErr.message || JSON.stringify(locErr);
            console.error(`[saveAssetToDb] Erro ao cadastrar local "${asset.location}": ${detailMsg}`, locErr);
            throw new Error(`Erro ao cadastrar local "${asset.location}": ${detailMsg}`);
          }
          if (newLoc) {
            localId = newLoc.id;
          }
        }
      }

      // Se modelo_id não estiver presente, resolvemos pelo nome
      if (!modeloId && asset.model) {
        const { data: modData } = await supabase
          .from('modelos_extintores')
          .select('id')
          .eq('nome', asset.model.toUpperCase())
          .maybeSingle();
        
        if (modData) {
          modeloId = modData.id;
        } else {
          // Insere ou obtém o modelo se não existir (upsert seguro contra concorrência paralela)
          const { data: newMod, error: modErr } = await supabase
            .from('modelos_extintores')
            .upsert({ nome: asset.model.toUpperCase() }, { onConflict: 'nome' })
            .select('id')
            .single();
          if (modErr) {
            const detailMsg = modErr.message || JSON.stringify(modErr);
            console.error(`[saveAssetToDb] Erro ao cadastrar modelo "${asset.model}": ${detailMsg}`, modErr);
            throw new Error(`Erro ao cadastrar modelo "${asset.model}": ${detailMsg}`);
          }
          if (newMod) {
            modeloId = newMod.id;
          }
        }
      }

      // Se sub_local_id não estiver presente e tivermos localId, resolve pelo nome
      if (!subLocalId && asset.subLocation && localId) {
        const { data: subData } = await supabase
          .from('sub_locais')
          .select('id')
          .eq('local_id', localId)
          .eq('nome', asset.subLocation.toUpperCase())
          .maybeSingle();
        
        if (subData) {
          subLocalId = subData.id;
        } else {
          // Insere ou obtém o sub_local se não existir (upsert seguro contra concorrência paralela)
          const { data: newSub, error: subErr } = await supabase
            .from('sub_locais')
            .upsert({ local_id: localId, nome: asset.subLocation.toUpperCase() }, { onConflict: 'local_id,nome' })
            .select('id')
            .single();
          if (subErr) {
            const detailMsg = subErr.message || JSON.stringify(subErr);
            console.error(`[saveAssetToDb] Erro ao cadastrar sub-local "${asset.subLocation}": ${detailMsg}`, subErr);
            throw new Error(`Erro ao cadastrar sub-local "${asset.subLocation}": ${detailMsg}`);
          }
          if (newSub) {
            subLocalId = newSub.id;
          }
        }
      }

      // Garantir localId e modeloId padrão se nada resolveu
      if (!localId) {
        const { data: defLoc } = await supabase.from('locais').select('id').limit(1).maybeSingle();
        localId = defLoc?.id;
      }
      if (!modeloId) {
        const { data: defMod } = await supabase.from('modelos_extintores').select('id').limit(1).maybeSingle();
        modeloId = defMod?.id;
      }

      if (!localId || !modeloId) {
        throw new Error('Não foi possível resolver local_id ou modelo_id para o extintor. Certifique-se de que a migração SQL foi aplicada no Supabase e de que existem registros nas tabelas.');
      }

      const tipoMov = normalizeTipoMovimentacao(asset.tipo_movimentacao || asset.status_estoque);
      const statusEstoque = asset.status_estoque || TIPO_MOVIMENTACAO_MAP[tipoMov]?.label || 'NA ÁREA (APLICADO)';

      const payload: any = {
        local_id: localId,
        sub_local_id: subLocalId || null,
        numero_patrimonio: asset.idAtivo || asset.patrimonio || id,
        selo_inmetro: asset.seloInmetro || null,
        chassi: asset.chassi || asset.numero_serie || null,
        modelo_id: modeloId,
        peso_capacidade: asset.peso || asset.peso_capacidade || '6KG',
        data_ultima_recarga: normalizeToIsoDate(asset.lastRecarga || asset.data_ultima_recarga),
        meses_validade_recarga: parseInt(asset.validadeRecargaMeses || asset.meses_validade_recarga || '12', 10),
        ano_ultimo_teste_hidro: parseInt(asset.ultimoTesteHidro || asset.ano_ultimo_teste_hidro || new Date().getFullYear().toString(), 10),
        ano_fabricacao: parseInt(asset.anoFabricacao || asset.ano_fabricacao || new Date().getFullYear().toString(), 10),
        data_pesagem_co2: asset.data_pesagem_co2 ? normalizeToIsoDate(asset.data_pesagem_co2) : null,
        foto_url: asset.fotoUrl || asset.foto_url || null,
        tipo_movimentacao: tipoMov,
        updated_at: new Date().toISOString()
      };

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        payload.id = id;
      }

      let extErr;
      const { error: initialErr } = await supabase
        .from('ativos_extintores')
        .upsert(payload, { onConflict: 'numero_patrimonio' });
      
      extErr = initialErr;

      if (extErr) {
        // Self-healing: se colunas novas não existirem no schema remoto legado, re-tenta sem elas
        if (extErr.message?.includes('tipo_movimentacao') || extErr.message?.includes('ano_fabricacao') || extErr.code === 'PGRST204') {
          console.warn('[saveAssetToDb] Tentando upsert com fallback resiliente:', extErr.message);
          const { tipo_movimentacao, ano_fabricacao, ...fallbackPayload } = payload;
          const { error: fallbackErr } = await supabase
            .from('ativos_extintores')
            .upsert(fallbackPayload, { onConflict: 'numero_patrimonio' });
          extErr = fallbackErr;
        }
      }

      // Também sincroniza na tabela unificada 'assets' para manter a Gestão de Ativos em Estoque 100% atualizada
      try {
        const serialized = serializeAsset(category, id, {
          ...asset,
          tipo_movimentacao: tipoMov,
          status_estoque: statusEstoque
        });
        await supabase.from('assets').upsert(serialized, { onConflict: 'id' });
      } catch (aErr) {
        console.warn('[saveAssetToDb] Aviso ao sincronizar em assets:', aErr);
      }

      if (extErr) throw extErr;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spci_sync_success', { detail: { type: 'asset', id, category: 'extintores', silent } }));
      }
      return;
    }

    const serialized = serializeAsset(category, id, asset);
    
    const { error } = await supabase
      .from('assets')
      .upsert(serialized);

    if (error) throw error;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spci_sync_success', { detail: { type: 'asset', id, category, silent } }));
    }
  } catch (error: any) {
    console.warn(`Could not save asset to ${collectionName} in Supabase.`, error);
    throw error;
  }
}

/**
 * Busca os dados de um Ativo específico pelo ID (UUID) ou Patrimônio (id_ativo) no Supabase.
 */
export async function fetchAtivoParaInspecao(idOrPatrimonio: string): Promise<any | null> {
  try {
    const idUpper = idOrPatrimonio.toUpperCase().trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idUpper);
    const isExtintor = idUpper.startsWith('EXT-');

    if (isUuid || isExtintor) {
      const query = supabase.from('vw_extintores_publico').select('*');
      if (isUuid) {
        query.or(`id.eq.${idUpper},qr_code_hash.eq.${idUpper}`);
      } else {
        query.eq('numero_patrimonio', idUpper);
      }
      const { data, error } = await query.maybeSingle();
      if (error || !data) {
        console.warn('Erro ao buscar de vw_extintores_publico, tentando view_extintores...', error);
        const oldQuery = supabase.from('view_extintores').select('*');
        if (isUuid) {
          oldQuery.or(`id.eq.${idUpper},qr_code_hash.eq.${idUpper}`);
        } else {
          oldQuery.eq('id_ativo', idUpper);
        }
        const { data: oldData, error: oldErr } = await oldQuery.maybeSingle();
        if (!oldErr && oldData) return deserializeExtintor(oldData);
      }
      if (data) return deserializeNewExtintor(data);
    }

    // Fallback/Outras categorias
    const query = supabase.from('assets').select('*');
    if (isUuid) {
      query.eq('id', idUpper);
    } else {
      query.eq('id_ativo', idUpper);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;

    if (data.category === 'extintores') {
      const { data: extData, error: extErr } = await supabase
        .from('vw_extintores_publico')
        .select('*')
        .eq('id', data.id)
        .maybeSingle();
      if (!extErr && extData) return deserializeNewExtintor(extData);

      const { data: oldExtData, error: oldExtErr } = await supabase
        .from('view_extintores')
        .select('*')
        .eq('id', data.id)
        .maybeSingle();
      if (!oldExtErr && oldExtData) return deserializeExtintor(oldExtData);
    }

    return deserializeAsset(data);
  } catch (error: any) {
    console.error('Erro em fetchAtivoParaInspecao:', error);
    return null;
  }
}

/**
 * Registra o laudo técnico da vistoria na tabela inspecoes_realizadas e atualiza o status do ativo no Supabase.
 */
export async function salvarInspecaoNoSupabase(inspecao: InspecaoRealizada): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      asset_id: inspecao.asset_id,
      asset_patrimonio: inspecao.asset_patrimonio,
      status: inspecao.status,
      observacoes: inspecao.observacoes || null,
      tecnico_nome: inspecao.tecnico_nome,
      data_inspecao: inspecao.data_inspecao || new Date().toISOString(),
      details: inspecao.details,
    };

    const { error } = await supabase
      .from('inspecoes_realizadas')
      .insert([payload]);

    if (error) throw error;

    const isExtintor = inspecao.asset_patrimonio.toUpperCase().startsWith('EXT-');
    if (isExtintor) {
      const { error: updateErr } = await supabase
        .from('ativos_extintores')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', inspecao.asset_id);

      if (updateErr) {
        console.warn('Aviso: laudo de vistoria salvo, mas erro ao atualizar ativos_extintores:', updateErr);
      }
    } else {
      const { error: updateErr } = await supabase
        .from('assets')
        .update({
          status: inspecao.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', inspecao.asset_id);

      if (updateErr) {
        console.warn('Aviso: laudo de vistoria salvo, mas erro ao atualizar status principal do ativo:', updateErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spci_sync_success', { detail: { type: 'inspecao', patrimonio: inspecao.asset_patrimonio } }));
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao salvar laudo de inspeção no Supabase:', {
      message: error?.message || error,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      error
    });
    return { success: false, error: error?.message || 'Erro de conexão com o banco' };
  }
}

/**
 * Deleta um ativo do Supabase pelo ID e categoria.
 */
export async function deleteAssetFromDb(collectionName: string, id: string): Promise<void> {
  try {
    const category = getNormalizedCategory(collectionName);

    if (category === 'extintores') {
      const { error } = await supabase
        .from('ativos_extintores')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);
    if (error) throw error;
  } catch (error: any) {
    console.error('Erro ao deletar ativo do Supabase:', {
      message: error?.message || error,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      error
    });
    throw new Error(`Erro ao deletar ativo: ${error?.message || error}`);
  }
}

/**
 * Busca inspeções realizadas para um ativo específico pelo asset_id ou patrimônio.
 */
export async function fetchInspecoesByAssetId(assetIdOrPatrimonio: string): Promise<InspecaoRealizada[]> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetIdOrPatrimonio);

    let query = supabase
      .from('inspecoes_realizadas')
      .select('*')
      .order('data_inspecao', { ascending: false })
      .limit(50);

    if (isUuid) {
      query = query.eq('asset_id', assetIdOrPatrimonio);
    } else {
      query = query.eq('asset_patrimonio', assetIdOrPatrimonio.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Erro ao buscar inspeções do Supabase:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      });
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      asset_id: row.asset_id,
      asset_patrimonio: row.asset_patrimonio,
      status: row.status,
      observacoes: row.observacoes,
      tecnico_nome: row.tecnico_nome,
      data_inspecao: row.data_inspecao,
      details: row.details || {},
      created_at: row.created_at
    }));
  } catch (error: any) {
    console.error('Erro ao buscar inspeções:', {
      message: error?.message || error,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      error
    });
    return [];
  }
}

/**
 * Busca todas as inspeções recentes realizadas no Supabase.
 */
export async function fetchRecentInspecoes(): Promise<InspecaoRealizada[]> {
  try {
    const { data, error } = await supabase
      .from('inspecoes_realizadas')
      .select('*')
      .order('data_inspecao', { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      asset_id: row.asset_id,
      asset_patrimonio: row.asset_patrimonio,
      status: row.status,
      observacoes: row.observacoes,
      tecnico_nome: row.tecnico_nome,
      data_inspecao: row.data_inspecao,
      details: row.details || {},
      created_at: row.created_at
    }));
  } catch (error: any) {
    console.error('Erro ao buscar inspeções recentes do Supabase:', {
      message: error?.message || error,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      error
    });
    return [];
  }
}
