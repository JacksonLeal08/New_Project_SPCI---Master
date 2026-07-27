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
  Edit3
} from 'lucide-react';
import { saveChecklistItemsAction, deleteChecklistItemAction } from '@/app/actions/checklistActions';

export interface ChecklistItemData {
  id: string;
  ordem: number;
  categoria: string;
  item: string;
  tiposAplicaveis: string[]; // ['Todos', 'CO2', 'PQS', 'AP', 'Espuma', 'K']
  pesosAplicaveis: string[]; // ['Todos', 'Portátil', 'Carreta / Sobre Rodas']
  status: 'Ativado' | 'Desativado';
}

export const DEFAULT_EXTINTOR_CHECKLIST: ChecklistItemData[] = [
  {
    id: 'chk-1',
    ordem: 1,
    categoria: 'extintores',
    item: 'Localização, classe e modelo de extintores conforme projeto de incêndio e pânico',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-2',
    ordem: 2,
    categoria: 'extintores',
    item: 'Suporte e Altura de instalação adequada (Máximo 1,60 m do piso acabado)',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Portátil'],
    status: 'Ativado'
  },
  {
    id: 'chk-3',
    ordem: 3,
    categoria: 'extintores',
    item: 'Equipamento desobstruído e de fácil acesso visual e físico',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-4',
    ordem: 4,
    categoria: 'extintores',
    item: 'Sinalização de parede visível e dentro da norma vigente NBR 13434',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-5',
    ordem: 5,
    categoria: 'extintores',
    item: 'Sinalização de piso visível e dentro da norma vigente NBR 13434',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-6',
    ordem: 6,
    categoria: 'extintores',
    item: 'Aspecto externo sem dano, amassado, vazamento ou corrosão no recipiente',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-7',
    ordem: 7,
    categoria: 'extintores',
    item: 'Lacre de segurança íntegro e sem violação',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-8',
    ordem: 8,
    categoria: 'extintores',
    item: 'Selo Inmetro e Etiquetas de validade/manutenção íntegros e legíveis',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-9',
    ordem: 9,
    categoria: 'extintores',
    item: 'Prazo de manutenção anual e teste hidrostático (5 anos) dentro da validade',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-10',
    ordem: 10,
    categoria: 'extintores',
    item: 'Prazo de pesagem semestral de CO2 dentro da validade e sem perda >10%',
    tiposAplicaveis: ['CO2'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-11',
    ordem: 11,
    categoria: 'extintores',
    item: 'Indicador de pressão (Manômetro) na faixa verde de operação',
    tiposAplicaveis: ['PQS', 'AP', 'Espuma', 'K'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-12',
    ordem: 12,
    categoria: 'extintores',
    item: 'Acessórios íntegros (mangueira, difusor, punho, gatilho e válvula)',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-13',
    ordem: 13,
    categoria: 'extintores',
    item: 'Mangueiras de descarga desobstruídas e sem ressecamento',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Todos'],
    status: 'Ativado'
  },
  {
    id: 'chk-14',
    ordem: 14,
    categoria: 'extintores',
    item: 'Conjunto de rodagem, mangueira longa e suporte de transporte conforme (Carreta)',
    tiposAplicaveis: ['Todos'],
    pesosAplicaveis: ['Carreta / Sobre Rodas'],
    status: 'Ativado'
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

  // Item sendo editado no formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemText, setItemText] = useState('');
  const [selectedTipos, setSelectedTipos] = useState<string[]>(['Todos']);
  const [selectedPesos, setSelectedPesos] = useState<string[]>(['Todos']);
  const [itemStatus, setItemStatus] = useState<'Ativado' | 'Desativado'>('Ativado');

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setList(initialItems);
    } else {
      setList(DEFAULT_EXTINTOR_CHECKLIST);
    }
  }, [initialItems, isOpen]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingId('NEW');
    setItemText('');
    setSelectedTipos(['Todos']);
    setSelectedPesos(['Todos']);
    setItemStatus('Ativado');
  };

  const handleStartEdit = (it: ChecklistItemData) => {
    setEditingId(it.id);
    setItemText(it.item);
    setSelectedTipos(it.tiposAplicaveis.length > 0 ? it.tiposAplicaveis : ['Todos']);
    setSelectedPesos(it.pesosAplicaveis.length > 0 ? it.pesosAplicaveis : ['Todos']);
    setItemStatus(it.status);
  };

  const handleSaveForm = () => {
    if (!itemText.trim()) {
      alert('Por favor, informe o texto da instrução do quesito NBR.');
      return;
    }

    if (editingId === 'NEW') {
      const newItem: ChecklistItemData = {
        id: `chk-${Date.now()}`,
        ordem: list.length + 1,
        categoria: 'extintores',
        item: itemText.trim(),
        tiposAplicaveis: selectedTipos.length > 0 ? selectedTipos : ['Todos'],
        pesosAplicaveis: selectedPesos.length > 0 ? selectedPesos : ['Todos'],
        status: itemStatus
      };
      setList((prev) => [...prev, newItem]);
    } else if (editingId) {
      setList((prev) =>
        prev.map((it) =>
          it.id === editingId
            ? {
                ...it,
                item: itemText.trim(),
                tiposAplicaveis: selectedTipos.length > 0 ? selectedTipos : ['Todos'],
                pesosAplicaveis: selectedPesos.length > 0 ? selectedPesos : ['Todos'],
                status: itemStatus
              }
            : it
        )
      );
    }
    setEditingId(null);
  };

  const handleToggleStatus = (id: string) => {
    setList((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, status: it.status === 'Ativado' ? 'Desativado' : 'Ativado' }
          : it
      )
    );
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este quesito do checklist?')) {
      setList((prev) => prev.filter((it) => it.id !== id));
      try {
        await deleteChecklistItemAction(id);
      } catch (err) {
        console.warn('Erro ao deletar item no banco:', err);
      }
    }
  };

  const handleMove = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const newList = [...list];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    // Atualiza ordens
    const reordered = newList.map((it, idx) => ({ ...it, ordem: idx + 1 }));
    setList(reordered);
  };

  const handleResetDefault = () => {
    if (confirm('Deseja restaurar a lista padrão de 14 itens da NBR 12962? Suas edições não salvas serão substituídas.')) {
      setList(DEFAULT_EXTINTOR_CHECKLIST);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const records = list.map((it, idx) => ({
        id: it.id,
        ordem: idx + 1,
        categoria: 'extintores',
        item: it.item,
        tipos_aplicaveis: it.tiposAplicaveis,
        pesos_aplicaveis: it.pesosAplicaveis,
        status: it.status
      }));

      const res = await saveChecklistItemsAction('extintores', records);
      if (!res.success) {
        throw new Error(res.error || 'Erro ao salvar no banco.');
      }

      onSaveSuccess(list);
      alert('Checklist NBR de Extintores atualizado e sincronizado com sucesso no Supabase!');
      onClose();
    } catch (err: any) {
      alert(`Aviso ao salvar no servidor (salvo em memória local): ${err.message || err}`);
      onSaveSuccess(list);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleArraySelection = (array: string[], item: string, setFn: (val: string[]) => void) => {
    if (item === 'Todos') {
      setFn(['Todos']);
      return;
    }
    let next = array.filter((x) => x !== 'Todos');
    if (next.includes(item)) {
      next = next.filter((x) => x !== item);
    } else {
      next.push(item);
    }
    if (next.length === 0) {
      setFn(['Todos']);
    } else {
      setFn(next);
    }
  };

  const filteredList = list.filter((it) => {
    const matchesSearch = it.item.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Todos' || it.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-5xl bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-800"
      >
        {/* CABEÇALHO DO MODAL */}
        <div className="bg-red-700 text-white p-4 sm:p-5 flex items-center justify-between border-b border-red-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                CHECKLIST - EXTINTORES (NBR 12962 / NBR 15808)
              </h2>
              <p className="text-[11px] text-red-100 font-sans mt-0.5">
                Configuração dos quesitos de verificação para vistoria Web e App de Ronda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
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
                className="w-full bg-white border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs font-sans text-slate-800 focus:outline-none focus:border-red-600 shadow-xs"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-200 py-1.5 px-3 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-red-600 shadow-xs"
            >
              <option value="Todos">Status: Todos</option>
              <option value="Ativado">🟢 Ativados</option>
              <option value="Desativado">🔴 Desativados</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleResetDefault}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Restaurar os 14 itens originais da NBR 12962"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Restaurar NBR</span>
            </button>
            <button
              onClick={handleStartAdd}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-sm"
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
              className="bg-red-50/70 border-b border-red-200 p-4 font-sans space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-red-700 uppercase flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4" />
                  {editingId === 'NEW' ? 'Cadastrar Novo Quesito NBR' : 'Editar Quesito do Checklist'}
                </span>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  Cancelar
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-600">
                  Descrição da Instrução / Verificação NBR *
                </label>
                <input
                  type="text"
                  value={itemText}
                  onChange={(e) => setItemText(e.target.value)}
                  placeholder="Ex: Suporte e altura de instalação adequada (Máximo 1,60 m)"
                  className="w-full bg-white border border-slate-300 focus:border-red-600 rounded-xl p-2.5 text-xs text-slate-800 font-bold shadow-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* FILTRO TIPO DE AGENTE EXTINTOR */}
                <div className="space-y-1 bg-white p-2.5 border border-slate-200 rounded-xl shadow-xs">
                  <label className="block text-[9px] font-mono font-bold uppercase text-slate-600 flex items-center gap-1">
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
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all ${
                            isSel
                              ? 'bg-red-600 text-white border-red-700 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
                  <label className="block text-[9px] font-mono font-bold uppercase text-slate-600 flex items-center gap-1">
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
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all ${
                            isSel
                              ? 'bg-red-600 text-white border-red-700 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {ps}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STATUS LIGA/DESLIGA */}
                <div className="space-y-1 bg-white p-2.5 border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
                  <label className="block text-[9px] font-mono font-bold uppercase text-slate-600">
                    Status do Quesito
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setItemStatus('Ativado')}
                      className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-lg border text-center transition-all ${
                        itemStatus === 'Ativado'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      🟢 Ativado
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemStatus('Desativado')}
                      className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-lg border text-center transition-all ${
                        itemStatus === 'Desativado'
                          ? 'bg-red-600 text-white border-red-700 shadow-xs'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
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
                  className="px-3 py-1.5 text-xs font-mono border border-slate-200 bg-white hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  className="px-4 py-1.5 text-xs font-mono font-bold bg-red-700 hover:bg-red-800 text-white rounded-xl shadow-sm"
                >
                  Confirmar Quesito
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TABELA DE QUESITOS DO CHECKLIST */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-mono text-[10px] uppercase text-slate-600">
                <th className="p-3 text-center w-16">Ordem</th>
                <th className="p-3 min-w-[280px]">Item / Quesito de Verificação NBR</th>
                <th className="p-3 text-center w-36">Tipo Agente</th>
                <th className="p-3 text-center w-36">Capacidade / Peso</th>
                <th className="p-3 text-center w-28">Status</th>
                <th className="p-3 text-center w-40">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-sans text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-mono text-xs">
                    Nenhum quesito encontrado para a busca.
                  </td>
                </tr>
              ) : (
                filteredList.map((it, idx) => {
                  const isDeactivated = it.status === 'Desativado';
                  return (
                    <tr
                      key={it.id}
                      className={`hover:bg-slate-50 transition-all ${
                        isDeactivated ? 'bg-slate-50/80 text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {/* ORDEM E BOTÕES MOVER */}
                      <td className="p-3 text-center font-mono font-bold text-slate-600">
                        <div className="flex items-center justify-center gap-1">
                          <span className="w-6 h-6 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-[11px]">
                            {it.ordem}
                          </span>
                          <div className="flex flex-col">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMove(idx, 'UP')}
                              className="text-slate-400 hover:text-red-600 disabled:opacity-20 p-0.5"
                              title="Mover para Cima"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={idx === filteredList.length - 1}
                              onClick={() => handleMove(idx, 'DOWN')}
                              className="text-slate-400 hover:text-red-600 disabled:opacity-20 p-0.5"
                              title="Mover para Baixo"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* TEXTO DO QUESITO */}
                      <td className="p-3 font-semibold text-slate-800 leading-snug">
                        {it.item}
                      </td>

                      {/* TIPOS APLICÁVEIS */}
                      <td className="p-3 text-center font-mono text-[10px]">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {it.tiposAplicaveis.map((tp) => (
                            <span
                              key={tp}
                              className={`px-1.5 py-0.5 rounded border ${
                                tp === 'Todos'
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-red-50 text-red-700 border-red-200 font-bold'
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
                              className={`px-1.5 py-0.5 rounded border ${
                                ps === 'Todos'
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
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
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            it.status === 'Ativado'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {it.status === 'Ativado' ? 'Ativado' : 'Desativado'}
                        </span>
                      </td>

                      {/* BOTÕES DE AÇÃO */}
                      <td className="p-3 text-center font-mono text-[11px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(it)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-xs"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggleStatus(it.id)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-white transition-all shadow-xs ${
                              it.status === 'Ativado'
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {it.status === 'Ativado' ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => handleDelete(it.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-all"
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
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between font-mono text-xs">
          <span className="text-slate-500 text-[11px]">
            Total de {list.length} quesitos ({list.filter((x) => x.status === 'Ativado').length} ativados)
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-all shadow-xs"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações no Supabase'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
