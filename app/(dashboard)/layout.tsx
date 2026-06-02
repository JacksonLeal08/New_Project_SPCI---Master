'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '../context/SpciContext';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { getUserProfile } from '@/lib/supabaseDb';
import { idb } from '@/lib/indexedDb';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    currentUser,
    userProfile,
    gToken,
    authChecking,
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
    premiumAlert,
    setPremiumAlert,
    handleUpdateLogoAndProfile,
    handleGoogleLogout
  } = useSpci();

  // --- LOCAL FORM STATES ---
  const [formLocal, setFormLocal] = useState('MANGANÊS');
  const [formSubLocal, setFormSubLocal] = useState('BARRAGEM DO AZUL');
  const [formPatrimonio, setFormPatrimonio] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSelo, setFormSelo] = useState('');
  const [formChassi, setFormChassi] = useState('');
  const [formWeight, setFormWeight] = useState('6');
  const [formSystemType, setFormSystemType] = useState('CONJUNTO DE BLOCO AUTÔNOMO');
  const [multiSelectModels, setMultiSelectModels] = useState<string[]>([]);

  // --- LOCAL INSPECTION MODAL STATES ---
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [photoPatrimonio, setPhotoPatrimonio] = useState<string | null>(null);
  const [photoFrontal, setPhotoFrontal] = useState<string | null>(null);

  // --- LOCAL HISTORY MODAL STATES ---
  const [showAddCustomHistory, setShowAddCustomHistory] = useState(false);
  const [customEventTitle, setCustomEventTitle] = useState('Recarga Manual NBR');
  const [customEventStatus, setCustomEventStatus] = useState('Conforme');
  const [customEventNotes, setCustomEventNotes] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'non_conforming' | 'manual'>('all');

  // --- LOCAL ALERT CENTER STATES ---
  const [alertFormChannel, setAlertFormChannel] = useState<'whatsapp' | 'telegram' | 'email'>('whatsapp');
  const [alertTargetContact, setAlertTargetContact] = useState('');
  const [generatedReportText, setGeneratedReportText] = useState('');

  const SECTORS_LIST = ['MANGANÊS', 'ALMOXARIFADO', 'SALA ELÉTRICA', 'BARRAGEM DO AZUL', 'ROTA DE FUGA 01', 'ROTA DE FUGA 02', 'RECEPÇÃO', 'COBRE', 'FERRO'];

  // Total assets KPI for AI Assistant context
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

  // --- SIMULATED QUICK SCAN HANDLER ---
  const handleSimulateQuickScan = () => {
    const code = scanCode.toUpperCase().trim();
    if (!code) return;
    
    const ext = extintores.find(x => x.idAtivo === code || x.chassi === code);
    const hid = hidrantes.find(x => x.idAtivo === code);
    const sin = sinalizacoes.find(x => x.idAtivo === code);
    const lum = iluminacoes.find(x => x.idAtivo === code);

    const match = ext || hid || sin || lum;
    setScanModal(false);
    setScanCode('');

    if (match) {
      setSelectedAssetForInspection(match);
      setInspectionNotes('');
      if (ext) router.push('/extintores');
      else if (hid) router.push('/hidrantes');
      else if (sin) router.push('/sinalizacao');
      else if (lum) router.push('/iluminacao');
    } else {
      triggerSuccessNotification('Código não encontrado', 'Deseja cadastrar este novo código como equipamento? Use o botão "+ Novo Ativo".');
    }
  };

  // --- SUBMIT REGISTRATION FORM ---
  const handleAddNewAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatrimonio) {
      alert("Preencha o Número de Patrimônio!");
      return;
    }

    const uniqueId = String(Date.now());
    const getPrefix = () => {
      switch (newAssetType) {
        case 'extintor': return 'EXT-';
        case 'hidrante': return 'HD-';
        case 'sinalizacao': return 'SE-';
        case 'iluminacao': return 'IE-';
        case 'bomba': return 'CB-';
        default: return 'PAT-';
      }
    };
    const prefix = getPrefix();
    const codePatrimonio = formPatrimonio.startsWith(prefix) ? formPatrimonio : `${prefix}${formPatrimonio.toUpperCase()}`;

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
        lastRecarga: new Date().toISOString().substring(0, 10),
        recurrenceInterval: '1 Ano',
        validadeRecarga: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        validadeTesteHidro: '2031',
        status: 'Conforme',
        category: 'Extintor'
      };
      const updated = [newObj, ...extintores];
      setExtintores(updated);
      await saveAssetsList('extintores', updated);
    } else if (newAssetType === 'hidrante') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: formLocal,
        subLocation: formSubLocal,
        components: ['2 Mangueiras (15m)', '1 Esguicho Regulável', '2 Chaves Storz'],
        lastInsp: new Date().toISOString().substring(0, 10),
        nextInsp: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        status: 'Conforme',
        category: 'Hidrante'
      };
      const updated = [newObj, ...hidrantes];
      setHidrantes(updated);
      await saveAssetsList('hidrantes', updated);
    } else if (newAssetType === 'sinalizacao') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: formLocal,
        subLocation: formSubLocal,
        model: multiSelectModels.join(', ') || 'Placa Multi-Direcional - C3',
        group: 'Rota de Fuga',
        status: 'Conforme',
        category: 'Sinalização'
      };
      const updated = [newObj, ...sinalizacoes];
      setSinalizacoes(updated);
      await saveAssetsList('sinalizacoes', updated);
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
        status: 'Operacional',
        category: 'Iluminação'
      };
      const updated = [newObj, ...iluminacoes];
      setIluminacoes(updated);
      await saveAssetsList('iluminacao', updated);
    } else if (newAssetType === 'bomba') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: formLocal,
        subLocation: formSubLocal,
        model: formModel || 'Bomba Centrífuga Principal',
        pressure: 'Estável - 120 MCA',
        starts: '0',
        power: 'Rede 380V',
        range: '100 - 125 PSI',
        status: 'Standby',
        category: 'Bomba'
      };
      const updated = [newObj, ...bombas];
      setBombas(updated);
      await saveAssetsList('bombas', updated);
    }

    setFormPatrimonio('');
    setFormModel('');
    setFormSelo('');
    setFormChassi('');
    setMultiSelectModels([]);
    setShowAddForm(false);
    triggerSuccessNotification('Equipamento Registrado!', `Ativo ${codePatrimonio} foi salvo no banco de dados SPCI.`);
  };

  // --- SUBMIT COMPLIANCE INSPECTION FORM ---
  const handleFinalizeInspection = async (statusResult: 'Conforme' | 'Não Conforme' | 'Falha Carga' | 'Vencido') => {
    if (!selectedAssetForInspection) return;
    const currentAsset = selectedAssetForInspection;
    
    if (extintores.some(x => x.id === currentAsset.id)) {
      const updated = extintores.map(x => x.id === currentAsset.id ? { ...x, status: statusResult } : x);
      setExtintores(updated);
      await saveAssetsList('extintores', updated);
    }
    if (hidrantes.some(x => x.id === currentAsset.id)) {
      const updated = hidrantes.map(x => x.id === currentAsset.id ? { ...x, status: statusResult } : x);
      setHidrantes(updated);
      await saveAssetsList('hidrantes', updated);
    }
    if (sinalizacoes.some(x => x.id === currentAsset.id)) {
      const updated = sinalizacoes.map(x => x.id === currentAsset.id ? { ...x, status: statusResult } : x);
      setSinalizacoes(updated);
      await saveAssetsList('sinalizacoes', updated);
    }
    if (iluminacoes.some(x => x.id === currentAsset.id)) {
      const updated = iluminacoes.map(x => x.id === currentAsset.id ? { ...x, status: statusResult } : x);
      setIluminacoes(updated);
      await saveAssetsList('iluminacao', updated);
    }

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
    await idb.setAll('logs', newLogs);

    if (statusResult !== 'Conforme') {
      handleOpenAlertCenter({ ...currentAsset, status: statusResult });
    } else {
      triggerSuccessNotification('Inspeção Finalizada!', `Ativo ${currentAsset.idAtivo || currentAsset.id} homologado sem pendências.`);
    }

    setSelectedAssetForInspection(null);
    setInspectionNotes('');
    setPhotoPatrimonio(null);
    setPhotoFrontal(null);
  };

  const handleDemoFileDrop = (type: 'patrimonio' | 'frontal') => {
    const demoImg = type === 'patrimonio'
      ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHivi8AubFRd57LyIxQ_UCpU0e5EZHM7CU3G0i5bllB8kOWe0yEs4_cvHEjTQldIXZ0yPUWT5hwkkTpWHR2G9Gjx98y4rPOGqxaYrFeEXeUwSRzxkhtGzh5--E207GrM5-Au-1AN5-u4BCViGJdZ6KqlR0cESE55hAr_EvCNv256E2_diaNV_n9I15GyoyVCIta-61ZT2s2Jcj4UQRvunu_9CEmB-1098iMlvEIZSql0OlnOTbn8TqoaPpDM5fG7loYuhMU8HKyWY'
      : 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4DtHkK9-zzGzyBO9bnX-acjae5qNr2WAE0yVLY2LLy5jx8sNjKh1eaCAzuJbV1yeEXNFAnrP1tInIJgPrMSEU3IPuOCOKFX-DCjmH3x3jwkc8nuoe6sVcpTdHjjqyZfI9PViUbPbGKGxOXROAtM_z4xIOGRtZ-KO5OHRUA3uf2H1izCUhtdsUhj0tL0IMKSdGTYxgpMUD8M6zLZrYRecX9Uqkth3zFIHctgDHx4RaleqwHOT9WngusjL4yqACCptwEZ57QlnDxSM';
    
    if (type === 'patrimonio') setPhotoPatrimonio(demoImg);
    else setPhotoFrontal(demoImg);
  };

  // --- COMPLIANCE TIMELINE BUILDER ---
  const getAssetTimeline = (asset: any) => {
    if (!asset) return [];
    const assetId = asset.idAtivo || asset.id;
    
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
      
    let customLogs: any[] = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`spci_history_${assetId}`);
      if (stored) {
        customLogs = JSON.parse(stored);
      }
    }
    
    let registerDate = '2025-01-15';
    if (assetId.includes('-101')) registerDate = '2023-03-15';
    else if (assetId.includes('-102')) registerDate = '2024-05-10';
    else if (assetId.includes('-103')) registerDate = '2024-12-12';
    else if (assetId.includes('-104')) registerDate = '2025-01-05';
    else if (assetId.includes('1042')) registerDate = '2023-08-12';
    else if (assetId.includes('1055')) registerDate = '2023-11-05';
    else if (assetId.includes('1088')) registerDate = '2024-09-10';
    else if (asset.lastRecarga) registerDate = asset.lastRecarga;
    else if (asset.lastInsp) registerDate = asset.lastInsp;
    
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
    
    const allEvents = [...customLogs, ...autoLogs, ...otherMilestones, seedRegistration];
    
    const seen = new Set();
    const dedupedEvents = allEvents.filter(e => {
      const key = `${e.date}-${e.title}-${e.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

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
    
    if (customEventStatus !== selectedAssetForHistory.status) {
      if (extintores.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = extintores.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setExtintores(u);
        saveAssetsList('extintores', u);
      }
      if (hidrantes.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = hidrantes.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setHidrantes(u);
        saveAssetsList('hidrantes', u);
      }
      if (sinalizacoes.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = sinalizacoes.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setSinalizacoes(u);
        saveAssetsList('sinalizacoes', u);
      }
      if (iluminacoes.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = iluminacoes.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setIluminacoes(u);
        saveAssetsList('iluminacao', u);
      }
      setSelectedAssetForHistory((prev: any) => ({ ...prev, status: customEventStatus }));
    }

    triggerSuccessNotification('Histórico SPCI Atualizado!', `O evento administrativo "${customEventTitle}" foi inserido com sucesso.`);
    setCustomEventNotes('');
    setShowAddCustomHistory(false);
  };

  // --- AI ASSISTANT AUTOPARECER GENERATOR ---
  const handleGenerateIAParecer = async (asset: any) => {
    if (!asset) return;
    const assetId = asset.idAtivo || asset.id;
    const events = getAssetTimeline(asset);
    
    setChatOpened(true);
    setAiGenerating(true);
    
    setChatMessages(prev => [...prev, { 
      sender: 'user', 
      text: `Gere um rascunho de Parecer Técnico para o ativo ${assetId} (${asset.model || 'equipamento'}) baseado no seu histórico.` 
    }]);

    try {
      const historyText = events.map(e => `- [${e.date} ${e.time || ''}] ${e.title} (${e.status}): ${e.description}`).join('\n');
      
      const promptText = `Gere um rascunho de "Parecer Técnico de Engenharia de Incêndio" formal e detalhado para o seguinte ativo:
      ID: ${assetId}
      Tipo: ${asset.type || 'Equipamento SPCI'}
      Modelo: ${asset.model || 'Padrão'}
      Local: ${asset.location} ${asset.subLocation ? ' - ' + asset.subLocation : ''}
      Status: ${asset.status}
      Histórico:
      ${historyText}
      
      Estruture em 4 blocos:
      I. RESUMO DO ATIVO E SINTOMA ATUAL
      II. ANÁLISE DETALHADA DAS OCORRÊNCIAS
      III. ENQUADRAMENTO E EMBASAMENTO NORMATIVO
      IV. RECOMENDAÇÕES TÉCNICAS E CRONOGRAMA CORREÇÃO`;

      const response = await fetch('/api/gemini', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          systemInstruction: "Você é o Inspe IA SPCI, especialista em engenharia de segurança contra incêndios no Brasil. Responda em português de forma formal."
        })
      });

      const data = await response.json();
      const text = data.text || "Laudo indisponível.";
      setChatMessages(prev => [...prev, { sender: 'assistant', text }]);
      triggerSuccessNotification('Parecer Técnico Criado!', `Sintetizado laudo técnico do ativo ${assetId}.`);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: `PARECER TÉCNICO PREVENTIVO (Modo SPCI Offline) - Ativo ${assetId}.\n\nAtivo com status [${asset.status}]. Testes pendentes sob NBR correspondente.` 
      }]);
    } finally {
      setAiGenerating(false);
    }
  };

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
          prompt: `Responda de forma sucinta como o Inspe IA SPCI.
          Planta: ${totalAssets} ativos, ${totalVencidos} vencidos, ${totalAtencao} em atenção. Conformidade: ${compliancePercentage}%.
          Mensagem: ${msg}`,
          systemInstruction: "You are the Inspe IA SPCI assistant. Keep responses brief, precise and in Portuguese."
        })
      });

      const data = await response.json();
      const text = data.text || "Sem resposta.";
      setChatMessages(prev => [...prev, { sender: 'assistant', text }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { sender: 'assistant', text: `Dica (Modo Offline): Garanta sinalizações ABNT NBR 13434 e testes anuais NBR 12779.` }]);
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

  // --- PENDING / BLOCKED ACCESS STATE VIEW ---
  if (currentUser && userProfile && userProfile.status !== 'active') {
    return (
      <div className="bg-[#121c21] min-h-screen text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans relative overflow-hidden">
        <div className="absolute -top-32 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>
        <div className="absolute -bottom-32 w-128 h-128 bg-[#7bd1f8]/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>

        <div className="max-w-md bg-white/5 border border-white/10 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-2xl space-y-6 relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500"></div>
          
          <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center text-4xl mx-auto border border-amber-500/30 animate-bounce" aria-hidden="true">
            {userProfile.status === 'pending' ? '⏳' : '🚫'}
          </div>

          <div className="space-y-4">
            <h2 className="font-['Hanken_Grotesk'] font-black text-2xl tracking-normal text-amber-400 font-bold">
              {userProfile.status === 'pending' ? 'Conta Aguardando Liberação' : 'Acesso Suspenso'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {userProfile.status === 'pending' 
                ? `Olá, ${userProfile.name}! Seu cadastro foi mapeado no SPCI, mas requer liberação manual de um administrador para operar. Contate o administrador jackson602@gmail.com para ativar seu login.`
                : `Olá, ${userProfile.name}! Seu perfil de acesso foi suspenso temporariamente pela administração do SPCI.`}
            </p>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase leading-none font-mono">Credencial Logada</span>
            <p className="text-xs font-mono font-bold mt-1 text-slate-200 truncate">{userProfile.email}</p>
            <p className="text-[10px] font-sans text-amber-500 font-bold mt-1">Status: {userProfile.status.toUpperCase()}</p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleGoogleLogout}
              className="flex-1 py-3 text-xs uppercase font-['Hanken_Grotesk'] font-bold text-slate-300 border border-white/20 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
            >
              Sair da Conta ⚪
            </button>
            <button 
              onClick={async () => {
                const p = await getUserProfile(currentUser.uid);
                if (p && p.status === 'active') {
                  window.location.reload();
                }
              }}
              className="flex-grow py-3 text-xs uppercase font-['Hanken_Grotesk'] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all text-center cursor-pointer"
            >
              🔄 Verificar Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#1b2a32] min-h-screen text-slate-800 relative overflow-hidden font-sans">
      
      {/* Menu lateral fixo com rotas Next.js */}
      <Sidebar onProfileClick={() => { if (currentUser) { setShowProfileModal(true); } }} />

      {/* Corpo principal do Dashboard */}
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Barra superior de buscas e perfil */}
        <Header 
          onScanClick={() => setScanModal(true)} 
          onProfileClick={() => setShowProfileModal(true)} 
        />

        {/* Área onde as subpáginas renderizam */}
        <main className="flex-grow overflow-y-auto p-4 md:p-6 bg-slate-50 relative">
          <div className="max-w-6xl mx-auto pb-20">
            {/* Se um laudo de inspeção estiver ativo no topo */}
            {selectedAssetForInspection && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl border border-[#CFD8DC] p-6 shadow-xl relative mb-8">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-700 to-[#af101a]" aria-hidden="true"></div>
                
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                  <div>
                    <span className="bg-[#2E7D32] text-white text-[10px] font-bold py-1 px-2.5 rounded-full uppercase tracking-wider">Inspeção Ativa</span>
                    <h2 className="font-['Hanken_Grotesk'] font-black text-2xl text-slate-800 mt-2">Laudo NBR Conformidade - {selectedAssetForInspection.idAtivo || selectedAssetForInspection.id}</h2>
                  </div>
                  <button onClick={() => setSelectedAssetForInspection(null)} className="text-slate-400 hover:text-slate-900 border p-2 rounded-lg text-xs cursor-pointer">Descartar Inspeção ×</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-[#CFD8DC]">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mb-1 block">Equipamento</span>
                    <p className="font-semibold text-slate-800">{selectedAssetForInspection.model || 'Sinalização Operacional'}</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">Selo/Inmetro: {selectedAssetForInspection.seloInmetro || 'Isento/NBR'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-[#CFD8DC]">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mb-1 block">Localização</span>
                    <p className="font-semibold text-slate-800">{selectedAssetForInspection.location}</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">Sala: {selectedAssetForInspection.subLocation || 'Sem sala'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-[#CFD8DC]">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mb-1 block">Status Pré-Ronda</span>
                    <span className={`inline-block text-xs font-bold uppercase rounded px-1.5 py-0.5 mt-1 ${selectedAssetForInspection.status === 'Conforme' || selectedAssetForInspection.status === 'Operacional' ? 'text-[#2E7D32] bg-[#E8F5E9]' : 'text-[#D32F2F] bg-[#FFEBEE]'}`}>
                      {selectedAssetForInspection.status}
                    </span>
                  </div>
                </div>

                {/* Upload fotográfico da inspeção */}
                <div className="bg-[#FFE2DE]/30 border border-[#D32F2F]/20 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden="true">📸</span>
                    <div>
                      <p className="text-xs font-bold text-red-900 uppercase">Laudo Fotográfico Obrigatório para NBR *</p>
                      <p className="text-[11px] text-red-700/80">Anexe fotos em close-up do patrimônio e da vista frontal.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => handleDemoFileDrop('patrimonio')}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${photoPatrimonio ? 'bg-green-100 text-green-800 border-green-300' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                      {photoPatrimonio ? '✔️ Foto Patrimônio' : '📸 Foto Patrimônio'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDemoFileDrop('frontal')}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${photoFrontal ? 'bg-green-100 text-green-800 border-green-300' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                      {photoFrontal ? '✔️ Foto Frontal' : '📸 Foto Frontal'}
                    </button>
                  </div>
                </div>

                {/* Checklist NBR */}
                <div className="space-y-4 mb-8">
                  <h3 className="font-['Hanken_Grotesk'] text-sm font-extrabold uppercase text-slate-700 pb-2 border-b">Requisitos Obrigatórios de Laudo</h3>
                  {[
                    "Posição e Localização recomendada conforme normas?",
                    "Acesso desobstruído com faixa de segurança?",
                    "Sinalização fotoluminescente regulamentar?",
                    "Selo Inmetro, legibilidade de validade de manutenção?",
                    "Integridade estrutural da carcaça / conexões e pintura?"
                  ].map((req, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-[#CFD8DC]/60 rounded-xl bg-white hover:bg-slate-50">
                      <p className="text-xs font-semibold text-slate-800">{i+1}- {req}</p>
                      <div className="flex gap-2">
                        <button type="button" className="px-3 py-1.5 text-[11px] font-bold uppercase rounded-lg border border-slate-200 bg-white hover:bg-green-50 text-green-700 flex items-center gap-1 focus:ring-2 focus:ring-green-600 cursor-pointer">
                          <span>✔️</span> Conforme
                        </button>
                        <button type="button" className="px-3 py-1.5 text-[11px] font-bold uppercase rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 flex items-center gap-1 focus:ring-2 focus:ring-red-600 cursor-pointer">
                          <span>❌</span> Não Conforme
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <div className="mb-4">
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Ação Corretiva / Observações do Técnico</label>
                    <textarea 
                      value={inspectionNotes}
                      onChange={(e) => setInspectionNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-xs focus:outline-none focus:border-slate-800" 
                      placeholder="Descreva pendências..."
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => handleFinalizeInspection('Não Conforme')}
                      className="px-5 py-3 text-xs uppercase font-['Hanken_Grotesk'] font-bold rounded-xl text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all duration-200 cursor-pointer"
                    >
                      ⚠️ Registrar Não Conformidade
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleFinalizeInspection('Conforme')}
                      className="px-6 py-3 text-xs uppercase font-['Hanken_Grotesk'] font-bold rounded-xl text-white bg-gradient-to-r from-[#2E7D32] to-[#388E3C] hover:opacity-90 shadow-md shadow-green-950/20 transition-all duration-200 cursor-pointer"
                    >
                      🟢 FINALIZAR - HOMOLOGAR CONFORME
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Show Add Asset form overlay */}
            {showAddForm && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#CFD8DC] p-6 shadow-xl relative overflow-hidden mb-8">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-700" aria-hidden="true"></div>
                
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="font-['Hanken_Grotesk'] font-bold text-xl text-[#37474F]">✍️ Cadastrar Novo Ativo no Sistema SPCI</h2>
                    <p className="text-slate-500 text-xs">Mapeie e homologue um novo ativo para monitoramento e alertas</p>
                  </div>
                  <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-900 border border-slate-200 rounded-lg p-2 text-xs cursor-pointer">Fechar ×</button>
                </div>

                <div className="mb-2">
                  <span className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-3 ml-1">Selecione a Categoria do Ativo</span>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                    {[
                      { id: 'extintor', label: 'Extintor', icon: '🧯', desc: 'Combate Primário', color: 'from-orange-50' },
                      { id: 'hidrante', label: 'Hidrante', icon: '💧', desc: 'Maca & Abrigo', color: 'from-blue-50' },
                      { id: 'sinalizacao', label: 'Sinalização', icon: '⚠️', desc: 'Rotas e Placas', color: 'from-amber-50' },
                      { id: 'iluminacao', label: 'Iluminação', icon: '💡', desc: 'Rotas de Fuga', color: 'from-yellow-50' },
                      { id: 'bomba', label: 'Casa de Bombas', icon: '⚙️', desc: 'Sistema Hidráulico', color: 'from-slate-100' }
                    ].map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewAssetType(item.id)}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer group ${
                          newAssetType === item.id 
                            ? `border-[#af101a] ${item.color} to-white bg-gradient-to-br shadow-md shadow-red-900/10 scale-105 z-10` 
                            : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-xl'
                        }`}
                      >
                        <span className="text-4xl mb-3" aria-hidden="true">{item.icon}</span>
                        <span className="text-xs uppercase font-black font-['Hanken_Grotesk'] text-center">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

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
                      <input type="text" value={formSubLocal} onChange={(e) => setFormSubLocal(e.target.value)} className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 focus:outline-none focus:border-slate-800 text-sm" placeholder="Ex: Setor B de Estocagem" />
                    </div>

                    <div>
                      <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Número do Patrimônio *</label>
                      <div className="flex gap-2">
                        <span className="bg-slate-200 text-sm px-3 flex items-center text-slate-700 font-mono rounded-l-xl border border-[#CFD8DC]" aria-hidden="true">
                          {newAssetType === 'extintor' ? 'EXT-' : newAssetType === 'hidrante' ? 'HD-' : newAssetType === 'sinalizacao' ? 'SE-' : newAssetType === 'iluminacao' ? 'IE-' : newAssetType === 'bomba' ? 'CB-' : 'PAT-'}
                        </span>
                        <input type="text" value={formPatrimonio} onChange={(e) => setFormPatrimonio(e.target.value)} className="w-full bg-slate-50 border border-[#CFD8DC] rounded-r-xl p-3 focus:outline-none focus:border-slate-800 text-sm font-semibold uppercase" placeholder="Escreva o número" required />
                      </div>
                    </div>

                    {newAssetType === 'extintor' && (
                      <>
                        <div>
                          <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Modelo / Agente e Carga *</label>
                          <select value={formModel} onChange={(e) => setFormModel(e.target.value)} className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-sm">
                            <option value="PQS ABC - 8KG">Pós Químico ABC - 8KG</option>
                            <option value="CO2 - 6KG">Gás Carbônico CO2 - 6KG</option>
                            <option value="Água Pressurizada - 10L">Água Pressurizada - 10L</option>
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

                    {newAssetType === 'sinalizacao' && (
                      <div className="col-span-1 md:col-span-2">
                        <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-3">Selecione o Modelo Visual da Placa *</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {[
                            { key: 'C3 Seta Esquerda', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNNbUfk2-mF0LxprKV2C7RKYXByvjbUXy_XWGbND3PaNoNkZwm1WPALDNXzWKlln0_0NhdfGno-XDTHgppxN_u_498yg03tdmYfiXnVOZmjdDfRjlduzDfLIZOdwrukwEBBsjFja9AeeWHamh8Oj6ix518U7tf8MlGGpDq_EoeNy-CpyAUiBoiAeQIdJ8TsTDvlPcjLNk61VGY7vOr1sIpD81yn4jzCVzqDrNzI9qIwa3kLdAva8y-52WbK7TegbKDD9z-fC8hNds', desc: 'Saída Esquerda' },
                            { key: 'C2 Seta Escada', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4jlkr2uN2Tr6OJK6xOqq__Dmr4HqtdL80oYJ6xWONK9spyiKxm43StnH--3VPFVk3V2XvVl_oGmZF5F5Uckdfj_OMtvTldfCBdMMEs8kM6bKlsvNx4Dhk1iFXyYzAXZOs4XY-8L9NBBMOfMOj391GSo1Giw5N39-HB3gvS6RBY0QOmesGudZbE-gzJGedDPv9HK6BepGwGVEUC9sN4FqqkHlrCtabrdHhw-CcdWchRdmKVmkhJleznOXtmpaGQsIbLWLIQCOHztk', desc: 'Saída Descendo' },
                            { key: 'C3 Seta Direita', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqRdNZ3PxX3jI5lZpnWd--u2m8jxVQqLaqU5vQ0pkiBWzfqr50eBZzbBsJKE85XpDbsDZEa31a6kA6sqnv8_Am4020bV21UWRP3xqBcxjHNQtlqgZ6cQI-s8sXNS25S4tlRyp4FgxG2ni9Wz4f5tlN28lxhNVEVU48Np-IXSp9m588pUkW-fDPGTsWVIglvkAXH9H2yl9Z7t9W71qZKjMsRzE4HCaRnTv6XkbI2BUqhUF5lx86aP3hEpAt7kez4KrFHpv8Tw3ieGM', desc: 'Saída Direita' }
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

                    {newAssetType === 'iluminacao' && (
                      <>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block font-['Hanken_Grotesk'] text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Tipo de Sistema *</label>
                          <select value={formSystemType} onChange={(e) => setFormSystemType(e.target.value)} className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-sm">
                            <option value="CONJUNTO DE BLOCO AUTÔNOMO">CONJUNTO DE BLOCO AUTÔNOMO</option>
                            <option value="SISTEMA CENTRALIZADO BATERIAS">SISTEMA CENTRALIZADO BATERIAS</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 font-sans">
                    <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 text-xs uppercase font-bold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
                    <button type="submit" className="px-6 py-2.5 text-xs uppercase font-bold text-white bg-gradient-to-r from-green-700 to-emerald-600 rounded-lg shadow-md hover:from-green-800 transition-all cursor-pointer">Salvar no Banco</button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Render children subpages here */}
            {children}
          </div>
        </main>
      </div>

      {/* --- FLOATING CHAT DRAWER INSPE IA --- */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
        <AnimatePresence>
          {chatOpened && (
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="bg-white rounded-2xl border border-[#CFD8DC] shadow-2xl w-80 max-w-[90vw] md:w-96 flex flex-col h-96 overflow-hidden pointer-events-auto"
            >
              <div className="bg-gradient-to-r from-slate-800 to-slate-950 text-white p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">🤖</span>
                  <div>
                    <h4 className="font-['Hanken_Grotesk'] font-bold text-sm text-white">Inspe IA Assistente SPCI</h4>
                    <p className="text-[10px] text-[#7bd1f8] font-mono">Normas NBR e Suporte Operacional</p>
                  </div>
                </div>
                <button onClick={() => setChatOpened(false)} className="text-white hover:text-red-400 font-bold border-none bg-transparent cursor-pointer">×</button>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50 custom-scrollbar text-xs">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`p-3 rounded-2xl max-w-[85%] ${m.sender === 'user' ? 'bg-gradient-to-r from-red-700 to-rose-600 text-white ml-auto rounded-tr-none' : 'bg-white text-slate-800 mr-auto rounded-tl-none border'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                ))}
                {aiGenerating && (
                  <div className="bg-white text-slate-600 mr-auto rounded-2xl p-3 border animate-pulse text-[11px]">
                    ✍️ Analisando conformidades...
                  </div>
                )}
              </div>

              <div className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={userPrompt} 
                  onChange={(e) => setUserPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAssistantSend(); }}
                  placeholder="Pergunte sobre NBR de extintores..." 
                  className="flex-grow bg-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none border border-transparent focus:border-[#CFD8DC]" 
                />
                <button onClick={handleAssistantSend} className="bg-rose-700 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">Enviar</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          type="button"
          onClick={() => setChatOpened(!chatOpened)}
          className="w-14 h-14 bg-slate-900 border-4 border-white hover:bg-slate-800 text-white rounded-full shadow-2xl flex flex-col items-center justify-center relative cursor-pointer pointer-events-auto tracking-tighter"
          aria-label="Abrir Assistente de Inteligência Artificial"
        >
          <span className="text-xl" aria-hidden="true">🤖</span>
          <span className="text-[7px] font-extrabold uppercase leading-none font-['Hanken_Grotesk'] text-[#7bd1f8]">INSPE IA</span>
        </button>
      </div>

      {/* --- QUICK SCAN SIMULATION POPUP --- */}
      <AnimatePresence>
        {scanModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl border border-slate-300 p-6 shadow-2xl max-w-sm w-full relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-red-600" aria-hidden="true"></div>
              
              <h3 className="font-['Hanken_Grotesk'] font-bold text-lg text-slate-800 mb-2">Simulador de Códigos de Campo QR</h3>
              <p className="text-xs text-slate-500 mb-4">Insira o código do Ativo impresso na etiqueta SPCI para carregar vistorias.</p>
              
              <input 
                type="text" 
                value={scanCode} 
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="Ex: PAT-E-101 ou PAT-H-1042" 
                className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-sm focus:outline-none mb-4 font-mono font-bold text-center text-slate-700"
              />

              <div className="flex gap-2">
                <button onClick={() => setScanModal(false)} className="flex-1 py-2 text-xs uppercase font-bold text-slate-500 border rounded-lg cursor-pointer">Cancelar</button>
                <button onClick={handleSimulateQuickScan} className="flex-1 py-2 text-xs uppercase font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-sm cursor-pointer">Buscar Ativo</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PERFIL & LOGO MODAL --- */}
      <AnimatePresence>
        {showProfileModal && currentUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 15 }} 
              className="bg-white rounded-3xl border border-slate-300 p-6 shadow-2xl max-w-md w-full relative overflow-hidden space-y-5"
              id="my-profile-logo-modal"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" aria-hidden="true"></div>

              <div className="flex justify-between items-start pt-1">
                <div>
                  <h3 className="font-['Hanken_Grotesk'] font-black text-xl text-slate-800 flex items-center gap-1.5">
                    <span>⚙️</span> Meu Perfil & Logo Custom
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">Assinatura de marca e logotipo do SPCI</p>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)} 
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                  {userProfile?.logoUrl ? (
                    <img 
                      src={userProfile.logoUrl} 
                      alt={`Logo corporativo de ${userProfile.name}`} 
                      className="w-12 h-12 rounded-xl object-contain border bg-white p-1"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-sm uppercase font-mono" aria-hidden="true">
                      {userProfile?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider leading-none block">Credencial Logada</span>
                    <p className="text-xs font-bold text-slate-800 font-mono truncate mt-1">{currentUser.email}</p>
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5 font-bold">
                      Acesso: {userProfile?.role === 'admin' ? '🛡️ Administrador' : '👷 Técnico Autorizado'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Seu Nome / Razão Social</label>
                  <input 
                    type="text" 
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    placeholder="Nome do Técnico"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl p-3 text-xs focus:outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Link URL do Logotipo (.png / .jpg)</label>
                  <input 
                    type="text" 
                    value={profileLogoUrlInput}
                    onChange={(e) => setProfileLogoUrlInput(e.target.value)}
                    placeholder="Link da imagem da logomarca"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl p-3 text-xs focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Preset de Logos Premium</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: '🔥 Incêndio SPCI', url: 'https://images.unsplash.com/photo-1516216621161-8a5021e11e2f?w=100&auto=format&fit=crop&q=80' },
                      { name: '🏢 Torre Segura', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&auto=format&fit=crop&q=80' },
                      { name: '🌳 EcoSegurança', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=100&auto=format&fit=crop&q=80' }
                    ].map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setProfileLogoUrlInput(preset.url)}
                        className={`border rounded-xl p-1.5 text-center bg-slate-50 hover:bg-slate-100 flex flex-col items-center gap-1 cursor-pointer transition-all ${profileLogoUrlInput === preset.url ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200'}`}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.name} 
                          className="w-8 h-8 rounded-lg object-cover shadow-xs bg-white" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[8px] font-bold text-slate-700 leading-none truncate max-w-full block">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2 border-t">
                <button 
                  onClick={() => {
                    setShowProfileModal(false);
                    setProfileNameInput(userProfile?.name || '');
                    setProfileLogoUrlInput(userProfile?.logoUrl || '');
                  }} 
                  className="flex-1 py-3 text-xs uppercase font-bold text-slate-500 border rounded-xl hover:bg-slate-50 transition-all cursor-pointer font-mono"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleUpdateLogoAndProfile(profileLogoUrlInput, profileNameInput)}
                  className="flex-grow flex-1 py-3 text-xs uppercase font-bold text-white bg-gradient-to-r from-red-700 via-rose-600 to-rose-700 rounded-xl shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  Salvar Logo 💾
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- OUTGOING ALERTS MODAL --- */}
      <AnimatePresence>
        {premiumAlert && premiumAlert.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} className="bg-white rounded-3xl border border-slate-300 p-6 shadow-2xl max-w-lg w-full relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${premiumAlert.type === 'success' ? 'bg-[#2E7D32]' : premiumAlert.type === 'critical' ? 'bg-[#af101a]' : 'bg-[#F57C00]'}`} aria-hidden="true"></div>
              
              <div className="flex gap-3 items-start mb-4">
                <span className="text-3xl" aria-hidden="true">
                  {premiumAlert.type === 'success' ? '🟢' : premiumAlert.type === 'critical' ? '🚨' : '⚠️'}
                </span>
                <div>
                  <h3 className="font-['Hanken_Grotesk'] font-bold text-lg text-slate-800">{premiumAlert.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{premiumAlert.message}</p>
                </div>
              </div>

              {premiumAlert.dispatchData && (
                <div className="space-y-4 pt-2 border-t mt-4 text-xs font-sans">
                  <div>
                    <span className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Selecione o Canal de Avisos</span>
                    <div className="flex gap-2">
                      {['whatsapp', 'telegram', 'email'].map((channel: any) => (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => setAlertFormChannel(channel)}
                          className={`flex-grow py-2 text-[10px] uppercase font-bold rounded-lg border text-center transition-all cursor-pointer ${alertFormChannel === channel ? 'bg-slate-900 border-slate-950 text-white' : 'bg-slate-50 text-slate-700'}`}
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
                      placeholder={alertFormChannel === 'email' ? 'e-mail do gestor' : 'Nº com DDI (Ex: 5511999998888)'}
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

              <div className="flex gap-2 mt-6 justify-end border-t pt-4 font-sans">
                <button onClick={() => setPremiumAlert(null)} className="px-4 py-2 text-xs uppercase font-bold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer">Entendido</button>
                {premiumAlert.dispatchData && (
                  <button onClick={dispatchAlertNotification} className="px-5 py-2 text-xs uppercase font-bold text-white bg-gradient-to-r from-red-700 to-rose-600 hover:opacity-90 rounded-lg shadow-sm cursor-pointer">Confirmar Envio</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ASSET TIMELINE & COMPLIANCE HISTORY MODAL --- */}
      <AnimatePresence>
        {selectedAssetForHistory && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              className="bg-white rounded-3xl border border-slate-300 shadow-2xl max-w-2xl w-full relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-950 text-white p-6 shrink-0 relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedAssetForHistory(null);
                      setShowAddCustomHistory(false);
                    }} 
                    className="bg-white/10 hover:bg-white/20 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border-none outline-none"
                    aria-label="Fechar modal de histórico"
                  >
                    ×
                  </button>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shadow-inner backdrop-blur-sm" aria-hidden="true">
                    {selectedAssetForHistory.type === 'extintor' && '🧯'}
                    {selectedAssetForHistory.type === 'hidrante' && '💧'}
                    {selectedAssetForHistory.type === 'sinalizacao' && '⚠️'}
                    {selectedAssetForHistory.type === 'iluminacao' && '💡'}
                    {!selectedAssetForHistory.type && '⚙️'}
                  </div>
                  <div>
                    <span className="text-[10px] bg-red-800 tracking-widest text-[#FFCDD2] uppercase font-bold px-2 py-0.5 rounded-full font-mono">
                      {selectedAssetForHistory.category || 'Equipamento'} • {selectedAssetForHistory.idAtivo || selectedAssetForHistory.id}
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

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold pb-1 border-b">Status de Operação</span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`w-3 h-3 rounded-full animate-pulse ${selectedAssetForHistory.status === 'Conforme' || selectedAssetForHistory.status === 'Operacional' || selectedAssetForHistory.status === 'Cadastro Ativo' || selectedAssetForHistory.status === 'Standby' ? 'bg-green-600' : 'bg-red-600'}`} aria-hidden="true"></span>
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
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#CFD8DC] rounded-2xl shadow-sm p-4 overflow-hidden">
                  {!showAddCustomHistory ? (
                    <button 
                      type="button"
                      onClick={() => setShowAddCustomHistory(true)}
                      className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                      <span>➕ Adicionar Registro Manual ao Histórico</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddCustomHistoryEvent} className="space-y-4 font-sans">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <h4 className="text-xs font-extrabold uppercase text-slate-700">Novo Registro Administrativo</h4>
                        <button 
                          type="button" 
                          onClick={() => setShowAddCustomHistory(false)} 
                          className="text-xs text-rose-600 font-bold uppercase border-none bg-transparent cursor-pointer"
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
                            <option value="Em Manutenção">Manutenção Ativa</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Notas / Detalhamento Administrativo</label>
                        <textarea 
                          value={customEventNotes}
                          onChange={(e) => setCustomEventNotes(e.target.value)}
                          rows={3}
                          placeholder="Anote detalhes..."
                          className="w-full bg-slate-50 border rounded-lg p-2 text-xs focus:outline-none font-sans"
                          required
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="w-full py-2 bg-gradient-to-r from-green-700 to-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-95 transition-all shadow-md cursor-pointer border-none"
                      >
                        Salvar Evento e Consolidar Linha do Tempo 🚀
                      </button>
                    </form>
                  )}
                </div>

                <div className="flex gap-2 border-b pb-2">
                  <button 
                    type="button"
                    onClick={() => setHistoryFilter('all')} 
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer border-none ${historyFilter === 'all' ? 'bg-[#af101a] text-white' : 'bg-white border text-slate-600'}`}
                  >
                    Todos ({getAssetTimeline(selectedAssetForHistory).length})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setHistoryFilter('non_conforming')} 
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer border-none ${historyFilter === 'non_conforming' ? 'bg-red-100 text-red-700 font-bold border border-red-200' : 'bg-white border text-slate-600'}`}
                  >
                    Não Conformidades ({getAssetTimeline(selectedAssetForHistory).filter((e: any) => e.status !== 'Conforme' && e.status !== 'Operacional' && e.status !== 'Cadastro Ativo' && e.status !== 'Standby').length})
                  </button>
                </div>

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
                      <div 
                        key={event.id || index} 
                        className="relative group"
                      >
                        <div className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md border ${
                          event.status === 'Conforme' || event.status === 'Operacional' || event.status === 'Cadastro Ativo' || event.status === 'Standby'
                            ? 'bg-green-100 border-green-300 text-green-700' 
                            : 'bg-red-100 border-red-300 text-red-700'
                        }`}>
                          {event.icon || '📝'}
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-4 transition-all hover:shadow-md hover:scale-[1.01]">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-bold">
                              📅 {event.date} • {event.time || '08:00:00'}
                            </span>
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              event.status === 'Conforme' || event.status === 'Operacional' || event.status === 'Cadastro Ativo' || event.status === 'Standby'
                                ? 'text-green-800 bg-green-50' 
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
                </div>
              </div>

              <div className="p-4 bg-slate-100 border-t shrink-0 flex justify-between items-center gap-4 font-sans">
                <button 
                  type="button"
                  onClick={() => handleGenerateIAParecer(selectedAssetForHistory)} 
                  className="px-4 py-2.5 bg-gradient-to-r from-[#af101a] to-amber-700 hover:from-red-800 hover:to-amber-800 text-white font-['Hanken_Grotesk'] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer border-none"
                >
                  🤖 Gerar Parecer Técnico IA
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedAssetForHistory(null);
                    setShowAddCustomHistory(false);
                  }} 
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-['Hanken_Grotesk'] font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer border-none"
                >
                  Fechar Histórico
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
