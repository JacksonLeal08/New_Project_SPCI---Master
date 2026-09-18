'use client';

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  RefreshCw, 
  Share2, 
  Pencil, 
  Trash2, 
  Shield, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Copy,
  Building,
  KeyRound
} from 'lucide-react';
import { useSpci } from '@/app/context/SpciContext';
import UserFormDrawerModal from './UserFormDrawerModal';
import { copyToClipboard } from '@/lib/utils';

interface UsersManagementBentoProps {
  availableSites: string[];
  theme?: 'dark' | 'light';
}

export default function UsersManagementBento({
  availableSites,
  theme = 'light'
}: UsersManagementBentoProps) {
  const {
    userProfile,
    userList,
    loadingUsersList,
    fetchUsers,
    handleAdminRoleStatusChange,
    handleAdminDeleteUser,
    triggerSuccessNotification,
    showAlertModal,
    showConfirmModal
  } = useSpci();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [siteFilter, setSiteFilter] = useState('TODOS');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);

  // Share credentials modal
  const [sharingUser, setSharingUser] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // New credentials modal
  const [createdCredentials, setCreatedCredentials] = useState<any | null>(null);

  const isDev = userProfile?.role === 'Desenvolvedor';

  const handleOpenCreate = () => {
    setUserToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setUserToEdit(user);
    setIsFormModalOpen(true);
  };

  const handleDeleteUser = (user: any) => {
    if (user.uid === userProfile?.uid) {
      showAlertModal('Ação Bloqueada 🚫', 'Você não pode excluir a sua própria conta ativa.', 'warning');
      return;
    }

    showConfirmModal({
      title: 'Excluir Colaborador 🗑️',
      message: `Deseja realmente remover o usuário "${user.name}"? Esta ação removerá os acessos e permissões do colaborador de forma definitiva.`,
      type: 'error',
      confirmText: 'EXCLUIR USUÁRIO',
      cancelText: 'CANCELAR',
      onConfirm: async () => {
        try {
          await handleAdminDeleteUser(user.uid);
          triggerSuccessNotification('Usuário Removido!', `O perfil de "${user.name}" foi removido do sistema.`);
          await fetchUsers();
        } catch (err: any) {
          showAlertModal('Erro ao Excluir', err.message || 'Falha ao remover colaborador.', 'error');
        }
      }
    });
  };

  // Filtragem da lista
  const filteredUsers = userList.filter((u: any) => {
    const matchSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.userName || u.username || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchRole = roleFilter === 'TODOS' || u.role === roleFilter;

    const normalizedStatus = u.status === 'active' || u.status === 'Ativo' ? 'Ativo' : u.status === 'pending' || u.status === 'Pendente' ? 'Pendente' : 'Inativo';
    const matchStatus = statusFilter === 'TODOS' || normalizedStatus === statusFilter;

    const userSite = u.site || 'TODOS OS SITES (Acesso Global)';
    const matchSite = siteFilter === 'TODOS' || userSite.includes(siteFilter) || userSite.includes('TODOS');

    return matchSearch && matchRole && matchStatus && matchSite;
  });

  // Métricas
  const totalUsers = userList.length;
  const totalAdmins = userList.filter((u: any) => u.role === 'Administrador' || u.role === 'Desenvolvedor' || u.role === 'Gestor').length;
  const totalPendentes = userList.filter((u: any) => u.status !== 'active' && u.status !== 'Ativo').length;

  return (
    <div className="space-y-6 select-none font-mono">
      {/* 1. CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`p-5 rounded-2xl border transition-all flex items-center gap-4 ${
            theme === 'dark'
              ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:text-rose-500 border border-red-500/20 flex items-center justify-center text-xl shrink-0">
            <Users size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 block">
              Total de Colaboradores
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black">{totalUsers}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">cadastrados</span>
            </div>
          </div>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all flex items-center gap-4 ${
            theme === 'dark'
              ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center text-xl shrink-0">
            <Shield size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 block">
              Gestão & Liderança
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black">{totalAdmins}</span>
              <span className="text-[10px] font-bold text-red-600 dark:text-rose-400">Devs / Gestores / Admins</span>
            </div>
          </div>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all flex items-center gap-4 ${
            theme === 'dark'
              ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 block">
              Pendentes / Inativos
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black">{totalPendentes}</span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">sem acesso ativo</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS E AÇÕES */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar usuário por nome, email ou @username..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all focus:outline-none focus:ring-2 focus:ring-red-500/30 border ${
              theme === 'dark'
                ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600'
                : 'bg-slate-50 border-slate-300 text-slate-950 placeholder:text-slate-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Filtro Role */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border focus:outline-none ${
              theme === 'dark'
                ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            <option value="TODOS">Perfil: Todos</option>
            <option value="Desenvolvedor">💻 Devs</option>
            <option value="Gestor">👔 Gestores</option>
            <option value="Administrador">🛡️ Admins</option>
            <option value="Usuário">👷 Técnicos</option>
          </select>

          {/* Filtro Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border focus:outline-none ${
              theme === 'dark'
                ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            <option value="TODOS">Status: Todos</option>
            <option value="Ativo">🟢 Ativos</option>
            <option value="Pendente">🟡 Pendentes</option>
            <option value="Inativo">🔴 Inativos</option>
          </select>

          {/* Filtro Site */}
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border focus:outline-none ${
              theme === 'dark'
                ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            <option value="TODOS">Contrato: Todos</option>
            {availableSites.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Recarregar */}
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loadingUsersList}
            title="Recarregar usuários"
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            <RefreshCw size={15} className={loadingUsersList ? 'animate-spin text-red-600' : ''} />
          </button>

          {/* + Novo Usuário */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-md shadow-red-600/30 flex items-center gap-1.5 active:scale-95"
          >
            <UserPlus size={16} />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* 3. TABELA GERENCIAL DE USUÁRIOS */}
      <div
        className={`rounded-2xl border overflow-hidden shadow-xs ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr
                className={`border-b text-[9px] font-black uppercase tracking-wider ${
                  theme === 'dark'
                    ? 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                <th className="p-4">Colaborador</th>
                <th className="p-4">Perfil RBAC</th>
                <th className="p-4">Contratos Autorizados</th>
                <th className="p-4">Status da Conta</th>
                <th className="p-4 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
              {loadingUsersList ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-red-600 border-t-transparent animate-spin rounded-full mx-auto mb-2" />
                    Carregando colaboradores...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Nenhum colaborador encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u: any) => {
                  const isSelf = u.uid === userProfile?.uid;
                  const isUserActive = u.status === 'active' || u.status === 'Ativo';

                  return (
                    <tr
                      key={u.uid}
                      className={`transition-colors ${
                        theme === 'dark' ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Colaborador */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs bg-red-50 dark:bg-zinc-800 text-red-600 dark:text-rose-400 border-red-200 dark:border-zinc-700 shrink-0">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs text-slate-950 dark:text-zinc-100 truncate flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase">
                                  Você
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono truncate">
                              @{u.userName || u.username} • {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Perfil RBAC */}
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border inline-block ${
                            u.role === 'Desenvolvedor'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                              : u.role === 'Gestor'
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                              : u.role === 'Administrador'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700'
                          }`}
                        >
                          {u.role === 'Desenvolvedor' ? '💻 Desenvolvedor' : u.role === 'Gestor' ? '👔 Gestor' : u.role === 'Administrador' ? '🛡️ Administrador' : '👷 Técnico'}
                        </span>
                      </td>

                      {/* Contratos Autorizados */}
                      <td className="p-4 font-mono text-[10px]">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.site ? (
                            u.site.split(',').map((s: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 truncate max-w-[140px]"
                              >
                                {s.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">SALOBO</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <select
                          value={isUserActive ? 'active' : u.status === 'pending' || u.status === 'Pendente' ? 'pending' : 'inactive'}
                          disabled={isSelf}
                          onChange={(e) => handleAdminRoleStatusChange(u.uid, u.role, e.target.value as any)}
                          className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] uppercase border cursor-pointer focus:outline-none transition-all ${
                            isUserActive
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : u.status === 'pending' || u.status === 'Pendente'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                              : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30'
                          } ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <option value="active">🟢 Ativo</option>
                          <option value="pending">🟡 Pendente</option>
                          <option value="inactive">🔴 Inativo</option>
                        </select>
                      </td>

                      {/* Ações */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Compartilhar WhatsApp / Credenciais */}
                          <button
                            type="button"
                            onClick={() => setSharingUser(u)}
                            title="Compartilhar credenciais via WhatsApp ou Copiar"
                            className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer shadow-2xs"
                          >
                            <Share2 size={13} />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            title="Editar cadastro e permissões"
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              theme === 'dark'
                                ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs'
                            }`}
                          >
                            <Pencil size={13} />
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            disabled={isSelf}
                            title={isSelf ? 'Você não pode excluir sua própria conta' : 'Excluir colaborador'}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isSelf
                                ? 'opacity-20 cursor-not-allowed border-transparent'
                                : 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white'
                            }`}
                          >
                            <Trash2 size={13} />
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
      </div>

      {/* 4. MODAL DRAWER DE CADASTRO E EDIÇÃO */}
      <UserFormDrawerModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={(creds) => {
          fetchUsers();
          if (creds && !userToEdit) {
            setCreatedCredentials(creds);
          } else {
            triggerSuccessNotification('Sucesso!', 'Os dados do colaborador foram atualizados.');
          }
        }}
        userToEdit={userToEdit}
        availableSites={availableSites}
        theme={theme}
      />

      {/* 5. MODAL DE COMPARTILHAMENTO DE CREDENCIAIS (EXISTENTE) */}
      {sharingUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm select-none font-mono">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl relative overflow-hidden ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center text-xl">
                📲
              </div>
              <div>
                <h4 className="font-black text-sm uppercase">Compartilhar Acesso</h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans">
                  Link direto e credenciais corporativas do Cockpit SPCI
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2 text-xs">
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Colaborador</span>
                <span className="font-black">{sharingUser.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Login / Username</span>
                  <span className="text-red-600 font-bold">@{sharingUser.userName || sharingUser.username}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Nível RBAC</span>
                  <span className="font-bold">{sharingUser.role}</span>
                </div>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">E-mail</span>
                <span className="font-bold truncate block">{sharingUser.email}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Contrato Autorizado</span>
                <span className="font-bold">{sharingUser.site || 'TODOS OS SITES (Acesso Global)'}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const text = `🏢 *GRUPO OMG // SPCI MASTER*\n───────────────\n🔥 *CREDENCIAIS DE ACESSO CORPORATIVO*\n\nOlá, *${sharingUser.name}*!\nSeu perfil no *SPCI Master* está ativo.\n\n📍 *Nível:* ${sharingUser.role}\n🌐 *Cockpit:* https://spci-master.vercel.app/login\n📧 *Login:* ${sharingUser.email}\n👤 *Username:* @${sharingUser.userName || sharingUser.username}\n🏢 *Contrato:* ${sharingUser.site || 'Acesso Global'}\n\n_Grupo OMG © 2026_`;
                  copyToClipboard(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 text-white font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                <Copy size={14} />
                {copied ? '✓ Copiado!' : 'Copiar Dados de Acesso'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = `🏢 *GRUPO OMG // SPCI MASTER*\n───────────────\n🔥 *CREDENCIAIS DE ACESSO CORPORATIVO*\n\nOlá, *${sharingUser.name}*!\nSeu perfil no *SPCI Master* está ativo.\n\n📍 *Nível:* ${sharingUser.role}\n🌐 *Cockpit:* https://spci-master.vercel.app/login\n📧 *Login:* ${sharingUser.email}\n👤 *Username:* @${sharingUser.userName || sharingUser.username}\n🏢 *Contrato:* ${sharingUser.site || 'Acesso Global'}\n\n_Grupo OMG © 2026_`;
                  const cleanPhone = (sharingUser.telefoneWhatsapp || sharingUser.phone || '').replace(/\D/g, '');
                  const url = cleanPhone
                    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
                    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                  window.open(url, '_blank');
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer border-none shadow-md shadow-emerald-600/20"
              >
                <span>📲</span>
                Enviar via WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setSharingUser(null)}
                className={`w-full py-2 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE SUCESSO DE CRIAÇÃO (COM SENHA TEMPORÁRIA) */}
      {createdCredentials && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm select-none font-mono">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl relative overflow-hidden ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center text-2xl mx-auto mb-2">
                ✓
              </div>
              <h4 className="font-black text-sm uppercase">Usuário Criado com Sucesso! 🎉</h4>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans">
                A senha de acesso abaixo é temporária. Compartilhe-a com o colaborador agora.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2 text-xs">
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Nome</span>
                <span className="font-black">{createdCredentials.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Username</span>
                  <span className="text-red-600 font-bold">@{createdCredentials.username}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Senha Temporária</span>
                  <span className="text-red-600 font-black text-sm">{createdCredentials.password}</span>
                </div>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">E-mail</span>
                <span className="font-bold truncate block">{createdCredentials.email}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const text = `🏢 *GRUPO OMG // SPCI MASTER*\n───────────────\n🔥 *CREDENCIAIS DE ACESSO CORPORATIVO*\n\nOlá, *${createdCredentials.name}*!\nSeu perfil no *SPCI Master* foi cadastrado.\n\n📍 *Nível:* ${createdCredentials.role}\n🌐 *Cockpit:* https://spci-master.vercel.app/login\n📧 *Login:* ${createdCredentials.email}\n👤 *Username:* @${createdCredentials.username}\n🔑 *Senha Temporária:* ${createdCredentials.password}\n🏢 *Contrato:* ${createdCredentials.site || 'Acesso Global'}\n\n_Grupo OMG © 2026_`;
                  copyToClipboard(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 text-white font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                <Copy size={14} />
                {copied ? '✓ Dados Copiados!' : 'Copiar Credenciais'}
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className={`w-full py-2 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
