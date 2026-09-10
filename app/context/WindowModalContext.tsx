'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type WindowState = 'restored' | 'maximized' | 'minimized' | 'closed';

export interface WindowItem {
  id: string;
  title: string;
  subtitle?: string;
  iconName?: string;
  badgeStatus?: string;
  state: WindowState;
  lastActiveAt: number;
  onRestore?: () => void;
  onClose?: () => void;
}

interface WindowModalContextType {
  windows: Record<string, WindowItem>;
  activeWindowId: string | null;
  registerWindow: (
    id: string,
    data: {
      title: string;
      subtitle?: string;
      iconName?: string;
      badgeStatus?: string;
      onRestore?: () => void;
      onClose?: () => void;
    }
  ) => void;
  unregisterWindow: (id: string) => void;
  setWindowState: (id: string, state: WindowState) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  getWindowState: (id: string) => WindowState;
  minimizedWindows: WindowItem[];
}

const WindowModalContext = createContext<WindowModalContextType | undefined>(undefined);

export function WindowModalProvider({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<Record<string, WindowItem>>({});
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

  const registerWindow = useCallback(
    (
      id: string,
      data: {
        title: string;
        subtitle?: string;
        iconName?: string;
        badgeStatus?: string;
        onRestore?: () => void;
        onClose?: () => void;
      }
    ) => {
      setWindows((prev) => {
        const existing = prev[id];
        return {
          ...prev,
          [id]: {
            id,
            title: data.title,
            subtitle: data.subtitle,
            iconName: data.iconName,
            badgeStatus: data.badgeStatus,
            state: existing ? existing.state : 'restored',
            lastActiveAt: Date.now(),
            onRestore: data.onRestore,
            onClose: data.onClose,
          },
        };
      });
      setActiveWindowId(id);
    },
    []
  );

  const unregisterWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setActiveWindowId((prev) => (prev === id ? null : prev));
  }, []);

  const setWindowState = useCallback((id: string, state: WindowState) => {
    setWindows((prev) => {
      const item = prev[id];
      if (!item) return prev;
      return {
        ...prev,
        [id]: {
          ...item,
          state,
          lastActiveAt: Date.now(),
        },
      };
    });
    if (state !== 'minimized' && state !== 'closed') {
      setActiveWindowId(id);
    }
  }, []);

  const minimizeWindow = useCallback(
    (id: string) => {
      setWindowState(id, 'minimized');
    },
    [setWindowState]
  );

  const maximizeWindow = useCallback(
    (id: string) => {
      setWindowState(id, 'maximized');
    },
    [setWindowState]
  );

  const restoreWindow = useCallback(
    (id: string) => {
      setWindowState(id, 'restored');
      const item = windows[id];
      if (item?.onRestore) {
        item.onRestore();
      }
    },
    [setWindowState, windows]
  );

  const closeWindow = useCallback(
    (id: string) => {
      const item = windows[id];
      if (item?.onClose) {
        item.onClose();
      }
      setWindowState(id, 'closed');
      unregisterWindow(id);
    },
    [setWindowState, unregisterWindow, windows]
  );

  const bringToFront = useCallback((id: string) => {
    setActiveWindowId(id);
    setWindows((prev) => {
      const item = prev[id];
      if (!item) return prev;
      return {
        ...prev,
        [id]: { ...item, lastActiveAt: Date.now() },
      };
    });
  }, []);

  const getWindowState = useCallback(
    (id: string): WindowState => {
      return windows[id]?.state || 'closed';
    },
    [windows]
  );

  const minimizedWindows = useMemo(() => {
    return Object.values(windows).filter((w) => w.state === 'minimized');
  }, [windows]);

  return (
    <WindowModalContext.Provider
      value={{
        windows,
        activeWindowId,
        registerWindow,
        unregisterWindow,
        setWindowState,
        minimizeWindow,
        maximizeWindow,
        restoreWindow,
        closeWindow,
        bringToFront,
        getWindowState,
        minimizedWindows,
      }}
    >
      {children}
    </WindowModalContext.Provider>
  );
}

export function useWindowModal() {
  const context = useContext(WindowModalContext);
  if (!context) {
    throw new Error('useWindowModal deve ser usado dentro de um WindowModalProvider');
  }
  return context;
}
