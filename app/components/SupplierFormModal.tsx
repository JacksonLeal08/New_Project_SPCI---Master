'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Building2,
  Award,
  Phone,
  Mail,
  MapPin,
  FileText,
  Check,
  AlertCircle,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { FornecedorRecord, saveSupplierAction, SaveSupplierPayload } from '@/app/actions/supplierActions';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit?: FornecedorRecord | null;
  onSavedSuccess: (supplier: FornecedorRecord) => void;
}

export default function SupplierFormModal({
  isOpen,
  onClose,
  supplierToEdit,
  onSavedSuccess,
}: SupplierFormModalProps) {
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [registroInmetro, setRegistroInmetro] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [contatoResponsavel, setContatoResponsavel] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidadeUf, setCidadeUf] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ativo, setAtivo] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (supplierToEdit) {
      setRazaoSocial(supplierToEdit.razao_social || '');
      setNomeFantasia(supplierToEdit.nome_fantasia || '');
      setCnpj(supplierToEdit.cnpj || '');
      setRegistroInmetro(supplierToEdit.registro_inmetro || '');
      setTelefone(supplierToEdit.telefone || '');
      setWhatsapp(supplierToEdit.whatsapp || '');
      setEmail(supplierToEdit.email || '');
      setContatoResponsavel(supplierToEdit.contato_responsavel || '');
      setEndereco(supplierToEdit.endereco || '');
      setCidadeUf(supplierToEdit.cidade_uf || '');
      setObservacoes(supplierToEdit.observacoes || '');
      setAtivo(supplierToEdit.ativo !== undefined ? supplierToEdit.ativo : true);
    } else {
      setRazaoSocial('');
      setNomeFantasia('');
      setCnpj('');
      setRegistroInmetro('');
      setTelefone('');
      setWhatsapp('');
      setEmail('');
      setContatoResponsavel('');
      setEndereco('');
      setCidadeUf('');
      setObservacoes('');
      setAtivo(true);
    }
    setErrorMsg(null);
  }, [supplierToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim()) {
      setErrorMsg('A Razão Social da empresa é obrigatória.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const payload: SaveSupplierPayload = {
        id: supplierToEdit?.id,
        razao_social: razaoSocial.trim(),
        nome_fantasia: nomeFantasia.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        registro_inmetro: registroInmetro.trim() || undefined,
        telefone: telefone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        contato_responsavel: contatoResponsavel.trim() || undefined,
        endereco: endereco.trim() || undefined,
        cidade_uf: cidadeUf.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        ativo,
      };

      const res = await saveSupplierAction(payload);

      if (!res.success || !res.supplier) {
        throw new Error(res.error || 'Falha ao salvar fornecedor.');
      }

      onSavedSuccess(res.supplier);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar prestador de serviços.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Topo do Modal */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block">
                CADASTRO DE PRESTADORES SPCI
              </span>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight font-['Hanken_Grotesk']">
                {supplierToEdit ? 'Editar Empresa Prestadora' : 'Novo Fornecedor / Recarregadora'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Bento Grid */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs font-sans">
          
          {/* Razão Social & Nome Fantasia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Razão Social da Empresa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                placeholder="Ex: Extinwal Comércio e Manutenção Ltda"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Nome Fantasia (Exibição)
              </label>
              <input
                type="text"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                placeholder="Ex: Extinwal Segurança"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                CNPJ
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>
          </div>

          {/* Registro INMETRO & Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Registro INMETRO (Portaria 500/2012)
              </label>
              <input
                type="text"
                value={registroInmetro}
                onChange={(e) => setRegistroInmetro(e.target.value)}
                placeholder="Ex: INMETRO 004821/2024"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Contato Técnico / Responsável
              </label>
              <input
                type="text"
                value={contatoResponsavel}
                onChange={(e) => setContatoResponsavel(e.target.value)}
                placeholder="Ex: Eng. Roberto Silva"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 font-sans"
              />
            </div>
          </div>

          {/* Telefones & E-mail */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Telefone Comercial
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 3456-7890"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                WhatsApp / Plantão
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                E-mail para Romaneios
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com.br"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 font-sans"
              />
            </div>
          </div>

          {/* Endereço & Cidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Endereço Operacional / Base de Recarga
              </label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Av. Industrial, 1200 - Galpão 4"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Cidade / UF
              </label>
              <input
                type="text"
                value={cidadeUf}
                onChange={(e) => setCidadeUf(e.target.value)}
                placeholder="São Paulo / SP"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 font-sans"
              />
            </div>
          </div>

          {/* Observações & Status Ativo */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="supplier-active-check"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
              <label htmlFor="supplier-active-check" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                Fornecedor Ativo (Habilitado para seleção nos lotes)
              </label>
            </div>
          </div>

          {/* Mensagem de Erro se houver */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Rodapé com CTA */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 font-mono">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-bold transition-all cursor-pointer bg-transparent border-none"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-950/20 flex items-center gap-2 cursor-pointer border-none disabled:opacity-50 active:scale-95"
            >
              <span>{saving ? 'Gravando...' : supplierToEdit ? 'Salvar Alterações' : 'Cadastrar Prestador'}</span>
              <Check className="w-4 h-4" />
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
