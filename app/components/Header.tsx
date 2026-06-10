import React, { useState } from 'react';
import { useSpci } from '../context/SpciContext';
import { 
  Search, 
  User as UserIcon, 
  LogIn, 
  Menu, 
  Bell, 
  Trash2, 
  CheckCheck, 
  Plus, 
  ClipboardCheck,
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationItem } from '@/lib/types';

interface HeaderProps {
  onScanClick: () => void;
  onProfileClick: () => void;
  onMenuClick?: () => void;
}

export const Header = ({ onScanClick, onProfileClick, onMenuClick }: HeaderProps) => {
  const { 
    currentUser, 
    userProfile, 
    handleGoogleLogin,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications
  } = useSpci();

  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  return (
    <header className="bg-white text-slate-800 flex justify-between items-center w-full px-6 h-16 shrink-0 shadow-xs border-b border-slate-100 z-30 select-none font-sans relative">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border-none bg-transparent text-slate-600 hover:text-slate-900"
            aria-label="Abrir menu lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="md:hidden text-lg font-black tracking-tight text-red-600">SPCI</span>
        <span className="hidden md:inline-block font-['Hanken_Grotesk'] font-extrabold tracking-tight text-slate-900 text-sm flex items-center gap-2">
          <span className="text-red-600">🚒</span> PLANTA DE SEGURANÇA SPCI
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Botão de Busca Rápida / QR Scan */}
        <button 
          onClick={onScanClick}
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-xs font-['Hanken_Grotesk'] font-bold uppercase rounded-xl tracking-wider border border-slate-200 flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 shadow-xs hover:scale-[1.02]"
          aria-label="Buscar ou Escanear Ativo"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Scan / Buscar</span>
        </button>

        {/* Sino de Notificações */}
        {currentUser && (
          <div className="relative">
            <button 
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all rounded-xl border border-slate-200 flex items-center justify-center relative cursor-pointer text-slate-600 hover:text-slate-900 shadow-xs hover:scale-[1.02]"
              aria-label="Abrir notificações"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[8px] font-black text-white shadow-md animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            
            <AnimatePresence>
              {showNotifs && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 z-50 text-slate-800 text-left font-sans"
                >
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-150 mb-2">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <span>🔔</span> Notificações
                    </h4>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllNotificationsAsRead}
                          className="text-[9px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 border-none bg-transparent cursor-pointer"
                          title="Marcar todas como lidas"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {notifications && notifications.length > 0 && (
                        <button 
                          onClick={clearAllNotifications}
                          className="text-[9px] font-bold text-slate-500 hover:text-red-600 flex items-center gap-1 border-none bg-transparent cursor-pointer"
                          title="Limpar tudo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {!notifications || notifications.length === 0 ? (
                      <div className="py-8 text-center text-[10px] text-slate-400 font-sans">
                        Nenhuma notificação recebida
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id}
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            setSelectedNotif(notif);
                          }}
                          className={`p-2.5 rounded-xl border transition-all duration-200 flex items-start gap-2.5 relative cursor-pointer hover:bg-slate-50 group ${
                            notif.read ? 'bg-white border-slate-100' : 'bg-slate-50/60 border-red-100'
                          }`}
                        >
                          {!notif.read && (
                            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-red-600" />
                          )}
                          
                          <div className={`p-1.5 rounded-lg shrink-0 ${
                            notif.type === 'cadastro' ? 'bg-emerald-50 text-emerald-600' :
                            notif.type === 'inspecao' ? 'bg-cyan-50 text-cyan-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {notif.type === 'cadastro' ? <Plus className="w-3.5 h-3.5" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
                          </div>
                          
                          <div className="min-w-0 flex-1 leading-normal pr-3">
                            <p className="text-[10px] font-bold text-slate-800 truncate">{notif.title}</p>
                            <p className="text-[9px] text-slate-500 truncate mt-0.5">{notif.message}</p>
                            <p className="text-[8px] text-slate-400 font-mono mt-1">
                              {new Date(notif.created_at).toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 border-none bg-transparent cursor-pointer p-0.5 self-center transition-opacity"
                            title="Excluir"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Informações de Perfil ou Botão de Login */}
        {currentUser ? (
          <div 
            onClick={onProfileClick}
            className="flex items-center gap-2 border-l border-slate-100 pl-4 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition-all hover:scale-[1.02]"
            title={`Editar Perfil Técnico: ${currentUser.email}`}
            id="header-user-profile-active"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onProfileClick(); }}
          >
            {userProfile?.logoUrl ? (
              <img 
                alt={`Logo corporativo de ${userProfile?.name || 'técnico'}`} 
                className="w-8 h-8 rounded-xl border border-red-500 object-cover bg-white p-0.5 shadow-xs" 
                src={userProfile.logoUrl}
                referrerPolicy="no-referrer"
              />
            ) : currentUser.photoURL ? (
              <img 
                alt={`Foto de perfil de ${userProfile?.name || 'técnico'}`} 
                className="w-8 h-8 rounded-xl border border-red-500 object-cover shadow-xs" 
                src={currentUser.photoURL}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-xl bg-red-50 text-red-600 font-bold flex items-center justify-center text-xs uppercase border border-red-200"
                aria-hidden="true"
              >
                {currentUser.email?.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block text-left leading-tight">
              <span className="sr-only">Conectado como:</span>
              <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wide truncate max-w-[120px]">
                {userProfile?.name || currentUser.displayName || 'Técnico SPCI'}
              </p>
              <p className="text-[8px] font-mono text-red-600 uppercase tracking-wider font-bold">
                {userProfile?.role === 'Desenvolvedor' ? '💻 Dev' : userProfile?.role === 'Administrador' ? '🛡️ Admin' : '👷 Técnico'}
              </p>
            </div>
          </div>
        ) : (
          <div className="border-l border-slate-100 pl-4">
            <button
              onClick={handleGoogleLogin}
              className="bg-white text-slate-800 text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-slate-50 transition-all border border-slate-200 cursor-pointer shadow-xs hover:scale-[1.02]"
              aria-label="Conectar com conta Google"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-650" />
              <span>Conectar Google</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Notificação */}
      <AnimatePresence>
        {selectedNotif && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 font-mono select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative text-slate-800"
            >
              <button 
                onClick={() => setSelectedNotif(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 border border-slate-200 hover:border-slate-350 bg-slate-50 px-2 py-0.5 text-xs font-bold cursor-pointer rounded-lg"
              >
                ✕
              </button>

              <div className="flex gap-3 items-start mb-4">
                <div className={`p-2 rounded-xl shrink-0 ${
                  selectedNotif.type === 'cadastro' ? 'bg-emerald-50 text-emerald-600' :
                  selectedNotif.type === 'inspecao' ? 'bg-cyan-50 text-cyan-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {selectedNotif.type === 'cadastro' ? <Plus className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">{selectedNotif.title}</h3>
                  <p className="text-[9px] text-slate-450 mt-0.5 font-mono">{new Date(selectedNotif.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100 text-xs font-sans text-slate-650 leading-relaxed">
                <p>{selectedNotif.message}</p>
                
                {selectedNotif.patrimonio && (
                  <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl font-mono text-[9px] flex justify-between items-center">
                    <span className="font-extrabold text-slate-500 uppercase">Patrimônio Identificado:</span>
                    <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">{selectedNotif.patrimonio}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-slate-100 mt-6 font-mono">
                <button 
                  onClick={() => {
                    deleteNotification(selectedNotif.id);
                    setSelectedNotif(null);
                  }}
                  className="flex-1 py-2 text-[10px] uppercase font-bold text-slate-550 border border-slate-200 hover:bg-slate-50 bg-white cursor-pointer rounded-xl transition-all"
                >
                  Excluir Notificação
                </button>
                <button 
                  onClick={() => setSelectedNotif(null)}
                  className="flex-1 py-2 text-[10px] uppercase font-bold text-white bg-slate-800 hover:bg-slate-700 shadow-md transition-all cursor-pointer rounded-xl border-none"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
