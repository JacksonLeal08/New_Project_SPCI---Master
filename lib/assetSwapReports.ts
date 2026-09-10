'use client';

import * as XLSX from 'xlsx';
import { SubstituicaoAtivoRecord } from '@/app/actions/assetSwapActions';
import { formatFriendlyPatrimonio } from '@/lib/maintenanceBatchReports';

export function formatFriendlyMotivo(motivo: string): string {
  const map: Record<string, string> = {
    IMPEDITIVO_NBR: 'Impeditivo NBR 12962 / 15808',
    DESPRESSURIZADO: 'Manômetro Despressurizado / Sem Pressão',
    VENCIDO: 'Validade de Carga / Teste Vencida',
    LACRE_ROMPIDO: 'Lacre de Segurança Rompido ou Violado',
    AVARIA_MECANICA: 'Avaria Física / Amassado / Corrosão',
    USO_EMERGENCIA: 'Disparado em Emergência / Princípio de Incêndio',
    SOLICITACAO_SETOR: 'Chamado Solicitado por Líder de Setor',
    OUTROS: 'Substituição Preventiva / Outros',
  };
  return map[motivo] || motivo.replace(/_/g, ' ');
}

/**
 * Gera e abre o laudo oficial de substituição de extintor para impressão/PDF
 */
export function generateSwapReportPDF(troca: SubstituicaoAtivoRecord) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, autorize popups para visualizar e imprimir o Laudo de Substituição.');
    return;
  }

  const dataFormatada = new Date(troca.criado_em).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Laudo de Substituição - ${troca.id}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          font-size: 11px;
          line-height: 1.4;
          padding: 8px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #af101a;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }
        .brand-title {
          font-size: 17px;
          font-weight: 900;
          color: #af101a;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .brand-sub {
          font-size: 9px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          margin-top: 1px;
        }
        .doc-code {
          font-family: monospace;
          font-size: 11px;
          font-weight: 800;
          background: #f1f5f9;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          color: #af101a;
        }
        .section-title {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f172a;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .bilateral-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }
        .asset-card {
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px;
          background: #f8fafc;
        }
        .asset-card.retirado {
          border-color: #fca5a5;
          background: #fef2f2;
        }
        .asset-card.substituto {
          border-color: #86efac;
          background: #f0fdf4;
        }
        .asset-role {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
        }
        .asset-card.retirado .asset-role { color: #b91c1c; }
        .asset-card.substituto .asset-role { color: #15803d; }

        .meta-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        .meta-table td {
          padding: 3px 4px;
          border-bottom: 1px solid #e2e8f0;
        }
        .meta-table td.label {
          font-weight: 700;
          color: #64748b;
          width: 40%;
        }
        .meta-table td.val {
          font-weight: 600;
          color: #0f172a;
        }

        .details-box {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 14px;
          font-size: 10px;
        }
        .details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 6px;
        }

        .photos-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }
        .photo-box {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px;
          background: #f8fafc;
          text-align: center;
        }
        .photo-box img {
          max-height: 180px;
          width: auto;
          max-width: 100%;
          object-fit: contain;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }
        .photo-label {
          font-size: 9px;
          font-weight: 700;
          color: #475569;
          margin-top: 4px;
          text-transform: uppercase;
        }

        .disclaimer-box {
          background: #fffbeb;
          border-left: 3px solid #f59e0b;
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 8.5px;
          color: #92400e;
          margin-bottom: 20px;
          line-height: 1.3;
        }

        .signatures-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sign-box {
          border-top: 1.5px solid #475569;
          text-align: center;
          padding-top: 4px;
        }
        .sign-role {
          font-size: 9.5px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
        }
        .sign-sub {
          font-size: 8px;
          color: #64748b;
          margin-top: 1px;
        }

        .footer {
          margin-top: 18px;
          padding-top: 6px;
          border-top: 1px solid #e2e8f0;
          font-size: 8px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-title">SPCI MASTER • SISTEMA DE GESTÃO CONTRA INCÊNDIO</div>
          <div class="brand-sub">LAUDO TÉCNICO DE TROCA & SUBSTITUIÇÃO DE EXTINTORES • GRUPO OMG</div>
        </div>
        <div style="text-align: right;">
          <div class="doc-code">${troca.id}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">Emissão: ${dataFormatada}</div>
        </div>
      </div>

      <!-- Comparativo Bilateral -->
      <div class="section-title">🔄 Ativos Envolvidos na Substituição Bilateral</div>
      <div class="bilateral-grid">
        <!-- Extintor Retirado -->
        <div class="asset-card retirado">
          <div class="asset-role">
            <span>🔴 Ativo Retirado da Área</span>
            <span>Destino: Manutenção</span>
          </div>
          <table class="meta-table">
            <tr>
              <td class="label">Identificação:</td>
              <td class="val" style="color: #b91c1c; font-weight: 800;">${formatFriendlyPatrimonio(troca.ativo_retirado_id, troca.ativo_retirado_patrimonio)}</td>
            </tr>
            <tr>
              <td class="label">Nº Chassi / Série:</td>
              <td class="val" style="font-family: monospace;">${troca.ativo_retirado_chassi || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Modelo / Agente:</td>
              <td class="val">${troca.ativo_retirado_modelo || 'PQS ABC'}</td>
            </tr>
            <tr>
              <td class="label">Capacidade / Carga:</td>
              <td class="val">${troca.ativo_retirado_capacidade || '6 kg'}</td>
            </tr>
            <tr>
              <td class="label">Novo Status:</td>
              <td class="val">ESTOQUE MANUTENÇÃO</td>
            </tr>
          </table>
        </div>

        <!-- Extintor Substituto -->
        <div class="asset-card substituto">
          <div class="asset-role">
            <span>🟢 Ativo Substituto Instalado</span>
            <span>Origem: Pronta-Entrega</span>
          </div>
          <table class="meta-table">
            <tr>
              <td class="label">Identificação:</td>
              <td class="val" style="color: #15803d; font-weight: 800;">${formatFriendlyPatrimonio(troca.ativo_substituto_id, troca.ativo_substituto_patrimonio)}</td>
            </tr>
            <tr>
              <td class="label">Nº Chassi / Série:</td>
              <td class="val" style="font-family: monospace;">${troca.ativo_substituto_chassi || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Modelo / Agente:</td>
              <td class="val">${troca.ativo_substituto_modelo || 'PQS ABC'}</td>
            </tr>
            <tr>
              <td class="label">Capacidade / Carga:</td>
              <td class="val">${troca.ativo_substituto_capacidade || '6 kg'}</td>
            </tr>
            <tr>
              <td class="label">Novo Status:</td>
              <td class="val">NA ÁREA (APLICADO)</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Dados Operacionais do Ponto e Motivo -->
      <div class="section-title">📍 Contexto Operacional & Justificativa Técnica</div>
      <div class="details-box">
        <div class="details-grid">
          <div>
            <strong>Setor / Local:</strong><br>
            <span>${troca.setor}</span> ${troca.sub_local ? `• ${troca.sub_local}` : ''}
          </div>
          <div>
            <strong>Ponto Específico:</strong><br>
            <span>${troca.local_especifico || 'Conforme Mapa Operacional'}</span>
          </div>
          <div>
            <strong>Técnico Executor:</strong><br>
            <span>${troca.tecnico_responsavel_nome}</span>
          </div>
        </div>
        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
          <strong>Motivo da Troca:</strong>
          <span style="color: #b91c1c; font-weight: 800;">${formatFriendlyMotivo(troca.motivo_troca)}</span>
          ${troca.descricao_motivo ? `<p style="margin-top: 4px; color: #475569;"><em>"${troca.descricao_motivo}"</em></p>` : ''}
        </div>
      </div>

      <!-- Evidências Fotográficas -->
      ${
        troca.foto_antes_url || troca.foto_depois_url
          ? `
        <div class="section-title">📸 Registro Fotográfico da Ocorrência</div>
        <div class="photos-container">
          <div class="photo-box">
            ${
              troca.foto_antes_url
                ? `<img src="${troca.foto_antes_url}" alt="Foto Antes da Troca">`
                : `<div style="padding: 40px 10px; color: #94a3b8;">Foto do equipamento retirado não anexada</div>`
            }
            <div class="photo-label">Registro 1: Condição do Ativo Retirado</div>
          </div>
          <div class="photo-box">
            ${
              troca.foto_depois_url
                ? `<img src="${troca.foto_depois_url}" alt="Foto Depois da Troca">`
                : `<div style="padding: 40px 10px; color: #94a3b8;">Foto do equipamento instalado não anexada</div>`
            }
            <div class="photo-label">Registro 2: Substituto Instalado e Sinalizado</div>
          </div>
        </div>
      `
          : ''
      }

      <div class="disclaimer-box">
        <strong>Certificação de Conformidade NBR 12962 / NBR 15808:</strong> A substituição acima foi executada em conformidade com as normas regulamentadoras do Corpo de Bombeiros e ABNT. O equipamento retirado foi encaminhado imediatamente à baia de triagem para expedição de manutenção de 2º ou 3º nível, mantendo a cobertura do setor 100% ativa sem desguarnecimento.
      </div>

      <div class="signatures-container">
        <div class="sign-box">
          <div class="sign-role">Técnico / Bombeiro Executor</div>
          <div class="sign-sub">${troca.tecnico_responsavel_nome} • Matrícula / Registro</div>
        </div>
        <div class="sign-box">
          <div class="sign-role">Gestão SST / Segurança Patrimonial</div>
          <div class="sign-sub">Grupo OMG • SPCI Master</div>
        </div>
      </div>

      <div class="footer">
        <span>Sistema SPCI Master • Rastreabilidade Perpétua de Equipamentos de Emergência</span>
        <span>Autenticação: ${troca.id}</span>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Exporta o histórico completo de trocas para XLSX
 */
export function exportSwapsToXLSX(trocas: SubstituicaoAtivoRecord[]) {
  const sheetData: any[][] = [
    ['SISTEMA SPCI MASTER - RELATÓRIO GERENCIAL DE TROCAS & SUBSTITUIÇÕES DE EXTINTORES'],
    [`Data de Geração:`, new Date().toLocaleDateString('pt-BR'), '', `Total de Substituições:`, trocas.length],
    [],
    [
      'ID Troca',
      'Data / Hora',
      'Setor',
      'Sub-local',
      'Motivo da Substituição',
      'Retirado: Código / Patr.',
      'Retirado: Chassi',
      'Retirado: Modelo',
      'Retirado: Capacidade',
      'Substituto: Código / Patr.',
      'Substituto: Chassi',
      'Substituto: Modelo',
      'Substituto: Capacidade',
      'Técnico Responsável',
      'Descrição / Observações',
    ],
  ];

  trocas.forEach((t) => {
    sheetData.push([
      t.id,
      new Date(t.criado_em).toLocaleDateString('pt-BR') + ' ' + new Date(t.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      t.setor,
      t.sub_local || 'N/A',
      formatFriendlyMotivo(t.motivo_troca),
      t.ativo_retirado_patrimonio || t.ativo_retirado_codigo,
      t.ativo_retirado_chassi || 'N/A',
      t.ativo_retirado_modelo || 'PQS ABC',
      t.ativo_retirado_capacidade || '6 kg',
      t.ativo_substituto_patrimonio || t.ativo_substituto_codigo,
      t.ativo_substituto_chassi || 'N/A',
      t.ativo_substituto_modelo || 'PQS ABC',
      t.ativo_substituto_capacidade || '6 kg',
      t.tecnico_responsavel_nome,
      t.descricao_motivo || '',
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  worksheet['!cols'] = [
    { wch: 18 }, // ID Troca
    { wch: 18 }, // Data
    { wch: 18 }, // Setor
    { wch: 16 }, // Sub-local
    { wch: 28 }, // Motivo
    { wch: 18 }, // Retirado Patr
    { wch: 16 }, // Retirado Chassi
    { wch: 14 }, // Retirado Mod
    { wch: 12 }, // Retirado Cap
    { wch: 18 }, // Substituto Patr
    { wch: 16 }, // Substituto Chassi
    { wch: 14 }, // Substituto Mod
    { wch: 12 }, // Substituto Cap
    { wch: 22 }, // Tecnico
    { wch: 35 }, // Obs
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Trocas_Extintores');

  const fileName = `Relatorio_Trocas_Extintores_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
