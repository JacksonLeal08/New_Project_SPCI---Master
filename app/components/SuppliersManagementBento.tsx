'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Edit3,
  Trash2,
  CheckCircle2,
  Power,
  MessageCircle,
  FileText,
  UserCheck
} from 'lucide-react';
import {
  FornecedorRecord,
  getSuppliersAction,
  deleteSupplierAction,
  toggleSupplierStatusAction
} from '@/app/actions/supplierActions';
import SupplierFormModal from './SupplierFormModal';

export default function SuppliersManagementBento() {
  const [suppliers, setSuppliers] = useState<FornecedorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<FornecedorRecord | null>(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSuppliersAction();
      if (res.success && res.suppliers) {
        setSuppliers(res.suppliers);
      }
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleToggleStatus = async (supplier: FornecedorRecord) => {
    try {
      const newStatus = !supplier.ativo;
      const res = await toggleSupplierStatusAction(supplier.id, newStatus);
      if (res.success) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === supplier.id ? { ...s, ativo: newStatus } : s))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o prestador "${name}"?`)) return;
    try {
      const res = await deleteSupplierAction(id);
      if (res.success) {
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (filterActiveOnly && !s.ativo) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.razao_social.toLowerCase().includes(term) ||
      (s.nome_fantasia && s.nome_fantasia.toLowerCase().includes(term)) ||
      (s.cnpj && s.cnpj.toLowerCase().includes(term)) ||
      (s.registro_inmetro && s.registro_inmetro.toLowerCase().includes(term)) ||
      (s.cidade_uf && s.cidade_uf.toLowerCase().includes(term))
    );
  });

  const totalAtivos = suppliers.filter((s) => s.ativo).length;
  const totalInmetro = suppliers.filter((s) => s.registro_inmetro && s.registro_inmetro.trim()).length;

  return (
    <div className="space-y-6 font-mono select-none text-xs">
      
      {/* Barra Superior com Métricas e Botão de Novo Fornecedor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Prestadores</span>
            <strong className="text-base text-slate-900 dark:text-slate-100 font-black">{suppliers.length} Cadastrados</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Prestadores Ativos</span>
            <strong className="text-base text-emerald-600 dark:text-emerald-400 font-black">{totalAtivos} Habilitados</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Homologação INMETRO</span>
            <strong className="text-base text-amber-600 dark:text-amber-400 font-black">{totalInmetro} Certificados</strong>
          </div>
        </div>
      </div>

      {/* Controles de Busca & Botão de Criação */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <input
              type="text"
              placeholder="Buscar por Razão, Fantasia, CNPJ ou INMETRO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-sans"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            onClick={() => setFilterActiveOnly(!filterActiveOnly)}
            className={`px-3 py-2 rounded-xl font-bold text-[11px] transition-all cursor-pointer border-none ${
              filterActiveOnly
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {filterActiveOnly ? 'Apenas Ativos ✓' : 'Todos os Status'}
          </button>

          <button
            onClick={fetchSuppliers}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer border-none shadow-xs"
            title="Recarregar Prestadores"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingSupplier(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer border-none active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Fornecedor</span>
        </button>
      </div>

      {/* Grid Bento de Fornecedores */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[11px] font-bold uppercase tracking-wider">Carregando Fornecedores Cadastrados...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase">
            Nenhum Prestador Encontrado
          </h3>
          <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto leading-relaxed">
            Clique no botão acima para cadastrar a primeira empresa prestadora de serviços e recarga.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => {
            return (
              <motion.div
                key={supplier.id}
                whileHover={{ y: -3 }}
                className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                  supplier.ativo
                    ? 'border-slate-200 dark:border-slate-800'
                    : 'border-slate-200 dark:border-slate-800/40 opacity-70 bg-slate-50/50 dark:bg-slate-950/40'
                }`}
              >
                {/* Topo do Card */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-['Hanken_Grotesk'] font-black text-sm text-slate-900 dark:text-slate-100 leading-tight">
                        {supplier.nome_fantasia || supplier.razao_social}
                      </h3>
                      {supplier.nome_fantasia && (
                        <span className="text-[10px] text-slate-500 font-sans block truncate max-w-[220px]" title={supplier.razao_social}>
                          {supplier.razao_social}
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                        supplier.ativo
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {supplier.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* Badges de Identificação */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {supplier.cnpj && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-mono font-bold">
                        CNPJ: {supplier.cnpj}
                      </span>
                    )}

                    {supplier.registro_inmetro && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-[10px] text-amber-700 dark:text-amber-400 font-mono font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 shrink-0" />
                        {supplier.registro_inmetro}
                      </span>
                    )}
                  </div>

                  {/* Informações de Contato e Localização */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-sans text-slate-600 dark:text-slate-400">
                    {supplier.contato_responsavel && (
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{supplier.contato_responsavel}</span>
                      </div>
                    )}

                    {supplier.cidade_uf && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{supplier.cidade_uf} {supplier.endereco ? `• ${supplier.endereco}` : ''}</span>
                      </div>
                    )}

                    {supplier.telefone && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{supplier.telefone}</span>
                      </div>
                    )}

                    {supplier.email && (
                      <div className="flex items-center gap-1.5 font-sans truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé de Ações do Card */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {supplier.whatsapp && (
                      <a
                        href={`https://wa.me/55${supplier.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-all"
                        title="Falar no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {supplier.email && (
                      <a
                        href={`mailto:${supplier.email}`}
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 transition-all"
                        title="Enviar E-mail"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(supplier)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border-none bg-transparent"
                      title={supplier.ativo ? 'Desativar Fornecedor' : 'Ativar Fornecedor'}
                    >
                      <Power className={`w-3.5 h-3.5 ${supplier.ativo ? 'text-emerald-500' : 'text-slate-400'}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupplier(supplier);
                        setIsModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border-none"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(supplier.id, supplier.nome_fantasia || supplier.razao_social)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer border-none bg-transparent"
                      title="Excluir Fornecedor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de Formulário de Fornecedor */}
      {isModalOpen && (
        <SupplierFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSupplier(null);
          }}
          supplierToEdit={editingSupplier}
          onSavedSuccess={() => {
            fetchSuppliers();
          }}
        />
      )}

    </div>
  );
}
