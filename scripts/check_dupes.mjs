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

async function checkDuplicates() {
  console.log('--- Checando tabela assets ---');
  const { data: assets, error: aErr } = await supabase.from('assets').select('id, id_ativo, patrimonio, category, location, details');
  if (aErr) {
    console.error('Erro assets:', aErr);
  } else {
    console.log('Total registros assets:', assets.length);
    const patMap = new Map();
    for (const a of assets) {
      const p = (a.patrimonio || a.id_ativo || a.id || '').trim().toUpperCase();
      patMap.set(p, (patMap.get(p) || 0) + 1);
    }
    const dupes = Array.from(patMap.entries()).filter(([k, v]) => v > 1);
    console.log('Duplicatas em assets:', dupes.length, dupes.slice(0, 5));
  }

  console.log('\n--- Checando tabela ativos_extintores ---');
  const { data: atExt, error: atErr } = await supabase.from('ativos_extintores').select('id, numero_patrimonio, site');
  if (atErr) {
    console.error('Erro ativos_extintores:', atErr);
  } else {
    console.log('Total registros ativos_extintores:', atExt.length);
    const patMap = new Map();
    for (const a of atExt) {
      const p = (a.numero_patrimonio || '').trim().toUpperCase();
      patMap.set(p, (patMap.get(p) || 0) + 1);
    }
    const dupes = Array.from(patMap.entries()).filter(([k, v]) => v > 1);
    console.log('Duplicatas em ativos_extintores:', dupes.length, dupes.slice(0, 5));
  }

  console.log('\n--- Checando tabela ativos (se existir) ---');
  const { data: ativ, error: ativErr } = await supabase.from('ativos').select('id').limit(5);
  if (ativErr) {
    console.log('Tabela ativos não existe ou erro:', ativErr.message);
  } else {
    console.log('Tabela ativos existe! Registros:', ativ.length);
  }
}

checkDuplicates();
