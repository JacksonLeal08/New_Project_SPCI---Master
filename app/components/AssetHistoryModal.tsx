import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AnyAsset, AssetStatus } from '@/lib/types';
import { useSpci } from '@/app/context/SpciContext';
import { idb } from '@/lib/indexedDb';

interface AssetHistoryModalProps {
  isOpen: boolean;
  asset: AnyAsset | null;
  onClose: () => void;
}

export default function AssetHistoryModal({ isOpen, asset, onClose }: AssetHistoryModalProps) {
  const {
    complianceLogs,
    setComplianceLogs,
    extintores,
    setExtintores,
    hidrantes,
    setHidrantes,
    sinalizacoes,
    setSinalizacoes,
    iluminacoes,
    setIluminacoes,
    saveAssetsList,
    triggerSuccessNotification,
    setChatOpened,
    setChatMessages,
    setAiGenerating
  } = useSpci();

  // --- ESTADOS LOCAIS DO MODAL ---
  const [showAddCustomHistory, setShowAddCustomHistory] = useState(false);
  const [customEventTitle, setCustomEventTitle] = useState('Recarga Manual NBR');
  const [customEventStatus, setCustomEventStatus] = useState('Conforme');
  const [customEventNotes, setCustomEventNotes] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'non_conforming' | 'manual'>('all');

  if (!isOpen || !asset) return null;

  const assetId = asset.idAtivo || asset.id;

  // --- BUILD DA TIMELINE ---
  const getAssetTimeline = () => {
    const autoLogs = complianceLogs
      .filter((log: any) => log.assetId === assetId)
      .map((log: any) => ({
        id: `auto-${log.date}-${log.time}`,
        date: log.date,
        time: log.time,
        type: 'inspection',
        title: 'Inspeção de Campo NBR',
        icon: log.status === 'Conforme' || log.status === 'Operacional' || log.status === 'Standby' ? '🟢' : '🚨',
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
    else if ((asset as any).lastRecarga) registerDate = (asset as any).lastRecarga;
    else if ((asset as any).lastInsp) registerDate = (asset as any).lastInsp;

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
    if ((asset as any).lastRecarga && (asset as any).lastRecarga !== registerDate) {
      otherMilestones.push({
        id: 'implicit-recarga',
        date: (asset as any).lastRecarga,
        time: '14:30:00',
        type: 'maintenance',
        title: 'Manutenção Preventiva de Recarga',
        icon: '🧯',
        status: 'Conforme',
        description: `Recarga periódica completa realizada por empresa homologada Inmetro. Lacre e inspeção de cilindro aprovados. Nova validade definida para ${(asset as any).validadeRecarga || '1 Ano'}.`,
        author: 'Oficina Credenciada'
      });
    }
    if ((asset as any).lastInsp && (asset as any).lastInsp !== registerDate) {
      otherMilestones.push({
        id: 'implicit-insp',
        date: (asset as any).lastInsp,
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
    
    // Remove duplicados pelo timestamp + status
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

  const timelineEvents = getAssetTimeline();

  // --- SUBMIT DE REGISTRO MANUAL ---
  const handleAddCustomHistoryEvent = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Se o status administrativo for diferente, atualizamos a lista de ativos correspondente
    if (customEventStatus !== asset.status) {
      if (extintores.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = extintores.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setExtintores(u);
        await saveAssetsList('extintores', u);
      }
      if (hidrantes.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = hidrantes.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setHidrantes(u);
        await saveAssetsList('hidrantes', u);
      }
      if (sinalizacoes.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = sinalizacoes.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setSinalizacoes(u);
        await saveAssetsList('sinalizacoes', u);
      }
      if (iluminacoes.some(x => (x.idAtivo || x.id) === assetId)) {
        const u = iluminacoes.map(x => (x.idAtivo || x.id) === assetId ? { ...x, status: customEventStatus } : x);
        setIluminacoes(u);
        await saveAssetsList('iluminacao', u);
      }
      asset.status = customEventStatus; // atualiza objeto em tela
    }

    triggerSuccessNotification('Histórico SPCI Atualizado!', `O evento "${customEventTitle}" foi gravado na linha do tempo.`);
    setCustomEventNotes('');
    setShowAddCustomHistory(false);
  };

  // --- GERADOR DE PARECER IA GEMINI ---
  const handleGenerateIAParecer = async () => {
    setChatOpened(true);
    setAiGenerating(true);
    
    setChatMessages(prev => [...prev, { 
      sender: 'user', 
      text: `Gere um rascunho de Parecer Técnico para o ativo ${assetId} (${(asset as any).model || 'equipamento'}) baseado no seu histórico.` 
    }]);

    try {
      const historyText = timelineEvents.map(e => `- [${e.date} ${e.time || ''}] ${e.title} (${e.status}): ${e.description}`).join('\n');
      
      const promptText = `Gere um rascunho de "Parecer Técnico de Engenharia de Incêndio" formal e detalhado para o seguinte ativo:
      ID: ${assetId}
      Tipo: ${asset.category || 'Equipamento SPCI'}
      Modelo: ${(asset as any).model || 'Padrão'}
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

  const conformingCount = timelineEvents.filter(
    (e) => e.status === 'Conforme' || e.status === 'Operacional' || e.status === 'Cadastro Ativo' || e.status === 'Standby'
  ).length;
  const complianceScore = timelineEvents.length > 0 ? Math.round((conformingCount / timelineEvents.length) * 100) : 100;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="w-full max-w-2xl border border-slate-800 bg-slate-900 shadow-2xl rounded-none relative my-8 font-mono text-xs text-slate-200 flex flex-col max-h-[85vh]"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" aria-hidden="true" />

        {/* Cabeçalho */}
        <div className="bg-slate-900/90 p-6 border-b border-slate-800 relative shrink-0">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 bg-slate-950 text-2xl border border-slate-800 flex items-center justify-center select-none rounded-none" aria-hidden="true">
              {asset.category === 'extintores' ? '🧯' : asset.category === 'hidrantes' ? '💧' : asset.category === 'sinalizacoes' ? '⚠️' : asset.category === 'iluminacao' ? '💡' : '⚙️'}
            </div>
            <div className="min-w-0 flex-grow">
              <span className="text-[9px] bg-red-950 text-red-400 border border-red-950 uppercase font-bold px-2 py-0.5 tracking-wider">
                {asset.category} • {assetId}
              </span>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mt-1 truncate">
                {(asset as any).model || 'Ativo SPCI'}
              </h3>
              <p className="text-slate-400 text-[10px] mt-0.5">
                📍 {asset.location} — {asset.subLocation || 'Sem subsetor'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-100 border border-slate-800 hover:border-slate-700 bg-slate-850 px-2 py-1 transition-all rounded-none cursor-pointer text-xs uppercase"
            >
              FECHAR ×
            </button>
          </div>
        </div>

        {/* Área de Informação e Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/40 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-900">
          
          {/* Métricas KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-none flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-850">Status Operacional</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  asset.status === 'Conforme' || asset.status === 'Operacional' || asset.status === 'Standby' ? 'bg-emerald-500' : 'bg-red-500'
                }`} aria-hidden="true"></span>
                <p className="font-bold text-xs text-slate-100 uppercase">{asset.status}</p>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-none flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-850">Total de Ocorrências</span>
              <p className="text-sm font-bold text-slate-100 mt-2">
                {timelineEvents.length} Registros
              </p>
            </div>

            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-none flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-850">Taxa de Conformidade</span>
              <p className="text-sm font-bold text-emerald-400 mt-2">
                {complianceScore}%
              </p>
            </div>
          </div>

          {/* Adição de Evento Manual */}
          <div className="border border-slate-800 bg-slate-950/30 p-4 rounded-none">
            {!showAddCustomHistory ? (
              <button 
                type="button"
                onClick={() => setShowAddCustomHistory(true)}
                className="w-full py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer rounded-none"
              >
                ➕ ADICIONAR REGISTRO MANUAL DE AUDITORIA
              </button>
            ) : (
              <form onSubmit={handleAddCustomHistoryEvent} className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <h4 className="text-[10px] font-bold uppercase text-slate-400">Novo Registro Administrativo</h4>
                  <button 
                    type="button" 
                    onClick={() => setShowAddCustomHistory(false)} 
                    className="text-[10px] text-red-400 font-bold uppercase border-none bg-transparent cursor-pointer font-mono"
                  >
                    Fechar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Título do Evento</label>
                    <select 
                      value={customEventTitle} 
                      onChange={(e) => setCustomEventTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-300 focus:outline-none"
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
                    <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Conformidade</label>
                    <select 
                      value={customEventStatus} 
                      onChange={(e) => setCustomEventStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="Conforme">🟢 Conforme / Operacional</option>
                      <option value="Vencido">🔴 Vencido / Fora da Validade</option>
                      <option value="Não Conforme">🔴 Não Conforme com a NBR</option>
                      <option value="Em Manutenção">Em Manutenção</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Notas Administrativas</label>
                  <textarea 
                    value={customEventNotes}
                    onChange={(e) => setCustomEventNotes(e.target.value)}
                    rows={2}
                    placeholder="Descrição técnica do procedimento efetuado, lacres anexados ou motivos administrativos..."
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-300 focus:outline-none font-mono"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-2 bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-emerald-450 transition-all cursor-pointer border-none rounded-none"
                >
                  REGISTRAR NA LINHA DO TEMPO
                </button>
              </form>
            )}
          </div>

          {/* Filtros da Linha de Tempo */}
          <div className="flex gap-2 border-b border-slate-800 pb-2">
            <button 
              type="button"
              onClick={() => setHistoryFilter('all')} 
              className={`px-3 py-1 text-[9px] font-bold uppercase transition-all border-none cursor-pointer rounded-none ${
                historyFilter === 'all' ? 'bg-red-600 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Todos ({timelineEvents.length})
            </button>
            <button 
              type="button"
              onClick={() => setHistoryFilter('non_conforming')} 
              className={`px-3 py-1 text-[9px] font-bold uppercase transition-all border-none cursor-pointer rounded-none ${
                historyFilter === 'non_conforming' ? 'bg-red-950 border border-red-900 text-red-400' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Não Conformidades ({timelineEvents.filter(e => e.status !== 'Conforme' && e.status !== 'Operacional' && e.status !== 'Standby' && e.status !== 'Cadastro Ativo').length})
            </button>
          </div>

          {/* Lista de Ocorrências */}
          <div className="relative border-l-2 border-slate-800 pl-6 ml-4 space-y-6">
            {timelineEvents
              .filter((event: any) => {
                if (historyFilter === 'non_conforming') {
                  return event.status !== 'Conforme' && event.status !== 'Operacional' && event.status !== 'Standby' && event.status !== 'Cadastro Ativo';
                }
                return true;
              })
              .map((event: any, index: number) => {
                const isOk = event.status === 'Conforme' || event.status === 'Operacional' || event.status === 'Cadastro Ativo' || event.status === 'Standby';
                return (
                  <div key={event.id || index} className="relative group">
                    <div className={`absolute -left-[35px] top-1 w-5 h-5 rounded-none flex items-center justify-center text-[10px] shadow-md border ${
                      isOk ? 'bg-emerald-950 border-emerald-800 text-emerald-450' : 'bg-red-950 border-red-950 text-red-400'
                    }`}>
                      {event.icon || '📝'}
                    </div>

                    <div className="bg-slate-950/20 border border-slate-850 p-4 transition-all hover:border-slate-800">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 pb-2 border-b border-slate-900">
                        <span className="text-[9px] text-slate-500">
                          📅 {event.date} • {event.time || '08:00:00'}
                        </span>
                        <span className={`inline-block px-2 py-0.5 text-[8px] font-bold uppercase border ${
                          isOk 
                            ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20' 
                            : 'text-red-400 border-red-950 bg-red-950/20'
                        }`}>
                          {event.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-200 text-xs mt-2 uppercase tracking-wide">
                        {event.title}
                      </h4>
                      <p className="text-slate-400 mt-1 leading-relaxed font-sans text-xs whitespace-pre-wrap">
                        {event.description}
                      </p>

                      <div className="mt-3 flex justify-between items-center border-t border-slate-900 pt-2 text-[9px] text-slate-500">
                        <span>👤 Responsável: <strong className="text-slate-400">{event.author || 'Técnico Autorizado'}</strong></span>
                        <span className="font-mono text-slate-650">#SPCI-{event.id?.slice(-4) || 'AUTO'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800 shrink-0 flex justify-between items-center gap-4">
          <button 
            type="button"
            onClick={handleGenerateIAParecer} 
            className="px-4 py-2.5 bg-gradient-to-r from-red-800 to-amber-700 hover:opacity-90 text-slate-100 font-bold text-[10px] uppercase tracking-wider transition-all rounded-none cursor-pointer border-none shadow-md"
          >
            🤖 GERAR PARECER TÉCNICO IA
          </button>
          <button 
            type="button"
            onClick={onClose} 
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] uppercase tracking-widest transition-all rounded-none cursor-pointer border border-slate-700"
          >
            FECHAR HISTÓRICO
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
