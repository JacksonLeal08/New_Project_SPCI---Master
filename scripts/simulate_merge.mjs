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

async function test() {
  const { data: viewData, error: vErr } = await supabase.from('vw_extintores_publico').select('*');
  const { data: assetsTable, error: aErr } = await supabase.from('assets').select('*').eq('category', 'extintores');
  console.log('viewData length:', viewData?.length, 'error:', vErr);
  console.log('assetsTable length:', assetsTable?.length, 'error:', aErr);
  
  if (!viewData || !assetsTable) return;

  const sampleView = viewData.slice(0, 3).map(v => ({ id: v.id, idAtivo: v.idAtivo, numero_patrimonio: v.numero_patrimonio }));
  console.log('Sample view items:', sampleView);

  const sampleAssets = assetsTable.slice(0, 3).map(a => ({ id: a.id, id_ativo: a.id_ativo, patrimonio: a.patrimonio }));
  console.log('Sample asset items:', sampleAssets);

  // Let's test the merging logic
  const assetsMap = new Map();
  const matchedAssetIds = new Set();
  for (const a of assetsTable) {
    if (a.id) assetsMap.set(String(a.id).toLowerCase(), a);
    if (a.id_ativo) assetsMap.set(String(a.id_ativo).toLowerCase(), a);
    if (a.patrimonio) assetsMap.set(String(a.patrimonio).toLowerCase(), a);
  }

  let matchedCount = 0;
  for (const ext of viewData) {
    const keyId = String(ext.id || '').toLowerCase();
    const keyPat = String(ext.idAtivo || ext.numero_patrimonio || '').toLowerCase();
    const ast = assetsMap.get(keyId) || assetsMap.get(keyPat);
    if (ast) {
      matchedCount++;
      if (ast.id) matchedAssetIds.add(String(ast.id).toLowerCase());
      if (ast.id_ativo) matchedAssetIds.add(String(ast.id_ativo).toLowerCase());
      if (ast.patrimonio) matchedAssetIds.add(String(ast.patrimonio).toLowerCase());
    }
  }
  console.log('matchedCount in viewData:', matchedCount);

  let addedFromAssets = 0;
  for (const a of assetsTable) {
    const keyId = String(a.id || '').toLowerCase();
    const keyPat = String(a.id_ativo || a.patrimonio || '').toLowerCase();
    if (!matchedAssetIds.has(keyId) && (!keyPat || !matchedAssetIds.has(keyPat))) {
      addedFromAssets++;
    }
  }
  console.log('addedFromAssets:', addedFromAssets);
  console.log('Total extintores list BEFORE deduplication:', viewData.length + addedFromAssets);

  // Now let's see deduplication
  const dedupExtintoresMap = new Map();
  const fullList = [...viewData];
  for (const a of assetsTable) {
    const keyId = String(a.id || '').toLowerCase();
    const keyPat = String(a.id_ativo || a.patrimonio || '').toLowerCase();
    if (!matchedAssetIds.has(keyId) && (!keyPat || !matchedAssetIds.has(keyPat))) {
      matchedAssetIds.add(keyId);
      if (keyPat) matchedAssetIds.add(keyPat);
      fullList.push({
        id: a.id,
        idAtivo: a.id_ativo || a.patrimonio || a.id,
        numero_patrimonio: a.patrimonio || a.id_ativo || a.id
      });
    }
  }
  for (const ext of fullList) {
    const uniqueKey = String(ext.numero_patrimonio || ext.idAtivo || ext.id || '').trim().toUpperCase();
    if (uniqueKey && !dedupExtintoresMap.has(uniqueKey)) {
      dedupExtintoresMap.set(uniqueKey, ext);
    }
  }
  console.log('Final deduplicated count in getAssetsList:', dedupExtintoresMap.size);

  // Check where 1298 comes from! Could it be assets table having duplicates or vw_extintores_publico?
  // Let's check ativos_extintores
  const { data: ativosExt, count: countAtivos } = await supabase.from('ativos_extintores').select('id, numero_patrimonio, site', { count: 'exact' });
  console.log('ativos_extintores total count:', countAtivos);
}
test();
