'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  RefreshCw,
  Package,
  Layers,
  ArrowRightLeft,
  History,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  ShieldCheck,
  Check
} from 'lucide-react';
import {
  getAssetStockItemsAction,
  saveSingleAssetStockAction,
  moveAssetStatusAction,
  getAssetMovementsHistoryAction,
  AssetStockItemRecord,
  AssetMovementRecord,
  StatusEstoqueType
} from '@/app/actions/assetStockActions';
import { exportStockItemsToCSV } from '@/lib/excelStockUtils';
import { GestaoAtivosImportModal } from './GestaoAtivosImportModal';
import { idb } from '@/lib/indexedDb';

interface GestaoAtivosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GestaoAtivosModal: React.FC<GestaoAtivosModalProps> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<AssetStockItemRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'Todos' | StatusEstoqueType>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modais Secundários
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Modal Mover Status
  const [movingItem, setMovingItem] = useState<AssetStockItemRecord | null>(null);
  const [newStatus, setNewStatus] = useState<StatusEstoqueType>('ESTOQUE APLICAÇÃO');
  const [motivoMovimentacao, setMotivoMovimentacao] = useState<string>('');
  const [isMoving, setIsMoving] = useState<boolean>(false);

  // Modal Histórico
  const [historyItem, setHistoryItem] = useState<AssetStockItemRecord | null>(null);
  const [historyLogs, setHistoryLogs] = useState<AssetMovementRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Modal Cadastro / Edição Individual
  const [editingItem, setEditingItem] = useState<Partial<AssetStockItemRecord> | null>(null);
  const [isSavingItem, setIsSavingItem] = useState<boolean>(false);

  // Pop-up HUD Informativo
  const [hudAlert, setHudAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Carrega ativos do Supabase e IndexedDB ao abrir
  const loadAssets = async () => {
    setLoading(true);
    try {
      // 1. Carrega localmente do IndexedDB para velocidade total
      try {
        const localItems = await idb.getAll('extintores');
        if (localItems && localItems.length > 0) {
          const mappedLocal: AssetStockItemRecord[] = localItems.map((row: any) => ({
            id: row.id,
            id_ativo: row.idAtivo || row.id,
            category: row.category || 'extintores',
            model: row.model || 'Padrão',
            location: row.location || 'Almoxarifado',
            sub_location: row.subLocation || 'Estoque',
            status: row.status || 'Conforme',
            status_estoque: (row.status_estoque as StatusEstoqueType) || 'ESTOQUE APLICAÇÃO',
            numero_serie: row.details?.serialNumber || row.numero_serie || '',
            patrimonio: row.patrimonio || row.idAtivo || row.id,
            created_at: row.createdAt || new Date().toISOString()
          }));
          setItems(mappedLocal);
        }
      } catch (idbErr) {
        console.warn('[GestaoAtivosModal] Aviso ao carregar IndexedDB:', idbErr);
      }

      // 2. Busca do Supabase
      const res = await getAssetStockItemsAction();
      if (res.success && res.assets && res.assets.length > 0) {
        setItems(res.assets);
      }
    } catch (err: any) {
      console.error('[GestaoAtivosModal] Erro ao carregar estoque:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAssets();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // KPIs de contagem de estoque
  const countAplicacao = items.filter((x) => x.status_estoque === 'ESTOQUE APLICAÇÃO').length;
  const countEstManutencao = items.filter((x) => x.status_estoque === 'ESTOQUE MANUTENÇÃO').length;
  const countEmManutencao = items.filter((x) => x.status_estoque === 'EM MANUTENÇÃO').length;
  const countCondenados = items.filter((x) => x.status_estoque === 'CONDENADOS').length;

  // Filtragem
  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === 'Todos' || item.status_estoque === activeTab;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (item.patrimonio || '').toLowerCase().includes(term) ||
      (item.id_ativo || '').toLowerCase().includes(term) ||
      (item.numero_serie || '').toLowerCase().includes(term) ||
      (item.model || '').toLowerCase().includes(term) ||
      (item.category || '').toLowerCase().includes(term);
    return matchesTab && matchesSearch;
  });

  // Executa a movimentação de status do ativo
  const handleConfirmMoveStatus = async () => {
    if (!movingItem) return;
    setIsMoving(true);
    try {
      const res = await moveAssetStatusAction(
        movingItem.id,
        movingItem.id_ativo,
        newStatus,
        movingItem.status_estoque,
        motivoMovimentacao || 'Movimentação via painel Gestão Ativo'
      );

      if (res.success) {
        // Atualiza localmente no estado e no IndexedDB
        const updated = items.map((it) =>
          it.id === movingItem.id ? { ...it, status_estoque: newStatus } : it
        );
        setItems(updated);
        try {
          await idb.set('extintores', movingItem.id, { ...movingItem, status_estoque: newStatus });
        } catch (e) {}

        setHudAlert({
          isOpen: true,
          title: 'MOVIMENTAÇÃO REGISTRADA! 🟢',
          message: `Ativo "${movingItem.patrimonio || movingItem.id_ativo}" movido para "${newStatus}" com sucesso.`,
          type: 'success'
        });
        setMovingItem(null);
        setMotivoMovimentacao('');
      } else {
        setHudAlert({
          isOpen: true,
          title: 'FALHA NA MOVIMENTAÇÃO ⚠️',
          message: res.error || 'Não foi possível alterar o status do ativo.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setHudAlert({
        isOpen: true,
        title: 'ERRO NA OPERAÇÃO ⚠️',
        message: err.message || err,
        type: 'error'
      });
    } finally {
      setIsMoving(false);
    }
  };

  // Abre histórico de auditoria
  const handleOpenHistory = async (item: AssetStockItemRecord) => {
    setHistoryItem(item);
    setLoadingHistory(true);
    setHistoryLogs([]);
    try {
      const res = await getAssetMovementsHistoryAction(item.id);
      if (res.success && res.history) {
        setHistoryLogs(res.history);
      }
    } catch (err) {
      console.warn('[handleOpenHistory] Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Salva ativo individual (Novo ou Edição)
  const handleSaveSingleAsset = async () => {
    if (!editingItem) return;
    setIsSavingItem(true);
    try {
      const res = await saveSingleAssetStockAction(editingItem);
      if (res.success) {
        await loadAssets();
        setEditingItem(null);
        setHudAlert({
          isOpen: true,
          title: 'ATIVO GRAVADO! 🟢',
          message: 'O equipamento foi salvo com sucesso no banco de dados.',
          type: 'success'
        });
      } else {
        setHudAlert({
          isOpen: true,
          title: 'ERRO AO SALVAR ⚠️',
          message: res.error || 'Falha ao salvar ativo.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setHudAlert({
        isOpen: true,
        title: 'ERRO AO SALVAR ⚠️',
        message: err.message || err,
        type: 'error'
      });
    } finally {
      setIsSavingItem(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-6xl bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900"
      >
        {/* CABEÇALHO DO MODAL - TEMA CLARO SPCI RED */}
        <div className="bg-red-700 text-white p-4 sm:p-5 flex items-center justify-between border-b border-red-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white font-['Hanken_Grotesk']">
                GESTÃO DE ATIVOS & ESTOQUE OPERACIONAL - SPCI MASTER
              </h2>
              <p className="text-[11px] text-red-100 font-sans mt-0.5 font-bold">
                Controle de movimentações, auditoria e rastreabilidade por status de equipamento
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block px-3 py-1 bg-white/10 rounded-lg text-xs font-bold border border-white/20">
              Total: {items.length} Ativos
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer font-bold border border-white/20"
              title="Fechar Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BENTO GRID DE CARDS KPI (OS 4 STATUS DE ESTOQUE) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
          <div
            onClick={() => setActiveTab('ESTOQUE APLICAÇÃO')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'ESTOQUE APLICAÇÃO'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/30'
                : 'bg-white text-slate-900 border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between font-mono font-bold uppercase text-[10px] tracking-wider">
              <span>🟢 Est. Aplicação</span>
              <Package className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-xl font-black font-mono mt-1">{countAplicacao}</div>
            <p className="text-[10px] opacity-80 font-medium">Prontos para instalação</p>
          </div>

          <div
            onClick={() => setActiveTab('ESTOQUE MANUTENÇÃO')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'ESTOQUE MANUTENÇÃO'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400/30'
                : 'bg-white text-slate-900 border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between font-mono font-bold uppercase text-[10px] tracking-wider">
              <span>🟡 Est. Manutenção</span>
              <Layers className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-xl font-black font-mono mt-1">{countEstManutencao}</div>
            <p className="text-[10px] opacity-80 font-medium">Aguardando triagem/reparo</p>
          </div>

          <div
            onClick={() => setActiveTab('EM MANUTENÇÃO')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'EM MANUTENÇÃO'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400/30'
                : 'bg-white text-slate-900 border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between font-mono font-bold uppercase text-[10px] tracking-wider">
              <span>🔵 Em Manutenção</span>
              <RefreshCw className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-xl font-black font-mono mt-1">{countEmManutencao}</div>
            <p className="text-[10px] opacity-80 font-medium">Em conserto ativo</p>
          </div>

          <div
            onClick={() => setActiveTab('CONDENADOS')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'CONDENADOS'
                ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400/30'
                : 'bg-white text-slate-900 border-slate-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between font-mono font-bold uppercase text-[10px] tracking-wider">
              <span>🔴 Condenados</span>
              <AlertTriangle className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-xl font-black font-mono mt-1">{countCondenados}</div>
            <p className="text-[10px] opacity-80 font-medium">Baixa/Descarte definitivo</p>
          </div>
        </div>

        {/* BARRA DE AÇÕES SUPERIORES */}
        <div className="bg-white border-b border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={() =>
                setEditingItem({
                  status_estoque: 'ESTOQUE APLICAÇÃO',
                  category: 'extintores',
                  status: 'Conforme'
                })
              }
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-mono font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-none active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo Ativo</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-none active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <span>📥 Importar XLSX</span>
            </button>

            <button
              onClick={() => exportStockItemsToCSV(filteredItems)}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-mono font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>📊 Exportar XLSX</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Série, Patrimônio, Modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 pl-8 pr-3 py-2 rounded-xl text-xs font-sans text-slate-900 font-bold focus:outline-none focus:border-red-600 shadow-xs"
            />
          </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS (TABS POR STATUS - SEM CORTES VERTICAIS) */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 pt-3 pb-2 flex items-center gap-2 overflow-x-auto shrink-0 font-mono text-xs">
          {[
            { id: 'Todos', label: `Todos (${items.length})` },
            { id: 'ESTOQUE APLICAÇÃO', label: `🟢 Aplicação (${countAplicacao})` },
            { id: 'ESTOQUE MANUTENÇÃO', label: `🟡 Est. Manutenção (${countEstManutencao})` },
            { id: 'EM MANUTENÇÃO', label: `🔵 Em Manutenção (${countEmManutencao})` },
            { id: 'CONDENADOS', label: `🔴 Condenados (${countCondenados})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl font-bold transition-all border cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 border-slate-300 shadow-sm font-black ring-1 ring-slate-300/50'
                  : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TABELA PRINCIPAL (GRID DE ATIVOS - TEMA CLARO) */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Patrimônio / Cód</th>
                  <th className="py-3 px-4">Tipo do Ativo</th>
                  <th className="py-3 px-4">Nº de Série</th>
                  <th className="py-3 px-4">Status Estoque</th>
                  <th className="py-3 px-4">Local / Setor</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-xs text-slate-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                      Carregando estoque de ativos...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                      Nenhum ativo encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {it.patrimonio || it.id_ativo || it.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 capitalize">
                        {it.category} ({it.model || 'Padrão'})
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {it.numero_serie || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                            it.status_estoque === 'ESTOQUE APLICAÇÃO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : it.status_estoque === 'ESTOQUE MANUTENÇÃO'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : it.status_estoque === 'EM MANUTENÇÃO'
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                              : 'bg-red-100 text-red-900 border border-red-300'
                          }`}
                        >
                          {it.status_estoque}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {it.location || 'Almoxarifado'} ({it.sub_location || 'Geral'})
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setMovingItem(it);
                              setNewStatus(it.status_estoque);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-mono text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border-none shadow-xs"
                            title="Mover Status do Ativo"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-indigo-300" />
                            <span>Mover</span>
                          </button>

                          <button
                            onClick={() => handleOpenHistory(it)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-all border border-slate-200 cursor-pointer"
                            title="Ver Histórico de Auditoria"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setEditingItem(it)}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all border border-slate-200 hover:border-red-200 cursor-pointer"
                            title="Editar Ativo"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RODAPÉ DE RESUMO - TEMA CLARO */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex items-center justify-between font-mono text-xs text-slate-700 font-bold">
          <span className="text-slate-600 text-[11px]">
            Exibindo {filteredItems.length} de {items.length} ativos cadastrados
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all cursor-pointer border-none shadow-xs"
          >
            Fechar Painel
          </button>
        </div>
      </motion.div>

      {/* MODAL DE IMPORTAÇÃO EM MASSA */}
      <GestaoAtivosImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => loadAssets()}
        existingSerialNumbers={items.map((x) => x.numero_serie || '').filter(Boolean)}
      />

      {/* MODAL SECUNDÁRIO: MOVER STATUS */}
      <AnimatePresence>
        {movingItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 font-mono select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 font-sans text-slate-900 relative"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 font-mono">
                <h3 className="text-sm font-black uppercase text-slate-900">
                  MOVER STATUS DO ATIVO
                </h3>
                <button
                  onClick={() => setMovingItem(null)}
                  className="text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 font-sans text-xs">
                <div>
                  <span className="text-slate-500 font-mono text-[10px] uppercase block">Ativo Selecionado</span>
                  <div className="font-mono font-black text-sm text-slate-900">
                    {movingItem.patrimonio || movingItem.id_ativo} ({movingItem.category})
                  </div>
                </div>

                <div>
                  <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1.5">
                    Novo Status de Estoque:
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e: any) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="ESTOQUE APLICAÇÃO">🟢 ESTOQUE APLICAÇÃO</option>
                    <option value="ESTOQUE MANUTENÇÃO">🟡 ESTOQUE MANUTENÇÃO</option>
                    <option value="EM MANUTENÇÃO">🔵 EM MANUTENÇÃO</option>
                    <option value="CONDENADOS">🔴 CONDENADOS</option>
                  </select>
                </div>

                <div>
                  <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1.5">
                    Motivo da Movimentação:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Descreva o motivo da troca de status..."
                    value={motivoMovimentacao}
                    onChange={(e) => setMotivoMovimentacao(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-sans text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => setMovingItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMoveStatus}
                  disabled={isMoving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md cursor-pointer border-none"
                >
                  {isMoving ? 'Gravando...' : 'Confirmar Mudar Status'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL SECUNDÁRIO: HISTÓRICO DE AUDITORIA */}
      <AnimatePresence>
        {historyItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 font-mono select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 text-slate-900 relative max-h-[85vh] flex flex-col font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 font-mono">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900">
                    HISTÓRICO DE AUDITORIA DO ATIVO
                  </h3>
                  <p className="text-[11px] text-indigo-600 font-bold">
                    {historyItem.patrimonio || historyItem.id_ativo} - {historyItem.category}
                  </p>
                </div>
                <button
                  onClick={() => setHistoryItem(null)}
                  className="text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 font-sans">
                {loadingHistory ? (
                  <div className="py-8 text-center text-slate-500 font-mono text-xs">
                    Carregando histórico de auditoria...
                  </div>
                ) : historyLogs.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 font-mono text-xs">
                    Nenhuma movimentação registrada para este ativo ainda.
                  </div>
                ) : (
                  historyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                        <span>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                        <span className="text-slate-700">{log.usuario_nome}</span>
                      </div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500">{log.status_anterior}</span>
                        <span className="text-indigo-600">➔</span>
                        <span className="text-emerald-700 font-black">{log.status_novo}</span>
                      </div>
                      {log.motivo_movimentacao && (
                        <p className="text-[11px] text-slate-600 font-sans italic mt-1">
                          "{log.motivo_movimentacao}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 border-t border-slate-200 pt-3 flex justify-end font-mono">
                <button
                  type="button"
                  onClick={() => setHistoryItem(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer border-none"
                >
                  Fechar Histórico
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL SECUNDÁRIO: NOVO / EDITAR ATIVO */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 font-mono select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 text-slate-900 relative font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 font-mono">
                <h3 className="text-sm font-black uppercase text-slate-900">
                  {editingItem.id ? 'EDITAR ATIVO DE ESTOQUE' : 'CADASTRAR NOVO ATIVO'}
                </h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                      Código / Patrimônio:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: EXT-2026-0099"
                      value={editingItem.patrimonio || editingItem.id_ativo || ''}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          patrimonio: e.target.value,
                          id_ativo: e.target.value
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 p-2 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                      Número de Série:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: SR-991204"
                      value={editingItem.numero_serie || ''}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, numero_serie: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-300 p-2 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                      Tipo de Ativo:
                    </label>
                    <select
                      value={editingItem.category || 'extintores'}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 p-2 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                    >
                      <option value="extintores">Extintor</option>
                      <option value="hidrantes">Hidrante</option>
                      <option value="sinalizacoes">Sinalização</option>
                      <option value="iluminacao">Iluminação de Emergência</option>
                      <option value="bombas">Bomba de Incêndio</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                      Modelo:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: PQS ABC 4KG"
                      value={editingItem.model || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 p-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                    Categoria de Estoque Operacional:
                  </label>
                  <select
                    value={editingItem.status_estoque || 'ESTOQUE APLICAÇÃO'}
                    onChange={(e: any) =>
                      setEditingItem({ ...editingItem, status_estoque: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 p-2 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="ESTOQUE APLICAÇÃO">🟢 ESTOQUE APLICAÇÃO</option>
                    <option value="ESTOQUE MANUTENÇÃO">🟡 ESTOQUE MANUTENÇÃO</option>
                    <option value="EM MANUTENÇÃO">🔵 EM MANUTENÇÃO</option>
                    <option value="CONDENADOS">🔴 CONDENADOS</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSingleAsset}
                  disabled={isSavingItem}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md cursor-pointer border-none"
                >
                  {isSavingItem ? 'Gravando...' : 'Salvar Ativo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POP-UP HUD INFORMATIVO */}
      <AnimatePresence>
        {hudAlert.isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 font-mono select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative overflow-hidden text-center text-slate-900 font-sans"
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  hudAlert.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              />

              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3.5 border shadow-inner ${
                  hudAlert.type === 'success'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'bg-red-100 border-red-300 text-red-700'
                }`}
              >
                {hudAlert.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>

              <h3 className="text-sm font-black font-mono uppercase tracking-wider text-slate-900">
                {hudAlert.title}
              </h3>

              <p className="text-xs text-slate-700 font-medium leading-relaxed mt-2.5 px-2">
                {hudAlert.message}
              </p>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setHudAlert((prev) => ({ ...prev, isOpen: false }))}
                  className="w-full py-2.5 px-6 font-mono text-xs font-black uppercase bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-md cursor-pointer border-none"
                >
                  ENTENDIDO 👍
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
