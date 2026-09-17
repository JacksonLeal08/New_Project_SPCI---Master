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

async function inspectTables() {
  const knownTables = [
    'assets',
    'ativos',
    'ativos_extintores',
    'extintores',
    'usuarios',
    'users',
    'locais',
    'sub_locais',
    'lotes_manutencao',
    'itens_lote_manutencao',
    'checklists_ativos',
    'logs_auditoria',
    'shared_sessions',
    'modelos_extintores',
    'relatorios_inspecao',
    'inspecoes',
    'localizacoes_operacionais',
    'notificacoes',
    'system_configs',
    'contratos',
    'checklists',
    'laudos',
    'vistorias'
  ];

  console.log('--- AUDITORIA DE TABELAS SUPABASE ---');
  for (const t of knownTables) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (!error) {
        console.log(`[EXISTE] Tabela "${t}": ${count} registros`);
      } else if (error.code === '42P01') {
        // não existe
      } else {
        console.log(`[STATUS] Tabela "${t}": ${error.message}`);
      }
    } catch (e) {
      console.log(`[ERRO] ${t}:`, e.message);
    }
  }
}

inspectTables();
