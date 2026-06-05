'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { D3SectorHeatmap } from '@/app/components/D3Heatmap';

export default function DashboardPage() {
  const router = useRouter();
  const {
    extintores,
    hidrantes,
    sinalizacoes,
    iluminacoes,
    bombas,
    complianceLogs,
    setScanModal,
    setSelectedAssetForHistory
  } = useSpci();

  // Estados para geração de QR Code dinâmico de vistorias em campo
  const [selectedAssetId, setSelectedAssetId] = React.useState<string>('');
  const [copiedLink, setCopiedLink] = React.useState<boolean>(false);

  // Lista unificada de opções de ativos para seleção
  const assetsSelectOptions = [
    ...extintores.map(x => ({ id: x.idAtivo || x.id, label: `🧯 Extintor - ${x.idAtivo || x.id} (${x.model})` })),
    ...hidrantes.map(x => ({ id: x.idAtivo || x.id, label: `💧 Hidrante - ${x.idAtivo || x.id}` })),
    ...sinalizacoes.map(x => ({ id: x.idAtivo || x.id, label: `🚸 Sinalização - ${x.idAtivo || x.id}` })),
    ...iluminacoes.map(x => ({ id: x.idAtivo || x.id, label: `💡 Iluminação - ${x.idAtivo || x.id}` })),
  ];

  const getQrCodeUrl = (assetId: string) => {
    if (typeof window === 'undefined') return '';
    const link = `${window.location.origin}/inspecao/${assetId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=dc2626&data=${encodeURIComponent(link)}`;
  };


  // --- COMPLIANCE KPI CALCULATORS ---
  const totalAssets = extintores.length + hidrantes.length + sinalizacoes.length + iluminacoes.length;
  const totalVencidos = 
    extintores.filter(x => x.status === 'Vencido').length + 
    hidrantes.filter(x => x.status === 'Vencido').length +
    sinalizacoes.filter(x => x.status === 'Faltante').length +
    iluminacoes.filter(x => x.status === 'Falha Carga').length;

  const totalAtencao =
    extintores.filter(x => x.status === 'Em Manutenção').length +
    hidrantes.filter(x => x.status === 'Em Manutenção').length +
    sinalizacoes.filter(x => x.status === 'Não Conforme').length +
    iluminacoes.filter(x => x.status === 'Atenção').length;

  const compliancePercentage = totalAssets > 0 ? Math.round(((totalAssets - totalVencidos) / totalAssets) * 100) : 100;

  // --- SECTOR MAP DATA COMPUTATION ---
  const getNormalizedSector = (loc: string) => {
    if (!loc) return 'OUTROS';
    const l = loc.toUpperCase();
    if (l.includes('MANGANÊS') || l.includes('MANGANESE')) return 'MANGANÊS';
    if (l.includes('ALMOXARIFADO')) return 'ALMOXARIFADO';
    if (l.includes('ELÉTRICA') || l.includes('ELETRICA') || l.includes('PAINEL') || l.includes('SALA ELÉTRICA')) return 'SALA ELÉTRICA';
    if (l.includes('BARRAGEM')) return 'BARRAGEM DO AZUL';
    if (l.includes('ROTA DE FUGA 01') || l.includes('FUGA 01')) return 'ROTA DE FUGA 01';
    if (l.includes('ROTA DE FUGA 02') || l.includes('FUGA 02')) return 'ROTA DE FUGA 02';
    if (l.includes('RECEPÇÃO') || l.includes('RECEPCAO') || l.includes('ADMINISTRATIVO') || l.includes('CORREDOR ADMINISTRATIVO')) return 'RECEPÇÃO';
    if (l.includes('COBRE')) return 'COBRE';
    if (l.includes('FERRO')) return 'FERRO';
    if (l.includes('PRODUÇÃO') || l.includes('SETOR C') || l.includes('CASA DE MÁQUINAS')) return 'PRODUÇÃO';
    if (l.includes('PÁTIO') || l.includes('PATIO') || l.includes('EXTERNA') || l.includes('LOGÍSTICA') || l.includes('LOGISTICA') || l.includes('SETOR B')) return 'LOGÍSTICA';
    return 'OUTROS';
  };

  const allAssets = [
    ...extintores.map(x => ({ ...x, category: 'Extintor' })),
    ...hidrantes.map(x => ({ ...x, category: 'Hidrante' })),
    ...sinalizacoes.map(x => ({ ...x, category: 'Sinalização' })),
    ...iluminacoes.map(x => ({ ...x, category: 'Iluminação' }))
  ];

  const heatmapSectors = ['MANGANÊS', 'ALMOXARIFADO', 'SALA ELÉTRICA', 'BARRAGEM DO AZUL', 'ROTA DE FUGA 01', 'ROTA DE FUGA 02', 'RECEPÇÃO', 'COBRE', 'FERRO', 'PRODUÇÃO', 'LOGÍSTICA'];

  const sectorStats = heatmapSectors.map(sector => {
    const assetsInSector = allAssets.filter(asset => getNormalizedSector(asset.location) === sector);
    const nonConformingCount = assetsInSector.filter(asset => {
      const s = asset.status;
      return s !== 'Conforme' && s !== 'Operacional' && s !== 'Cadastro Ativo' && s !== 'Standby';
    }).length;
    const conformingCount = assetsInSector.length - nonConformingCount;
    
    return {
      sector,
      nonConformingCount,
      conformingCount,
      totalCount: assetsInSector.length
    };
  });



  const handleExportInspectionCSV = () => {
    if (complianceLogs.length === 0) {
      alert('Nenhum relatório de ronda ou inspeção foi registrado nesta sessão ainda.');
      return;
    }
    
    const headers = ['ID do Ativo', 'Equipamento', 'Laudo / Notas de Inspeção', 'Data', 'Hora', 'Status de Conformidade'];
    const csvRows = [headers.join(';')];
    
    complianceLogs.forEach(log => {
      const row = [
        `"${log.assetId || ''}"`,
        `"${(log.model || '').replace(/"/g, '""')}"`,
        `"${(log.notes || '').replace(/"/g, '""')}"`,
        `"${log.date || ''}"`,
        `"${log.time || ''}"`,
        `"${log.status || ''}"`
      ];
      csvRows.push(row.join(';'));
    });
    
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_inspecoes_spci_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Banner de Boas-Vindas */}
      <div className="bg-gradient-to-r from-[#1e293b] via-[#232f34] to-[#0f172a] text-white p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-red-700/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="bg-[#af101a] text-white text-[10px] font-bold py-1 px-3 rounded-full uppercase tracking-wider shadow-sm font-mono">Unidade Industrial 01</span>
            <h2 className="font-['Hanken_Grotesk'] font-extrabold text-3xl md:text-4xl text-white tracking-tight mt-3">Ronda & Monitoramento SPCI</h2>
            <p className="text-slate-300 text-sm mt-1">Inspeções registradas e em conformidade periódica com as normas técnicas.</p>
          </div>
          <button 
            onClick={() => setScanModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-red-600 via-rose-500 to-red-700 text-white font-['Hanken_Grotesk'] font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-xl shadow-red-950/30 transform hover:scale-105 active:scale-95 cursor-pointer border-none"
          >
            📷 APONTAR SCAN CÂMERA
          </button>
        </div>
      </div>

      {/* Indicador de status de Conexão com o Supabase */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="font-['Hanken_Grotesk'] font-black text-emerald-900 uppercase tracking-widest text-xs">Banco de Dados Supabase Conectado</span>
        </div>
        <span className="text-emerald-700 text-[10px] font-mono font-bold bg-white px-3 py-1 rounded border border-emerald-100">Sessão Segura & Ativa</span>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-[#CFD8DC] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <span className="absolute top-4 right-4 text-3xl font-normal" aria-hidden="true">🛡️</span>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold block">Índice Conformidade</span>
            <h3 className="font-[#121c21] font-bold font-['Hanken_Grotesk'] text-4xl mt-1">{compliancePercentage}%</h3>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3" aria-hidden="true">
            <div className="bg-[#2E7D32] h-1.5 rounded-full" style={{ width: `${compliancePercentage}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CFD8DC] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <span className="absolute top-4 right-4 text-3xl font-normal" aria-hidden="true">⚠️</span>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold block">Alertas Críticos / Vencidos</span>
            <h3 className="font-[#121c21] font-bold font-['Hanken_Grotesk'] text-4xl mt-1 text-[#D32F2F]">{totalVencidos}</h3>
          </div>
          <p className="text-[10px] text-rose-600 font-mono mt-2 flex items-center gap-1">🛑 Requer manutenção imediata</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#CFD8DC] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <span className="absolute top-4 right-4 text-3xl font-normal" aria-hidden="true">🔧</span>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold block">Atenção / Manutenção</span>
            <h3 className="font-[#121c21] font-bold font-['Hanken_Grotesk'] text-4xl mt-1 text-[#F57C00]">{totalAtencao}</h3>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-2">🛠️ Em análise periódica</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#CFD8DC] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <span className="absolute top-4 right-4 text-3xl font-normal" aria-hidden="true">📋</span>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold block">Total Ativos Monitorados</span>
            <h3 className="font-[#121c21] font-bold font-['Hanken_Grotesk'] text-4xl mt-1">{totalAssets}</h3>
          </div>
          <p className="text-[10px] text-[#2E7D32] font-mono mt-2">🌱 Ativos homologados</p>
        </div>
      </div>

      {/* Mapa Térmico D3 de Zonas de Risco */}
      <D3SectorHeatmap data={sectorStats} />

      {/* Estatísticas por Setor e Logs Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Tabela de inspeções recentes */}
        <div className="lg:col-span-8 bg-white border border-[#CFD8DC] rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 mb-4 gap-4">
            <h3 className="font-['Hanken_Grotesk'] font-bold text-lg text-[#37474F] flex items-center gap-1.5">
              📋 Registros de Inspeção Recentes
            </h3>
            <div className="flex gap-2.5">
              <button 
                onClick={handleExportInspectionCSV} 
                className="bg-[#2E7D32] hover:bg-green-700 text-white font-['Hanken_Grotesk'] font-bold text-xs uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 border-none"
              >
                📥 Exportar CSV
              </button>
              <button 
                onClick={() => router.push('/ronda')} 
                className="bg-[#af101a] hover:bg-red-700 text-white font-['Hanken_Grotesk'] font-bold text-xs uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border-none"
              >
                📝 Iniciar Ronda
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-[#CFD8DC]">
                  <th className="p-3 font-semibold text-slate-600">Ativo</th>
                  <th className="p-3 font-semibold text-slate-600">Modelagem</th>
                  <th className="p-3 font-semibold text-slate-600">Laudo / Notas</th>
                  <th className="p-3 font-semibold text-slate-600">Data</th>
                  <th className="p-3 font-semibold text-slate-600">Status</th>
                  <th className="p-3 font-semibold text-slate-600 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {complianceLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400">Nenhum registro de ronda efetuado nesta sessão. Use a aba de Ronda de Campo.</td>
                  </tr>
                ) : (
                  complianceLogs.map((log, index) => (
                    <tr key={index} className="border-b transition-colors hover:bg-slate-50">
                      <td className="p-3 font-bold text-[#af101a] font-mono">{log.assetId}</td>
                      <td className="p-3 text-slate-800">{log.model}</td>
                      <td className="p-3 text-slate-500 italic">{log.notes}</td>
                      <td className="p-3 text-slate-600 font-mono">{log.date} {log.time}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'Conforme' || log.status === 'Operacional' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'}`}>
                          {log.status === 'Conforme' || log.status === 'Operacional' ? '🟢 OK' : '🛑 FALHA'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => {
                            const code = log.assetId;
                            const ext = extintores.find(x => x.idAtivo === code || x.id === code);
                            const hid = hidrantes.find(x => x.idAtivo === code || x.id === code);
                            const sin = sinalizacoes.find(x => x.idAtivo === code || x.id === code);
                            const lum = iluminacoes.find(x => x.idAtivo === code || x.id === code);
                            const asset = ext ? { ...ext, category: 'Extintor' } : hid ? { ...hid, category: 'Hidrante' } : sin ? { ...sin, category: 'Sinalização' } : lum ? { ...lum, category: 'Iluminação' } : null;
                            
                            if (asset) {
                              setSelectedAssetForHistory(asset);
                            } else {
                              setSelectedAssetForHistory({ 
                                id: code, 
                                idAtivo: code, 
                                model: log.model, 
                                location: 'Indefinido', 
                                subLocation: 'Log do Sistema', 
                                status: log.status 
                              });
                            }
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg font-['Hanken_Grotesk'] uppercase tracking-wider transition-all inline-flex items-center gap-1 cursor-pointer border-none"
                        >
                          📜 Linha Tempo
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Banner de Ronda Offline */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-tr from-[#253238] to-[#121c21] text-white p-6 rounded-2xl border border-[#CFD8DC]/20 shadow-xl relative overflow-hidden flex flex-col justify-between h-full space-y-4">
            <div>
              <div className="flex gap-2 mb-2 items-center">
                <span className="bg-[#af101a] text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">Extensão Campo</span>
                <span className="text-xs">📱 Link Rápido</span>
              </div>
              <h3 className="font-['Hanken_Grotesk'] font-bold text-lg text-white">QR Ronda de Campo</h3>
              <p className="text-[11px] text-slate-350 mt-1">Selecione um ativo para gerar o QR Code de vistoria e copiar o link de envio rápido.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Despachar Ativo para Campo:</label>
              <select
                value={selectedAssetId}
                onChange={(e) => {
                  setSelectedAssetId(e.target.value);
                  setCopiedLink(false);
                }}
                className="w-full bg-[#1c262c] text-white text-xs px-3 py-2.5 border border-slate-700 rounded-lg focus:outline-none focus:border-red-500 font-mono"
              >
                <option value="">-- Selecione o Ativo --</option>
                {assetsSelectOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl min-h-[170px] relative border border-slate-200 shadow-inner">
              {selectedAssetId ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getQrCodeUrl(selectedAssetId)}
                    alt="QR Code de Vistoria"
                    width={130}
                    height={130}
                    className="object-contain animate-fade-in"
                  />
                  <span className="text-[8px] text-slate-400 font-mono mt-2 uppercase tracking-wider font-bold">Aponte o celular do Técnico</span>
                </>
              ) : (
                <div className="text-center p-4">
                  <span className="text-4xl block mb-2 animate-pulse">📱</span>
                  <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block">Aguardando Seleção de Ativo</span>
                </div>
              )}
            </div>

            {selectedAssetId && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/inspecao/${selectedAssetId}`;
                    navigator.clipboard.writeText(link);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all font-mono cursor-pointer border-none active:scale-[0.98] ${
                    copiedLink ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {copiedLink ? 'Copiado! ✓' : 'Copiar Link'}
                </button>
                <button
                  onClick={() => {
                    router.push(`/inspecao/${selectedAssetId}`);
                  }}
                  className="py-2 px-3 bg-[#af101a] hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer border-none rounded-lg active:scale-[0.98]"
                  title="Abrir Inspeção"
                >
                  Abrir ↗
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
