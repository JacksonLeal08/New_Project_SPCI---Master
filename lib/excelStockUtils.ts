/**
 * Utilitário de Importação e Exportação de Ativos (CSV / XLSX)
 * Suporta modelo padrão para download, validação de cabeçalhos e exportação para edição em massa.
 */

export interface RawStockImportRow {
  patrimonio?: string;
  numero_serie?: string;
  tipo_ativo?: string;
  modelo?: string;
  capacidade_peso?: string;
  fabricante?: string;
  mes_ano_ultima_recarga?: string;
  mes_ano_vencimento?: string;
  location?: string;
  sub_location?: string;
  observacoes?: string;
  line_number?: number;
}

export interface ValidatedStockImportRow extends RawStockImportRow {
  isValid: boolean;
  errorReason?: string;
  isDuplicateInDB?: boolean;
  formattedRecarga?: string;
  formattedVencimento?: string;
}

/**
 * Valida se uma string de mês/ano (MM/AAAA ou MM-AAAA ou YYYY-MM) é um formato válido
 */
export function parseAndValidateMMAAAA(dateStr?: string | null): {
  isValid: boolean;
  formattedDate?: string;
  error?: string;
} {
  if (!dateStr || !dateStr.trim()) {
    return { isValid: true, formattedDate: undefined };
  }
  const clean = dateStr.trim();
  let month: number = 0;
  let year: number = 0;

  if (/^\d{1,2}[\/\-]\d{4}$/.test(clean)) {
    const [m, y] = clean.split(/[\/\-]/).map(Number);
    month = m;
    year = y;
  } else if (/^\d{4}[\/\-]\d{1,2}$/.test(clean)) {
    const [y, m] = clean.split(/[\/\-]/).map(Number);
    month = m;
    year = y;
  } else if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(clean)) {
    const [y, m] = clean.split(/[\/\-]/).map(Number);
    month = m;
    year = y;
  } else {
    return { isValid: false, error: 'Formato de data inválido. Use MM/AAAA' };
  }

  if (month < 1 || month > 12) {
    return { isValid: false, error: 'Mês inválido (deve ser entre 01 e 12)' };
  }
  if (year < 2000 || year > 2050) {
    return { isValid: false, error: 'Ano fora do limite permitido (2000-2050)' };
  }

  const formattedDate = `${year}-${String(month).padStart(2, '0')}-01`;
  return { isValid: true, formattedDate };
}

/**
 * Valida uma linha de importação aplicando as regras de negócio
 */
export function validateStockImportRow(
  row: RawStockImportRow,
  existingSerialNumbers: string[] = []
): ValidatedStockImportRow {
  const isDuplicate = Boolean(row.numero_serie && existingSerialNumbers.includes(row.numero_serie));

  // Validação da data de última recarga
  const recargaVal = parseAndValidateMMAAAA(row.mes_ano_ultima_recarga);
  if (!recargaVal.isValid) {
    return {
      ...row,
      isValid: false,
      errorReason: `Última Recarga: ${recargaVal.error}`,
      isDuplicateInDB: isDuplicate
    };
  }

  // Validação da data de vencimento
  const vencVal = parseAndValidateMMAAAA(row.mes_ano_vencimento);
  if (!vencVal.isValid) {
    return {
      ...row,
      isValid: false,
      errorReason: `Vencimento: ${vencVal.error}`,
      isDuplicateInDB: isDuplicate
    };
  }

  // Regra de consistência: Vencimento não pode ser anterior à Última Recarga
  if (recargaVal.formattedDate && vencVal.formattedDate) {
    if (new Date(vencVal.formattedDate) < new Date(recargaVal.formattedDate)) {
      return {
        ...row,
        isValid: false,
        errorReason: 'Data de Vencimento não pode ser anterior à Data da Última Recarga',
        isDuplicateInDB: isDuplicate,
        formattedRecarga: recargaVal.formattedDate,
        formattedVencimento: vencVal.formattedDate
      };
    }
  }

  return {
    ...row,
    isValid: true,
    isDuplicateInDB: isDuplicate,
    formattedRecarga: recargaVal.formattedDate,
    formattedVencimento: vencVal.formattedDate
  };
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
    'fabricante',
    'mes_ano_ultima_recarga',
    'mes_ano_vencimento',
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
      'Kidde',
      '03/2025',
      '03/2026',
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
      'Resmat',
      '01/2024',
      '01/2029',
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
  link.setAttribute('download', 'modelo_importacao_ativos_spci_master.csv');
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
      } else if (h.includes('fabrica') || h.includes('fabricante')) {
        row.fabricante = val;
      } else if (h.includes('recarga') || h.includes('última recarga')) {
        row.mes_ano_ultima_recarga = val;
      } else if (h.includes('venci') || h.includes('vencimento')) {
        row.mes_ano_vencimento = val;
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
    if (!row.modelo && rawCells[3]) row.modelo = rawCells[3];
    if (!row.capacidade_peso && rawCells[4]) row.capacidade_peso = rawCells[4];
    if (!row.fabricante && rawCells[5]) row.fabricante = rawCells[5];
    if (!row.mes_ano_ultima_recarga && rawCells[6]) row.mes_ano_ultima_recarga = rawCells[6];
    if (!row.mes_ano_vencimento && rawCells[7]) row.mes_ano_vencimento = rawCells[7];

    rows.push(row);
  }

  return rows;
}

/**
 * Exporta uma lista de ativos formatados para reedição em massa em formato XLSX/CSV
 */
export function exportStockItemsToCSV(items: any[], filename: string = 'ativos_estoque_spci_master.csv') {
  const headers = [
    'patrimonio',
    'numero_serie',
    'tipo_ativo',
    'modelo',
    'capacidade_peso',
    'fabricante',
    'mes_ano_ultima_recarga',
    'mes_ano_vencimento',
    'location',
    'sub_location',
    'observacoes'
  ];

  const rows = items.map((it) => {
    let recargaMMAAAA = '';
    if (it.ultima_recarga || it.details?.ultima_recarga) {
      const rStr = it.ultima_recarga || it.details?.ultima_recarga;
      if (rStr.length >= 7) {
        const [y, m] = rStr.split('-');
        recargaMMAAAA = `${String(m).padStart(2, '0')}/${y}`;
      }
    }

    let vencimentoMMAAAA = '';
    if (it.validadeRecarga || it.data_vencimento_teste) {
      const vStr = it.validadeRecarga || it.data_vencimento_teste;
      if (vStr.length >= 7) {
        const [y, m] = vStr.split('-');
        vencimentoMMAAAA = `${String(m).padStart(2, '0')}/${y}`;
      }
    }

    return [
      it.patrimonio || it.id_ativo || it.id,
      it.numero_serie || it.details?.serialNumber || '',
      it.category || 'extintores',
      it.model || 'Padrão',
      it.peso_capacidade || it.details?.peso_capacidade || '4KG',
      it.fabricante || it.details?.fabricante || 'Kidde',
      recargaMMAAAA,
      vencimentoMMAAAA,
      it.location || 'Almoxarifado',
      it.sub_location || 'Estoque',
      it.status || 'Conforme'
    ];
  });

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
