'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { 
  Boxes, 
  MapPin, 
  Layers, 
  ClipboardCheck, 
  AlertTriangle, 
  History, 
  Image as ImageIcon, 
  Layout, 
  Lock, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function GestaoAtivoPage() {
  const router = useRouter();
  const { 
    userProfile, 
    extintores, 
    hidrantes, 
    sinalizacoes, 
    iluminacoes, 
    bombas 
  } = useSpci();

  // 1. RBAC - Acesso restrito ao cargo Desenvolvedor
  const isDesenvolvedor = userProfile?.role === 'Desenvolvedor';

  if (!isDesenvolvedor) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-6 text-center font-mono select-none"
        >
          <div className="w-16 h-16 bg-red-950/40 border border-red-900/60 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest">
            Acesso Restrito
          </h2>
          <p className="text-[10px] text-slate-400 font-sans leading-relaxed mt-3 px-2">
            Esta área contém configurações avançadas do banco de dados e checklists estruturais. Apenas credenciais com privilégios de <strong>Desenvolvedor SPCI</strong> podem acessar.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 w-full py-3 bg-red-650 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none shadow-md flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // 2. Cálculo dos contadores em tempo real baseados no contexto
  const allLocations = Array.from(new Set([
    ...(extintores || []).map(e => e.location),
    ...(hidrantes || []).map(h => h.location),
    ...(sinalizacoes || []).map(s => s.location),
    ...(iluminacoes || []).map(i => i.location)
  ].filter(Boolean)));

  const allSubLocations = Array.from(new Set([
    ...(extintores || []).map(e => e.subLocation || e.sub_location),
    ...(hidrantes || []).map(h => h.subLocation || h.sub_location),
    ...(sinalizacoes || []).map(s => s.subLocation || s.sub_location),
    ...(iluminacoes || []).map(i => i.subLocation || i.sub_location)
  ].filter(Boolean)));

  const totalChecklists = 5; // Extintores, Hidrantes, Sinalização, Iluminação, Casa de Bombas

  const totalOccurrences = 
    (extintores || []).filter(e => e.status !== 'Conforme').length +
    (hidrantes || []).filter(h => h.status !== 'Conforme').length +
    (sinalizacoes || []).filter(s => s.status === 'Não Conforme' || s.status === 'Faltante').length +
    (iluminacoes || []).filter(i => i.status === 'Falha Carga' || i.status === 'Atenção').length +
    (bombas || []).filter(b => b.status === 'Manutenção Req.').length;

  // Variantes de animação
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } }
  };

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-red-500/10 rounded-lg text-red-600">
              <Boxes className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-['Hanken_Grotesk'] font-extrabold tracking-tight text-slate-900 uppercase">
              Gestão de Ativo
            </h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Painel centralizado de tabelas auxiliares, checklists e configurações estruturais do SPCI.
          </p>
        </div>
        
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 self-start md:self-auto">
          <ShieldCheck className="w-3.5 h-3.5" />
          Modo Desenvolvedor Ativo
        </div>
      </div>

      {/* Grid Assimétrico Glassmorphism Claro */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        
        {/* Card 1: Setores da Planta (Ciano, col-span-2) */}
        <motion.div 
          variants={itemVariants}
          onClick={() => router.push('/gestao-ativo/setores')}
          className="lg:col-span-2 group bg-white/65 backdrop-blur-md border border-slate-200/50 p-6 rounded-2xl shadow-xs transition-all duration-300 hover:shadow-lg hover:border-cyan-400/50 hover:bg-white/80 flex flex-col justify-between cursor-pointer relative overflow-hidden"
        >
          {/* Efeito Glow Neon no Hover */}
          <div className="absolute -inset-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-cyan-500/10 text-cyan-600 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <MapPin className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-cyan-500/10 text-cyan-700 rounded-md">
                Auxiliar
              </span>
            </div>
            <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wide mt-4">
              Setores da Planta
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Setores físicos cadastrados onde os ativos de segurança contra incêndio estão alocados.
            </p>
            
            <div className="mt-4 flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
              {allLocations.slice(0, 5).map((loc, idx) => (
                <span key={idx} className="text-[8px] font-mono font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/40">
                  {loc}
                </span>
              ))}
              {allLocations.length > 5 && (
                <span className="text-[8px] font-mono font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60">
                  +{allLocations.length - 5}
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200/60 flex justify-between items-center relative">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-850">
              {allLocations.length} <span className="text-xs font-semibold text-slate-500 lowercase">setores cadastrados</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </motion.div>

        {/* Card 2: Sub-Locais (Sky, col-span-1) */}
        <motion.div 
          variants={itemVariants}
          onClick={() => router.push('/gestao-ativo/sub-locais')}
          className="group bg-white/65 backdrop-blur-md border border-slate-200/50 p-6 rounded-2xl shadow-xs transition-all duration-300 hover:shadow-lg hover:border-sky-400/50 hover:bg-white/80 flex flex-col justify-between cursor-pointer relative overflow-hidden"
        >
          <div className="absolute -inset-px bg-gradient-to-r from-sky-500/0 via-sky-500/5 to-sky-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-sky-500/10 text-sky-600 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-sky-500/10 text-sky-700 rounded-md">
                Auxiliar
              </span>
            </div>
            <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wide mt-4">
              Sub-Locais (Posições Físicas)
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Áreas específicas, corredores e setores internos mapeados para cada setor da planta.
            </p>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200/60 flex justify-between items-center relative">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-850">
              {allSubLocations.length} <span className="text-xs font-semibold text-slate-500 lowercase">posições físicas</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </motion.div>

        {/* Card 3: Checklists Homologados (Esmeralda, col-span-3) */}
        <motion.div 
          variants={itemVariants}
          className="md:col-span-2 lg:col-span-3 group bg-white/65 backdrop-blur-md border border-slate-200/50 p-6 rounded-2xl shadow-xs transition-all duration-300 hover:shadow-lg hover:border-emerald-400/50 hover:bg-white/80 flex flex-col justify-between cursor-pointer relative overflow-hidden"
        >
          <div className="absolute -inset-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-emerald-500/10 text-emerald-700 rounded-md">
                  Novo
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
              {[
                { name: 'Extintores NBR 12962', desc: 'Selo, pressão, casco e lacre' },
                { name: 'Hidrantes NBR 13714', desc: 'Mangueiras, esguicho e chave' },
                { name: 'Sinalização NBR 13434', desc: 'Fotoluminescência e rota' },
                { name: 'Iluminação NBR 10898', desc: 'Autonomia e bateria' },
                { name: 'Casa de Bombas SPCI', desc: 'Jockey, Principal e Diesel' }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200/50 p-3 rounded-xl hover:bg-slate-100/80 transition-colors">
                  <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tight truncate">{item.name}</p>
                  <p className="text-[8px] text-slate-500 mt-0.5 leading-normal">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200/60 flex justify-between items-center relative">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-850">
              {totalChecklists} <span className="text-xs font-semibold text-slate-500 lowercase">checklists homologados</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </motion.div>

        {/* Card 4: Ocorrências Ativas (Amber, col-span-1) */}
        <motion.div 
          variants={itemVariants}
          className="group bg-white/65 backdrop-blur-md border border-slate-200/50 p-6 rounded-2xl shadow-xs transition-all duration-300 hover:shadow-lg hover:border-amber-400/50 hover:bg-white/80 flex flex-col justify-between cursor-pointer relative overflow-hidden"
        >
          <div className="absolute -inset-px bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-amber-500/10 text-amber-700 rounded-md">
                Alertas
              </span>
            </div>
            <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wide mt-4">
              Ocorrências Ativas
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Ativos com inconformidades, falhas registradas ou manutenções pendentes no sistema.
            </p>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200/60 flex justify-between items-center relative">
            <span className="text-2xl font-black font-mono tracking-tight text-red-600">
              {totalOccurrences} <span className="text-xs font-semibold text-slate-500 lowercase">anomalias ativas</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </motion.div>

        {/* Card 5: Histórico Geral (Orange, col-span-2) */}
        <motion.div 
          variants={itemVariants}
          className="md:col-span-2 group bg-white/65 backdrop-blur-md border border-slate-200/50 p-6 rounded-2xl shadow-xs transition-all duration-300 hover:shadow-lg hover:border-orange-400/50 hover:bg-white/80 flex flex-col justify-between cursor-pointer relative overflow-hidden"
        >
          <div className="absolute -inset-px bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-orange-500/10 text-orange-600 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <History className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-orange-500/10 text-orange-700 rounded-md">
                Logs
              </span>
            </div>
            <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wide mt-4">
              Histórico & logs consolidado
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Visualização unificada de vistorias, laudos fotográficos, registros de auditoria e auditoria de campo.
            </p>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200/60 flex justify-between items-center relative">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-850">
              Acessar logs <span className="text-xs font-semibold text-slate-500 lowercase">de inspeção</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </motion.div>

        {/* Card 6: Personalização de Marca (Rose, col-span-1) */}
        <motion.div 
          variants={itemVariants}
          className="group bg-white/65 backdrop-blur-md border border-slate-200/50 p-6 rounded-2xl shadow-xs transition-all duration-300 hover:shadow-lg hover:border-rose-400/50 hover:bg-white/80 flex flex-col justify-between cursor-pointer relative overflow-hidden"
        >
          <div className="absolute -inset-px bg-gradient-to-r from-rose-500/0 via-rose-500/5 to-rose-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-600 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <ImageIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-rose-500/10 text-rose-700 rounded-md">
                Marca
              </span>
            </div>
            <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wide mt-4">
              Editar Logomarca
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Personalize o cabeçalho e os laudos com o logotipo oficial da corporação.
            </p>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200/60 flex justify-between items-center relative">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-850">
              Logo <span className="text-xs font-semibold text-slate-500 lowercase">corporativo</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </motion.div>

        {/* Card 7: Configurar Home (Indigo, col-span-2) */}
        <motion.div 
          variants={itemVariants}
          className="md:col-span-2 group bg-white/65 backdrop-blur-md border border-slate-200/50 p-6 rounded-2xl shadow-xs transition-all duration-300 hover:shadow-lg hover:border-indigo-400/50 hover:bg-white/80 flex flex-col justify-between cursor-pointer relative overflow-hidden"
        >
          <div className="absolute -inset-px bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Layout className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-indigo-500/10 text-indigo-700 rounded-md">
                Interface
              </span>
            </div>
            <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wide mt-4">
              Configurar Home
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Personalize os blocos de KPI e o posicionamento de atalhos rápidos do dashboard inicial.
            </p>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200/60 flex justify-between items-center relative">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-850">
              Gerenciar layout <span className="text-xs font-semibold text-slate-500 lowercase">do cockpit</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
