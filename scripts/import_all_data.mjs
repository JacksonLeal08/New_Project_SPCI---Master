import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 1. Ler credenciais do .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const getEnv = (key) => {
  const m = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return m ? m[1].trim().replace(/['"]/g, '') : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env.local');
  process.exit(1);
}

console.log(`Conectando ao Supabase em: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const backupPath = 'C:\\Users\\jacks\\OneDrive\\Documentos\\Jackson Leal\\ANTIGRAVITY_PROJECTS\\db_cluster-14-09-2026@04-04-37.backup\\db_cluster-14-09-2026@04-04-37.backup';

console.log(`Lendo arquivo de backup: ${backupPath}...`);
const text = fs.readFileSync(backupPath, 'utf8');

function extractTableData(tableName) {
  const prefix = `COPY public.${tableName} (`;
  const startIdx = text.indexOf(prefix);
  if (startIdx === -1) return null;
  const endOfCopyLine = text.indexOf('\n', startIdx);
  const headerLine = text.slice(startIdx, endOfCopyLine);
  const colStr = headerLine.slice(headerLine.indexOf('(') + 1, headerLine.indexOf(')'));
  const cols = colStr.split(',').map(c => c.trim());
  
  const termIdx = text.indexOf('\n\\.', endOfCopyLine);
  if (termIdx === -1) return null;
  const dataBlock = text.slice(endOfCopyLine + 1, termIdx);
  const lines = dataBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const records = lines.map(line => {
    const parts = line.split('\t');
    const obj = {};
    cols.forEach((col, idx) => {
      let val = parts[idx];
      if (val === '\\N' || val === undefined) {
        obj[col] = null;
      } else {
        if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
          try {
            obj[col] = JSON.parse(val);
          } catch {
            obj[col] = val;
          }
        } else if (val === 't') {
          obj[col] = true;
        } else if (val === 'f') {
          obj[col] = false;
        } else {
          obj[col] = val;
        }
      }
    });
    return obj;
  });
  
  return { cols, records };
}

const TABLES_TO_SYNC = [
  'locais',
  'sub_locais',
  'modelos_extintores',
  'contratos',
  'checklists_ativos',
  'fornecedores_manutencao',
  'lotes_manutencao',
  'itens_lote_manutencao',
  'assets',
  'ativos_extintores',
  'cadastro_extintores',
  'inspecoes',
  'inspecoes_realizadas',
  'ativo_movimentacoes',
  'historico_movimentacoes_ativos',
  'historico_localizacao_ativo',
  'shared_sessions'
];

async function run() {
  console.log('Iniciando importação automatizada dos dados para o novo Supabase...\n');
  
  for (const table of TABLES_TO_SYNC) {
    const data = extractTableData(table);
    if (!data || data.records.length === 0) {
      console.log(`- ${table}: 0 registros encontrados.`);
      continue;
    }
    
    console.log(`Importando ${data.records.length} registros em '${table}'...`);
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < data.records.length; i += batchSize) {
      const chunk = data.records.slice(i, i + batchSize);
      const { error } = await supabase.from(table).upsert(chunk, { ignoreDuplicates: true });
      if (error) {
        console.error(`  [ERRO] Falha ao importar lote em ${table}:`, error.message);
      } else {
        inserted += chunk.length;
      }
    }
    console.log(`  [OK] ${inserted}/${data.records.length} registros importados em '${table}'.\n`);
  }
  
  console.log('Importação concluída com sucesso!');
}

run().catch(err => {
  console.error('Erro fatal na importação:', err);
});
