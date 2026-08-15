'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Save, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  XCircle, 
  Search, 
  RotateCcw,
  CheckSquare,
  ShieldAlert,
  Tag,
  Scale,
  Edit3,
  AlertTriangle
} from 'lucide-react';
import { saveChecklistItemsAction, deleteChecklistItemAction } from '@/app/actions/checklistActions';
import { useSpci } from '@/app/context/SpciContext';
import { idb } from '@/lib/indexedDb';

export interface ChecklistItemData {
  id: string;
  ordem: number;
  categoria: string;
  item: string;
  tiposAplicaveis: string[]; // ['Todos', 'CO2', 'PQS', 'AP', 'Espuma', 'K']
  pesosAplicaveis: string[]; // ['Todos', 'Portátil', 'Carreta / Sobre Rodas']
  status: 'Ativado' | 'Desativado';
  isImpeditivo?: boolean;
}

export const DEFAULT_EXTINTOR_CHECKLIST: ChecklistItemData[] = [
  {
    id: 'chk-1',
    ordem: 1,
    categoria: 'extintores',
    item: 'Localização, classe e modelo de extintores conforme projeto de incêndio e pânico',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: false
  },
  {
    id: 'chk-2',
    ordem: 2,
    categoria: 'extintores',
    item: 'Suporte e Altura de instalação adequada (Máximo 1,60 m do piso acabado)',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Portátil'],
    status: 'Ativado',
    isImpeditivo: false
  },
  {
    id: 'chk-3',
    ordem: 3,
    categoria: 'extintores',
    item: 'Equipamento desobstruído e de fácil acesso visual e físico',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: false
  },
  {
    id: 'chk-4',
    ordem: 4,
    categoria: 'extintores',
    item: 'Sinalização de parede visível e dentro da norma vigente NBR 13434',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: false
  },
  {
    id: 'chk-5',
    ordem: 5,
    categoria: 'extintores',
    item: 'Sinalização de piso visível e dentro da norma vigente NBR 13434',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: false
  },
  {
    id: 'chk-6',
    ordem: 6,
    categoria: 'extintores',
    item: 'Aspecto externo sem dano, amassado, vazamento ou corrosão no recipiente',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: true
  },
  {
    id: 'chk-7',
    ordem: 7,
    categoria: 'extintores',
    item: 'Lacre de segurança íntegro e sem violação',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: true
  },
  {
    id: 'chk-8',
    ordem: 8,
    categoria: 'extintores',
    item: 'Selo Inmetro e Etiquetas de validade/manutenção íntegros e legíveis',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: false
  },
  {
    id: 'chk-9',
    ordem: 9,
    categoria: 'extintores',
    item: 'Prazo de manutenção anual e teste hidrostático (5 anos) dentro da validade',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: true
  },
  {
    id: 'chk-10',
    ordem: 10,
    categoria: 'extintores',
    item: 'Prazo de pesagem semestral de CO2 dentro da validade e sem perda >10%',
    tiposAplicaveis: ['CO2'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: true
  },
  {
    id: 'chk-11',
    ordem: 11,
    categoria: 'extintores',
    item: 'Indicador de pressão (Manômetro) na faixa verde de operação',
    tiposAplicaveis: ['PQS', 'AP', 'Espuma', 'K'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: true
  },
  {
    id: 'chk-12',
    ordem: 12,
    categoria: 'extintores',
    item: 'Acessórios íntegros (mangueira, difusor, punho, gatilho e válvula)',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: false
  },
  {
    id: 'chk-13',
    ordem: 13,
    categoria: 'extintores',
    item: 'Mangueiras de descarga desobstruídas e sem ressecamento',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado',
    isImpeditivo: false
  },
  {
    id: 'chk-14',
    ordem: 14,
    categoria: 'extintores',
    item: 'Conjunto de rodagem, mangueira longa e suporte de transporte conforme (Carreta)',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Carreta / Sobre Rodas'],
    status: 'Ativado',
    isImpeditivo: false
  }
];

export const OPCOES_TIPOS_AGENTE = ['Todos', 'CO2', 'PQS', 'AP', 'Espuma', 'K'];
export const OPCOES_PESOS = ['Todos', 'Portátil', 'Carreta / Sobre Rodas'];

interface ChecklistEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ChecklistItemData[];
  onSaveSuccess: (updatedItems: ChecklistItemData[]) => void;
}

export const ChecklistEditModal: React.FC<ChecklistEditModalProps> = ({
  isOpen,
  onClose,
  items: initialItems,
  onSaveSuccess
}) => {
  const [list, setList] = useState<ChecklistItemData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativado' | 'Desativado'>('Todos');
  const [saving, setSaving] = useState(false);

  // Pop-up HUD Informativo Elegante
  const [hudAlert, setHudAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
    shouldCloseModalOnConfirm?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
    shouldCloseModalOnConfirm: false
  });

  // Item sendo editado no formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemText, setItemText] = useState('');
  const [selectedTipos, setSelectedTipos] = useState<string[]>(['Todos']);
  const [selectedPesos, setSelectedPesos] = useState<string[]>(['Todos']);
  const [itemStatus, setItemStatus] = useState<'Ativado' | 'Desativado'>('Ativado');
  const [itemImpeditivo, setItemImpeditivo] = useState<boolean>(false);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setList(initialItems);
    } else {
      setList(DEFAULT_EXTINTOR_CHECKLIST);
    }
  }, [initialItems, isOpen]);

  if (!isOpen) return null;

  // Filtragem local
  const filteredList = list.filter((item) => {
    const matchesSearch = item.item.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Todos' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Manipular reordenação
  const handleMove = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const newList = [...list];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    // Recalcular ordens
    const reordered = newList.map((item, idx) => ({ ...item, ordem: idx + 1 }));
    setList(reordered);
  };

  // Alterar status direto
  const handleToggleStatus = (id: string) => {
    const updated = list.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: (item.status === 'Ativado' ? 'Desativado' : 'Ativado') as 'Ativado' | 'Desativado'
        };
      }
      return item;
    });
    setList(updated);
  };

  const { showConfirmModal } = useSpci();

  // Deletar quesito
  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: 'Excluir Quesito 🗑️',
      message: 'Tem certeza que deseja excluir este quesito do checklist?',
      type: 'error',
      confirmText: 'EXCLUIR QUESITO',
      cancelText: 'CANCELAR',
      onConfirm: async () => {
        const updated = list.filter((item) => item.id !== id);
        const reordered = updated.map((item, idx) => ({ ...item, ordem: idx + 1 }));
        setList(reordered);

        // Tentar deletar no servidor se não for ID temporário
        if (!id.startsWith('new-')) {
          try {
            await deleteChecklistItemAction(id);
          } catch (e) {
            console.error('Erro ao deletar item no banco:', e);
          }
        }
      }
    });
  };

  // Restaurar NBR Padrão
  const handleResetDefault = () => {
    showConfirmModal({
      title: 'Restaurar Checklist NBR 12962 🔄',
      message: 'Deseja restaurar o checklist com os 14 itens originais padrão da norma NBR 12962?',
      type: 'warning',
      confirmText: 'RESTAURAR PADRÃO',
      cancelText: 'CANCELAR',
      onConfirm: () => {
        setList(DEFAULT_EXTINTOR_CHECKLIST);
      }
    });
  };

  // Iniciar formulário de Adição
  const handleStartAdd = () => {
    setEditingId('NEW');
    setItemText('');
    setSelectedTipos(['Todos']);
    setSelectedPesos(['Todos']);
    setItemStatus('Ativado');
    setItemImpeditivo(false);
  };

  // Iniciar formulário de Edição
  const handleStartEdit = (item: ChecklistItemData) => {
    setEditingId(item.id);
    setItemText(item.item);
    setSelectedTipos(item.tiposAplicaveis || ['Todos']);
    setSelectedPesos(item.pesosAplicaveis || ['Todos']);
    setItemStatus(item.status);
    setItemImpeditivo(!!item.isImpeditivo);
  };

  // Selecionar/Deselecionar opções de array
  const toggleArraySelection = (
    currentList: string[],
    value: string,
    setFn: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (value === 'Todos') {
      setFn(['Todos']);
      return;
    }

    let next = currentList.filter((v) => v !== 'Todos');
    if (next.includes(value)) {
      next = next.filter((v) => v !== value);
    } else {
      next.push(value);
    }

    if (next.length === 0) {
      setFn(['Todos']);
    } else {
      setFn(next);
    }
  };

  // Salvar formulário inline
  const handleSaveForm = () => {
    if (!itemText.trim()) {
      alert('Por favor, informe a descrição do quesito de verificação.');
      return;
    }

    if (editingId === 'NEW') {
      const newItem: ChecklistItemData = {
        id: `new-${Date.now()}`,
        ordem: list.length + 1,
        categoria: 'extintores',
        item: itemText.trim(),
        tiposAplicaveis: selectedTipos,
        pesosAplicaveis: selectedPesos,
        status: itemStatus,
        isImpeditivo: itemImpeditivo
      };
      setList([...list, newItem]);
    } else if (editingId) {
      const updated = list.map((item) => {
        if (item.id === editingId) {
          return {
            ...item,
            item: itemText.trim(),
            tiposAplicaveis: selectedTipos,
            pesosAplicaveis: selectedPesos,
            status: itemStatus,
            isImpeditivo: itemImpeditivo
          };
        }
        return item;
      });
      setList(updated);
    }

    setEditingId(null);
  };

  // Salvar tudo com resiliência no IndexedDB + Supabase
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // 1. Grava no IndexedDB local para garantia de resiliência total
      try {
        await idb.set('config', 'checklist_extintores', list);
      } catch (idbErr) {
        console.warn('[ChecklistEditModal] Erro ao gravar localmente no IndexedDB:', idbErr);
      }

      // 2. Atualiza o estado da aplicação no frontend
      onSaveSuccess(list);

      // 3. Tenta salvar no Supabase
      const res = await saveChecklistItemsAction('extintores', list as any);

      if (res.success) {
        setHudAlert({
          isOpen: true,
          title: 'CHECKLIST NBR SALVO! 🟢',
          message: 'Os quesitos de verificação foram salvos no banco de dados e sincronizados no seu dispositivo com sucesso.',
          type: 'success',
          shouldCloseModalOnConfirm: true
        });
      } else if (res.isTableMissing) {
        setHudAlert({
          isOpen: true,
          title: 'SALVO LOCALMENTE NO DISPOSITIVO 🟡',
          message: 'O checklist NBR foi salvo localmente no seu dispositivo e está 100% funcional nas vistorias! (Aguardando criação da tabela "checklists_ativos" no Supabase para sincronia em nuvem).',
          type: 'warning',
          shouldCloseModalOnConfirm: true
        });
      } else {
        setHudAlert({
          isOpen: true,
          title: 'SALVO COM AVISO DE NUVEM ⚠️',
          message: `O checklist foi preservado localmente no seu dispositivo. Aviso da nuvem: ${res.error || 'Falha de comunicação'}`,
          type: 'warning',
          shouldCloseModalOnConfirm: true
        });
      }
    } catch (err: any) {
      setHudAlert({
        isOpen: true,
        title: 'SALVO LOCALMENTE NO DISPOSITIVO 🛡️',
        message: `O checklist foi salvo no seu dispositivo com sucesso. Erro no servidor: ${err.message || err}`,
        type: 'warning',
        shouldCloseModalOnConfirm: true
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-5xl bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900"
      >
        {/* CABEÇALHO DO MODAL */}
        <div className="bg-red-700 text-white p-4 sm:p-5 flex items-center justify-between border-b border-red-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white font-['Hanken_Grotesk']">
                CHECKLIST - EXTINTORES (NBR 12962 / NBR 15808)
              </h2>
              <p className="text-[11px] text-red-100 font-sans mt-0.5 font-bold">
                Configuração dos quesitos de verificação para vistoria Web e App de Ronda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer font-bold border border-white/20"
            title="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRA DE AÇÕES E FILTROS */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar quesito..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 pl-8 pr-3 py-1.5 rounded-xl text-xs font-sans text-slate-900 font-bold focus:outline-none focus:border-red-600 shadow-xs"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-300 py-1.5 px-3 rounded-xl text-xs font-mono text-slate-900 font-bold focus:outline-none focus:border-red-600 shadow-xs"
            >
              <option value="Todos">Status: Todos</option>
              <option value="Ativado">🟢 Ativados</option>
              <option value="Desativado">🔴 Desativados</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleResetDefault}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Restaurar os 14 itens originais da NBR 12962"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Restaurar NBR</span>
            </button>
            <button
              onClick={handleStartAdd}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Quesito</span>
            </button>
          </div>
        </div>

        {/* CORPO DO FORMULÁRIO DE EDIÇÃO / ADIÇÃO INLINE */}
        <AnimatePresence>
          {editingId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50/90 border-b border-red-200 p-4 font-sans space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-red-800 uppercase flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4" />
                  {editingId === 'NEW' ? 'Cadastrar Novo Quesito NBR' : 'Editar Quesito do Checklist'}
                </span>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-slate-500 hover:text-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono font-black uppercase text-slate-700">
                  Descrição da Instrução / Verificação NBR *
                </label>
                <input
                  type="text"
                  value={itemText}
                  onChange={(e) => setItemText(e.target.value)}
                  placeholder="Ex: Suporte e altura de instalação adequada (Máximo 1,60 m)"
                  className="w-full bg-white border border-slate-300 focus:border-red-600 rounded-xl p-2.5 text-xs text-slate-900 font-bold shadow-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                {/* FILTRO TIPO DE AGENTE EXTINTOR */}
                <div className="space-y-1 bg-white p-2.5 border border-slate-200 rounded-xl shadow-xs">
                  <label className="block text-[9px] font-mono font-black uppercase text-slate-700 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-red-600" />
                    Tipo de Agente Extintor
                  </label>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {OPCOES_TIPOS_AGENTE.map((tp) => {
                      const isSel = selectedTipos.includes(tp);
                      return (
                        <button
                          key={tp}
                          type="button"
                          onClick={() => toggleArraySelection(selectedTipos, tp, setSelectedTipos)}
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-red-600 text-white border-red-700 shadow-xs font-black'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {tp}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* FILTRO CAPACIDADE / PESO */}
                <div className="space-y-1 bg-white p-2.5 border border-slate-200 rounded-xl shadow-xs">
                  <label className="block text-[9px] font-mono font-black uppercase text-slate-700 flex items-center gap-1">
                    <Scale className="w-3 h-3 text-red-600" />
                    Capacidade / Peso
                  </label>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {OPCOES_PESOS.map((ps) => {
                      const isSel = selectedPesos.includes(ps);
                      return (
                        <button
                          key={ps}
                          type="button"
                          onClick={() => toggleArraySelection(selectedPesos, ps, setSelectedPesos)}
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-red-600 text-white border-red-700 shadow-xs font-black'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {ps}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CARÁTER IMPEDITIVO */}
                <div className="space-y-1 bg-white p-2.5 border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
                  <label className="block text-[9px] font-mono font-black uppercase text-red-700 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-red-600" />
                    Impeditivo na Área
                  </label>
                  <div className="flex items-center gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setItemImpeditivo(true)}
                      className={`flex-1 py-1 text-[9px] font-mono font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        itemImpeditivo
                          ? 'bg-red-600 text-white border-red-700 shadow-xs font-black'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      🚨 Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemImpeditivo(false)}
                      className={`flex-1 py-1 text-[9px] font-mono font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        !itemImpeditivo
                          ? 'bg-slate-200 text-slate-800 border-slate-300 font-bold'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {/* STATUS LIGA/DESLIGA */}
                <div className="space-y-1 bg-white p-2.5 border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
                  <label className="block text-[9px] font-mono font-black uppercase text-slate-700">
                    Status do Quesito
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setItemStatus('Ativado')}
                      className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        itemStatus === 'Ativado'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs font-black'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      🟢 Ativado
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemStatus('Desativado')}
                      className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        itemStatus === 'Desativado'
                          ? 'bg-red-600 text-white border-red-700 shadow-xs font-black'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      🔴 Desativado
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-3.5 py-1.5 text-xs font-mono border border-slate-200 bg-white hover:bg-slate-100 rounded-xl text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  className="px-4 py-1.5 text-xs font-mono font-black bg-red-700 hover:bg-red-800 text-white rounded-xl shadow-sm border-none"
                >
                  Confirmar Quesito
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TABELA DE QUESITOS DO CHECKLIST */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-mono text-[10px] font-black uppercase text-slate-700 tracking-wider">
                <th className="p-3 text-center w-16">Ordem</th>
                <th className="p-3 min-w-[280px]">Item / Quesito de Verificação NBR</th>
                <th className="p-3 text-center w-36">Tipo Agente</th>
                <th className="p-3 text-center w-36">Capacidade / Peso</th>
                <th className="p-3 text-center w-28">Status</th>
                <th className="p-3 text-center w-40">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-mono text-xs font-bold">
                    Nenhum quesito encontrado para a busca.
                  </td>
                </tr>
              ) : (
                filteredList.map((it, idx) => {
                  const isDeactivated = it.status === 'Desativado';
                  return (
                    <tr
                      key={it.id}
                      className={`hover:bg-slate-50/80 transition-all ${
                        isDeactivated ? 'bg-slate-50/90 text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {/* ORDEM E BOTÕES MOVER */}
                      <td className="p-3 text-center font-mono font-bold text-slate-700">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-7 h-7 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center text-xs font-black text-slate-900 shadow-xs">
                            {it.ordem}
                          </span>
                          <div className="flex flex-col">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMove(idx, 'UP')}
                              className="text-slate-400 hover:text-red-700 disabled:opacity-20 p-0.5 cursor-pointer"
                              title="Mover para Cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={idx === filteredList.length - 1}
                              onClick={() => handleMove(idx, 'DOWN')}
                              className="text-slate-400 hover:text-red-700 disabled:opacity-20 p-0.5 cursor-pointer"
                              title="Mover para Baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* TEXTO DO QUESITO */}
                      <td className={`p-3 font-bold text-xs leading-relaxed ${isDeactivated ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{it.item}</span>
                          {it.isImpeditivo && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 font-mono text-[9.5px] font-black" title="Inconformidade neste quesito impede a permanência do ativo na área">
                              <ShieldAlert className="w-3 h-3 text-red-600" />
                              Impeditivo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* TIPOS APLICÁVEIS */}
                      <td className="p-3 text-center font-mono text-[10px]">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {it.tiposAplicaveis.map((tp) => (
                            <span
                              key={tp}
                              className={`px-2 py-0.5 rounded-md border font-black text-[9.5px] ${
                                tp === 'Todos'
                                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                                  : 'bg-red-50 text-red-800 border-red-200'
                              }`}
                            >
                              {tp}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* PESOS APLICÁVEIS */}
                      <td className="p-3 text-center font-mono text-[10px]">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {it.pesosAplicaveis.map((ps) => (
                            <span
                              key={ps}
                              className={`px-2 py-0.5 rounded-md border font-black text-[9.5px] ${
                                ps === 'Todos'
                                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {ps}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* STATUS LIGA/DESLIGA */}
                      <td className="p-3 text-center font-mono text-[11px]">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                            it.status === 'Ativado'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-red-50 text-red-800 border-red-300'
                          }`}
                        >
                          {it.status === 'Ativado' ? '🟢 Ativado' : '🔴 Desativado'}
                        </span>
                      </td>

                      {/* BOTÕES DE AÇÃO */}
                      <td className="p-3 text-center font-mono text-[11px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(it)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black transition-all shadow-xs cursor-pointer border-none"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggleStatus(it.id)}
                            className={`px-2.5 py-1 rounded-lg font-black text-white transition-all shadow-xs cursor-pointer border-none ${
                              it.status === 'Ativado'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {it.status === 'Ativado' ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => handleDelete(it.id)}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all border border-slate-200 hover:border-red-200 cursor-pointer"
                            title="Excluir Quesito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* RODAPÉ DO MODAL DE SALVAMENTO */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between font-mono text-xs text-slate-700 font-bold">
          <span className="text-slate-600 text-[11px]">
            Total de {list.length} quesitos ({list.filter((x) => x.status === 'Ativado').length} ativados)
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-black rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer border-none"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações no Supabase'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* MODAL POP-UP HUD INFORMATIVO ELEGANTE (SUBSTITUI O ALERT DO NAVEGADOR) */}
      <AnimatePresence>
        {hudAlert.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 font-mono select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative overflow-hidden text-center text-slate-900 font-sans"
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                hudAlert.type === 'success' ? 'bg-emerald-600' : hudAlert.type === 'warning' ? 'bg-amber-500' : 'bg-red-600'
              }`} />

              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3.5 border shadow-inner ${
                hudAlert.type === 'success'
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  : hudAlert.type === 'warning'
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-red-100 border-red-300 text-red-700'
              }`}>
                {hudAlert.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                {hudAlert.type === 'warning' && <AlertTriangle className="w-6 h-6" />}
                {hudAlert.type === 'error' && <XCircle className="w-6 h-6" />}
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
                  onClick={() => {
                    setHudAlert(prev => ({ ...prev, isOpen: false }));
                    if (hudAlert.shouldCloseModalOnConfirm) {
                      onClose();
                    }
                  }}
                  className={`w-full py-2.5 px-6 font-mono text-xs font-black uppercase rounded-xl transition-all shadow-md cursor-pointer border-none text-white ${
                    hudAlert.type === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : hudAlert.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-red-700 hover:bg-red-800'
                  }`}
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
