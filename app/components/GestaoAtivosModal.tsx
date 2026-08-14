'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Check,
  Calendar,
  Clock,
  AlertCircle,
  Filter
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

// Opções mestre compartilhadas com o Registro de Novo Extintor
const MODEL_OPTIONS = ['AB', 'ABC', 'ABC-PREMIUM', 'CO²', 'CUSTOM'];
const WEIGHT_OPTIONS = ['2KG', '4KG', '4,5KG', '6KG', '8KG', '9KG', '12KG', '20KG', '25KG', '30KG', '50KG', '55KG'];
const FABRICANTE_OPTIONS = ['Kidde', 'Resmat', 'Mocelin', 'Bucka', 'Extinwal', 'Yalunt', 'Mondial', 'Outro'];
const STATUS_EQUIPAMENTO_OPTIONS = ['Operacional', 'Conforme', 'Em Manutenção', 'Inspecionado', 'Aguardando Recarga', 'Não Conforme'];

const MONTHS = [
  { value: 1, label: 'Janeiro (01)' },
  { value: 2, label: 'Fevereiro (02)' },
  { value: 3, label: 'Março (03)' },
  { value: 4, label: 'Abril (04)' },
  { value: 5, label: 'Maio (05)' },
  { value: 6, label: 'Junho (06)' },
  { value: 7, label: 'Julho (07)' },
  { value: 8, label: 'Agosto (08)' },
  { value: 9, label: 'Setembro (09)' },
  { value: 10, label: 'Outubro (10)' },
  { value: 11, label: 'Novembro (11)' },
  { value: 12, label: 'Dezembro (12)' }
];

// Cálculo de Dias a Vencer (Regressivo a partir de hoje)
export const calculateDaysRemaining = (expiryDateStr?: string | null): number | null => {
  if (!expiryDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Formato YYYY-MM ou YYYY-MM-DD
  let expiryDate: Date;
  if (expiryDateStr.length === 7) {
    const [y, m] = expiryDateStr.split('-').map(Number);
    expiryDate = new Date(y, m - 1, 1);
  } else {
    expiryDate = new Date(expiryDateStr);
  }

  if (isNaN(expiryDate.getTime())) return null;
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const GestaoAtivosModal: React.FC<GestaoAtivosModalProps> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<AssetStockItemRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'Todos' | StatusEstoqueType>('Todos');
  const [expiryFilterPill, setExpiryFilterPill] = useState<'TODOS' | 'VENCIDOS' | 'A_VENCER' | 'VALIDOS' | 'CRITICOS'>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Controla disparo do Alerta Formal Corporativo
  const [showFormalAlertModal, setShowFormalAlertModal] = useState<boolean>(false);
  const [alertDismissedSession, setAlertDismissedSession] = useState<boolean>(false);

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

  // States do form Mês/Ano de Vencimento no Modal de Edição
  const [editExpiryMonth, setEditExpiryMonth] = useState<number | ''>('');
  const [editExpiryYear, setEditExpiryYear] = useState<number | ''>('');

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

  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: 21 }, (_, i) => currentYear - 5 + i);

  // Carrega ativos do Supabase e IndexedDB ao abrir
  const loadAssets = async () => {
    setLoading(true);
    try {
      let loaded: AssetStockItemRecord[] = [];
      try {
        const localItems = await idb.getAll('extintores');
        if (localItems && localItems.length > 0) {
          loaded = localItems.map((row: any) => ({
            id: row.id,
            id_ativo: row.idAtivo || row.id,
            category: row.category || 'extintores',
            model: row.model || row.modelo || 'Padrão',
            fabricante: row.fabricante || row.details?.fabricante || 'Kidde',
            peso_capacidade: row.peso_capacidade || row.peso || row.details?.peso_capacidade || '4KG',
            validadeRecarga: row.validadeRecarga || row.data_vencimento_teste || row.details?.validadeRecarga || null,
            location: row.location || 'Almoxarifado',
            sub_location: row.subLocation || 'Estoque',
            status: row.status || 'Conforme',
            status_estoque: (row.status_estoque as StatusEstoqueType) || 'ESTOQUE APLICAÇÃO',
            numero_serie: row.details?.serialNumber || row.numero_serie || '',
            patrimonio: row.patrimonio || row.idAtivo || row.id,
            created_at: row.createdAt || new Date().toISOString()
          }));
          setItems(loaded);
        }
      } catch (idbErr) {
        console.warn('[GestaoAtivosModal] Aviso ao carregar IndexedDB:', idbErr);
      }

      const res = await getAssetStockItemsAction();
      if (res.success && res.assets && res.assets.length > 0) {
        loaded = res.assets;
        setItems(res.assets);
      }

      // Dispara o Alerta Formal se houver itens críticos em estoque (dias <= 30)
      if (!alertDismissedSession) {
        const criticalCount = loaded.filter((it) => {
          const isEmEstoque = it.status_estoque === 'ESTOQUE APLICAÇÃO' || it.status_estoque === 'ESTOQUE MANUTENÇÃO';
          const days = calculateDaysRemaining(it.validadeRecarga || it.data_vencimento_teste);
          return isEmEstoque && days !== null && days <= 30;
        }).length;

        if (criticalCount > 0) {
          setShowFormalAlertModal(true);
        }
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

  // Sincroniza mês e ano de vencimento no form de edição
  useEffect(() => {
    if (editingItem && (editingItem.validadeRecarga || editingItem.data_vencimento_teste)) {
      const vStr = editingItem.validadeRecarga || editingItem.data_vencimento_teste || '';
      if (vStr.length >= 7) {
        const parts = vStr.split('-');
        if (parts.length >= 2) {
          setEditExpiryYear(Number(parts[0]));
          setEditExpiryMonth(Number(parts[1]));
        }
      }
    } else if (editingItem && !editingItem.validadeRecarga) {
      setEditExpiryMonth('');
      setEditExpiryYear('');
    }
  }, [editingItem]);

  // Cálculos de KPI de Regras de Vencimento para Ativos em Estoque
  const stockAssets = useMemo(() => {
    return items.filter((x) => x.status_estoque === 'ESTOQUE APLICAÇÃO' || x.status_estoque === 'ESTOQUE MANUTENÇÃO');
  }, [items]);

  const vencidosStockCount = useMemo(() => {
    return stockAssets.filter((it) => {
      const d = calculateDaysRemaining(it.validadeRecarga || it.data_vencimento_teste);
      return d !== null && d <= 0;
    }).length;
  }, [stockAssets]);

  const aVencerStockCount = useMemo(() => {
    return stockAssets.filter((it) => {
      const d = calculateDaysRemaining(it.validadeRecarga || it.data_vencimento_teste);
      return d !== null && d > 0 && d <= 30;
    }).length;
  }, [stockAssets]);

  const validosStockCount = useMemo(() => {
    return stockAssets.filter((it) => {
      const d = calculateDaysRemaining(it.validadeRecarga || it.data_vencimento_teste);
      return d === null || d > 30;
    }).length;
  }, [stockAssets]);

  // Menor número de dias a vencer entre os críticos para o texto formal
  const lowestDaysCritical = useMemo(() => {
    let minDays = 30;
    stockAssets.forEach((it) => {
      const d = calculateDaysRemaining(it.validadeRecarga || it.data_vencimento_teste);
      if (d !== null && d <= 30 && d < minDays) {
        minDays = d;
      }
    });
    return minDays;
  }, [stockAssets]);

  const criticalStockList = useMemo(() => {
    return stockAssets.filter((it) => {
      const d = calculateDaysRemaining(it.validadeRecarga || it.data_vencimento_teste);
      return d !== null && d <= 30;
    });
  }, [stockAssets]);

  // KPIs de contagem por categoria de estoque operacional
  const countAplicacao = items.filter((x) => x.status_estoque === 'ESTOQUE APLICAÇÃO').length;
  const countEstManutencao = items.filter((x) => x.status_estoque === 'ESTOQUE MANUTENÇÃO').length;
  const countEmManutencao = items.filter((x) => x.status_estoque === 'EM MANUTENÇÃO').length;
  const countCondenados = items.filter((x) => x.status_estoque === 'CONDENADOS').length;

  // Filtragem composta da tabela
  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === 'Todos' || item.status_estoque === activeTab;
    
    // Filtro pill de vencimento
    const days = calculateDaysRemaining(item.validadeRecarga || item.data_vencimento_teste);
    let matchesExpiry = true;
    if (expiryFilterPill === 'VENCIDOS') {
      matchesExpiry = days !== null && days <= 0;
    } else if (expiryFilterPill === 'A_VENCER') {
      matchesExpiry = days !== null && days > 0 && days <= 30;
    } else if (expiryFilterPill === 'VALIDOS') {
      matchesExpiry = days === null || days > 30;
    } else if (expiryFilterPill === 'CRITICOS') {
      matchesExpiry = days !== null && days <= 30;
    }

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (item.patrimonio || '').toLowerCase().includes(term) ||
      (item.id_ativo || '').toLowerCase().includes(term) ||
      (item.numero_serie || '').toLowerCase().includes(term) ||
      (item.model || '').toLowerCase().includes(term) ||
      (item.fabricante || '').toLowerCase().includes(term) ||
      (item.category || '').toLowerCase().includes(term);

    return matchesTab && matchesExpiry && matchesSearch;
  });

  if (!isOpen) return null;

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

    // Atualiza campo de validade formato YYYY-MM-01
    let finalValidade = editingItem.validadeRecarga;
    if (editExpiryYear && editExpiryMonth) {
      finalValidade = `${editExpiryYear}-${String(editExpiryMonth).padStart(2, '0')}-01`;
    }

    const payloadToSave = {
      ...editingItem,
      validadeRecarga: finalValidade,
      data_vencimento_teste: finalValidade
    };

    setIsSavingItem(true);
    try {
      const res = await saveSingleAssetStockAction(payloadToSave);
      if (res.success) {
        await loadAssets();
        setEditingItem(null);
        setHudAlert({
          isOpen: true,
          title: 'ATIVO GRAVADO COM SUCESSO! 🟢',
          message: 'As alterações foram salvas e sincronizadas no banco de dados SPCI Master.',
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
                Controle de movimentações, regras de vencimento e rastreabilidade de ativos em estoque
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

        {/* RESUMO VISUAL: REGRAS DE VENCIMENTO EM ESTOQUE (BENTO GRID SUPERIOR) */}
        <div className="bg-slate-900 text-white p-4 border-b border-slate-800 font-sans">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-xs font-black uppercase tracking-wider text-slate-200">
                REGRAS DE VENCIMENTO · ATIVOS EM ESTOQUE
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Cálculo regressivo diário</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            {/* VENCIDOS */}
            <div
              onClick={() => setExpiryFilterPill(expiryFilterPill === 'VENCIDOS' ? 'TODOS' : 'VENCIDOS')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                expiryFilterPill === 'VENCIDOS'
                  ? 'bg-red-600 text-white border-red-500 shadow-lg ring-2 ring-red-400'
                  : 'bg-slate-800/90 text-slate-100 border-slate-700 hover:border-red-500/50'
              }`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-red-300 block">🚨 Vencidos (Estoque)</span>
                <span className="text-xl font-black text-white">{vencidosStockCount}</span>
                <span className="text-[9px] text-red-200 block font-sans mt-0.5">Dias a Vencer ≤ 0</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
            </div>

            {/* A VENCER */}
            <div
              onClick={() => setExpiryFilterPill(expiryFilterPill === 'A_VENCER' ? 'TODOS' : 'A_VENCER')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                expiryFilterPill === 'A_VENCER'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-lg ring-2 ring-amber-400'
                  : 'bg-slate-800/90 text-slate-100 border-slate-700 hover:border-amber-500/50'
              }`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-300 block">⚠️ A Vencer (até 30d)</span>
                <span className="text-xl font-black text-white">{aVencerStockCount}</span>
                <span className="text-[9px] text-amber-200 block font-sans mt-0.5">0 &lt; Dias a Vencer ≤ 30</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            {/* VÁLIDOS */}
            <div
              onClick={() => setExpiryFilterPill(expiryFilterPill === 'VALIDOS' ? 'TODOS' : 'VALIDOS')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                expiryFilterPill === 'VALIDOS'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg ring-2 ring-emerald-400'
                  : 'bg-slate-800/90 text-slate-100 border-slate-700 hover:border-emerald-500/50'
              }`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">🟢 Válidos / Conformes</span>
                <span className="text-xl font-black text-white">{validosStockCount}</span>
                <span className="text-[9px] text-emerald-200 block font-sans mt-0.5">Dias a Vencer &gt; 30</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE AÇÕES E BOTÕES DE FILTRO */}
        <div className="bg-white border-b border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <button
              onClick={() =>
                setEditingItem({
                  status_estoque: 'ESTOQUE APLICAÇÃO',
                  category: 'extintores',
                  status: 'Operacional',
                  model: 'ABC',
                  fabricante: 'Kidde',
                  peso_capacidade: '4KG'
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

            {/* BOTÃO ATALHO ALERTA FORMAL */}
            {vencidosStockCount + aVencerStockCount > 0 && (
              <button
                onClick={() => setShowFormalAlertModal(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-mono font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-none animate-pulse"
                title="Exibir Alerta Formal Corporativo"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Alerta Críticos ({vencidosStockCount + aVencerStockCount})</span>
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Série, Patrimônio, Fabricante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 pl-8 pr-3 py-2 rounded-xl text-xs font-sans text-slate-900 font-bold focus:outline-none focus:border-red-600 shadow-xs"
            />
          </div>
        </div>

        {/* FILTROS PILL DE VENCIMENTO E TABS DE CATEGORIA ESTOQUE */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 pt-3 pb-2 flex items-center justify-between flex-wrap gap-2 font-mono text-xs">
          <div className="flex items-center gap-2 overflow-x-auto">
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
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all border cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 border-slate-300 shadow-xs font-black ring-1 ring-slate-300/50'
                    : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* PILLS DE FILTRO DE REGRAS DE VENCIMENTO */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <span className="text-[10px] font-bold text-slate-600 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-500" /> Vencimento:
            </span>
            <button
              onClick={() => setExpiryFilterPill('TODOS')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                expiryFilterPill === 'TODOS' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setExpiryFilterPill('VENCIDOS')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                expiryFilterPill === 'VENCIDOS' ? 'bg-red-600 text-white shadow-xs' : 'text-red-700 hover:bg-red-100'
              }`}
            >
              Vencidos
            </button>
            <button
              onClick={() => setExpiryFilterPill('A_VENCER')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                expiryFilterPill === 'A_VENCER' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-100'
              }`}
            >
              A Vencer
            </button>
            <button
              onClick={() => setExpiryFilterPill('VALIDOS')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                expiryFilterPill === 'VALIDOS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Válidos
            </button>
          </div>
        </div>

        {/* TABELA PRINCIPAL (GRID DE ATIVOS - NOVAS COLUNAS DIAS A VENCER E STATUS) */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Patrimônio / Cód</th>
                  <th className="py-3 px-4">Modelo / Fabricante</th>
                  <th className="py-3 px-4">Capacidade / Peso</th>
                  <th className="py-3 px-4">Inventário · Estoque Aplicação</th>
                  <th className="py-3 px-4">Status do Ativo *</th>
                  <th className="py-3 px-4">Dias a Vencer</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-xs text-slate-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                      Carregando estoque de ativos...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                      Nenhum ativo encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((it) => {
                    const daysRemaining = calculateDaysRemaining(it.validadeRecarga || it.data_vencimento_teste);
                    return (
                      <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* PATRIMÔNIO / SÉRIE */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div>{it.patrimonio || it.id_ativo || it.id}</div>
                          <span className="text-[10px] text-slate-500 font-normal block font-mono">
                            Série: {it.numero_serie || 'N/A'}
                          </span>
                        </td>

                        {/* MODELO & FABRICANTE */}
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div className="font-bold text-slate-900">{it.model || 'Padrão'}</div>
                          <span className="text-[10px] text-slate-500 font-normal block">
                            Fab: {it.fabricante || 'Kidde'}
                          </span>
                        </td>

                        {/* CAPACIDADE / PESO */}
                        <td className="py-3 px-4 font-mono text-slate-700 font-bold">
                          {it.peso_capacidade || '4KG'}
                        </td>

                        {/* COLUNA: INVENTÁRIO · ESTOQUE APLICAÇÃO */}
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

                        {/* COLUNA: STATUS DO ATIVO * (SITUAÇÃO OPERACIONAL) */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                              (it.status || 'Operacional') === 'Operacional' || (it.status || '') === 'Conforme'
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                : (it.status || '') === 'Em Manutenção'
                                ? 'text-amber-800 bg-amber-50 border border-amber-200'
                                : (it.status || '') === 'Aguardando Recarga'
                                ? 'text-orange-800 bg-orange-50 border border-orange-200'
                                : 'text-slate-700 bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {it.status || 'Operacional'}
                          </span>
                        </td>

                        {/* COLUNA: DIAS A VENCER (CÁLCULO REGRESSIVO AUTOMÁTICO) */}
                        <td className="py-3 px-4 font-mono font-bold">
                          {daysRemaining === null ? (
                            <span className="text-slate-400 text-[11px]">N/D</span>
                          ) : daysRemaining > 60 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              🟢 +{daysRemaining} dias
                            </span>
                          ) : daysRemaining > 30 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              🟡 {daysRemaining} dias
                            </span>
                          ) : daysRemaining > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-orange-100 text-orange-900 border border-orange-400 animate-pulse">
                              ⚠️ A VENCER ({daysRemaining}d)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-red-100 text-red-900 border border-red-400 animate-pulse">
                              🚨 VENCIDO ({Math.abs(daysRemaining)}d atrás)
                            </span>
                          )}
                        </td>

                        {/* AÇÕES */}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RODAPÉ DE RESUMO - TEMA CLARO */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex items-center justify-between font-mono text-xs text-slate-700 font-bold">
          <span className="text-slate-600 text-[11px]">
            Exibindo {filteredItems.length} de {items.length} ativos cadastrados | Vencidos/A Vencer em Estoque: {vencidosStockCount + aVencerStockCount}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all cursor-pointer border-none shadow-xs"
          >
            Fechar Painel
          </button>
        </div>
      </motion.div>

      {/* --- SISTEMA DE ALERTA FORMAL CORPORATIVO (MODAL CORPORATIVO REQUISITO 4) --- */}
      <AnimatePresence>
        {showFormalAlertModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 font-mono select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-xl bg-white border border-red-200 shadow-2xl rounded-2xl overflow-hidden font-sans text-slate-900 relative"
            >
              {/* CABEÇALHO CORPORATIVO SPCI RED */}
              <div className="bg-red-800 text-white p-5 border-b border-red-900 relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                    <AlertTriangle className="w-6 h-6 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black font-mono uppercase tracking-wider text-white">
                      SISTEMA SPCI MASTER · ALERTA FORMAL DE ESTOQUE
                    </h3>
                    <p className="text-[11px] text-red-100 font-sans font-bold">
                      Notificação Corporativa de Conformidade Operacional
                    </p>
                  </div>
                </div>
              </div>

              {/* CORPO DA MENSAGEM FORMAL */}
              <div className="p-6 space-y-4 text-xs leading-relaxed text-slate-800">
                <p className="font-bold text-slate-900 text-sm">Prezado(a) Gestor,</p>

                <p>
                  Verificamos que há{' '}
                  <strong className="text-red-700 font-black">
                    {criticalStockList.length} ativo(s) em estoque
                  </strong>{' '}
                  com vencimento previsto para os próximos{' '}
                  <strong className="text-amber-800 font-black">
                    {lowestDaysCritical <= 0 ? 0 : lowestDaysCritical} dias
                  </strong>{' '}
                  (ou já vencidos). Para garantir a conformidade operacional com as normas vigentes e evitar indisponibilidade de equipamentos, recomendamos a{' '}
                  <strong className="text-slate-900 underline font-bold">
                    priorização imediata da aplicação
                  </strong>{' '}
                  ou <strong className="text-slate-900 underline font-bold">substituição</strong> destes itens.
                </p>

                {/* LISTA DOS ATIVOS CRÍTICOS */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 max-h-44 overflow-y-auto font-mono text-[11px]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block border-b border-slate-200 pb-1">
                    Ativos Críticos Identificados em Estoque:
                  </span>
                  {criticalStockList.map((crit) => {
                    const days = calculateDaysRemaining(crit.validadeRecarga || crit.data_vencimento_teste);
                    return (
                      <div key={crit.id} className="flex items-center justify-between border-b border-slate-100 pb-1 text-slate-800">
                        <span className="font-bold text-slate-900">
                          {crit.patrimonio || crit.id_ativo} ({crit.category})
                        </span>
                        <span className="text-slate-600">Fab: {crit.fabricante || 'Kidde'}</span>
                        <span
                          className={`font-bold ${
                            days !== null && days <= 0 ? 'text-red-600' : 'text-amber-700'
                          }`}
                        >
                          {days !== null && days <= 0
                            ? `🚨 VENCIDO (há ${Math.abs(days)}d)`
                            : `⚠️ ${days} dias`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 text-slate-700 border-t border-slate-100 font-sans">
                  <p>Atenciosamente,</p>
                  <p className="font-black font-mono text-slate-900 text-xs mt-0.5">
                    Sistema SPCI Master - Controle de Ativos.
                  </p>
                </div>
              </div>

              {/* RODAPÉ DO ALERTA E BOTÃO "VISUALIZAR CRÍTICOS" */}
              <div className="bg-slate-100 border-t border-slate-200 p-4 flex items-center justify-between font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormalAlertModal(false);
                    setAlertDismissedSession(true);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Ciente / Fechar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowFormalAlertModal(false);
                    setAlertDismissedSession(true);
                    setExpiryFilterPill('CRITICOS');
                  }}
                  className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-black rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer border-none flex items-center gap-1.5 active:scale-95"
                >
                  <Filter className="w-4 h-4" />
                  <span>Visualizar Críticos ({criticalStockList.length})</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* MODAL SECUNDÁRIO: NOVO / EDITAR ATIVO (PADRONIZADO COM REGISTRO DE NOVO EXTINTOR) */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 font-mono select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 text-slate-900 relative font-sans max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 font-mono">
                <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-red-600" />
                  {editingItem.id ? 'EDITAR ATIVO DE ESTOQUE' : 'CADASTRAR NOVO ATIVO'}
                </h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 font-sans text-xs">
                {/* SEÇÃO IDENTIFICAÇÃO */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                      Código / Patrimônio *:
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
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-red-600"
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
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>

                {/* SEÇÃO DADOS TÉCNICOS SINCRO COM CADASTRO EXTINTOR */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="font-mono text-[10px] font-black uppercase tracking-wider text-slate-600 block border-b border-slate-200 pb-1">
                    ⚙️ DADOS TÉCNICOS DADOS MESTRE
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* MODELO */}
                    <div>
                      <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                        Modelo do Equipamento *:
                      </label>
                      <select
                        value={editingItem.model || 'ABC'}
                        onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                        className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                      >
                        {MODEL_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CAPACIDADE / PESO */}
                    <div>
                      <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                        Capacidade / Peso *:
                      </label>
                      <select
                        value={editingItem.peso_capacidade || '4KG'}
                        onChange={(e) => setEditingItem({ ...editingItem, peso_capacidade: e.target.value })}
                        className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                      >
                        {WEIGHT_OPTIONS.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* FABRICANTE */}
                    <div>
                      <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                        Fabricante *:
                      </label>
                      <select
                        value={editingItem.fabricante || 'Kidde'}
                        onChange={(e) => setEditingItem({ ...editingItem, fabricante: e.target.value })}
                        className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                      >
                        {FABRICANTE_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* STATUS DO ATIVO (EQUIPAMENTO) */}
                    <div>
                      <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                        Status do Ativo * (Situação):
                      </label>
                      <select
                        value={editingItem.status || 'Operacional'}
                        onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                        className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                      >
                        {STATUS_EQUIPAMENTO_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* MÊS / ANO DO VENCIMENTO */}
                  <div>
                    <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                      Mês/Ano do Vencimento * (Validação Futura):
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={editExpiryMonth}
                        onChange={(e) => setEditExpiryMonth(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-red-600"
                      >
                        <option value="">Selecione Mês...</option>
                        {MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={editExpiryYear}
                        onChange={(e) => setEditExpiryYear(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-red-600"
                      >
                        <option value="">Selecione Ano...</option>
                        {YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* CATEGORIA DE ESTOQUE OPERACIONAL */}
                <div>
                  <label className="font-mono text-slate-700 font-bold uppercase text-[10px] block mb-1">
                    Categoria de Estoque Operacional (Fluxo Inventário):
                  </label>
                  <select
                    value={editingItem.status_estoque || 'ESTOQUE APLICAÇÃO'}
                    onChange={(e: any) =>
                      setEditingItem({ ...editingItem, status_estoque: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-red-600"
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
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md cursor-pointer border-none active:scale-95"
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
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 font-mono select-none">
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
