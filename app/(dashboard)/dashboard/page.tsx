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
    ...bombas.map(x => ({ id: x.code || x.idAtivo || x.id, label: `⛽ Bomba - ${x.code || x.idAtivo || x.id} (${x.name || 'Bomba'})` }))
  ];

  const getQrCodeUrl = (assetId: string) => {
    if (typeof window === 'undefined') return '';
    const link = `${window.location.origin}/inspecao/${assetId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=dc2626&data=${encodeURIComponent(link)}`;
  };


  // --- COMPLIANCE KPI CALCULATORS ---
  const totalAssets = extintores.length + hidrantes.length + sinalizacoes.length + iluminacoes.length + bombas.length;
  const totalVencidos = 
    extintores.filter(x => x.status === 'Vencido').length + 
    hidrantes.filter(x => x.status === 'Vencido').length +
    sinalizacoes.filter(x => x.status === 'Faltante').length +
    iluminacoes.filter(x => x.status === 'Falha Carga').length +
    bombas.filter(x => x.status === 'Manutenção Req.').length;

  const totalAtencao =
    extintores.filter(x => x.status === 'Em Manutenção').length +
    hidrantes.filter(x => x.status === 'Em Manutenção').length +
    sinalizacoes.filter(x => x.status === 'Não Conforme').length +
    iluminacoes.filter(x => x.status === 'Atenção').length +
    bombas.filter(x => x.status === 'Standby' || x.status === 'Atenção' || x.status === 'Nível Óleo Baixo').length;

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
    if (l.includes('PRODUÇÃO') || l.includes('SETOR C') || l.includes('CASA DE MÁQUINAS') || l.includes('CASA DE BOMBAS') || l.includes('BOMBA')) return 'PRODUÇÃO';
    if (l.includes('PÁTIO') || l.includes('PATIO') || l.includes('EXTERNA') || l.includes('LOGÍSTICA') || l.includes('LOGISTICA') || l.includes('SETOR B')) return 'LOGÍSTICA';
    return 'OUTROS';
  };

  const allAssets = [
    ...extintores.map(x => ({ ...x, category: 'Extintor' })),
    ...hidrantes.map(x => ({ ...x, category: 'Hidrante' })),
    ...sinalizacoes.map(x => ({ ...x, category: 'Sinalização' })),
    ...iluminacoes.map(x => ({ ...x, category: 'Iluminação' })),
    ...bombas.map(x => ({ ...x, category: 'Bomba', idAtivo: x.code || x.idAtivo || x.id, location: x.location || 'Casa de Bombas' }))
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

      {/* ═══ LINHA 1: KPIs de CONFORMIDADE DE ATIVOS (Melhorados) ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]"
        >
          <span className="absolute top-4 right-4 text-3xl font-normal opacity-80" aria-hidden="true">🛡️</span>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold block">Índice Conformidade</span>
            <h3 className="font-['Hanken_Grotesk'] font-extrabold text-4xl text-slate-900 mt-1">{compliancePercentage}%</h3>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden" aria-hidden="true">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${compliancePercentage}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
              className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => router.push('/alertas-criticos')}
          className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] cursor-pointer hover:shadow-md hover:border-rose-450 hover:bg-rose-50/20 transition-all duration-300"
        >
          <span className="absolute top-4 right-4 text-3xl font-normal opacity-80" aria-hidden="true">⚠️</span>
          {totalVencidos > 0 && <span className="absolute top-3 left-3 w-2 h-2 bg-rose-500 rounded-full animate-ping" />}
          <div>
            <span className="text-[10px] text-rose-500 uppercase tracking-widest font-extrabold block">Alertas Críticos / Vencidos</span>
            <h3 className="font-['Hanken_Grotesk'] font-extrabold text-4xl mt-1 text-rose-600">{totalVencidos}</h3>
          </div>
          <p className="text-[10px] text-rose-600 font-mono mt-2 flex items-center gap-1">🛑 Requer manutenção imediata (Clique para tratar)</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]"
        >
          <span className="absolute top-4 right-4 text-3xl font-normal opacity-80" aria-hidden="true">🔧</span>
          <div>
            <span className="text-[10px] text-amber-600 uppercase tracking-widest font-extrabold block">Atenção / Manutenção</span>
            <h3 className="font-['Hanken_Grotesk'] font-extrabold text-4xl mt-1 text-amber-600">{totalAtencao}</h3>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-2">🛠️ Em análise periódica</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]"
        >
          <span className="absolute top-4 right-4 text-3xl font-normal opacity-80" aria-hidden="true">📋</span>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold block">Total Ativos Monitorados</span>
            <h3 className="font-['Hanken_Grotesk'] font-extrabold text-4xl text-slate-900 mt-1">{totalAssets}</h3>
          </div>
          <p className="text-[10px] text-[#2E7D32] font-mono mt-2">🌱 Ativos homologados</p>
        </motion.div>
      </div>

      {/* ═══ LINHA 2: KPIs de INSPEÇÕES REALIZADAS ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 rounded-t-2xl" />

        <h3 className="font-['Hanken_Grotesk'] font-bold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          📊 Indicadores de Inspeções Realizadas
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Inspeções */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/40 rounded-xl border border-blue-200 relative overflow-hidden">
            <span className="text-[9px] text-blue-600 uppercase tracking-widest font-extrabold block">Total Realizadas</span>
            <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-blue-700 mt-1">{complianceLogs.length}</h3>
            <span className="absolute right-3 bottom-3 text-blue-200 text-2xl">📋</span>
          </div>

          {/* Conformes */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/40 rounded-xl border border-emerald-200 relative overflow-hidden">
            <span className="text-[9px] text-emerald-600 uppercase tracking-widest font-extrabold block">Conformes</span>
            <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-emerald-700 mt-1">
              {complianceLogs.filter(l => l.status === 'Conforme' || l.status === 'Operacional').length}
            </h3>
            <span className="absolute right-3 bottom-3 text-emerald-200 text-2xl">✅</span>
          </div>

          {/* Não Conformes */}
          <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100/40 rounded-xl border border-rose-200 relative overflow-hidden">
            <span className="text-[9px] text-rose-600 uppercase tracking-widest font-extrabold block">Não Conformes</span>
            <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-rose-700 mt-1">
              {complianceLogs.filter(l => l.status !== 'Conforme' && l.status !== 'Operacional').length}
            </h3>
            <span className="absolute right-3 bottom-3 text-rose-200 text-2xl">❌</span>
          </div>

          {/* Pendentes (ativos sem inspeção recente) */}
          <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/40 rounded-xl border border-amber-200 relative overflow-hidden">
            <span className="text-[9px] text-amber-600 uppercase tracking-widest font-extrabold block">Pendentes</span>
            <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-amber-700 mt-1">
              {(() => {
                const inspectedIds = new Set(complianceLogs.map((l: any) => l.assetId));
                const allIds = [
                  ...extintores.map(x => x.idAtivo || x.id),
                  ...hidrantes.map(x => x.idAtivo || x.id),
                  ...sinalizacoes.map(x => x.idAtivo || x.id),
                  ...iluminacoes.map(x => x.idAtivo || x.id),
                ];
                return allIds.filter(id => !inspectedIds.has(id)).length;
              })()}
            </h3>
            <span className="absolute right-3 bottom-3 text-amber-200 text-2xl">⏳</span>
          </div>

          {/* Mini Gráfico de Barras - Inspeções por dia (últimos 7 dias) */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-xl border border-slate-200 relative overflow-hidden col-span-2 lg:col-span-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold block mb-2">Últimos 7 dias</span>
            <div className="flex items-end gap-1 h-12">
              {(() => {
                const today = new Date();
                const days: { label: string; count: number }[] = [];
                for (let i = 6; i >= 0; i--) {
                  const d = new Date(today);
                  d.setDate(d.getDate() - i);
                  const dateStr = d.toISOString().split('T')[0];
                  const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3);
                  const count = complianceLogs.filter((l: any) => (l.date || '').startsWith(dateStr)).length;
                  days.push({ label: dayLabel, count });
                }
                const maxCount = Math.max(...days.map(d => d.count), 1);
                return days.map((day, i) => (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(day.count / maxCount) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                      className={`w-full rounded-t-sm min-h-[2px] ${day.count > 0 ? 'bg-blue-500' : 'bg-slate-200'}`}
                    />
                    <span className="text-[6px] text-slate-400 mt-0.5 uppercase font-bold">{day.label}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </motion.div>

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
