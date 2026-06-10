'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { supabase } from '@/lib/supabaseClient';
import { 
  Layers, 
  ArrowLeft, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Lock
} from 'lucide-react';

interface Setor {
  id: string;
  nome: string;
}

interface SubLocal {
  id: string;
  local_id: string;
  nome: string;
  created_at?: string;
  local_nome?: string; // Mapeado localmente
}

export default function GestaoSubLocaisPage() {
  const router = useRouter();
  const { userProfile, logSystemAction, triggerSuccessNotification } = useSpci();

  // RBAC
  const isDesenvolvedor = userProfile?.role === 'Desenvolvedor';

  // Estados de Dados
  const [setores, setSetores] = useState<Setor[]>([]);
  const [subLocais, setSubLocais] = useState<SubLocal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Estados dos Modais
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);

  // Estados dos Formulários
  const [selectedLocalId, setSelectedLocalId] = useState<string>('');
  const [newSubName, setNewSubName] = useState<string>('');
  const [selectedSubLocal, setSelectedSubLocal] = useState<SubLocal | null>(null);
  const [editLocalId, setEditLocalId] = useState<string>('');
  const [editSubName, setEditSubName] = useState<string>('');

  // Estados de Operação / Erro
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [deleteBlockReason, setDeleteBlockReason] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  // Carrega setores e sub_locais e junta em memória para robustez total
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 1. Buscar setores
      const { data: locales, error: locErr } = await supabase
        .from('locais')
        .select('*')
        .order('nome', { ascending: true });

      if (locErr) throw locErr;
      const loadedLocales = locales || [];
      setSetores(loadedLocales);
      if (loadedLocales.length > 0) {
        setSelectedLocalId(loadedLocales[0].id);
      }

      // 2. Buscar sub_locais
      const { data: subs, error: subErr } = await supabase
        .from('sub_locais')
        .select('*')
        .order('nome', { ascending: true });

      if (subErr) throw subErr;
      
      // Juntar nomes de setores em memória
      const mappedSubs = (subs || []).map((sub: any) => ({
        ...sub,
        local_nome: loadedLocales.find(l => l.id === sub.local_id)?.nome || 'SETOR DESCONHECIDO'
      }));

      setSubLocais(mappedSubs);

    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDesenvolvedor) {
      const timer = setTimeout(() => {
        loadData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isDesenvolvedor]);

  // Bloqueio de Acesso
  if (!isDesenvolvedor && userProfile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-6 text-center font-mono select-none"
        >
          <div className="w-16 h-16 bg-red-950/40 border border-red-900/60 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest">
            Acesso Restrito
          </h2>
          <p className="text-[10px] text-slate-400 font-sans leading-relaxed mt-3 px-2">
            Área restrita de tabelas auxiliares. Apenas credenciais com privilégios de <strong>Desenvolvedor SPCI</strong> podem acessar.
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

  // --- FILTRAGEM E PAGINAÇÃO ---
  const filteredSubLocais = subLocais.filter(sub => 
    sub.nome.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    sub.local_nome?.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const totalPages = Math.ceil(filteredSubLocais.length / itemsPerPage);
  const paginatedSubLocais = filteredSubLocais.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- MÉTODOS CRUD ---

  // CREATE
  const handleCreateSubLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubName = newSubName.trim().toUpperCase();
    if (!selectedLocalId) {
      setValidationError("Por favor, selecione um Setor da Planta.");
      return;
    }
    if (!cleanSubName) {
      setValidationError("O nome do sub-local não pode ser vazio.");
      return;
    }

    if (subLocais.some(s => s.nome === cleanSubName && s.local_id === selectedLocalId)) {
      setValidationError("Este sub-local já existe neste setor.");
      return;
    }

    try {
      setIsSaving(true);
      setValidationError(null);

      const { data, error } = await supabase
        .from('sub_locais')
        .insert({
          local_id: selectedLocalId,
          nome: cleanSubName
        })
        .select('*')
        .single();

      if (error) throw error;

      const sectorName = setores.find(l => l.id === selectedLocalId)?.nome || 'SETOR DESCONHECIDO';
      const mappedNewObj = {
        ...data,
        local_nome: sectorName
      };

      setSubLocais(prev => [...prev, mappedNewObj].sort((a, b) => a.nome.localeCompare(b.nome)));
      setIsCreateOpen(false);
      setNewSubName('');
      triggerSuccessNotification("Sucesso! 🎉", `Sub-local "${cleanSubName}" criado com sucesso.`);

      await logSystemAction(
        'CRIAR_SUB_LOCAL',
        'sub_locais',
        undefined,
        `Criado sub-local "${cleanSubName}" no setor "${sectorName}".`
      ).catch(console.error);

    } catch (err: any) {
      console.error(err);
      setValidationError("Erro ao cadastrar sub-local.");
    } finally {
      setIsSaving(false);
    }
  };

  // UPDATE
  const handleEditSubLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubLocal) return;

    const cleanSubName = editSubName.trim().toUpperCase();
    if (!editLocalId) {
      setValidationError("Selecione um Setor da Planta.");
      return;
    }
    if (!cleanSubName) {
      setValidationError("O nome do sub-local não pode ser vazio.");
      return;
    }

    if (subLocais.some(s => s.nome === cleanSubName && s.local_id === editLocalId && s.id !== selectedSubLocal.id)) {
      setValidationError("Já existe este sub-local neste setor.");
      return;
    }

    try {
      setIsSaving(true);
      setValidationError(null);

      const { error } = await supabase
        .from('sub_locais')
        .update({
          local_id: editLocalId,
          nome: cleanSubName
        })
        .eq('id', selectedSubLocal.id);

      if (error) throw error;

      const sectorName = setores.find(l => l.id === editLocalId)?.nome || 'SETOR DESCONHECIDO';
      
      setSubLocais(prev => prev.map(s => s.id === selectedSubLocal.id ? { 
        ...s, 
        nome: cleanSubName, 
        local_id: editLocalId, 
        local_nome: sectorName 
      } : s).sort((a, b) => a.nome.localeCompare(b.nome)));

      setIsEditOpen(false);
      setSelectedSubLocal(null);
      setEditSubName('');
      triggerSuccessNotification("Atualizado! 📝", `Sub-local alterado com sucesso.`);

      await logSystemAction(
        'EDITAR_SUB_LOCAL',
        'sub_locais',
        undefined,
        `Sub-local "${selectedSubLocal.nome}" editado para "${cleanSubName}" (setor "${sectorName}").`
      ).catch(console.error);

    } catch (err: any) {
      console.error(err);
      setValidationError("Erro ao atualizar sub-local.");
    } finally {
      setIsSaving(false);
    }
  };

  // DELETE REFERENCE CHECK & SUBMIT
  const handleOpenDelete = async (sub: SubLocal) => {
    setSelectedSubLocal(sub);
    setDeleteBlockReason(null);
    setIsDeleteOpen(true);
    setLoading(true);

    try {
      // 1. Verificar extintores vinculados a este sub_local_id
      const { data: exts, error: extErr } = await supabase
        .from('ativos_extintores')
        .select('id')
        .eq('sub_local_id', sub.id)
        .limit(1);

      if (extErr) throw extErr;
      if (exts && exts.length > 0) {
        setDeleteBlockReason("Existem Extintores vinculados a este Sub-Local. Remaneje os ativos primeiro.");
        setLoading(false);
        return;
      }

      // 2. Verificar ativos gerais vinculados por nome (subLocation === sub.nome) no mesmo setor
      const { data: assetsList, error: assetErr } = await supabase
        .from('assets')
        .select('id')
        .eq('sub_location', sub.nome)
        .eq('location', sub.local_nome || '')
        .limit(1);

      if (assetErr) throw assetErr;
      if (assetsList && assetsList.length > 0) {
        setDeleteBlockReason("Existem Ativos Gerais vinculados a este Sub-Local. Remaneje-os antes de deletar.");
        setLoading(false);
        return;
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubLocal = async () => {
    if (!selectedSubLocal) return;
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('sub_locais')
        .delete()
        .eq('id', selectedSubLocal.id);

      if (error) throw error;

      setSubLocais(prev => prev.filter(s => s.id !== selectedSubLocal.id));
      setIsDeleteOpen(false);
      setSelectedSubLocal(null);
      triggerSuccessNotification("Removido! 🗑️", "Sub-local excluído com sucesso.");

      await logSystemAction(
        'EXCLUIR_SUB_LOCAL',
        'sub_locais',
        undefined,
        `Excluído sub-local "${selectedSubLocal.nome}" do setor "${selectedSubLocal.local_nome}".`
      ).catch(console.error);

    } catch (err: any) {
      console.error(err);
      alert("Erro ao excluir o sub-local.");
    } finally {
      setIsSaving(false);
    }
  };

  // Carrega logs de auditoria específicos de sub-locais
  const loadAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const { data, error } = await supabase
        .from('logs_auditoria')
        .select('*')
        .in('acao', ['CRIAR_SUB_LOCAL', 'EDITAR_SUB_LOCAL', 'EXCLUIR_SUB_LOCAL'])
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setAuditLogs(data || []);
      setIsAuditOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <div className="space-y-6 select-none font-sans text-slate-800">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button 
            onClick={() => router.push('/gestao-ativo')}
            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider bg-transparent border-none cursor-pointer mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar à Gestão
          </button>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-sky-500/10 rounded-lg text-sky-600">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-['Hanken_Grotesk'] font-extrabold tracking-tight text-slate-900 uppercase">
              Sub-Locais (Posições Físicas)
            </h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Cadastro e controle de áreas internas, salas e posições físicas associadas a cada setor.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button 
            onClick={() => {
              setNewSubName('');
              setValidationError(null);
              setIsCreateOpen(true);
            }}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all active:scale-[0.98] border-none flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nova Sub-Localização
          </button>
          <button 
            onClick={loadAuditLogs}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer border border-slate-200/60 transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" /> Relatório de Edições
          </button>
        </div>
      </div>

      {/* PAINEL DE TABELA */}
      <div className="bg-white/65 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-xs p-6 space-y-4">
        
        {/* Filtros e Busca */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Mostrando {filteredSubLocais.length} sub-locais cadastrados
          </span>
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Pesquisar sub-local ou setor..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-red-500 focus:bg-white text-slate-800"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-sky-500" />
              <span className="text-xs font-mono uppercase tracking-widest">Acessando base de sub-locais...</span>
            </div>
          ) : paginatedSubLocais.length === 0 ? (
            <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <p className="text-2xl mb-1">🔍</p>
              <p className="text-xs uppercase font-mono tracking-wider">Nenhum sub-local localizado.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="py-3.5 px-4 rounded-l-xl">Sub-Local (Posição Física)</th>
                  <th className="py-3.5 px-4">Setor da Planta</th>
                  <th className="py-3.5 px-4 text-right rounded-r-xl w-36">Ação</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubLocais.map((sub) => (
                  <tr 
                    key={sub.id}
                    className="border-b border-slate-100/50 hover:bg-slate-50/40 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-800 uppercase tracking-wide">
                      {sub.nome}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {sub.local_nome}
                    </td>
                    <td className="py-3.5 px-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedSubLocal(sub);
                          setEditLocalId(sub.local_id);
                          setEditSubName(sub.nome);
                          setValidationError(null);
                          setIsEditOpen(true);
                        }}
                        className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer transition-colors shadow-sm active:scale-95 border-none flex items-center justify-center"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-wider ml-1 px-0.5">Editar</span>
                      </button>
                      <button
                        onClick={() => handleOpenDelete(sub)}
                        className="p-2 bg-red-655 hover:bg-red-700 text-white rounded-lg cursor-pointer transition-colors shadow-sm active:scale-95 border-none flex items-center justify-center"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-wider ml-1 px-0.5">Remover</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Página {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Anterior
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL 1: CRIAR SUB-LOCAL --- */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl relative overflow-hidden"
            >
              <div className="h-1.5 w-full bg-sky-500" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                  Nova Sub-Localização
                </h3>
                <button 
                  onClick={() => setIsCreateOpen(false)}
                  className="text-slate-400 hover:text-slate-700 border border-slate-200 bg-white p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubLocal} className="p-6 space-y-4">
                <p className="text-[10px] font-sans text-rose-600 font-bold uppercase tracking-wider mb-2">Preencher todos os campos obrigatórios! (*)</p>
                
                {validationError && (
                  <div className="p-2.5 border border-red-200 bg-red-50 text-red-700 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> {validationError}
                  </div>
                )}

                {/* Localização / SetorDropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500">
                    Nome da localização *
                  </label>
                  <select 
                    value={selectedLocalId}
                    onChange={(e) => setSelectedLocalId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none font-bold text-slate-800 focus:border-sky-500 cursor-pointer"
                    required
                  >
                    {setores.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Sub local nome */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500">
                    Nome da sub localização *
                  </label>
                  <input 
                    type="text" 
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="NOME DA SUB LOCALIZAÇÃO"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none font-bold uppercase text-slate-800 focus:border-sky-500"
                    required
                  />
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateOpen(false)}
                    className="text-slate-500 hover:text-slate-800 text-[10px] font-bold uppercase tracking-wider underline decoration-dotted transition-all cursor-pointer bg-transparent border-none"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-md border-none flex items-center justify-center w-36"
                  >
                    {isSaving ? "Cadastrando..." : "Cadastrar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: EDITAR SUB-LOCAL --- */}
      <AnimatePresence>
        {isEditOpen && selectedSubLocal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl relative overflow-hidden"
            >
              <div className="h-1.5 w-full bg-emerald-500" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                  Editar Sub-Localização
                </h3>
                <button 
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelectedSubLocal(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 border border-slate-200 bg-white p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleEditSubLocal} className="p-6 space-y-4">
                {validationError && (
                  <div className="p-2.5 border border-red-200 bg-red-50 text-red-700 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> {validationError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500">
                    Setor da Planta *
                  </label>
                  <select 
                    value={editLocalId}
                    onChange={(e) => setEditLocalId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none font-bold text-slate-800 focus:border-emerald-500 cursor-pointer"
                    required
                  >
                    {setores.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500">
                    Sub-Local (Posição Física) *
                  </label>
                  <input 
                    type="text" 
                    value={editSubName}
                    onChange={(e) => setEditSubName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none font-bold uppercase text-slate-800 focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsEditOpen(false);
                      setSelectedSubLocal(null);
                    }}
                    className="text-slate-500 hover:text-slate-800 text-[10px] font-bold uppercase tracking-wider underline decoration-dotted transition-all cursor-pointer bg-transparent border-none"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSaving ? "Atualizando..." : "Salvar Alterações"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: EXCLUSÃO --- */}
      <AnimatePresence>
        {isDeleteOpen && selectedSubLocal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl relative overflow-hidden"
            >
              <div className="h-1.5 w-full bg-red-655" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest text-red-655">
                  Remover Sub-Local
                </h3>
                <button 
                  onClick={() => {
                    setIsDeleteOpen(false);
                    setSelectedSubLocal(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 border border-slate-200 bg-white p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">Validando integridade...</span>
                  </div>
                ) : deleteBlockReason ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[10px] font-sans leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block uppercase tracking-wide mb-1 font-mono">EXCLUSÃO BLOQUEADA</strong>
                        {deleteBlockReason}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setIsDeleteOpen(false);
                        setSelectedSubLocal(null);
                      }}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                    >
                      Entendido
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 font-sans leading-relaxed">
                      Tem certeza que deseja excluir o sub-local <strong className="font-mono text-slate-950 uppercase">&quot;{selectedSubLocal.nome}&quot;</strong> (do setor <strong className="font-mono text-slate-800 uppercase">&quot;{selectedSubLocal.local_nome}&quot;</strong>)? Esta operação é irreversível.
                    </p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsDeleteOpen(false);
                          setSelectedSubLocal(null);
                        }}
                        className="text-slate-500 hover:text-slate-800 text-[10px] font-bold uppercase tracking-wider underline decoration-dotted transition-all cursor-pointer bg-transparent border-none"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleDeleteSubLocal}
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-red-655 hover:bg-red-750 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {isSaving ? "Excluindo..." : "Confirmar Exclusão"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 4: RELATÓRIO DE EDIÇÕES (AUDITORIA LOCAL) --- */}
      <AnimatePresence>
        {isAuditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="h-1.5 w-full bg-slate-600" />
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                  Relatório de Edições - Sub-Locais
                </h3>
                <button 
                  onClick={() => setIsAuditOpen(false)}
                  className="text-slate-400 hover:text-slate-700 border border-slate-200 bg-white p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-3 flex-grow no-scrollbar">
                {loadingAudit ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">Carregando logs...</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-xs uppercase font-mono tracking-wider">Nenhum log de auditoria encontrado.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 text-slate-700">
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                          <span>Ação: {log.acao}</span>
                          <span>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900">{log.detalhes}</p>
                        <p className="text-[9px] text-slate-400">Usuário: {log.usuario_nome || log.usuario_email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-right shrink-0">
                <button 
                  onClick={() => setIsAuditOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
