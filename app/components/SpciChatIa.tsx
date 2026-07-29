'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpci } from '@/app/context/SpciContext';
import { Bot, Send, X, Sparkles, Cpu, ShieldCheck } from 'lucide-react';

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
      // 1. Tenta comunicar com a API do DeepSeek-V3
      let response = await fetch('/api/deepseek', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Responda de forma sucinta como o Inspe IA SPCI.
          Planta SPCI atual: ${totalAssets} ativos monitorados, ${totalVencidos} vencidos, ${totalAtencao} em atenção. Índice Geral Conformidade: ${compliancePercentage}%.
          Mensagem do operador: ${msg}`,
          systemInstruction: "Você é o assistente virtual Inspe IA SPCI operando via motor DeepSeek-V3. Responda em português brasileiro, de forma breve, altamente precisa e técnica, baseando-se estritamente em engenharia de segurança contra incêndios (NBR 12693, NBR 12962, NBR 13434, NBR 13714, NBR 10897, NBR 15808, NBR 15809). Mantenha as respostas objetivas e formatadas em Markdown quando necessário."
        })
      });

      // 2. Se a rota do DeepSeek retornar erro, faz fallback de segurança para o Gemini
      if (!response.ok) {
        console.warn('Falha na API DeepSeek. Alternando para o Gemini...');
        response = await fetch('/api/gemini', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Responda de forma sucinta como o Inspe IA SPCI.
            Planta SPCI atual: ${totalAssets} ativos monitorados, ${totalVencidos} vencidos, ${totalAtencao} em atenção. Índice Geral Conformidade: ${compliancePercentage}%.
            Mensagem do operador: ${msg}`,
            systemInstruction: "Você é o assistente virtual Inspe IA SPCI. Responda em português brasileiro, de forma breve, muito precisa, baseando-se estritamente em engenharia de segurança contra incêndios."
          })
        });
      }

      const data = await response.json();
      const text = data.text || "Sem resposta da central de inteligência do SPCI.";
      setChatMessages(prev => [...prev, { sender: 'assistant', text }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: `Inspe IA (Modo SPCI Offline): Erro de conexão ou indisponibilidade temporária da API.\n\nDica de segurança: Para extintores vencidos ou sem lacre, providencie recarga imediata sob NBR 12962. Para abrigos obstruídos, reordene o local de acordo com a NBR 13714.` 
      }]);
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none font-mono select-none">
      <AnimatePresence>
        {chatOpened && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="bg-white border border-slate-200 shadow-2xl w-80 max-w-[92vw] sm:w-96 flex flex-col h-[480px] overflow-hidden pointer-events-auto rounded-2xl"
          >
            {/* CABEÇALHO - TEMA CLARO CORPORATIVO COM BADGE DEEPSEEK-V3 */}
            <div className="bg-red-700 text-white p-4 flex justify-between items-center shrink-0 border-b border-red-800 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-xs uppercase tracking-wider text-white font-['Hanken_Grotesk']">
                      Inspe IA Assistente
                    </h4>
                    <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>DeepSeek-V3</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-red-100 font-sans mt-0.5 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-red-200" />
                    Inteligência Especializada NBR
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setChatOpened(false)} 
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer font-bold border border-white/20"
                title="Fechar Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* LISTA DE MENSAGENS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70 scrollbar-thin scrollbar-thumb-slate-300 text-xs font-sans">
              {chatMessages.map((m, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-2xl max-w-[88%] leading-relaxed ${
                    m.sender === 'user' 
                      ? 'bg-red-50 text-red-900 border border-red-200 ml-auto font-bold shadow-2xs' 
                      : 'bg-white text-slate-900 mr-auto border border-slate-200 shadow-xs font-medium'
                  }`}
                >
                  {m.sender === 'assistant' && (
                    <div className="flex items-center gap-1 text-[9px] font-mono font-black text-red-700 uppercase mb-1">
                      <Cpu className="w-3 h-3 text-red-600" />
                      DeepSeek-V3 Engine
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ))}

              {aiGenerating && (
                <div className="bg-red-50 text-red-800 mr-auto rounded-2xl p-3 border border-red-200 animate-pulse text-[10.5px] font-mono font-black flex items-center gap-2 shadow-xs">
                  <Sparkles className="w-4 h-4 text-red-600 animate-spin" />
                  <span>⚡ CONSULTANDO DEEPSEEK-V3 & NBR...</span>
                </div>
              )}
            </div>

            {/* ENTRADA DE TEXTO */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex gap-2 shrink-0">
              <input 
                type="text" 
                value={localPrompt} 
                onChange={(e) => setLocalPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAssistantSend(); }}
                placeholder="Pergunte sobre NBR 12962, 13434, extintores..." 
                className="flex-grow bg-white border border-slate-300 text-slate-900 px-3.5 py-2 text-xs font-sans font-bold focus:outline-none focus:border-red-600 rounded-xl shadow-xs" 
              />
              <button 
                onClick={handleAssistantSend} 
                className="bg-red-700 hover:bg-red-800 text-white px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95 shadow-sm border-none flex items-center justify-center"
                title="Enviar Pergunta"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTÃO FLUTUANTE DE ABERTURA DO CHAT */}
      <button 
        type="button"
        onClick={() => setChatOpened(!chatOpened)}
        className="w-14 h-14 bg-red-700 hover:bg-red-800 text-white rounded-2xl shadow-xl border border-red-800 flex flex-col items-center justify-center relative cursor-pointer pointer-events-auto transition-transform active:scale-95"
        aria-label="Abrir Assistente de Inteligência Artificial DeepSeek"
        title="Inspe IA Assistente - DeepSeek V3"
      >
        <Bot className="w-6 h-6 text-white" />
        <span className="text-[7.5px] font-black uppercase tracking-widest text-red-100 mt-0.5 font-mono">INSPE IA</span>
      </button>
    </div>
  );
}
