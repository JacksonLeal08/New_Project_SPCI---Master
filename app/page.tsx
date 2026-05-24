'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";

// --- SEED / SETUP STORAGE UTILS ---
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

// Initial Pump list
const INITIAL_BOMBAS = [
  { id: 'B1', name: 'Bomba Jockey', code: 'BMB-01', type: 'Elétrica (5 CV)', power: 'Rede 380V', range: '115 - 125 PSI', starts: '12', status: 'Standby' },
  { id: 'B2', name: 'Bomba Elétrica', code: 'BMB-02', type: 'Principal (75 CV)', power: 'Network 380V / 45A', range: '100 - 125 PSI', starts: '1', status: 'Operacional' },
  { id: 'B3', name: 'Bomba Diesel', code: 'BMB-03', type: 'Combustão', power: 'Diesel (Tanque 45%)', range: 'Battery 26.2V', starts: 'Nível Óleo Baixo', status: 'Manutenção Req.' }
];

export default function SpciComplianceApp() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'extintores' | 'hidrantes' | 'sinalizacao' | 'iluminacao' | 'bombas' | 'field-ronda' | 'alerts'>('dashboard');
  const [extintores, setExtintores] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('spci_extintores');
      if (stored) return JSON.parse(stored);
    }
    return INITIAL_EXTINTORES;
  });

  const [hidrantes, setHidrantes] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('spci_hidrantes');
      if (stored) return JSON.parse(stored);
    }
    return INITIAL_HIDRANTES;
  });

  const [sinalizacoes, setSinalizacoes] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('spci_sinalizacoes');
      if (stored) return JSON.parse(stored);
    }
    return INITIAL_SINALIZACAO;
  });

  const [iluminacoes, setIluminacoes] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('spci_iluminacao');
      if (stored) return JSON.parse(stored);
    }
    return INITIAL_ILUMINACAO;
  });

  const [bombas, setBombas] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('spci_bombas');
      if (stored) return JSON.parse(stored);
    }
    return INITIAL_BOMBAS;
  });

  const [complianceLogs, setComplianceLogs] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('spci_logs');
      if (stored) return JSON.parse(stored);
    }
    return [];
  });

  const [pressure, setPressure] = useState(125);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // Modal / Popup Alerts State
  const [premiumAlert, setPremiumAlert] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'warning' | 'info' | 'critical'; dispatchData?: any } | null>(null);
  
  // Quick Scan simulation
  const [scanModal, setScanModal] = useState(false);
  const [scanCode, setScanCode] = useState('');

  // AI Assistant Chat state
  const [chatOpened, setChatOpened] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    { sender: 'assistant', text: 'Olá Operador! Sou o assistente Inspe IA SPCI. Como posso apoiar você em suas inspeções de NBR de hoje, ou ao redactar alertas de inconformidades?' }
  ]);
  const [userPrompt, setUserPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Forms / Checklists States (Active Session)
  const [selectedAssetForInspection, setSelectedAssetForInspection] = useState<any | null>(null);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<any | null>(null);
  const [showAddCustomHistory, setShowAddCustomHistory] = useState(false);
  const [customEventTitle, setCustomEventTitle] = useState('Recarga Manual NBR');
  const [customEventStatus, setCustomEventStatus] = useState('Conforme');
  const [customEventNotes, setCustomEventNotes] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'non_conforming' | 'manual'>('all');
  const [nonConformitySelectedOption, setNonConformitySelectedOption] = useState<string>('');
  const [inspectionNotes, setInspectionNotes] = useState<string>('');
  const [photoPatrimonio, setPhotoPatrimonio] = useState<string | null>(null);
  const [photoFrontal, setPhotoFrontal] = useState<string | null>(null);
  
  // Registration States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAssetType, setNewAssetType] = useState<'extintor' | 'hidrante' | 'sinalizacao' | 'iluminacao' | 'bomba'>('extintor');

  // New forms values State
  const [formLocal, setFormLocal] = useState('MANGANÊS');
  const [formSubLocal, setFormSubLocal] = useState('BARRAGEM DO AZUL');
  const [formPatrimonio, setFormPatrimonio] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSelo, setFormSelo] = useState('');
  const [formChassi, setFormChassi] = useState('');
  const [formWeight, setFormWeight] = useState('6');
  const [formSystemType, setFormSystemType] = useState('CONJUNTO DE BLOCO AUTÔNOMO');

  // Multi-select model items for signage & lighting
  const [multiSelectModels, setMultiSelectModels] = useState<string[]>([]);

  // Alert channel templates preview state for Email, WhatsApp, and Telegram
  const [alertFormChannel, setAlertFormChannel] = useState<'whatsapp' | 'telegram' | 'email'>('whatsapp');
  const [alertTargetContact, setAlertTargetContact] = useState('');
  const [generatedReportText, setGeneratedReportText] = useState('');

  // --- INITIALIZE FROM STORAGE OR CONTEXT ---
  useEffect(() => {
    // Ensuring default items are persisted once in case storage is empty
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('spci_extintores')) localStorage.setItem('spci_extintores', JSON.stringify(INITIAL_EXTINTORES));
      if (!localStorage.getItem('spci_hidrantes')) localStorage.setItem('spci_hidrantes', JSON.stringify(INITIAL_HIDRANTES));
      if (!localStorage.getItem('spci_sinalizacoes')) localStorage.setItem('spci_sinalizacoes', JSON.stringify(INITIAL_SINALIZACAO));
      if (!localStorage.getItem('spci_iluminacao')) localStorage.setItem('spci_iluminacao', JSON.stringify(INITIAL_ILUMINACAO));
      if (!localStorage.getItem('spci_bombas')) localStorage.setItem('spci_bombas', JSON.stringify(INITIAL_BOMBAS));
    }
  }, []);

  const saveToStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // --- PUMP PRESSURE FLUTTER SIMULATOR ---
  useEffect(() => {
    if (!isTestRunning) return;
    const interval = setInterval(() => {
      setPressure(prev => {
        const delta = Math.floor(Math.random() * 20) - 10;
        const target = prev + delta;
        return target < 80 ? 80 : target > 160 ? 160 : target;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isTestRunning]);

  // --- COMPLIANCE KPI CALCULATORS ---
  const totalAssets = extintores.length + hidrantes.length + sinalizacoes.length + iluminacoes.length;
  const totalVencidos = 
    extintores.filter(x => x.status === 'Vencido').length + 
    hidrantes.filter(x => x.status === 'Vencido').length +
    sinalizacoes.filter(x => x.status === 'Faltante').length +
    iluminacoes.filter(x => x.status === 'Falha Carga').length;

  const totalAtencao =
    extintores.filter(x => x.status === 'Em Manutenção').length +
    hidrantes.filter(x => x.status === 'Em Manutenção').length +
    sinalizacoes.filter(x => x.status === 'Não Conforme').length +
    iluminacoes.filter(x => x.status === 'Atenção').length;

  const compliancePercentage = totalAssets > 0 ? Math.round(((totalAssets - totalVencidos) / totalAssets) * 100) : 100;

  // --- AI ASSISTANT CONNECTOR ---
  const handleAssistantSend = async () => {
    if (!userPrompt.trim()) return;
    const msg = userPrompt;
    setChatMessages(prev => [...prev, { sender: 'user', text: msg }]);
    setUserPrompt('');
    setAiGenerating(true);

    try {
      const response = await fetch('/api/gemini', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Instruções: Responda de forma sucinta e profissional em português como o Inspe IA SPCI, um Engenheiro Inspetor de Segurança contra Incêndio.
          Dados Atuais da Planta:
          - Total de ativos cadastrados: ${totalAssets}
          - Equipamentos vencidos crítico: ${totalVencidos}
          - Equipamentos em atenção/manutenção: ${totalAtencao}
          - Índice de Conformidade: ${compliancePercentage}%
          Pergunta do Operador: ${msg}`,
          systemInstruction: "You are the Inspe IA SPCI assistant, helping with safety norms NBR 12779, NBR 13434 and fire combat equipment. Keep responses robust, precise and brief, recommending field protocols."
        })
      });

      const data = await response.json();
      const text = data.text || "Ops! Consegui processar sua consulta, mas a resposta está vazia. Por favor, tente novamente de forma objetiva.";
      setChatMessages(prev => [...prev, { sender: 'assistant', text }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { sender: 'assistant', text: `Dica de Regulamento (Modo Offline Ativo): Garanta sempre que a sinalização NBR 13434 esteja instalada a 1.80m de altura, e mangueiras testadas sob NBR 12779 anualmente.` }]);
    } finally {
      setAiGenerating(false);
    }
  };

  // --- OUTGOING COMPLIANCE ALERTS ENGINE ---
  const handleOpenAlertCenter = (asset: any) => {
    setAlertTargetContact('');
    const title = `🚨 ALERTA SPCI - INCONFORMIDADE TÉCNICA`;
    const message = `Prezado Gestor,\n\nRelatamos uma falha de conformidade no ativo *${asset.idAtivo || asset.id}* (${asset.model || 'Placa'}) localizado no setor *${asset.location} - ${asset.subLocation}*.\n\n*Inconformidade:* Equipamento com status de [${asset.status}]. Teste e recargas pendentes devem ser efetuados.\n\n_Responsável:_ SPCI Compliance`;
    setGeneratedReportText(message);
    setAlertFormChannel('whatsapp');
    setPremiumAlert({
      show: true,
      title: 'Central de Emissão de Alertas Premium',
      message: 'Configure e despache alertas de vencimentos e relatórios para gestores de forma imediata via WhatsApp, Telegram ou Email.',
      type: 'critical',
      dispatchData: asset
    });
  };

  const dispatchAlertNotification = () => {
    const textEncoded = encodeURIComponent(generatedReportText);
    if (alertFormChannel === 'whatsapp') {
      const formattedNum = alertTargetContact.replace(/\D/g, '');
      const url = `https://api.whatsapp.com/send?phone=${formattedNum || '5500000000000'}&text=${textEncoded}`;
      window.open(url, '_blank');
    } else if (alertFormChannel === 'telegram') {
      const url = `https://t.me/share/url?url=${encodeURIComponent('https://sistema-spci.com')}&text=${textEncoded}`;
      window.open(url, '_blank');
    } else {
      const url = `mailto:${alertTargetContact || 'gestao@empresa.com'}?subject=${encodeURIComponent('ALERTA DE SEGURANÇA SPCI')}&body=${textEncoded}`;
      window.open(url, '_blank');
    }
    
    setPremiumAlert(null);
    triggerSuccessNotification('Alerta despachado com sucesso!', 'Os responsáveis receberam a notificação de conformidade do ativo.');
  };

  // Helper trigger
  const triggerSuccessNotification = (title: string, message: string) => {
    setPremiumAlert({
      show: true,
      title,
      message,
      type: 'success'
    });
  };

  // --- ASSET CODE SCANNER SIMULATOR ---
  const handleSimulateQuickScan = () => {
    const code = scanCode.toUpperCase().trim();
    if (!code) return;
    
    // Find in databases
    const ext = extintores.find(x => x.idAtivo === code || x.chassi === code);
    const hid = hidrantes.find(x => x.idAtivo === code);
    const sin = sinalizacoes.find(x => x.idAtivo === code);
    const lum = iluminacoes.find(x => x.idAtivo === code);

    const match = ext || hid || sin || lum;
    setScanModal(false);
    setScanCode('');

    if (match) {
      setSelectedAssetForInspection(match);
      setNonConformitySelectedOption('');
      setInspectionNotes('');
      // Route to correct category
      if (ext) setActiveTab('extintores');
      else if (hid) setActiveTab('hidrantes');
      else if (sin) setActiveTab('sinalizacao');
      else if (lum) setActiveTab('iluminacao');
    } else {
      triggerSuccessNotification('Código não encontrado', 'Deseja cadastrar este novo código como equipamento? Use o botão "+ Novo Ativo".');
    }
  };

  // --- SUBMIT REGISTRATION FORM ---
  const handleAddNewAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatrimonio) {
      alert("Preencha o Número de Patrimônio!");
      return;
    }

    const uniqueId = String(Date.now());
    const codePatrimonio = formPatrimonio.startsWith('PAT-') ? formPatrimonio : `PAT-${formPatrimonio.toUpperCase()}`;

    if (newAssetType === 'extintor') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        model: formModel || 'PQS ABC - 6KG',
        location: formLocal,
        subLocation: formSubLocal,
        seloInmetro: formSelo || 'S-' + Math.floor(Math.random() * 100000),
        chassi: formChassi || 'C-' + Math.floor(Math.random() * 100000),
        peso: formWeight,
        lastRecarga: '2025-05-24',
        recurrenceInterval: '1 Ano',
        validadeRecarga: '2026-05-24',
        validadeTesteHidro: '2030',
        status: 'Conforme'
      };
      const updated = [newObj, ...extintores];
      setExtintores(updated);
      saveToStorage('spci_extintores', updated);
    } else if (newAssetType === 'hidrante') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: formLocal,
        subLocation: formSubLocal,
        components: ['2 Mangueiras (15m)', '1 Esguicho Regulável', '2 Chaves Storz'],
        lastInsp: '2025-05-24',
        nextInsp: '2026-05-24',
        status: 'Conforme'
      };
      const updated = [newObj, ...hidrantes];
      setHidrantes(updated);
      saveToStorage('spci_hidrantes', updated);
    } else if (newAssetType === 'sinalizacao') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: formLocal,
        subLocation: formSubLocal,
        model: multiSelectModels.join(', ') || 'Placa Multi-Direcional - C3',
        group: 'Rota de Fuga',
        status: 'Conforme'
      };
      const updated = [newObj, ...sinalizacoes];
      setSinalizacoes(updated);
      saveToStorage('spci_sinalizacoes', updated);
    } else if (newAssetType === 'iluminacao') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: formLocal,
        subLocation: formSubLocal,
        systemType: formSystemType,
        model: multiSelectModels.join(', ') || 'Bloco 30 LEDs',
        qty: 1,
        battery: '100%',
        autonomy: '120m / 120m',
        status: 'Operacional'
      };
      const updated = [newObj, ...iluminacoes];
      setIluminacoes(updated);
      saveToStorage('spci_iluminacao', updated);
    }

    // Reset forms
    setFormPatrimonio('');
    setFormModel('');
    setFormSelo('');
    setFormChassi('');
    setMultiSelectModels([]);
    setShowAddForm(false);
    triggerSuccessNotification('Equipamento Registrado!', `Ativo ${codePatrimonio} foi salvo no banco de dados SPCI.`);
  };

  // --- SUBMIT COMPLIANCE INSPECTION FORM ---
  const handleFinalizeInspection = (statusResult: 'Conforme' | 'Não Conforme' | 'Falha Carga' | 'Vencido') => {
    if (!selectedAssetForInspection) return;

    // Simulate database update
    const currentAsset = selectedAssetForInspection;
    
    // Update extintores
    if (extintores.some(x => x.id === currentAsset.id)) {
      const updated = extintores.map(x => x.id === currentAsset.id ? { ...x, status: statusResult } : x);
      setExtintores(updated);
      saveToStorage('spci_extintores', updated);
    }
    // Update hidrantes
    if (hidrantes.some(x => x.id === currentAsset.id)) {
      const updated = hidrantes.map(x => x.id === currentAsset.id ? { ...x, status: statusResult } : x);
      setHidrantes(updated);
      saveToStorage('spci_hidrantes', updated);
    }
    // Update sinalizacoes
    if (sinalizacoes.some(x => x.id === currentAsset.id)) {
      const updated = sinalizacoes.map(x => x.id === currentAsset.id ? { ...x, status: statusResult } : x);
      setSinalizacoes(updated);
      saveToStorage('spci_sinalizacoes', updated);
    }
    // Update iluminacoes
    if (iluminacoes.some(x => x.id === currentAsset.id)) {
      const updated = iluminacoes.map(x => x.id === currentAsset.id ? { ...x, status: statusResult } : x);
      setIluminacoes(updated);
      saveToStorage('spci_iluminacao', updated);
    }

    // Save Compliance Inspection log
    const newLog = {
      date: new Date().toISOString().substring(0, 10),
      time: new Date().toLocaleTimeString(),
      assetId: currentAsset.idAtivo || currentAsset.id,
      model: currentAsset.model || 'Sinalização',
      notes: inspectionNotes || 'Inspeção periódica NBR efetuada.',
      status: statusResult
    };
    const newLogs = [newLog, ...complianceLogs];
    setComplianceLogs(newLogs);
    saveToStorage('spci_logs', newLogs);

    // If "Não Conforme", auto draft alert in state
    if (statusResult !== 'Conforme') {
      handleOpenAlertCenter({ ...currentAsset, status: statusResult });
    } else {
      triggerSuccessNotification('Inspeção Finalizada!', `Ativo ${currentAsset.idAtivo || currentAsset.id} homologado sem pendências.`);
    }

    // Clear session
    setSelectedAssetForInspection(null);
    setInspectionNotes('');
    setPhotoPatrimonio(null);
    setPhotoFrontal(null);
  };

  const handleDemoFileDrop = (type: 'patrimonio' | 'frontal') => {
    // Mock image load
    const demoImg = type === 'patrimonio'
      ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHivi8AubFRd57LyIxQ_UCpU0e5EZHM7CU3G0i5bllB8kOWe0yEs4_cvHEjTQldIXZ0yPUWT5hwkkTpWHR2G9Gjx98y4rPOGqxaYrFeEXeUwSRzxkhtGzh5--E207GrM5-Au-1AN5-u4BCViGJdZ6KqlR0cESE55hAr_EvCNv256E2_diaNV_n9I15GyoyVCIta-61ZT2s2Jcj4UQRvunu_9CEmB-1098iMlvEIZSql0OlnOTbn8TqoaPpDM5fG7loYuhMU8HKyWY'
      : 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4DtHkK9-zzGzyBO9bnX-acjae5qNr2WAE0yVLY2LLy5jx8sNjKh1eaCAzuJbV1yeEXNFAnrP1tInIJgPrMSEU3IPuOCOKFX-DCjmH3x3jwkc8nuoe6sVcpTdHjjqyZfI9PViUbPbGKGxOXROAtM_z4xIOGRtZ-KO5OHRUA3uf2H1izCUhtdsUhj0tL0IMKSdGTYxgpMUD8M6zLZrYRecX9Uqkth3zFIHctgDHx4RaleqwHOT9WngusjL4yqACCptwEZ57QlnDxSM';
    
    if (type === 'patrimonio') setPhotoPatrimonio(demoImg);
    else setPhotoFrontal(demoImg);
  };

  // --- DYNAMIC LIFE CYCLE COMPLIANCE TIMELINE CALCULATOR ---
  const getAssetTimeline = (asset: any) => {
    if (!asset) return [];
    
    const assetId = asset.idAtivo || asset.id;
    
    // 1. Get automated logs from complianceLogs state
    const autoLogs = complianceLogs
      .filter((log: any) => log.assetId === assetId)
      .map((log: any) => ({
        id: `auto-${log.date}-${log.time}`,
        date: log.date,
        time: log.time,
        type: 'inspection',
        title: 'Inspeção de Campo NBR',
        icon: log.status === 'Conforme' || log.status === 'Operacional' ? '🟢' : '🚨',
        status: log.status,
        description: log.notes,
        author: 'Jackson (Coordenador)'
      }));
      
    // 2. Get custom entries from localStorage
    let customLogs: any[] = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`spci_history_${assetId}`);
      if (stored) {
        customLogs = JSON.parse(stored);
      }
    }
    
    // 3. Create simulated seed/registration date
    let registerDate = '2025-01-15';
    let registerDescription = 'Cadastro inicial de patrimônio e homologação inicial sob normas ABNT NBR.';
    
    if (assetId.includes('-101')) {
      registerDate = '2023-03-15';
    } else if (assetId.includes('-102')) {
      registerDate = '2024-05-10';
    } else if (assetId.includes('-103')) {
      registerDate = '2024-12-12';
    } else if (assetId.includes('-104')) {
      registerDate = '2025-01-05';
    } else if (assetId.includes('1042')) {
      registerDate = '2023-08-12';
    } else if (assetId.includes('1055')) {
      registerDate = '2023-11-05';
    } else if (assetId.includes('1088')) {
      registerDate = '2024-09-10';
    } else if (asset.lastRecarga) {
      registerDate = asset.lastRecarga;
    } else if (asset.lastInsp) {
      registerDate = asset.lastInsp;
    }
    
    const seedRegistration = {
      id: 'registration',
      date: registerDate,
      time: '08:00:00',
      type: 'registration',
      title: 'Ativação & Cadastro no SPCI',
      icon: '📥',
      status: 'Cadastro Ativo',
      description: `Dispositivo registrado com sucesso no local ${asset.location} ${asset.subLocation ? ' - ' + asset.subLocation : ''}. Homologação física e operacional consolidada.`,
      author: 'Controle de Patrimônio SPCI'
    };

    // Include other implicit historical milestones (e.g. recargas or past inspections recorded in card seeding values)
    const otherMilestones = [];
    if (asset.lastRecarga && asset.lastRecarga !== registerDate) {
      otherMilestones.push({
        id: 'implicit-recarga',
        date: asset.lastRecarga,
        time: '14:30:00',
        type: 'maintenance',
        title: 'Manutenção Preventiva de Recarga',
        icon: '🧯',
        status: 'Conforme',
        description: `Recarga periódica completa realizada por empresa homologada Inmetro. Lacre e inspeção de cilindro aprovados. Nova validade definida para ${asset.validadeRecarga || '1 Ano'}.`,
        author: 'Oficina Credenciada'
      });
    }
    if (asset.lastInsp && asset.lastInsp !== registerDate) {
      otherMilestones.push({
        id: 'implicit-insp',
        date: asset.lastInsp,
        time: '10:15:00',
        type: 'inspection',
        title: 'Inspeção Semestral Registrada',
        icon: '🟢',
        status: 'Conforme',
        description: `Inspeção do abrigo, mangueiras, engates e chaves Storz. Teste hidrostático de mangueira válido NBR 12779.`,
        author: 'Jackson (Coordenador)'
      });
    }
    
    // Combine events
    const allEvents = [...customLogs, ...autoLogs, ...otherMilestones, seedRegistration];
    
    // Deduplicate custom and auto events with identical timestamps so we don't double render transitions
    const seen = new Set();
    const dedupedEvents = allEvents.filter(e => {
      const key = `${e.date}-${e.title}-${e.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Chronological order descending
    return dedupedEvents.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '00:00:00'}`);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const handleAddCustomHistoryEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForHistory) return;
    const assetId = selectedAssetForHistory.idAtivo || selectedAssetForHistory.id;
    
    const newCustomEvent = {
      id: `custom-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      time: new Date().toLocaleTimeString(),
      type: 'manual',
      title: customEventTitle,
      icon: customEventTitle.includes('Recarga') ? '🧯' : customEventTitle.includes('Não') ? '🚨' : '📝',
      status: customEventStatus,
      description: customEventNotes || 'Registro de auditoria inserido administrativamente.',
      author: 'Jackson (Coordenador)'
    };

    let currentCustom: any[] = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`spci_history_${assetId}`);
      if (stored) {
        currentCustom = JSON.parse(stored);
      }
    }
    
    const updatedCustom = [newCustomEvent, ...currentCustom];
    if (typeof window !== 'undefined') {
      localStorage.setItem(`spci_history_${assetId}`, JSON.stringify(updatedCustom));
    }
    
    // Update the local card status so the visual update is fully responsive and immediate!
    if (customEventStatus !== selectedAssetForHistory.status) {
      if (extintores.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = extintores.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setExtintores(u);
        saveToStorage('spci_extintores', u);
      }
      if (hidrantes.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = hidrantes.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setHidrantes(u);
        saveToStorage('spci_hidrantes', u);
      }
      if (sinalizacoes.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = sinalizacoes.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setSinalizacoes(u);
        saveToStorage('spci_sinalizacoes', u);
      }
      if (iluminacoes.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = iluminacoes.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setIluminacoes(u);
        saveToStorage('spci_iluminacao', u);
      }
      // Also update currently opened history asset reference
      setSelectedAssetForHistory((prev: any) => ({ ...prev, status: customEventStatus }));
    }

    triggerSuccessNotification('Histórico SPCI Atualizado!', `O evento administrativo "${customEventTitle}" foi inserido com sucesso na linha do tempo.`);
    
    setCustomEventNotes('');
    setShowAddCustomHistory(false);
  };

  // CATEGORY DICTIONARIES
  const SECTORS_LIST = ['MANGANÊS', 'ALMOXARIFADO', 'SALA ELÉTRICA', 'BARRAGEM DO AZUL', 'ROTA DE FUGA 01', 'ROTA DE FUGA 02', 'RECEPÇÃO', 'COBRE', 'FERRO'];

  return (
    <div className="bg-neutral-100 min-h-screen text-slate-900 font-sans flex flex-col md:flex-row antialiased select-none">
      
      {/* --- DESKTOP PREMIUM SIDEBAR (Suppressed nested items to ensure scan and clarity) --- */}
      <aside className="hidden md:flex flex-col w-72 bg-gradient-to-b from-[#253238] to-[#121c21] text-white shrink-0 p-5 border-r border-[#37474F]/40 shadow-xl">
        <div className="flex items-center gap-3 mb-8 mt-2 p-2">
          <div className="w-11 h-11 bg-red-600 rounded-xl flex items-center justify-center text-xl shadow-lg border border-red-500 animate-pulse">
            🧯
          </div>
          <div>
            <h1 className="font-['Hanken_Grotesk'] text-xl font-bold tracking-tight text-white m-0">SISTEMA SPCI</h1>
            <p className="font-mono text-[9px] text-[#7bd1f8] tracking-widest uppercase">Compliance & Field App</p>
          </div>
        </div>

        <button 
          onClick={() => { setShowAddForm(true); setSelectedAssetForInspection(null); }}
          className="w-full bg-[#af101a] hover:bg-[#d32f2f] text-white font-['Hanken_Grotesk'] font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-6 group transition-all duration-300 transform hover:scale-[1.03] active:scale-95 shadow-md shadow-red-950/20"
        >
          <span>➕</span> REGISTRAR NOVO ATIVO
        </button>

        {/* Dynamic Nav Lists */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard / Visão Geral', icon: '📊' },
            { id: 'extintores', label: 'Extintores', icon: '🧯' },
            { id: 'hidrantes', label: 'Hidrantes & Abrigos', icon: '💧' },
            { id: 'sinalizacao', label: 'Sinalização NBR', icon: '⚠️' },
            { id: 'iluminacao', label: 'Iluminação Emergência', icon: '💡' },
            { id: 'bombas', label: 'Casa de Bombas', icon: '⚙️' },
            { id: 'field-ronda', label: 'Extensão Ronda Campo', icon: '📱' },
            { id: 'alerts', label: 'Disparo de Alertas', icon: '🔔' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setSelectedAssetForInspection(null);
                setShowAddForm(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all duration-200 text-left ${activeTab === item.id ? 'bg-gradient-to-r from-red-700 to-rose-600 font-bold shadow-md shadow-red-900/30' : 'text-slate-300 hover:bg-[#37474F]/50 hover:text-white'}`}
            >
              <span className="text-sm">{item.icon}</span>
              <span className="font-['Hanken_Grotesk']">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sync panel indicator */}
        <div className="bg-[#2D424A]/40 border border-[#CFD8DC]/10 p-3 rounded-xl text-center text-xs space-y-1 mb-2">
          <p className="text-[#a5d6a7] font-semibold flex items-center justify-center gap-2">
            <span>🟢</span> Sincronia Ativa
          </p>
          <p className="text-[10px] text-slate-400 font-mono">Última: Hoje, 2026-05-24</p>
        </div>
      </aside>

      {/* --- MAIN PAGE CONTENT WRAPPER --- */}
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* --- DYNAMIC HEADER --- */}
        <header className="bg-gradient-to-r from-[#af101a] via-[#d32f2f] to-[#be123c] text-white flex justify-between items-center w-full px-6 h-16 shrink-0 shadow-lg border-b border-rose-950/20">
          <div className="flex items-center gap-4">
            <span className="md:hidden text-lg font-bold tracking-tight">SPCI SINALIZAÇÃO</span>
            <span className="hidden md:inline-block font-['Hanken_Grotesk'] font-black tracking-tight text-white text-lg">
              🚒 PLANTA DE SEGURANÇA SPCI
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick search scan button */}
            <button 
              onClick={() => setScanModal(true)}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-['Hanken_Grotesk'] font-bold uppercase rounded-lg tracking-wider border border-white/20 flex items-center gap-2"
            >
              <span>🔍</span> Scan / Buscar
            </button>

            {/* Profile photo matching templates */}
            <div className="hidden lg:flex items-center gap-2 border-l border-white/20 pl-4">
              <img 
                alt="Foto do Técnico" 
                className="w-8 h-8 rounded-full border border-white/40 object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHivi8AubFRd57LyIxQ_UCpU0e5EZHM7CU3G0i5bllB8kOWe0yEs4_cvHEjTQldIXZ0yPUWT5hwkkTpWHR2G9Gjx98y4rPOGqxaYrFeEXeUwSRzxkhtGzh5--E207GrM5-Au-1AN5-u4BCViGJdZ6KqlR0cESE55hAr_EvCNv256E2_diaNV_n9I15GyoyVCIta-61ZT2s2Jcj4UQRvunu_9CEmB-1098iMlvEIZSql0OlnOTbn8TqoaPpDM5fG7loYuhMU8HKyWY"
              />
              <span className="text-xs font-semibold tracking-wide">jack_compliance</span>
            </div>
          </div>
        </header>

        {/* --- SCROLLABLE CONTAINER CANVAS --- */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F5F7F8]">
          <div className="max-w-6xl mx-auto pb-20">
            
            {/* Show Asset Creation form overlay if triggered */}
            {showAddForm ? (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#CFD8DC] p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-700"></div>
                
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="font-['Hanken_Grotesk'] font-bold text-xl text-[#37474F]">✍️ Cadastrar Novo Ativo no Sistema SPCI</h2>
                    <p className="text-slate-500 text-xs">Preencha os dados e homologue o novo ativo para monitoramento e alertas</p>
                  </div>
                  <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-900 border border-slate-200 rounded-lg p-2 text-xs">Fechar ×</button>
                </div>

                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-lg mb-6 overflow-x-auto hide-scrollbar">
                  {['extintor', 'hidrante', 'sinalizacao', 'iluminacao'].map((type: any) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewAssetType(type)}
                      className={`flex-1 px-4 py-2 text-xs uppercase font-['Hanken_Grotesk'] font-bold rounded-md whitespace-nowrap ${newAssetType === type ? 'bg-gradient-to-r from-[#af101a] to-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                      {type === 'extintor' && '🧯 Extintor'}
                      {type === 'hidrante' && '💧 Hidrante'}
                      {type === 'sinalizacao' && '⚠️ Sinalização'}
                      {type === 'iluminacao' && '💡 Iluminação'}
                    </button>
                  ))}
                </div>

                {/* Submitting form */}
                <form onSubmit={handleAddNewAssetSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Local da Instalação *</label>
                      <select value={formLocal} onChange={(e) => setFormLocal(e.target.value)} className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 focus:outline-none focus:border-slate-800 text-sm">
                        {SECTORS_LIST.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Sub Local (Sala / Doca) *</label>
                      <input type="text" value={formSubLocal} onChange={(e) => setFormSubLocal(e.target.value)} className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 focus:outline-none focus:border-slate-800 text-sm" placeholder="Ex: Barragem Azul, Setor B de Estocagem" />
                    </div>

                    <div>
                      <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Número do Patrimônio *</label>
                      <div className="flex gap-2">
                        <span className="bg-slate-200 text-sm px-3 flex items-center text-slate-700 font-mono rounded-l-xl border border-[#CFD8DC]">PAT-</span>
                        <input type="text" value={formPatrimonio} onChange={(e) => setFormPatrimonio(e.target.value)} className="w-full bg-slate-50 border border-t border-b border-r border-[#CFD8DC] rounded-r-xl p-3 focus:outline-none focus:border-slate-800 text-sm font-semibold uppercase" placeholder="Escreva o número" required />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Dica técnica: Sempre utilize o adesivo laminado QR SPCI.</p>
                    </div>

                    {/* Extinguisher Specific */}
                    {newAssetType === 'extintor' && (
                      <>
                        <div>
                          <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Modelo / Agente e Carga *</label>
                          <select value={formModel} onChange={(e) => setFormModel(e.target.value)} className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-sm">
                            <option value="PQS ABC - 8KG">Pós Químico ABC - 8KG</option>
                            <option value="CO2 - 6KG">Gás Carbônico CO2 - 6KG</option>
                            <option value="Água Pressurizada - 10L">Água Pressurizada (AP) - 10L</option>
                            <option value="PQS BC - 4KG">Pós Químico BC - 4KG</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Selo Inmetro (Opcional)</label>
                          <input type="text" value={formSelo} onChange={(e) => setFormSelo(e.target.value)} className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-sm font-mono" placeholder="Selo Impresso" />
                        </div>
                        <div>
                          <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Chassi Corporativo</label>
                          <input type="text" value={formChassi} onChange={(e) => setFormChassi(e.target.value)} className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-sm uppercase" placeholder="Chassi gravado" />
                        </div>
                      </>
                    )}

                    {/* Signage - Visual Multi selection with Google image URLs */}
                    {newAssetType === 'sinalizacao' && (
                      <div className="col-span-1 md:col-span-2">
                        <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-3">Marque o Modelo Visual da Placa *</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {[
                            { key: 'C3 Seta Esquerda', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNNbUfk2-mF0LxprKV2C7RKYXByvjbUXy_XWGbND3PaNoNkZwm1WPALDNXzWKlln0_0NhdfGno-XDTHgppxN_u_498yg03tdmYfiXnVOZmjdDfRjlduzDfLIZOdwrukwEBBsjFja9AeeWHamh8Oj6ix518U7tf8MlGGpDq_EoeNy-CpyAUiBoiAeQIdJ8TsTDvlPcjLNk61VGY7vOr1sIpD81yn4jzCVzqDrNzI9qIwa3kLdAva8y-52WbK7TegbKDD9z-fC8hNds', desc: 'Direção rota saída esquerda (C1)' },
                            { key: 'C2 Seta Escada', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4jlkr2uN2Tr6OJK6xOqq__Dmr4HqtdL80oYJ6xWONK9spyiKxm43StnH--3VPFVk3V2XvVl_oGmZF5F5Uckdfj_OMtvTldfCBdMMEs8kM6bKlsvNx4Dhk1iFXyYzAXZOs4XY-8L9NBBMOfMOj391GSo1Giw5N39-HB3gvS6RBY0QOmesGudZbE-gzJGedDPv9HK6BepGwGVEUC9sN4FqqkHlrCtabrdHhw-CcdWchRdmKVmkhJleznOXtmpaGQsIbLWLIQCOHztk', desc: 'Direção rota saída descendo (C2)' },
                            { key: 'C3 Seta Direita', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqRdNZ3PxX3jI5lZpnWd--u2m8jxVQqLaqU5vQ0pkiBWzfqr50eBZzbBsJKE85XpDbsDZEa31a6kA6sqnv8_Am4020bV21UWRP3xqBcxjHNQtlqgZ6cQI-s8sXNS25S4tlRyp4FgxG2ni9Wz4f5tlN28lxhNVEVU48Np-IXSp9m588pUkW-fDPGTsWVIglvkAXH9H2yl9Z7t9W71qZKjMsRzE4HCaRnTv6XkbI2BUqhUF5lx86aP3hEpAt7kez4KrFHpv8Tw3ieGM', desc: 'Direção rota saída direita (C3)' }
                          ].map(item => (
                            <label key={item.key} className="border border-slate-300 rounded-xl p-3 flex flex-col items-center cursor-pointer hover:bg-slate-50 relative">
                              <input 
                                type="checkbox" 
                                checked={multiSelectModels.includes(item.key)}
                                onChange={(e) => {
                                  if (e.target.checked) setMultiSelectModels([...multiSelectModels, item.key]);
                                  else setMultiSelectModels(multiSelectModels.filter(g => g !== item.key));
                                }}
                                className="absolute top-2 left-2" 
                              />
                              <img src={item.url} alt={item.desc} className="h-16 w-full object-contain mb-2 mix-blend-multiply" />
                              <span className="text-[10px] text-center font-bold text-slate-800 uppercase font-mono">{item.desc}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lighting - Options */}
                    {newAssetType === 'iluminacao' && (
                      <>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Tipo de Sistema *</label>
                          <select value={formSystemType} onChange={(e) => setFormSystemType(e.target.value)} className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-sm">
                            <option value="CONJUNTO DE BLOCO AUTÔNOMO">CONJUNTO DE BLOCO AUTÔNOMO (Luminária própria)</option>
                            <option value="SISTEMA CENTRALIZADO BATERIAS">SISTEMA CENTRALIZADO COM BATERIAS NA CENTRAL</option>
                            <option value="SISTEMA CENTRALIZADO MOTOGERADOR">SISTEMA CENTRALIZADO COM MOTOGERADOR ALIMENTADOR</option>
                          </select>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-3">Modelos de Luminárias Recomendadas *</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              { key: 'Bloco LED', desc: 'BLOCO DE LED', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4DtHkK9-zzGzyBO9bnX-acjae5qNr2WAE0yVLY2LLy5jx8sNjKh1eaCAzuJbV1yeEXNFAnrP1tInIJgPrMSEU3IPuOCOKFX-DCjmH3x3jwkc8nuoe6sVcpTdHjjqyZfI9PViUbPbGKGxOXROAtM_z4xIOGRtZ-KO5OHRUA3uf2H1izCUhtdsUhj0tL0IMKSdGTYxgpMUD8M6zLZrYRecX9Uqkth3zFIHctgDHx4RaleqwHOT9WngusjL4yqACCptwEZ57QlnDxSM' },
                              { key: 'Bloco 2 Faróis', desc: 'BLOCO COM 02 FARÓIS', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAgDAQVYb7Rn-gR9S7v6UoVrySjaAoQDuOpmlhXhqGikC0wZcTQkbcVJataF7fWdI0hCQjCSVsXhLu8kqiVQzKsvj9eP83FBP9O3xFAoxyLtJf_7SR4OQbBAtiYptJZIcVuqtaKukHE_Uc4NhK0nnWUoZegax39MMj_-v4YxEKH5i2KeQMnqHZHOKWSE89pdXsCfPBmn7kHtRlNKiMPvsGkznX41uxdQODowqTUrtmcXw8rIf5DyRrpxIX9ZGPrw4nqwn72OzxTs-k' }
                            ].map(item => (
                              <label key={item.key} className="border border-slate-300 rounded-xl p-3 flex items-center gap-4 cursor-pointer hover:bg-slate-50">
                                <input 
                                  type="checkbox"
                                  checked={multiSelectModels.includes(item.key)}
                                  onChange={(e) => {
                                    if (e.target.checked) setMultiSelectModels([...multiSelectModels, item.key]);
                                    else setMultiSelectModels(multiSelectModels.filter(g => g !== item.key));
                                  }}
                                />
                                <img src={item.url} alt={item.desc} className="h-12 w-12 object-contain mix-blend-multiply" />
                                <span className="font-['Hanken_Grotesk'] text-xs font-bold">{item.desc}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Operational compliance Month Note */}
                  <div className="bg-[#fff0ef] rounded-xl p-4 flex gap-3 text-slate-800 text-xs border-l-4 border-amber-500">
                    <span>⚠️</span>
                    <div>
                      <p className="font-bold">Aviso Automático SPCI:</p>
                      <p>No cadastro do equipamento, a próxima inspeção periódica obrigatória é agendada para o mesmo mês do cadastro.</p>
                      <p className="mt-1 font-mono font-bold text-red-700">Próxima inspeção agendada: 05/2026</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 text-xs uppercase font-bold text-slate-500 font-['Hanken_Grotesk'] hover:bg-slate-100 rounded-lg">Cancelar</button>
                    <button type="submit" className="px-6 py-2.5 text-xs uppercase font-['Hanken_Grotesk'] font-bold text-white bg-gradient-to-r from-green-700 to-emerald-600 rounded-lg shadow-md hover:from-green-800 transition-all duration-200 transform hover:scale-[1.02]">Salvar no Banco SPCI</button>
                  </div>
                </form>
              </motion.div>
            ) : null}

            {/* If an asset is loaded for checklist/inspection */}
            {selectedAssetForInspection ? (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl border border-[#CFD8DC] p-6 shadow-xl relative mt-4">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-700 to-[#af101a]"></div>
                
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                  <div>
                    <span className="bg-[#2E7D32] text-white text-[10px] font-bold py-1 px-2.5 rounded-full uppercase tracking-wider">Inspeção Ativa</span>
                    <h2 className="font-['Hanken_Grotesk'] font-black text-2xl text-slate-800 mt-2">Laudo NBR Conformidade - {selectedAssetForInspection.idAtivo || selectedAssetForInspection.id}</h2>
                  </div>
                  <button onClick={() => setSelectedAssetForInspection(null)} className="text-slate-400 hover:text-slate-900 border p-2 rounded-lg text-xs">Descartar Inspeção ×</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-[#CFD8DC]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mb-1">Equipamento</p>
                    <p className="font-semibold text-slate-800">{selectedAssetForInspection.model || 'Sinalização Operacional'}</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">Selo/Inmetro: {selectedAssetForInspection.seloInmetro || 'Isento/NBR'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-[#CFD8DC]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mb-1">Localização</p>
                    <p className="font-semibold text-slate-800">{selectedAssetForInspection.location}</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">Sala: {selectedAssetForInspection.subLocation || 'Liso'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-[#CFD8DC]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mb-1">Status Pré-Ronda</p>
                    <span className={`inline-block text-xs font-bold uppercase rounded p-1 ${selectedAssetForInspection.status === 'Conforme' || selectedAssetForInspection.status === 'Operacional' ? 'text-[#2E7D32] bg-[#E8F5E9]' : 'text-[#D32F2F] bg-[#FFEBEE]'}`}>
                      {selectedAssetForInspection.status}
                    </span>
                  </div>
                </div>

                {/* Photo upload mock zone */}
                <div className="bg-[#FFE2DE]/30 border border-[#D32F2F]/20 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📸</span>
                    <div>
                      <p className="text-xs font-bold text-red-900 uppercase">Laudo Fotográfico Obrigatório para NBR *</p>
                      <p className="text-[11px] text-red-700/80">Por favor, anexe uma foto em close-up do patrimônio e outra geral de frente.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => handleDemoFileDrop('patrimonio')}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${photoPatrimonio ? 'bg-green-100 text-green-800 border-green-300' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                      {photoPatrimonio ? '✔️ Foto Patrimônio' : '📸 Foto Patrimônio'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDemoFileDrop('frontal')}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${photoFrontal ? 'bg-green-100 text-green-800 border-green-300' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                      {photoFrontal ? '✔️ Foto Frontal' : '📸 Foto Frontal'}
                    </button>
                  </div>
                </div>

                {/* Mandatory NBR Checklists with Emojis */}
                <div className="space-y-4 mb-8">
                  <h3 className="font-['Hanken_Grotesk'] text-sm font-extrabold uppercase text-slate-700 pb-2 border-b">Requisitos Obrigatórios de Laudo</h3>
                  
                  {[
                    "Posição e Localização recomendada conforme normas?",
                    "Acesso desobstruído com faixa de segurança?",
                    "Sinalização fotoluminescente regulamentar?",
                    "Selo Inmetro, legibilidade de validade de manutenção?",
                    "Integridade estrutural da carcaça / conexões e pintura?"
                  ].map((req, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-[#CFD8DC]/60 rounded-xl hover:bg-slate-50">
                      <p className="text-xs font-semibold text-slate-800">{i+1}- {req}</p>
                      <div className="flex gap-2">
                        <button type="button" className="px-3 py-1.5 text-[11px] font-bold uppercase rounded-lg border border-slate-200 bg-white hover:bg-green-50 text-green-700 flex items-center gap-1 focus:ring-2 focus:ring-green-600">
                          <span>✔️</span> Conforme
                        </button>
                        <button type="button" className="px-3 py-1.5 text-[11px] font-bold uppercase rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 flex items-center gap-1 focus:ring-2 focus:ring-red-600">
                          <span>❌</span> Não Conforme
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submitting Checklists Buttons */}
                <div className="border-t border-slate-200 pt-6">
                  <div className="mb-4">
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Ação Corretiva / Observações do Técnico</label>
                    <textarea 
                      value={inspectionNotes}
                      onChange={(e) => setInspectionNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-xs focus:outline-none focus:border-slate-800" 
                      placeholder="Descreva pendências, irregularidades verificadas ou sugestões de engenharia..."
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => handleFinalizeInspection('Não Conforme')}
                      className="px-5 py-3 text-xs uppercase font-['Hanken_Grotesk'] font-bold rounded-xl text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all duration-200"
                    >
                      ⚠️ Registrar Não Conformidade
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleFinalizeInspection('Conforme')}
                      className="px-6 py-3 text-xs uppercase font-['Hanken_Grotesk'] font-bold rounded-xl text-white bg-gradient-to-r from-[#2E7D32] to-[#388E3C] hover:opacity-90 shadow-md shadow-green-950/20 transition-all duration-200"
                    >
                      🟢 FINALIZAR - HOMOLOGAR CONFORME
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* Displaying main chosen Tabs */}

            {/* --- VISÃO GERAL SCREEN --- */}
            {activeTab === 'dashboard' && !selectedAssetForInspection && !showAddForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                
                {/* Visual Premium Header Banner (Gradient + Degradê) */}
                <div className="bg-gradient-to-r from-[#1e293b] via-[#232f34] to-[#0f172a] text-white p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-2xl border border-white/5">
                  <div className="absolute -right-12 -top-12 w-64 h-64 bg-red-700/10 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <span className="bg-[#af101a] text-white text-[10px] font-bold py-1 px-3 rounded-full uppercase tracking-wider shadow-sm font-mono">Unidade Industrial 01</span>
                      <h2 className="font-['Hanken_Grotesk'] font-extrabold text-3xl md:text-4xl text-white tracking-tight mt-3">Ronda & Monitoramento SPCI</h2>
                      <p className="text-slate-300 text-sm mt-1 font-['IBM_Plex_Sans']">Inspeções registradas e em conformidade periódica com as normas técnicas.</p>
                    </div>
                    
                    <button 
                      onClick={() => setScanModal(true)}
                      className="px-6 py-3 bg-gradient-to-r from-red-600 via-rose-500 to-red-700 text-white font-['Hanken_Grotesk'] font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-xl shadow-red-950/30 transform hover:scale-105 active:scale-95"
                    >
                      📷 APONTAR SCAN CÂMERA
                    </button>
                  </div>
                </div>

                {/* Bento Grid layout with premium informational cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  
                  {/* KPI 1 : Conformidade */}
                  <div className="bg-white rounded-2xl border border-[#CFD8DC] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] hover:shadow-md transition-shadow">
                    <div className="absolute top-4 right-4 text-3xl">🛡️</div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold font-['Hanken_Grotesk']">Índice Conformidade</p>
                      <h3 className="font-[#121c21] font-bold font-['Hanken_Grotesk'] text-4xl mt-1">{compliancePercentage}%</h3>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                      <div className="bg-[#2E7D32] h-1.5 rounded-full" style={{ width: `${compliancePercentage}%` }}></div>
                    </div>
                  </div>

                  {/* KPI 2: Crítico */}
                  <div className="bg-white rounded-2xl border border-[#CFD8DC] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] hover:shadow-md transition-shadow">
                    <div className="absolute top-4 right-4 text-3xl">⚠️</div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold font-['Hanken_Grotesk']">Alertas Críticos / Vencidos</p>
                      <h3 className="font-[#121c21] font-bold font-['Hanken_Grotesk'] text-4xl mt-1 text-[#D32F2F]">{totalVencidos}</h3>
                    </div>
                    <p className="text-[10px] text-rose-600 font-mono mt-2 flex items-center gap-1">🛑 Requer manutenção imediata</p>
                  </div>

                  {/* KPI 3: Pendências */}
                  <div className="bg-white rounded-2xl border border-[#CFD8DC] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] hover:shadow-md transition-shadow">
                    <div className="absolute top-4 right-4 text-3xl">🔧</div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold font-['Hanken_Grotesk']">Atenção / Manutenção</p>
                      <h3 className="font-[#121c21] font-bold font-['Hanken_Grotesk'] text-4xl mt-1 text-[#F57C00]">{totalAtencao}</h3>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-2">🛠️ Em análise periódica</p>
                  </div>

                  {/* KPI 4: Total Ativos */}
                  <div className="bg-white rounded-2xl border border-[#CFD8DC] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] hover:shadow-md transition-shadow">
                    <div className="absolute top-4 right-4 text-3xl">📋</div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold font-['Hanken_Grotesk']">Total Ativos Monitorados</p>
                      <h3 className="font-[#121c21] font-bold font-['Hanken_Grotesk'] text-4xl mt-1">{totalAssets}</h3>
                    </div>
                    <p className="text-[10px] text-[#2E7D32] font-mono mt-2">🌱 Ativos homologados corporativos</p>
                  </div>

                </div>

                {/* Dashboard Middle Section: Recent compliance alert list & QR mobile link */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column (8 cols): Recent activities and warning logs */}
                  <div className="lg:col-span-8 bg-white border border-[#CFD8DC] rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                      <h3 className="font-['Hanken_Grotesk'] font-bold text-lg text-[#37474F]">📋 Registros de Inspeção Recentes</h3>
                      <button onClick={() => { setActiveTab('field-ronda'); }} className="text-[#af101a] text-xs font-bold hover:underline">Iniciar Nova Inspeção</button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-[#CFD8DC]">
                            <th className="p-3 font-semibold text-slate-600">Ativo</th>
                            <th className="p-3 font-semibold text-slate-600">Modelagem</th>
                            <th className="p-3 font-semibold text-slate-600">Laudo / Notas</th>
                            <th className="p-3 font-semibold text-slate-600">Data</th>
                            <th className="p-3 font-semibold text-slate-600">Status</th>
                            <th className="p-3 font-semibold text-slate-600 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {complianceLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400">Nenhum registro de ronda efetuado nesta sessão. Use a aba &apos;Extensão Ronda Campo&apos; para preencher relatórios.</td>
                            </tr>
                          ) : (
                            complianceLogs.map((log, index) => (
                              <tr key={index} className="border-b transition-colors hover:bg-slate-50">
                                <td className="p-3 font-bold text-[#af101a] font-mono">{log.assetId}</td>
                                <td className="p-3 text-slate-800">{log.model}</td>
                                <td className="p-3 text-slate-500 italic">{log.notes}</td>
                                <td className="p-3 text-slate-600 font-mono">{log.date} {log.time}</td>
                                <td className="p-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'Conforme' || log.status === 'Operacional' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'}`}>
                                    {log.status === 'Conforme' || log.status === 'Operacional' ? '🟢 OK' : '🛑 FALHA'}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <button 
                                    onClick={() => {
                                      const code = log.assetId;
                                      const ext = extintores.find(x => x.idAtivo === code || x.id === code);
                                      const hid = hidrantes.find(x => x.idAtivo === code || x.id === code);
                                      const sin = sinalizacoes.find(x => x.idAtivo === code || x.id === code);
                                      const lum = iluminacoes.find(x => x.idAtivo === code || x.id === code);
                                      const asset = ext ? { ...ext, type: 'extintor' } : hid ? { ...hid, type: 'hidrante' } : sin ? { ...sin, type: 'sinalizacao' } : lum ? { ...lum, type: 'iluminacao' } : null;
                                      
                                      if (asset) {
                                        setSelectedAssetForHistory(asset);
                                      } else {
                                        setSelectedAssetForHistory({ 
                                          id: code, 
                                          idAtivo: code, 
                                          model: log.model, 
                                          location: 'Indefinido', 
                                          subLocation: 'Log do Sistema', 
                                          status: log.status 
                                        });
                                      }
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold bg-slate-150 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg font-['Hanken_Grotesk'] uppercase tracking-wider transition-all inline-flex items-center gap-1"
                                  >
                                    📜 Linha Tempo
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column (4 cols): Mobile Quick Form extension App Link */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* QR Code access mock banner */}
                    <div className="bg-gradient-to-tr from-[#253238] to-[#121c21] text-white p-6 rounded-2xl border border-[#CFD8DC]/20 shadow-xl relative overflow-hidden flex flex-col justify-between h-full">
                      <div>
                        <div className="flex gap-2 mb-2 items-center">
                          <span className="bg-[#af101a] text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">Extensão Campo</span>
                          <span className="text-xs">📱 Link Rápido</span>
                        </div>
                        <h3 className="font-['Hanken_Grotesk'] font-bold text-lg text-white">QR Ronda de Campo</h3>
                        <p className="text-xs text-slate-300 mt-2">Aponte a câmera para preencher vistorias com fotos offline sem precisar de login.</p>
                      </div>

                      {/* Actual visual of QR code matching templates */}
                      <div className="flex justify-center p-3 my-4 bg-white rounded-xl max-w-[140px] mx-auto shadow-inner">
                        <img 
                          alt="QR Code" 
                          className="w-24 h-24 object-contain" 
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuChunGAHk9pvFbsr9R1GUXV6-G8RlmFxtXaB5KkNtq0Skw7zd33kyNQvypuazU3gJ7hxpKT1wVISDslWhYmIIuTKPsb_mq5ih-wZQn4TpOrgXZcFYnpu8hGoOhe5iEjRKMKcKFQFWEagnux7u9CooSVBzml9IEtghb2mu52hgaFfvwy1xkV0nDPuZ62EkZhPV75Xr-7YN04mgCeu0zwUDtRxtpPNnsfruqxGZcdMQK-MNfjwJ7Pn50BBbgmY-xs95DyeMQuAvJFMnY" 
                        />
                      </div>

                      <div className="space-y-2">
                        <button 
                          onClick={() => {
                            setActiveTab('field-ronda');
                            triggerSuccessNotification('Ronda de Campo Ativada', 'Você está navegando no modo móvel de formulário de campo.');
                          }}
                          className="w-full bg-[#af101a] hover:bg-red-700 text-white font-['Hanken_Grotesk'] font-bold text-xs py-2.5 px-3 rounded-lg text-center tracking-widest uppercase transition-all shadow-md"
                        >
                          Ir Para Ronda Campo
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {/* --- EXTINTORES INVENTORY SCREEN --- */}
            {activeTab === 'extintores' && !selectedAssetForInspection && !showAddForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="font-['Hanken_Grotesk'] font-bold text-2xl text-slate-800">🧯 Inventário de Extintores</h2>
                    <p className="text-slate-500 text-xs">Visão integrada das validades e classes de extintores</p>
                  </div>
                  <button onClick={() => { setShowAddForm(true); setNewAssetType('extintor'); }} className="bg-[#af101a] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-[#af101a]">
                    ➕ Novo Extintor
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {extintores.map((asset) => (
                    <div key={asset.id} className="bg-white rounded-2xl border border-[#CFD8DC] shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-lg transition-shadow group">
                      <div className={`absolute top-0 left-0 bottom-0 w-2 ${asset.status === 'Conforme' ? 'bg-[#2E7D32]' : asset.status === 'Vencido' ? 'bg-[#D32F2F]' : 'bg-[#F57C00]'}`}></div>
                      
                      <div className="p-5 pl-7">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="font-mono text-slate-400 text-xs">PATRIMÔNIO: {asset.idAtivo}</span>
                            <h3 className="font-['Hanken_Grotesk'] font-bold text-slate-800 text-base">{asset.model}</h3>
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${asset.status === 'Conforme' ? 'text-green-800 bg-green-100' : asset.status === 'Vencido' ? 'text-red-800 bg-red-100' : 'text-amber-800 bg-amber-100'}`}>
                            {asset.status}
                          </span>
                        </div>

                        <div className="space-y-1 bg-slate-50 p-3 rounded-lg border text-xs text-slate-600">
                          <p>📍 <strong>Local:</strong> {asset.location} - {asset.subLocation}</p>
                          <p>🔍 <strong>Selo:</strong> {asset.seloInmetro}</p>
                          <p>📌 <strong>Chassi:</strong> {asset.chassi} | peso: {asset.peso}kg</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 text-center border-t border-slate-100 pt-3 text-[10px]">
                          <div>
                            <p className="text-slate-400">Última Recarga</p>
                            <p className="font-semibold text-slate-700 font-mono">{asset.lastRecarga}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Validade</p>
                            <p className={`font-semibold font-mono ${asset.status === 'Vencido' ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{asset.validadeRecarga}</p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex justify-between gap-2 overflow-x-auto shrink-0">
                        <button onClick={() => { setSelectedAssetForInspection(asset); }} className="flex-1 text-center bg-[#2E7D32] text-white text-xs font-bold uppercase py-2 tracking-wider rounded-lg hover:bg-green-700">📋 Inspecionar</button>
                        <button onClick={() => { setSelectedAssetForHistory({ ...asset, type: 'extintor' }); }} className="border border-slate-200 hover:bg-slate-100 text-slate-750 font-bold px-2 py-1 rounded-lg text-[10px] uppercase flex items-center gap-1 shrink-0" title="Ver Histórico NBR">📜 Histórico</button>
                        <button onClick={() => handleOpenAlertCenter(asset)} className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-slate-200" title="Alerta Corporativo">🔔</button>
                        <button onClick={() => {
                          const conf = confirm(`Remover ativo ${asset.idAtivo}?`);
                          if (conf) {
                            const updated = extintores.filter(x => x.id !== asset.id);
                            setExtintores(updated);
                            saveToStorage('spci_extintores', updated);
                          }
                        }} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100" title="Excluir">❌</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* --- HIDRANTES INVENTORY SCREEN --- */}
            {activeTab === 'hidrantes' && !selectedAssetForInspection && !showAddForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="font-['Hanken_Grotesk'] font-bold text-2xl text-slate-800">💧 Hidrantes & Abrigos</h2>
                    <p className="text-slate-500 text-xs">Acompanhamento de mangueiras (NBR 12779) e chaves Storz</p>
                  </div>
                  <button onClick={() => { setShowAddForm(true); setNewAssetType('hidrante'); }} className="bg-[#af101a] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-[#af101a]">
                    ➕ Novo Hidrante
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hidrantes.map((asset) => (
                    <div key={asset.id} className="bg-white rounded-2xl border border-[#CFD8DC] shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-lg transition-shadow group">
                      <div className={`absolute top-0 left-0 bottom-0 w-2 ${asset.status === 'Conforme' ? 'bg-[#2E7D32]' : asset.status === 'Vencido' ? 'bg-[#D32F2F]' : 'bg-[#F57C00]'}`}></div>
                      
                      <div className="p-5 pl-7">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="font-mono text-slate-400 text-xs">HD: {asset.idAtivo}</span>
                            <h3 className="font-['Hanken_Grotesk'] font-bold text-slate-800 text-base">Abrigo + Acessórios</h3>
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${asset.status === 'Conforme' ? 'text-green-800 bg-green-100' : asset.status === 'Vencido' ? 'text-red-800 bg-red-100' : 'text-amber-800 bg-amber-100'}`}>
                            {asset.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border">
                          <p>📍 <strong>Local:</strong> {asset.location} - {asset.subLocation}</p>
                          <p>📦 <strong>Componentes:</strong> {asset.components.join(', ')}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center border-t border-slate-100 pt-3 text-[10px]">
                          <div>
                            <p className="text-slate-400 font-['Hanken_Grotesk'] uppercase font-extrabold pb-0.5">Último Teste</p>
                            <p className="font-semibold text-slate-700 font-mono">{asset.lastInsp}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-['Hanken_Grotesk'] uppercase font-extrabold pb-0.5">Próximo Teste</p>
                            <p className={`font-semibold font-mono ${asset.status === 'Vencido' ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{asset.nextInsp}</p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex justify-between gap-2 overflow-x-auto shrink-0">
                        <button onClick={() => { setSelectedAssetForInspection(asset); }} className="flex-1 text-center bg-[#2E7D32] text-white text-xs font-bold uppercase py-2 tracking-wider rounded-lg hover:bg-green-700">📋 Inspecionar</button>
                        <button onClick={() => { setSelectedAssetForHistory({ ...asset, type: 'hidrante' }); }} className="border border-slate-200 hover:bg-slate-100 text-slate-750 font-bold px-2 py-1 rounded-lg text-[10px] uppercase flex items-center gap-1 shrink-0" title="Ver Histórico NBR">📜 Histórico</button>
                        <button onClick={() => handleOpenAlertCenter(asset)} className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-slate-200" title="Alerta Corporativo">🔔</button>
                        <button onClick={() => {
                          const conf = confirm(`Remover hidrante ${asset.idAtivo}?`);
                          if (conf) {
                            const updated = hidrantes.filter(x => x.id !== asset.id);
                            setHidrantes(updated);
                            saveToStorage('spci_hidrantes', updated);
                          }
                        }} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100">❌</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* --- SINALIZAÇÃO NBR SCREEN --- */}
            {activeTab === 'sinalizacao' && !selectedAssetForInspection && !showAddForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="font-['Hanken_Grotesk'] font-bold text-2xl text-slate-800">⚠️ Inventário de Sinalização NBR 13434</h2>
                    <p className="text-slate-500 text-xs">Controle de fotoluminescentes e placas de rotas de fuga</p>
                  </div>
                  <button onClick={() => { setShowAddForm(true); setNewAssetType('sinalizacao'); }} className="bg-[#af101a] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-[#af101a]">
                    ➕ Nova Placa
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sinalizacoes.map((asset) => (
                    <div key={asset.id} className="bg-white rounded-2xl border border-[#CFD8DC] shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-lg transition-shadow group">
                      <div className={`absolute top-0 left-0 bottom-0 w-2 ${asset.status === 'Conforme' ? 'bg-[#2E7D32]' : 'bg-[#D32F2F]'}`}></div>
                      
                      <div className="p-5 pl-7">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="font-mono text-slate-400 text-xs">SIN: {asset.idAtivo}</span>
                            <h3 className="font-['Hanken_Grotesk'] font-bold text-slate-800 text-base">{asset.model}</h3>
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${asset.status === 'Conforme' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'}`}>
                            {asset.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border">
                          <p>📍 <strong>Local:</strong> {asset.location} | Sub-Local: {asset.subLocation}</p>
                          <p>🔖 <strong>Tipo de Placa:</strong> {asset.group}</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex justify-between gap-2 overflow-x-auto shrink-0 font-['Hanken_Grotesk'] font-bold uppercase">
                        <button onClick={() => { setSelectedAssetForInspection(asset); }} className="flex-1 text-center bg-[#2E7D32] text-white text-xs py-2 tracking-wider rounded-lg hover:bg-green-700">📋 Inspecionar</button>
                        <button onClick={() => { setSelectedAssetForHistory({ ...asset, type: 'sinalizacao' }); }} className="border border-slate-200 hover:bg-slate-100 text-slate-750 font-bold px-2 py-1 rounded-lg text-[10px] uppercase flex items-center gap-1 shrink-0" title="Ver Histórico NBR">📜 Histórico</button>
                        <button onClick={() => handleOpenAlertCenter(asset)} className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-slate-200" title="Alerta Corporativo">🔔</button>
                        <button onClick={() => {
                          const conf = confirm(`Remover placa ${asset.idAtivo}?`);
                          if (conf) {
                            const updated = sinalizacoes.filter(x => x.id !== asset.id);
                            setSinalizacoes(updated);
                            saveToStorage('spci_sinalizacoes', updated);
                          }
                        }} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100">❌</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* --- ILUMINAÇÃO DE EMERGÊNCIA SCREEN --- */}
            {activeTab === 'iluminacao' && !selectedAssetForInspection && !showAddForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="font-['Hanken_Grotesk'] font-bold text-2xl text-slate-800">💡 Iluminação de Emergência</h2>
                    <p className="text-slate-500 text-xs">Registro de baterias, testes de centrais e motogeradores</p>
                  </div>
                  <button onClick={() => { setShowAddForm(true); setNewAssetType('iluminacao'); }} className="bg-[#af101a] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-[#af101a]">
                    ➕ Nova Luminária
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  {/* Battery sub indicators */}
                  {[
                    { title: 'Normais', count: iluminacoes.filter(x => x.status === 'Operacional').length, color: 'border-l-green-600', emoji: '🔋' },
                    { title: 'Atenção Bateria', count: iluminacoes.filter(x => x.status === 'Atenção').length, color: 'border-l-amber-500', emoji: '⚠️' },
                    { title: 'Falha de Carga', count: iluminacoes.filter(x => x.status === 'Falha Carga').length, color: 'border-l-red-600', emoji: '🛑' },
                    { title: 'Baterias Totais', count: iluminacoes.length, color: 'border-l-slate-700', emoji: '💡' }
                  ].map((sub, i) => (
                    <div key={i} className={`bg-white border border-[#CFD8DC] rounded-xl p-4 shadow-sm border-l-4 ${sub.color} flex justify-between items-center`}>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">{sub.title}</p>
                        <p className="text-xl font-bold font-mono text-slate-800 mt-1">{sub.count}</p>
                      </div>
                      <span className="text-xl">{sub.emoji}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {iluminacoes.map((asset) => (
                    <div key={asset.id} className="bg-white rounded-2xl border border-[#CFD8DC] shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-lg transition-shadow group">
                      <div className={`absolute top-0 left-0 bottom-0 w-2 ${asset.status === 'Operacional' ? 'bg-[#2E7D32]' : asset.status === 'Falha Carga' ? 'bg-[#D32F2F]' : 'bg-[#F57C00]'}`}></div>
                      
                      <div className="p-5 pl-7">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="font-mono text-slate-400 text-xs">LUM: {asset.idAtivo}</span>
                            <h3 className="font-['Hanken_Grotesk'] font-bold text-slate-800 text-base">{asset.model}</h3>
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${asset.status === 'Operacional' ? 'text-green-800 bg-green-100' : 'text-amber-800 bg-amber-100'}`}>
                            {asset.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border">
                          <p>📍 <strong>Local:</strong> {asset.location} - {asset.subLocation}</p>
                          <p>⚡ <strong>Sistema:</strong> {asset.systemType}</p>
                        </div>

                        <div className="flex justify-between text-[11px] font-mono border-t pt-3">
                          <span>🔋 Carga: <strong className="text-slate-800">{asset.battery}</strong></span>
                          <span>⏲️ Autonomia: <strong className="text-slate-800">{asset.autonomy}</strong></span>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex justify-between gap-1 overflow-x-auto shrink-0">
                        <button onClick={() => { setSelectedAssetForInspection(asset); }} className="flex-grow text-center bg-[#2E7D32] text-white text-xs font-bold uppercase py-2 tracking-wider rounded-lg hover:bg-green-700">📋 Inspecionar</button>
                        <button onClick={() => { setSelectedAssetForHistory({ ...asset, type: 'iluminacao' }); }} className="border border-slate-200 hover:bg-slate-100 text-slate-750 font-bold px-2 py-1 rounded-lg text-[10px] uppercase flex items-center gap-1 shrink-0" title="Ver Histórico NBR">📜 Histórico</button>
                        <button onClick={() => handleOpenAlertCenter(asset)} className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-slate-200">🔔</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* --- CASA DE BOMBAS SCREEN --- */}
            {activeTab === 'bombas' && !selectedAssetForInspection && !showAddForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="font-['Hanken_Grotesk'] font-bold text-2xl text-slate-800">⚙️ Casa de Bombas Combate a Incêndio</h2>
                    <p className="text-slate-500 text-xs">Pressão da rede principal em tempo real (PSI) e RTI</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (isTestRunning) {
                          setPressure(125);
                        }
                        setIsTestRunning(!isTestRunning);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-sm flex items-center gap-2 ${isTestRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-700 hover:bg-red-800'}`}
                    >
                      <span>🔄</span> {isTestRunning ? 'Parar Teste de Pressão' : 'Iniciar Simulação de Vazão'}
                    </button>
                  </div>
                </div>

                {/* Network Pressure indicator visual widget */}
                <div className="bg-white rounded-3xl border border-[#CFD8DC] p-6 shadow-sm relative overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="absolute top-0 bottom-0 left-0 w-2 bg-[#2E7D32]"></div>
                  
                  <div className="md:col-span-8 space-y-4 pl-4">
                    <h3 className="font-['Hanken_Grotesk'] font-bold text-lg text-slate-800">Pressão Estável da Rede de Hidrantes</h3>
                    <div className="flex h-3 bg-slate-100 rounded-full overflow-hidden border">
                      <div className="bg-[#af101a] h-full" style={{ width: '25%' }}></div>
                      <div className="bg-[#2E7D32] h-full" style={{ width: '50%' }}></div>
                      <div className="bg-amber-500 h-full" style={{ width: '25%' }}></div>
                    </div>
                    <div className="flex justify-between font-mono text-[9px] text-slate-400">
                      <span>0 PSI</span>
                      <span>50 PSI</span>
                      <span>100 PSI (MÍN)</span>
                      <span>120 PSI (IDEAL)</span>
                      <span>160 PSI (MAX)</span>
                    </div>
                  </div>

                  <div className="md:col-span-4 text-center bg-slate-50 border p-4 rounded-2xl relative">
                    <p className="font-mono text-[10px] uppercase text-slate-400 tracking-wider">PSI Atual Estabilizado</p>
                    <p className={`font-['Hanken_Grotesk'] text-5xl font-black transition-all ${pressure < 110 ? 'text-amber-500' : 'text-green-700'}`}>{pressure}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">Garantia NBR regulamente operável</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Jockey & Electric pumps initial items */}
                  {bombas.map((pump, i) => (
                    <div key={pump.id} className="bg-white border rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-lg transition-[#CFD8DC]">
                      <div className={`absolute top-0 bottom-0 left-0 w-2 ${pump.status === 'Operacional' || pump.status === 'Standby' ? 'bg-[#2E7D32]' : 'bg-[#F57C00]'}`}></div>
                      
                      <div className="pl-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-['Hanken_Grotesk'] font-bold text-[#37474F] text-base">{pump.name}</h4>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded capitalize ${pump.status === 'Operacional' ? 'text-green-800 bg-green-100' : 'text-amber-800 bg-amber-100'}`}>{pump.status}</span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 bg-slate-50 border rounded-lg p-2.5">
                          <p>🎛️ <strong>Alimentação:</strong> {pump.power}</p>
                          <p>📌 <strong>Faixa Operada:</strong> {pump.range}</p>
                          <p>🔩 <strong>Partidas:</strong> {pump.starts}</p>
                        </div>
                      </div>

                      <div className="border-t pt-3 mt-4 flex items-center justify-between pl-4">
                        <button onClick={() => triggerSuccessNotification(`Teste manual enviado para ${pump.name}`, `Acionamento remoto NBR do dispositivo efetuado com sucesso.`)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-1.5 text-xs font-bold uppercase rounded-lg">⚡ Acionar Teste</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* --- EXPIRATION ALERTS DISPATCH PANEL --- */}
            {activeTab === 'alerts' && !selectedAssetForInspection && !showAddForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <h2 className="font-['Hanken_Grotesk'] font-bold text-2xl text-slate-800">🔔 Despache de Alertas Periódicos e Relatórios</h2>
                  <p className="text-slate-500 text-xs">Mande relatórios e avisos de equipamentos vencidos imediatamente via WhatsApp, Telegram ou Email</p>
                </div>

                <div className="bg-white border rounded-2xl p-6 shadow-sm max-w-2xl mx-auto space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-rose-600"></div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">Selecione o Canal de Despache</label>
                      <div className="flex gap-2">
                        {['whatsapp', 'telegram', 'email'].map((channel: any) => (
                          <button
                            key={channel}
                            type="button"
                            onClick={() => setAlertFormChannel(channel)}
                            className={`flex-1 py-3 text-xs uppercase font-['Hanken_Grotesk'] font-bold rounded-xl border transition-all ${alertFormChannel === channel ? 'bg-gradient-to-r from-slate-800 to-slate-950 text-white border-slate-900 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
                          >
                            {channel === 'whatsapp' && '💬 WhatsApp'}
                            {channel === 'telegram' && '✈️ Telegram'}
                            {channel === 'email' && '✉️ E-mail'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
                        {alertFormChannel === 'email' ? 'E-mail do Destinatário' : 'Celular (com DDI e DDD)'}
                      </label>
                      <input 
                        type="text" 
                        value={alertTargetContact}
                        onChange={(e) => setAlertTargetContact(e.target.value)}
                        placeholder={alertFormChannel === 'email' ? 'exemplo@empresa.com' : '5511999998888'}
                        className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-xs focus:outline-none focus:border-slate-800 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">Corpo da Mensagem (Texto de Alerta NBR / Relatório)</label>
                      <textarea 
                        value={generatedReportText} 
                        onChange={(e) => setGeneratedReportText(e.target.value)}
                        rows={6}
                        className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-xs focus:outline-none focus:border-slate-800 font-mono"
                      />
                    </div>

                    <button 
                      onClick={dispatchAlertNotification}
                      className="w-full bg-gradient-to-r from-red-700 to-rose-600 text-white font-['Hanken_Grotesk'] font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest hover:opacity-90 shadow-md transition-all transform hover:scale-[1.01]"
                    >
                      🚀 ENVIAR ALERTA DE VENCIMENTO
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- EXTENSION PORTAL - FIELD RONDA APPLICATION --- */}
            {activeTab === 'field-ronda' && !selectedAssetForInspection && !showAddForm && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                
                {/* Immersive Mobile view design layout */}
                <div className="max-w-md mx-auto bg-white border border-[#CFD8DC] rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col h-[640px]">
                  
                  {/* Mobile telephone top speaker design details */}
                  <div className="bg-[#121c21] p-3 text-white text-center text-xs flex justify-between px-6 shrink-0 relative z-10 font-mono">
                    <span className="text-[10px]">✨ SPCI Ronda (Fielcl)</span>
                    <div className="w-20 h-4 bg-black rounded-full mx-auto absolute left-1/2 -translate-x-1/2"></div>
                    <span className="text-[10px] text-green-400">⚡ 100% On</span>
                  </div>

                  {/* Header mimicking mobile style */}
                  <div className="bg-gradient-to-r from-[#af101a] to-[#d32f2f] text-white p-5 shrink-0 select-none text-center">
                    <h3 className="font-['Hanken_Grotesk'] font-black text-xl tracking-wider uppercase font-mono">INSP <span className="bg-green-600 text-white py-0.5 px-2.5 text-xs rounded-full">✓</span> FIELD</h3>
                    <p className="text-[10px] text-rose-100 font-bold mt-1">EXTENSÃO FORMULÁRIO DE INSPEÇÕES DE CAMPO</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
                      <p className="text-xs text-slate-500 font-mono">Toque em qualquer ativo cadastrado abaixo para carregar o checklist de campo instantâneo.</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold pl-1">Selecione Ativo no Campo</p>
                      
                      {/* Grid mapping for fast inspection selection */}
                      {extintores.map(ext => (
                        <button 
                          key={ext.id} 
                          onClick={() => setSelectedAssetForInspection(ext)}
                          className="w-full bg-white p-3 border border-slate-200 rounded-xl hover:border-red-600 transition-colors flex items-center justify-between text-left"
                        >
                          <div>
                            <span className="font-mono text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">{ext.idAtivo}</span>
                            <p className="text-xs font-bold text-slate-800 mt-1">{ext.model}</p>
                            <p className="text-[10px] text-slate-500">{ext.location}</p>
                          </div>
                          <span className={`text-[9px] font-bold uppercase p-1 rounded ${ext.status === 'Conforme' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                            {ext.status}
                          </span>
                        </button>
                      ))}

                      {hidrantes.map(hid => (
                        <button 
                          key={hid.id} 
                          onClick={() => setSelectedAssetForInspection(hid)}
                          className="w-full bg-white p-3 border border-slate-200 rounded-xl hover:border-red-600 transition-colors flex items-center justify-between text-left"
                        >
                          <div>
                            <span className="font-mono text-[9px] bg-[#bee9ff] text-[#005f7b] px-1.5 py-0.5 rounded font-bold uppercase">{hid.idAtivo}</span>
                            <p className="text-xs font-bold text-slate-800 mt-1">Hidrante + Mangueira</p>
                            <p className="text-[10px] text-slate-500">{hid.location}</p>
                          </div>
                          <span className={`text-[9px] font-bold uppercase p-1 rounded ${hid.status === 'Conforme' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                            {hid.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Telephone simulated back button */}
                  <div className="bg-[#121c21] p-3 text-center shrink-0">
                    <button 
                      onClick={() => { setActiveTab('dashboard'); }}
                      className="bg-white/20 hover:bg-white/40 text-white font-['Hanken_Grotesk'] text-[10px] uppercase font-bold py-1.5 px-6 rounded-full"
                    >
                      Voltar Para Principal
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </main>

        {/* --- MOBILE COMPACT NAVIGATION BAR --- */}
        <nav className="md:hidden bg-[#1e293b] text-white flex justify-around items-center h-16 shrink-0 border-t border-slate-800 shadow-2xl relative z-40">
          {[
            { id: 'dashboard', label: 'Início', icon: '📊' },
            { id: 'extintores', label: 'Extintores', icon: '🧯' },
            { id: 'field-ronda', label: 'Ronda', icon: '📱' },
            { id: 'alerts', label: 'Alertas', icon: '🔔' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setSelectedAssetForInspection(null);
                setShowAddForm(false);
              }}
              className={`flex flex-col items-center justify-center p-1 w-16 h-full transition-all ${activeTab === item.id ? 'text-[#ffb3ac] font-bold' : 'text-slate-400'}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[9px] uppercase tracking-wider font-bold mt-1 font-['Hanken_Grotesk']">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* --- PREMIUM COMPLIANCE INTERACTION FLOATING ASSISTANT --- */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
          
          <AnimatePresence>
            {chatOpened && (
              <motion.div 
                initial={{ opacity: 0, y: 15, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className="bg-white rounded-2xl border border-[#CFD8DC] shadow-2xl w-80 max-w-[90vw] md:w-96 flex flex-col h-96 overflow-hidden pointer-events-auto"
              >
                {/* Chat header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-950 text-white p-4 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <div>
                      <h4 className="font-['Hanken_Grotesk'] font-bold text-sm text-white">Inspe IA Assistente SPCI</h4>
                      <p className="text-[10px] text-[#7bd1f8] font-mono">Pronto para gerar relatórios e laudos</p>
                    </div>
                  </div>
                  <button onClick={() => setChatOpened(false)} className="text-white hover:text-red-400 font-bold">×</button>
                </div>

                {/* Messages stream */}
                <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50 custom-scrollbar text-xs">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`p-3 rounded-2xl max-w-[85%] ${m.sender === 'user' ? 'bg-gradient-to-r from-red-700 to-rose-600 text-white ml-auto rounded-tr-none' : 'bg-white text-slate-800 mr-auto rounded-tl-none border'}`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    </div>
                  ))}
                  {aiGenerating && (
                    <div className="bg-white text-slate-600 mr-auto rounded-2xl p-3 border animate-pulse text-[11px]">
                      ✍️ Analisando ativos SPCI compliancy...
                    </div>
                  )}
                </div>

                {/* Input block */}
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                  <input 
                    type="text" 
                    value={userPrompt} 
                    onChange={(e) => setUserPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAssistantSend(); }}
                    placeholder="Pergunte sobre NBR ou escreva 'Gerar Alerta Extintor'..." 
                    className="flex-grow bg-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none border border-transparent focus:border-[#CFD8DC]" 
                  />
                  <button onClick={handleAssistantSend} className="bg-rose-700 text-white px-3 py-2 rounded-xl text-xs font-bold">Enviar</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Large trigger button */}
          <button 
            type="button"
            onClick={() => setChatOpened(!chatOpened)}
            className="w-14 h-14 bg-slate-900 border-4 border-white hover:bg-slate-800 text-white rounded-full shadow-2xl flex flex-col items-center justify-center relative cursor-pointer pointer-events-auto tracking-tighter"
          >
            <span className="text-xl">🤖</span>
            <span className="text-[7px] font-extrabold uppercase leading-none font-['Hanken_Grotesk'] text-[#7bd1f8]">INSPE IA</span>
          </button>
        </div>

        {/* --- PREMIUM SIMULATION BACKDROP SCAN POPUP --- */}
        <AnimatePresence>
          {scanModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl border border-slate-300 p-6 shadow-2xl max-w-sm w-full relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-red-600"></div>
                
                <h3 className="font-['Hanken_Grotesk'] font-bold text-lg text-slate-800 mb-2">Simulador de Códigos de Campo QR</h3>
                <p className="text-xs text-slate-500 mb-4">Insira o código do Ativo impresso na etiqueta SPCI para carregar vistorias.</p>
                
                <input 
                  type="text" 
                  value={scanCode} 
                  onChange={(e) => setScanCode(e.target.value)}
                  placeholder="Ex: PAT-E-101 ou LUM-044" 
                  className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-sm focus:outline-none mb-4 font-mono font-bold text-center text-slate-700"
                />

                <div className="flex gap-2">
                  <button onClick={() => setScanModal(false)} className="flex-1 py-2 text-xs uppercase font-bold text-slate-500 border rounded-lg">Cancelar</button>
                  <button onClick={handleSimulateQuickScan} className="flex-1 py-2 text-xs uppercase font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-sm">Buscar Ativo</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- PREMIUM INFORMATIONAL CORRECTION POPUP ALERT CENTER --- */}
        <AnimatePresence>
          {premiumAlert && premiumAlert.show && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} className="bg-white rounded-3xl border border-slate-300 p-6 shadow-2xl max-w-lg w-full relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${premiumAlert.type === 'success' ? 'bg-[#2E7D32]' : premiumAlert.type === 'critical' ? 'bg-[#af101a]' : 'bg-[#F57C00]'}`}></div>
                
                <div className="flex gap-3 items-start mb-4">
                  <span className="text-3xl">
                    {premiumAlert.type === 'success' ? '🟢' : premiumAlert.type === 'critical' ? '🚨' : '⚠️'}
                  </span>
                  <div>
                    <h3 className="font-['Hanken_Grotesk'] font-bold text-lg text-slate-800">{premiumAlert.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{premiumAlert.message}</p>
                  </div>
                </div>

                {/* If dispatching alert data */}
                {premiumAlert.dispatchData && (
                  <div className="space-y-4 pt-2 border-t mt-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Selecione o Canal de Avisos</label>
                      <div className="flex gap-2">
                        {['whatsapp', 'telegram', 'email'].map((channel: any) => (
                          <button
                            key={channel}
                            type="button"
                            onClick={() => setAlertFormChannel(channel)}
                            className={`flex-grow py-2 text-[10px] uppercase font-bold rounded-lg border text-center transition-all ${alertFormChannel === channel ? 'bg-slate-900 border-slate-950 text-white' : 'bg-slate-50 text-slate-700'}`}
                          >
                            {channel === 'whatsapp' && '💬 WhatsApp'}
                            {channel === 'telegram' && '✈️ Telegram'}
                            {channel === 'email' && '✉️ Email'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Contato de Destino</label>
                      <input 
                        type="text" 
                        value={alertTargetContact}
                        onChange={(e) => setAlertTargetContact(e.target.value)}
                        placeholder={alertFormChannel === 'email' ? 'e-mail do gestor' : 'Nº de telefone com DDI (Ex: 5511999998888)'}
                        className="w-full bg-slate-50 border rounded-lg p-2.5 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Preview do Alerta Despachado</label>
                      <textarea 
                        value={generatedReportText}
                        onChange={(e) => setGeneratedReportText(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-50 border rounded-lg p-2.5 text-[10px] font-mono leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-6 justify-end border-t pt-4">
                  <button onClick={() => setPremiumAlert(null)} className="px-4 py-2 text-xs uppercase font-bold text-slate-500 hover:bg-slate-50 rounded-lg">Entendido</button>
                  {premiumAlert.dispatchData && (
                    <button onClick={dispatchAlertNotification} className="px-5 py-2 text-xs uppercase font-bold text-white bg-gradient-to-r from-red-700 to-rose-600 hover:opacity-90 rounded-lg shadow-sm">Confirmar Envio</button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- PREMIUM INTERACTIVE LAUDO HISTORY & COMPLIANCE TIMELINE MODAL --- */}
        <AnimatePresence>
          {selectedAssetForHistory && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-55 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 10 }} 
                className="bg-white rounded-3xl border border-slate-300 shadow-2xl max-w-2xl w-full relative overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Premium Header Gradient */}
                <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-950 text-white p-6 shrink-0 relative">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedAssetForHistory(null);
                        setShowAddCustomHistory(false);
                      }} 
                      className="bg-white/10 hover:bg-white/20 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border-none outline-none"
                      title="Fechar"
                    >
                      ❌
                    </button>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shadow-inner backdrop-blur-sm">
                      {selectedAssetForHistory.type === 'extintor' && '🧯'}
                      {selectedAssetForHistory.type === 'hidrante' && '💧'}
                      {selectedAssetForHistory.type === 'sinalizacao' && '⚠️'}
                      {selectedAssetForHistory.type === 'iluminacao' && '💡'}
                      {!selectedAssetForHistory.type && '⚙️'}
                    </div>
                    <div>
                      <span className="text-[10px] bg-red-800 tracking-widest text-[#FFCDD2] uppercase font-bold px-2 py-0.5 rounded-full font-mono">
                        {selectedAssetForHistory.type || 'Equipamento'} • {selectedAssetForHistory.idAtivo || selectedAssetForHistory.id}
                      </span>
                      <h3 className="font-['Hanken_Grotesk'] font-black text-xl leading-snug mt-1 text-white">
                        {selectedAssetForHistory.model || 'Abrigo Hidrante Completo'}
                      </h3>
                      <p className="text-slate-300 text-xs mt-0.5">
                        📍 {selectedAssetForHistory.location} — {selectedAssetForHistory.subLocation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Main scrollable body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6 custom-scrollbar">
                  
                  {/* Premium Bento Stats Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold pb-1 border-b">Status de Operação</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`w-3 h-3 rounded-full animate-pulse ${selectedAssetForHistory.status === 'Conforme' || selectedAssetForHistory.status === 'Operacional' || selectedAssetForHistory.status === 'Cadastro Ativo' || selectedAssetForHistory.status === 'Standby' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        <p className="font-bold text-sm text-slate-800 uppercase">{selectedAssetForHistory.status}</p>
                      </div>
                    </div>

                    <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold pb-1 border-b">Total de Ocorrências</span>
                      <p className="font-['Hanken_Grotesk'] text-xl font-bold text-slate-800 mt-2">
                        {getAssetTimeline(selectedAssetForHistory).length} Registros
                      </p>
                    </div>

                    <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold pb-1 border-b">Taxa de Conformidade</span>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xl font-bold font-mono text-green-700">
                          {(() => {
                            const events = getAssetTimeline(selectedAssetForHistory);
                            const conforming = events.filter(e => e.status === 'Conforme' || e.status === 'Operacional' || e.status === 'Cadastro Ativo' || e.status === 'Standby').length;
                            return events.length > 0 ? Math.round((conforming / events.length) * 100) : 100;
                          })()}%
                        </p>
                        <span className="text-xs text-slate-500 font-mono">NBR Conformidade</span>
                      </div>
                    </div>
                  </div>

                  {/* Add Custom Record Toggle Form */}
                  <div className="bg-white border border-[#CFD8DC] rounded-2xl shadow-sm p-4 overflow-hidden">
                    {!showAddCustomHistory ? (
                      <button 
                        type="button"
                        onClick={() => setShowAddCustomHistory(true)}
                        className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>➕ Adicionar Registro Manual ao Histórico</span>
                      </button>
                    ) : (
                      <form onSubmit={handleAddCustomHistoryEvent} className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b">
                          <h4 className="text-xs font-extrabold uppercase text-slate-700">Novo Registro Administrativo</h4>
                          <button 
                            type="button" 
                            onClick={() => setShowAddCustomHistory(false)} 
                            className="text-xs text-rose-600 font-bold uppercase"
                          >
                            Fechar
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Título do Evento</label>
                            <select 
                              value={customEventTitle} 
                              onChange={(e) => setCustomEventTitle(e.target.value)}
                              className="w-full bg-slate-50 border rounded-lg p-2 text-xs focus:outline-none"
                            >
                              <option value="Recarga Manual NBR">🧯 Recarga Periódica Inmetro</option>
                              <option value="Teste Hidrostático Concluído">🔄 Teste Hidrostático de Cilindro</option>
                              <option value="Substituição Efetuada">🔄 Substituição Total do Equipamento</option>
                              <option value="Não Conformidade Reportada">⚠️ Não Conformidade Identificada</option>
                              <option value="Vistoria Terceirizada">📋 Certificação Independente ABNT</option>
                              <option value="Manutenção de Mangueira">💧 Reparo/Secagem de Mangueira</option>
                              <option value="Ajuste de Altura / Placa de Fuga">📍 Ajuste de Altura/Sinalização</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Resultado da Conformidade</label>
                            <select 
                              value={customEventStatus} 
                              onChange={(e) => setCustomEventStatus(e.target.value)}
                              className="w-full bg-slate-50 border rounded-lg p-2 text-xs focus:outline-none"
                            >
                              <option value="Conforme">🟢 Conforme / Operacional</option>
                              <option value="Vencido">🔴 Vencido / Fora da Validade</option>
                              <option value="Não Conforme">🔴 Não Conforme com a NBR</option>
                              <option value="Em Manutenção">🟡 Em Manutenção Ativa</option>
                              <option value="Faltante">⚫ Faltante / Não Localizado</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Notas / Detalhamento Administrativo</label>
                          <textarea 
                            value={customEventNotes}
                            onChange={(e) => setCustomEventNotes(e.target.value)}
                            rows={3}
                            placeholder="Anote detalhes específicos, números de ordens de serviço, lacres novos ou motivos da mudança..."
                            className="w-full bg-slate-50 border rounded-lg p-2 text-xs focus:outline-none font-sans"
                            required
                          />
                        </div>

                        <button 
                          type="submit" 
                          className="w-full py-2 bg-gradient-to-r from-green-700 to-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-95 transition-all shadow-md cursor-pointer"
                        >
                          Salvar Evento e Consolidar Linha do Tempo 🚀
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-2 border-b pb-2">
                    <button 
                      type="button"
                      onClick={() => setHistoryFilter('all')} 
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${historyFilter === 'all' ? 'bg-[#af101a] text-white' : 'bg-white border text-slate-600'}`}
                    >
                      Todos ({getAssetTimeline(selectedAssetForHistory).length})
                    </button>
                    <button 
                      type="button"
                      onClick={() => setHistoryFilter('non_conforming')} 
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${historyFilter === 'non_conforming' ? 'bg-red-100 text-red-700 font-bold border border-red-200' : 'bg-white border text-slate-600'}`}
                    >
                      Não Conformidades ({getAssetTimeline(selectedAssetForHistory).filter((e: any) => e.status !== 'Conforme' && e.status !== 'Operacional' && e.status !== 'Cadastro Ativo' && e.status !== 'Standby').length})
                    </button>
                    <button 
                      type="button"
                      onClick={() => setHistoryFilter('manual')} 
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${historyFilter === 'manual' ? 'bg-slate-100 text-slate-800' : 'bg-white border text-slate-600'}`}
                    >
                      Registros Manuais ({getAssetTimeline(selectedAssetForHistory).filter((e: any) => e.type === 'manual').length})
                    </button>
                  </div>

                  {/* Actual Timeline Tree */}
                  <div className="relative border-l-2 border-slate-200 pl-6 ml-4 space-y-6">
                    {getAssetTimeline(selectedAssetForHistory)
                      .filter((event: any) => {
                        if (historyFilter === 'non_conforming') {
                          return event.status !== 'Conforme' && event.status !== 'Operacional' && event.status !== 'Cadastro Ativo' && event.status !== 'Standby';
                        }
                        if (historyFilter === 'manual') {
                          return event.type === 'manual';
                        }
                        return true;
                      })
                      .map((event: any, index: number) => (
                        <div key={event.id || index} className="relative group">
                          {/* Circle indicator */}
                          <div className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md border ${
                            event.status === 'Conforme' || event.status === 'Operacional' || event.status === 'Cadastro Ativo' || event.status === 'Standby'
                              ? 'bg-green-100 border-green-300 text-green-700' 
                              : event.status === 'Em Manutenção' || event.status === 'Atenção'
                              ? 'bg-amber-100 border-amber-300 text-amber-700' 
                              : 'bg-red-100 border-red-300 text-red-700'
                          }`}>
                            {event.icon || '📝'}
                          </div>

                          {/* Event card inside the timeline */}
                          <div className="bg-white rounded-2xl border border-slate-200 p-4 transition-all hover:shadow-md hover:scale-[1.01]">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-bold">
                                📅 {event.date} • {event.time || '08:00:00'}
                              </span>
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                event.status === 'Conforme' || event.status === 'Operacional' || event.status === 'Cadastro Ativo' || event.status === 'Standby'
                                  ? 'text-green-800 bg-green-50' 
                                  : event.status === 'Em Manutenção' || event.status === 'Atenção'
                                  ? 'text-amber-800 bg-amber-50' 
                                  : 'text-red-800 bg-red-50'
                              }`}>
                                {event.status}
                              </span>
                            </div>

                            <h4 className="font-['Hanken_Grotesk'] font-bold text-slate-800 text-sm mt-2">
                              {event.title}
                            </h4>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                              {event.description}
                            </p>

                            <div className="mt-3 flex justify-between items-center border-t pt-2 text-[10px] text-slate-400">
                              <span>👤 Responsável: <strong>{event.author || 'Técnico Credenciado'}</strong></span>
                              <span className="font-mono text-slate-350 select-none">#SPCI-{event.id?.slice(-4) || 'AUTO'}</span>
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Fallback empty view */}
                    {getAssetTimeline(selectedAssetForHistory).filter((event: any) => {
                        if (historyFilter === 'non_conforming') {
                          return event.status !== 'Conforme' && event.status !== 'Operacional' && event.status !== 'Cadastro Ativo' && event.status !== 'Standby';
                        }
                        if (historyFilter === 'manual') {
                          return event.type === 'manual';
                        }
                        return true;
                      }).length === 0 && (
                        <div className="p-8 text-center bg-white border border-dashed rounded-2xl text-slate-400 text-xs">
                          <p>📜 Nenhum evento encontrado para este filtro.</p>
                        </div>
                      )}
                  </div>

                </div>

                {/* Footer action */}
                <div className="p-4 bg-slate-100 border-t shrink-0 flex justify-end">
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedAssetForHistory(null);
                      setShowAddCustomHistory(false);
                    }} 
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-['Hanken_Grotesk'] font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Fechar Histórico
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
