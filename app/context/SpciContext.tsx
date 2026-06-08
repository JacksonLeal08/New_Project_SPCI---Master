'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CompatibleUser as User } from '@/lib/supabaseAuth';
import { 
  initAuth, 
  googleSignIn, 
  logout,
  signInWithEmailOrUsername
} from '@/lib/supabaseAuth';
import { 
  registerOrLoginUserProfile, 
  getUserProfile, 
  updateUserLogo, 
  updateUserRoleAndStatus, 
  getAllUserProfiles, 
  deleteUserProfileByAdmin,
  getAssetsList,
  saveAssetToDb,
  deleteAssetFromDb,
  fetchRecentInspecoes
} from '@/lib/supabaseDb';
import { supabase } from '@/lib/supabaseClient';
import { idb } from '@/lib/indexedDb';
import { SyncQueue } from '@/lib/syncQueue';
import { playTelemetryPingSound } from '@/lib/audio';
import { MediaQueue } from '@/lib/mediaQueue';

// --- INITIAL SEED DATA ---
const INITIAL_EXTINTORES = [
  { id: '101', idAtivo: 'PAT-E-101', model: 'PQS ABC - 8KG', location: 'Almoxarifado Central', subLocation: 'Setor B', seloInmetro: '98765432', chassi: 'E-4011', peso: '8', lastRecarga: '2023-03-15', recurrenceInterval: '1 Ano', validadeRecarga: '2024-03-15', validadeTesteHidro: '2027', status: 'Vencido' },
  { id: '102', idAtivo: 'PAT-E-102', model: 'CO2 - 6KG', location: 'Painel Elétrico Principal', subLocation: 'Setor Máquinas', seloInmetro: '98765433', chassi: 'E-4012', peso: '6', lastRecarga: '2024-05-10', recurrenceInterval: '1 Ano', validadeRecarga: '2025-05-10', validadeTesteHidro: '2028', status: 'Em Manutenção' },
  { id: '103', idAtivo: 'PAT-E-103', model: 'Água Pressurizada - 10L', location: 'Corredor Administrativo', subLocation: 'Térreo', seloInmetro: '98765438', chassi: 'E-4013', peso: '10', lastRecarga: '2024-12-12', recurrenceInterval: '1 Ano', validadeRecarga: '2025-12-12', validadeTesteHidro: '2029', status: 'Conforme' },
  { id: '104', idAtivo: 'PAT-E-104', model: 'PQS BC - 4KG', location: 'Casa de Máquinas 02', subLocation: 'Geradores', seloInmetro: '98765439', chassi: 'E-4014', peso: '4', lastRecarga: '2025-01-05', recurrenceInterval: '1 Ano', validadeRecarga: '2026-01-05', validadeTesteHidro: '2030', status: 'Conforme' }
];

const INITIAL_HIDRANTES = [
  { id: '201', idAtivo: 'PAT-H-1042', location: 'Setor B - Logística', subLocation: 'Corredor Principal, Coluna 4', components: ['2 Mangueiras (15m)', '1 Esguicho Regulável', '2 Chaves Storz'], lastInsp: '2025-08-12', nextInsp: '2026-10-12', status: 'Conforme' },
  { id: '202', idAtivo: 'PAT-H-1055', location: 'Área Externa - Pátio', subLocation: 'Próximo à Portaria Sul', components: ['4 Mangueiras (15m)', '2 Esguichos Agulheta', '1 Chave Storz'], lastInsp: '2024-11-05', nextInsp: '2025-05-05', status: 'Vencido' },
  { id: '203', idAtivo: 'PAT-H-1088', location: 'Setor C - Produção', subLocation: 'Próximo à Máquina Injetora 03', components: ['2 Mangueiras (15m) retiradas para teste', '1 Esguicho Regulável', '2 Chaves Storz'], lastInsp: '2025-09-10', nextInsp: '2025-10-25', status: 'Em Manutenção' }
];

const INITIAL_SINALIZACAO = [
  { id: '301', idAtivo: 'SIN-1042', location: 'MANGANÊS', subLocation: 'Corredor Principal', model: 'Seta Direita - C3', group: 'Rota de Fuga', status: 'Conforme' },
  { id: '302', idAtivo: 'SIN-1045', location: 'ALMOXARIFADO', subLocation: 'Parede Leste, Máq. de Corte', model: 'Indicação de Extintor', group: 'Equipamentos', status: 'Não Conforme' },
  { id: '303', idAtivo: 'SIN-1088', location: 'ROTA DE FUGA 02', subLocation: 'Portão D, Acesso Carga', model: 'Saída de Emergência', group: 'Rota de Fuga', status: 'Faltante' }
];

const INITIAL_ILUMINACAO = [
  { id: '401', idAtivo: 'LUM-044', location: 'BARRAGEM DO AZUL', subLocation: 'Saída Norte', systemType: 'CONJUNTO DE BLOCO AUTÔNOMO', model: 'Bloco de Led', qty: 1, battery: '0%', autonomy: '0m / 120m', status: 'Falha Carga' },
  { id: '402', idAtivo: 'LUM-089', location: 'MANGANÊS', subLocation: 'Corredor C - Próx. Almoxarifado', systemType: 'CONJUNTO DE BLOCO AUTÔNOMO', model: 'Lâmpada LED', qty: 2, battery: '45%', autonomy: '55m / 120m', status: 'Atenção' },
  { id: '403', idAtivo: 'LUM-012', location: 'ROTA DE FUGA 01', subLocation: 'Recepção Principal', systemType: 'BLOCOS CENTRALIZADOS', model: 'Bloco de Led', qty: 1, battery: '100%', autonomy: '135m / 120m', status: 'Operacional' },
  { id: '404', idAtivo: 'LUM-105', location: 'FERRO', subLocation: 'Refeitório - Leste', systemType: 'BLOCOS CENTRALIZADOS', model: 'Bloco de Led com Balizamento', qty: 1, battery: '90%', autonomy: '125m / 120m', status: 'Operacional' }
];

const INITIAL_BOMBAS = [
  { id: 'B1', name: 'Bomba Jockey', code: 'BMB-01', type: 'Elétrica (5 CV)', power: 'Rede 380V', range: '115 - 125 PSI', starts: '12', status: 'Standby' },
  { id: 'B2', name: 'Bomba Elétrica', code: 'BMB-02', type: 'Principal (75 CV)', power: 'Network 380V / 45A', range: '100 - 125 PSI', starts: '1', status: 'Operacional' },
  { id: 'B3', name: 'Bomba Diesel', code: 'BMB-03', type: 'Combustão', power: 'Diesel (Tanque 45%)', range: 'Battery 26.2V', starts: 'Nível Óleo Baixo', status: 'Manutenção Req.' }
];

export interface PremiumAlertInfo {
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'critical';
  dispatchData?: any;
}

interface SpciContextType {
  // Auth
  currentUser: User | null;
  userProfile: any | null;
  authChecking: boolean;
  userList: any[];
  loadingUsersList: boolean;
  
  // Data lists
  extintores: any[];
  hidrantes: any[];
  sinalizacoes: any[];
  iluminacoes: any[];
  bombas: any[];
  complianceLogs: any[];
  
  // Setters/actions for data lists
  setExtintores: React.Dispatch<React.SetStateAction<any[]>>;
  setHidrantes: React.Dispatch<React.SetStateAction<any[]>>;
  setSinalizacoes: React.Dispatch<React.SetStateAction<any[]>>;
  setIluminacoes: React.Dispatch<React.SetStateAction<any[]>>;
  setBombas: React.Dispatch<React.SetStateAction<any[]>>;
  setComplianceLogs: React.Dispatch<React.SetStateAction<any[]>>;
  
  saveAssetsList: (moduleKey: string, data: any[]) => Promise<void>;
  
  // Modals & UI States
  premiumAlert: PremiumAlertInfo | null;
  setPremiumAlert: React.Dispatch<React.SetStateAction<PremiumAlertInfo | null>>;
  triggerSuccessNotification: (title: string, message: string) => void;
  
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  newAssetType: 'extintor' | 'hidrante' | 'sinalizacao' | 'iluminacao' | 'bomba';
  setNewAssetType: (type: 'extintor' | 'hidrante' | 'sinalizacao' | 'iluminacao' | 'bomba') => void;
  
  selectedAssetForInspection: any | null;
  setSelectedAssetForInspection: (asset: any | null) => void;
  
  selectedAssetForHistory: any | null;
  setSelectedAssetForHistory: (asset: any | null) => void;
  
  selectedAssetForDetail: any | null;
  setSelectedAssetForDetail: (asset: any | null) => void;
  updateExtintorAsset: (updatedAsset: any) => Promise<void>;
  deleteExtintorAsset: (assetId: string) => Promise<void>;
  updateAsset: (category: string, updatedAsset: any, silent?: boolean) => Promise<void>;
  deleteAsset: (category: string, assetId: string) => Promise<void>;
  
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  profileNameInput: string;
  setProfileNameInput: (name: string) => void;
  profileLogoUrlInput: string;
  setProfileLogoUrlInput: (url: string) => void;

  scanModal: boolean;
  setScanModal: (show: boolean) => void;
  scanCode: string;
  setScanCode: (code: string) => void;

  chatOpened: boolean;
  setChatOpened: (open: boolean) => void;
  chatMessages: Array<{ sender: 'user' | 'assistant'; text: string }>;
  setChatMessages: React.Dispatch<React.SetStateAction<Array<{ sender: 'user' | 'assistant'; text: string }>>>;
  userPrompt: string;
  setUserPrompt: (prompt: string) => void;
  aiGenerating: boolean;
  setAiGenerating: (gen: boolean) => void;
  
  // Handlers
  addConsoleLog: (msg: string, type?: 'ERRO' | 'SUCESSO' | 'INFO') => void;
  handleGoogleLogin: () => Promise<void>;
  handleGoogleLogout: () => Promise<void>;
  handleUpdateLogoAndProfile: (logoUrl: string, name: string) => Promise<void>;
  handleAdminRoleStatusChange: (uid: string, newRole: 'Desenvolvedor' | 'Administrador' | 'Usuário', newStatus: string) => Promise<void>;
  handleAdminDeleteUser: (uid: string) => Promise<void>;
  handleInviteUser: (email: string, username: string, name: string, role: 'Desenvolvedor' | 'Administrador' | 'Usuário', daysValid?: number | null) => Promise<any>;
  handleCredentialsLogin: (identifier: string, pass: string) => Promise<boolean>;
  isGoogleUser: boolean;
  fetchUsers: () => Promise<void>;
  syncWithRealDatabase: () => Promise<void>;
  deleteConfirmation: {
    show: boolean;
    asset: any;
    assetType: string;
    onConfirm: () => Promise<void> | void;
  } | null;
  setDeleteConfirmation: React.Dispatch<React.SetStateAction<any | null>>;
  deletingAssetId: string | null;
  setDeletingAssetId: (id: string | null) => void;
  requestAssetDeletion: (asset: any, assetType: string, onConfirm: () => Promise<void> | void) => void;
  lastSyncTime: Date | null;
  auditLogs: any[];
  logSystemAction: (action: string, tipoAtivo?: string, patrimonio?: string, detalhes?: string) => Promise<void>;
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const SpciContext = createContext<SpciContextType | undefined>(undefined);

export const SpciProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [isGoogleUser, setIsGoogleUser] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [userList, setUserList] = useState<any[]>([]);
  const [loadingUsersList, setLoadingUsersList] = useState(false);

  // Data lists
  const [extintores, setExtintores] = useState<any[]>([]);
  const [hidrantes, setHidrantes] = useState<any[]>([]);
  const [sinalizacoes, setSinalizacoes] = useState<any[]>([]);
  const [iluminacoes, setIluminacoes] = useState<any[]>([]);
  const [bombas, setBombas] = useState<any[]>([]);
  const [complianceLogs, setComplianceLogs] = useState<any[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modals & UI States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAssetType, setNewAssetType] = useState<'extintor' | 'hidrante' | 'sinalizacao' | 'iluminacao' | 'bomba'>('extintor');
  const [selectedAssetForInspection, setSelectedAssetForInspection] = useState<any | null>(null);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<any | null>(null);
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<any | null>(null);
  const [premiumAlert, setPremiumAlert] = useState<PremiumAlertInfo | null>(null);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileLogoUrlInput, setProfileLogoUrlInput] = useState('');

  const [scanModal, setScanModal] = useState(false);

  // States & callbacks for Premium Deletion Popup
  const [deleteConfirmation, setDeleteConfirmation] = useState<any | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const requestAssetDeletion = useCallback((asset: any, assetType: string, onConfirm: () => Promise<void> | void) => {
    setDeleteConfirmation({
      show: true,
      asset,
      assetType,
      onConfirm
    });
  }, []);
  const [scanCode, setScanCode] = useState('');

  const [chatOpened, setChatOpened] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    { sender: 'assistant', text: 'Olá Operador! Sou o assistente Inspe IA SPCI. Como posso apoiar você em suas inspeções de NBR de hoje, ou ao redactar alertas de inconformidades?' }
  ]);
  const [userPrompt, setUserPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const isSyncingRef = React.useRef(false);
  const syncTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastNotificationTimeRef = React.useRef<number>(0);
  const localActionRef = React.useRef(false);

  const addConsoleLog = useCallback((msg: string, type: 'ERRO' | 'SUCESSO' | 'INFO' = 'INFO') => {
    if (type === 'ERRO') {
      console.error(`[SPCI-ERROR] ${msg}`);
    } else if (type === 'SUCESSO') {
      console.log(`[SPCI-SUCCESS] ${msg}`);
    } else {
      console.log(`[SPCI-INFO] ${msg}`);
    }
  }, []);

  const triggerSuccessNotification = useCallback((title: string, message: string) => {
    setPremiumAlert({
      show: true,
      title,
      message,
      type: 'success'
    });
  }, []);

  const logSystemAction = useCallback(async (action: string, tipoAtivo?: string, patrimonio?: string, detalhes?: string) => {
    try {
      const activeUser = userProfile || currentUser;
      const newLog = {
        id: generateUUID(),
        usuario_id: activeUser?.uid || null,
        usuario_nome: activeUser?.name || activeUser?.displayName || 'Sistema/Técnico',
        usuario_email: activeUser?.email || 'N/A',
        acao: action,
        tipo_ativo: tipoAtivo || null,
        patrimonio: patrimonio || null,
        detalhes: detalhes || '',
        created_at: new Date().toISOString()
      };

      // 1. Atualizar localmente
      setAuditLogs((prev) => {
        const next = [newLog, ...prev];
        idb.setAll('audit_logs', next).catch(console.error);
        return next;
      });

      // 2. Tentar sincronizar online ou enfileirar offline
      const isOnline = typeof window !== 'undefined' && navigator.onLine;
      if (isOnline) {
        try {
          const { error } = await supabase.from('logs_auditoria').insert([{
            id: newLog.id,
            usuario_id: newLog.usuario_id,
            usuario_nome: newLog.usuario_nome,
            usuario_email: newLog.usuario_email,
            acao: newLog.acao,
            tipo_ativo: newLog.tipo_ativo,
            patrimonio: newLog.patrimonio,
            detalhes: newLog.detalhes,
            created_at: newLog.created_at
          }]);
          if (error) throw error;
        } catch (err) {
          console.warn('Erro ao gravar log online, enfileirando:', err);
          await SyncQueue.enqueue('audit_logs', newLog.id, newLog);
        }
      } else {
        await SyncQueue.enqueue('audit_logs', newLog.id, newLog);
      }
    } catch (err) {
      console.error('Erro em logSystemAction:', err);
    }
  }, [userProfile, currentUser]);

  // Sync to database lists with offline resilience
  const saveAssetsList = useCallback(async (moduleKey: string, data: any[], isImport = false) => {
    try {
      localActionRef.current = true;
      // Salva no IndexedDB local de forma imediata (garante visual rápido)
      await idb.setAll(moduleKey, data);
      
      const isOnline = typeof window !== 'undefined' && navigator.onLine;
      
      if (isOnline) {
        addConsoleLog(`[Offline-Sync] Conexão ativa. Sincronizando lote de [${moduleKey}] no Supabase...`);
        
        // Tenta sincronizar todos os itens
        await Promise.all(
          data.map(async (item) => {
            try {
              await saveAssetToDb(moduleKey, item.id.toString(), item);
            } catch (err) {
              // Se falhar o envio de algum ativo individual, enfileira
              console.warn(`Erro na sincronização de item ${item.id}. Enfileirando.`, err);
              await SyncQueue.enqueue(moduleKey, item.id.toString(), item);
            }
          })
        );
      } else {
        addConsoleLog(`[Offline-Sync] Dispositivo Offline. Enfileirando lote de [${moduleKey}] para sincronismo posterior.`, 'INFO');
        // Enfileira todos os itens na SyncQueue
        for (const item of data) {
          await SyncQueue.enqueue(moduleKey, item.id.toString(), item);
        }
      }

      if (isImport) {
        await logSystemAction(
          'IMPORTACAO',
          moduleKey,
          undefined,
          `Importação em lote de ${data.length} ativos do tipo ${moduleKey}.`
        ).catch(console.error);
      }
    } catch (e: any) {
      console.warn(`Erro geral de sincronismo local para ${moduleKey}:`, e);
      addConsoleLog(`Erro ao salvar dados locais de ${moduleKey}: ${e.message || e}`, 'ERRO');
    }
  }, [addConsoleLog, logSystemAction]);


  // --- INITIAL DATABASE LOAD AND STORAGE MIGRATION ---
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const migrationKeys = [
          { local: 'spci_extintores', store: 'extintores', initial: INITIAL_EXTINTORES },
          { local: 'spci_hidrantes', store: 'hidrantes', initial: INITIAL_HIDRANTES },
          { local: 'spci_sinalizacoes', store: 'sinalizacoes', initial: INITIAL_SINALIZACAO },
          { local: 'spci_iluminacao', store: 'iluminacao', initial: INITIAL_ILUMINACAO },
          { local: 'spci_bombas', store: 'bombas', initial: INITIAL_BOMBAS },
          { local: 'spci_logs', store: 'logs', initial: [] },
          { local: 'spci_audit_logs', store: 'audit_logs', initial: [] }
        ];

        for (const item of migrationKeys) {
          let list = await idb.getAll(item.store);
          
          if (list.length === 0) {
            const stored = localStorage.getItem(item.local);
            if (stored) {
              try {
                list = JSON.parse(stored);
                await idb.setAll(item.store, list);
              } catch(e) {}
            } else if (item.initial.length > 0) {
              list = item.initial;
              await idb.setAll(item.store, list);
            }
          }
          
          if (item.store === 'extintores') setExtintores(list);
          else if (item.store === 'hidrantes') setHidrantes(list);
          else if (item.store === 'sinalizacoes') setSinalizacoes(list);
          else if (item.store === 'iluminacao') setIluminacoes(list);
          else if (item.store === 'bombas') setBombas(list);
          else if (item.store === 'logs') setComplianceLogs(list);
          else if (item.store === 'audit_logs') setAuditLogs(list);
        }
      } catch (err) {
        console.error('Falha ao carregar caches do IndexedDB:', err);
      }
    };

    loadCachedData();
  }, []);


  // --- MEMOIZED SUPABASE SYNC FUNCTION ---
  const syncWithRealDatabase = useCallback(async () => {
    try {
      addConsoleLog(`[Sincronia] Carregando dados atualizados do Supabase...`, 'INFO');
      
      const extDb = await getAssetsList('extintores');
      if (extDb && extDb.length > 0) {
        setExtintores(extDb);
        await idb.setAll('extintores', extDb);
      }
      const hidDb = await getAssetsList('hidrantes');
      if (hidDb && hidDb.length > 0) {
        setHidrantes(hidDb);
        await idb.setAll('hidrantes', hidDb);
      }
      const sinDb = await getAssetsList('sinalizacoes');
      if (sinDb && sinDb.length > 0) {
        setSinalizacoes(sinDb);
        await idb.setAll('sinalizacoes', sinDb);
      }
      const lumDb = await getAssetsList('iluminacao');
      if (lumDb && lumDb.length > 0) {
        setIluminacoes(lumDb);
        await idb.setAll('iluminacao', lumDb);
      }
      const bomDb = await getAssetsList('bombas');
      if (bomDb && bomDb.length > 0) {
        setBombas(bomDb);
        await idb.setAll('bombas', bomDb);
      }
      
      const recentInspections = await fetchRecentInspecoes();
      if (recentInspections && recentInspections.length > 0) {
        const mappedLogs = recentInspections.map(inspecao => {
          const dateObj = new Date(inspecao.data_inspecao);
          const dateStr = dateObj.toISOString().split('T')[0];
          const timeStr = dateObj.toLocaleTimeString('pt-BR');
          
          const allAssetsList = [
            ...extDb.map(x => ({ ...x, category: 'Extintor' })),
            ...hidDb.map(x => ({ ...x, category: 'Hidrante' })),
            ...(sinDb || []).map(x => ({ ...x, category: 'Sinalização' })),
            ...(lumDb || []).map(x => ({ ...x, category: 'Iluminação' })),
            ...(bomDb || []).map(x => ({ ...x, category: 'Bomba' }))
          ];
          
          const asset = allAssetsList.find(x => x.idAtivo === inspecao.asset_patrimonio || x.id === inspecao.asset_id);
          const model = asset?.model || asset?.modelo || (inspecao.asset_patrimonio.startsWith('EXT-') ? 'Extintor' : 'Equipamento');
          
          return {
            date: dateStr,
            time: timeStr,
            assetId: inspecao.asset_patrimonio,
            model: model,
            notes: inspecao.observacoes || 'Inspeção periódica efetuada.',
            status: inspecao.status
          };
        });
        
        setComplianceLogs(mappedLogs);
        await idb.setAll('logs', mappedLogs);
      }
      
      // Sincronizar logs de auditoria
      try {
        const { data: auditDb, error: auditErr } = await supabase
          .from('logs_auditoria')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        if (!auditErr && auditDb) {
          // Merge local logs that are not on the server yet (e.g. pending sync)
          setAuditLogs((prev) => {
            const pendingLogs = prev.filter(localLog => 
              !auditDb.some(dbLog => dbLog.id === localLog.id)
            );
            const merged = [...pendingLogs, ...auditDb].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            idb.setAll('audit_logs', merged).catch(console.error);
            return merged;
          });
        }
      } catch (err) {
        console.warn('Erro ao carregar logs de auditoria:', err);
      }

      setLastSyncTime(new Date());
      addConsoleLog(`[Sincronia] Dados do Supabase sincronizados com sucesso!`, 'SUCESSO');
    } catch (err) {
      console.warn('Erro ao sincronizar com banco em tempo real:', err);
      addConsoleLog(`[Sincronia] Erro ao sincronizar com Supabase.`, 'ERRO');
    }
  }, [addConsoleLog]);

  // --- AUTOMATIC SUPABASE SYNC ON AUTH ---
  useEffect(() => {
    if (currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      syncWithRealDatabase();
    }
  }, [currentUser, syncWithRealDatabase]);

  // --- SUPABASE REALTIME SUBSCRIPTION FOR AUTO SYNC ---
  useEffect(() => {
    if (!currentUser) return;

    // Assina atualizações em tempo real das tabelas do banco de dados
    const channel = supabase
      .channel('spci_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inspecoes_realizadas' },
        (payload) => {
          console.log('[Realtime] Inspecao realizada mudou:', payload);
          // Sincroniza dados e atualiza o estado
          syncWithRealDatabase();

          // Se for inserção externa (outro técnico), toca som e avisa
          if (payload.eventType === 'INSERT') {
            if (localActionRef.current) {
              localActionRef.current = false;
            } else {
              playTelemetryPingSound();
              triggerSuccessNotification(
                "Nova Inspeção Registrada! 📋",
                `O técnico cadastrou um laudo para o patrimônio ${payload.new.asset_patrimonio}.`
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assets' },
        (payload) => {
          console.log('[Realtime] Asset mudou:', payload);
          syncWithRealDatabase();

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (localActionRef.current) {
              localActionRef.current = false;
            } else {
              playTelemetryPingSound();
              triggerSuccessNotification(
                "Ativo Sincronizado por Terceiro! 🔄",
                `O ativo ${payload.new.id_ativo || 's/n'} foi atualizado remotamente.`
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ativos_extintores' },
        (payload) => {
          console.log('[Realtime] Ativo extintor mudou:', payload);
          syncWithRealDatabase();

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (localActionRef.current) {
              localActionRef.current = false;
            } else {
              playTelemetryPingSound();
              triggerSuccessNotification(
                "Extintor Sincronizado por Terceiro! 🧯",
                `O extintor ${payload.new.numero_patrimonio || 's/n'} foi atualizado remotamente.`
              );
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Inscrição de canal de tempo real: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, syncWithRealDatabase, triggerSuccessNotification]);

  // --- AUTOMATIC REAL-TIME SYNC ON SUCCESS EVENT ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSyncSuccess = (e: any) => {
      console.log('[SpciContext] Evento de sincronia capturado:', e.detail);
      
      // Debounce na execução da sincronização com o Supabase para evitar chamadas duplicadas
      // Delay de 2s agrupa múltiplos eventos em sequência rápida (ex: importação em lote)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        syncWithRealDatabase();
      }, 2000);
      
      // Controla a frequência de exibição das notificações para evitar flood de toasts na tela
      const now = Date.now();
      if (e.detail?.type === 'inspecao') {
        triggerSuccessNotification(
          "Vistoria Sincronizada! 🔄",
          `A inspeção do ativo ${e.detail.patrimonio} foi salva e os indicadores foram atualizados.`
        );
      } else if (now - lastNotificationTimeRef.current > 2500) {
        lastNotificationTimeRef.current = now;
        triggerSuccessNotification(
          "Ativo Sincronizado! 🔄",
          `O ativo foi sincronizado com o Supabase e o cache foi atualizado.`
        );
      }
    };

    window.addEventListener('spci_sync_success', handleSyncSuccess);
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      window.removeEventListener('spci_sync_success', handleSyncSuccess);
    };
  }, [syncWithRealDatabase, triggerSuccessNotification]);

  // --- AUTHENTICATION LISTENER ---
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user) => {
        setCurrentUser(user);
        setAuthChecking(true);
        try {
          const profile = await registerOrLoginUserProfile({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL
          });
          setUserProfile(profile);
          setProfileNameInput(profile.name);
          setProfileLogoUrlInput(profile.logoUrl || '');
          
          // Mapeia e grava o provedor
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || '';
          const provider = session?.user?.app_metadata?.provider || 'email';
          
          // Grava cookies de segurança para o Middleware do servidor ler
          document.cookie = `spci_session_token=${token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `spci_user_role=${profile.role}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `spci_user_provider=${provider}; path=/; max-age=86400; SameSite=Lax`;
          setIsGoogleUser(provider === 'google');

          // Registrar login se estiver pendente após redirecionamento
          if (sessionStorage.getItem('spci_login_pending') === 'true') {
            sessionStorage.removeItem('spci_login_pending');
            setTimeout(() => {
              logSystemAction('LOGIN', undefined, undefined, `Login efetuado com sucesso via autenticação Google.`);
            }, 1000);
          }

          if (profile.dataExpiracao) {
            document.cookie = `spci_user_expires=${profile.dataExpiracao}; path=/; max-age=86400; SameSite=Lax`;
          } else {
            document.cookie = `spci_user_expires=; path=/; max-age=0; SameSite=Lax`;
          }
        } catch (err: any) {
          console.error("Erro ao sincronizar perfil do usuário:", err);
        } finally {
          setAuthChecking(false);
        }
      },
      () => {
        // Auth failure callback
        setCurrentUser(null);
        setUserProfile(null);
        setIsGoogleUser(false);
        setAuthChecking(false);
        
        // Limpa cookies de segurança
        document.cookie = `spci_session_token=; path=/; max-age=0; SameSite=Lax`;
        document.cookie = `spci_user_role=; path=/; max-age=0; SameSite=Lax`;
        document.cookie = `spci_user_expires=; path=/; max-age=0; SameSite=Lax`;
        document.cookie = `spci_user_provider=; path=/; max-age=0; SameSite=Lax`;
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [addConsoleLog]);


  // --- PROCESS OFFLINE SYNC QUEUE ON STARTUP / CONNECTION ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const processOfflineQueue = async () => {
      // Sincroniza apenas se estiver autenticado e online (para respeitar RLS) e não estiver em andamento
      if (currentUser && navigator.onLine && !isSyncingRef.current) {
        isSyncingRef.current = true;
        try {
          addConsoleLog('[Offline-Sync] Conexão e autenticação ativas. Verificando fila de sincronia offline pendente...');
          
          // Reseta tarefas falhas anteriores para permitir reprocessamento automático na inicialização
          await SyncQueue.resetFailedTasks();
          
          await SyncQueue.processQueue((task) => {
            addConsoleLog(`[Offline-Sync] Sucesso ao sincronizar ativo ${task.assetId} (${task.moduleKey}) da fila pendente.`, 'SUCESSO');
          });

          await MediaQueue.processQueue((task) => {
            addConsoleLog(`[Offline-Sync] Sucesso ao fazer upload de foto pendente do ativo ${task.assetId}.`, 'SUCESSO');
          });
        } catch (err) {
          console.error('[Offline-Sync] Erro no processamento automático da fila offline:', err);
        } finally {
          isSyncingRef.current = false;
        }
      }
    };

    processOfflineQueue();

    const handleSyncOnReconnect = () => {
      processOfflineQueue();
    };

    window.addEventListener('online', handleSyncOnReconnect);
    return () => {
      window.removeEventListener('online', handleSyncOnReconnect);
    };
  }, [currentUser, addConsoleLog]);

  // --- LISTEN FOR SECURITY RLS SYNC ERRORS ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSecurityError = (e: Event) => {
      const customEvent = e as CustomEvent;
      const errorMsg = customEvent.detail?.error || 'Acesso negado por diretivas RLS de segurança.';
      
      setPremiumAlert({
        show: true,
        title: "Bloqueio de Segurança 🔒",
        message: `A sincronização de dados falhou: ${errorMsg}. Verifique se sua conta foi suspensa ou se o período de validade do seu acesso expirou.`,
        type: 'critical'
      });
    };

    window.addEventListener('spci_security_sync_error', handleSecurityError);
    return () => {
      window.removeEventListener('spci_security_sync_error', handleSecurityError);
    };
  }, []);

  // --- ADMIN FUNCTIONS ---

  const fetchUsers = useCallback(async () => {
    if (userProfile?.role === 'Administrador' || userProfile?.role === 'Desenvolvedor') {
      setLoadingUsersList(true);
      try {
        const list = await getAllUserProfiles();
        setUserList(list);
        addConsoleLog(`[Admin] Sincronizados ${list.length} perfis de usuários cadastrados.`);
      } catch (err: any) {
        console.error(err);
        addConsoleLog(`[Erro Admin] Falha ao listar usuários do sistema: ${err.message || err}`, 'ERRO');
      } finally {
        setLoadingUsersList(false);
      }
    }
  }, [userProfile, addConsoleLog]);

  const handleUpdateLogoAndProfile = useCallback(async (logoUrl: string, name: string) => {
    if (currentUser) {
      addConsoleLog(`[Meu Perfil] Salvando alterações...`);
      try {
        await updateUserLogo(currentUser.uid, logoUrl, name);
        
        // Atualiza localmente
        setUserProfile((prev: any) => prev ? { ...prev, name, logoUrl } : null);
        
        triggerSuccessNotification("Perfil Atualizado! 🟢", "Nome de exibição e logotipo atualizados com sucesso.");
      } catch (err: any) {
        console.error(err);
        triggerSuccessNotification("Falha ao Atualizar ❌", err.message || "Erro desconhecido.");
      }
    }
  }, [currentUser, triggerSuccessNotification, addConsoleLog]);

  const updateAsset = useCallback(async (category: string, updatedAsset: any, silent?: boolean) => {
    try {
      localActionRef.current = true;
      await saveAssetToDb(category, updatedAsset.id.toString(), updatedAsset);
      
      const normalizedCat = category.trim().toLowerCase();
      if (normalizedCat === 'extintores') {
        setExtintores((prev: any[]) => {
          const next = prev.map(a => a.id === updatedAsset.id ? { ...a, ...updatedAsset } : a);
          idb.setAll('extintores', next).catch(console.error);
          return next;
        });
      } else if (normalizedCat === 'hidrantes') {
        setHidrantes((prev: any[]) => {
          const next = prev.map(a => a.id === updatedAsset.id ? { ...a, ...updatedAsset } : a);
          idb.setAll('hidrantes', next).catch(console.error);
          return next;
        });
      } else if (normalizedCat === 'sinalizacoes' || normalizedCat === 'sinalizacao') {
        setSinalizacoes((prev: any[]) => {
          const next = prev.map(a => a.id === updatedAsset.id ? { ...a, ...updatedAsset } : a);
          idb.setAll('sinalizacoes', next).catch(console.error);
          return next;
        });
      } else if (normalizedCat === 'iluminacao') {
        setIluminacoes((prev: any[]) => {
          const next = prev.map(a => a.id === updatedAsset.id ? { ...a, ...updatedAsset } : a);
          idb.setAll('iluminacao', next).catch(console.error);
          return next;
        });
      } else if (normalizedCat === 'bombas') {
        setBombas((prev: any[]) => {
          const next = prev.map(a => a.id === updatedAsset.id ? { ...a, ...updatedAsset } : a);
          idb.setAll('bombas', next).catch(console.error);
          return next;
        });
      }

      if (!silent) {
        triggerSuccessNotification('Ativo Atualizado! 🟢', `O ativo ${updatedAsset.idAtivo || updatedAsset.id} foi atualizado com sucesso.`);
      }
      
      // Registrar log de auditoria no cliente
      await logSystemAction(
        'EDICAO_ATIVO', 
        normalizedCat, 
        updatedAsset.idAtivo || updatedAsset.id.toString(), 
        `Ativo do tipo ${normalizedCat} com patrimônio ${updatedAsset.idAtivo || updatedAsset.id} foi atualizado.`
      ).catch(console.error);
    } catch (err: any) {
      const errorMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.error(`Erro ao atualizar ativo (${category}):`, err, errorMsg);
      triggerSuccessNotification('Falha na Atualização ❌', errorMsg || 'Erro de conexão.');
      throw err;
    }
  }, [triggerSuccessNotification, logSystemAction]);

  const deleteAsset = useCallback(async (category: string, assetId: string) => {
    try {
      localActionRef.current = true;
      await deleteAssetFromDb(category, assetId);
      
      const normalizedCat = category.trim().toLowerCase();
      if (normalizedCat === 'extintores') {
        setExtintores((prev: any[]) => {
          const next = prev.filter(a => a.id !== assetId);
          idb.setAll('extintores', next).catch(console.error);
          return next;
        });
      } else if (normalizedCat === 'hidrantes') {
        setHidrantes((prev: any[]) => {
          const next = prev.filter(a => a.id !== assetId);
          idb.setAll('hidrantes', next).catch(console.error);
          return next;
        });
      } else if (normalizedCat === 'sinalizacoes' || normalizedCat === 'sinalizacao') {
        setSinalizacoes((prev: any[]) => {
          const next = prev.filter(a => a.id !== assetId);
          idb.setAll('sinalizacoes', next).catch(console.error);
          return next;
        });
      } else if (normalizedCat === 'iluminacao') {
        setIluminacoes((prev: any[]) => {
          const next = prev.filter(a => a.id !== assetId);
          idb.setAll('iluminacao', next).catch(console.error);
          return next;
        });
      } else if (normalizedCat === 'bombas') {
        setBombas((prev: any[]) => {
          const next = prev.filter(a => a.id !== assetId);
          idb.setAll('bombas', next).catch(console.error);
          return next;
        });
      }

      setSelectedAssetForDetail(null);
      // Bloqueia popup de "Ativo Sincronizado" por 5s após exclusão para evitar duplicidade
      lastNotificationTimeRef.current = Date.now() + 5000;
      triggerSuccessNotification('Ativo Excluído! 🗑️', 'O ativo foi removido de forma definitiva.');
      
      // Registrar log de auditoria no cliente
      let assetPatrimonio = assetId;
      if (normalizedCat === 'extintores') {
        const ext = extintores.find(a => a.id === assetId);
        if (ext) assetPatrimonio = ext.idAtivo || ext.id;
      } else if (normalizedCat === 'hidrantes') {
        const hid = hidrantes.find(a => a.id === assetId);
        if (hid) assetPatrimonio = hid.idAtivo || hid.id;
      } else if (normalizedCat === 'sinalizacoes' || normalizedCat === 'sinalizacao') {
        const sin = sinalizacoes.find(a => a.id === assetId);
        if (sin) assetPatrimonio = sin.idAtivo || sin.id;
      } else if (normalizedCat === 'iluminacao') {
        const ilu = iluminacoes.find(a => a.id === assetId);
        if (ilu) assetPatrimonio = ilu.idAtivo || ilu.id;
      } else if (normalizedCat === 'bombas') {
        const bom = bombas.find(a => a.id === assetId);
        if (bom) assetPatrimonio = bom.idAtivo || bom.id;
      }
      
      await logSystemAction(
        'EXCLUSAO_ATIVO',
        normalizedCat,
        assetPatrimonio,
        `Ativo do tipo ${normalizedCat} com patrimônio ${assetPatrimonio} foi excluído.`
      ).catch(console.error);
    } catch (err: any) {
      console.error(`Erro ao deletar ativo (${category}):`, err);
      triggerSuccessNotification('Falha na Exclusão ❌', err.message || 'Erro de permissão.');
      throw err;
    }
  }, [triggerSuccessNotification, logSystemAction, extintores, hidrantes, sinalizacoes, iluminacoes, bombas]);

  const updateExtintorAsset = useCallback(async (updatedAsset: any) => {
    await updateAsset('extintores', updatedAsset);
  }, [updateAsset]);

  const deleteExtintorAsset = useCallback(async (assetId: string) => {
    await deleteAsset('extintores', assetId);
  }, [deleteAsset]);

  const handleAdminRoleStatusChange = useCallback(async (uid: string, newRole: 'Desenvolvedor' | 'Administrador' | 'Usuário', newStatus: string) => {
    try {
      await updateUserRoleAndStatus(uid, newRole, newStatus);
      await fetchUsers();
      triggerSuccessNotification("Usuário Atualizado! 🟢", "Perfil de governança modificado com sucesso.");
    } catch (err: any) {
      console.error(err);
      triggerSuccessNotification("Falha na Alteração ❌", err.message || "Erro de permissão.");
    }
  }, [fetchUsers, triggerSuccessNotification]);

  const handleAdminDeleteUser = useCallback(async (uid: string) => {
    try {
      await deleteUserProfileByAdmin(uid);
      await fetchUsers();
      triggerSuccessNotification("Excluído com Sucesso! 🗑️", "A credencial foi deletada de forma definitiva.");
    } catch (err: any) {
      console.error(err);
      triggerSuccessNotification("Falha ao Deletar ❌", err.message || "Permissão insuficiente.");
    }
  }, [fetchUsers, triggerSuccessNotification]);

  const handleInviteUser = useCallback(async (
    email: string, 
    username: string, 
    name: string, 
    role: 'Desenvolvedor' | 'Administrador' | 'Usuário', 
    daysValid: number | null = null
  ) => {
    addConsoleLog(`[Onboarding] Enviando convite para ${name} (${role})...`);
    try {
      // RPC call create_new_user
      const { data, error } = await supabase.rpc('create_new_user', {
        p_email: email,
        p_username: username,
        p_name: name,
        p_role: role,
        p_days_valid: daysValid
      });

      if (error) throw error;
      
      addConsoleLog(`[Onboarding] Sucesso ao criar convite para ${name}.`, 'SUCESSO');
      await fetchUsers();
      return data;
    } catch (err: any) {
      console.error(err);
      addConsoleLog(`[Erro Onboarding] Falha ao convidar usuário: ${err.message || err}`, 'ERRO');
      throw err;
    }
  }, [fetchUsers, addConsoleLog]);

  // --- GOOGLE SIGNIN/LOGOUT ---
  const handleGoogleLogin = useCallback(async () => {
    setAuthChecking(true);
    try {
      addConsoleLog("Iniciando janela oficial de login com Google...");
      sessionStorage.setItem('spci_login_pending', 'true');
      await googleSignIn();
    } catch (err: any) {
      console.error("Erro no Login com Google:", err);
      const errMsg = err.message || String(err);
      addConsoleLog(`Falha ao conectar Google Account: ${errMsg}`, 'ERRO');
      triggerSuccessNotification("Falha no Login ❌", errMsg);
    } finally {
      setAuthChecking(false);
    }
  }, [triggerSuccessNotification, addConsoleLog]);

  const handleGoogleLogout = useCallback(async () => {
    try {
      await logSystemAction('LOGOUT', undefined, undefined, 'Sessão encerrada pelo usuário.');
      await logout();
      setCurrentUser(null);
      setUserProfile(null);
      // Limpa cookies de segurança
      document.cookie = `spci_session_token=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `spci_user_role=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `spci_user_expires=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `spci_user_provider=; path=/; max-age=0; SameSite=Lax`;
      setIsGoogleUser(false);
      addConsoleLog("Sessão da conta do Google finalizada.");
      triggerSuccessNotification("Desconectado! ⚪", "Sessão finalizada com sucesso.");
    } catch (err: any) {
      console.error(err);
    }
  }, [triggerSuccessNotification, addConsoleLog, logSystemAction]);

  const handleCredentialsLogin = useCallback(async (identifier: string, pass: string) => {
    setAuthChecking(true);
    try {
      addConsoleLog(`[Autenticação] Autenticando credenciais do usuário...`);
      const user = await signInWithEmailOrUsername(identifier, pass);
      if (user) {
        setCurrentUser(user);
        
        const profile = await registerOrLoginUserProfile({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        });
        
        setUserProfile(profile);
        setProfileNameInput(profile.name);
        setProfileLogoUrlInput(profile.logoUrl || '');
        
        // Pega a sessão para resgatar o JWT token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || '';

        // Grava cookies de segurança
        document.cookie = `spci_session_token=${token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `spci_user_role=${profile.role}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `spci_user_provider=email; path=/; max-age=86400; SameSite=Lax`;
        setIsGoogleUser(false);
        
        if (profile.dataExpiracao) {
          document.cookie = `spci_user_expires=${profile.dataExpiracao}; path=/; max-age=86400; SameSite=Lax`;
        } else {
          document.cookie = `spci_user_expires=; path=/; max-age=0; SameSite=Lax`;
        }

        addConsoleLog(`[Autenticação] Login com sucesso de ${profile.name} (${profile.role})`, 'SUCESSO');
        triggerSuccessNotification("Login Realizado! 🟢", `Bem-vindo de volta, ${profile.name}!`);
        
        setTimeout(() => {
          logSystemAction('LOGIN', undefined, undefined, `Login efetuado com sucesso via credenciais.`);
        }, 500);

        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Erro ao autenticar por credenciais:", err);
      addConsoleLog(`[Erro Autenticação] Falha no login: ${err.message || err}`, 'ERRO');
      throw err;
    } finally {
      setAuthChecking(false);
    }
  }, [addConsoleLog, triggerSuccessNotification, logSystemAction]);

  return (
    <SpciContext.Provider value={{
      currentUser,
      userProfile,
      authChecking,
      userList,
      loadingUsersList,
      extintores,
      hidrantes,
      sinalizacoes,
      iluminacoes,
      bombas,
      complianceLogs,
      setExtintores,
      setHidrantes,
      setSinalizacoes,
      setIluminacoes,
      setBombas,
      setComplianceLogs,
      saveAssetsList,
      premiumAlert,
      setPremiumAlert,
      triggerSuccessNotification,
      showAddForm,
      setShowAddForm,
      newAssetType,
      setNewAssetType,
      selectedAssetForInspection,
      setSelectedAssetForInspection,
      selectedAssetForHistory,
      setSelectedAssetForHistory,
      selectedAssetForDetail,
      setSelectedAssetForDetail,
      updateExtintorAsset,
      deleteExtintorAsset,
      updateAsset,
      deleteAsset,
      showProfileModal,
      setShowProfileModal,
      profileNameInput,
      setProfileNameInput,
      profileLogoUrlInput,
      setProfileLogoUrlInput,
      scanModal,
      setScanModal,
      scanCode,
      setScanCode,
      chatOpened,
      setChatOpened,
      chatMessages,
      setChatMessages,
      userPrompt,
      setUserPrompt,
      aiGenerating,
      setAiGenerating,
      addConsoleLog,
      handleGoogleLogin,
      handleGoogleLogout,
      handleUpdateLogoAndProfile,
      handleAdminRoleStatusChange,
      handleAdminDeleteUser,
      handleInviteUser,
      handleCredentialsLogin,
      isGoogleUser,
      fetchUsers,
      syncWithRealDatabase,
      deleteConfirmation,
      setDeleteConfirmation,
      deletingAssetId,
      setDeletingAssetId,
      requestAssetDeletion,
      lastSyncTime,
      auditLogs,
      logSystemAction
    }}>
      {children}
    </SpciContext.Provider>
  );
};

export const useSpci = () => {
  const context = useContext(SpciContext);
  if (!context) {
    throw new Error('useSpci deve ser usado dentro de um SpciProvider');
  }
  return context;
};
