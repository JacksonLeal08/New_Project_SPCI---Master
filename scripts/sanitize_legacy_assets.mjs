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

async function main() {
  console.log('=== SANITIZAÇÃO DE DADOS DE ATIVOS (EXTINTORES) ===');

  // 1. Fetch all assets
  const { data: allAssets, error } = await supabase
    .from('assets')
    .select('id, id_ativo, status_estoque, tipo_movimentacao');

  if (error) {
    console.error('Erro ao buscar assets:', error);
    return;
  }

  console.log(`Total de ativos recuperados: ${allAssets.length}`);

  let countNaArea = 0;
  let countEstoqueAplicacao = 0;
  let countEstoqueManutencao = 0;
  let countOutros = 0;

  const toUpdateNaArea = [];

  for (const asset of allAssets) {
    if (asset.status_estoque === 'ESTOQUE MANUTENÇÃO' || asset.tipo_movimentacao === 'estoque_ag_manut') {
      countEstoqueManutencao++;
    } else if (
      asset.status_estoque === 'ESTOQUE APLICAÇÃO' &&
      asset.tipo_movimentacao === 'estoque_aplicacao'
    ) {
      countEstoqueAplicacao++;
    } else {
      // São extintores em campo (Na Área Aplicado)
      countNaArea++;
      if (asset.status_estoque !== 'NA ÁREA (APLICADO)' || asset.tipo_movimentacao !== 'na_area_aplicado') {
        toUpdateNaArea.push(asset.id);
      }
    }
  }

  console.log(`Contagem atual identificada:`);
  console.log(`- Na Área (Aplicado): ${countNaArea}`);
  console.log(`- Estoque Aplicação: ${countEstoqueAplicacao}`);
  console.log(`- Estoque Manutenção: ${countEstoqueManutencao}`);
  console.log(`- Soma: ${countNaArea + countEstoqueAplicacao + countEstoqueManutencao}`);
  console.log(`- Registros Na Área a atualizar para padrão 'NA ÁREA (APLICADO)': ${toUpdateNaArea.length}`);

  // Atualizar em blocos de 50 registros
  if (toUpdateNaArea.length > 0) {
    console.log('Atualizando registros para conformidade...');
    const chunkSize = 50;
    for (let i = 0; i < toUpdateNaArea.length; i += chunkSize) {
      const chunk = toUpdateNaArea.slice(i, i + chunkSize);
      const { error: updateErr } = await supabase
        .from('assets')
        .update({
          status_estoque: 'NA ÁREA (APLICADO)',
          tipo_movimentacao: 'na_area_aplicado',
          updated_at: new Date().toISOString()
        })
        .in('id', chunk);

      if (updateErr) {
        console.error(`Erro ao atualizar chunk ${i}:`, updateErr.message);
      } else {
        console.log(`Atualizados ${Math.min(i + chunkSize, toUpdateNaArea.length)}/${toUpdateNaArea.length}`);
      }
    }
  }

  // Verificar pós-atualização
  const { data: verifyData } = await supabase.from('assets').select('id, status_estoque, tipo_movimentacao');
  const counts = { naArea: 0, estoqueApp: 0, estoqueManut: 0, outros: 0 };
  for (const a of verifyData) {
    if (a.status_estoque === 'NA ÁREA (APLICADO)' || a.tipo_movimentacao === 'na_area_aplicado') {
      counts.naArea++;
    } else if (a.status_estoque === 'ESTOQUE APLICAÇÃO' || a.tipo_movimentacao === 'estoque_aplicacao') {
      counts.estoqueApp++;
    } else if (a.status_estoque === 'ESTOQUE MANUTENÇÃO' || a.tipo_movimentacao === 'estoque_ag_manut') {
      counts.estoqueManut++;
    } else {
      counts.outros++;
    }
  }

  console.log('\n=== RESULTADO PÓS-SANITIZAÇÃO ===');
  console.log(`Na Área: ${counts.naArea}`);
  console.log(`Estoque Aplicação: ${counts.estoqueApp}`);
  console.log(`Estoque Manutenção: ${counts.estoqueManut}`);
  console.log(`Outros: ${counts.outros}`);
  console.log(`Total: ${counts.naArea + counts.estoqueApp + counts.estoqueManut + counts.outros}`);
}

main().catch(console.error);
