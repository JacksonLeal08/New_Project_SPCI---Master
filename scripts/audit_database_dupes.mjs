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

async function runAudit() {
  console.log('=== AUDITORIA COMPLETA DE DUPLICIDADE E CONTAGEM ===\n');

  // 1. Tabela assets
  const { data: assets, error: aErr } = await supabase.from('assets').select('*');
  console.log(`Tabela assets: ${assets?.length} registros`);
  
  if (assets) {
    const byPat = new Map();
    const byChassi = new Map();
    const byId = new Map();
    const byCategory = {};

    for (const a of assets) {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
      
      const pat = (a.patrimonio || a.id_ativo || '').trim().toUpperCase();
      if (pat) byPat.set(pat, (byPat.get(pat) || []).concat(a.id));

      const ch = (a.numero_serie || a.details?.chassi || '').trim().toUpperCase();
      if (ch && ch !== 'N/A' && ch !== 'SEM CHASSI') byChassi.set(ch, (byChassi.get(ch) || []).concat(a.id));

      byId.set(a.id, (byId.get(a.id) || 0) + 1);
    }

    console.log('Categorias em assets:', byCategory);

    const dupPats = Array.from(byPat.entries()).filter(([k, v]) => v.length > 1);
    console.log(`Patrimônios duplicados em assets: ${dupPats.length}`);
    if (dupPats.length > 0) {
      console.log('Exemplos de duplicatas por patrimônio:', dupPats.slice(0, 5));
    }

    const dupChassi = Array.from(byChassi.entries()).filter(([k, v]) => v.length > 1);
    console.log(`Chassis duplicados em assets: ${dupChassi.length}`);
  }

  // 2. Tabela ativos_extintores
  const { data: atExt, error: atErr } = await supabase.from('ativos_extintores').select('*');
  console.log(`\nTabela ativos_extintores: ${atExt?.length} registros`);
  if (atExt) {
    const byPat = new Map();
    for (const a of atExt) {
      const pat = (a.numero_patrimonio || '').trim().toUpperCase();
      if (pat) byPat.set(pat, (byPat.get(pat) || []).concat(a.id));
    }
    const dupPats = Array.from(byPat.entries()).filter(([k, v]) => v.length > 1);
    console.log(`Patrimônios duplicados em ativos_extintores: ${dupPats.length}`);
    if (dupPats.length > 0) {
      console.log('Exemplos de duplicatas:', dupPats.slice(0, 5));
    }
  }

  // 3. View vw_extintores_publico
  const { data: vwExt, error: vErr } = await supabase.from('vw_extintores_publico').select('*');
  console.log(`\nView vw_extintores_publico: ${vwExt?.length} registros`);

  // 4. Checar itens_lote_manutencao
  const { data: lotesItens } = await supabase.from('itens_lote_manutencao').select('*').limit(10);
  console.log(`\nItens lote manutenção colunas:`, Object.keys(lotesItens?.[0] || {}));
}

runAudit();
