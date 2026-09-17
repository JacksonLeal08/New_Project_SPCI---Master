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

async function run() {
  console.log('--- APLICANDO CRIAÇÃO DE LOCALIZACOES_OPERACIONAIS VIA SQL/RPC ---');

  // Testar se a tabela localizacoes_operacionais já está acessível
  const { data, error } = await supabase.from('localizacoes_operacionais').select('id').limit(1);

  if (error && error.code === '42P01') {
    console.log('Tabela ainda não existe no cache do Supabase.');
    console.log('Execute o script supabase/CRIACAO_TABELA_LOCALIZACOES_OPERACIONAIS.sql no SQL Editor do Supabase.');
  } else if (!error) {
    console.log('✅ Tabela "localizacoes_operacionais" já existe e está acessível com sucesso!');
  } else {
    console.log('Status da tabela:', error.message);
  }
}

run();
