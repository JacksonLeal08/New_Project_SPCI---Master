'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { 
  Flame, 
  ShieldCheck, 
  Smartphone, 
  Bot, 
  Droplets, 
  Sliders, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  Award, 
  Activity,
  ChevronRight,
  Sparkles,
  Lock,
  Layers
} from 'lucide-react';
import AppFooter from './AppFooter';
import ThemeToggle from './ThemeToggle';
import { SYSTEM_VERSION, COMPANY_NAME } from '@/config/version';

export default function QuietLuxuryHome() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono relative overflow-hidden select-none transition-colors duration-300">
      
      {/* 1. AMBIENT BACKGROUND GLOW & GEOMETRIC GRID */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-600/5 dark:bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* 2. NAVIGATION BAR (QUIET LUXURY TOP HEADER) */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo & Brand Mark */}
          <div className="flex items-center gap-4">
            <Image 
              src="/logo-omg.png" 
              alt="Logo Grupo OMG" 
              width={140}
              height={40}
              priority
              className="h-10 w-auto object-contain filter drop-shadow-sm transition-transform hover:scale-105" 
            />
            <div className="border-l border-slate-200 dark:border-slate-800 pl-4 py-1 hidden sm:block">
              <span className="text-[9px] font-black text-red-600 dark:text-red-500 tracking-[0.25em] block uppercase leading-none">PLATAFORMA</span>
              <span className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider leading-none mt-1 font-['Hanken_Grotesk'] block">SPCI MASTER</span>
            </div>
          </div>

          {/* Quick Actions & Navigation */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <a href="#bento-servicos" className="hover:text-red-600 dark:hover:text-white transition-colors">Módulos NBR</a>
              <a href="#metricas" className="hover:text-red-600 dark:hover:text-white transition-colors">Governança</a>
              <a href="#compliance" className="hover:text-red-600 dark:hover:text-white transition-colors">Conformidade</a>
            </div>

            <ThemeToggle />

            <Link
              href="/login"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all duration-300 active:scale-95 flex items-center gap-2"
            >
              <span>Acessar Cockpit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION (MONUMENTAL TYPOGRAPHY & QUIET LUXURY) */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          
          {/* Badge de Conformidade Superior */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-widest backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>Engenharia de Segurança & Normas ABNT NBR 12962 / 13434 / 13714</span>
          </motion.div>

          {/* Manchetismo Tipográfico Monumental */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-slate-50 uppercase leading-[1.05] font-['Hanken_Grotesk']"
          >
            Gestão & Governança de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-red-700">Combate a Incêndio</span>
          </motion.h1>

          {/* Subtítulo Executivo */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-sans max-w-2xl mx-auto leading-relaxed font-normal"
          >
            Plataforma de alta precisão para rastreabilidade offline-first de ativos, emissão de laudos de vistoria técnica em tempo real e inteligência preditiva para plantas industriais e edifícios corporativos.
          </motion.p>

          {/* Botões de Ação Principais */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
          >
            <Link
              href="/login"
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-red-950/20 transition-all duration-300 active:scale-95 flex items-center gap-3 border-none cursor-pointer"
            >
              <span>INICIAR VISTORIA DE CAMPO</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#bento-servicos"
              className="px-8 py-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 cursor-pointer"
            >
              EXPLORAR SERVIÇOS BENTO
            </a>
          </motion.div>
        </div>
      </section>

      {/* 4. SEÇÃO BENTO GRID DE SERVIÇOS (QUIET LUXURY BENTO ARCHITECTURE) */}
      <section id="bento-servicos" className="py-16 md:py-24 px-6 max-w-7xl mx-auto relative z-10">
        
        {/* Cabeçalho de Seção */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-500 tracking-widest">
              ARQUITETURA DE SERVIÇOS // BENTO MATRIX
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight font-['Hanken_Grotesk']">
              Módulos Integrados de Conformidade NBR
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-md mt-2 md:mt-0">
            Estrutura modular de gerenciamento de ativos de combate a incêndio com sincronia híbrida local e cloud.
          </p>
        </div>

        {/* BENTO GRID ASSIMÉTRICO 4 COLUNAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          
          {/* CARD BENTO 1: HERO CARD (2 COLUNAS x 2 LINHAS) */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="lg:col-span-2 lg:row-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 dark:bg-red-600/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />

            <div className="space-y-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-500 shadow-sm">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-500">MÓDULO CENTRAL</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide font-['Hanken_Grotesk']">
                  Automação de Laudos NBR 12962 & Checklist Dinâmico
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                  Inspeções de campo por item normativo com marcação individual de conformidade, registro de inconformidades com histórico temporal e upload duplo de evidências fotográficas diretamente da câmera.
                </p>
              </div>
            </div>

            {/* Numerais Tabulares e Indicadores de Alta Fidelidade */}
            <div className="pt-8 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-4 relative z-10">
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold uppercase text-slate-400">Precisão dos Laudos</span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">100.0%</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold uppercase text-slate-400">Evidências por Quesito</span>
                <p className="text-2xl font-black text-red-600 dark:text-red-500 font-mono">02 Fotos</p>
              </div>
            </div>
          </motion.div>

          {/* CARD BENTO 2: GESTÃO DE EXTINTORES (1 COLUNA x 2 LINHAS) */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="lg:col-span-1 lg:row-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-500 shadow-sm">
                <Flame className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 block">GESTÃO DE PARQUE</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide font-['Hanken_Grotesk']">
                Parque de Extintores & Inmetro
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                Rastreio completo de selos Inmetro, chassi, peso, agente extintor (AP, CO2, PQS), validade de recarga e vencimento quinquenal de teste hidrostático.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[10px] font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500">AP / CO2 / PQS</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">Homologados</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Ciclo Recarga</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">12 Meses</span>
              </div>
            </div>
          </motion.div>

          {/* CARD BENTO 3: RONDA DE CAMPO & PWA (1 COLUNA x 1 LINHA) */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 space-y-4"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block">PWA OFFLINE</span>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide font-['Hanken_Grotesk']">
              Ronda de Campo Offline-First
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-normal">
              Operação de campo sem internet no celular. Sincronia transparente com IndexedDB assim que a rede for restaurada.
            </p>
          </motion.div>

          {/* CARD BENTO 4: INTELIGÊNCIA ARTIFICIAL SPCI (1 COLUNA x 1 LINHA) */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 space-y-4"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">ASSISTENTE IA</span>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide font-['Hanken_Grotesk']">
              SPCI Copilot Inteligente
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-normal">
              Análise preventiva de vencimentos, consulta instantânea a exigências NBR e relatórios executivos gerados por IA.
            </p>
          </motion.div>

          {/* CARD BENTO 5: HIDRANTES & ABRIGOS (2 COLUNAS x 1 LINHA) */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">REDE DE HIDRANTES</span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide font-['Hanken_Grotesk']">
                Hidrantes, Mangueiras & Abrigos NBR 13714
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans max-w-md">
                Vistoria técnica de acoplamentos, esguichos reguláveis, chaves Storz e estado das mangueiras de incêndio Tipo 1 a 5.
              </p>
            </div>
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-mono shrink-0">
              <span className="block text-slate-400 font-bold">Pressão Residual</span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">4.5 kgf/cm²</span>
            </div>
          </motion.div>

          {/* CARD BENTO 6: CASA DE BOMBAS & SINALIZAÇÃO (2 COLUNAS x 1 LINHA) */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">SISTEMAS ESPECIAIS</span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide font-['Hanken_Grotesk']">
                Casa de Bombas, Sinalização NBR & Iluminação
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans max-w-md">
                Monitoramento de motobombas (Jockey, Elétrica e Diesel), placas fotoluminescentes e blocos autônomos de emergência.
              </p>
            </div>
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-mono shrink-0">
              <span className="block text-slate-400 font-bold">Modo de Operação</span>
              <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400">Automático 🟢</span>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 5. SEÇÃO DE MÉTRICAS & GOVERNANÇA (HIGH-FIDELITY TYPOGRAPHY) */}
      <section id="metricas" className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-2">
            <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">100%</p>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Conformidade ABNT</span>
          </div>
          <div className="space-y-2">
            <p className="text-3xl md:text-4xl font-black text-red-600 dark:text-red-500 font-mono tracking-tight">Offline</p>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Operação Sem Internet</span>
          </div>
          <div className="space-y-2">
            <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">&lt; 2s</p>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Emissão de Laudo</span>
          </div>
          <div className="space-y-2">
            <p className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">256-Bit</p>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Criptografia Supabase RLS</span>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION FINAL */}
      <section className="py-20 md:py-28 px-6 max-w-5xl mx-auto text-center space-y-8">
        <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-500 mx-auto shadow-md">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight font-['Hanken_Grotesk']">
          Pronto para Elevar a Segurança da sua Planta?
        </h2>
        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-sans max-w-xl mx-auto leading-relaxed">
          Acesse o Cockpit SPCI Master com suas credenciais corporativas e gerencie todo o parque de combate a incêndio com alto padrão de governança.
        </p>
        <div>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl transition-all duration-300 active:scale-95 border-none"
          >
            <span>ENTRAR NO SISTEMA SPCI</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 7. RODAPÉ CORPORATIVO */}
      <AppFooter variant="fixed" />

    </div>
  );
}
