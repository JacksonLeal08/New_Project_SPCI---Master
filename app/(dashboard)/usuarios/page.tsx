'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';

export default function UsuariosPage() {
  const router = useRouter();
  const {
    userProfile,
    userList,
    loadingUsersList,
    fetchUsers,
    handleAdminRoleStatusChange,
    handleAdminDeleteUser,
    addConsoleLog
  } = useSpci();

  // Load user list on mount
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchUsers();
    }
  }, [userProfile, fetchUsers]);

  // Guard: if userProfile is loaded but role is not admin, block view
  if (userProfile && userProfile.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-3xl max-w-md mx-auto shadow-sm space-y-4 my-12">
        <span className="text-4xl" role="img" aria-label="Acesso restrito">🚫</span>
        <h3 className="font-['Hanken_Grotesk'] font-black text-xl text-slate-800">Acesso Restrito</h3>
        <p className="text-xs text-slate-500">Esta área de governança de credenciais é exclusiva para administradores da planta SPCI.</p>
        <button 
          onClick={() => router.push('/dashboard')}
          className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-all border-none cursor-pointer"
        >
          Voltar para Dashboard
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 max-w-6xl mx-auto pb-24"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-800 via-slate-900 to-[#121c21] p-6 rounded-3xl text-white shadow-xl border border-white/5 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-10 text-9xl select-none pointer-events-none" aria-hidden="true">👥</div>
        <div>
          <h2 className="font-['Hanken_Grotesk'] font-black text-2xl tracking-tight flex items-center gap-2">
            <span>👥</span> Gestão Governamental de Usuários
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            Defina níveis de acesso, mude perfis para Administrador ou Técnico de Campo, aprove ou suspenda contas registradas no Firestore SPCI.
          </p>
        </div>
        <div>
          <button 
            onClick={() => {
              addConsoleLog("[Admin] Recarregando lista de usuários...");
              fetchUsers();
            }}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-['Hanken_Grotesk'] font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            🔄 Recarregar
          </button>
        </div>
      </div>

      {/* Users Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl font-bold" aria-hidden="true">🎯</div>
          <div>
            <h4 className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest leading-none">Total Cadastrados</h4>
            <p className="font-['Hanken_Grotesk'] font-black text-2xl text-slate-800 mt-1">{userList.length}</p>
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center text-xl font-bold" aria-hidden="true">🛡️</div>
          <div>
            <h4 className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest leading-none">Administradores</h4>
            <p className="font-['Hanken_Grotesk'] font-black text-2xl text-slate-800 mt-1 flex items-center gap-1.5">
              {userList.filter(u => u.role === 'admin').length}
              <span className="text-xs text-slate-400">(incl. jackson602)</span>
            </p>
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-xl font-bold" aria-hidden="true">⌛</div>
          <div>
            <h4 className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest leading-none">Pendentes / Inativos</h4>
            <p className="font-['Hanken_Grotesk'] font-black text-2xl text-slate-800 mt-1">
              {userList.filter(u => u.status !== 'active').length}
            </p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b p-4 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Quadro de Acessos Real-time</span>
          <span className="text-[10px] font-mono font-bold text-slate-400">FIRESTORE BD ACTIVE</span>
        </div>

        {loadingUsersList ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent animate-spin rounded-full"></span>
            Sincronizando usuários...
          </div>
        ) : userList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            Nenhum usuário cadastrado além de você. Novas contas serão adicionadas conforme realizarem login no sistema.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/50 border-b text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                  <th className="p-4">Colaborador</th>
                  <th className="p-4">E-mail verificado</th>
                  <th className="p-4">Nível de Conta</th>
                  <th className="p-4">Status de Acesso</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {userList.map(u => (
                  <tr key={u.uid} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-4 flex items-center gap-3">
                      {u.logoUrl ? (
                        <img 
                          src={u.logoUrl} 
                          className="w-9 h-9 rounded-xl object-contain border bg-white p-0.5 shadow-sm" 
                          alt="Logo"
                          referrerPolicy="no-referrer"
                        />
                      ) : u.photoURL ? (
                        <img 
                          src={u.photoURL} 
                          className="w-9 h-9 rounded-full border object-cover shadow-sm" 
                          alt="Avatar"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-600 text-white font-bold flex items-center justify-center text-xs border uppercase">
                          {u.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-800">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">{u.email}</p>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[10px] text-slate-500">
                      {u.email.toLowerCase() === 'jackson602@gmail.com' ? (
                        <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full font-bold font-mono">🛡️ SUPER ADMIN</span>
                      ) : (
                        <span className="text-emerald-300 bg-slate-800 px-2 py-0.5 rounded-md font-extrabold font-mono text-[9px]">✓ GOOGLE VERIFIED</span>
                      )}
                    </td>
                    <td className="p-4">
                      <select 
                        value={u.role} 
                        disabled={u.email.toLowerCase() === 'jackson602@gmail.com'}
                        onChange={(e) => handleAdminRoleStatusChange(u.uid, e.target.value as any, u.status)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-xs focus:outline-none focus:border-slate-500 cursor-pointer"
                      >
                        <option value="user">👷 Técnico de Campo</option>
                        <option value="admin">🛡️ Administrador</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <select 
                        value={u.status} 
                        disabled={u.email.toLowerCase() === 'jackson602@gmail.com'}
                        onChange={(e) => handleAdminRoleStatusChange(u.uid, u.role, e.target.value as any)}
                        className={`border rounded-lg p-1.5 font-bold text-xs focus:outline-none cursor-pointer ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : u.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
                      >
                        <option value="active">🟢 Ativo (Acesso Liberado)</option>
                        <option value="pending">🟡 Pendente (Sem Acesso)</option>
                        <option value="inactive">🔴 Inativo / Suspenso</option>
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleAdminDeleteUser(u.uid)}
                        disabled={u.email.toLowerCase() === 'jackson602@gmail.com'}
                        className="text-slate-400 hover:text-red-600 p-2 rounded-lg bg-slate-50 hover:bg-rose-50 active:scale-95 transition-all text-sm disabled:opacity-30 disabled:pointer-events-none cursor-pointer border-none"
                        title="Remover Cadastro Permanentemente"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
