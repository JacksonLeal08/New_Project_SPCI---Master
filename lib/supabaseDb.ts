import { supabase } from './supabaseClient';
import { InspecaoRealizada } from './types';


export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  logoUrl: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// --- PROFILE SERIALIZATION & DESERIALIZATION HELPER ---
const serializeProfile = (profile: UserProfile) => {
  return {
    id: profile.uid,
    name: profile.name,
    email: profile.email,
    photo_url: profile.photoURL || null,
    logo_url: profile.logoUrl || null,
    role: profile.role,
    status: profile.status,
    created_at: profile.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

const deserializeProfile = (row: any): UserProfile => {
  return {
    uid: row.id,
    name: row.name,
    email: row.email,
    photoURL: row.photo_url || '',
    logoUrl: row.logo_url || '',
    role: row.role as 'admin' | 'user',
    status: row.status as 'active' | 'pending' | 'inactive',
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

// --- PROFILE DATABASE FUNCTIONS ---

/**
 * Recovers or registers a user profile on login.
 * If the user's email matches 'jackson602@gmail.com', they are bootstrapped as an 'admin'.
 */
export async function registerOrLoginUserProfile(user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }): Promise<UserProfile> {
  try {
    const { data: profileRow, error: selectErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.uid)
      .maybeSingle();

    if (selectErr) throw selectErr;

    if (profileRow) {
      return deserializeProfile(profileRow);
    }

    const isBootstrappedAdmin = user.email?.toLowerCase() === 'jackson602@gmail.com';
    const initialRole = isBootstrappedAdmin ? 'admin' : 'user';

    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Usuário SPCI',
      email: user.email || '',
      photoURL: user.photoURL || '',
      logoUrl: '',
      role: initialRole,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { error: insertErr } = await supabase
      .from('profiles')
      .insert(serializeProfile(newProfile));

    if (insertErr) throw insertErr;
    return newProfile;
  } catch (error: any) {
    console.error('Error in registerOrLoginUserProfile:', error);
    // Return local profile fallback as a safety net to prevent runtime crash
    const isBootstrappedAdmin = user.email?.toLowerCase() === 'jackson602@gmail.com';
    return {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Usuário SPCI',
      email: user.email || '',
      photoURL: user.photoURL || '',
      logoUrl: '',
      role: isBootstrappedAdmin ? 'admin' : 'user',
      status: 'active',
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
      .from('profiles')
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
      .from('profiles')
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
export async function updateUserRoleAndStatus(uid: string, role: 'admin' | 'user', status: 'active' | 'pending' | 'inactive'): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
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
      .from('profiles')
      .select('*');

    if (error) throw error;
    const list = (data || []).map(deserializeProfile);
    
    // Sort by role then name
    return list.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
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
      .from('profiles')
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
        .from('view_extintores')
        .select('*');

      if (error) throw error;
      return (data || []).map(deserializeExtintor);
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
      // 1. Salva na tabela assets
      const assetPayload = {
        id: id,
        id_ativo: asset.idAtivo || id,
        category: 'extintores',
        location: asset.location || '',
        sub_location: asset.subLocation || '',
        status: asset.status || 'Conforme',
        latitude: asset.geolocation?.lat || null,
        longitude: asset.geolocation?.lng || null,
        updated_at: new Date().toISOString()
      };

      const { error: assetErr } = await supabase
        .from('assets')
        .upsert(assetPayload);

      if (assetErr) throw assetErr;

      // 2. Salva na tabela cadastro_extintores
      const extintorPayload = {
        asset_id: id,
        fabricante: asset.fabricante || 'N/A',
        modelo: asset.model || asset.modelo || '',
        peso_capacidade: asset.peso || asset.peso_capacidade || '',
        capacidade_extintora: asset.capacidadeExtintora || 'N/A',
        selo_inmetro: asset.seloInmetro || '',
        chassi: asset.chassi || '',
        ano_fabricacao: parseInt(asset.anoFabricacao || asset.ano_fabricacao || new Date().getFullYear().toString(), 10),
        ultimo_teste_hidro: parseInt(asset.ultimoTesteHidro || asset.ultimo_teste_hidro || new Date().getFullYear().toString(), 10),
        data_ultima_recarga: asset.lastRecarga || asset.data_ultima_recarga || new Date().toISOString().split('T')[0],
        validade_recarga_meses: parseInt(asset.validadeRecargaMeses || '12', 10),
        validade_recarga_data: asset.validadeRecarga || asset.validade_recarga_data || new Date().toISOString().split('T')[0]
      };

      const { error: extErr } = await supabase
        .from('cadastro_extintores')
        .upsert(extintorPayload);

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
      const query = supabase.from('view_extintores').select('*');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idUpper);
      if (isUuid) {
        query.eq('id', idUpper);
      } else {
        query.eq('id_ativo', idUpper);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (data) return deserializeExtintor(data);
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
        .from('view_extintores')
        .select('*')
        .eq('id', data.id)
        .maybeSingle();
      if (!extErr && extData) return deserializeExtintor(extData);
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

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao salvar laudo de inspeção no Supabase:', error);
    return { success: false, error: error.message || 'Erro de conexão com o banco' };
  }
}

