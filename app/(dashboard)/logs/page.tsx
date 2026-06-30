'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { copyToClipboard } from '@/lib/utils';
import { 
  Download, 
  Share2, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  FileText,
  ChevronDown,
  Activity,
  ArrowUpDown,
  FileCheck,
  Lock,
  ArrowLeft
} from 'lucide-react';

export default function LogsAuditoriaPage() {
  const router = useRouter();
  const { auditLogs, triggerSuccessNotification, userProfile } = useSpci();

  // 1. RBAC - Acesso restrito ao cargo Desenvolvedor
  const isDesenvolvedor = userProfile?.role === 'Desenvolvedor';

  if (!isDesenvolvedor) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 select-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-6 text-center font-mono"
        >
          <div className="w-16 h-16 bg-red-950/40 border border-red-900/60 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest">
            Acesso Restrito
          </h2>
          <p className="text-[10px] text-slate-400 font-sans leading-relaxed mt-3 px-2">
            A visualização dos logs de auditoria do sistema é restrita exclusivamente ao perfil de <strong>Desenvolvedor SPCI</strong>.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 w-full py-3 bg-red-650 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none shadow-md flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // --- FILTER STATES ---
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterPatrimonio, setFilterPatrimonio] = useState<string>('');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  
  // Sort and pagination
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);

  // --- FILTER & SORT LOGS ---
  const filteredLogs = auditLogs
    .filter(log => {
      // 1. Action filter
      const matchesAction = filterAction === 'ALL' || log.acao === filterAction;
      
      // 2. User filter (search name or email)
      const termUser = filterUser.toLowerCase().trim();
      const matchesUser = !termUser || 
        (log.usuario_nome || '').toLowerCase().includes(termUser) ||
        (log.usuario_email || '').toLowerCase().includes(termUser);

      // 3. Patrimonio filter
      const termPat = filterPatrimonio.toLowerCase().trim();
      const matchesPat = !termPat || (log.patrimonio || '').toLowerCase().includes(termPat);

      // 4. Date filter
      let matchesDate = true;
      if (log.created_at) {
        const logDateStr = log.created_at.substring(0, 10); // YYYY-MM-DD
        if (filterDateStart && logDateStr < filterDateStart) matchesDate = false;
        if (filterDateEnd && logDateStr > filterDateEnd) matchesDate = false;
      }

      return matchesAction && matchesUser && matchesPat && matchesDate;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

  // --- PAGINATION ---
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- ACTION SELECT OPTIONS ---
  const actionOptions = [
    { value: 'ALL', label: 'Todas as Ações' },
    { value: 'LOGIN', label: '🔑 Acesso (Login)' },
    { value: 'LOGOUT', label: '🔒 Saída (Logout)' },
    { value: 'CADASTRO_ATIVO', label: '➕ Cadastro' },
    { value: 'EDICAO_ATIVO', label: '✏️ Edição' },
    { value: 'EXCLUSAO_ATIVO', label: '🗑️ Exclusão' },
    { value: 'INSPECAO', label: '📋 Inspeção/Laudo' }
  ];

  // --- HUD STATISTICS ---
  const getActionCount = (action: string) => {
    return auditLogs.filter(l => l.acao === action).length;
  };

  // --- EXPORT FUNCTIONS ---
  const handleExportExcel = () => {
    const dataToExport = filteredLogs.map(log => ({
      'Data/Hora': new Date(log.created_at).toLocaleString('pt-BR'),
      'Usuário': log.usuario_nome,
      'E-mail': log.usuario_email,
      'Ação': log.acao,
      'Tipo de Ativo': log.tipo_ativo || '---',
      'Patrimônio': log.patrimonio || '---',
      'Detalhes': log.detalhes || '---'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logs Auditoria');
    XLSX.writeFile(wb, `auditoria_logs_spci_${new Date().toISOString().substring(0, 10)}.xlsx`);
    
    setShowExportDropdown(false);
    triggerSuccessNotification('Planilha Baixada! 📊', 'Os logs de auditoria foram exportados para o formato Excel.');
  };

  const handleExportCSV = () => {
    const headers = ['Data/Hora', 'Usuário', 'E-mail', 'Ação', 'Tipo Ativo', 'Patrimônio', 'Detalhes'];
    const csvRows = [headers.join(';')];
    
    filteredLogs.forEach(log => {
      const row = [
        `"${new Date(log.created_at).toLocaleString('pt-BR')}"`,
        `"${log.usuario_nome}"`,
        `"${log.usuario_email}"`,
        `"${log.acao}"`,
        `"${log.tipo_ativo || '---'}"`,
        `"${log.patrimonio || '---'}"`,
        `"${(log.detalhes || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(';'));
    });
    
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_logs_spci_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportDropdown(false);
    triggerSuccessNotification('CSV Exportado! 📋', 'Os logs de auditoria foram exportados para o formato CSV.');
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_logs_spci_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportDropdown(false);
    triggerSuccessNotification('JSON Exportado! 💻', 'Os logs de auditoria foram salvos em arquivo JSON.');
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>SPCI - Relatório de Auditoria de Logs</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 20px; margin-bottom: 5px; color: #af101a; }
            p { font-size: 11px; margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            th { background: #f4f6f8; border-bottom: 2px solid #ccc; padding: 8px; text-align: left; font-weight: bold; }
            td { border-bottom: 1px solid #eee; padding: 8px; vertical-align: top; }
            .badge { font-weight: bold; text-transform: uppercase; font-size: 8px; padding: 2px 4px; border-radius: 3px; }
            .badge-login { background: #e8f5e9; color: #2e7d32; }
            .badge-logout { background: #ffe0b2; color: #e65100; }
            .badge-cadastro { background: #e3f2fd; color: #1565c0; }
            .badge-edicao { background: #e0f2f1; color: #00695c; }
            .badge-exclusao { background: #ffebee; color: #c62828; }
            .badge-inspeção { background: #f3e5f5; color: #6a1b9a; }
          </style>
        </head>
        <body>
          <h1>SPCI - SISTEMA DE PREVENÇÃO E COMBATE A INCÊNDIO</h1>
          <p>Relatório de Auditoria de Logs do Sistema | Gerado em ${new Date().toLocaleString('pt-BR')}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Data/Hora</th>
                <th style="width: 20%;">Usuário</th>
                <th style="width: 15%;">Ação</th>
                <th style="width: 12%;">Ativo</th>
                <th style="width: 12%;">Patrimônio</th>
                <th style="width: 26%;">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs.map(log => `
                <tr>
                  <td>${new Date(log.created_at).toLocaleString('pt-BR')}</td>
                  <td><b>${log.usuario_nome}</b><br/>${log.usuario_email}</td>
                  <td><span class="badge badge-${(log.acao || 'default').toLowerCase().replace('_ativo', '')}">${log.acao}</span></td>
                  <td>${log.tipo_ativo || '---'}</td>
                  <td><b>${log.patrimonio || '---'}</b></td>
                  <td>${log.detalhes || '---'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    setShowExportDropdown(false);
  };

  const handleShareLogs = async () => {
    const shareText = `SPCI Relatório de Auditoria de Logs\nTotal de registros filtrados: ${filteredLogs.length}\nGerado em: ${new Date().toLocaleString('pt-BR')}\nConsulte o console corporativo do SPCI.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Logs de Auditoria SPCI',
          text: shareText,
          url: window.location.href
        });
        triggerSuccessNotification('Dados Compartilhados! ✈️', 'O resumo foi enviado via Web Share API.');
      } catch (err) {
        copyToClipboard(shareText)
          .then(() => {
            triggerSuccessNotification('Texto Copiado! 📋', 'Dados do log formatados para compartilhamento.');
          })
          .catch((e) => console.error('Erro ao copiar:', e));
      }
    } else {
      copyToClipboard(shareText)
        .then(() => {
          triggerSuccessNotification('Texto Copiado! 📋', 'Dados do log formatados para compartilhamento.');
        })
        .catch((e) => console.error('Erro ao copiar:', e));
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 select-none">
      {/* Banner Principal HUD */}
      <div className="bg-gradient-to-r from-[#1e293b] via-[#1c252a] to-[#0f172a] text-white p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-red-700/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>
        <div className="relative z-10">
          <span className="bg-slate-700 text-white text-[10px] font-bold py-1 px-3 rounded-full uppercase tracking-wider shadow-sm font-mono">Governança & Compliance</span>
          <h2 className="font-['Hanken_Grotesk'] font-extrabold text-3xl md:text-4xl text-white tracking-tight mt-3">Logs e Auditoria de Acesso</h2>
          <p className="text-slate-300 text-sm mt-1">
            Rastreamento ininterrupto de operações, vistorias de NBR, acessos e alterações críticas de infraestrutura de combate a incêndio.
          </p>
        </div>
      </div>

      {/* Estatísticas Rápidas HUD */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Registros Totais</span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">{auditLogs.length}</span>
          <Activity className="absolute right-3 bottom-3 w-8 h-8 text-slate-100" />
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Vistorias efetuadas</span>
          <span className="text-2xl font-black text-slate-850 mt-1 block">{getActionCount('INSPECAO')}</span>
          <FileCheck className="absolute right-3 bottom-3 w-8 h-8 text-slate-100" />
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Cadastros</span>
          <span className="text-2xl font-black text-slate-850 mt-1 block">{getActionCount('CADASTRO_ATIVO')}</span>
          <span className="absolute right-3 bottom-3 text-2xl opacity-10">➕</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Edições realizadas</span>
          <span className="text-2xl font-black text-slate-850 mt-1 block">{getActionCount('EDICAO_ATIVO')}</span>
          <span className="absolute right-3 bottom-3 text-2xl opacity-10">✏️</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Acessos (Logins)</span>
          <span className="text-2xl font-black text-slate-850 mt-1 block">{getActionCount('LOGIN')}</span>
          <span className="absolute right-3 bottom-3 text-2xl opacity-10">🔑</span>
        </div>
      </div>

      {/* Painel de Filtros e Ferramentas */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 relative">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-800 rounded-t-2xl" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" /> Filtros Avançados de Busca
          </h3>

          <div className="flex gap-2.5 w-full lg:w-auto font-sans relative">
            {/* Export Dropdown */}
            <div className="relative flex-1 lg:flex-none">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="w-full lg:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border-none shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Dados <ChevronDown className="w-3 h-3" />
              </button>

              <AnimatePresence>
                {showExportDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl w-48 overflow-hidden z-35"
                  >
                    <button onClick={handleExportExcel} className="w-full text-left px-4 py-3 text-xs hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2 border-none bg-transparent cursor-pointer">
                      📊 Formato Excel (.xlsx)
                    </button>
                    <button onClick={handleExportCSV} className="w-full text-left px-4 py-3 text-xs hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2 border-none bg-transparent cursor-pointer">
                      📝 Formato CSV (.csv)
                    </button>
                    <button onClick={handleExportPDF} className="w-full text-left px-4 py-3 text-xs hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2 border-none bg-transparent cursor-pointer">
                      📕 Formato PDF / Impressão
                    </button>
                    <button onClick={handleExportJSON} className="w-full text-left px-4 py-3 text-xs hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2 border-none bg-transparent cursor-pointer">
                      💻 Formato JSON (.json)
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleShareLogs}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-755 border border-slate-200 font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-95 shadow-xs"
              title="Compartilhar Relatório"
            >
              <Share2 className="w-3.5 h-3.5" /> Compartilhar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Ação */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase text-slate-450 tracking-wider block">Categoria de Ação</label>
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#f8fafc] text-slate-800 text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 font-sans cursor-pointer"
            >
              {actionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Usuário */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase text-slate-450 tracking-wider block">Buscar por Técnico</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={filterUser}
                onChange={(e) => { setFilterUser(e.target.value); setCurrentPage(1); }}
                placeholder="Nome ou e-mail..."
                className="pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-[#f8fafc] focus:outline-none focus:border-slate-500 w-full font-sans"
              />
            </div>
          </div>

          {/* Patrimônio */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase text-slate-450 tracking-wider block">Buscar Patrimônio</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={filterPatrimonio}
                onChange={(e) => { setFilterPatrimonio(e.target.value); setCurrentPage(1); }}
                placeholder="Ex: EXT-101..."
                className="pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-[#f8fafc] focus:outline-none focus:border-slate-500 w-full font-mono"
              />
            </div>
          </div>

          {/* Data Início */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase text-slate-450 tracking-wider block">Data Inicial</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={filterDateStart}
                onChange={(e) => { setFilterDateStart(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-[#f8fafc] focus:outline-none focus:border-slate-500 w-full font-sans cursor-pointer"
              />
            </div>
          </div>

          {/* Data Fim */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase text-slate-450 tracking-wider block">Data Final</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={filterDateEnd}
                onChange={(e) => { setFilterDateEnd(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-[#f8fafc] focus:outline-none focus:border-slate-500 w-full font-sans cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th 
                  onClick={() => setSortAsc(!sortAsc)}
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors w-40 select-none"
                >
                  <span className="flex items-center gap-1.5">
                    Data / Hora <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th className="p-4">Usuário</th>
                <th className="p-4">Ação</th>
                <th className="p-4">Ativo</th>
                <th className="p-4">Patrimônio</th>
                <th className="p-4">Detalhes descritivos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold font-sans">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="p-4 font-mono text-slate-550 leading-tight">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-[10px] uppercase border border-slate-200 shrink-0">
                          {log.usuario_nome?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 truncate max-w-[130px]" title={log.usuario_nome}>{log.usuario_nome}</p>
                          <p className="text-[9px] text-slate-400 truncate max-w-[130px]" title={log.usuario_email}>{log.usuario_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border ${
                        log.acao === 'LOGIN' 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                          : log.acao === 'LOGOUT'
                            ? 'text-amber-700 bg-amber-50 border-amber-100'
                            : log.acao === 'CADASTRO_ATIVO'
                              ? 'text-blue-700 bg-blue-50 border-blue-100'
                              : log.acao === 'EDICAO_ATIVO'
                                ? 'text-teal-700 bg-teal-50 border-teal-100'
                                : log.acao === 'EXCLUSAO_ATIVO'
                                  ? 'text-rose-700 bg-rose-50 border-rose-100'
                                  : 'text-purple-750 bg-purple-50 border-purple-100' // Purple fallback handles NBR inspections
                      }`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      {log.tipo_ativo || '---'}
                    </td>
                    <td className="p-4 font-mono font-bold text-[#af101a]">
                      {log.patrimonio || '---'}
                    </td>
                    <td className="p-4 text-slate-550 italic leading-relaxed max-w-xs truncate" title={log.detalhes}>
                      {log.detalhes || '---'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between font-sans">
            <span className="text-[10px] text-slate-500 font-bold uppercase">
              Página {currentPage} de {totalPages} ({filteredLogs.length} registros no total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-650 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-650 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
