'use client';

import React, { useState, useEffect } from 'react';
import ExecutiveWindowModal from './ExecutiveWindowModal';
import { ContratoSite, createContractAction, updateContractAction } from '@/app/actions/contractActions';
import { Building2, MapPin, PhoneCall, Image as ImageIcon, Save, AlertCircle } from 'lucide-react';

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedContract?: ContratoSite) => void;
  contractToEdit?: ContratoSite | null;
  theme?: 'dark' | 'light';
}

export default function ContractFormModal({
  isOpen,
  onClose,
  onSuccess,
  contractToEdit,
  theme = 'light'
}: ContractFormModalProps) {
  const isEditing = Boolean(contractToEdit);

  const [nome, setNome] = useState('');
  const [codigoSlug, setCodigoSlug] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cidadeUf, setCidadeUf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [telefoneEmergencia, setTelefoneEmergencia] = useState('');
  const [emailGestor, setEmailGestor] = useState('');
  const [whatsappGestor, setWhatsappGestor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [status, setStatus] = useState<'ATIVO' | 'EM IMPLANTAÇÃO' | 'ENCERRADO'>('ATIVO');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (contractToEdit) {
      setNome(contractToEdit.nome || '');
      setCodigoSlug(contractToEdit.codigo_slug || '');
      setRazaoSocial(contractToEdit.razao_social || '');
      setCnpj(contractToEdit.cnpj || '');
      setCidadeUf(contractToEdit.cidade_uf || '');
      setEndereco(contractToEdit.endereco || '');
      setLatitude(contractToEdit.latitude !== undefined && contractToEdit.latitude !== null ? String(contractToEdit.latitude) : '');
      setLongitude(contractToEdit.longitude !== undefined && contractToEdit.longitude !== null ? String(contractToEdit.longitude) : '');
      setTelefoneEmergencia(contractToEdit.telefone_emergencia || '');
      setEmailGestor(contractToEdit.email_gestor || '');
      setWhatsappGestor(contractToEdit.whatsapp_gestor || '');
      setLogoUrl(contractToEdit.logo_url || '');
      setStatus(contractToEdit.status || 'ATIVO');
      setIsDirty(false);
    } else {
      setNome('');
      setCodigoSlug('');
      setRazaoSocial('');
      setCnpj('');
      setCidadeUf('');
      setEndereco('');
      setLatitude('-5.8117');
      setLongitude('-50.5369');
      setTelefoneEmergencia('');
      setEmailGestor('');
      setWhatsappGestor('');
      setLogoUrl('');
      setStatus('ATIVO');
      setIsDirty(false);
    }
    setErrorMsg(null);
  }, [contractToEdit, isOpen]);

  const handleNomeChange = (val: string) => {
    setNome(val);
    setIsDirty(true);
    // Auto-gera o slug se for novo cadastro
    if (!isEditing) {
      const generated = val.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      setCodigoSlug(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanNome = nome.trim().toUpperCase();
    const cleanSlug = codigoSlug.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');

    if (!cleanNome) {
      setErrorMsg('O Nome Operacional do Site é obrigatório.');
      return;
    }
    if (!cleanSlug) {
      setErrorMsg('O Código Identificador (Slug) é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const latNum = latitude.trim() ? parseFloat(latitude.trim()) : null;
      const lngNum = longitude.trim() ? parseFloat(longitude.trim()) : null;

      if (isEditing && contractToEdit) {
        const res = await updateContractAction(contractToEdit.id, {
          nome: cleanNome,
          razao_social: razaoSocial.trim(),
          cnpj: cnpj.trim(),
          cidade_uf: cidadeUf.trim(),
          endereco: endereco.trim(),
          latitude: isNaN(latNum as any) ? null : latNum,
          longitude: isNaN(lngNum as any) ? null : lngNum,
          telefone_emergencia: telefoneEmergencia.trim(),
          email_gestor: emailGestor.trim(),
          whatsapp_gestor: whatsappGestor.trim(),
          logo_url: logoUrl.trim(),
          status: status
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Falha ao atualizar contrato.');
          return;
        }
        setIsDirty(false);
        onSuccess();
        onClose();
      } else {
        const res = await createContractAction({
          nome: cleanNome,
          codigo_slug: cleanSlug,
          razao_social: razaoSocial.trim(),
          cnpj: cnpj.trim(),
          cidade_uf: cidadeUf.trim(),
          endereco: endereco.trim(),
          latitude: isNaN(latNum as any) ? null : latNum,
          longitude: isNaN(lngNum as any) ? null : lngNum,
          telefone_emergencia: telefoneEmergencia.trim(),
          email_gestor: emailGestor.trim(),
          whatsapp_gestor: whatsappGestor.trim(),
          logo_url: logoUrl.trim(),
          status: status
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Falha ao cadastrar novo contrato.');
          return;
        }
        setIsDirty(false);
        onSuccess(res.contrato);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao salvar contrato.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = `w-full rounded-xl p-2.5 text-xs font-mono font-bold transition-all focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-600 border ${
    theme === 'dark'
      ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500'
      : 'bg-white border-slate-300 text-slate-950 placeholder:text-slate-400 shadow-xs'
  }`;

  const labelStyle = 'block text-[9px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-zinc-300';
  const cardSectionStyle = `p-4 rounded-2xl border space-y-3.5 ${
    theme === 'dark'
      ? 'bg-zinc-950/40 border-zinc-800/80'
      : 'bg-slate-50/70 border-slate-200'
  }`;

  return (
    <ExecutiveWindowModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar Contrato: ${contractToEdit?.nome}` : 'Novo Contrato / Site Operacional'}
      subtitle={isEditing ? 'Atualize contatos, branding e coordenadas da unidade' : 'Cadastre um novo Site raiz para isolamento multi-tenant'}
      icon={<Building2 size={18} />}
      maxWidth="4xl"
      isDirty={isDirty}
      theme={theme}
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-md shadow-red-600/30 flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={14} />
                {isEditing ? 'Atualizar Contrato' : 'Cadastrar Contrato'}
              </>
            )}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. DADOS CORPORATIVOS */}
        <div className={cardSectionStyle}>
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
            <span className="text-red-600 dark:text-rose-500 font-bold">🏢</span>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-zinc-100">
              Dados Corporativos & Identificação
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className={labelStyle}>Razão Social do Cliente *</label>
              <input
                type="text"
                required
                value={razaoSocial}
                onChange={(e) => { setRazaoSocial(e.target.value); setIsDirty(true); }}
                placeholder="Ex: VALE S.A. - DIVISÃO DE FERRO E METAIS"
                className={inputStyle}
              />
            </div>

            <div>
              <label className={labelStyle}>Nome Operacional do Site *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                placeholder="Ex: SALOBO"
                className={inputStyle}
              />
            </div>

            <div>
              <label className={labelStyle}>
                Código Identificador (Slug) *
                {isEditing && <span className="text-amber-500 text-[8px] ml-1">(Imutável)</span>}
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={codigoSlug}
                onChange={(e) => {
                  setCodigoSlug(e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''));
                  setIsDirty(true);
                }}
                placeholder="Ex: SALOBO"
                title={isEditing ? 'O slug do contrato é imutável após a criação para garantir a integridade dos ativos vinculados.' : ''}
                className={`${inputStyle} ${isEditing ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-zinc-800' : ''}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelStyle}>CNPJ da Unidade</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => { setCnpj(e.target.value); setIsDirty(true); }}
                placeholder="00.000.000/0000-00"
                className={inputStyle}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelStyle}>Status Operacional</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value as any); setIsDirty(true); }}
                className={inputStyle}
              >
                <option value="ATIVO">🟢 ATIVO (Operação Normal & Vistorias)</option>
                <option value="EM IMPLANTAÇÃO">🟡 EM IMPLANTAÇÃO (Mapeamento Inicial)</option>
                <option value="ENCERRADO">🔴 ENCERRADO (Desativado / Histórico Auditável)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. LOCALIZAÇÃO E ANCORAGEM GPS DO MAPA */}
        <div className={cardSectionStyle}>
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
            <span className="text-red-600 dark:text-rose-500 font-bold">📍</span>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-zinc-100">
              Localização & Ancoragem do Mapa Operacional
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelStyle}>Cidade / UF</label>
              <input
                type="text"
                value={cidadeUf}
                onChange={(e) => { setCidadeUf(e.target.value); setIsDirty(true); }}
                placeholder="Ex: Marabá / Parauapebas - PA"
                className={inputStyle}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelStyle}>Endereço Completo / Rodovia de Acesso</label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => { setEndereco(e.target.value); setIsDirty(true); }}
                placeholder="Ex: Rodovia PA-160, Km 45 - Complexo Industrial Mina de Cobre"
                className={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className={labelStyle}>Latitude Central (GPS Ancoragem)</label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => { setLatitude(e.target.value); setIsDirty(true); }}
                placeholder="Ex: -5.8117"
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Longitude Central (GPS Ancoragem)</label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => { setLongitude(e.target.value); setIsDirty(true); }}
                placeholder="Ex: -50.5369"
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* 3. CONTATOS OPERACIONAIS & EMERGÊNCIA (CECOM) */}
        <div className={cardSectionStyle}>
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
            <span className="text-red-600 dark:text-rose-500 font-bold">🚨</span>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-zinc-100">
              Contatos de Emergência & CECOM
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelStyle}>Central de Emergência (CECOM)</label>
              <input
                type="text"
                value={telefoneEmergencia}
                onChange={(e) => { setTelefoneEmergencia(e.target.value); setIsDirty(true); }}
                placeholder="Ex: (94) 3328-7000 / Ramal 193"
                className={inputStyle}
              />
            </div>

            <div>
              <label className={labelStyle}>E-mail do Gestor do Contrato</label>
              <input
                type="email"
                value={emailGestor}
                onChange={(e) => { setEmailGestor(e.target.value); setIsDirty(true); }}
                placeholder="gestor.contrato@empresa.com"
                className={inputStyle}
              />
            </div>

            <div>
              <label className={labelStyle}>WhatsApp de Notificação de Anomalias</label>
              <input
                type="text"
                value={whatsappGestor}
                onChange={(e) => { setWhatsappGestor(e.target.value); setIsDirty(true); }}
                placeholder="(94) 99123-4567"
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* 4. BRANDING & IDENTIDADE VISUAL */}
        <div className={cardSectionStyle}>
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
            <span className="text-red-600 dark:text-rose-500 font-bold">🎨</span>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-zinc-100">
              Branding do Cliente & Logotipo
            </h4>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-16 h-16 rounded-2xl border flex items-center justify-center p-2 bg-white shrink-0 overflow-hidden shadow-sm">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-2xl text-slate-400">🏭</span>
              )}
            </div>

            <div className="flex-1 w-full space-y-1">
              <label className={labelStyle}>URL do Logotipo do Cliente (PNG Transparente)</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => { setLogoUrl(e.target.value); setIsDirty(true); }}
                placeholder="https://exemplo.com/logo-empresa.png"
                className={inputStyle}
              />
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans">
                O logo será exibido nos cabeçalhos de relatórios executivos de vistoria e etiquetas QR Code.
              </p>
            </div>
          </div>
        </div>
      </form>
    </ExecutiveWindowModal>
  );
}
