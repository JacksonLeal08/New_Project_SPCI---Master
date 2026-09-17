'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, ShieldAlert, Database } from 'lucide-react';
import { SyncQueue } from '@/lib/syncQueue';
import { MediaQueue } from '@/lib/mediaQueue';

interface NetworkSyncIndicatorProps {
  isMobile?: boolean;
}

export default function NetworkSyncIndicator({ isMobile }: NetworkSyncIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);

  const checkStatus = useCallback(async () => {
    try {
      const [assets, inspections, medias] = await Promise.all([
        SyncQueue.getQueue(),
        SyncQueue.getInspectionQueue(),
        MediaQueue.getQueue(),
      ]);
      const tasks = assets.length + inspections.length + medias.length;
      const failed = 
        assets.filter(t => t.status === 'failed').length + 
        inspectionQueueFailed(inspections);
      
      setTotalTasks(tasks);
      setTotalFailed(failed);
    } catch {
      // Ignora erro inicial de inicialização
    }
  }, []);

  const inspectionQueueFailed = (inspections: any[]) => {
    return (inspections || []).filter(t => t.status === 'failed').length;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    checkStatus();

    const handleOnline = () => {
      setIsOnline(true);
      checkStatus();
    };
    const handleOffline = () => {
      setIsOnline(false);
      checkStatus();
    };
    const handleUpdate = () => {
      checkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('spci_sync_updated', handleUpdate);

    const interval = setInterval(checkStatus, 5000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('spci_sync_updated', handleUpdate);
      clearInterval(interval);
    };
  }, [checkStatus]);

  const handleClick = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spci-open-sync-panel'));
    }
  };

  // Definições visuais conforme o estado
  let icon = <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  let tooltip = 'SPCI Conectado • Sistema Sincronizado';
  let badgeText: string | null = null;
  let buttonBorder = 'border-slate-200 dark:border-zinc-800';

  if (!isOnline) {
    icon = <WifiOff className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
    tooltip = 'Modo Offline Ativo • Dados salvos localmente';
    badgeText = totalTasks > 0 ? `${totalTasks}` : 'OFF';
    buttonBorder = 'border-amber-400/80 bg-amber-50/60 dark:bg-amber-950/40';
  } else if (totalFailed > 0) {
    icon = <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />;
    tooltip = `${totalFailed} tarefa(s) com falha de sincronização`;
    badgeText = `${totalFailed}`;
    buttonBorder = 'border-red-400/80 bg-red-50/60 dark:bg-red-950/40';
  } else if (totalTasks > 0) {
    icon = <Database className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
    tooltip = `${totalTasks} item(ns) na fila aguardando sincronização`;
    badgeText = `${totalTasks}`;
    buttonBorder = 'border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/30';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      aria-label="Status de Rede e Sincronização SPCI"
      className={`relative ${
        isMobile ? 'w-9 h-9' : 'p-2.5'
      } bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 active:scale-95 transition-all rounded-xl border ${buttonBorder} flex items-center justify-center cursor-pointer shadow-xs hover:scale-[1.02] shrink-0`}
    >
      {icon}

      {badgeText ? (
        <span
          className={`absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[8px] font-black text-white shadow-xs ${
            !isOnline || totalTasks > 0 ? 'bg-amber-500' : 'bg-red-600'
          }`}
        >
          {badgeText}
        </span>
      ) : isOnline && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
      )}
    </button>
  );
}
