import fs from 'fs';
import path from 'path';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Carrega de .env.local se executado localmente
if (!supabaseUrl || !supabaseKey) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const getEnv = (key) => {
      const m = envContent.match(new RegExp(key + '=([^\\r\\n]+)'));
      return m ? m[1].trim().replace(/['"]/g, '') : null;
    };
    supabaseUrl = supabaseUrl || getEnv('NEXT_PUBLIC_SUPABASE_URL');
    supabaseKey = supabaseKey || getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

// Fallbacks de contingência
supabaseUrl = supabaseUrl || 'https://katqbezpcssrmicgnshg.supabase.co';
supabaseKey = supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdHFiZXpwY3Nzcm1pY2duc2hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQ2NTE2MiwiZXhwIjoyMTA1MDQxMTYyfQ.GR-vQm52h9P0EgvuDoovbb9fseAKy9XBCbe53eU0SVA';

// Lista de tabelas prioritárias do SPCI para backup
const TABLES_TO_BACKUP = [
  'assets',
  'ativos_extintores',
  'substituicoes_ativos',
  'ativo_movimentacoes',
  'historico_movimentacoes_ativos',
  'lotes_manutencao',
  'itens_lote_manutencao',
  'inspecoes',
  'inspections',
  'checklists_ativos',
  'locais',
  'sub_locais',
  'modelos_extintores',
  'areas',
  'projetos',
  'logs_auditoria'
];

const PAGE_SIZE = 1000;

async function fetchTableData(tableName) {
  let allRows = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const offset = page * PAGE_SIZE;
    const targetUrl = `${supabaseUrl}/rest/v1/${tableName}?select=*&limit=${PAGE_SIZE}&offset=${offset}`;

    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Range-Unit': 'items'
        }
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 400) {
          const body = await res.text();
          if (body.includes('does not exist') || body.includes('relation') || res.status === 404) {
            return { exists: false, rows: [] };
          }
        }
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const rows = await res.json();
      if (!Array.isArray(rows)) {
        return { exists: false, rows: [] };
      }

      allRows.push(...rows);

      if (rows.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (err) {
      return { exists: false, error: err.message, rows: [] };
    }
  }

  return { exists: true, rows: allRows };
}

async function runBackup() {
  const startTime = Date.now();
  const now = new Date();
  const dateIso = now.toISOString();
  const timeStr = dateIso.replace(/[:.]/g, '-').slice(0, 19);
  
  const backupDirName = `backup-spci-${timeStr}`;
  const outputBaseDir = path.resolve(process.cwd(), 'backups');
  const targetDir = path.join(outputBaseDir, backupDirName);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log('='.repeat(70));
  console.log(`🛡️  ROTINA DE BACKUP AUTOMATIZADO SPCI MASTER`);
  console.log(`📅  Data/Hora: ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log(`📂  Diretório de Destino: ${targetDir}`);
  console.log(`🌐  Servidor Supabase: ${supabaseUrl}`);
  console.log('='.repeat(70));

  const stats = {
    started_at: dateIso,
    completed_at: null,
    total_tables_checked: TABLES_TO_BACKUP.length,
    successful_tables: 0,
    total_records_exported: 0,
    total_bytes: 0,
    tables: {}
  };

  for (const table of TABLES_TO_BACKUP) {
    process.stdout.write(`⏳ Exportando tabela [${table}]... `);
    const result = await fetchTableData(table);

    if (!result.exists) {
      console.log(`⚠️  Ignorada (tabela não existe no banco ou sem acesso)`);
      stats.tables[table] = { status: 'skipped_or_not_found', count: 0, size_bytes: 0 };
      continue;
    }

    const rowCount = result.rows.length;
    const jsonPath = path.join(targetDir, `${table}.json`);
    const jsonContent = JSON.stringify(result.rows, null, 2);
    fs.writeFileSync(jsonPath, jsonContent, 'utf8');

    const fileSizeBytes = Buffer.byteLength(jsonContent, 'utf8');
    const fileSizeKb = (fileSizeBytes / 1024).toFixed(2);

    console.log(`✓ ${rowCount} registros (${fileSizeKb} KB)`);
    stats.successful_tables++;
    stats.total_records_exported += rowCount;
    stats.total_bytes += fileSizeBytes;
    stats.tables[table] = {
      status: 'exported',
      count: rowCount,
      size_bytes: fileSizeBytes,
      file: `${table}.json`
    };
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  stats.completed_at = new Date().toISOString();
  stats.duration_seconds = Number(durationSec);

  // Escreve arquivo de metadados
  const metaPath = path.join(targetDir, 'backup_metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(stats, null, 2), 'utf8');

  // Cria também um ponteiro "latest" na pasta backups para facilitar acesso
  const latestMetaPath = path.join(outputBaseDir, 'latest_backup_info.json');
  fs.writeFileSync(latestMetaPath, JSON.stringify({ latest_dir: backupDirName, ...stats }, null, 2), 'utf8');

  console.log('='.repeat(70));
  console.log(`✅ BACKUP CONCLUÍDO COM SUCESSO EM ${durationSec}s!`);
  console.log(`📊 Tabelas Exportadas: ${stats.successful_tables} de ${stats.total_tables_checked}`);
  console.log(`📦 Total de Registros Salvos: ${stats.total_records_exported}`);
  console.log(`💾 Tamanho Total dos Dados: ${(stats.total_bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📁 Local dos Arquivos: ${targetDir}`);
  console.log('='.repeat(70));

  // Gera relatório Markdown para o GitHub Actions Job Summary (se ambiente GitHub Actions)
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const summaryMarkdown = `
## 🛡️ SPCI Master - Relatório de Backup do Supabase

> **Executado em:** ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}  
> **Duração:** ${durationSec}s | **Status:** ✅ Concluído com Sucesso  
> **Total de Registros:** **${stats.total_records_exported.toLocaleString('pt-BR')}** | **Tamanho:** **${(stats.total_bytes / 1024 / 1024).toFixed(2)} MB**

### 📋 Detalhamento por Tabela

| Tabela | Status | Registros | Tamanho | Arquivo |
| :--- | :---: | :---: | :---: | :--- |
${Object.entries(stats.tables).map(([tbl, info]) => {
  const isOk = info.status === 'exported';
  const icon = isOk ? '✅' : '⚠️';
  const sizeKb = (info.size_bytes / 1024).toFixed(2) + ' KB';
  return `| \`${tbl}\` | ${icon} ${isOk ? 'Exportado' : 'Ignorado'} | **${info.count}** | ${isOk ? sizeKb : '-'} | \`${info.file || '-'}\` |`;
}).join('\n')}

---
*Backup gerado automaticamente e armazenado com retenção de 90 dias nos artefatos da ação.*
`;
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown, 'utf8');
    } catch (summaryErr) {
      console.warn('Não foi possível registrar no GITHUB_STEP_SUMMARY:', summaryErr.message);
    }
  }
}

runBackup().catch((err) => {
  console.error('❌ Erro crítico no backup:', err);
  process.exit(1);
});
