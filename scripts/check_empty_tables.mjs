import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const getEnv = (key) => {
  const m = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return m ? m[1].trim().replace(/['"]/g, '') : null;
};

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

async function checkEmptyTables() {
  const candidates = [
    'ativos',
    'extintores',
    'users',
    'relatorios_inspecao',
    'inspecoes',
    'notificacoes',
    'system_configs',
    'checklists',
    'laudos',
    'vistorias'
  ];

  console.log('--- DETALHAMENTO DE TABELAS CANDIDATAS A EXPURGO ---');
  for (const t of candidates) {
    const { data, error } = await supabase.from(t).select('*').limit(2);
    if (!error) {
      console.log(`TABELA EXISTE NO BANCO: "${t}" | Linhas retornadas: ${data?.length}`);
    } else {
      console.log(`ERRO NA TABELA "${t}": code=${error.code}, msg=${error.message}`);
    }
  }
}

checkEmptyTables();
