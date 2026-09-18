'use client';

import React, { useState, useEffect } from 'react';
import ExecutiveWindowModal from './ExecutiveWindowModal';
import { useSpci } from '@/app/context/SpciContext';
import { UserPlus, UserCheck, Shield, Building, Lock, Calendar, Save, AlertCircle } from 'lucide-react';

interface UserFormDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (credentialsCreated?: any) => void;
  userToEdit?: any | null;
  availableSites: string[];
  theme?: 'dark' | 'light';
}

export default function UserFormDrawerModal({
  isOpen,
  onClose,
  onSuccess,
  userToEdit,
  availableSites,
  theme = 'light'
}: UserFormDrawerModalProps) {
  const { userProfile, handleInviteUser, handleUpdateUserFull } = useSpci();
  const isEditing = Boolean(userToEdit);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Desenvolvedor' | 'Gestor' | 'Administrador' | 'Usuário'>('Usuário');
  const [status, setStatus] = useState<'Ativo' | 'Pendente' | 'Inativo/Suspenso'>('Ativo');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [primarySite, setPrimarySite] = useState<string>('SALOBO');
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'dashboard', 'extintores', 'hidrantes', 'sinalizacao', 'iluminacao', 'bombas', 'ronda', 'mapa', 'alerts'
  ]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const isCallerDev = userProfile?.role === 'Desenvolvedor';

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || '');
      setUsername(userToEdit.userName || userToEdit.username || '');
      setEmail(userToEdit.email || '');
      setPhone(userToEdit.telefoneWhatsapp || userToEdit.phone || '');
      setRole(userToEdit.role || 'Usuário');
      setStatus(userToEdit.status === 'inactive' || userToEdit.status === 'Inativo/Suspenso' ? 'Inativo/Suspenso' : userToEdit.status === 'pending' || userToEdit.status === 'Pendente' ? 'Pendente' : 'Ativo');
      setPassword('');
      setExpiresAt(userToEdit.dataExpiracao ? userToEdit.dataExpiracao.split('T')[0] : '');

      const currentSite = userToEdit.site || 'SALOBO';
      if (currentSite.includes('TODOS')) {
        setSelectedSites(['TODOS OS SITES (Acesso Global)']);
        setPrimarySite('SALOBO');
      } else {
        const sites = currentSite.split(',').map((s: string) => s.trim()).filter(Boolean);
        setSelectedSites(sites.length > 0 ? sites : ['SALOBO']);
        setPrimarySite(sites[0] || 'SALOBO');
      }

      setIsDirty(false);
    } else {
      setName('');
      setUsername('');
      setEmail('');
      setPhone('');
      setRole('Usuário');
      setStatus('Ativo');
      setPassword('');
      setExpiresAt('');
      setSelectedSites(['SALOBO']);
      setPrimarySite('SALOBO');
      setSelectedModules([
        'dashboard', 'extintores', 'hidrantes', 'sinalizacao', 'iluminacao', 'bombas', 'ronda', 'mapa', 'alerts'
      ]);
      setIsDirty(false);
    }
    setErrorMsg(null);
  }, [userToEdit, isOpen]);

  const handleToggleSite = (site: string) => {
    setIsDirty(true);
    if (site === 'TODOS OS SITES (Acesso Global)') {
      setSelectedSites(['TODOS OS SITES (Acesso Global)']);
      return;
    }

    const withoutGlobal = selectedSites.filter(s => s !== 'TODOS OS SITES (Acesso Global)');
    if (withoutGlobal.includes(site)) {
      const next = withoutGlobal.filter(s => s !== site);
      setSelectedSites(next.length > 0 ? next : ['SALOBO']);
      if (primarySite === site) {
        setPrimarySite(next[0] || 'SALOBO');
      }
    } else {
      setSelectedSites([...withoutGlobal, site]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !username.trim() || !email.trim()) {
      setErrorMsg('Preencha os campos obrigatórios (Nome, Username e E-mail).');
      return;
    }

    if (!isEditing && password.length < 6) {
      setErrorMsg('A senha de acesso deve ter no mínimo 6 dígitos.');
      return;
    }

    setSaving(true);
    try {
      const resolvedSiteScope = selectedSites.includes('TODOS OS SITES (Acesso Global)')
        ? 'TODOS OS SITES (Acesso Global)'
        : selectedSites.join(', ');

      const expiresAtIso = expiresAt ? new Date(`${expiresAt}T23:59:59.999Z`).toISOString() : null;

      if (isEditing && userToEdit) {
        await handleUpdateUserFull(userToEdit.uid, {
          name: name.trim(),
          username: username.trim().toLowerCase().replace(/\s+/g, ''),
          email: email.trim(),
          phone: phone.trim(),
          role,
          status,
          expiresAt: expiresAtIso,
          password: password.trim() || undefined,
          allowedModules: isCallerDev ? selectedModules : undefined,
          site: resolvedSiteScope
        });
        setIsDirty(false);
        onSuccess();
        onClose();
      } else {
        const creds = await handleInviteUser(
          email.trim(),
          username.trim().toLowerCase().replace(/\s+/g, ''),
          name.trim(),
          role,
          password.trim(),
          phone.trim(),
          expiresAtIso,
          isCallerDev ? selectedModules : null,
          resolvedSiteScope
        );
        setIsDirty(false);
        onSuccess({
          ...creds,
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          role,
          password: password.trim(),
          phone: phone.trim(),
          expires_at: expiresAtIso,
          site: resolvedSiteScope
        });
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar colaborador.');
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
      title={isEditing ? `Editar Colaborador: ${userToEdit?.name}` : 'Cadastrar Novo Usuário / Operador'}
      subtitle={isEditing ? 'Gestão de permissões, escopo de contratos e redefinição de acesso' : 'Cadastre credenciais corporativas com governança multi-site'}
      icon={isEditing ? <UserCheck size={18} /> : <UserPlus size={18} />}
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
                Gravando...
              </>
            ) : (
              <>
                <Save size={14} />
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Usuário'}
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

        {/* 1. IDENTIFICAÇÃO DO COLABORADOR */}
        <div className={cardSectionStyle}>
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
            <span className="text-red-600 dark:text-rose-500 font-bold">👤</span>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-zinc-100">
              Identificação & Credenciais Pessoais
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className={labelStyle}>Nome Completo *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                placeholder="Ex: Carlos Eduardo Silva"
                className={inputStyle}
              />
            </div>

            <div>
              <label className={labelStyle}>Nome de Usuário (@username) *</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/\s+/g, '')); setIsDirty(true); }}
                placeholder="Ex: carlossilva"
                className={inputStyle}
              />
            </div>

            <div>
              <label className={labelStyle}>E-mail Corporativo *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setIsDirty(true); }}
                placeholder="carlos.silva@empresa.com"
                className={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className={labelStyle}>Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setIsDirty(true); }}
                placeholder="(94) 99123-4567"
                className={inputStyle}
              />
            </div>

            <div>
              <label className={labelStyle}>
                Senha de Acesso {isEditing ? <span className="text-slate-400 font-normal">(Deixe em branco para manter)</span> : '*'}
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setIsDirty(true); }}
                placeholder={isEditing ? 'Nova senha (opcional)' : 'Mínimo 6 caracteres'}
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* 2. GOVERNANÇA, PERFIL RBAC E VALIDADE */}
        <div className={cardSectionStyle}>
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
            <span className="text-red-600 dark:text-rose-500 font-bold">🛡️</span>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-zinc-100">
              Nível de Acesso (RBAC) & Status
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelStyle}>Perfil de Acesso</label>
              <select
                value={role}
                onChange={(e) => { setRole(e.target.value as any); setIsDirty(true); }}
                className={inputStyle}
              >
                {isCallerDev && <option value="Desenvolvedor">💻 Desenvolvedor (Controle Total)</option>}
                <option value="Gestor">👔 Gestor de Contrato</option>
                <option value="Administrador">🛡️ Administrador do Sistema</option>
                <option value="Usuário">👷 Técnico de Campo / Brigadista</option>
              </select>
            </div>

            <div>
              <label className={labelStyle}>Status da Conta</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value as any); setIsDirty(true); }}
                className={inputStyle}
              >
                <option value="Ativo">🟢 Ativo (Acesso Liberado)</option>
                <option value="Pendente">🟡 Pendente (Aguardando Aprovação)</option>
                <option value="Inativo/Suspenso">🔴 Inativo / Suspenso</option>
              </select>
            </div>

            <div>
              <label className={labelStyle}>Data de Expiração (Opcional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => { setExpiresAt(e.target.value); setIsDirty(true); }}
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* 3. ESCOPO DE CONTRATOS (MULTI-SITE) */}
        <div className={cardSectionStyle}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-red-600 dark:text-rose-500 font-bold">🏢</span>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-zinc-100">
                Escopo de Contratos Autorizados (Multi-Site)
              </h4>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans">
              Selecione os sites que o operador pode visualizar
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {availableSites.map((site) => {
              const isSelected = selectedSites.includes(site);

              return (
                <button
                  key={site}
                  type="button"
                  onClick={() => handleToggleSite(site)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400 font-black shadow-xs'
                      : theme === 'dark'
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[11px] truncate">{site}</span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] shrink-0 ${
                    isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-slate-400'
                  }`}>
                    {isSelected ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. MÓDULOS PERMITIDOS (APENAS PARA DESENVOLVEDOR) */}
        {isCallerDev && (
          <div className={cardSectionStyle}>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
              <span className="text-red-600 dark:text-rose-500 font-bold">⚙️</span>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-zinc-100">
                Módulos do Sistema Autorizados
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'extintores', label: '🧯 Extintores' },
                { id: 'hidrantes', label: '💧 Hidrantes' },
                { id: 'sinalizacao', label: '⚠️ Sinalização' },
                { id: 'iluminacao', label: '💡 Iluminação' },
                { id: 'bombas', label: '🔧 Casa de Bombas' },
                { id: 'ronda', label: '📱 Ronda & Campo' },
                { id: 'mapa', label: '🗺️ Mapa Operacional' },
                { id: 'alerts', label: '🔔 Alertas' },
                { id: 'configuracoes', label: '⚙️ Configurações' }
              ].map((mod) => {
                const checked = selectedModules.includes(mod.id);

                return (
                  <label
                    key={mod.id}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                      checked
                        ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
                        : theme === 'dark'
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setIsDirty(true);
                        if (e.target.checked) {
                          setSelectedModules([...selectedModules, mod.id]);
                        } else {
                          setSelectedModules(selectedModules.filter(m => m !== mod.id));
                        }
                      }}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span>{mod.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </ExecutiveWindowModal>
  );
}
