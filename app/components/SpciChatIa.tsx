import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';

export default function SpciChatIa() {
  const {
    chatOpened,
    setChatOpened,
    chatMessages,
    setChatMessages,
    aiGenerating,
    setAiGenerating,
    extintores,
    hidrantes,
    sinalizacoes,
    iluminacoes
  } = useSpci();

  const [localPrompt, setLocalPrompt] = useState('');

  // Computa telemetria rápida em tempo real para alimentar o prompt de contexto
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

  const handleAssistantSend = async () => {
    if (!localPrompt.trim()) return;
    const msg = localPrompt;
    setChatMessages(prev => [...prev, { sender: 'user', text: msg }]);
    setLocalPrompt('');
    setAiGenerating(true);

    try {
      const response = await fetch('/api/gemini', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Responda de forma sucinta como o Inspe IA SPCI.
          Planta SPCI atual: ${totalAssets} ativos monitorados, ${totalVencidos} vencidos, ${totalAtencao} em atenção. Índice Geral Conformidade: ${compliancePercentage}%.
          Mensagem do operador: ${msg}`,
          systemInstruction: "Você é o assistente virtual Inspe IA SPCI. Responda em português, de forma breve, muito precisa, baseando-se estritamente em engenharia de segurança contra incêndios (NBR 12962, NBR 13434, NBR 13714). Mantenha as respostas curtas e objetivas."
        })
      });

      const data = await response.json();
      const text = data.text || "Sem resposta da central de dados Gemini.";
      setChatMessages(prev => [...prev, { sender: 'assistant', text }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: `Inspe IA (Modo SPCI Offline): Erro de rede ou indisponibilidade da API do Gemini.\n\nDica de segurança: Para extintores vencidos ou sem lacre, providencie recarga imediata sob NBR 12962. Para abrigos obstruídos, reordene o local de acordo com a NBR 13714.` 
      }]);
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none font-mono">
      <AnimatePresence>
        {chatOpened && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="bg-slate-900 border border-slate-800 shadow-2xl w-80 max-w-[90vw] md:w-96 flex flex-col h-96 overflow-hidden pointer-events-auto rounded-none"
            style={{ borderTop: '4px solid #ef4444' }}
          >
            {/* Header */}
            <div className="bg-slate-950 text-slate-100 p-4 flex justify-between items-center shrink-0 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🤖</span>
                <div>
                  <h4 className="font-bold text-xs text-slate-100 uppercase tracking-wider">Inspe IA Assistente</h4>
                  <p className="text-[9px] text-red-400">Normas NBR & Suporte de Campo</p>
                </div>
              </div>
              <button 
                onClick={() => setChatOpened(false)} 
                className="text-slate-400 hover:text-slate-100 font-bold border-none bg-transparent cursor-pointer text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/20 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950 text-xs">
              {chatMessages.map((m, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-none max-w-[90%] leading-relaxed ${
                    m.sender === 'user' 
                      ? 'bg-red-950/30 text-red-450 border border-red-900/40 ml-auto' 
                      : 'bg-slate-900 text-slate-300 mr-auto border border-slate-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ))}
              {aiGenerating && (
                <div className="bg-slate-900 text-slate-450 mr-auto rounded-none p-3 border border-slate-800 animate-pulse text-[10px]">
                  ⚡ PROCESSANDO CONSULTA NBR...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0">
              <input 
                type="text" 
                value={localPrompt} 
                onChange={(e) => setLocalPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAssistantSend(); }}
                placeholder="Pergunte sobre NBR de extintores/placas..." 
                className="flex-grow bg-slate-900 border border-slate-800 text-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-700 rounded-none" 
              />
              <button 
                onClick={handleAssistantSend} 
                className="bg-red-600 hover:bg-red-500 text-slate-950 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer active:scale-95"
              >
                ENVIAR
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão Flutuante */}
      <button 
        type="button"
        onClick={() => setChatOpened(!chatOpened)}
        className="w-12 h-12 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-200 rounded-none shadow-2xl flex flex-col items-center justify-center relative cursor-pointer pointer-events-auto active:scale-95"
        aria-label="Abrir Assistente de Inteligência Artificial"
      >
        <span className="text-xl leading-none" aria-hidden="true">🤖</span>
        <span className="text-[7px] font-bold uppercase tracking-widest text-red-400 mt-1">INSPE IA</span>
      </button>
    </div>
  );
}
