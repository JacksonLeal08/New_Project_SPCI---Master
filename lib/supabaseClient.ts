import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    'Aviso: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não estão configuradas no .env.local. A conexão com o Supabase falhará até que estas variáveis sejam configuradas.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      get 'x-shared-token'() {
        if (typeof document !== 'undefined') {
          const match = document.cookie.match(/(?:^|; )spci_shared_token=([^;]*)/);
          return match ? match[1] : '';
        }
        return '';
      }
    }
  }
});
