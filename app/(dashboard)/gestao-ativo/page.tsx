'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { LocalizacoesService, LocalizacaoOperacional } from '@/lib/localizacoesService';
import GestaoAtivosModal from '@/app/components/GestaoAtivosModal';
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
  ShieldCheck,
  Package,
  ArrowRightLeft,
  FileSpreadsheet,
  Sparkles,
  Building2
} from 'lucide-react';

export default function GestaoAtivoPage() {
  const router = useRouter();
  const { 
    userProfile, 
    activeSite,
    extintores, 
    hidrantes, 
    sinalizacoes, 
    iluminacoes, 
    bombas 
  } = useSpci();

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [locaisOficiais, setLocaisOficiais] = useState<LocalizacaoOperacional[]>([]);
  const [loadingLocais, setLoadingLocais] = useState<boolean>(true);

  // Sincronização em tempo real das localizações oficiais com a tabela mestre (SSOT)
  useEffect(() => {
    let isMounted = true;
    async function carregarLocaisOficiais() {
      try {
        setLoadingLocais(true);
        const data = await LocalizacoesService.listarTodas(activeSite);
        if (isMounted) {
          setLocaisOficiais(data);
        }
      } catch (err) {
        console.error('[GestaoAtivoPage] Erro ao carregar localizações oficiais:', err);
      } finally {
        if (isMounted) setLoadingLocais(false);
      }
    }

    carregarLocaisOficiais();

    const handleUpdate = () => carregarLocaisOficiais();
    window.addEventListener('spci_localizacoes_updated', handleUpdate);
    window.addEventListener('spci_locations_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('spci_localizacoes_updated', handleUpdate);
      window.removeEventListener('spci_locations_updated', handleUpdate);
    };
  }, [activeSite]);

  // 1. RBAC - Acesso para Administrador e Desenvolvedor
  const canAccess = userProfile?.role === 'Desenvolvedor' || userProfile?.role === 'Administrador' || (userProfile as any)?.role === 'admin';

  if (!canAccess) {
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
            Esta área contém configurações avançadas de setores, prédios, sub-locais e checklists estruturais. Apenas credenciais com privilégios de <strong>Administrador ou Desenvolvedor SPCI</strong> podem acessar.
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

  // 2. Cálculo dos contadores oficiais da tabela mestre de Localizações Operacionais (SSOT)
  const setoresOficiais = useMemo(() => {
    return Array.from(new Set(locaisOficiais.map(l => l.setor_planta).filter(Boolean))).sort();
  }, [locaisOficiais]);

  const totalSubLocaisOficiais = locaisOficiais.length;

  // Contadores de ativos em memória (para badges de ocorrências e checklist)
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
        
        {/* Card 0: Estoque & Movimentações de Ativos (Destaque Azul / Slate, col-span-3) */}
        <motion.div 
          variants={itemVariants}
          onClick={() => setIsStockModalOpen(true)}
          className="md:col-span-2 lg:col-span-3 group bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-blue-500/60 border border-blue-800/40 flex flex-col justify-between cursor-pointer relative overflow-hidden"
        >
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Package className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-md">
                  📦 Estoque & Inventário
                </span>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="text-base font-extrabold uppercase text-white tracking-wide flex items-center gap-2">
                Estoque & Movimentações de Ativos
                <ArrowRightLeft className="w-4 h-4 text-blue-400" />
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Controle operacional de extintores em estoque (aplicação, aguardando manutenção, em recarga e condenados), movimentações com histórico e importação XLSX.
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-700/60 flex justify-between items-center relative">
            <span className="text-xs font-mono font-bold text-blue-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Acessar Painel de Estoque & Movimentações
            </span>
            <ChevronRight className="w-5 h-5 text-blue-400 transition-transform duration-300 group-hover:translate-x-1.5" />
          </div>
        </motion.div>

        {/* Card Nobre Unificado: Catálogo de Localizações Operacionais (SSOT) (col-span-3) */}
        <motion.div 
          variants={itemVariants}
          onClick={() => router.push('/gestao-ativo/localizacoes')}
          className="md:col-span-2 lg:col-span-3 group bg-white/75 backdrop-blur-md border border-cyan-200/60 p-6 rounded-2xl shadow-xs transition-all duration-300 hover:shadow-xl hover:border-cyan-500/60 hover:bg-white/90 flex flex-col justify-between cursor-pointer relative overflow-hidden"
        >
          {/* Efeito Glow Ciano/Esmeralda no Hover */}
          <div className="absolute -inset-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-cyan-500/10 text-cyan-600 border border-cyan-400/20 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-cyan-500/15 text-cyan-700 border border-cyan-400/30 rounded-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-600" />
                      Fonte Única da Verdade (SSOT)
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-500/15 text-emerald-700 border border-emerald-400/30 rounded-md">
                      Padrão Vale 8 Colunas
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold uppercase text-slate-850 tracking-wide mt-1.5 flex items-center gap-2">
                    Catálogo de Localizações Operacionais
                    <FileSpreadsheet className="w-4 h-4 text-cyan-600" />
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/70 px-4 py-2 rounded-xl">
                <div className="text-left sm:text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Setores Mapeados</p>
                  <p className="text-lg font-black font-mono text-slate-800">
                    {loadingLocais ? '...' : setoresOficiais.length}
                  </p>
                </div>
                <div className="h-7 w-px bg-slate-200" />
                <div className="text-left sm:text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sub-Locais Físicos</p>
                  <p className="text-lg font-black font-mono text-cyan-700">
                    {loadingLocais ? '...' : totalSubLocaisOficiais}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-3 max-w-3xl leading-relaxed">
              Unificação arquitetural dos antigos módulos de Setores e Sub-Locais em uma estrutura mestre corporativa. Inclui Cockpit de Importação e Edição em Massa via planilha XLSX da Vale, deduplicação automática de registros e autocompletion inteligente em todos os formulários.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Setores Principais:</span>
              {setoresOficiais.length > 0 ? (
                <>
                  {setoresOficiais.slice(0, 6).map((loc, idx) => (
                    <span key={idx} className="text-[9px] font-mono font-bold uppercase bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                      {loc}
                    </span>
                  ))}
                  {setoresOficiais.length > 6 && (
                    <span className="text-[9px] font-mono font-bold uppercase bg-cyan-50 text-cyan-800 px-2.5 py-1 rounded-md border border-cyan-200">
                      +{setoresOficiais.length - 6} outros
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
                  {loadingLocais ? 'Carregando setores da planta...' : `Nenhum setor cadastrado para ${activeSite || 'o site atual'}. Clique para importar via XLSX.`}
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between sm:items-center gap-3 relative">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-cyan-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                Acessar Central de Localizações & Cockpit XLSX
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">|</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); router.push('/gestao-ativo/setores'); }}
                  className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 underline bg-transparent border-none cursor-pointer"
                >
                  Ver Setores Legados
                </button>
                <span className="text-slate-300">•</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); router.push('/gestao-ativo/sub-locais'); }}
                  className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 underline bg-transparent border-none cursor-pointer"
                >
                  Ver Sub-Locais Legados
                </button>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-cyan-600 transition-transform duration-300 group-hover:translate-x-1.5" />
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

      {/* Modal de Gestão de Ativos em Estoque Integrado */}
      <GestaoAtivosModal 
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
      />
    </div>
  );
}
