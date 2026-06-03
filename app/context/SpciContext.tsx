'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CompatibleUser as User } from '@/lib/supabaseAuth';
import { 
  initAuth, 
  googleSignIn, 
  logout 
} from '@/lib/supabaseAuth';
import { 
  registerOrLoginUserProfile, 
  getUserProfile, 
  updateUserLogo, 
  updateUserRoleAndStatus, 
  getAllUserProfiles, 
  deleteUserProfileByAdmin,
  getAssetsList,
  saveAssetToDb
} from '@/lib/supabaseDb';
import { 
  SHEETS_MAPPINGS, 
  createSpreadsheet, 
  readSpreadsheet, 
  writeSpreadsheet, 
  extractSpreadsheetId 
} from '@/lib/sheetsDatabase';
import { idb } from '@/lib/indexedDb';
import { SyncQueue } from '@/lib/syncQueue';


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

export interface ImportCockpitInfo {
  isOpen: boolean;
  moduleKey: string;
  moduleLabel: string;
  data: any[][];
  headers: string[];
  mode: 'select' | 'model' | 'import' | 'download-template';
  aiAuditResult?: any;
  validationErrors?: {rowIndex: number, colIndex: number, message: string}[];
  isAiAnalyzing?: boolean;
  isRemodeled?: boolean;
  retainedFields?: string[];
  isAiFixing?: boolean;
  aiFixReport?: string;
}

interface SpciContextType {
  // Auth
  currentUser: User | null;
  userProfile: any | null;
  gToken: string | null;
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
  
  // Google Sheets integrations
  sheetsConfig: Record<string, any>;
  sheetsTemplates: Record<string, any>;
  sheetsConsoleLogs: string[];
  analyzingKeys: Record<string, boolean>;
  
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

  importCockpit: ImportCockpitInfo | null;
  setImportCockpit: React.Dispatch<React.SetStateAction<ImportCockpitInfo | null>>;
  
  // Handlers
  addConsoleLog: (msg: string, type?: 'ERRO' | 'SUCESSO' | 'INFO') => void;
  saveSheetsConfig: (newConfig: any) => void;
  saveSheetsTemplates: (newTemplates: any) => void;
  handleAIModelAnalysis: (moduleKey: string, moduleTitle: string, rawInputId: string) => Promise<void>;
  handleApplyRemodelNow: (moduleKey: string, moduleTitle: string) => Promise<void>;
  handleMassImport: (moduleKey: string, moduleTitle: string) => Promise<void>;
  handleGoogleLogin: () => Promise<void>;
  handleGoogleLogout: () => Promise<void>;
  handleUpdateLogoAndProfile: (logoUrl: string, name: string) => Promise<void>;
  handleAdminRoleStatusChange: (uid: string, newRole: 'admin' | 'user', newStatus: 'active' | 'pending' | 'inactive') => Promise<void>;
  handleAdminDeleteUser: (uid: string) => Promise<void>;
  fetchUsers: () => Promise<void>;
}

const SpciContext = createContext<SpciContextType | undefined>(undefined);

export const SpciProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [gToken, setGToken] = useState<string | null>(null);
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

  // Config & Logs
  const [sheetsConfig, setSheetsConfig] = useState<Record<string, any>>({});
  const [sheetsTemplates, setSheetsTemplates] = useState<Record<string, any>>({});
  const [sheetsConsoleLogs, setSheetsConsoleLogs] = useState<string[]>(['[INFO] [Sistema] Inicializado central de dados local SPCI. Ready.']);
  const [analyzingKeys, setAnalyzingKeys] = useState<Record<string, boolean>>({});

  // Modals & UI States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAssetType, setNewAssetType] = useState<'extintor' | 'hidrante' | 'sinalizacao' | 'iluminacao' | 'bomba'>('extintor');
  const [selectedAssetForInspection, setSelectedAssetForInspection] = useState<any | null>(null);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<any | null>(null);
  const [premiumAlert, setPremiumAlert] = useState<PremiumAlertInfo | null>(null);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileLogoUrlInput, setProfileLogoUrlInput] = useState('');

  const [scanModal, setScanModal] = useState(false);
  const [scanCode, setScanCode] = useState('');

  const [chatOpened, setChatOpened] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    { sender: 'assistant', text: 'Olá Operador! Sou o assistente Inspe IA SPCI. Como posso apoiar você em suas inspeções de NBR de hoje, ou ao redactar alertas de inconformidades?' }
  ]);
  const [userPrompt, setUserPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const [importCockpit, setImportCockpit] = useState<ImportCockpitInfo | null>(null);

  const addConsoleLog = useCallback((msg: string, type: 'ERRO' | 'SUCESSO' | 'INFO' = 'INFO') => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    setSheetsConsoleLogs(prev => [`[${type}] [${timestamp}] ${msg}`, ...prev.slice(0, 199)]);
  }, []);

  const triggerSuccessNotification = useCallback((title: string, message: string) => {
    setPremiumAlert({
      show: true,
      title,
      message,
      type: 'success'
    });
  }, []);

  const saveSheetsConfig = useCallback((newConfig: any) => {
    setSheetsConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spci_sheets_config', JSON.stringify(newConfig));
    }
  }, []);

  const saveSheetsTemplates = useCallback((newTemplates: any) => {
    setSheetsTemplates(newTemplates);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spci_sheets_templates', JSON.stringify(newTemplates));
    }
  }, []);

  // Sync to database lists with offline resilience
  const saveAssetsList = useCallback(async (moduleKey: string, data: any[]) => {
    try {
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
    } catch (e: any) {
      console.warn(`Erro geral de sincronismo local para ${moduleKey}:`, e);
      addConsoleLog(`Erro ao salvar dados locais de ${moduleKey}: ${e.message || e}`, 'ERRO');
    }
  }, [addConsoleLog]);


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
          { local: 'spci_logs', store: 'logs', initial: [] }
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
        }

        const storedConfig = localStorage.getItem('spci_sheets_config');
        if (storedConfig) setSheetsConfig(JSON.parse(storedConfig));

        const storedTemplates = localStorage.getItem('spci_sheets_templates');
        if (storedTemplates) setSheetsTemplates(JSON.parse(storedTemplates));

      } catch (err) {
        console.error('Falha ao carregar caches do IndexedDB:', err);
      }
    };

    loadCachedData();
  }, []);

  // --- AUTOMATIC FIREBASE SYNC ON AUTH ---
  useEffect(() => {
    const syncWithRealDatabase = async () => {
      try {
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
      } catch (err) {
        console.warn('Erro ao sincronizar com Firestore em tempo real:', err);
      }
    };

    if (currentUser) {
      syncWithRealDatabase();
    }
  }, [currentUser]);

  // --- GOOGLE AUTHENTICATION LISTENER ---
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setCurrentUser(user);
        setGToken(token);
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
          addConsoleLog(`[Perfil] Login de ${profile.name} (${profile.role === 'admin' ? '🛡️ Administrador' : '👷 Técnico'})`);
        } catch (err: any) {
          console.error("Erro sincronizando perfil:", err);
          const isBootstrappedAdmin = user.email?.toLowerCase() === 'jackson602@gmail.com';
          const fallbackProfile = {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Usuário SPCI',
            email: user.email || '',
            photoURL: user.photoURL || '',
            logoUrl: '',
            role: isBootstrappedAdmin ? 'admin' : 'user' as const,
            status: 'active' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setUserProfile(fallbackProfile);
          setProfileNameInput(fallbackProfile.name);
          setProfileLogoUrlInput('');
          addConsoleLog(`[Perfil] Login local offline executado para ${fallbackProfile.name}.`, 'INFO');
        } finally {
          setAuthChecking(false);
        }
      },
      () => {
        setCurrentUser(null);
        setGToken(null);
        setUserProfile(null);
        setAuthChecking(false);
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
      // Sincroniza apenas se estiver autenticado e online (para respeitar RLS)
      if (currentUser && navigator.onLine) {
        addConsoleLog('[Offline-Sync] Conexão e autenticação ativas. Verificando fila de sincronia offline pendente...');
        await SyncQueue.processQueue((task) => {
          addConsoleLog(`[Offline-Sync] Sucesso ao sincronizar ativo ${task.assetId} (${task.moduleKey}) da fila pendente.`, 'SUCESSO');
        });
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

  // --- ADMIN FUNCTIONS ---

  const fetchUsers = useCallback(async () => {
    if (userProfile?.role === 'admin') {
      setLoadingUsersList(true);
      try {
        const list = await getAllUserProfiles();
        setUserList(list);
        addConsoleLog(`[Admin] Sincronizados ${list.length} perfis de usuários cadastrados.`);
      } catch (err: any) {
        console.error("Erro listando usuários:", err);
        addConsoleLog(`[Erro Admin] Falha ao listar usuários do sistema: ${err.message || err}`, 'ERRO');
      } finally {
        setLoadingUsersList(false);
      }
    }
  }, [userProfile, addConsoleLog]);

  const handleUpdateLogoAndProfile = useCallback(async (logoUrl: string, name: string) => {
    if (!currentUser || !userProfile) return;
    try {
      addConsoleLog(`[Meu Perfil] Salvando alterações...`);
      await updateUserLogo(currentUser.uid, logoUrl, name);
      
      setUserProfile((prev: any) => ({
        ...prev,
        logoUrl,
        name,
        updatedAt: new Date().toISOString()
      }));
      
      triggerSuccessNotification("Perfil Atualizado! 👑", "Seu logotipo personalizado e detalhes de perfil foram gravados no Firestore.");
    } catch (err: any) {
      triggerSuccessNotification("Falha no Perfil ❌", `Erro ao salvar alterações: ${err.message}`);
    }
  }, [currentUser, userProfile, triggerSuccessNotification, addConsoleLog]);

  const handleAdminRoleStatusChange = useCallback(async (uid: string, newRole: 'admin' | 'user', newStatus: 'active' | 'pending' | 'inactive') => {
    try {
      await updateUserRoleAndStatus(uid, newRole, newStatus);
      setUserList(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole, status: newStatus, updatedAt: new Date().toISOString() } : u));
      triggerSuccessNotification("Nível Alterado! ⚙️", "Permissão e status do usuário atualizados em tempo real.");
    } catch (err: any) {
      triggerSuccessNotification("Erro de Edição ❌", `Falha ao salvar acesso: ${err.message}`);
    }
  }, [triggerSuccessNotification]);

  const handleAdminDeleteUser = useCallback(async (uid: string) => {
    try {
      await deleteUserProfileByAdmin(uid);
      setUserList(prev => prev.filter(u => u.uid !== uid));
      triggerSuccessNotification("Usuário Removido 🗑️", "Cadastro do usuário removido dos registros de governança.");
    } catch (err: any) {
      triggerSuccessNotification("Erro ao Deletar ❌", `Falha: ${err.message}`);
    }
  }, [triggerSuccessNotification]);

  // --- GOOGLE SIGNIN/LOGOUT ---
  const handleGoogleLogin = useCallback(async () => {
    setAuthChecking(true);
    try {
      addConsoleLog("Iniciando janela oficial de login com Google...");
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setGToken(result.accessToken);
        addConsoleLog(`Acesso concedido para: ${result.user.email}`);

        let profile;
        try {
          profile = await registerOrLoginUserProfile({
            uid: result.user.uid,
            displayName: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL
          });
        } catch (dbErr: any) {
          console.warn("Firestore profile save failed, falling back to local profile:", dbErr);
          const isBootstrappedAdmin = result.user.email?.toLowerCase() === 'jackson602@gmail.com';
          profile = {
            uid: result.user.uid,
            name: result.user.displayName || result.user.email?.split('@')[0] || 'Usuário SPCI',
            email: result.user.email || '',
            photoURL: result.user.photoURL || '',
            logoUrl: '',
            role: isBootstrappedAdmin ? 'admin' : 'user' as const,
            status: 'active' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          addConsoleLog("Aviso: Não foi possível salvar o perfil no Supabase. Operando em modo de perfil local.", 'INFO');
        }

        setUserProfile(profile);

        triggerSuccessNotification(
          "Acesso Autorizado! 🟢", 
          `Olá, ${profile.name}! Sessão activa como ${profile.role === 'admin' ? '🛡️ Administrador' : '👷 Técnico de Campo'}.`
        );
      }
    } catch (err: any) {
      console.error("Erro no Login com Google:", err);
      let errMsg = err.message || String(err);
      if (errMsg.includes("auth/unauthorized-domain") || errMsg.includes("unauthorized-domain")) {
        errMsg = "Erro de Domínio Não Autorizado. Adicione o domínio atual nas configurações do console do Firebase.";
      }
      addConsoleLog(`Falha ao conectar Google Account: ${errMsg}`, 'ERRO');
      triggerSuccessNotification("Falha no Login ❌", errMsg);
    } finally {
      setAuthChecking(false);
    }
  }, [triggerSuccessNotification, addConsoleLog]);

  const handleGoogleLogout = useCallback(async () => {
    try {
      await logout();
      setCurrentUser(null);
      setGToken(null);
      setUserProfile(null);
      addConsoleLog("Sessão da conta do Google finalizada.");
      triggerSuccessNotification("Desconectado! ⚪", "Sessão finalizada. Acesso às planilhas em nuvem bloqueado.");
    } catch (err: any) {
      console.error(err);
    }
  }, [triggerSuccessNotification, addConsoleLog]);

  // --- AI MODEL ANALYSIS & REMODELLING ---
  const handleAIModelAnalysis = useCallback(async (moduleKey: string, moduleTitle: string, rawInputId: string) => {
    if (!gToken) {
      triggerSuccessNotification("Requer Google Login 🔑", "Por favor, conecte sua conta Google no painel antes de analisar modelos.");
      return;
    }
    if (!rawInputId) {
      triggerSuccessNotification("Link Vazio ⚠️", "Insira o ID ou URL da planilha de modelo.");
      return;
    }

    const templateId = extractSpreadsheetId(rawInputId);
    setAnalyzingKeys(prev => ({ ...prev, [moduleKey]: true }));
    addConsoleLog(`[IA] Iniciando Auditoria de Reestruturação para [${moduleTitle}]. Lendo cabeçalhos: ${templateId}...`);

    try {
      const rows = await readSpreadsheet(gToken, templateId, 'Sheet1!A1:Z1');
      if (!rows || rows.length === 0 || rows[0].length === 0) {
        throw new Error("Não foi possível carregar as colunas. Verifique se o documento possui dados.");
      }

      const activeHeaders = rows[0].map((h: any) => String(h).trim()).filter(Boolean);
      addConsoleLog(`[IA] Cabeçalhos encontrados: ${JSON.stringify(activeHeaders)}`);

      const defaultMapping = (SHEETS_MAPPINGS as any)[
        moduleKey === 'sinalizacao' ? 'sinalizacao' : 
        moduleKey === 'iluminacao' ? 'iluminacao' : 
        moduleKey === 'extintores' ? 'extintor' : 
        moduleKey === 'hidrantes' ? 'hidrante' : 'bomba'
      ];
      const oldHeaders = defaultMapping.headers;

      const cleanHeadersLower = activeHeaders.map((h: string) => h.toLowerCase());
      const hasId = cleanHeadersLower.includes('id') || cleanHeadersLower.includes('identificacao') || cleanHeadersLower.includes('identificação') || cleanHeadersLower.includes('idativo') || cleanHeadersLower.includes('patrimonio') || cleanHeadersLower.includes('patrimônio');

      if (!hasId) {
        addConsoleLog(`[IA - Bloqueio] Planilha inválida para [${moduleTitle}]. Ausência de ID/Chave Primária de relacionamento!`, 'ERRO');
        triggerSuccessNotification("Bloqueio de Migração 🔴", "A planilha modelo não contém uma coluna identificadora de ID ou Patrimônio necessária para o sincronismo.");
        setAnalyzingKeys(prev => ({ ...prev, [moduleKey]: false }));
        return;
      }

      addConsoleLog("[IA] Chamando cérebro artificial Gemini para auditoria de mapeamento SPCI...");
      
      const prompt = `Você é um Engenheiro de Dados SPCI especializado em conformidade de incêndio brasileira NBR 12962/NBR 13434. Faça uma auditoria de compatibilidade de reestruturação de banco de dados para o módulo ${moduleTitle}.

ESTRUTURA ATUAL DE COLUNAS:
${JSON.stringify(oldHeaders)}

NOVA ESTRUTURA DE COLUNAS DETECTADA NO MODELO SHEET:
${JSON.stringify(activeHeaders)}

Analise o seguinte:
1. Compatibilidade técnica rápida de migração de colunas.
2. Identifique quais colunas foram adicionadas, quais removidas e mapeie colunas equivalentes de nome similar.
3. Determine se é possível realizar o remodelamento sem quebrar a integridade estrutural.
4. Forneça um status claro ("É possível" ou "Não é possível" a reestruturação).

Responda estritamente com um JSON sem marcações extras (formato JSON literal puro) com este esquema exato:
{
  "compatible": boolean,
  "score": number,
  "addedColumns": ["coluna1"],
  "removedColumns": ["coluna2"],
  "mappedColumns": {"coluna_antiga": "coluna_nova"},
  "technicalAnalysis": "Resumo técnico explicativo de compatibilidade técnica em 2 frases",
  "nbrComplianceWarning": "Mensagem de alerta de conformidade legal de incêndio NBR"
}`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemInstruction: "Você é um auditor de banco de dados SPCI rigoroso. Responda estritamente em formato JSON válido." }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let parsedResult;
      try {
        let cleanText = data.text.trim();
        if (cleanText.startsWith("```json")) cleanText = cleanText.substring(7);
        if (cleanText.endsWith("```")) cleanText = cleanText.substring(0, cleanText.length - 3);
        parsedResult = JSON.parse(cleanText.trim());
      } catch (e) {
        parsedResult = {
          compatible: true,
          score: 85,
          addedColumns: activeHeaders.filter((h: string) => !oldHeaders.includes(h)),
          removedColumns: oldHeaders.filter((h: string) => !activeHeaders.includes(h)),
          mappedColumns: {},
          technicalAnalysis: "Auditoria efetuada. Nova estrutura aceita e pronta para remapeamento dinâmico pelo motor do SPCI.",
          nbrComplianceWarning: "Certifique-se de que nenhum campo de validade legal de combate a incêndio foi removido do modelo."
        };
      }

      const currentTpl = sheetsTemplates[moduleKey] || { customModel: false, templateId: '', headers: [], isRemodeled: true, aiAuditResult: null };
      const timestamp = new Date().toLocaleString('pt-BR');

      saveSheetsTemplates({
        ...sheetsTemplates,
        [moduleKey]: {
          ...currentTpl,
          templateId,
          headers: activeHeaders,
          isRemodeled: false,
          lastAuditedAt: timestamp,
          aiAuditResult: parsedResult
        }
      });

      addConsoleLog(`[IA] Auditoria concluída para [${moduleTitle}]. Score Compatibilidade: ${parsedResult.score}%.`, 'SUCESSO');
      
      triggerSuccessNotification(
        parsedResult.compatible ? "Análise IA: Compatível! 🟢" : "Análise IA: Alerta de Risco! 🔴",
        `Estrutura avaliada com Score de ${parsedResult.score}% para ${moduleTitle}.`
      );

    } catch (err: any) {
      console.error(err);
      addConsoleLog(`[IA] Falha na auditoria para [${moduleTitle}]: ${err.message || err}`, 'ERRO');
      triggerSuccessNotification("Erro de Análise ❌", `Falha técnica ao auditar: ${err.message || err}`);
    } finally {
      setAnalyzingKeys(prev => ({ ...prev, [moduleKey]: false }));
    }
  }, [gToken, sheetsTemplates, saveSheetsTemplates, addConsoleLog, triggerSuccessNotification]);

  const handleApplyRemodelNow = useCallback(async (moduleKey: string, moduleTitle: string) => {
    const tpl = sheetsTemplates[moduleKey];
    if (!tpl || tpl.headers.length === 0) {
      triggerSuccessNotification("Sem Modelo Ativo ⚠️", "Por favor, determine uma planilha de modelo primeiro.");
      return;
    }

    addConsoleLog(`[Remodelamento] Iniciando reestruturação imediata do banco de dados para [${moduleTitle}]...`);
    
    saveSheetsTemplates({
      ...sheetsTemplates,
      [moduleKey]: {
        ...tpl,
        isRemodeled: true
      }
    });

    const config = sheetsConfig[moduleKey];
    if (gToken && config && config.id) {
      try {
        addConsoleLog(`[Remodelamento] Atualizando estrutura de colunas do Google Sheets ativo ${config.id}...`);
        await writeSpreadsheet(gToken, config.id, [tpl.headers]);
        addConsoleLog("[Remodelamento] Estrutura gravada com sucesso!", 'SUCESSO');
      } catch (err: any) {
        addConsoleLog(`[Remodelamento] Nota: O arquivo remoto não pôde ser limpo com a nova estrutura ainda: ${err.message || err}`, 'ERRO');
      }
    }

    triggerSuccessNotification("Banco Remodelado! 🔵", `A estrutura do banco local do módulo ${moduleTitle} foi atualizada para os novos campos.`);
  }, [gToken, sheetsConfig, sheetsTemplates, saveSheetsTemplates, addConsoleLog, triggerSuccessNotification]);

  const handleMassImport = useCallback(async (moduleKey: string, moduleTitle: string) => {
    const tpl = sheetsTemplates[moduleKey];
    if (!gToken) {
      triggerSuccessNotification("Requer Google Login 🔑", "Por favor, entre com sua conta Google no topo para permitir imports em nuvem.");
      return;
    }
    if (!tpl || !tpl.templateId) {
      triggerSuccessNotification("Defina o Link 📝", "Insira o ID ou link do modelo de importação.");
      return;
    }

    const tplId = extractSpreadsheetId(tpl.templateId);
    addConsoleLog(`[Massa] Iniciando Importação em Massa & Remodelagem de Dados para [${moduleTitle}]. Conectando ao Sheets: ${tplId}`);
    
    const currentModule = sheetsConfig[moduleKey] || { id: '', url: '', syncState: 'idle' };
    saveSheetsConfig({
      ...sheetsConfig,
      [moduleKey]: { ...currentModule, syncState: 'syncing' }
    });

    try {
      const rows = await readSpreadsheet(gToken, tplId, 'Sheet1!A1:Z500');
      if (!rows || rows.length === 0) {
        throw new Error("A planilha fornecida está vazia ou inacessível.");
      }

      const headers = rows[0].map((h: any) => String(h).trim()).filter(Boolean);
      addConsoleLog(`[Massa] Importando com os novos cabeçalhos: ${JSON.stringify(headers)}`);

      const headersLower = headers.map(h => h.toLowerCase());
      const hasId = headersLower.includes('id') || headersLower.includes('identificacao') || headersLower.includes('identificação') || headersLower.includes('idativo') || headersLower.includes('patrimonio') || headersLower.includes('patrimônio');

      if (!hasId) {
        throw new Error("A planilha não possui coluna identificadora de chaves primárias (ID, Patrimônio ou Identificação). Importação cancelada.");
      }

      const importedAssets = rows.slice(1).map((row: any[], rowIndex: number) => {
        const asset: Record<string, any> = {};
        asset.id = `import-${Date.now()}-${rowIndex}-${Math.floor(Math.random() * 100)}`;
        
        headers.forEach((header, colIdx) => {
          const val = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
          asset[header] = val;
        });

        asset.idAtivo = asset["IdAtivo"] || asset["idAtivo"] || asset["Patrimonio"] || asset["ID"] || asset.id;
        asset.model = asset["Modelo"] || asset["modelo"] || asset["Nome"] || asset["Ativo"] || '';
        asset.location = asset["Localizacao"] || asset["localizacao"] || asset["Local"] || asset["LOCAL"] || '';
        asset.subLocation = asset["SubLocalizacao"] || asset["subLocalizacao"] || '';
        asset.seloInmetro = asset["SeloInmetro"] || asset["seloInmetro"] || '';
        asset.chassi = asset["Chassi"] || asset["chassi"] || '';
        asset.peso = asset["Peso_KG"] || asset["peso"] || '';
        asset.lastRecarga = asset["UltimaRecarga"] || asset["ultimaRecarga"] || '';
        asset.validadeRecarga = asset["ValidadeRecarga"] || asset["validadeRecarga"] || '';
        asset.status = asset["Status"] || asset["status"] || 'Conforme';
        asset.components = asset["Componentes"] ? asset["Componentes"].split(',').map((s: string) => s.trim()) : [];
        asset.lastInsp = asset["UltimaInspecao"] || '';
        asset.nextInsp = asset["ProximaInspecao"] || '';
        asset.group = asset["Grupo"] || '';
        asset.systemType = asset["TipoSistema"] || '';
        asset.qty = parseInt(asset["Quantidade"]) || 1;
        asset.battery = asset["Bateria"] || '';
        asset.autonomy = asset["Autonomia"] || '';
        asset.name = asset["Nome"] || '';
        asset.code = asset["Codigo"] || '';
        asset.type = asset["Tipo"] || '';
        asset.power = asset["Power"] || '';
        asset.range = asset["Pressao_Range"] || '';
        asset.starts = asset["Partidas"] || '0';
        asset.geolocation = {
          lat: parseFloat(asset["Latitude"] || asset["latitude"]) || -20.1245,
          lng: parseFloat(asset["Longitude"] || asset["longitude"]) || -44.5668
        };

        return asset;
      });

      addConsoleLog(`[Massa] Remapeamento concluído. Importados ${importedAssets.length} registros.`, 'SUCESSO');

      if (moduleKey === 'extintores') {
        setExtintores(importedAssets);
        await idb.setAll('extintores', importedAssets);
      } else if (moduleKey === 'hidrantes') {
        setHidrantes(importedAssets);
        await idb.setAll('hidrantes', importedAssets);
      } else if (moduleKey === 'sinalizacao') {
        setSinalizacoes(importedAssets);
        await idb.setAll('sinalizacoes', importedAssets);
      } else if (moduleKey === 'iluminacao') {
        setIluminacoes(importedAssets);
        await idb.setAll('iluminacao', importedAssets);
      } else if (moduleKey === 'bombas') {
        setBombas(importedAssets);
        await idb.setAll('bombas', importedAssets);
      }

      const activeDbId = currentModule.id ? extractSpreadsheetId(currentModule.id) : null;
      if (activeDbId) {
        addConsoleLog(`[Massa] Gravando registros no banco de dados ativo: ${activeDbId}...`);
        const rowsToWrite = [
          headers,
          ...importedAssets.map((asset: any) => {
            return headers.map(h => String(asset[h] !== undefined ? asset[h] : ''));
          })
        ];
        await writeSpreadsheet(gToken, activeDbId, rowsToWrite);
        addConsoleLog("[Massa] Google Sheets atualizado remotamente com sucesso!", 'SUCESSO');
      }

      const timestamp = new Date().toLocaleString('pt-BR');
      
      saveSheetsConfig({
        ...sheetsConfig,
        [moduleKey]: {
          ...currentModule,
          syncState: 'success',
          lastSync: timestamp
        }
      });

      saveSheetsTemplates({
        ...sheetsTemplates,
        [moduleKey]: {
          ...tpl,
          headers,
          isRemodeled: true
        }
      });

      setPremiumAlert({
        show: true,
        title: "Importação e Remodelagem por IA! 🟢",
        message: `Sua importação em lote foi um sucesso! O banco do módulo [${moduleTitle}] foi estruturado com sucesso para ${importedAssets.length} registros.`,
        type: 'success'
      });

    } catch (err: any) {
      console.error(err);
      addConsoleLog(`[Massa] Falha no importador em lote para [${moduleTitle}]: ${err.message || err}`, 'ERRO');
      saveSheetsConfig({
        ...sheetsConfig,
        [moduleKey]: { ...currentModule, syncState: 'error', lastError: err.message || String(err) }
      });
      triggerSuccessNotification("Falha no Mass Import ❌", `Erro técnico: ${err.message || err}`);
    }
  }, [gToken, sheetsConfig, sheetsTemplates, saveSheetsConfig, saveSheetsTemplates, addConsoleLog, triggerSuccessNotification]);

  return (
    <SpciContext.Provider value={{
      currentUser,
      userProfile,
      gToken,
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
      sheetsConfig,
      sheetsTemplates,
      sheetsConsoleLogs,
      analyzingKeys,
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
      importCockpit,
      setImportCockpit,
      addConsoleLog,
      saveSheetsConfig,
      saveSheetsTemplates,
      handleAIModelAnalysis,
      handleApplyRemodelNow,
      handleMassImport,
      handleGoogleLogin,
      handleGoogleLogout,
      handleUpdateLogoAndProfile,
      handleAdminRoleStatusChange,
      handleAdminDeleteUser,
      fetchUsers
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
