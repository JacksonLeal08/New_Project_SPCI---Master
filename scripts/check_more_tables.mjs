import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const getEnv = (key) => {
  const m = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return m ? m[1].trim().replace(/['"]/g, '') : null;
};

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

async function checkAdditionalTables() {
  const candidates = [
    'fornecedores_manutencao',
    'fornecedores',
    'inspecoes_realizadas',
    'historico_movimentacoes',
    'historico_inspecoes',
    'geotracking',
    'geo_tracking',
    'audit_logs',
    'modules',
    'permissions',
    'usuarios_permissoes',
    'locais_planta'
  ];

  console.log('--- TESTANDO TABELAS ADICIONAIS ---');
  for (const t of candidates) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`[EXISTE] Tabela "${t}": ${count} registros`);
    } else if (error.code === '42P01') {
      // Não existe
    } else {
      console.log(`[STATUS] Tabela "${t}": ${error.message}`);
    }
  }
}

checkAdditionalTables();
