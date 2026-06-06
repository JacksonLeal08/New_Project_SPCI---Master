'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '../context/SpciContext';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { getUserProfile } from '@/lib/supabaseDb';
import { idb } from '@/lib/indexedDb';


// Componentes modulares e desacoplados do SPCI
import AssetInspectionModal from '../components/AssetInspectionModal';
import AssetAddModal from '../components/AssetAddModal';
import AssetHistoryModal from '../components/AssetHistoryModal';
import SpciChatIa from '../components/SpciChatIa';
import PremiumHUDAlert from '../components/ui/PremiumHUDAlert';
import QrCameraScanner from '../components/QrCameraScanner';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    currentUser,
    userProfile,
    authChecking,
    extintores,
    hidrantes,
    sinalizacoes,
    iluminacoes,
    setExtintores,
    setHidrantes,
    setSinalizacoes,
    setIluminacoes,
    saveAssetsList,
    triggerSuccessNotification,
    showAddForm,
    setShowAddForm,
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
    premiumAlert,
    setPremiumAlert,
    complianceLogs,
    setComplianceLogs,
    handleUpdateLogoAndProfile,
    handleGoogleLogout
  } = useSpci();

  // --- ESTADOS LOCAIS PARA GESTÃO DO LAYOUT ---
  const [photoPatrimonio, setPhotoPatrimonio] = useState<string | null>(null);
  const [photoFrontal, setPhotoFrontal] = useState<string | null>(null);
  const [inspectionNotes, setInspectionNotes] = useState('');
  
  // Alertas de saída do cockpit
  const [alertFormChannel, setAlertFormChannel] = useState<'whatsapp' | 'telegram' | 'email'>('whatsapp');
  const [alertTargetContact, setAlertTargetContact] = useState('');
  const [generatedReportText, setGeneratedReportText] = useState('');

  const SECTORS_LIST = ['MANGANÊS', 'ALMOXARIFADO', 'SALA ELÉTRICA', 'BARRAGEM DO AZUL', 'ROTA DE FUGA 01', 'ROTA DE FUGA 02', 'RECEPÇÃO', 'COBRE', 'FERRO'];

  // --- LAUDO FOTOGRÁFICO SIMULADO ---
  const handleDemoFileDrop = (type: 'patrimonio' | 'frontal') => {
    const demoImg = type === 'patrimonio'
      ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHivi8AubFRd57LyIxQ_UCpU0e5EZHM7CU3G0i5bllB8kOWe0yEs4_cvHEjTQldIXZ0yPUWT5hwkkTpWHR2G9Gjx98y4rPOGqxaYrFeEXeUwSRzxkhtGzh5--E207GrM5-Au-1AN5-u4BCViGJdZ6KqlR0cESE55hAr_EvCNv256E2_diaNV_n9I15GyoyVCIta-61ZT2s2Jcj4UQRvunu_9CEmB-1098iMlvEIZSql0OlnOTbn8TqoaPpDM5fG7loYuhMU8HKyWY'
      : 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4DtHkK9-zzGzyBO9bnX-acjae5qNr2WAE0yVLY2LLy5jx8sNjKh1eaCAzuJbV1yeEXNFAnrP1tInIJgPrMSEU3IPuOCOKFX-DCjmH3x3jwkc8nuoe6sVcpTdHjjqyZfI9PViUbPbGKGxOXROAtM_z4xIOGRtZ-KO5OHRUA3uf2H1izCUhtdsUhj0tL0IMKSdGTYxgpMUD8M6zLZrYRecX9Uqkth3zFIHctgDHx4RaleqwHOT9WngusjL4yqACCptwEZ57QlnDxSM';
    
    if (type === 'patrimonio') setPhotoPatrimonio(demoImg);
    else setPhotoFrontal(demoImg);
  };

  // --- SCANNER DE QR CODE ---
  const handleQrScanSuccess = (code: string) => {
    const uppercaseCode = code.toUpperCase().trim();
    if (!uppercaseCode) return;
    
    const ext = extintores.find(x => x.idAtivo === uppercaseCode || x.chassi === uppercaseCode);
    const hid = hidrantes.find(x => x.idAtivo === uppercaseCode);
    const sin = sinalizacoes.find(x => x.idAtivo === uppercaseCode);
    const lum = iluminacoes.find(x => x.idAtivo === uppercaseCode);

    const match = ext || hid || sin || lum;
    setScanModal(false);

    if (match) {
      setSelectedAssetForInspection(match);
      setInspectionNotes('');
      if (ext) router.push('/extintores');
      else if (hid) router.push('/hidrantes');
      else if (sin) router.push('/sinalizacao');
      else if (lum) router.push('/iluminacao');
      triggerSuccessNotification('Equipamento Detectado', `Ativo ${uppercaseCode} carregado no cockpit de vistorias.`);
    } else {
      triggerSuccessNotification(
        'Ativo Não Cadastrado',
        `O código "${uppercaseCode}" não está registrado no sistema. Use o botão "+ Novo Ativo" para cadastrá-lo.`
      );
    }
  };

  // --- FINALIZAÇÃO DE INSPECÃO ATIVA ---
  const handleFinalizeInspectionSubmit = async (statusResult: 'Conforme' | 'Não Conforme') => {
    if (!selectedAssetForInspection) return;
    const currentAsset = selectedAssetForInspection;
    const key = currentAsset.category;
    
    // Atualiza o status localmente no array do módulo correspondente
    if (key === 'extintores' || extintores.some(x => x.id === currentAsset.id)) {
      const updated = extintores.map(x => x.id === currentAsset.id ? { ...x, status: statusResult } : x);
      setExtintores(updated);
      await saveAssetsList('extintores', updated);
    } else if (key === 'hidrantes' || hidrantes.some(x => x.id === currentAsset.id)) {
      const updated = hidrantes.map(x => x.id === currentAsset.id ? { ...x, status: statusResult } : x);
      setHidrantes(updated);
      await saveAssetsList('hidrantes', updated);
    } else if (key === 'sinalizacoes' || sinalizacoes.some(x => x.id === currentAsset.id)) {
      const updated = sinalizacoes.map(x => x.id === currentAsset.id ? { ...x, status: statusResult } : x);
      setSinalizacoes(updated);
      await saveAssetsList('sinalizacoes', updated);
    } else if (key === 'iluminacao' || iluminacoes.some(x => x.id === currentAsset.id)) {
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
    
    // Salva o log no banco local IndexedDB
    try {
      await idb.setAll('logs', newLogs);
    } catch (e) {}

    if (statusResult !== 'Conforme') {
      // Abre a central de dispatch de alertas
      setAlertTargetContact('');
      const message = `Prezado Gestor,\n\nRelatamos uma falha de conformidade no ativo *${currentAsset.idAtivo || currentAsset.id}* (${currentAsset.model || 'Placa'}) localizado no setor *${currentAsset.location} - ${currentAsset.subLocation}*.\n\n*Inconformidade:* Equipamento com status de [${statusResult}]. Teste e recargas pendentes devem ser efetuados.\n\n_Responsável:_ SPCI Compliance`;
      setGeneratedReportText(message);
      setAlertFormChannel('whatsapp');
      setPremiumAlert({
        show: true,
        title: 'Central de Emissão de Alertas Premium',
        message: 'Configure e despache alertas de vencimentos e relatórios para gestores de forma imediata via WhatsApp, Telegram ou Email.',
        type: 'critical',
        dispatchData: currentAsset
      });
    } else {
      triggerSuccessNotification('Inspeção Finalizada!', `Ativo ${currentAsset.idAtivo || currentAsset.id} homologado sem pendências.`);
    }

    setSelectedAssetForInspection(null);
    setInspectionNotes('');
    setPhotoPatrimonio(null);
    setPhotoFrontal(null);
  };

  // --- DESPACHO DE NOTIFICAÇÕES ---
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

  // --- VIEW DE ACESSO PENDENTE / SUSPENSO ---
  if (currentUser && userProfile && userProfile.status !== 'active') {
    return (
      <div className="bg-[#f4f6f8] min-h-screen text-slate-850 flex flex-col items-center justify-center p-6 text-center select-none font-mono relative overflow-hidden">
        <div className="max-w-md bg-white border border-slate-200 p-8 shadow-2xl space-y-6 relative rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 rounded-t-2xl"></div>
          
          <div className="w-16 h-16 bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center justify-center text-3xl mx-auto shadow-inner" aria-hidden="true">
            {userProfile.status === 'pending' ? '⏳' : '🚫'}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-wider text-red-600 uppercase">
              {userProfile.status === 'pending' ? 'Aguardando Liberação' : 'Acesso Suspenso'}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              {userProfile.status === 'pending' 
                ? `Olá, ${userProfile.name}! Seu cadastro foi mapeado no SPCI, mas requer liberação manual de um administrador para operar. Contate o administrador jackson602@gmail.com para ativar seu login.`
                : `Olá, ${userProfile.name}! Seu perfil de acesso foi suspenso temporariamente pela administração do SPCI.`}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-150 text-left space-y-1 rounded-xl">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase leading-none block">Credencial Logada</span>
            <p className="text-xs font-bold mt-1 text-slate-800 truncate">{userProfile.email}</p>
            <p className="text-[9px] text-red-600 font-bold mt-1.5 uppercase">Status: {userProfile.status}</p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleGoogleLogout}
              className="flex-grow py-2.5 text-[10px] uppercase font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 bg-white transition-all cursor-pointer rounded-xl"
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
              className="flex-grow py-2.5 text-[10px] uppercase font-bold text-white bg-red-600 hover:bg-red-500 shadow-md transition-all cursor-pointer rounded-xl border-none"
            >
              🔄 Verificar Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#f4f6f8] min-h-screen text-slate-800 relative overflow-hidden font-mono">
      
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
        <main className="flex-grow overflow-y-auto p-4 md:p-6 bg-[#f8fafc] relative">
          <div className="max-w-6xl mx-auto pb-20">
            {children}
          </div>
        </main>
      </div>

      {/* --- MODAIS DA APLICAÇÃO --- */}

      {/* 1. Modal de Vistoria/Inspeção NBR */}
      <AssetInspectionModal 
        isOpen={!!selectedAssetForInspection}
        asset={selectedAssetForInspection}
        onClose={() => setSelectedAssetForInspection(null)}
        onFinalize={handleFinalizeInspectionSubmit}
        inspectionNotes={inspectionNotes}
        setInspectionNotes={setInspectionNotes}
        photoPatrimonio={photoPatrimonio}
        photoFrontal={photoFrontal}
        onDemoDrop={handleDemoFileDrop}
      />

      {/* 2. Modal de Cadastro de Novo Ativo */}
      <AssetAddModal 
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
      />

      {/* 3. Modal de Histórico e Linha do Tempo */}
      <AssetHistoryModal 
        isOpen={!!selectedAssetForHistory}
        asset={selectedAssetForHistory}
        onClose={() => {
          setSelectedAssetForHistory(null);
        }}
      />

      {/* 4. Assistente de Inteligência Artificial Flutuante */}
      <SpciChatIa />

      {/* 7. Modal de Confirmação de Exclusão Premium */}
      <DeleteConfirmationModal />

      {/* 5. Leitor Óptico de QR Code Real via Câmera */}
      <AnimatePresence>
        {scanModal && (
          <QrCameraScanner
            isOpen={scanModal}
            onClose={() => setScanModal(false)}
            onScanSuccess={handleQrScanSuccess}
          />
        )}
      </AnimatePresence>

      {/* 6. Modal de Perfil do Usuário e Personalização de Logomarca */}
      <AnimatePresence>
        {showProfileModal && currentUser && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 15 }} 
              className="bg-white border border-slate-200 p-6 shadow-2xl max-w-md w-full relative overflow-hidden space-y-5 rounded-2xl text-slate-800"
              id="my-profile-logo-modal"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-600 rounded-t-2xl" aria-hidden="true"></div>

              <div className="flex justify-between items-start pt-1">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚙️</span> Configurações de Perfil
                  </h3>
                  <p className="text-slate-500 text-[10px] mt-0.5 font-sans">Identificação de vistorias e logotipo SPCI</p>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)} 
                  className="text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-350 bg-slate-50 px-2 py-0.5 text-xs font-bold cursor-pointer rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-150 p-3 flex items-center gap-3 rounded-xl shadow-xs">
                  {userProfile?.logoUrl ? (
                    <img 
                      src={userProfile.logoUrl} 
                      alt={`Logo corporativo de ${userProfile.name}`} 
                      className="w-10 h-10 object-contain border border-slate-200 bg-white p-0.5 rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs uppercase rounded-lg" aria-hidden="true">
                      {userProfile?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase leading-none block">Credencial Logada</span>
                    <p className="text-xs font-bold text-slate-700 truncate mt-1">{currentUser.email}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      Acesso: {userProfile?.role === 'admin' ? '🛡️ Administrador' : '👷 Técnico de Campo'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase text-slate-500">Nome / Razão Social</label>
                  <input 
                    type="text" 
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    placeholder="Nome do Técnico"
                    className="w-full bg-white border border-slate-200 focus:border-red-650 rounded-xl p-3 text-xs text-slate-800 focus:outline-none font-bold shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase text-slate-500">Link URL do Logotipo (.png / .jpg)</label>
                  <input 
                    type="text" 
                    value={profileLogoUrlInput}
                    onChange={(e) => setProfileLogoUrlInput(e.target.value)}
                    placeholder="URL do logotipo da empresa"
                    className="w-full bg-white border border-slate-200 focus:border-red-650 rounded-xl p-3 text-xs text-slate-800 focus:outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold uppercase text-slate-500">Logos Recomendadas</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: '🔥 SPCI Corp', url: 'https://images.unsplash.com/photo-1516216621161-8a5021e11e2f?w=100&auto=format&fit=crop&q=80' },
                      { name: '🏢 Seguridade', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&auto=format&fit=crop&q=80' },
                      { name: '🌳 EcoPrevenir', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=100&auto=format&fit=crop&q=80' }
                    ].map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setProfileLogoUrlInput(preset.url)}
                        className={`border rounded-xl p-1.5 text-center bg-slate-50 hover:bg-slate-100 flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          profileLogoUrlInput === preset.url ? 'border-red-600' : 'border-slate-200'
                        }`}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.name} 
                          className="w-6 h-6 object-cover bg-white shadow-xs rounded-lg" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[8px] font-bold text-slate-500 leading-none truncate max-w-full block">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-slate-150">
                <button 
                  onClick={() => {
                    setShowProfileModal(false);
                    setProfileNameInput(userProfile?.name || '');
                    setProfileLogoUrlInput(userProfile?.logoUrl || '');
                  }} 
                  className="flex-1 py-2 text-[10px] uppercase font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 bg-white cursor-pointer rounded-xl"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={() => handleUpdateLogoAndProfile(profileLogoUrlInput, profileNameInput)}
                  className="flex-1 py-2 text-[10px] uppercase font-bold text-white bg-red-600 hover:bg-red-500 shadow-md transition-all cursor-pointer rounded-xl border-none"
                >
                  SALVAR LOGO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Central de Emissão de Alertas Dispatch */}
      <AnimatePresence>
        {premiumAlert && premiumAlert.show && premiumAlert.dispatchData && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 15 }} 
              className="bg-white border border-slate-200 p-6 shadow-2xl max-w-lg w-full relative overflow-hidden rounded-2xl text-slate-800"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-600 rounded-t-2xl" aria-hidden="true"></div>
              
              <div className="flex gap-3 items-start mb-4">
                <span className="text-2xl" aria-hidden="true">🚨</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">{premiumAlert.title}</h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-sans leading-relaxed">{premiumAlert.message}</p>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-150 mt-4 text-xs">
                <div>
                  <span className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Selecione o Canal de Avisos</span>
                  <div className="flex gap-2">
                    {['whatsapp', 'telegram', 'email'].map((channel: any) => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => setAlertFormChannel(channel)}
                        className={`flex-grow py-2 text-[9px] uppercase font-bold text-center border transition-all cursor-pointer rounded-xl ${
                          alertFormChannel === channel ? 'bg-red-600 border-red-600 text-white font-bold' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {channel === 'whatsapp' && '💬 WhatsApp'}
                        {channel === 'telegram' && '✈️ Telegram'}
                        {channel === 'email' && '✉️ Email'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Contato de Destino</label>
                  <input 
                    type="text" 
                    value={alertTargetContact}
                    onChange={(e) => setAlertTargetContact(e.target.value)}
                    placeholder={alertFormChannel === 'email' ? 'e-mail do gestor' : 'Nº com DDI (Ex: 5511999998888)'}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-red-650 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Preview do Alerta Despachado</label>
                  <textarea 
                    value={generatedReportText}
                    onChange={(e) => setGeneratedReportText(e.target.value)}
                    rows={4}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-[10px] font-mono leading-relaxed text-slate-700 focus:outline-none focus:border-red-650 shadow-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6 justify-end border-t border-slate-150 pt-4">
                <button 
                  onClick={() => setPremiumAlert(null)} 
                  className="px-4 py-2 text-[10px] uppercase font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 bg-white cursor-pointer rounded-xl"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={dispatchAlertNotification} 
                  className="px-5 py-2 text-[10px] uppercase font-bold text-white bg-red-600 hover:bg-red-500 cursor-pointer rounded-xl active:scale-95 border-none shadow-md"
                >
                  DESPACHAR ALERTA 🚀
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Componente de Notificações Gerais de Sucesso */}
      <PremiumHUDAlert 
        isOpen={!!(premiumAlert && premiumAlert.show && !premiumAlert.dispatchData)}
        title={premiumAlert?.title || ''}
        message={premiumAlert?.message || ''}
        type={premiumAlert?.type === 'success' ? 'success' : premiumAlert?.type === 'critical' ? 'critical' : 'warning'}
        onClose={() => setPremiumAlert(null)}
      />
    </div>
  );
}
