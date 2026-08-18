'use client';

import * as XLSX from 'xlsx';
import { LoteManutencaoRecord, ItemLoteManutencaoRecord } from '@/app/actions/maintenanceBatchActions';

export function formatFriendlyPatrimonio(idAtivo?: string, patrimonio?: string): string {
  const target = (patrimonio || idAtivo || '').trim();
  if (!target) return 'S/N';
  // Transforma identificadores gerados automaticamente como PAT-1786709848773-32 em PAT #32
  const match = target.match(/^PAT-\d+-(\d+)$/i);
  if (match) {
    return `PAT #${match[1]}`;
  }
  return target;
}

/**
 * Gera e abre o documento oficial de Romaneio de Envio de Manutenção formatado para impressão / salvamento em PDF
 */
export function generateBatchRomaneioPDF(lote: LoteManutencaoRecord, itens: ItemLoteManutencaoRecord[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita popups para visualizar e baixar o Romaneio em PDF.');
    return;
  }

  const dataEnvioFormatada = new Date(lote.data_envio).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const previsaoFormatada = lote.previsao_retorno
    ? new Date(lote.previsao_retorno + 'T12:00:00').toLocaleDateString('pt-BR')
    : 'Não informada';

  const rowsHtml = itens
    .map(
      (item, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold; width: 35px;">${String(idx + 1).padStart(2, '0')}</td>
        <td style="font-weight: bold; color: #af101a; font-family: monospace;">${formatFriendlyPatrimonio(item.id_ativo, item.patrimonio)}</td>
        <td style="font-family: monospace; font-weight: 600; color: #334155;">${item.numero_serie || 'S/N'}</td>
        <td><strong>${item.modelo_tipo || 'PQS ABC'}</strong></td>
        <td>${item.capacidade || 'N/A'}</td>
        <td style="font-family: monospace;">${item.selo_inmetro_anterior || 'Isento/Antigo'}</td>
        <td style="text-align: center;">${item.data_ultimo_hidro || 'N/A'}</td>
        <td style="text-align: center; color: #94a3b8; font-size: 8px;">[ &nbsp; ] OK</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Romaneio de Manutenção - ${lote.numero_lote}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm 12mm 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #1e293b;
          background: #ffffff;
          font-size: 11px;
          line-height: 1.4;
          padding: 10px;
        }
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #af101a;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .brand-title {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.5px;
        }
        .brand-subtitle {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 2px;
        }
        .doc-badge {
          text-align: right;
        }
        .doc-type {
          font-size: 12px;
          font-weight: 800;
          color: #af101a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .doc-code {
          font-family: monospace;
          font-size: 14px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 2px;
        }
        
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        .meta-label {
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.5px;
        }
        .meta-value {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 2px;
        }

        .section-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f172a;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #0f172a;
          color: #ffffff;
          text-transform: uppercase;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          padding: 8px 6px;
          text-align: left;
          border: 1px solid #0f172a;
        }
        td {
          padding: 7px 6px;
          border: 1px solid #cbd5e1;
          font-size: 10px;
        }
        tr:nth-child(even) {
          background: #f8fafc;
        }

        .disclaimer-box {
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-left: 3px solid #f59e0b;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 9px;
          color: #92400e;
          margin-bottom: 24px;
          line-height: 1.3;
        }

        .signatures-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 30px;
          page-break-inside: avoid;
        }
        .sign-box {
          border-top: 1.5px solid #475569;
          text-align: center;
          padding-top: 6px;
        }
        .sign-role {
          font-size: 10px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
        }
        .sign-sub {
          font-size: 8px;
          color: #64748b;
          margin-top: 2px;
        }

        .footer {
          margin-top: 25px;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          color: #94a3b8;
        }

        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #0f172a; color: white; padding: 12px 16px; margin: -10px -10px 16px -10px; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 8px 8px;">
        <span style="font-weight: bold; font-size: 12px;">Visualização de Romaneio de Envio - SPCI Master</span>
        <button onclick="window.print()" style="background: #af101a; color: white; border: none; padding: 8px 18px; font-weight: bold; border-radius: 6px; cursor: pointer; text-transform: uppercase; font-size: 11px;">
          🖨️ Imprimir / Salvar PDF
        </button>
      </div>

      <div class="header-container">
        <div>
          <div class="brand-title">SISTEMA SPCI MASTER</div>
          <div class="brand-subtitle">Gestão & Governança de Combate a Incêndio • Grupo OMG</div>
        </div>
        <div class="doc-badge">
          <div class="doc-type">Romaneio de Remessa para Manutenção</div>
          <div class="doc-code">${lote.numero_lote}</div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Prestador / Fornecedor</span>
          <span class="meta-value">${lote.fornecedor_nome}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Data de Emissão / Despacho</span>
          <span class="meta-value">${dataEnvioFormatada}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Total de Extintores</span>
          <span class="meta-value" style="color: #af101a;">${itens.length} Unidades</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Responsável pelo Envio</span>
          <span class="meta-value">${lote.usuario_envio_nome}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Previsão de Retorno</span>
          <span class="meta-value">${previsaoFormatada}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Status do Lote</span>
          <span class="meta-value" style="text-transform: uppercase;">${lote.status === 'FINALIZADO' ? 'Concluído' : 'Em Andamento'}</span>
        </div>
      </div>

      ${
        lote.observacoes
          ? `<div style="margin-bottom: 14px; font-size: 10px; color: #475569; background: #f1f5f9; padding: 8px 12px; border-radius: 6px;">
              <strong>Observações Gerais:</strong> ${lote.observacoes}
             </div>`
          : ''
      }

      <div class="section-title">
        <span>📋 Relação de Extintores Enviados (${itens.length})</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 40px;">Item</th>
            <th>Patrimônio / Identificação</th>
            <th>Nº Série / Chassi</th>
            <th>Agente Extintor / Modelo</th>
            <th>Carga</th>
            <th>Selo Inmetro Anterior</th>
            <th style="text-align: center;">Últ. Teste Hidro</th>
            <th style="text-align: center; width: 90px;">Conferência</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="disclaimer-box">
        <strong>Termo de Responsabilidade e Guarda:</strong> Os equipamentos listados acima foram retirados para execução de serviços de manutenção de 2º ou 3º nível (recarga e/ou ensaio hidrostático) em conformidade com as normas ABNT NBR 12962 e regulamentações do INMETRO. A transportadora e o prestador de serviços assumem a guarda física e técnica dos cilindros a partir da data de coleta registrada.
      </div>

      <div class="signatures-container">
        <div class="sign-box">
          <div class="sign-role">Responsável pelo Envio</div>
          <div class="sign-sub">SPCI Master / Emissor</div>
        </div>
        <div class="sign-box">
          <div class="sign-role">Transportador / Coleta</div>
          <div class="sign-sub">Nome Legível / RG / Assinatura</div>
        </div>
        <div class="sign-box">
          <div class="sign-role">Recepção no Prestador</div>
          <div class="sign-sub">Empresa de Manutenção / Carimbo</div>
        </div>
      </div>

      <div class="footer">
        <span>Documento gerado eletronicamente pelo Sistema SPCI Master • Rastreabilidade Perpétua de Ativos</span>
        <span>Página 1 de 1</span>
      </div>

      <script>
        // Opcional: Abre automaticamente o diálogo de impressão se solicitado
        // window.onload = () => window.print();
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Exporta os dados do lote de manutenção para planilha corporativa formatada em .XLSX
 */
export function exportBatchRomaneioXLSX(lote: LoteManutencaoRecord, itens: ItemLoteManutencaoRecord[]) {
  const dataEnvioStr = new Date(lote.data_envio).toLocaleDateString('pt-BR');

  // Cabeçalho de metadados
  const sheetData: any[][] = [
    ['SISTEMA SPCI MASTER - ROMANEIO DE ENVIO PARA MANUTENÇÃO'],
    [`Número do Lote:`, lote.numero_lote, '', `Data de Envio:`, dataEnvioStr],
    [`Fornecedor:`, lote.fornecedor_nome, '', `Previsão de Retorno:`, lote.previsao_retorno || 'N/A'],
    [`Responsável pelo Envio:`, lote.usuario_envio_nome, '', `Total de Extintores:`, itens.length],
    [`Status do Lote:`, lote.status, '', `Observações:`, lote.observacoes || 'Nenhuma'],
    [], // Linha em branco
    [
      'Item',
      'ID Ativo',
      'Patrimônio',
      'Nº Série / Chassi',
      'Modelo / Agente',
      'Capacidade',
      'Fabricante',
      'Selo Inmetro Anterior',
      'Último Teste Hidrostático',
      'Última Recarga',
      'Status Triagem',
      'Novo Selo Inmetro',
      'Nova Validade Recarga',
      'Nova Validade Hidro',
      'Motivo Condenação',
    ],
  ];

  // Inserção das linhas de dados
  itens.forEach((item, index) => {
    sheetData.push([
      index + 1,
      formatFriendlyPatrimonio(item.id_ativo, item.patrimonio),
      item.patrimonio || item.id_ativo,
      item.numero_serie || 'N/A',
      item.modelo_tipo || 'PQS ABC',
      item.capacidade || 'N/A',
      item.fabricante || 'N/A',
      item.selo_inmetro_anterior || 'Isento/N/A',
      item.data_ultimo_hidro || 'N/A',
      item.data_ultima_recarga || 'N/A',
      item.status_triagem || 'PENDENTE',
      item.novo_selo_inmetro || '',
      item.nova_validade_recarga || '',
      item.nova_validade_hidro || '',
      item.motivo_condenacao || '',
    ]);
  });

  // Linhas finais de protocolo
  sheetData.push([]);
  sheetData.push(['PROTOCOLO DE ASSINATURAS']);
  sheetData.push(['Assinatura do Responsável SPCI:', '_____________________________', '', 'Data:', '___/___/______']);
  sheetData.push(['Assinatura do Transportador:', '_____________________________', '', 'RG / Empresa:', '__________________']);
  sheetData.push(['Assinatura do Prestador:', '_____________________________', '', 'Carimbo / CNPJ:', '__________________']);

  // Criação do Workbook
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Ajuste de largura das colunas
  worksheet['!cols'] = [
    { wch: 6 },  // Item
    { wch: 14 }, // ID Ativo
    { wch: 16 }, // Patrimônio
    { wch: 18 }, // Nº Série
    { wch: 18 }, // Modelo
    { wch: 12 }, // Capacidade
    { wch: 14 }, // Fabricante
    { wch: 22 }, // Selo Inmetro
    { wch: 22 }, // Último Hidro
    { wch: 16 }, // Última Recarga
    { wch: 16 }, // Status Triagem
    { wch: 20 }, // Novo Selo
    { wch: 22 }, // Nova Recarga
    { wch: 20 }, // Novo Hidro
    { wch: 30 }, // Motivo
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Romaneio_Manutencao');

  const fileName = `Romaneio_${lote.numero_lote}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
