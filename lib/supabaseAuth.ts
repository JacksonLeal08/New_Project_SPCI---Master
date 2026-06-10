import { supabase } from './supabaseClient';

export interface CompatibleUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const mapSupabaseUser = (sbUser: any): CompatibleUser => {
  return {
    uid: sbUser.id,
    email: sbUser.email || null,
    displayName: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || null,
    photoURL: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null
  };
};

export const initAuth = (
  onAuthSuccess?: (user: CompatibleUser) => void,
  onAuthFailure?: () => void
) => {
  // Listen for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      if (onAuthSuccess) {
        onAuthSuccess(mapSupabaseUser(session.user));
      }
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });

  // Check current session immediately on startup
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session && session.user && onAuthSuccess) {
      onAuthSuccess(mapSupabaseUser(session.user));
    }
  });

  return () => {
    subscription.unsubscribe();
  };
};

export const googleSignIn = async (): Promise<null> => {
  try {
    const redirectToUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectToUrl
      }
    });

    if (error) throw error;
    return null;
  } catch (error: any) {
    console.error('Erro de Autenticação Supabase:', error);
    throw error;
  }
};

/**
 * Efetua login hibrido aceitando tanto o e-mail quanto o user_name do usuario.
 */
export const signInWithEmailOrUsername = async (identifier: string, password: string): Promise<CompatibleUser | null> => {
  try {
    let email = identifier.trim();
    
    // Remove leading '@' if typed by the user as part of their username (e.g. '@jfleal' -> 'jfleal')
    if (email.startsWith('@')) {
      email = email.slice(1);
    }

    // Strict regex to check if the identifier is a valid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(email);

    // If it is not a valid email, assume it's a username and call public.get_email_by_username RPC
    if (!isEmail) {
      const { data, error: lookupError } = await supabase.rpc('get_email_by_username', {
        p_username: email
      });

      if (lookupError) throw lookupError;
      if (!data) {
        throw new Error('Nome de usuário não cadastrado no sistema.');
      }
      email = data;
    }

    // Efetua autenticacao tradicional por email/senha no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Não foi possível obter dados do usuário autenticado.');

    return mapSupabaseUser(authData.user);
  } catch (error: any) {
    console.error('Erro em signInWithEmailOrUsername:', error);
    throw error;
  }
};

export const logout = async () => {
  await supabase.auth.signOut();
};
