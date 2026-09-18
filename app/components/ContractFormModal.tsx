'use client';

import React, { useState, useEffect, useRef } from 'react';
import ExecutiveWindowModal from './ExecutiveWindowModal';
import { ContratoSite, createContractAction, updateContractAction } from '@/app/actions/contractActions';
import { 
  Building2, 
  MapPin, 
  PhoneCall, 
  Image as ImageIcon, 
  Save, 
  AlertCircle,
  UploadCloud,
  FolderOpen,
  Link as LinkIcon,
  Trash2,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';

export interface ContractSaveSuccessDetails {
  contractNome: string;
  isEdit: boolean;
  hasLogo: boolean;
  logoUrl?: string;
  contrato?: ContratoSite;
}

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (details?: ContractSaveSuccessDetails) => void;
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

  // Estado para upload do logotipo do dispositivo
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [logoMode, setLogoMode] = useState<'device' | 'url'>('device');
  const [compressingLogo, setCompressingLogo] = useState(false);
  const [logoFileName, setLogoFileName] = useState<string>('');
  const [logoFileSizeKb, setLogoFileSizeKb] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
      setLogoFileName('');
      setLogoFileSizeKb(null);
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
      setLogoFileName('');
      setLogoFileSizeKb(null);
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

  // Processamento do arquivo de imagem do dispositivo
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor, selecione um arquivo de imagem válido (.png, .jpg, .webp ou .svg).');
      return;
    }

    setCompressingLogo(true);
    setErrorMsg(null);
    setLogoFileName(file.name);

    try {
      // Se for SVG, lê como data URL diretamente para preservar os vetores sem rasterização
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          setLogoUrl(result);
          setLogoFileSizeKb(Math.round(file.size / 1024));
          setIsDirty(true);
          setCompressingLogo(false);
        };
        reader.onerror = () => {
          setErrorMsg('Falha ao processar arquivo vetorial SVG.');
          setCompressingLogo(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Compacta imagens PNG/JPEG/WebP mantendo nitidez e proporção adequada para logos
      const result = await compressImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.85
      });

      setLogoUrl(result.base64);
      setLogoFileSizeKb(Math.round(result.compressedSizeKb));
      setIsDirty(true);
    } catch (err: any) {
      // Fallback em FileReader direto
      const reader = new FileReader();
      reader.onload = () => {
        setLogoUrl(reader.result as string);
        setLogoFileSizeKb(Math.round(file.size / 1024));
        setIsDirty(true);
      };
      reader.readAsDataURL(file);
    } finally {
      setCompressingLogo(false);
    }
  };

  const handleLogoFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDropImage = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoFileName('');
    setLogoFileSizeKb(null);
    setIsDirty(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        onSuccess({
          contractNome: cleanNome,
          isEdit: true,
          hasLogo: Boolean(logoUrl.trim()),
          logoUrl: logoUrl.trim()
        });
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
        onSuccess({
          contractNome: cleanNome,
          isEdit: false,
          hasLogo: Boolean(logoUrl.trim()),
          logoUrl: logoUrl.trim(),
          contrato: res.contrato
        });
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
      subtitle={isEditing ? 'Atualize contatos, branding do cliente e coordenadas da unidade' : 'Cadastre um novo Site raiz para isolamento multi-tenant'}
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

        {/* 4. BRANDING & IDENTIDADE VISUAL (UPLOAD DO DISPOSITIVO OU URL) */}
        <div className={cardSectionStyle}>
          {/* Input de arquivo oculto para busca no dispositivo */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleLogoFileInputChange}
            className="hidden"
          />

          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-red-600 dark:text-rose-500 font-bold">🎨</span>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-zinc-100">
                Logotipo da Empresa & Identidade Visual
              </h4>
            </div>

            {/* Alternador entre Upload de Dispositivo e Inserção de URL */}
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setLogoMode('device')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  logoMode === 'device'
                    ? 'bg-red-500/10 text-red-600 dark:text-rose-400 font-black border border-red-500/30'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <FolderOpen size={12} />
                <span>Do Dispositivo</span>
              </button>
              <button
                type="button"
                onClick={() => setLogoMode('url')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  logoMode === 'url'
                    ? 'bg-red-500/10 text-red-600 dark:text-rose-400 font-black border border-red-500/30'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <LinkIcon size={12} />
                <span>Link / URL</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1">
            {/* Box de Preview da Imagem */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                title="Clique para escolher nova imagem"
                className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center p-2.5 cursor-pointer relative overflow-hidden transition-all group ${
                  logoUrl
                    ? 'border-emerald-500/50 bg-white shadow-xs'
                    : isDragOver
                    ? 'border-red-600 bg-red-500/10 scale-105'
                    : 'border-slate-300 dark:border-zinc-700 bg-slate-100/50 dark:bg-zinc-900/50 hover:border-red-500'
                }`}
              >
                {compressingLogo ? (
                  <div className="flex flex-col items-center gap-1 text-center">
                    <RefreshCw size={20} className="animate-spin text-red-600" />
                    <span className="text-[8px] font-black text-slate-500 uppercase">Otimizando</span>
                  </div>
                ) : logoUrl ? (
                  <>
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold uppercase text-center p-1">
                      Alterar Logo
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-center text-slate-400 dark:text-zinc-500 group-hover:text-red-600 transition-colors">
                    <UploadCloud size={24} />
                    <span className="text-[8px] font-black uppercase">Sem Imagem</span>
                  </div>
                )}
              </div>

              {logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-[10px] text-red-600 hover:text-red-700 font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 size={11} />
                  <span>Remover</span>
                </button>
              )}
            </div>

            {/* Interface de Ação de Upload ou Inserção de URL */}
            <div className="flex-1 w-full space-y-2">
              {logoMode === 'device' ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDropImage}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-red-600 bg-red-500/10'
                      : theme === 'dark'
                      ? 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-950'
                      : 'border-slate-300 bg-white hover:border-red-500 hover:bg-red-50/20'
                  }`}
                >
                  <FolderOpen size={24} className="text-red-600 dark:text-rose-500 mb-1.5" />
                  <p className="text-xs font-black uppercase text-slate-950 dark:text-zinc-100">
                    Buscar arquivo no seu computador / celular
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans mt-0.5">
                    Arraste a imagem aqui ou clique para navegar (PNG transparente recomendado, JPG ou SVG)
                  </p>

                  {logoFileName && (
                    <div className="mt-2.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1.5 font-mono">
                      <CheckCircle2 size={12} />
                      <span>{logoFileName}</span>
                      {logoFileSizeKb && <span>({logoFileSizeKb} KB)</span>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className={labelStyle}>URL do Logotipo (PNG com Fundo Transparente)</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => { setLogoUrl(e.target.value); setIsDirty(true); }}
                    placeholder="https://sua-empresa.com/logo-transparente.png"
                    className={inputStyle}
                  />
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans">
                    Cole o link direto da imagem hospedada na web ou em bucket de armazenamento.
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans leading-relaxed">
                ℹ️ Esta marca corporativa é inserida automaticamente nos cabeçalhos de relatórios de vistoria em PDF e nas etiquetas QR Code dos ativos vinculados a este contrato.
              </p>
            </div>
          </div>
        </div>
      </form>
    </ExecutiveWindowModal>
  );
}
