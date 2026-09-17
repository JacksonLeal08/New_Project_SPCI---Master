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

async function inspectSites() {
  const { data: assets } = await supabase.from('assets').select('id, id_ativo, location, details').eq('category', 'extintores');
  console.log('Total extintores em assets:', assets?.length);
  
  const siteCounts = {};
  for (const a of (assets || [])) {
    const d = a.details || {};
    const site = String(d.site || d.contrato || d.projeto || a.location || 'INDEFINIDO').toUpperCase();
    siteCounts[site] = (siteCounts[site] || 0) + 1;
  }
  console.log('Distribuição por site/contrato/localização:', Object.entries(siteCounts).slice(0, 20));
}

inspectSites();
