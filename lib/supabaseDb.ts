import { supabase } from './supabaseClient';

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
    const serialized = serializeAsset(category, id, asset);
    
    const { error } = await supabase
      .from('assets')
      .upsert(serialized);

    if (error) throw error;
  } catch (error: any) {
    console.warn(`Could not save asset to ${collectionName} in Supabase.`, error);
  }
}
