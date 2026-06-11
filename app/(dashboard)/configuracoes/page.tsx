'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { 
  RefreshCw, 
  Trash2, 
  UserPlus, 
  Check 
} from 'lucide-react';

export default function ConfiguracoesPage() {
  const router = useRouter();
  
  // Context states & methods
  const {
    currentUser,
    userProfile,
    authChecking,
    userList,
    loadingUsersList,
    fetchUsers,
    handleAdminRoleStatusChange,
    handleAdminDeleteUser,
    handleInviteUser,
    handleUpdateLogoAndProfile,
    triggerSuccessNotification,
    addConsoleLog
  } = useSpci();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile');

  // Guard: exclusive for admin/dev and credential login (google users blocked)
  const isAdmin = userProfile?.role === 'Administrador' || userProfile?.role === 'Desenvolvedor' || userProfile?.role === 'admin';

  // --- TAB 1: MEU PERFIL STATES ---
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileLogoUrlInput, setProfileLogoUrlInput] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Sync profile details locally on profile load
  useEffect(() => {
    if (userProfile) {
      setTimeout(() => {
        setProfileNameInput(userProfile.name || '');
        setProfileLogoUrlInput(userProfile.logoUrl || '');
      }, 0);
    }
  }, [userProfile]);

  // --- TAB 2: CONTROLE DE USUÁRIOS STATES ---
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'Desenvolvedor' | 'Administrador' | 'Usuário'>('Usuário');
  const [inviteExpiresAt, setInviteExpiresAt] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'dashboard', 'extintores', 'hidrantes', 'sinalizacao', 'iluminacao', 'bombas', 'ronda', 'alerts'
  ]);

  // Onboarding credentials display state
  const [createdCredentials, setCreatedCredentials] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Load user list on mount
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const saveProfileHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNameInput) {
      triggerSuccessNotification("Nome Requerido ⚠️", "Por favor, digite seu nome de exibição.");
      return;
    }
    setUpdatingProfile(true);
    try {
      await handleUpdateLogoAndProfile(profileLogoUrlInput, profileNameInput);
    } catch (err) {
      console.error("Erro salvando perfil:", err);
    } finally {
      setUpdatingProfile(false);
    }
  };

  // --- RENDERING RESTRICTED VIEW FOR SPECTATOR/NON-ADMINS ---
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-2xl max-w-md mx-auto shadow-2xl space-y-4 my-12 font-mono relative text-slate-800">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600 rounded-t-2xl" />
        <span className="text-4xl" role="img" aria-label="Acesso restrito">🚫</span>
        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Acesso Restrito</h3>
        <p className="text-xs text-slate-500 font-sans leading-relaxed">
          Esta área de configurações e governança do sistema é exclusiva para administradores credenciados do SPCI (Logins padrão via credenciais).
        </p>
        <button 
          onClick={() => router.push('/dashboard')}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer rounded-xl border-none active:scale-95 shadow-sm"
        >
          Voltar para Dashboard
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 max-w-6xl mx-auto pb-24 font-mono select-none text-slate-850"
    >
      {/* Header section */}
      <div className="bg-white border border-slate-200 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-600 rounded-t-2xl" />
        <div className="absolute -right-10 -bottom-10 opacity-5 text-9xl select-none pointer-events-none" aria-hidden="true">⚙️</div>
        <div>
          <h2 className="font-black text-xl text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>⚙️</span> Painel Administrativo SPCI
          </h2>
          <p className="text-slate-500 text-xs mt-1 font-sans leading-relaxed">
            Centralize o gerenciamento do seu perfil e governança de credenciais de usuários do SPCI.
          </p>
        </div>
      </div>

      {/* HORIZONTAL TAB BAR */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto shrink-0 scrollbar-none">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-t-xl flex items-center gap-2 ${
            activeTab === 'profile' 
              ? 'bg-white border-t-2 border-t-red-600 border-x border-x-slate-200 text-red-600 font-extrabold shadow-xs' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <span>👤</span> Meu Perfil
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-t-xl flex items-center gap-2 ${
            activeTab === 'users' 
              ? 'bg-white border-t-2 border-t-red-600 border-x border-x-slate-200 text-red-600 font-extrabold shadow-xs' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <span>👥</span> Controle de Usuários
        </button>
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="space-y-6">
        
        {/* TAB 1: MEU PERFIL */}
        {activeTab === 'profile' && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Profile detail card */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm relative space-y-6 rounded-2xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 rounded-t-2xl" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-100">
                <span>🛡️</span> Credencial Ativa
              </h3>

              <div className="flex flex-col items-center text-center space-y-4 py-4">
                {userProfile?.logoUrl ? (
                  <div className="w-20 h-20 bg-white border border-slate-200 p-1 flex items-center justify-center relative shadow-sm rounded-xl">
                    <img 
                      src={userProfile.logoUrl} 
                      alt="Logo corporativo" 
                      className="w-full h-full object-contain rounded-lg" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-red-50 border border-red-100 flex items-center justify-center text-red-600 text-3xl font-black shadow-inner rounded-xl">
                    🧯
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                    {userProfile?.name || 'TÉCNICO SPCI'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">{userProfile?.email}</p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs text-slate-700">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 uppercase font-bold">Nível de Acesso</span>
                  <span className="bg-red-50 border border-red-100 text-red-600 font-bold px-2 py-0.5 uppercase text-[9px] rounded-lg">
                    {userProfile?.role === 'Desenvolvedor' ? '💻 Desenvolvedor' : userProfile?.role === 'Administrador' ? '🛡️ Administrador' : '👷 Técnico'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 uppercase font-bold">Status do Perfil</span>
                  <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold px-2 py-0.5 uppercase text-[9px] rounded-lg">
                    Ativo
                  </span>
                </div>
                {userProfile?.dataExpiracao && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 uppercase font-bold">Validade da Conta</span>
                    <span className="text-amber-600 font-bold font-mono">
                      {new Date(userProfile.dataExpiracao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile update form */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 shadow-sm relative space-y-6 rounded-2xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 rounded-t-2xl" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-100">
                <span>🔧</span> Configurações de Identificação & Logomarca
              </h3>

              <form onSubmit={saveProfileHandler} className="space-y-5 text-xs text-slate-600">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                    Nome de Exibição / Razão Social
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    placeholder="Ex: Inspetor Técnico João"
                    className="w-full bg-white border border-slate-200 focus:border-red-650 focus:shadow-[0_0_8px_rgba(220,38,38,0.05)] rounded-xl p-3 text-xs text-slate-850 focus:outline-none font-bold shadow-xs transition-all"
                  />
                  <p className="text-[9px] text-slate-400 font-sans mt-0.5">Nome utilizado para homologar laudos de vistorias.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                    URL do Logotipo (.png / .jpg)
                  </label>
                  <input 
                    type="text" 
                    value={profileLogoUrlInput}
                    onChange={(e) => setProfileLogoUrlInput(e.target.value)}
                    placeholder="https://exemplo.com/sua-logo.png"
                    className="w-full bg-white border border-slate-200 focus:border-red-650 focus:shadow-[0_0_8px_rgba(220,38,38,0.05)] rounded-xl p-3 text-xs text-slate-850 focus:outline-none shadow-xs transition-all"
                  />
                  <p className="text-[9px] text-slate-400 font-sans mt-0.5">Link público para o logotipo personalizado da empresa parceira.</p>
                </div>

                <div className="space-y-2">
                  <span className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">Logos Rápidas SPCI</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { name: '🔥 SPCI Corp', url: 'https://images.unsplash.com/photo-1516216621161-8a5021e11e2f?w=100&auto=format&fit=crop&q=80' },
                      { name: '🏢 Seguridade', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&auto=format&fit=crop&q=80' },
                      { name: '🌳 EcoPrevenir', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=100&auto=format&fit=crop&q=80' }
                    ].map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setProfileLogoUrlInput(preset.url)}
                        className={`border p-2 bg-slate-50 hover:bg-slate-100 flex items-center gap-3 cursor-pointer transition-all rounded-xl text-left ${
                          profileLogoUrlInput === preset.url ? 'border-red-600' : 'border-slate-200'
                        }`}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.name} 
                          className="w-8 h-8 object-cover bg-white p-0.5 shadow-sm rounded-lg" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[9px] font-extrabold text-slate-500 leading-tight block uppercase truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-none rounded-xl active:scale-[0.97] flex items-center gap-2 shadow-xs"
                  >
                    {updatingProfile ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        SALVANDO...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 font-bold" />
                        SALVAR PERFIL
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* TAB 2: CONTROLE DE USUÁRIOS */}
        {activeTab === 'users' && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="space-y-6 text-slate-800"
          >
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 p-5 shadow-sm flex items-center gap-4 rounded-2xl">
                <div className="w-12 h-12 bg-red-50 border border-red-100 text-red-600 flex items-center justify-center text-xl font-bold rounded-xl shadow-xs" aria-hidden="true">🎯</div>
                <div>
                  <h4 className="text-slate-500 text-[9px] font-bold uppercase tracking-widest leading-none">Total Cadastrados</h4>
                  <p className="font-black text-xl text-slate-800 mt-1.5">{userList.length}</p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-5 shadow-sm flex items-center gap-4 rounded-2xl">
                <div className="w-12 h-12 bg-red-50 border border-red-100 text-red-600 flex items-center justify-center text-xl font-bold rounded-xl shadow-xs" aria-hidden="true">🛡️</div>
                <div>
                  <h4 className="text-slate-500 text-[9px] font-bold uppercase tracking-widest leading-none">Administradores e Devs</h4>
                  <p className="font-black text-xl text-slate-800 mt-1.5">
                    {userList.filter(u => u.role === 'Administrador' || u.role === 'Desenvolvedor').length}
                  </p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-5 shadow-sm flex items-center gap-4 rounded-2xl">
                <div className="w-12 h-12 bg-red-50 border border-red-100 text-red-600 flex items-center justify-center text-xl font-bold rounded-xl shadow-xs" aria-hidden="true">⏳</div>
                <div>
                  <h4 className="text-slate-500 text-[9px] font-bold uppercase tracking-widest leading-none">Pendentes / Inativos</h4>
                  <p className="font-black text-xl text-slate-800 mt-1.5">
                    {userList.filter(u => u.status !== 'active').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Table wrapper */}
            <div className="bg-white border border-slate-200 shadow-sm relative rounded-2xl text-slate-800">
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 rounded-t-2xl" />
              
              <div className="border-b border-slate-200/80 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-widest">
                    Quadro Geral de Credenciais
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Listagem direta do banco Supabase ativo.</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => {
                      addConsoleLog("[Admin] Recarregando lista de usuários...");
                      fetchUsers();
                    }}
                    className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-650 font-bold text-[10px] uppercase cursor-pointer rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Recarregar
                  </button>
                  <button 
                    onClick={() => {
                      if (userProfile?.role !== 'Desenvolvedor' && inviteRole === 'Desenvolvedor') {
                        setInviteRole('Usuário');
                      }
                      setShowInviteModal(true);
                    }}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase cursor-pointer rounded-xl transition-all active:scale-95 flex items-center gap-1.5 border-none shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Convidar Colaborador
                  </button>
                </div>
              </div>

              {loadingUsersList ? (
                <div className="p-12 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-red-650 border-t-transparent animate-spin rounded-full"></span>
                  Sincronizando usuários do Supabase...
                </div>
              ) : userList.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 font-mono">
                  Nenhum usuário adicional cadastrado. Clique no botão de convite para adicionar novos técnicos ou administradores.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-550 uppercase tracking-wider text-[9px] font-bold border-b border-slate-200">
                        <th className="p-4 font-black">Colaborador</th>
                        <th className="p-4 font-black">Username / E-mail</th>
                        <th className="p-4 font-black">Nível de Acesso (RBAC)</th>
                        <th className="p-4 font-black">Status de Acesso</th>
                        <th className="p-4 text-center font-black">Excluir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {userList.map(u => {
                        const isOwnAccount = u.uid === currentUser?.uid;
                        const isPrimaryAdmin = u.email?.toLowerCase() === 'jackson602@gmail.com';
                        const disableActions = isPrimaryAdmin || isOwnAccount || (u.role === 'Desenvolvedor' && userProfile?.role !== 'Desenvolvedor');
                        
                        return (
                          <tr key={u.uid} className="hover:bg-slate-50 transition-all text-slate-700">
                            <td className="p-4 flex items-center gap-3">
                              {u.logoUrl ? (
                                <div className="w-8 h-8 bg-white border border-slate-200 p-0.5 flex items-center justify-center rounded-lg">
                                  <img 
                                    src={u.logoUrl} 
                                    className="w-full h-full object-contain rounded-md" 
                                    alt="Logo"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 bg-slate-100 text-slate-550 font-bold flex items-center justify-center text-xs border border-slate-200 uppercase rounded-lg">
                                  {u.name ? u.name.charAt(0) : '?'}
                                </div>
                              )}
                              <div>
                                <p className="font-extrabold text-slate-900">{u.name}</p>
                                {u.dataExpiracao && (
                                  <p className="text-[8px] text-amber-600 font-mono mt-0.5 font-bold uppercase tracking-wider">
                                    Expira em: {new Date(u.dataExpiracao).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-[10px] text-slate-500">
                              <p className="font-bold text-red-650">@{u.userName || 'n/a'}</p>
                              <p className="text-slate-400 mt-0.5">{u.email}</p>
                              {u.telefoneWhatsapp && (
                                <p className="text-emerald-600 font-bold mt-0.5">📞 {u.telefoneWhatsapp}</p>
                              )}
                            </td>
                            <td className="p-4">
                              <select 
                                value={u.role} 
                                disabled={disableActions}
                                onChange={(e) => handleAdminRoleStatusChange(u.uid, e.target.value as any, u.status)}
                                className="bg-white border border-slate-200 rounded-xl p-2 font-bold text-[10px] text-slate-700 focus:outline-none focus:border-red-650 cursor-pointer disabled:opacity-40 shadow-xs"
                              >
                                {(userProfile?.role === 'Desenvolvedor' || u.role === 'Desenvolvedor') && (
                                  <option value="Desenvolvedor">💻 Desenvolvedor</option>
                                )}
                                <option value="Administrador">🛡️ Administrador</option>
                                <option value="Usuário">👷 Técnico de Campo</option>
                              </select>
                            </td>
                            <td className="p-4">
                              <select 
                                value={u.status} 
                                disabled={disableActions}
                                onChange={(e) => handleAdminRoleStatusChange(u.uid, u.role, e.target.value as any)}
                                className={`border rounded-xl p-2 font-bold text-[10px] focus:outline-none cursor-pointer disabled:opacity-40 shadow-xs ${
                                  u.status === 'active' 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                    : u.status === 'pending' 
                                      ? 'bg-amber-50 text-amber-600 border-amber-200' 
                                      : 'bg-red-50 text-red-600 border-red-200'
                                }`}
                              >
                                <option value="active">🟢 Ativo (Acesso Liberado)</option>
                                <option value="pending">🟡 Pendente (Sem Acesso)</option>
                                <option value="inactive">🔴 Inativo / Suspenso</option>
                              </select>
                            </td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => handleAdminDeleteUser(u.uid)}
                                disabled={disableActions}
                                className="text-slate-405 hover:text-red-600 p-2 bg-white border border-slate-200 hover:border-red-200 rounded-xl cursor-pointer transition-all disabled:opacity-20 disabled:pointer-events-none shadow-xs"
                                title="Deletar permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </div>

      {/* --- FLOATING DIALOGS & OVERLAYS --- */}

      {/* 2. Modal: Invite Colaborador User */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden space-y-4 text-xs text-slate-700">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-600 rounded-t-2xl" />
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>➕</span> Convidar Novo Colaborador
            </h3>
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              O colaborador será registrado no Supabase Auth com senha personalizada e termo de validade opcional. O login estará ativado de forma imediata.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (inviting) return;

              if (invitePassword.length < 6) {
                alert('A senha de acesso deve conter no mínimo 6 caracteres.');
                return;
              }

              setInviting(true);
              try {
                const expiresAtIso = inviteExpiresAt ? new Date(`${inviteExpiresAt}T23:59:59.999Z`).toISOString() : null;
                const creds = await handleInviteUser(
                  inviteEmail,
                  inviteUsername,
                  inviteName,
                  inviteRole,
                  invitePassword,
                  invitePhone,
                  expiresAtIso,
                  userProfile?.role === 'Desenvolvedor' ? selectedModules : null
                );
                
                setCreatedCredentials({ 
                  ...creds, 
                  password: invitePassword,
                  phone: invitePhone,
                  expires_at: expiresAtIso
                });
                
                setShowInviteModal(false);
                setInviteEmail('');
                setInviteUsername('');
                setInviteName('');
                setInvitePhone('');
                setInvitePassword('');
                setInviteRole('Usuário');
                setInviteExpiresAt('');
                setSelectedModules([
                  'dashboard', 'extintores', 'hidrantes', 'sinalizacao', 'iluminacao', 'bombas', 'ronda', 'alerts'
                ]);
              } catch (err: any) {
                alert(`Erro ao cadastrar usuário: ${err.message || err}`);
              } finally {
                setInviting(false);
              }
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500">Nome Completo</label>
                <input 
                  type="text" 
                  required 
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-white border border-slate-200 focus:border-red-650 rounded-xl p-3 text-xs text-slate-800 focus:outline-none font-bold shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500">Nome de Usuário (Username)</label>
                <input 
                  type="text" 
                  required 
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="Ex: joaosilva (sem espaços)"
                  className="w-full bg-white border border-slate-200 focus:border-red-650 rounded-xl p-3 text-xs text-slate-800 focus:outline-none font-bold shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500">E-mail Corporativo</label>
                <input 
                  type="email" 
                  required 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Ex: joao.silva@empresa.com"
                  className="w-full bg-white border border-slate-200 focus:border-red-650 rounded-xl p-3 text-xs text-slate-850 focus:outline-none shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  required 
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="Ex: 5511999999999 (somente números)"
                  className="w-full bg-white border border-slate-200 focus:border-red-650 rounded-xl p-3 text-xs text-slate-850 focus:outline-none shadow-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500">Senha de Acesso (Mínimo 6 caracteres)</label>
                <input 
                  type="text" 
                  required 
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Defina a senha de acesso"
                  className="w-full bg-white border border-slate-200 focus:border-red-650 rounded-xl p-3 text-xs text-slate-850 focus:outline-none shadow-xs font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase text-slate-500">Nível de Conta</label>
                  <select 
                    value={inviteRole} 
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 focus:border-red-650 rounded-xl p-3 text-xs text-slate-800 focus:outline-none font-bold cursor-pointer shadow-xs"
                  >
                    {userProfile?.role === 'Desenvolvedor' && <option value="Desenvolvedor">💻 Desenvolvedor</option>}
                    <option value="Administrador">🛡️ Administrador</option>
                    <option value="Usuário">👷 Técnico</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase text-slate-500">Data de Expiração</label>
                  <input 
                    type="date" 
                    value={inviteExpiresAt}
                    onChange={(e) => setInviteExpiresAt(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-red-650 rounded-xl p-3 text-xs text-slate-850 focus:outline-none shadow-xs font-bold"
                  />
                </div>
              </div>

              {userProfile?.role === 'Desenvolvedor' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                    Módulos Autorizados (Abas de Elementos)
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[
                      { id: 'dashboard', label: '📊 Dashboard' },
                      { id: 'extintores', label: '🧯 Extintores' },
                      { id: 'hidrantes', label: '💧 Hidrantes' },
                      { id: 'sinalizacao', label: '⚠️ Sinalização' },
                      { id: 'iluminacao', label: '💡 Iluminação' },
                      { id: 'bombas', label: '🔧 Casa de Bombas' },
                      { id: 'ronda', label: '📱 Ronda & Campo' },
                      { id: 'alerts', label: '🔔 Alertas' }
                    ].map(mod => (
                      <label 
                        key={mod.id} 
                        className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-all select-none text-[10px]"
                      >
                        <input 
                          type="checkbox"
                          checked={selectedModules.includes(mod.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModules(prev => [...prev, mod.id]);
                            } else {
                              setSelectedModules(prev => prev.filter(id => id !== mod.id));
                            }
                          }}
                          className="rounded border-slate-350 text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                        />
                        <span className="font-bold text-slate-700">{mod.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 justify-end">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedModules([
                      'dashboard', 'extintores', 'hidrantes', 'sinalizacao', 'iluminacao', 'bombas', 'ronda', 'alerts'
                    ]);
                  }}
                  className="px-4 py-2.5 border border-slate-200 hover:border-slate-350 bg-white text-slate-550 font-bold rounded-xl cursor-pointer text-[10px] uppercase transition-all shadow-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={inviting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer border-none text-[10px] uppercase shadow-sm"
                >
                  {inviting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full inline-block"></span>
                      PROCESSANDO...
                    </>
                  ) : 'Cadastrar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Copiar credentials do usuário convidado criado */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden space-y-4 text-xs text-slate-700">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600 rounded-t-2xl" />
            <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-lg mx-auto shadow-inner" aria-hidden="true">✓</div>
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider text-center">
              Acesso Criado com Sucesso! 🎉
            </h3>
            <p className="text-[10px] text-slate-500 text-center font-sans leading-relaxed">
              Copie ou compartilhe os detalhes de acesso abaixo com o colaborador. A senha temporária não será exibida novamente.
            </p>

            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 font-mono text-[10px] text-slate-700 space-y-2 relative shadow-inner">
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Nome Completo</span>
                <span className="text-slate-800 font-bold">{createdCredentials.name}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Username</span>
                <span className="text-red-600 font-bold">@{createdCredentials.username}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">E-mail</span>
                <span className="text-slate-800 font-bold">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">WhatsApp</span>
                <span className="text-slate-800 font-bold">{createdCredentials.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Senha de Acesso</span>
                <span className="text-red-500 font-black text-xs tracking-wider">{createdCredentials.password || createdCredentials.temp_password}</span>
              </div>
              {createdCredentials.expires_at && (
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Expiração da Conta</span>
                  <span className="text-amber-600 font-bold">{new Date(createdCredentials.expires_at).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => {
                  const pass = createdCredentials.password || createdCredentials.temp_password;
                  const textToCopy = `🚒 *SPCI - CREDENCIAIS DE ACESSO* 🚒\n\nOlá *${createdCredentials.name}*!\nSeu cadastro no SPCI foi realizado com sucesso.\n\n🌐 *Link de Acesso:* ${window.location.origin}/login?new_session=true\n📧 *E-mail:* ${createdCredentials.email}\n👤 *Username:* @${createdCredentials.username}\n🔑 *Senha:* ${pass}\n` + (createdCredentials.expires_at ? `⏳ *Validade:* até ${new Date(createdCredentials.expires_at).toLocaleDateString('pt-BR')}\n` : '') + `\nFaça seu login com segurança!`;
                  navigator.clipboard.writeText(textToCopy);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer shadow-md"
              >
                {copied ? '✓ Mensagem Copiada!' : '📋 Copiar Credenciais'}
              </button>

              <button 
                onClick={() => {
                  const pass = createdCredentials.password || createdCredentials.temp_password;
                  const msg = `🚒 *SPCI - CREDENCIAIS DE ACESSO* 🚒\n\nOlá *${createdCredentials.name}*!\nSeu cadastro no SPCI foi realizado com sucesso.\n\n🌐 *Link de Acesso:* ${window.location.origin}/login?new_session=true\n📧 *E-mail:* ${createdCredentials.email}\n👤 *Username:* @${createdCredentials.username}\n🔑 *Senha:* ${pass}\n` + (createdCredentials.expires_at ? `⏳ *Validade:* até ${new Date(createdCredentials.expires_at).toLocaleDateString('pt-BR')}\n` : '') + `\nFaça seu login com segurança!`;
                  const cleanPhone = createdCredentials.phone ? createdCredentials.phone.replace(/\D/g, '') : '';
                  const whatsappUrl = cleanPhone 
                    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
                    : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                  window.open(whatsappUrl, '_blank');
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer shadow-md"
              >
                💬 Enviar via WhatsApp
              </button>
              
              <button 
                onClick={() => setCreatedCredentials(null)}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 bg-white text-slate-500 font-bold rounded-xl text-[10px] uppercase transition-all cursor-pointer shadow-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
