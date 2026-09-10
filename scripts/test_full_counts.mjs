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

function normalizeStatusOperacional(item) {
  if (!item) return 'NA_AREA_APLICADO';
  if (item.status_operacional) {
    const raw = String(item.status_operacional).toUpperCase().trim();
    if (['NA_AREA_APLICADO', 'ESTOQUE_APLICACAO', 'ESTOQUE_MANUTENCAO', 'EM_MANUTENCAO_EXTERNA', 'CONDENADO_DESCARTE'].includes(raw)) {
      return raw;
    }
  }
  const stEstoque = String(item.status_estoque || '').toUpperCase().trim();
  const tpMov = String(item.tipo_movimentacao || '').toLowerCase().trim();

  if (stEstoque === 'ESTOQUE MANUTENÇÃO' || tpMov === 'estoque_ag_manut') {
    return 'ESTOQUE_MANUTENCAO';
  }
  if ((stEstoque === 'ESTOQUE APLICAÇÃO' || stEstoque.includes('ESTOQUE')) && (tpMov === 'estoque_aplicacao' || tpMov.includes('estoque'))) {
    return 'ESTOQUE_APLICACAO';
  }
  if (stEstoque === 'EM MANUTENÇÃO' || tpMov === 'em_manutencao') {
    return 'EM_MANUTENCAO_EXTERNA';
  }
  if (stEstoque === 'CONDENADOS' || tpMov === 'condenado') {
    return 'CONDENADO_DESCARTE';
  }
  return 'NA_AREA_APLICADO';
}

async function testFullMerge() {
  const { data: assetsTable } = await supabase.from('assets').select('*').eq('category', 'extintores');
  console.log(`Assets na tabela: ${assetsTable.length}`);

  const counts = {
    NA_AREA_APLICADO: 0,
    ESTOQUE_APLICACAO: 0,
    ESTOQUE_MANUTENCAO: 0,
    EM_MANUTENCAO_EXTERNA: 0,
    CONDENADO_DESCARTE: 0
  };

  for (const a of assetsTable) {
    const st = normalizeStatusOperacional(a);
    counts[st] = (counts[st] || 0) + 1;
  }

  console.log('--- CONTAGENS CANÔNICAS DOS 651 EXTINTORES ---');
  console.log('1. Na Área (Aplicado):', counts.NA_AREA_APLICADO);
  console.log('2. Estoque Aplicação:', counts.ESTOQUE_APLICACAO);
  console.log('3. Estoque Manutenção:', counts.ESTOQUE_MANUTENCAO);
  console.log('4. Em Manutenção Externa:', counts.EM_MANUTENCAO_EXTERNA);
  console.log('5. Condenado/Descarte:', counts.CONDENADO_DESCARTE);
  console.log('SOMA TOTAL:', Object.values(counts).reduce((a, b) => a + b, 0));
}

testFullMerge();
