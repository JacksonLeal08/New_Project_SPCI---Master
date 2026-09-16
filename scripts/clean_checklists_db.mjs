import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
  const m = envContent.match(new RegExp(key + '=([^\\r\\n]+)'));
  return m ? m[1].trim().replace(/['"]/g, '') : null;
};
const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://katqbezpcssrmicgnshg.supabase.co';
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanChecklists() {
  console.log('=== DEDUPLICANDO checklists_ativos NO SUPABASE ===\n');

  const { data: rows, error } = await supabase
    .from('checklists_ativos')
    .select('*')
    .order('ordem', { ascending: true });

  console.log(`Total de registros atuais: ${rows?.length}`);

  // Deduplica por ID e por texto do item
  const uniqueMap = new Map();
  rows.forEach(r => {
    const key = (r.id || r.item).trim();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, r);
    }
  });

  const uniqueItems = Array.from(uniqueMap.values());
  console.log(`Total de itens únicos identificados: ${uniqueItems.length}`);

  // 1. Limpar tabela checklists_ativos
  const { error: delErr } = await supabase
    .from('checklists_ativos')
    .delete()
    .neq('id', '___impossivel___');
  console.log('Resultado ao limpar tabela:', delErr?.message || 'Sucesso');

  // 2. Re-inserir apenas os itens únicos com ordem corrigida de 1 a N
  const payload = uniqueItems.map((it, idx) => ({
    id: it.id,
    ordem: idx + 1,
    categoria: it.categoria || 'extintores',
    item: it.item,
    tipos_aplicaveis: it.tipos_aplicaveis || ['Todos'],
    pesos_aplicaveis: it.pesos_aplicaveis || ['Todos'],
    status: it.status || 'Ativado',
    is_impeditivo: it.is_impeditivo ?? false,
    updated_at: new Date().toISOString()
  }));

  const { data: insData, error: insErr } = await supabase
    .from('checklists_ativos')
    .insert(payload)
    .select();

  console.log('Resultado ao reinserir itens únicos:', insData?.length, insErr?.message || 'Sucesso');

  // Verificar contagem final
  const { data: finalRows } = await supabase
    .from('checklists_ativos')
    .select('*')
    .order('ordem', { ascending: true });

  console.log(`\nTotal final em checklists_ativos: ${finalRows?.length} itens.`);
  finalRows.forEach(f => console.log(`- [Ordem ${f.ordem}] ${f.id}: ${f.item.substring(0, 45)}... (Status: ${f.status})`));
}

cleanChecklists().catch(console.error);
