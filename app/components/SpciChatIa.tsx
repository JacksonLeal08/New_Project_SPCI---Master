'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpci } from '@/app/context/SpciContext';
import { Bot, Send, X, Sparkles, Cpu, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
  const [engineUsed, setEngineUsed] = useState<string>('DeepSeek-V3');

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

  // Gerador de resposta inteligente local NBR (à prova de falhas)
  const getSmartLocalNbrAnswer = (promptText: string): string => {
    const p = promptText.toLowerCase();

    if (p.includes('12962')) {
      return `📜 **Resumo NBR 12962 (Manutenção & Inspeção de Extintores):**\n\nA NBR 12962 regulamenta como manter os extintores operacionais. Em termos simples para leigos:\n\n1. **Inspeção Mensal (Visual):** Verifique se o lacre está inteiro, se o manômetro está na faixa verde e se o extintor está desobstruído.\n2. **Manutenção Anual (1º Nível):** Empresa credenciada examina peças internas, substitui componentes e renova o selo do Inmetro.\n3. **Teste de 5 Anos (2º Nível - Teste Hidrostático):** O cilindro é testado com pressão de água para garantir que não vá estourar.\n\n⚠️ *Atenção:* Extintor acionado (mesmo parcialmente) ou com perda de pressão precisa de recarga imediata!`;
    }

    if (p.includes('12693')) {
      return `📜 **Resumo NBR 12693 (Instalação e Escolha de Extintores):**\n\nDetermina qual extintor usar e onde colocar:\n\n• **Classe A (Sólidos / Madeira / Papel):** Extintores de Água (AP) ou Espuma.\n• **Classe B (Líquidos Inflamáveis / Tintas):** Pó Químico (PQS) ou CO₂.\n• **Classe C (Equipamentos Elétricos Energizados):** CO₂ ou Pó Químico (nunca água!).\n• **Classe K (Cozinhas / Óleo de Fritura):** Acetato de Potássio.\n\n📏 **Regras de Instalação:** Alça de transporte a no máximo 1,60 m do chão e distância a caminhar ≤ 20 metros.`;
    }

    if (p.includes('13434') || p.includes('placa') || p.includes('sinaliza')) {
      return `📜 **Resumo NBR 13434 (Sinalização Fotoluminescente):**\n\nRegula as placas de emergência que brilham no escuro:\n\n• As placas devem ser instaladas acima dos equipamentos (altura padrão ~1,80 m do piso).\n• Devem ser fotoluminescentes para continuar visíveis em caso de falta de energia.\n• Devem indicar rotas de fuga, saídas de emergência e localização de extintores e hidrantes.`;
    }

    if (p.includes('13714') || p.includes('hidrante')) {
      return `📜 **Resumo NBR 13714 (Sistemas de Hidrantes):**\n\nExige que os abrigos de hidrante permaneçam desobstruídos, com mangueiras aduchadas ou em ziguezague, mangotes sem rachaduras, chaves de engate Storz e esguichos reguláveis prontos para uso imediato.`;
    }

    if (p.includes('15808') || p.includes('15809') || p.includes('carreta') || p.includes('portat')) {
      return `📜 **Resumo NBR 15808 & NBR 15809 (Extintores Portáteis e Sobre Rodas):**\n\n• **NBR 15808:** Aplica-se aos extintores portáteis de até 20 kg (portados manualmente).\n• **NBR 15809:** Aplica-se a carretas (extintores sobre rodas > 20 kg), exigindo mangueira longa (≥ 5m) e travamento de chassi.`;
    }

    return `🤖 **Inspe IA (Assistente SPCI NBR):**\n\nEntendido! Para a pergunta "${promptText}", aqui está a orientação técnica baseada no padrão ABNT da sua planta:\n\n• **Conformidade Atual:** ${compliancePercentage}% (${totalAssets} ativos monitorados, ${totalVencidos} pendências).\n• **Extintores (NBR 12962):** Lacre íntegro, ponteiro do manômetro no verde e validade anual em dia.\n• **Sinalização (NBR 13434):** Placas fotoluminescentes instaladas acima dos equipamentos e desobstruídas.\n\nComo posso ajudar detalhando algum quesito específico para a sua vistoria hoje?`;
  };

  const handleAssistantSend = async () => {
    if (!localPrompt.trim()) return;
    const msg = localPrompt;
    setChatMessages(prev => [...prev, { sender: 'user', text: msg }]);
    setLocalPrompt('');
    setAiGenerating(true);

    let finalAnswer = '';
    let usedEngineName = 'DeepSeek-V3';

    try {
      // 1. Tenta comunicar com a API do DeepSeek-V3
      const dsRes = await fetch('/api/deepseek', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Responda de forma sucinta como o Inspe IA SPCI.
          Planta SPCI atual: ${totalAssets} ativos monitorados, ${totalVencidos} vencidos, ${totalAtencao} em atenção. Índice Geral Conformidade: ${compliancePercentage}%.
          Mensagem do operador: ${msg}`,
          systemInstruction: "Você é o assistente virtual Inspe IA SPCI operando via motor DeepSeek-V3. Responda em português brasileiro, de forma breve, altamente precisa e técnica, baseando-se estritamente em engenharia de segurança contra incêndios (NBR 12693, NBR 12962, NBR 13434, NBR 13714, NBR 10897, NBR 15808, NBR 15809). Mantenha as respostas objetivas e formatadas em Markdown quando necessário."
        })
      });

      if (dsRes.ok) {
        const dsData = await dsRes.json();
        if (dsData.text && !dsData.error) {
          finalAnswer = dsData.text;
          usedEngineName = 'DeepSeek-V3 Engine';
        }
      }

      // 2. Fallback para Gemini 2.0 Flash se a API do DeepSeek falhou
      if (!finalAnswer) {
        console.warn('Alternando para Gemini 2.0 Flash...');
        const gemRes = await fetch('/api/gemini', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Responda de forma sucinta como o Inspe IA SPCI.
            Planta SPCI atual: ${totalAssets} ativos monitorados, ${totalVencidos} vencidos, ${totalAtencao} em atenção. Índice Geral Conformidade: ${compliancePercentage}%.
            Mensagem do operador: ${msg}`,
            systemInstruction: "Você é o assistente virtual Inspe IA SPCI. Responda em português brasileiro, de forma breve, muito precisa, baseando-se estritamente em engenharia de segurança contra incêndios."
          })
        });

        if (gemRes.ok) {
          const gemData = await gemRes.json();
          if (gemData.text && !gemData.error) {
            finalAnswer = gemData.text;
            usedEngineName = 'Gemini 2.0 Flash';
          }
        }
      }

      // 3. Fallback Garantido NBR Local (Smart Offline Engine) se ambas APIs falharem
      if (!finalAnswer) {
        finalAnswer = getSmartLocalNbrAnswer(msg);
        usedEngineName = 'Base NBR Inteligente SPCI';
      }

      setEngineUsed(usedEngineName);
      setChatMessages(prev => [...prev, { sender: 'assistant', text: finalAnswer }]);
    } catch (e: any) {
      const fallbackText = getSmartLocalNbrAnswer(msg);
      setEngineUsed('Base NBR Inteligente SPCI');
      setChatMessages(prev => [...prev, { sender: 'assistant', text: fallbackText }]);
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
                    <div className="flex items-center gap-1 text-[9px] font-mono font-black text-red-700 uppercase mb-1 border-b border-slate-100 pb-1">
                      <Cpu className="w-3 h-3 text-red-600" />
                      {engineUsed}
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
