'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, ExternalLink, ShieldCheck, CheckCircle2, FileText, Info } from 'lucide-react';

interface NormasExtintorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface NormaInfo {
  id: string;
  code: string;
  title: string;
  description: string;
  link: string;
  topics: {
    title: string;
    content: string;
  }[];
}

export const NORMAS_EXTINTORES: NormaInfo[] = [
  {
    id: 'nbr-12693',
    code: 'NBR 12693',
    title: 'Sistemas de proteção por extintores de incêndio',
    description: 'Define os critérios para dimensionamento, escolha e instalação de extintores em edificações e áreas de risco.',
    link: 'https://www.abntcatalogo.com.br/norma.aspx?ID=3496',
    topics: [
      {
        title: 'Seleção do agente extintor',
        content: 'Baseada nas classes de fogo predominantes no local — Classe A (sólidos) → água ou espuma; B (líquidos) → pó BC, CO₂ ou espuma; C (elétricos) → CO₂ ou pó BC; D (pirofóricos) → pó especial; K (óleos/gorduras) → acetato de potássio.'
      },
      {
        title: 'Distribuição e quantidade',
        content: 'Atende à capacidade extintora mínima por área e distância máxima do operador (≤ 20 m risco médio/baixo, ≤ 25 m risco alto). Ao menos um extintor por pavimento é obrigatório.'
      },
      {
        title: 'Instalação',
        content: 'Equipamentos sinalizados, desobstruídos e visíveis. Alça de transporte ≤ 1,60 m do piso; parte inferior ≥ 0,10 m do chão. Abrigos exigem sinalização do tipo de extintor.'
      }
    ]
  },
  {
    id: 'nbr-12962',
    code: 'NBR 12962',
    title: 'Inspeção, manutenção e recarga em extintores',
    description: 'Estabelece procedimentos e periodicidade para manter os extintores operacionais.',
    link: 'https://www.abntcatalogo.com.br/norma.aspx?ID=3619',
    topics: [
      {
        title: 'Inspeção visual mensal',
        content: 'Verificação de lacre, manômetro na faixa verde, integridade física, sinalização e acesso.'
      },
      {
        title: 'Manutenção anual (1º nível)',
        content: 'Exame externo/interno, pesagem, verificação de componentes, troca de peças e recarga se necessário. Executada por empresa certificada.'
      },
      {
        title: 'Manutenção 2º nível (5 anos)',
        content: 'Teste hidrostático no cilindro, inspeção de válvulas, mangueiras e acessórios.'
      },
      {
        title: 'Recarga',
        content: 'Obrigatória após uso (mesmo parcial), abertura para manutenção ou perda de carga indicada.'
      },
      {
        title: 'Registros',
        content: 'Etiqueta de controle com empresa, data, nível e validade; histórico em livro de registro ou sistema.'
      }
    ]
  },
  {
    id: 'nbr-15808',
    code: 'NBR 15808',
    title: 'Extintores portáteis',
    description: 'Aplica-se a equipamentos com massa total ≤ 20 kg, transportados manualmente.',
    link: 'https://www.abntcatalogo.com.br/norma.aspx?ID=56094',
    topics: [
      {
        title: 'Construção',
        content: 'Resistência mecânica do cilindro, válvula e conjunto mangueira-difusor.'
      },
      {
        title: 'Ensaios de tipo',
        content: 'Resistência à pressão, estanqueidade, disparo, vibração e corrosão.'
      },
      {
        title: 'Marcação',
        content: 'Instruções de uso, classe de fogo, pictogramas, validade e rastreabilidade do cilindro.'
      }
    ]
  },
  {
    id: 'nbr-15809',
    code: 'NBR 15809',
    title: 'Extintores sobre rodas',
    description: 'Equipamentos com massa total > 20 kg, montados sobre chassi com rodas.',
    link: 'https://www.abntcatalogo.com.br/norma.aspx?ID=56095',
    topics: [
      {
        title: 'Estabilidade',
        content: 'Manobrabilidade e resistência estrutural do conjunto rodante.'
      },
      {
        title: 'Mangueira de descarga',
        content: 'Comprimento mínimo ≥ 5 m e suporte adequado.'
      },
      {
        title: 'Bloqueio',
        content: 'Dispositivo de travamento (freio ou trava) durante a operação.'
      }
    ]
  }
];

export const NormasExtintorModal: React.FC<NormasExtintorModalProps> = ({ isOpen, onClose }) => {
  const [activeTabId, setActiveTabId] = useState<string>('nbr-12693');

  if (!isOpen) return null;

  const currentNorma = NORMAS_EXTINTORES.find((n) => n.id === activeTabId) || NORMAS_EXTINTORES[0];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-5 font-mono text-xs select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-4xl bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900"
      >
        {/* CABEÇALHO */}
        <div className="bg-red-700 text-white p-4 sm:p-5 flex items-center justify-between border-b border-red-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="bg-white/15 text-red-100 text-[9.5px] font-black px-2 py-0.5 uppercase tracking-widest rounded-md border border-white/20">
                GUIA DE CONSULTA TÉCNICA
              </span>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white font-['Hanken_Grotesk'] mt-0.5">
                NORMAS APLICÁVEIS · EXTINTORES DE INCÊNDIO
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8.5 h-8.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer font-bold border border-white/20"
            title="Fechar Guias de Normas"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVEGAÇÃO DE ABAS DAS NORMAS */}
        <div className="bg-slate-100 border-b border-slate-200 p-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {NORMAS_EXTINTORES.map((norma) => {
            const isActive = norma.id === activeTabId;
            return (
              <button
                key={norma.id}
                onClick={() => setActiveTabId(norma.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-red-700 text-white shadow-sm border border-red-800'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-red-600'}`} />
                <span>{norma.code}</span>
              </button>
            );
          })}
        </div>

        {/* CORPO DO DETALHAMENTO DA NORMA SELECIONADA */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-white font-sans">
          {/* TÍTULO E DETALHES DA NORMA */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="bg-red-100 text-red-800 border border-red-200 font-mono font-black text-xs px-2.5 py-0.5 rounded-lg">
                {currentNorma.code}
              </span>
              <span className="text-[11px] font-mono text-slate-600 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                ABNT Vigente
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 font-['Hanken_Grotesk'] leading-tight">
              {currentNorma.title}
            </h3>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              {currentNorma.description}
            </p>
          </div>

          {/* TÓPICOS E REQUISITOS DA NORMA */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <Info className="w-4 h-4 text-red-600" />
              Diretrizes e Requisitos Técnicos
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {currentNorma.topics.map((tp, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1.5 shadow-2xs hover:border-slate-300 transition-all"
                >
                  <span className="text-xs font-mono font-black text-red-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-red-600" />
                    {tp.title}
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-normal pl-5">
                    {tp.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RODAPÉ COM LINK OFICIAL ABNT */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-slate-700 font-bold">
          <span className="text-[11px] text-slate-600 font-sans">
            Base de consulta normativa ABNT para inspeção e manutenção de extintores.
          </span>
          <a
            href={currentNorma.link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm no-underline cursor-pointer border-none"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Consultar {currentNorma.code} no catálogo ABNT</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
};
