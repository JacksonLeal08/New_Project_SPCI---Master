/**
/**
 * Utilitário de Importação e Exportação de Ativos (CSV / XLSX)
 * Suporta modelo padrão para download, validação de cabeçalhos e exportação.
 */

export interface RawStockImportRow {
  patrimonio?: string;
  numero_serie?: string;
  tipo_ativo?: string;
  modelo?: string;
  capacidade_peso?: string;
  location?: string;
  sub_location?: string;
  observacoes?: string;
  line_number?: number;
}

export interface ValidatedStockImportRow extends RawStockImportRow {
  isValid: boolean;
  errorReason?: string;
  isDuplicateInDB?: boolean;
}

/**
 * Gera e força o download do modelo padrão CSV/Excel de Importação de Ativos
 */
export function downloadStockImportTemplate() {
  const csvHeaders = [
    'patrimonio',
    'numero_serie',
    'tipo_ativo',
    'modelo',
    'capacidade_peso',
    'location',
    'sub_location',
    'observacoes'
  ];

  const sampleRows = [
    [
      'EXT-2026-0090',
      'SR-771209',
      'Extintor',
      'PQS ABC',
      '4 KG',
      'Almoxarifado Central',
      'Setor A',
      'Ativo novo em estoque'
    ],
    [
      'HID-2026-0015',
      'HD-881200',
      'Hidrante',
      'Carretel',
      '30 M',
      'Prédio Administrativo',
      'Térreo',
      'Testado em conformidade'
    ]
  ];

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    csvHeaders.join(';') +
    '\n' +
    sampleRows.map((r) => r.map((cell) => `"${cell}"`).join(';')).join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'modelo_importacao_ativos_spci.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Converte o conteúdo de texto de um arquivo CSV ou tabulação em um array de objetos brutos
 */
export function parseCSVToStockRows(csvText: string): RawStockImportRow[] {
  const lines = csvText
    .split(/\r\n|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) return [];

  // Identifica delimitador (ponto e vírgula ou vírgula)
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

  const rows: RawStockImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCells = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
    if (rawCells.every((cell) => cell === '')) continue;

    const row: RawStockImportRow = { line_number: i + 1 };

    headers.forEach((h, idx) => {
      const val = rawCells[idx] || '';
      if (h.includes('patrimon') || h.includes('patrimônio') || h.includes('código')) {
        row.patrimonio = val;
      } else if (h.includes('serie') || h.includes('série') || h.includes('nº série')) {
        row.numero_serie = val;
      } else if (h.includes('tipo')) {
        row.tipo_ativo = val;
      } else if (h.includes('modelo')) {
        row.modelo = val;
      } else if (h.includes('capacidade') || h.includes('peso')) {
        row.capacidade_peso = val;
      } else if (h.includes('local') || h.includes('setor')) {
        row.location = val;
      } else if (h.includes('sub') || h.includes('subsetor')) {
        row.sub_location = val;
      } else if (h.includes('obs') || h.includes('observa')) {
        row.observacoes = val;
      }
    });

    // Fallbacks para posições padrões se o cabeçalho não bateu
    if (!row.patrimonio && rawCells[0]) row.patrimonio = rawCells[0];
    if (!row.numero_serie && rawCells[1]) row.numero_serie = rawCells[1];
    if (!row.tipo_ativo && rawCells[2]) row.tipo_ativo = rawCells[2];

    rows.push(row);
  }

  return rows;
}

/**
 * Exporta uma lista de ativos formatados em arquivo CSV compatível com Excel
 */
export function exportStockItemsToCSV(items: any[], filename: string = 'relatorio_estoque_ativos.csv') {
  const headers = [
    'Código/Patrimônio',
    'Tipo de Ativo',
    'Nº de Série',
    'Modelo',
    'Status Estoque',
    'Localização',
    'Sub-local',
    'Status Inspeção',
    'Data Cadastro'
  ];

  const rows = items.map((it) => [
    it.patrimonio || it.id_ativo || it.id,
    it.category || 'Extintor',
    it.numero_serie || it.details?.serialNumber || 'N/A',
    it.model || 'Padrão',
    it.status_estoque || 'ESTOQUE APLICAÇÃO',
    it.location || 'Almoxarifado',
    it.sub_location || 'Geral',
    it.status || 'Conforme',
    new Date(it.created_at || Date.now()).toLocaleDateString('pt-BR')
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    headers.join(';') +
    '\n' +
    rows.map((r) => r.map((cell) => `"${cell}"`).join(';')).join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
