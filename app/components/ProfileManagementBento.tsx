'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Lock, 
  Bell, 
  Volume2, 
  Sun, 
  Moon, 
  Laptop, 
  Building, 
  Save, 
  CheckCircle2, 
  KeyRound, 
  RefreshCw,
  Camera,
  AlertCircle
} from 'lucide-react';
import { useSpci } from '@/app/context/SpciContext';
import { updateSelfProfileAction, changeSelfPasswordAction } from '@/app/actions/userActions';

interface ProfileManagementBentoProps {
  availableSites: string[];
  currentTheme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light' | 'system') => void;
}

export default function ProfileManagementBento({
  availableSites,
  currentTheme,
  onThemeChange
}: ProfileManagementBentoProps) {
  const { userProfile, currentUser, triggerSuccessNotification, showAlertModal } = useSpci();

  // Dados Cadastrais
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.telefoneWhatsapp || userProfile?.phone || '');
  const [matricula, setMatricula] = useState(userProfile?.matricula || '');
  const [cargoFuncao, setCargoFuncao] = useState(userProfile?.cargoFuncao || 'Técnico de Campo');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.logoUrl || userProfile?.avatar_url || '');

  // Preferências
  const [themePref, setThemePref] = useState<'escuro' | 'claro' | 'sistema'>('sistema');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.8);
  const [defaultSite, setDefaultSite] = useState(userProfile?.site || 'SALOBO');

  // Segurança (Alteração de Senha)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhone(userProfile.telefoneWhatsapp || userProfile.phone || '');
      setMatricula(userProfile.matricula || '');
      setCargoFuncao(userProfile.cargoFuncao || 'Técnico de Campo');
      setAvatarUrl(userProfile.logoUrl || userProfile.avatar_url || '');
      if (userProfile.site) setDefaultSite(userProfile.site);
    }
  }, [userProfile]);

  // Cálculo da Força da Senha
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Não informada', color: 'bg-zinc-300' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 30, label: 'Fraca', color: 'bg-red-500' };
    if (score <= 4) return { score: 70, label: 'Média', color: 'bg-amber-500' };
    return { score: 100, label: 'Forte (Excelente)', color: 'bg-emerald-500' };
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  // Testar Beep de Notificação
  const handleTestSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(soundVolume, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Tom A5 corporativo
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn('AudioContext indisponível no navegador:', e);
    }
  };

  // Salvar Dados Cadastrais e Preferências
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid && !currentUser?.uid) {
      showAlertModal('Atenção', 'Usuário não autenticado.', 'warning');
      return;
    }

    setSavingProfile(true);
    try {
      const uid = userProfile?.uid || currentUser?.uid;
      const res = await updateSelfProfileAction(uid, {
        name: name.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl.trim(),
        matricula: matricula.trim(),
        cargoFuncao: cargoFuncao.trim(),
        temaPreferido: themePref,
        alertasSonoros: soundEnabled,
        volumeAlertas: soundVolume,
        sitePadrao: defaultSite
      });

      if (res.success) {
        triggerSuccessNotification('Perfil Atualizado!', 'Suas preferências e dados foram salvos com sucesso.');
      } else {
        showAlertModal('Erro ao Salvar', res.error || 'Falha ao gravar alterações.', 'error');
      }
    } catch (err: any) {
      showAlertModal('Erro', err.message || 'Erro inesperado.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Alterar Senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showAlertModal('Senha Curta ⚠️', 'A nova senha deve ter no mínimo 6 caracteres.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlertModal('Senhas Divergentes ⚠️', 'A nova senha e a confirmação não coincidem.', 'warning');
      return;
    }

    setChangingPassword(true);
    try {
      const uid = userProfile?.uid || currentUser?.uid;
      const res = await changeSelfPasswordAction(uid, newPassword);
      if (res.success) {
        triggerSuccessNotification('Senha Alterada! 🔐', 'Sua senha de acesso foi atualizada com sucesso.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showAlertModal('Falha na Senha', res.error || 'Não foi possível alterar sua senha.', 'error');
      }
    } catch (err: any) {
      showAlertModal('Erro', err.message || 'Erro inesperado.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const inputStyle = `w-full rounded-xl p-2.5 text-xs font-mono font-bold transition-all focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-600 border ${
    currentTheme === 'dark'
      ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500'
      : 'bg-white border-slate-300 text-slate-950 placeholder:text-slate-400 shadow-xs'
  }`;

  const labelStyle = 'block text-[9px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-zinc-300';
  const cardStyle = `p-6 rounded-2xl border relative overflow-hidden transition-all duration-200 ${
    currentTheme === 'dark'
      ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
      : 'bg-white border-slate-200 text-slate-950 shadow-xs'
  }`;

  return (
    <div className="space-y-6 select-none font-mono">
      {/* GRID SUPERIOR: IDENTIFICAÇÃO E NÍVEL DE ACESSO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD 1: IDENTIFICAÇÃO PESSOAL & CADASTRO (COL-SPAN-2) */}
        <div className={`lg:col-span-2 ${cardStyle}`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-rose-600" />
          
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/80 dark:border-zinc-800">
            <User className="w-4 h-4 text-red-600 dark:text-rose-500" />
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-950 dark:text-zinc-100">
              Meu Perfil & Identificação Operacional
            </h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-4">
            {/* Bloco do Avatar e Status */}
            <div className="flex flex-col sm:flex-row items-center gap-5 pb-2">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl border-2 border-red-500/30 flex items-center justify-center bg-slate-50 dark:bg-zinc-950 overflow-hidden shadow-inner">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-red-600">🧯</span>
                  )}
                </div>
                {/* Indicador Online */}
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-xs"
                  title="Operador Ativo"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              <div className="flex-1 w-full space-y-1">
                <label className={labelStyle}>URL da Foto / Avatar Corporativo</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://exemplo.com/minha-foto.jpg"
                  className={inputStyle}
                />
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans">
                  Insira um link de imagem quadrada (PNG ou JPEG) para seu avatar oficial.
                </p>
              </div>
            </div>

            {/* Campos Cadastrais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>E-mail Corporativo (Login)</label>
                <input
                  type="email"
                  disabled
                  value={userProfile?.email || currentUser?.email || ''}
                  className={`${inputStyle} opacity-60 cursor-not-allowed bg-slate-100 dark:bg-zinc-950`}
                />
              </div>

              <div>
                <label className={labelStyle}>Telefone / WhatsApp de Contato</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(94) 99123-4567"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>Cargo / Função Operacional</label>
                <select
                  value={cargoFuncao}
                  onChange={(e) => setCargoFuncao(e.target.value)}
                  className={inputStyle}
                >
                  <option value="Técnico de Campo">👷 Técnico de Campo / Brigadista</option>
                  <option value="Supervisor de Brigada">🛡️ Supervisor de Brigada</option>
                  <option value="Engenheiro de Segurança (SST)">📐 Engenheiro de Segurança</option>
                  <option value="Gestor de Contrato">👔 Gestor de Contrato</option>
                  <option value="Desenvolvedor de Sistemas">💻 Desenvolvedor de Sistemas</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={labelStyle}>Matrícula Corporativa / Registro de Brigada</label>
                <input
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ex: OMG-88421"
                  className={inputStyle}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-md shadow-red-600/30 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Salvar Dados Pessoais
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* CARD 2: NÍVEL DE ACESSO & PERMISSÕES (VIEW-ONLY) */}
        <div className={cardStyle}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/80 dark:border-zinc-800">
            <Shield className="w-4 h-4 text-amber-500" />
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-950 dark:text-zinc-100">
              Nível de Acesso (RBAC)
            </h3>
          </div>

          <div className="space-y-4 pt-4 text-xs font-sans">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                Perfil de Segurança Ativo
              </span>
              <p className="font-black text-sm text-red-600 dark:text-rose-400 font-mono">
                {userProfile?.role === 'Desenvolvedor'
                  ? '💻 DESENVOLVEDOR (FULL ACCESS)'
                  : userProfile?.role === 'Gestor'
                  ? '👔 GESTOR DE CONTRATO'
                  : userProfile?.role === 'Administrador'
                  ? '🛡️ ADMINISTRADOR DO SISTEMA'
                  : '👷 TÉCNICO DE CAMPO (OPERADOR)'}
              </p>
            </div>

            <div className="space-y-2 text-slate-700 dark:text-zinc-300">
              <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-500 dark:text-zinc-400 block">
                Permissões no Cockpit SPCI:
              </span>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Leitura e Vistoria de Extintores & Hidrantes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Registro de Ronda Operacional em Campo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Acesso ao Mapa Operacional de Ativos</span>
                </li>
                {userProfile?.role !== 'Usuário' && (
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>Emissão de Ordens e Lotes de Manutenção</span>
                  </li>
                )}
                {(userProfile?.role === 'Desenvolvedor' || userProfile?.role === 'Gestor') && (
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>Governança de Contratos & Configurações</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-[9px] font-mono text-slate-400 block">
                Sessão autenticada via Supabase JWT • Criptografia TLS 1.3
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GRID INFERIOR: PREFERÊNCIAS DO SISTEMA E PAINEL DE SEGURANÇA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 3: PREFERÊNCIAS DO SISTEMA (TEMA, SOM, SITE PADRÃO) */}
        <div className={cardStyle}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/80 dark:border-zinc-800">
            <Volume2 className="w-4 h-4 text-blue-500" />
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-950 dark:text-zinc-100">
              Preferências do Sistema & Interface
            </h3>
          </div>

          <div className="space-y-5 pt-4">
            {/* Seletor de Tema */}
            <div>
              <label className={labelStyle}>Tema Padrão do Cockpit</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setThemePref('escuro'); onThemeChange('dark'); }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    currentTheme === 'dark'
                      ? 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-rose-400 font-black'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                  }`}
                >
                  <Moon size={18} />
                  <span className="text-[10px] uppercase font-bold">Escuro</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setThemePref('claro'); onThemeChange('light'); }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    currentTheme === 'light'
                      ? 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-rose-400 font-black'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                  }`}
                >
                  <Sun size={18} />
                  <span className="text-[10px] uppercase font-bold">Claro</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setThemePref('sistema'); onThemeChange('system'); }}
                  className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 flex flex-col items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Laptop size={18} />
                  <span className="text-[10px] uppercase font-bold">Sistema</span>
                </button>
              </div>
            </div>

            {/* Alertas Sonoros e Volume */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-red-600" />
                  <div>
                    <p className="text-xs font-black uppercase text-slate-950 dark:text-zinc-100">Alertas Sonoros</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans">Efeito sonoro em anomalias e vistorias</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 cursor-pointer"
                />
              </div>

              {soundEnabled && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-500 dark:text-zinc-400">Volume do Alerta ({Math.round(soundVolume * 100)}%)</span>
                    <button
                      type="button"
                      onClick={handleTestSound}
                      className="px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-red-600 hover:text-white transition-all text-[9px] font-black uppercase cursor-pointer"
                    >
                      ▶ Testar Som
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Contrato / Site Padrão de Inicialização */}
            <div>
              <label className={labelStyle}>Contrato / Site Padrão de Abertura</label>
              <select
                value={defaultSite}
                onChange={(e) => setDefaultSite(e.target.value)}
                className={inputStyle}
              >
                {availableSites.map((site) => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans mt-1">
                Define qual contrato será selecionado automaticamente no login.
              </p>
            </div>
          </div>
        </div>

        {/* CARD 4: PAINEL DE SEGURANÇA & ALTERAÇÃO DE SENHA */}
        <div className={cardStyle}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
          
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/80 dark:border-zinc-800">
            <Lock className="w-4 h-4 text-red-600 dark:text-rose-500" />
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-950 dark:text-zinc-100">
              Segurança & Credenciais
            </h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 pt-4">
            <div>
              <label className={labelStyle}>Nova Senha de Acesso</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={inputStyle}
              />
            </div>

            {/* Medidor Visual de Força da Senha */}
            {newPassword && (
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                <div className="flex items-center justify-between text-[10px] font-black uppercase">
                  <span className="text-slate-500 dark:text-zinc-400">Força da Senha:</span>
                  <span className={passwordStrength.score >= 70 ? 'text-emerald-500' : 'text-amber-500'}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className={labelStyle}>Confirmar Nova Senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className={inputStyle}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={changingPassword || !newPassword}
                className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 dark:hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-none flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {changingPassword ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    Atualizar Senha
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
