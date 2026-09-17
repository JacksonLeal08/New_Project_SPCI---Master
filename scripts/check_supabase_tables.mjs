import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkTables() {
  const candidateTables = [
    'assets',
    'ativos',
    'ativos_extintores',
    'extintores',
    'vw_extintores_publico',
    'view_extintores',
    'inspecoes',
    'inspections',
    'historico_ativos',
    'historico_localizacao_ativo',
    'itens_lote_manutencao',
    'lotes_manutencao',
    'trocas_ativos',
    'asset_swaps',
    'audit_logs',
    'logs_auditoria',
    'logs_expurgo_dados',
    'AuditPurgeLogs',
    'locais',
    'locais_planta',
    'sub_locais',
    'modelos_extintores',
    'usuarios'
  ];

  console.log('--- Verificando existência de tabelas no Supabase ---');
  for (const t of candidateTables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ ${t}: ${error.message} (${error.code})`);
    } else {
      console.log(`✅ ${t}: ${count} registros`);
    }
  }
}

checkTables().catch(console.error);
