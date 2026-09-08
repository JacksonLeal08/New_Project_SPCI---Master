'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  Flame, 
  Droplet, 
  AlertTriangle, 
  Lightbulb, 
  Sliders, 
  ClipboardCheck, 
  Search, 
  ArrowRight,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { useSpci } from '../context/SpciContext';
import { AssetCategory } from '@/lib/types';

interface AssetOption {
  id: AssetCategory;
  label: string;
  inspectionLabel: string;
  moduleKey: string;
  icon: React.ReactNode;
  badgeBg: string;
  accentColor: string;
}

export default function QuickAssetFab() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inspectionCategory, setInspectionCategory] = useState<AssetCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { 
    setShowAddForm, 
    setSelectedAssetForInspection, 
    setNewAssetType, 
    chatOpened,
    userProfile,
    extintores,
    hidrantes,
    sinalizacoes,
    iluminacoes,
    bombas
  } = useSpci();

  // Fechar com ESC ou evento global
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setInspectionCategory(null);
      }
    };
    const handleCloseModals = () => {
      setIsOpen(false);
      setInspectionCategory(null);
    };

    window.addEventListener('keydown', handleEscKey);
    window.addEventListener('spci-close-modals', handleCloseModals);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
      window.removeEventListener('spci-close-modals', handleCloseModals);
    };
  }, []);

  const handleSelectCategory = (category: AssetCategory) => {
    const categoryMap: Record<AssetCategory, 'extintor' | 'hidrante' | 'sinalizacao' | 'iluminacao' | 'bomba'> = {
      extintores: 'extintor',
      hidrantes: 'hidrante',
      sinalizacoes: 'sinalizacao',
      iluminacao: 'iluminacao',
      bombas: 'bomba'
    };
    setSelectedAssetForInspection(null);
    setNewAssetType(categoryMap[category]);
    setShowAddForm(true);
    setIsOpen(false);
    setInspectionCategory(null);
  };

  const allAssetOptions: AssetOption[] = [
    {
      id: 'extintores',
      label: 'Novo Extintor',
      inspectionLabel: 'Nova Inspeção',
      moduleKey: 'extintores',
      icon: <Flame className="w-4 h-4 text-red-500" />,
      badgeBg: 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800',
      accentColor: 'text-red-600'
    },
    {
      id: 'hidrantes',
      label: 'Novo Hidrante & Abrigo',
      inspectionLabel: 'Nova Inspeção',
      moduleKey: 'hidrantes',
      icon: <Droplet className="w-4 h-4 text-sky-500" />,
      badgeBg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
      accentColor: 'text-sky-600'
    },
    {
      id: 'sinalizacoes',
      label: 'Nova Sinalização NBR',
      inspectionLabel: 'Nova Inspeção',
      moduleKey: 'sinalizacao',
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      accentColor: 'text-amber-600'
    },
    {
      id: 'iluminacao',
      label: 'Nova Iluminação Emergência',
      inspectionLabel: 'Nova Inspeção',
      moduleKey: 'iluminacao',
      icon: <Lightbulb className="w-4 h-4 text-yellow-500" />,
      badgeBg: 'bg-yellow-50 dark:bg-yellow-950/60 border-yellow-200 dark:border-yellow-800',
      accentColor: 'text-yellow-600'
    },
    {
      id: 'bombas',
      label: 'Nova Casa de Bombas',
      inspectionLabel: 'Nova Inspeção',
      moduleKey: 'bombas',
      icon: <Sliders className="w-4 h-4 text-emerald-500" />,
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      accentColor: 'text-emerald-600'
    }
  ];

  // Filtra as opções pelas permissões do usuário
  const authorizedOptions = useMemo(() => {
    const isFullAccess = 
      userProfile?.role === 'Desenvolvedor' || 
      userProfile?.role === 'Gestor' || 
      userProfile?.role === 'Administrador' ||
      !userProfile?.permissions?.modules;

    if (isFullAccess) return allAssetOptions;

    const allowed = userProfile?.permissions?.modules || [];
    return allAssetOptions.filter(opt => {
      if (allowed.includes(opt.moduleKey)) return true;
      if (opt.moduleKey === 'sinalizacao' && allowed.includes('sinalizacoes')) return true;
      return false;
    });
  }, [userProfile]);

  // Obter a lista de ativos da categoria selecionada, respeitando a segregação por Contrato/Site
  const targetCategoryAssets = useMemo(() => {
    if (!inspectionCategory) return [];

    let rawList: any[] = [];
    if (inspectionCategory === 'extintores') rawList = extintores || [];
    else if (inspectionCategory === 'hidrantes') rawList = hidrantes || [];
    else if (inspectionCategory === 'sinalizacoes') rawList = sinalizacoes || [];
    else if (inspectionCategory === 'iluminacao') rawList = iluminacoes || [];
    else if (inspectionCategory === 'bombas') rawList = bombas || [];

    // Segregação estrita por site do usuário
    const userSite = userProfile?.site;
    const isGlobal = !userSite || userSite.toUpperCase().startsWith('TODOS');

    let scopedList = rawList;
    if (!isGlobal && userSite) {
      scopedList = rawList.filter(item => {
        const itemSite = (item.site || item.contrato || '').toUpperCase();
        return itemSite === userSite.toUpperCase();
      });
    }

    if (!searchTerm.trim()) return scopedList;

    const term = searchTerm.toLowerCase().trim();
    return scopedList.filter(item => {
      const code = (item.idAtivo || item.patrimonio || item.code || item.id || '').toLowerCase();
      const model = (item.model || item.tipo || item.name || '').toLowerCase();
      const loc = (item.location || item.subLocation || item.setor || '').toLowerCase();
      return code.includes(term) || model.includes(term) || loc.includes(term);
    });
  }, [inspectionCategory, extintores, hidrantes, sinalizacoes, iluminacoes, bombas, userProfile, searchTerm]);

  const handleStartInspection = (assetId: string) => {
    setInspectionCategory(null);
    setIsOpen(false);
    router.push(`/inspecao/${assetId}`);
  };

  return (
    <>
      <div 
        className={`fixed bottom-6 z-50 flex flex-col items-end select-none transition-all duration-300 ease-out ${
          chatOpened ? 'right-6 sm:right-[440px] md:right-[475px]' : 'right-6'
        }`}
      >
        {/* Backdrop sutil ao abrir menu de ações */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40"
            />
          )}
        </AnimatePresence>

        {/* Linhas de Ações Duplas: NOVA INSPEÇÃO (Esquerda) + NOVO ATIVO (Direita) */}
        <div className="relative z-50 flex flex-col items-end gap-2.5 mb-3">
          <AnimatePresence>
            {isOpen && authorizedOptions.map((opt, idx) => (
              <motion.div
                key={opt.id}
                initial={{ opacity: 0, y: 15, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.85 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 420, 
                  damping: 26, 
                  delay: (authorizedOptions.length - 1 - idx) * 0.035 
                }}
                className="flex items-center gap-2"
              >
                {/* Botão Ação 1: NOVA INSPEÇÃO (Pílula Verde com Ícone de Prancheta) */}
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setInspectionCategory(opt.id);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white pl-3.5 pr-2 py-1.5 rounded-full shadow-lg border border-emerald-400/50 cursor-pointer backdrop-blur-md transition-all transform hover:scale-105 group"
                  title={`Realizar nova inspeção NBR em ${opt.label.replace('Novo ', '')}`}
                >
                  <span className="font-['Hanken_Grotesk'] text-[11px] font-black uppercase tracking-wider text-emerald-50">
                    {opt.inspectionLabel}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    <ClipboardCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                </button>

                {/* Botão Ação 2: NOVO ATIVO (Pílula Branca com Ícone do Equipamento) */}
                <button
                  type="button"
                  onClick={() => handleSelectCategory(opt.id)}
                  className="flex items-center gap-2.5 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 pl-3.5 pr-1.5 py-1.5 rounded-full shadow-xl border border-slate-200/80 dark:border-slate-700/80 cursor-pointer backdrop-blur-md transition-all transform hover:scale-105 group"
                  title={`Cadastrar ${opt.label}`}
                >
                  <span className="font-['Hanken_Grotesk'] text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {opt.label}
                  </span>
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-110 ${opt.badgeBg}`}>
                    {opt.icon}
                  </div>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Botão Principal FAB */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          type="button"
          className="w-14 h-14 bg-gradient-to-tr from-red-700 via-rose-600 to-red-500 hover:from-red-600 hover:to-rose-500 text-white rounded-full shadow-[0_8px_25px_rgba(220,38,38,0.5)] border-2 border-white/20 flex items-center justify-center cursor-pointer relative z-50 group"
          aria-label="Acesso Rápido SPCI"
          title="Ações Rápidas: Nova Inspeção ou Novo Ativo"
        >
          <motion.div
            animate={{ rotate: isOpen ? 135 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex items-center justify-center"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Plus className="w-6 h-6 text-white" />
            )}
          </motion.div>
        </motion.button>
      </div>

      {/* MODAL ELEGANTE: SELECIONAR ATIVO PARA INSPEÇÃO */}
      <AnimatePresence>
        {inspectionCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Barra superior decorativa */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600 rounded-t-3xl" />

              {/* Cabeçalho do Modal */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-inner">
                    <ClipboardCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2 font-mono">
                      SELECIONAR ATIVO PARA INSPEÇÃO
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Contrato Vigente: <strong className="text-emerald-700 uppercase">{userProfile?.site || 'TODOS OS SITES'}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectionCategory(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  title="Fechar (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de Busca e Contador */}
              <div className="py-3 flex flex-col sm:flex-row gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por patrimônio, localização ou modelo..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-bold"
                  />
                </div>
                <div className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold shrink-0 font-mono">
                  {targetCategoryAssets.length} Disponíveis
                </div>
              </div>

              {/* Lista de Ativos Clicáveis */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-2.5 scrollbar-thin">
                {targetCategoryAssets.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
                      🔍
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 uppercase">Nenhum ativo encontrado</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                        Não encontramos ativos cadastrados para a categoria selecionada no contrato <strong>{userProfile?.site || 'Global'}</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  targetCategoryAssets.map((ativo: any) => {
                    const ativoId = ativo.id || ativo.idAtivo;
                    const patrimonio = ativo.idAtivo || ativo.patrimonio || ativo.code || ativo.id;
                    const modelo = ativo.model || ativo.tipo || ativo.name || 'Equipamento SPCI';
                    const local = ativo.location || ativo.subLocation || ativo.setor || 'Área Operacional';
                    const status = ativo.status || 'Conforme';

                    const isConforme = status === 'Conforme' || status === 'Operacional';
                    const isVencido = status === 'Vencido' || status === 'Não Conforme';

                    return (
                      <div
                        key={ativoId}
                        onClick={() => handleStartInspection(ativoId)}
                        className="p-3.5 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-700 group-hover:bg-emerald-100/60 group-hover:text-emerald-700 transition-colors">
                            {inspectionCategory === 'extintores' && <Flame className="w-5 h-5 text-red-600" />}
                            {inspectionCategory === 'hidrantes' && <Droplet className="w-5 h-5 text-sky-600" />}
                            {inspectionCategory === 'sinalizacoes' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                            {inspectionCategory === 'iluminacao' && <Lightbulb className="w-5 h-5 text-yellow-600" />}
                            {inspectionCategory === 'bombas' && <Sliders className="w-5 h-5 text-emerald-600" />}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-slate-900 uppercase">
                                {patrimonio}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${
                                isConforme 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isVencido
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {status}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-600">
                              {modelo}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{local}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="px-3.5 py-2 bg-emerald-600 group-hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shrink-0 border-none pointer-events-none"
                          >
                            <span>Inspecionar</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Rodapé do Modal com atalho Esc */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                <span>Pressione <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono">Esc</kbd> para fechar</span>
                <button
                  type="button"
                  onClick={() => setInspectionCategory(null)}
                  className="font-bold text-slate-600 hover:text-slate-900 uppercase cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
