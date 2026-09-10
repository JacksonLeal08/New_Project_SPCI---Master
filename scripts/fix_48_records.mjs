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
  // Update assets that have tipo_movimentacao = 'na_area_aplicado' but status_estoque is not null
  const { data: inconsistents, error: fetchErr } = await supabase
    .from('assets')
    .select('id, id_ativo, status_estoque, tipo_movimentacao')
    .eq('tipo_movimentacao', 'na_area_aplicado')
    .not('status_estoque', 'is', null);

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }

  console.log(`Inconsistências encontradas (na_area com status_estoque preenchido): ${inconsistents.length}`);

  const ids = inconsistents.map(a => a.id);
  if (ids.length > 0) {
    const { error: updateErr } = await supabase
      .from('assets')
      .update({ status_estoque: null })
      .in('id', ids);

    if (updateErr) {
      console.error('Update error:', updateErr);
    } else {
      console.log(`Sucesso ao limpar status_estoque dos ${ids.length} extintores em campo!`);
    }
  }

  // Verificar distribuição exata dos 651 ativos
  const { data: allAssets } = await supabase
    .from('assets')
    .select('id, id_ativo, status_estoque, tipo_movimentacao');

  let naArea = 0;
  let estAplicacao = 0;
  let estManutencao = 0;
  let outros = 0;

  for (const a of allAssets) {
    if (a.status_estoque === 'ESTOQUE MANUTENÇÃO' || a.tipo_movimentacao === 'estoque_ag_manut') {
      estManutencao++;
    } else if (a.status_estoque === 'ESTOQUE APLICAÇÃO' || a.tipo_movimentacao === 'estoque_aplicacao') {
      estAplicacao++;
    } else if (a.tipo_movimentacao === 'na_area_aplicado' || a.status_estoque === null) {
      naArea++;
    } else {
      outros++;
    }
  }

  console.log('--- DISTRIBUIÇÃO OPERACIONAL EXATA ---');
  console.log(`1. Na Área (Aplicado): ${naArea}`);
  console.log(`2. Estoque Aplicação: ${estAplicacao}`);
  console.log(`3. Estoque Manutenção: ${estManutencao}`);
  console.log(`4. Outros: ${outros}`);
  console.log(`Total Geral: ${naArea + estAplicacao + estManutencao + outros}`);
}

main().catch(console.error);
