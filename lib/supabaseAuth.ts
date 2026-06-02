import { supabase } from './supabaseClient';

export interface CompatibleUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

let cachedAccessToken: string | null = null;
if (typeof window !== 'undefined') {
  cachedAccessToken = sessionStorage.getItem('spci_google_token');
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
  onAuthSuccess?: (user: CompatibleUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Listen for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      if (session.provider_token) {
        cachedAccessToken = session.provider_token;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('spci_google_token', session.provider_token);
        }
      }
      
      if (cachedAccessToken) {
        if (onAuthSuccess) {
          onAuthSuccess(mapSupabaseUser(session.user), cachedAccessToken);
        }
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('spci_google_token');
      }
      if (onAuthFailure) onAuthFailure();
    }
  });

  // Check current session immediately on startup
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session && session.user) {
      if (session.provider_token) {
        cachedAccessToken = session.provider_token;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('spci_google_token', session.provider_token);
        }
      }
      if (cachedAccessToken && onAuthSuccess) {
        onAuthSuccess(mapSupabaseUser(session.user), cachedAccessToken);
      }
    }
  });

  return () => {
    subscription.unsubscribe();
  };
};

export const googleSignIn = async (): Promise<{ user: CompatibleUser; accessToken: string } | null> => {
  try {
    const redirectToUrl = typeof window !== 'undefined' ? `${window.location.origin}/sheets-db` : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
        redirectTo: redirectToUrl
      }
    });

    if (error) throw error;
    // OAuth flow redirects the page, so it returns null in this invocation
    return null;
  } catch (error: any) {
    console.error('Erro de Autenticação Supabase:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await supabase.auth.signOut();
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('spci_google_token');
  }
};
