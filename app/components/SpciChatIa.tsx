'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpci } from '@/app/context/SpciContext';
import { 
  Bot, Send, X, Sparkles, Cpu, ShieldCheck, ChevronRight, ChevronDown, 
  HelpCircle, Layers, Flame, Droplets, QrCode, AlertTriangle, Bell, Trash2, AlertCircle,
  MapPin, Navigation, Compass, Maximize2, Camera
} from 'lucide-react';
import WhatsNewModal from './WhatsNewModal';
import { CURRENT_SYSTEM_VERSION } from '@/lib/version';

interface SystemTopicCategory {
  category: string;
  icon: any;
  topics: { label: string; prompt: string }[];
}

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
  const [engineUsed, setEngineUsed] = useState<string>('DeepSeek-V3 Engine');
  const [openCategory, setOpenCategory] = useState<string | null>('APRESENTAÇÃO DO SISTEMA');
  const [showWhatsNew, setShowWhatsNew] = useState<boolean>(false);
  const [showConfirmClose, setShowConfirmClose] = useState<boolean>(false);

  // Telemetria em tempo real para alimentação de contexto
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

  // Mensagem inicial padrão
  const initialWelcomeMessage = {
    sender: 'assistant' as const,
    text: 'Olá Operador! Sou o assistente Inspe IA SPCI 24h. Selecione um dos tópicos do sistema acima ou digite sua dúvida no campo abaixo para esclarecimentos instantâneos!'
  };

  // Tópicos organizados do sistema (Estilo Elite Coach)
  const systemTopicCategories: SystemTopicCategory[] = [
    {
      category: 'APRESENTAÇÃO DO SISTEMA',
      icon: Layers,
      topics: [
        {
          label: 'O que o SPCI Master é capaz de fazer?',
          prompt: 'Apresente de forma clara o que a plataforma SPCI Master faz para gestão de extintores, hidrantes, sinalização e rotinas de segurança.'
        },
        {
          label: 'Como interpretar o Índice de Conformidade?',
          prompt: 'Explique como é calculado e o que significa o percentual de conformidade geral da planta.'
        }
      ]
    },
    {
      category: 'EXTINTORES & CHECKLISTS NBR',
      icon: Flame,
      topics: [
        {
          label: 'Resuma para leigo a NBR 12962 (Inspeção e Recarga)',
          prompt: 'resuma de forma para leigo a nbr 12962'
        },
        {
          label: 'Como realizar a inspeção mensal de extintores?',
          prompt: 'Quais os passos para realizar a inspeção mensal de um extintor segundo as normas ABNT?'
        },
        {
          label: 'Como funciona a Edição de Checklist de Vistoria?',
          prompt: 'Como posso customizar ou usar o modal de Edição de Checklist de Extintores no sistema?'
        },
        {
          label: 'Quais são as classes de fogo e extintores (NBR 12693)?',
          prompt: 'Explique a seleção do agente extintor ideal para cada classe de fogo (A, B, C, D, K) sob NBR 12693.'
        }
      ]
    },
    {
      category: 'HIDRANTES & CASA DE BOMBAS',
      icon: Droplets,
      topics: [
        {
          label: 'Como vistoriar abrigos e mangueiras (NBR 13714)?',
          prompt: 'O que deve ser verificado na inspeção de hidrantes, mangueiras aduchadas e chaves de engate?'
        },
        {
          label: 'Como registrar ocorrências na Casa de Bombas?',
          prompt: 'Como efetuar a checagem de pressão da bomba jockey e testes operacionais no módulo Casa de Bombas?'
        }
      ]
    },
    {
      category: 'RONDA DE CAMPO & QR CODE',
      icon: QrCode,
      topics: [
        {
          label: 'Como realizar inspeção via QR Code pelo celular?',
          prompt: 'Explique como funciona a leitura do QR Code do equipamento em campo usando o dispositivo móvel.'
        },
        {
          label: 'Como emitir etiqueta QR Code do equipamento?',
          prompt: 'Como gerar a URL e imprimir o QR Code de patrimônio para colagem física no extintor?'
        }
      ]
    },
    {
      category: 'MAPA OPERACIONAL & RASTREAMENTO GPS',
      icon: MapPin,
      topics: [
        {
          label: 'Como funciona o Mapa Operacional de Ativos?',
          prompt: 'Como funciona o Mapa Operacional de Ativos com geolocalização dos extintores e hidrantes?'
        },
        {
          label: 'Como traçar rota até o ativo e navegar no Google/Waze?',
          prompt: 'Como traçar rota até o extintor no mapa e usar a navegação com Google Maps e Waze?'
        },
        {
          label: 'Como capturar foto e extrair o GPS da imagem?',
          prompt: 'Como funciona a captura de fotos pela câmera do celular e a extração automática de GPS dos dados EXIF da foto?'
        },
        {
          label: 'Como usar o Modo Imersivo (Maximizar/Minimizar)?',
          prompt: 'Como funciona o botão de maximizar e minimizar para tela cheia no Mapa Operacional?'
        },
        {
          label: 'Quais são os 3 momentos de geocaptura de ativos?',
          prompt: 'Quais são os 3 momentos operacionais em que o SPCI captura a geolocalização do extintor (Estoque, Ronda e Inspeção)?'
        }
      ]
    },
    {
      category: 'DESPACHO & ALERTAS DE INCONFORMIDADE',
      icon: AlertTriangle,
      topics: [
        {
          label: 'Como disparar alertas e relatórios de emergência?',
          prompt: 'Como utilizar o módulo Disparo de Alertas e Notificações para equipamentos vencidos ou com vazamento?'
        }
      ]
    }
  ];

  // Gerador de resposta inteligente local NBR e Sistema SPCI (à prova de falhas)
  const getSmartLocalNbrAnswer = (promptText: string): string => {
    const p = promptText.toLowerCase();

    if (p.includes('exif') || p.includes('foto') || p.includes('câmera') || p.includes('camera') || p.includes('extra')) {
      return `📸 **Extração Automática de GPS por Fotos (EXIF):**\n\nAo tirar ou anexar uma foto de um extintor:\n\n1. **Detecção Instantânea:** O SPCI lê automaticamente os metadados EXIF gravados pelo sensor da câmera do smartphone no corpo do arquivo de imagem (JPEG/TIFF).\n2. **Coordenadas Precisas:** As tags de Latitude e Longitude são convertidas para graus decimais e salvas diretamente na ficha do ativo.\n3. **Sem Conflito:** Caso a foto não possua coordenadas (ex.: enviada com compressão pelo WhatsApp), o sistema aciona transparentemente o GPS da antena do celular ou mantém a posição anterior sem emitir erros.\n4. **Origem Rastreada:** O ativo recebe a tag 'FOTO_EXIF' indicando a auditoria de origem.`;
    }

    if (p.includes('rota') || p.includes('waze') || p.includes('navegar') || p.includes('google maps') || p.includes('caminho')) {
      return `🧭 **Navegação e Rotas até o Ativo:**\n\nNo **Mapa Operacional**, ao tocar ou clicar no pin de qualquer extintor cadastrado:\n\n1. O popup exibe o botão **'Traçar Rota / Ir até o Ativo'**.\n2. É aberto um menu seletor permitindo escolher entre **Google Maps** e **Waze**.\n3. O aplicativo abre o trajeto passo a passo da sua localização atual exata até o extintor, facilitando a ronda dos brigadistas e técnicos em plantas industriais extensas.`;
    }

    if (p.includes('maximizar') || p.includes('minimizar') || p.includes('imersivo') || p.includes('tela cheia')) {
      return `🖥️ **Modo Imersivo (Tela Cheia) do Mapa:**\n\nO Mapa Operacional conta com o botão **Maximizar/Minimizar (Tela Cheia)** no canto superior do painel:\n\n• **Maximizar:** Expande o mapa por toda a área visual do navegador, com visualização ampla dos pins de ativos, filtros dinâmicos e caminhos de vistoria.\n• **Minimizar:** Retorna à visualização integrada no dashboard sem perder o zoom, o foco ou os filtros selecionados.`;
    }

    if (p.includes('3 momentos') || p.includes('momentos de geocaptura') || p.includes('captura') || (p.includes('gps') && p.includes('ativo'))) {
      return `📍 **Os 3 Momentos de Geocaptura no SPCI:**\n\nO sistema garante que nenhum ativo fique sem posição através de 3 camadas operacionais:\n\n1. **Estoque / Cadastro Inicial:** Ao receber novos lotes de extintores, o almoxarifado/técnico pode capturar a posição do lote ou inserir uma foto com GPS EXIF.\n2. **Ronda do Brigadista:** Durante a ronda de inspeção preventiva, a leitura do QR Code ou foto de conferência grava a coordenada atual do ativo.\n3. **Inspeção / Vistoria Formal:** No fechamento do checklist mensal NBR 12962, a geolocalização é revalidada e associada ao relatório de conformidade.`;
    }

    if (p.includes('mapa') || p.includes('operacional')) {
      return `🗺️ **Mapa Operacional SPCI:**\n\nO Mapa Operacional consolida toda a segurança contra incêndio geograficamente:\n\n• **Plotagem em Tempo Real:** Extintores e hidrantes são plotados com ícones coloridos baseados no status (Verde = Conforme, Vermelho = Vencido/Crítico, Amarelo = Atenção).\n• **Visualização Noturna e Diurna:** Camadas satélite, terreno e híbrida com nomes claros de ruas e localidades.\n• **Fotos e Zoom:** Popup com visualizador de fotos do ativo e ferramenta de zoom para inspeção detalhada de avarias.\n• **Rotas Rápidas:** Link direto para navegação via Waze ou Google Maps.`;
    }

    if (p.includes('capaz') || p.includes('apresente') || p.includes('sistema')) {
      return `🚀 **O que o SPCI Master é capaz de fazer?**\n\nO SPCI Master é a plataforma definitiva de Engenharia de Segurança Contra Incêndios para plantas industriais e corporativas:\n\n• **Gestão de Inventário:** Controle unificado de Extintores, Hidrantes, Sinalização NBR, Iluminação de Emergência e Casa de Bombas.\n• **Mapa Operacional & GPS:** Plotagem geoespacial de ativos, rotas via Waze/Google Maps, extração de GPS EXIF de fotos e modo imersivo.\n• **Vistoria por QR Code:** Leitura instantânea via celular no campo para checklist automatizado.\n• **Conformidade em Tempo Real:** Cálculo de índices, alertas de recarga vencida e testes hidrostáticos (NBR 12962 e NBR 13714).\n• **Assistente com IA 24h:** Esclarecimento de dúvidas normativas e emissão de orientações corretivas em campo.`;
    }

    if (p.includes('12962')) {
      return `📜 **Resumo NBR 12962 (Manutenção & Inspeção de Extintores):**\n\nA NBR 12962 regulamenta como manter os extintores operacionais. Em termos simples para leigos:\n\n1. **Inspeção Mensal (Visual):** Verifique se o lacre está inteiro, se o manômetro está na faixa verde e se o extintor está desobstruído.\n2. **Manutenção Anual (1º Nível):** Empresa credenciada examina peças internas, substitui componentes e renova o selo do Inmetro.\n3. **Teste de 5 Anos (2º Nível - Teste Hidrostático):** O cilindro é testado com pressão de água para garantir que não vá estourar.\n\n⚠️ *Atenção:* Extintor acionado (mesmo parcialmente) ou com perda de pressão precisa de recarga imediata!`;
    }

    if (p.includes('12693') || p.includes('classe')) {
      return `📜 **Resumo NBR 12693 (Instalação e Escolha de Extintores):**\n\nDetermina qual extintor usar e onde colocar:\n\n• **Classe A (Sólidos / Madeira / Papel):** Extintores de Água (AP) ou Espuma.\n• **Classe B (Líquidos Inflamáveis / Tintas):** Pó Químico (PQS) ou CO₂.\n• **Classe C (Equipamentos Elétricos Energizados):** CO₂ ou Pó Químico (nunca água!).\n• **Classe K (Cozinhas / Óleo de Fritura):** Acetato de Potássio.\n\n📏 **Regras de Instalação:** Alça de transporte a no máximo 1,60 m do chão e distância a caminhar ≤ 20 metros.`;
    }

    if (p.includes('13434') || p.includes('placa') || p.includes('sinaliza')) {
      return `📜 **Resumo NBR 13434 (Sinalização Fotoluminescente):**\n\nRegula as placas de emergência que brilham no escuro:\n\n• As placas devem ser instaladas acima dos equipamentos (altura padrão ~1,80 m do piso).\n• Devem ser fotoluminescentes para continuar visíveis em caso de falta de energia.\n• Devem indicar rotas de fuga, saídas de emergência e localização de extintores e hidrantes.`;
    }

    if (p.includes('13714') || p.includes('hidrante')) {
      return `📜 **Resumo NBR 13714 (Sistemas de Hidrantes):**\n\nExige que os abrigos de hidrante permaneçam desobstruídos, com mangueiras aduchadas ou em ziguezague, mangotes sem rachaduras, chaves de engate Storz e esguichos reguláveis prontos para uso imediato.`;
    }

    if (p.includes('qr code') || p.includes('celular') || p.includes('ronda')) {
      return `📱 **Vistoria via QR Code no Celular:**\n\n1. Abra o menu **QR Code de Inspeção** no cabeçalho do sistema.\n2. Aponte a câmera do seu smartphone para o QR Code colado no extintor ou hidrante.\n3. O sistema abre diretamente a ficha do equipamento com os itens do checklist ABNT para preenchimento com 1 clique!`;
    }

    return `🤖 **Inspe IA (Assistente SPCI NBR):**\n\nEntendido! Para a pergunta "${promptText}", aqui está a orientação técnica baseada no padrão ABNT da sua planta:\n\n• **Conformidade Atual:** ${compliancePercentage}% (${totalAssets} ativos monitorados, ${totalVencidos} pendências).\n• **Extintores (NBR 12962):** Lacre íntegro, ponteiro do manômetro no verde e validade anual em dia.\n• **Sinalização (NBR 13434):** Placas fotoluminescentes instaladas acima dos equipamentos e desobstruídas.\n\nComo posso ajudar detalhando algum quesito específico para a sua vistoria hoje?`;
  };

  const handleSendPrompt = async (promptToSend?: string) => {
    const textToQuery = promptToSend || localPrompt;
    if (!textToQuery.trim()) return;

    setChatMessages(prev => [...prev, { sender: 'user', text: textToQuery }]);
    if (!promptToSend) setLocalPrompt('');
    setAiGenerating(true);

    let finalAnswer = '';
    let usedEngineName = 'DeepSeek-V3 Engine';

    try {
      const dsRes = await fetch('/api/deepseek', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Responda de forma sucinta como o Inspe IA SPCI.
          Planta SPCI atual: ${totalAssets} ativos monitorados, ${totalVencidos} vencidos, ${totalAtencao} em atenção. Índice Geral Conformidade: ${compliancePercentage}%.
          Mensagem do operador: ${textToQuery}`,
          systemInstruction: "Você é o assistente virtual Inspe IA SPCI operando via motor DeepSeek-V3. Responda em português brasileiro, de forma breve, altamente precisa e técnica, baseando-se estritamente em engenharia de segurança contra incêndios (NBR 12693, NBR 12962, NBR 13434, NBR 13714, NBR 10897, NBR 15808, NBR 15809) e nas funcionalidades do sistema SPCI Master (Mapa Operacional com geolocalização de ativos, rotas via Google Maps e Waze, modo imersivo tela cheia, captura de fotos com câmera do dispositivo e extração automática de GPS a partir dos metadados EXIF da imagem). Mantenha as respostas objetivas e formatadas em Markdown quando necessário."
        })
      });

      if (dsRes.ok) {
        const dsData = await dsRes.json();
        if (dsData.text && !dsData.error) {
          finalAnswer = dsData.text;
          usedEngineName = 'DeepSeek-V3 Engine';
        }
      }

      if (!finalAnswer) {
        const gemRes = await fetch('/api/gemini', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Responda de forma sucinta como o Inspe IA SPCI.
            Planta SPCI atual: ${totalAssets} ativos monitorados, ${totalVencidos} vencidos, ${totalAtencao} em atenção. Índice Geral Conformidade: ${compliancePercentage}%.
            Mensagem do operador: ${textToQuery}`,
            systemInstruction: "Você é o assistente virtual Inspe IA SPCI. Responda em português brasileiro, de forma breve, muito precisa, baseando-se estritamente em engenharia de segurança contra incêndios e nas funcionalidades do sistema SPCI Master (Mapa Operacional, rotas Waze/Google Maps, fotos com extração de GPS EXIF e modo tela cheia)."
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

      if (!finalAnswer) {
        finalAnswer = getSmartLocalNbrAnswer(textToQuery);
        usedEngineName = 'Base NBR Inteligente SPCI';
      }

      setEngineUsed(usedEngineName);
      setChatMessages(prev => [...prev, { sender: 'assistant', text: finalAnswer }]);
    } catch (e: any) {
      const fallbackText = getSmartLocalNbrAnswer(textToQuery);
      setEngineUsed('Base NBR Inteligente SPCI');
      setChatMessages(prev => [...prev, { sender: 'assistant', text: fallbackText }]);
    } finally {
      setAiGenerating(false);
    }
  };

  // Solicita confirmação de fechamento
  const handleRequestClose = () => {
    setShowConfirmClose(true);
  };

  // Executa fechamento e limpeza de dados
  const handleConfirmCloseAndClear = () => {
    setChatMessages([initialWelcomeMessage]);
    setShowConfirmClose(false);
    setChatOpened(false);
  };

  return (
    <>
      {/* ALERTA DE NOVIDADES DA VERSÃO */}
      <WhatsNewModal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} />

      {/* MODAL DE CONFIRMAÇÃO DE FECHAMENTO COM AVISO DE LIMPEZA DE DADOS (Z-INDEX 100 PARA FICAR SOBRE O DRAWER) */}
      <AnimatePresence>
        {showConfirmClose && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md font-sans pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] max-w-md w-full p-6 space-y-4 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 rounded-t-3xl" />
              
              <div className="flex items-center gap-3 text-red-700 pt-1">
                <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase font-['Hanken_Grotesk'] text-slate-900">
                    Limpar & Fechar Assistente?
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Sessão de IA 24h SPCI
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 text-xs text-amber-900 font-medium leading-relaxed shadow-2xs">
                ⚠️ <strong>Aviso de Limpeza:</strong> Ao fechar o Agente de IA 24h, todo o histórico das consultas atuais será <strong>completamente limpo</strong> para manter a privacidade e o desempenho da próxima vistoria.
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmClose(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                >
                  Continuar Consultando
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCloseAndClear}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white text-xs font-black uppercase tracking-wider active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Sim, Fechar e Limpar</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWER LATERAL DESLIZANTE À DIREITA (ESTILO ELITE COACH) */}
      <AnimatePresence>
        {chatOpened && (
          <>
            {/* BACKDROP PARA FECHAR AO CLICAR FORA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleRequestClose}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 pointer-events-auto"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] md:w-[460px] bg-white border-l border-slate-200 shadow-2xl flex flex-col font-sans pointer-events-auto"
            >
              {/* CABEÇALHO DO AGENTE DE IA 24H */}
              <div className="bg-gradient-to-r from-red-700 via-red-800 to-slate-900 text-white p-4 shrink-0 border-b border-red-900 shadow-md">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs uppercase tracking-wider text-white font-['Hanken_Grotesk']">
                          AGENTE DE IA 24H
                        </h4>
                        <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>DEEPSEEK V3 + GEMINI</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-red-100 mt-0.5 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>MOTOR ATIVO · NBR ABNT</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botão de Ver Versão */}
                    <button
                      onClick={() => setShowWhatsNew(true)}
                      className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono font-black px-2.5 py-1 rounded-lg border border-white/20 transition-all flex items-center gap-1 cursor-pointer"
                      title="Ver Novidades da Versão"
                    >
                      <Bell className="w-3 h-3 text-red-200" />
                      <span>{CURRENT_SYSTEM_VERSION.version}</span>
                    </button>

                    <button 
                      onClick={handleRequestClose} 
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20"
                      title="Fechar e Limpar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 bg-white/10 rounded-xl p-2.5 border border-white/10 text-[11px] text-red-100 font-medium leading-snug">
                  Selecione um tópico abaixo para explicações instantâneas ou digite sua dúvida personalizada no campo de busca.
                </div>
              </div>

              {/* CORPO DO DRAWER: TÓPICOS DO SISTEMA + CONVERSA */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70 scrollbar-thin scrollbar-thumb-slate-300">
                
                {/* TÓPICOS DO SISTEMA (ESTILO ELITE COACH) */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
                    <HelpCircle className="w-3.5 h-3.5 text-red-700" />
                    <span>TÓPICOS DO SISTEMA & NBR (AJUDA RÁPIDA)</span>
                  </h5>

                  <div className="space-y-1.5">
                    {systemTopicCategories.map((cat, idx) => {
                      const IconComp = cat.icon;
                      const isOpen = openCategory === cat.category;
                      return (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                          <button
                            onClick={() => setOpenCategory(isOpen ? null : cat.category)}
                            className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <IconComp className="w-3.5 h-3.5 text-red-700" />
                              <span className="text-[11px] font-black text-slate-800 uppercase font-mono tracking-tight">
                                {cat.category}
                              </span>
                            </div>
                            {isOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-slate-100 bg-slate-50/80 p-2 space-y-1"
                              >
                                {cat.topics.map((t, tIdx) => (
                                  <button
                                    key={tIdx}
                                    onClick={() => handleSendPrompt(t.prompt)}
                                    className="w-full p-2 rounded-lg bg-white border border-slate-200/80 hover:border-red-300 text-left transition-all hover:bg-red-50/40 text-xs text-slate-700 font-bold flex items-center justify-between group cursor-pointer"
                                  >
                                    <span>{t.label}</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-700 transition-colors shrink-0 ml-2" />
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* DIVISOR DE CONVERSA */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                  <div className="relative flex justify-center text-[9px] font-mono font-black uppercase">
                    <span className="bg-slate-100 px-2 text-slate-400 rounded-full">Histórico da Consulta</span>
                  </div>
                </div>

                {/* MENSAGENS DO CHAT */}
                <div className="space-y-3">
                  {chatMessages.map((m, i) => (
                    <div 
                      key={i} 
                      className={`p-3.5 rounded-2xl leading-relaxed text-xs ${
                        m.sender === 'user' 
                          ? 'bg-red-50 text-red-900 border border-red-200 ml-auto font-bold shadow-2xs max-w-[88%]' 
                          : 'bg-white text-slate-900 mr-auto border border-slate-200 shadow-xs font-medium w-full'
                      }`}
                    >
                      {m.sender === 'assistant' && (
                        <div className="flex items-center gap-1 text-[9px] font-mono font-black text-red-700 uppercase mb-1.5 border-b border-slate-100 pb-1">
                          <Cpu className="w-3 h-3 text-red-600" />
                          <span>{engineUsed}</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                  ))}

                  {aiGenerating && (
                    <div className="bg-red-50 text-red-800 mr-auto rounded-2xl p-3 border border-red-200 animate-pulse text-[10.5px] font-mono font-black flex items-center gap-2 shadow-xs">
                      <Sparkles className="w-4 h-4 text-red-600 animate-spin" />
                      <span>⚡ PROCESSANDO COM IA & CONSULTANDO NBR...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ENTRADA DE PERGUNTA NO RODAPÉ */}
              <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={localPrompt} 
                  onChange={(e) => setLocalPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendPrompt(); }}
                  placeholder="Qual sua dúvida sobre o SPCI Master ou NBR?" 
                  className="flex-grow bg-white border border-slate-300 text-slate-900 px-3.5 py-2.5 text-xs font-sans font-bold focus:outline-none focus:border-red-600 rounded-xl shadow-xs" 
                />
                <button 
                  onClick={() => handleSendPrompt()} 
                  className="bg-red-700 hover:bg-red-800 text-white px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
                  title="Enviar Pergunta"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
