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
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data: viewData, error: viewErr } = await supabase.from('vw_extintores_publico').select('id, numero_patrimonio');
  console.log('Count in vw_extintores_publico:', viewData ? viewData.length : viewErr?.message);

  const { data: assetsData, error: assetsErr } = await supabase.from('assets').select('id, id_ativo, status_estoque, tipo_movimentacao').eq('category', 'extintores');
  console.log('Count in assets table (category=extintores):', assetsData ? assetsData.length : assetsErr?.message);

  const { count: totalAssets } = await supabase.from('assets').select('*', { count: 'exact', head: true });
  console.log('Total in assets table:', totalAssets);
}

run();
