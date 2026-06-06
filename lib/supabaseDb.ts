import { supabase } from './supabaseClient';
import { InspecaoRealizada } from './types';


export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  userName: string;
  photoURL: string;
  logoUrl: string;
  role: 'Desenvolvedor' | 'Administrador' | 'Usuário';
  status: string;
  dataExpiracao?: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- PROFILE SERIALIZATION & DESERIALIZATION HELPER ---
const serializeProfile = (profile: UserProfile) => {
  return {
    id: profile.uid,
    name: profile.name,
    email: profile.email,
    user_name: profile.userName,
    photo_url: profile.photoURL || null,
    logo_url: profile.logoUrl || null,
    role: profile.role,
    status: profile.status,
    data_expiracao: profile.dataExpiracao || null,
    created_at: profile.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

const deserializeProfile = (row: any): UserProfile => {
  return {
    uid: row.id,
    name: row.name,
    email: row.email,
    userName: row.user_name || '',
    photoURL: row.photo_url || '',
    logoUrl: row.logo_url || '',
    role: row.role as 'Desenvolvedor' | 'Administrador' | 'Usuário',
    status: row.status || 'active',
    dataExpiracao: row.data_expiracao || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

// --- ASSETS SERIALIZATION & DESERIALIZATION HELPER ---
const getNormalizedCategory = (collectionName: string): 'extintores' | 'hidrantes' | 'sinalizacoes' | 'iluminacao' | 'bombas' => {
  const name = collectionName.toLowerCase();
  if (name.includes('extintor')) return 'extintores';
  if (name.includes('hidrante')) return 'hidrantes';
  if (name.includes('sinaliza')) return 'sinalizacoes';
  if (name.includes('ilumina')) return 'iluminacao';
  if (name.includes('bomba')) return 'bombas';
  return 'extintores'; // fallback default
};

const serializeAsset = (category: string, id: string, asset: any) => {
  const {
    idAtivo,
    model,
    location,
    subLocation,
    status,
    geolocation,
    category: omittedCategory, // omit category property from details if present
    ...details
  } = asset;

  return {
    id: id,
    id_ativo: idAtivo || id,
    category: category,
    model: model || null,
    location: location || null,
    sub_location: subLocation || null,
    status: status || 'Conforme',
    latitude: geolocation?.lat || null,
    longitude: geolocation?.lng || null,
    details: details || {},
    created_at: asset.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

const deserializeAsset = (row: any) => {
  // Normalize geolocation structure back to { lat, lng } if present in DB
  const geolocation = (row.latitude !== null && row.longitude !== null) ? {
    lat: Number(row.latitude),
    lng: Number(row.longitude)
  } : null;

  return {
    id: row.id,
    idAtivo: row.id_ativo,
    model: row.model || '',
    location: row.location || '',
    subLocation: row.sub_location || '',
    status: row.status,
    geolocation,
    category: row.category,
    ...row.details
  };
};

const deserializeExtintor = (row: any) => {
  const geolocation = (row.latitude !== null && row.longitude !== null) ? {
    lat: Number(row.latitude),
    lng: Number(row.longitude)
  } : null;

  return {
    id: row.id,
    idAtivo: row.id_ativo,
    category: row.category,
    location: row.location,
    subLocation: row.sub_location || '',
    status: row.status,
    geolocation,
    // Mapeamento específico de extintores
    fabricante: row.fabricante || '',
    model: row.modelo || '',
    peso: row.peso_capacidade || '',
    capacidadeExtintora: row.capacidade_extintora || '',
    seloInmetro: row.selo_inmetro || '',
    chassi: row.chassi || '',
    anoFabricacao: row.ano_fabricacao || new Date().getFullYear(),
    ultimoTesteHidro: row.ultimo_teste_hidro || new Date().getFullYear(),
    lastRecarga: row.data_ultima_recarga || '',
    validadeRecargaMeses: row.validade_recarga_meses || 12,
    validadeRecarga: row.validade_recarga_data || '',
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

  return {
    id: row.id,
    idAtivo: row.numero_patrimonio,
    qr_code_hash: row.qr_code_hash,
    category: 'extintores',
    location: row.local_instalacao || '',
    subLocation: row.sub_local_instalacao || '',
    status: displayStatus,
    // specific fields
    model: row.modelo_tipo || '',
    peso: row.peso_capacidade || '',
    seloInmetro: row.selo_inmetro || '',
    chassi: row.numero_serie || '',
    lastRecarga: recargaDate,
    anoUltimoTesteHidro: row.ano_ultimo_teste_hidro || new Date().getFullYear(),
    ultimoTesteHidro: row.ano_ultimo_teste_hidro || new Date().getFullYear(),
    fotoUrl: row.foto_url || '',
    validadeRecarga: limiteRecargaDate,
    validadeTesteHidro: row.data_limite_hidro || '',
    statusConformidade: row.status_conformidade,
    validadeRecargaMeses: getMonthsDiff(recargaDate, limiteRecargaDate),
    anoFabricacao: row.ano_ultimo_teste_hidro || new Date().getFullYear() // fallback since not in db
  };
};

// --- PROFILE DATABASE FUNCTIONS ---

/**
 * Recovers or registers a user profile on login.
 * If the user's email matches 'jackson602@gmail.com', they are bootstrapped as a 'Desenvolvedor'.
 */
export async function registerOrLoginUserProfile(user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }): Promise<UserProfile> {
  try {
    const { data: profileRow, error: selectErr } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.uid)
      .maybeSingle();

    if (selectErr) throw selectErr;

    if (profileRow) {
      return deserializeProfile(profileRow);
    }

    const isBootstrappedAdmin = user.email?.toLowerCase() === 'jackson602@gmail.com';
    const initialRole = isBootstrappedAdmin ? 'Desenvolvedor' : 'Usuário';

    const getSafeUserName = (email: string | null) => {
      const prefix = email?.split('@')[0] || 'usuario';
      return prefix.length >= 3 ? prefix : `${prefix}_usr`;
    };

    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Usuário SPCI',
      email: user.email || '',
      userName: getSafeUserName(user.email),
      photoURL: user.photoURL || '',
      logoUrl: '',
      role: initialRole,
      status: 'active',
      dataExpiracao: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { error: insertErr } = await supabase
      .from('usuarios')
      .insert(serializeProfile(newProfile));

    if (insertErr) throw insertErr;
    return newProfile;
  } catch (error: any) {
    console.error('Error in registerOrLoginUserProfile:', error);
    // Return local profile fallback as a safety net to prevent runtime crash
    const isBootstrappedAdmin = user.email?.toLowerCase() === 'jackson602@gmail.com';
    const getSafeUserName = (email: string | null) => {
      const prefix = email?.split('@')[0] || 'usuario';
      return prefix.length >= 3 ? prefix : `${prefix}_usr`;
    };
    return {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Usuário SPCI',
      email: user.email || '',
      userName: getSafeUserName(user.email),
      photoURL: user.photoURL || '',
      logoUrl: '',
      role: isBootstrappedAdmin ? 'Desenvolvedor' : 'Usuário',
      status: 'active',
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
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error) throw error;
    return data ? deserializeProfile(data) : null;
  } catch (error: any) {
    console.error('Error in getUserProfile:', error);
    throw new Error(`Erro ao obter perfil de usuário: ${error.message || error}`);
  }
}

/**
 * Updates a user's chosen custom logo
 */
export async function updateUserLogo(uid: string, logoUrl: string, name?: string): Promise<void> {
  try {
    const updatePayload: any = {
      logo_url: logoUrl,
      updated_at: new Date().toISOString()
    };
    if (name) {
      updatePayload.name = name;
    }

    const { error } = await supabase
      .from('usuarios')
      .update(updatePayload)
      .eq('id', uid);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error in updateUserLogo:', error);
    throw new Error(`Erro ao atualizar logotipo de usuário: ${error.message || error}`);
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
    const { error } = await supabase
      .from('usuarios')
      .update({
        role,
        status,
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
    const { data, error } = await supabase
      .from('usuarios')
      .select('*');

    if (error) throw error;
    const list = (data || []).map(deserializeProfile);
    
    // Sort by role then name
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
    throw new Error(`Erro ao obter lista de perfis: ${error.message || error}`);
  }
}

/**
 * Admin deletes a user profile
 */
export async function deleteUserProfileByAdmin(uid: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', uid);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error in deleteUserProfileByAdmin:', error);
    throw new Error(`Erro ao deletar perfil: ${error.message || error}`);
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

export async function saveAssetToDb(collectionName: string, id: string, asset: any): Promise<void> {
  try {
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

      const payload: any = {
        local_id: localId,
        sub_local_id: subLocalId || null,
        numero_patrimonio: asset.idAtivo || id,
        selo_inmetro: asset.seloInmetro || null,
        chassi: asset.chassi || null,
        modelo_id: modeloId,
        peso_capacidade: asset.peso || asset.peso_capacidade || '6KG',
        data_ultima_recarga: normalizeToIsoDate(asset.lastRecarga || asset.data_ultima_recarga),
        meses_validade_recarga: parseInt(asset.validadeRecargaMeses || asset.meses_validade_recarga || '12', 10),
        ano_ultimo_teste_hidro: parseInt(asset.ultimoTesteHidro || asset.ano_ultimo_teste_hidro || new Date().getFullYear().toString(), 10),
        data_pesagem_co2: asset.data_pesagem_co2 ? normalizeToIsoDate(asset.data_pesagem_co2) : null,
        foto_url: asset.fotoUrl || asset.foto_url || null,
        updated_at: new Date().toISOString()
      };

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        payload.id = id;
      }

      const { error: extErr } = await supabase
        .from('ativos_extintores')
        .upsert(payload, { onConflict: 'numero_patrimonio' });

      if (extErr) throw extErr;
      return;
    }

    const serialized = serializeAsset(category, id, asset);
    
    const { error } = await supabase
      .from('assets')
      .upsert(serialized);

    if (error) throw error;
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
    const isExtintor = idUpper.startsWith('EXT-');

    if (isExtintor) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idUpper);
      const query = supabase.from('vw_extintores_publico').select('*');
      if (isUuid) {
        query.eq('id', idUpper);
      } else {
        query.eq('numero_patrimonio', idUpper);
      }
      const { data, error } = await query.maybeSingle();
      if (error) {
        console.warn('Erro ao buscar de vw_extintores_publico, tentando view_extintores...', error);
        const oldQuery = supabase.from('view_extintores').select('*');
        if (isUuid) {
          oldQuery.eq('id', idUpper);
        } else {
          oldQuery.eq('id_ativo', idUpper);
        }
        const { data: oldData, error: oldErr } = await oldQuery.maybeSingle();
        if (oldErr) throw oldErr;
        if (oldData) return deserializeExtintor(oldData);
      }
      if (data) return deserializeNewExtintor(data);
    }

    // Fallback/Outras categorias
    const query = supabase.from('assets').select('*');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idUpper);
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

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao salvar laudo de inspeção no Supabase:', error);
    return { success: false, error: error.message || 'Erro de conexão com o banco' };
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
    console.error('Erro ao deletar ativo do Supabase:', error);
    throw new Error(`Erro ao deletar ativo: ${error.message || error}`);
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
      console.warn('Erro ao buscar inspeções do Supabase:', error);
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
    console.error('Erro ao buscar inspeções:', error);
    return [];
  }
}
