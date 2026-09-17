import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const getEnv = (key) => {
  const m = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return m ? m[1].trim().replace(/['"]/g, '') : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspectSchema() {
  // Vamos buscar via RPC ou via listagem
  const { data, error } = await supabase.rpc('get_table_list');
  if (error) {
    console.log('RPC get_table_list não existe, testando query direta');
  } else {
    console.log('Tabelas:', data);
  }
}

inspectSchema();
