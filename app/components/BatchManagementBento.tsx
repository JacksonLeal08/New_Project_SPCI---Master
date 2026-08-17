'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Boxes,
  Truck,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Check
} from 'lucide-react';
import {
  LoteManutencaoRecord,
  getMaintenanceBatchesAction,
  getMaintenanceBatchDetailAction
} from '@/app/actions/maintenanceBatchActions';
import { generateBatchRomaneioPDF, exportBatchRomaneioXLSX } from '@/lib/maintenanceBatchReports';
import BatchTriageModal from './BatchTriageModal';

interface BatchManagementBentoProps {
  currentUserName: string;
  currentUserEmail?: string;
  onRefreshParent?: () => void;
}

export default function BatchManagementBento({
  currentUserName,
  currentUserEmail,
  onRefreshParent,
}: BatchManagementBentoProps) {
  const [lotes, setLotes] = useState<LoteManutencaoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'EM_ANDAMENTO' | 'FINALIZADO'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoteForTriage, setSelectedLoteForTriage] = useState<string | null>(null);

  const fetchLotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getMaintenanceBatchesAction(statusFilter);
      if (res.success && res.lotes) {
        setLotes(res.lotes);
      }
    } catch (err) {
      console.error('Erro ao buscar lotes:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  const handleDownloadPDF = async (lote: LoteManutencaoRecord) => {
    try {
      const res = await getMaintenanceBatchDetailAction(lote.id);
      if (res.success && res.itens) {
        generateBatchRomaneioPDF(lote, res.itens);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadXLSX = async (lote: LoteManutencaoRecord) => {
    try {
      const res = await getMaintenanceBatchDetailAction(lote.id);
      if (res.success && res.itens) {
        exportBatchRomaneioXLSX(lote, res.itens);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredLotes = lotes.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.numero_lote.toLowerCase().includes(term) ||
      l.fornecedor_nome.toLowerCase().includes(term) ||
      (l.observacoes && l.observacoes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-5 font-mono select-none text-xs">
      
      {/* Barra de Filtros & Busca */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('TODOS')}
            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer border-none ${
              statusFilter === 'TODOS'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Todos ({lotes.length})
          </button>
          <button
            onClick={() => setStatusFilter('EM_ANDAMENTO')}
            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer border-none ${
              statusFilter === 'EM_ANDAMENTO'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Em Andamento ({lotes.filter((l) => l.status === 'EM_ANDAMENTO').length})
          </button>
          <button
            onClick={() => setStatusFilter('FINALIZADO')}
            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer border-none ${
              statusFilter === 'FINALIZADO'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Concluídos ({lotes.filter((l) => l.status === 'FINALIZADO').length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Buscar por lote ou prestador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] focus:outline-none focus:border-red-600 font-sans"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            onClick={fetchLotes}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer border-none shadow-xs"
            title="Atualizar Lotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid Bento de Lotes */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[11px] font-bold uppercase tracking-wider">Carregando Lotes de Manutenção...</p>
        </div>
      ) : filteredLotes.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase">
            Nenhum Lote de Manutenção Localizado
          </h3>
          <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto leading-relaxed">
            Selecione extintores no <strong>Estoque Manutenção</strong> para gerar um novo Lote de Envio com romaneio assinado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLotes.map((lote) => {
            const isFinished = lote.status === 'FINALIZADO';
            const totalItens = lote.total_itens || 0;
            const aprovados = lote.total_aprovados || 0;
            const condenados = lote.total_condenados || 0;
            const pendentes = Math.max(0, totalItens - (aprovados + condenados));

            return (
              <motion.div
                key={lote.id}
                whileHover={{ y: -3 }}
                className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                  isFinished
                    ? 'border-emerald-200 dark:border-emerald-950/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Topo do Card Bento */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-xs tracking-wider">
                      {lote.numero_lote}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isFinished
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {isFinished ? 'Concluído' : 'No Prestador'}
                    </span>
                  </div>

                  {/* Informações da Empresa */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-[11px] font-sans">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{lote.fornecedor_nome}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-sans">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Envio: {new Date(lote.data_envio).toLocaleDateString('pt-BR')}
                      </span>
                      {!isFinished && (
                        <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                          <Clock className="w-3 h-3" />
                          {lote.dias_em_manutencao} dias no prestador
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progresso da Triagem */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500 font-bold">Total: {totalItens} Extintores</span>
                      <span className="text-slate-400">
                        {isFinished ? (
                          <strong className="text-emerald-600">100% Conferido</strong>
                        ) : (
                          `${aprovados + condenados}/${totalItens} Triados`
                        )}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                      <div
                        style={{ width: `${(aprovados / (totalItens || 1)) * 100}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`${aprovados} Aprovados`}
                      />
                      <div
                        style={{ width: `${(condenados / (totalItens || 1)) * 100}%` }}
                        className="bg-rose-500 h-full transition-all"
                        title={`${condenados} Condenados`}
                      />
                      <div
                        style={{ width: `${(pendentes / (totalItens || 1)) * 100}%` }}
                        className="bg-amber-400 h-full transition-all"
                        title={`${pendentes} Pendentes`}
                      />
                    </div>

                    {isFinished && (
                      <div className="flex items-center gap-2 pt-1 text-[9px] text-slate-500">
                        <span className="text-emerald-600 font-bold">✓ {aprovados} Aprovados</span>
                        {condenados > 0 && <span className="text-rose-600 font-bold">✕ {condenados} Condenados</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações do Card Bento */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  {!isFinished ? (
                    <button
                      type="button"
                      onClick={() => setSelectedLoteForTriage(lote.id)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer border-none active:scale-95"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Conferência de Retorno</span>
                    </button>
                  ) : (
                    <div className="py-1 text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Lote 100% Triado & Finalizado</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadPDF(lote)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border-none"
                    >
                      <FileText className="w-3 h-3 text-red-600" />
                      <span>Romaneio PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadXLSX(lote)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border-none"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                      <span>Excel (.XLSX)</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de Triagem Ativa */}
      {selectedLoteForTriage && (
        <BatchTriageModal
          isOpen={Boolean(selectedLoteForTriage)}
          onClose={() => setSelectedLoteForTriage(null)}
          loteId={selectedLoteForTriage}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          onTriageSuccess={() => {
            fetchLotes();
            if (onRefreshParent) onRefreshParent();
          }}
        />
      )}
    </div>
  );
}
