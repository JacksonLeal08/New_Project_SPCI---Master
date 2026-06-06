'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  X, 
  Share2, 
  RefreshCw, 
  Play, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  User, 
  FileText, 
  Wifi, 
  WifiOff,
  Flame,
  Droplet,
  TriangleAlert,
  Lightbulb,
  Cog,
  Plus,
  Sun,
  Moon
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { fetchAtivoParaInspecao, salvarInspecaoNoSupabase, saveAssetToDb } from '@/lib/supabaseDb';
import { SyncQueue } from '@/lib/syncQueue';
import { InspecaoRealizada, AssetCategory } from '@/lib/types';
import { idb } from '@/lib/indexedDb';
import { useSync } from '@/hooks/useSync';
import { sanitizeInputText } from '@/lib/utils';

// Tipagem de categorias
interface CategoriaOpcao {
  key: AssetCategory;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
}

// Checklist inicial padrão para extintores
interface ChecklistItem {
  key: string;
  label: string;
  conforme: boolean | null;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { key: 'lacre_presente', label: 'Lacre de Segurança Preservado e Íntegro', conforme: null },
  { key: 'pressao_adequada', label: 'Manômetro com Pressão na Faixa Verde (OK)', conforme: null },
  { key: 'valido_inmetro', label: 'Selo do Inmetro Válido e Legível', conforme: null },
  { key: 'obstruido', label: 'Acesso Livre e Desobstruído', conforme: null },
  { key: 'sinalizado', label: 'Sinalização Visual Adequada (Parede e Piso)', conforme: null },
  { key: 'casco_pintura', label: 'Estado do Casco e Pintura sem Corrosão', conforme: null },
];

function InspecaoOuCadastroContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawId = params.id ? String(params.id) : '';

  // Parâmetros de controle de fluxo
  const isCadastro = rawId === 'novo';
  const isEdicao = searchParams.get('edit') === 'true' || searchParams.get('id') !== null;
  const targetCategory = (searchParams.get('category') || 'extintores') as AssetCategory;
  const editId = searchParams.get('id') || '';

  // Estados de Controle Geral
  const [loading, setLoading] = useState<boolean>(true);
  const [ativo, setAtivo] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hook unificado de sincronia e status de rede
  const { isOnline, pendingCount, syncing, triggerSync, updatePendingCount } = useSync();

  // Estado de Tema
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState<boolean>(false);

  // Alterna o tema de forma fluida (Telegram Style)
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('spci_portal_theme', nextTheme);
  };

  // --- ESTADOS DO FORMULÁRIO DE CADASTRO ---
  const [cadastroCategoria, setCadastroCategoria] = useState<AssetCategory>(targetCategory);
  const [localInstalacao, setLocalInstalacao] = useState<string>('MANGANÊS');
  const [subLocal, setSubLocal] = useState<string>('');
  const [patrimonioNumero, setPatrimonioNumero] = useState<string>('');
  const [modeloAtivo, setModeloAtivo] = useState<string>('Pós Químico ABC - 8KG');
  const [seloInmetro, setSeloInmetro] = useState<string>('');
  const [chassiCorporativo, setChassiCorporativo] = useState<string>('');
  const [cadastroSucesso, setCadastroSucesso] = useState<boolean>(false);

  // Novos campos detalhados para o Extintor relacional
  const [fabricante, setFabricante] = useState<string>('CHAMATEX');
  const [capacidadeExtintora, setCapacidadeExtintora] = useState<string>('2-A 20-BC');
  const [anoFabricacao, setAnoFabricacao] = useState<string>(new Date().getFullYear().toString());
  const [ultimoTesteHidro, setUltimoTesteHidro] = useState<string>(new Date().getFullYear().toString());
  const [validadeRecargaMeses, setValidadeRecargaMeses] = useState<number>(12);
  const [lastRecargaDate, setLastRecargaDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Opções dinâmicas para datalists de preenchimento automático
  const [fabricanteOptions, setFabricanteOptions] = useState<string[]>(['CHAMATEX', 'KIDDE', 'RESIL', 'MOCELIN', 'BUCKA']);
  const [modeloOptions, setModeloOptions] = useState<string[]>(['PQS ABC - 8KG', 'PQS ABC - 4KG', 'Dióxido de Carbono CO2 - 6KG', 'Água Pressurizada AP - 10L', 'Espuma Mecânica - 9L']);

  // --- ESTADOS DO FORMULÁRIO DE INSPEÇÃO ---
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [tecnicoNome, setTecnicoNome] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [submissionStatus, setSubmissionStatus] = useState<'success_online' | 'success_offline' | 'error' | null>(null);

  // Estados Visuais
  const [copied, setCopied] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Categorias de Ativos
  const categorias: CategoriaOpcao[] = [
    { key: 'extintores', label: 'EXTINTOR', subLabel: 'COMBATE PRIMÁRIO', icon: <Flame size={20} /> },
    { key: 'hidrantes', label: 'HIDRANTE', subLabel: 'COMBATE SECUNDÁRIO', icon: <Droplet size={20} /> },
    { key: 'sinalizacoes', label: 'SINALIZAÇÃO', subLabel: 'PREVENÇÃO', icon: <TriangleAlert size={20} /> },
    { key: 'iluminacao', label: 'ILUMINAÇÃO', subLabel: 'EMERGÊNCIA', icon: <Lightbulb size={20} /> },
    { key: 'bombas', label: 'CASA DE BOMBAS', subLabel: 'PRESSURIZAÇÃO', icon: <Cog size={20} /> },
  ];

  // Monitoria de conectividade e fila delegada ao useSync

  // Busca dados do ativo em caso de Inspeção ou Edição
  useEffect(() => {
    const idToFetch = isCadastro ? editId : rawId;
    if (!idToFetch) {
      setTimeout(() => {
        if (isCadastro) {
          setLoading(false); // Cadastro limpo não busca nada
        } else {
          setError('Identificação do ativo ausente.');
          setLoading(false);
        }
      }, 0);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Busca do Supabase
        const data = await fetchAtivoParaInspecao(idToFetch);
        
        if (data) {
          setAtivo(data);
          // Se for edição, preenche o formulário
          if (isCadastro || isEdicao) {
            setCadastroCategoria(data.category as AssetCategory);
            setLocalInstalacao(data.location || '');
            setSubLocal(data.subLocation || data.sub_location || '');
            setPatrimonioNumero(String(data.idAtivo || data.id_ativo || '').replace(/^(EXT|HID|SIN|LUM|BOM)-/i, ''));
            setModeloAtivo(data.model || '');
            setSeloInmetro(data.seloInmetro || data.inmetro || '');
            setChassiCorporativo(data.chassi || '');
            // Novos campos detalhados de extintores
            setFabricante(data.fabricante || 'CHAMATEX');
            setCapacidadeExtintora(data.capacidadeExtintora || '2-A 20-BC');
            setAnoFabricacao(String(data.anoFabricacao || new Date().getFullYear()));
            setUltimoTesteHidro(String(data.ultimoTesteHidro || new Date().getFullYear()));
            setValidadeRecargaMeses(Number(data.validadeRecargaMeses || 12));
            if (data.lastRecarga) {
              if (data.lastRecarga.includes('-')) {
                setLastRecargaDate(data.lastRecarga);
              } else {
                const parts = data.lastRecarga.split('/');
                if (parts.length === 3) {
                  setLastRecargaDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
              }
            }
          }
          
          // Atualiza cache local
          await idb.set(data.category || 'extintores', data.id_ativo || data.id, data);
        } else {
          // Fallback IndexedDB
          const localData = await idb.get(targetCategory, idToFetch.toUpperCase());
          if (localData) {
            setAtivo(localData);
            if (isCadastro || isEdicao) {
              setCadastroCategoria(localData.category as AssetCategory);
              setLocalInstalacao(localData.location || '');
              setSubLocal(localData.subLocation || '');
              setPatrimonioNumero(String(localData.idAtivo || '').replace(/^(EXT|HID|SIN|LUM|BOM)-/i, ''));
              setModeloAtivo(localData.model || '');
              setSeloInmetro(localData.seloInmetro || '');
              setChassiCorporativo(localData.chassi || '');
              // Novos campos detalhados de extintores
              setFabricante(localData.fabricante || 'CHAMATEX');
              setCapacidadeExtintora(localData.capacidadeExtintora || '2-A 20-BC');
              setAnoFabricacao(String(localData.anoFabricacao || new Date().getFullYear()));
              setUltimoTesteHidro(String(localData.ultimoTesteHidro || new Date().getFullYear()));
              setValidadeRecargaMeses(Number(localData.validadeRecargaMeses || 12));
              if (localData.lastRecarga) {
                if (localData.lastRecarga.includes('-')) {
                  setLastRecargaDate(localData.lastRecarga);
                } else {
                  const parts = localData.lastRecarga.split('/');
                  if (parts.length === 3) {
                    setLastRecargaDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
                  }
                }
              }
            }
          } else {
            throw new Error(`Equipamento [${idToFetch}] não localizado.`);
          }
        }
      } catch (err: any) {
        if (!navigator.onLine) {
          const localData = await idb.get(targetCategory, idToFetch.toUpperCase());
          if (localData) {
            setAtivo(localData);
            setLoading(false);
            return;
          }
        }
        setError(err.message || 'Erro ao carregar dados do equipamento.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [rawId, editId]);

  // Carrega opções de Fabricantes e Modelos existentes para preenchimento dinâmico
  useEffect(() => {
    const fetchUniqueOptions = async () => {
      try {
        const localAssets = await idb.getAll('extintores');
        if (localAssets && localAssets.length > 0) {
          const uniqueFabricantes = Array.from(new Set(localAssets.map((a: any) => a.fabricante).filter(Boolean))) as string[];
          const uniqueModelos = Array.from(new Set(localAssets.map((a: any) => a.model).filter(Boolean))) as string[];
          
          setFabricanteOptions(prev => Array.from(new Set([...prev, ...uniqueFabricantes])));
          setModeloOptions(prev => Array.from(new Set([...prev, ...uniqueModelos])));
        }
      } catch (e) {
        console.warn('Erro ao carregar opções dinâmicas para datalists:', e);
      }
    };
    fetchUniqueOptions();
  }, []);

  // Sincroniza o tema preferido do usuário após a hidratação no cliente
  useEffect(() => {
    const savedTheme = localStorage.getItem('spci_portal_theme') as 'light' | 'dark';
    const timer = setTimeout(() => {
      setMounted(true);
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Métodos de sincronia manual delegados ao hook useSync

  // Copiar link de inspeção
  const copyLink = async () => {
    try {
      const link = isCadastro 
        ? `${window.location.origin}/inspecao`
        : window.location.href;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  // Submissão do Cadastro de Novo Ativo (Mockup Imagem 1)
  const handleCadastroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patrimonioNumero.trim()) {
      alert('Número do patrimônio é obrigatório.');
      return;
    }

    // Define o prefixo do patrimônio baseado na categoria
    const prefixo = 
      cadastroCategoria === 'extintores' ? 'EXT' :
      cadastroCategoria === 'hidrantes' ? 'HID' :
      cadastroCategoria === 'sinalizacoes' ? 'SIN' :
      cadastroCategoria === 'iluminacao' ? 'LUM' : 'BOM';

    const patrimonioCompleto = `${prefixo}-${patrimonioNumero.toUpperCase().trim()}`;

    // Conversão e formatação regional das datas de recarga e teste hidrostático
    const lastRecargaStr = new Date(lastRecargaDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const validadeRecargaDateObj = new Date(lastRecargaDate + 'T12:00:00');
    validadeRecargaDateObj.setMonth(validadeRecargaDateObj.getMonth() + validadeRecargaMeses);
    const validadeRecargaStr = validadeRecargaDateObj.toLocaleDateString('pt-BR');

    const novoAtivo = {
      id: patrimonioCompleto, // ID principal
      idAtivo: patrimonioCompleto,
      category: cadastroCategoria,
      location: localInstalacao,
      subLocation: subLocal.trim(),
      status: 'Conforme', // inicia em conformidade no cadastro
      model: modeloAtivo,
      seloInmetro: seloInmetro.trim() || 'Isento',
      chassi: chassiCorporativo.trim() || 'NÃO GRAVADO',
      
      // Novos atributos estruturados
      fabricante: fabricante.trim() || 'N/A',
      capacidadeExtintora: capacidadeExtintora.trim() || 'N/A',
      anoFabricacao: anoFabricacao.trim() || new Date().getFullYear().toString(),
      ultimoTesteHidro: ultimoTesteHidro.trim() || new Date().getFullYear().toString(),
      validadeRecargaMeses: validadeRecargaMeses,
      peso: modeloAtivo.split(' - ')[1] || 'N/A',

      lastRecarga: lastRecargaStr,
      validadeRecarga: validadeRecargaStr,
      validadeTesteHidro: (parseInt(ultimoTesteHidro, 10) + 5).toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLoading(true);

    try {
      if (isOnline) {
        // Envia direto para o Supabase
        await saveAssetToDb(cadastroCategoria, patrimonioCompleto, novoAtivo);
      } else {
        // Offline-first: enfileira no cache de ativos do IndexedDB para upload posterior
        await idb.set(cadastroCategoria, patrimonioCompleto, novoAtivo);
        await SyncQueue.enqueue(cadastroCategoria, patrimonioCompleto, novoAtivo);
      }

      // Adiciona ao IndexedDB local do técnico imediatamente para aparecer na listagem
      await idb.set(cadastroCategoria, patrimonioCompleto, novoAtivo);

      setCadastroSucesso(true);
    } catch (err) {
      console.error('Erro ao cadastrar ativo:', err);
      alert('Erro técnico ao salvar ativo no banco.');
    } finally {
      setLoading(false);
    }
  };

  // Trata cliques nos botões de Checklist
  const handleChecklistChange = (key: string, val: boolean) => {
    setChecklist(prev => 
      prev.map(item => item.key === key ? { ...item, conforme: val } : item)
    );
  };

  // Submissão da Inspeção de Conformidade (Formulário)
  const handleInspecaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ativo) return;
    if (!tecnicoNome.trim()) {
      alert('Nome do inspetor responsável é obrigatório.');
      return;
    }

    const unchecked = checklist.filter(item => item.conforme === null);
    if (unchecked.length > 0) {
      alert('Responda a todos os itens do checklist de conformidade.');
      return;
    }

    const isAllConforme = checklist.every(item => item.conforme === true);
    const finalStatus = isAllConforme ? 'Conforme' : 'Não Conforme';

    const checklistDetails: Record<string, boolean> = {};
    checklist.forEach(item => {
      checklistDetails[item.key] = item.conforme || false;
    });

    const inspecao: InspecaoRealizada = {
      asset_id: ativo.id,
      asset_patrimonio: ativo.idAtivo || ativo.id_ativo || rawId,
      status: finalStatus,
      tecnico_nome: tecnicoNome.trim(),
      observacoes: observacoes.trim(),
      data_inspecao: new Date().toISOString(),
      details: {
        lacre_presente: checklistDetails.lacre_presente,
        pressao_adequada: checklistDetails.pressao_adequada,
        valido_inmetro: checklistDetails.valido_inmetro,
        obstruido: checklistDetails.obstruido,
        sinalizado: checklistDetails.sinalizado,
        casco_pintura: checklistDetails.casco_pintura || false,
      }
    };

    setLoading(true);

    try {
      // Atualiza o cache local do ativo com o novo status e data de inspeção
      const updatedAsset = {
        ...ativo,
        status: finalStatus,
        lastInsp: new Date().toISOString().split('T')[0]
      };
      await idb.set(ativo.category || 'extintores', ativo.idAtivo || ativo.id_ativo || rawId, updatedAsset);

      if (isOnline) {
        const res = await salvarInspecaoNoSupabase(inspecao);
        if (res.success) {
          setSubmissionStatus('success_online');
        } else {
          await SyncQueue.enqueueInspection(inspecao);
          setSubmissionStatus('success_offline');
        }
      } else {
        await SyncQueue.enqueueInspection(inspecao);
        setSubmissionStatus('success_offline');
      }

      setFormSubmitted(true);
      await updatePendingCount();
    } catch (err) {
      console.error('Erro ao salvar vistoria:', err);
      setSubmissionStatus('error');
      setFormSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardClass = isDark ? 'bg-slate-900/60 border-slate-850 hover:border-slate-800' : 'bg-white border-slate-200 hover:border-slate-350 shadow-md';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const labelMutedClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const borderBottomClass = isDark ? 'border-slate-900' : 'border-slate-200';
  const inputBgClass = isDark ? 'bg-slate-955 border-slate-850 text-slate-150 focus:border-red-500' : 'bg-white border-slate-250 text-slate-900 placeholder-slate-400 focus:border-red-600 shadow-sm';
  const selectBgClass = isDark ? 'bg-slate-955 border-slate-850 text-slate-150 focus:border-red-500' : 'bg-white border-slate-250 text-slate-900 placeholder-slate-400 focus:border-red-600 shadow-sm';
  const buttonSecondaryClass = isDark ? 'bg-slate-900 hover:bg-slate-850 border-slate-850 text-slate-350' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm';

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono p-4">
        <div className="flex flex-col items-center gap-3 max-w-xs text-center">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent animate-spin rounded-none" />
          <div className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-200">SPCI Ronda de Campo</h2>
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Sincronizando ambiente seguro...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} flex flex-col justify-between font-mono relative antialiased selection:bg-red-655 selection:text-white transition-colors duration-300`}>
      
      {/* Grade técnica industrial de fundo */}
      <div className={`absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none transition-opacity duration-300 ${
        isDark ? 'opacity-30 bg-slate-950' : 'opacity-10 bg-slate-50'
      }`} />

      {/* TOP HEADER: Curved SPCI Bombeiros Wave */}
      <header className="relative w-full z-20">
        <div className="bg-gradient-to-r from-red-700 to-red-600 text-white pb-8 pt-6 px-4 rounded-b-[40px] shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 text-[120px] font-black pointer-events-none select-none">
            BOMBEIRO
          </div>
          
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div 
              onClick={() => router.push('/inspecao')}
              className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform select-none"
            >
              <span className="p-1.5 bg-white text-red-700 rounded-none font-sans font-black tracking-tighter text-sm flex items-center justify-center">
                SPCI
              </span>
              <div>
                <h1 className="text-sm font-extrabold uppercase tracking-widest font-sans">SPCI BOMBEIROS</h1>
                <p className="text-[7px] text-red-100 tracking-wider">
                  {isCadastro ? 'CADASTRO DE EQUIPAMENTO' : 'CHECKLIST DE CONFORMIDADE'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Chaveador de Tema Sol/Lua (Telegram Style) */}
              <button 
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border-none cursor-pointer"
                title={isDark ? 'Ativar Tema Claro' : 'Ativar Tema Escuro'}
                aria-label={isDark ? 'Ativar Tema Claro' : 'Ativar Tema Escuro'}
              >
                {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-yellow-100" />}
              </button>

              <div className={`flex items-center gap-1 text-[8px] font-bold px-2 py-1 select-none ${
                isOnline ? 'bg-emerald-950/30 text-emerald-350 border border-emerald-500/30' : 'bg-amber-950/40 text-amber-350 border border-amber-500/40 animate-pulse'
              }`}>
                {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                <span className="hidden sm:inline">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </div>

              <button 
                type="button"
                onClick={triggerSync}
                disabled={!isOnline || pendingCount === 0 || syncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase transition-all select-none border border-white/20 bg-white/10 hover:bg-white/20 active:scale-[0.98] ${
                  pendingCount > 0 ? 'animate-bounce border-emerald-400 bg-emerald-600 text-white' : 'opacity-85 text-white'
                }`}
                aria-label={`Sincronizar dados pendentes. ${pendingCount} itens na fila.`}
              >
                <RefreshCw size={11} className={`${syncing ? 'animate-spin' : ''}`} />
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white text-red-700 font-sans font-bold text-[8px]">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="absolute -bottom-1 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-[30px] fill-red-700 drop-shadow-md">
            <path d="M0,64L80,69.3C160,75,320,85,480,85.3C640,85,800,75,960,64C1120,53,1280,43,1360,37.3L1440,32L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"></path>
          </svg>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="flex-grow w-full max-w-lg mx-auto px-4 py-8 z-10 space-y-6">

        {/* Tutorial & Compartilhar Row */}
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setShowTutorial(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-[10px] font-bold uppercase tracking-wider text-white cursor-pointer border-none rounded-xl"
            aria-label="Exibir tutorial de instruções"
          >
            <Play size={12} fill="currentColor" />
            Tutorial
          </button>
          
          <button 
            type="button"
            onClick={copyLink}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border transition-all active:scale-[0.98] text-[10px] font-bold uppercase tracking-wider cursor-pointer rounded-xl ${
              copied 
                ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30' 
                : isDark
                ? 'bg-slate-900/60 text-slate-350 border-slate-800 hover:bg-slate-850'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-sm'
            }`}
            aria-label={copied ? 'Link de inspeção copiado para a área de transferência' : 'Compartilhar link de inspeção'}
          >
            {copied ? <Check size={12} className="text-emerald-450" /> : <Share2 size={12} />}
            {copied ? 'Link Copiado!' : 'Compartilhar Link'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading" className="py-12 text-center space-y-4">
              <RefreshCw className="animate-spin text-red-500 mx-auto" size={32} />
              <p className={`text-[10px] uppercase tracking-wider ${textMutedClass}`}>Processando dados...</p>
            </motion.div>
          )}

          {/* =================================================================== */}
          {/* FLOW A: CADASTRO OU EDIÇÃO DE ATIVO (Mockup Imagem 1) */}
          {/* =================================================================== */}
          {!loading && isCadastro && !cadastroSucesso && (
            <motion.div 
              key="cadastro-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <form onSubmit={handleCadastroSubmit} className="space-y-6">
                
                {/* 1. Selecionar Categoria */}
                <section className={`${cardClass} p-5 space-y-4 rounded-2xl`}>
                  <h3 className={`text-[10px] ${textMutedClass} uppercase tracking-widest font-bold border-b pb-2 ${borderBottomClass}`}>
                    Selecione a Categoria do Ativo *
                  </h3>
                  
                  <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Categorias de ativo">
                    {categorias.map((cat) => {
                      const isSelected = cadastroCategoria === cat.key;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={`Selecionar categoria ${cat.label}`}
                          onClick={() => setCadastroCategoria(cat.key)}
                          className={`flex flex-col items-center justify-center p-2 border text-center transition-all relative rounded-lg cursor-pointer ${
                            isSelected 
                              ? 'border-red-655 bg-red-655/10 text-red-500 font-bold' 
                              : isDark
                              ? 'border-slate-850 bg-slate-950/40 text-slate-550 hover:border-slate-800'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-350 shadow-sm'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-650" />
                          )}
                          <span className="mb-1 text-slate-400">{cat.icon}</span>
                          <span className="text-[6.5px] font-sans font-black tracking-tight uppercase truncate w-full">
                            {cat.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* 2. Detalhes de Localização */}
                <section className={`${cardClass} p-5 space-y-4 rounded-2xl`}>
                  <h3 className={`text-[10px] ${textMutedClass} uppercase tracking-widest font-bold border-b pb-2 ${borderBottomClass}`}>
                    Localização da Instalação
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Local */}
                    <div className="space-y-1.5">
                      <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Local da Instalação *</label>
                      <select 
                        value={localInstalacao}
                        onChange={(e) => setLocalInstalacao(e.target.value)}
                        className={`w-full px-3 py-2.5 text-xs focus:outline-none rounded-lg cursor-pointer ${selectBgClass}`}
                      >
                        {localInstalacao && !["MANGANÊS", "ALMOXARIFADO", "SALA ELÉTRICA", "PRODUÇÃO", "LOGÍSTICA"].includes(localInstalacao) && (
                          <option value={localInstalacao} className={isDark ? "bg-slate-900" : ""}>{localInstalacao}</option>
                        )}
                        <option value="MANGANÊS" className={isDark ? "bg-slate-900" : ""}>MANGANÊS</option>
                        <option value="ALMOXARIFADO" className={isDark ? "bg-slate-900" : ""}>ALMOXARIFADO</option>
                        <option value="SALA ELÉTRICA" className={isDark ? "bg-slate-900" : ""}>SALA ELÉTRICA</option>
                        <option value="PRODUÇÃO" className={isDark ? "bg-slate-900" : ""}>PRODUÇÃO</option>
                        <option value="LOGÍSTICA" className={isDark ? "bg-slate-900" : ""}>LOGÍSTICA</option>
                      </select>
                    </div>

                    {/* Sub-local */}
                    <div className="space-y-1.5">
                      <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Sub Local (Sala / Doca) *</label>
                      <input 
                        type="text"
                        required
                        value={subLocal}
                        onChange={(e) => setSubLocal(sanitizeInputText(e.target.value))}
                        placeholder="Ex: BARRAGEM DO AZUL"
                        className={`w-full px-3 py-3 text-xs focus:outline-none rounded-lg ${inputBgClass}`}
                      />
                    </div>
                  </div>
                </section>

                {/* 3. Identificação e Modelo */}
                <section className={`${cardClass} p-5 space-y-4 rounded-2xl`}>
                  <h3 className={`text-[10px] ${textMutedClass} uppercase tracking-widest font-bold border-b pb-2 ${borderBottomClass}`}>
                    Identificação do Ativo
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Número do Patrimônio */}
                    <div className="space-y-1.5">
                      <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Número do Patrimônio *</label>
                      <div className="flex">
                        <span className={`border text-xs px-3 py-2.5 select-none font-bold flex items-center rounded-l-lg ${
                          isDark ? 'bg-slate-800 border-slate-800 text-slate-400' : 'bg-slate-200 border-slate-200 text-slate-750'
                        }`}>
                          {cadastroCategoria === 'extintores' ? 'EXT-' : 
                           cadastroCategoria === 'hidrantes' ? 'HID-' : 
                           cadastroCategoria === 'sinalizacoes' ? 'SIN-' : 
                           cadastroCategoria === 'iluminacao' ? 'LUM-' : 'BOM-'}
                        </span>
                        <input 
                          type="text"
                          required
                          value={patrimonioNumero}
                          onChange={(e) => setPatrimonioNumero(sanitizeInputText(e.target.value).replace(/\s/g, ''))}
                          placeholder="ESCREVA O NÚMERO"
                          className={`flex-grow w-full border px-3 py-3 text-xs focus:outline-none rounded-r-lg ${
                            isDark ? 'bg-slate-950 border-slate-850 text-slate-200 focus:border-red-500' : 'bg-white border-slate-250 text-slate-900 focus:border-red-655 shadow-sm'
                          }`}
                        />
                      </div>
                      <span className={`text-[7.5px] ${labelMutedClass} block`}>Dica técnica: Sempre utilize o adesivo laminado QR SPCI.</span>
                    </div>

                    {/* Modelo */}
                    <div className="space-y-1.5">
                      <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Modelo / Agente e Carga *</label>
                      {cadastroCategoria === 'extintores' ? (
                        <>
                          <input 
                            type="text"
                            required
                            list="modelos-list"
                            value={modeloAtivo}
                            onChange={(e) => setModeloAtivo(sanitizeInputText(e.target.value))}
                            placeholder="Escolha ou digite o modelo"
                            className={`w-full px-3 py-3 text-xs focus:outline-none rounded-lg ${inputBgClass}`}
                          />
                          <datalist id="modelos-list">
                            {modeloOptions.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </>
                      ) : (
                        <select 
                          value={modeloAtivo}
                          onChange={(e) => setModeloAtivo(e.target.value)}
                          className={`w-full px-3 py-2.5 text-xs focus:outline-none rounded-lg cursor-pointer ${selectBgClass}`}
                        >
                          <option value="Pós Químico ABC - 8KG" className={isDark ? "bg-slate-900" : ""}>Pós Químico ABC - 8KG</option>
                          <option value="Pós Químico ABC - 4KG" className={isDark ? "bg-slate-900" : ""}>Pós Químico ABC - 4KG</option>
                          <option value="Dióxido de Carbono CO2 - 6KG" className={isDark ? "bg-slate-900" : ""}>Dióxido de Carbono CO2 - 6KG</option>
                          <option value="Água Pressurizada AP - 10L" className={isDark ? "bg-slate-900" : ""}>Água Pressurizada AP - 10L</option>
                          <option value="Espuma Mecânica - 9L" className={isDark ? "bg-slate-900" : ""}>Espuma Mecânica - 9L</option>
                        </select>
                      )}
                    </div>
                  </div>
                </section>

                {/* 4. Fabricante, Selo e Chassi */}
                <section className={`${cardClass} p-5 space-y-4 rounded-2xl`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Fabricante (Datalist Híbrido) */}
                    {cadastroCategoria === 'extintores' && (
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Fabricante *</label>
                        <input 
                          type="text"
                          required
                          list="fabricantes-list"
                          value={fabricante}
                          onChange={(e) => setFabricante(sanitizeInputText(e.target.value))}
                          placeholder="Escolha ou digite o fabricante"
                          className={`w-full px-3 py-3 text-xs focus:outline-none rounded-lg ${inputBgClass}`}
                        />
                        <datalist id="fabricantes-list">
                          {fabricanteOptions.map((opt) => (
                            <option key={opt} value={opt} />
                          ))}
                        </datalist>
                      </div>
                    )}

                    {/* Selo Inmetro */}
                    <div className="space-y-1.5">
                      <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Selo Inmetro (Opcional)</label>
                      <input 
                        type="text"
                        value={seloInmetro}
                        onChange={(e) => setSeloInmetro(sanitizeInputText(e.target.value))}
                        placeholder="Selo Impresso"
                        className={`w-full px-3 py-3 text-xs focus:outline-none rounded-lg ${
                          isDark ? 'bg-slate-950 border-slate-850 text-slate-200 focus:border-red-500' : 'bg-white border-slate-250 text-slate-900 focus:border-red-655 shadow-sm'
                        }`}
                      />
                    </div>

                    {/* Chassi */}
                    <div className="space-y-1.5">
                      <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Chassi Corporativo</label>
                      <input 
                        type="text"
                        value={chassiCorporativo}
                        onChange={(e) => setChassiCorporativo(sanitizeInputText(e.target.value))}
                        placeholder="CHASSI GRAVADO"
                        className={`w-full px-3 py-3 text-xs focus:outline-none rounded-lg ${
                          isDark ? 'bg-slate-950 border-slate-850 text-slate-200 focus:border-red-500' : 'bg-white border-slate-250 text-slate-900 focus:border-red-655 shadow-sm'
                        }`}
                      />
                    </div>
                  </div>
                </section>

                {/* 5. Especificações Físicas do Extintor */}
                {cadastroCategoria === 'extintores' && (
                  <section className={`${cardClass} p-5 space-y-4 rounded-2xl`}>
                    <h3 className={`text-[10px] ${textMutedClass} uppercase tracking-widest font-bold border-b pb-2 ${borderBottomClass}`}>
                      Especificações Físicas do Extintor
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Capacidade Extintora */}
                      <div className="space-y-1.5">
                        <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Capacidade Extintora *</label>
                        <input 
                          type="text"
                          required
                          value={capacidadeExtintora}
                          onChange={(e) => setCapacidadeExtintora(sanitizeInputText(e.target.value))}
                          placeholder="Ex: 2-A 20-BC"
                          className={`w-full px-3 py-3 text-xs focus:outline-none rounded-lg ${inputBgClass}`}
                        />
                      </div>

                      {/* Validade da Recarga (Meses) */}
                      <div className="space-y-1.5">
                        <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Validade da Recarga (Meses) *</label>
                        <select 
                          value={validadeRecargaMeses}
                          onChange={(e) => setValidadeRecargaMeses(parseInt(e.target.value, 10))}
                          className={`w-full px-3 py-2.5 text-xs focus:outline-none rounded-lg cursor-pointer ${selectBgClass}`}
                        >
                          <option value={12} className={isDark ? "bg-slate-900" : ""}>12 Meses</option>
                          <option value={24} className={isDark ? "bg-slate-900" : ""}>24 Meses</option>
                          <option value={36} className={isDark ? "bg-slate-900" : ""}>36 Meses</option>
                        </select>
                      </div>

                      {/* Data da Última Recarga */}
                      <div className="space-y-1.5">
                        <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Data da Última Recarga *</label>
                        <input 
                          type="date"
                          required
                          value={lastRecargaDate}
                          onChange={(e) => setLastRecargaDate(e.target.value)}
                          className={`w-full px-3 py-2.5 text-xs focus:outline-none rounded-lg ${inputBgClass}`}
                        />
                      </div>

                      {/* Ano de Fabricação */}
                      <div className="space-y-1.5">
                        <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Ano de Fabricação *</label>
                        <input 
                          type="text"
                          required
                          maxLength={4}
                          value={anoFabricacao}
                          onChange={(e) => setAnoFabricacao(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ex: 2024"
                          className={`w-full px-3 py-3 text-xs focus:outline-none rounded-lg ${inputBgClass}`}
                        />
                      </div>

                      {/* Ano do Último Teste Hidrostático */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>Ano do Último Teste Hidrostático *</label>
                        <input 
                          type="text"
                          required
                          maxLength={4}
                          value={ultimoTesteHidro}
                          onChange={(e) => setUltimoTesteHidro(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ex: 2024"
                          className={`w-full px-3 py-3 text-xs focus:outline-none rounded-lg ${inputBgClass}`}
                        />
                      </div>
                    </div>
                  </section>
                )}

                {/* Banner de Aviso SPCI */}
                <div className={`border-l-4 border-orange-500 p-4 rounded-xl text-left flex items-start gap-3 ${
                  isDark ? 'bg-orange-950/15' : 'bg-orange-50'
                }`}>
                  <AlertTriangle size={22} className="text-orange-500 shrink-0 mt-0.5" />
                  <div className="space-y-1 font-sans">
                    <h4 className="text-[10px] font-bold text-orange-600 uppercase font-mono tracking-wider">Aviso Automático SPCI:</h4>
                    <p className={`text-[10px] leading-snug ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      No cadastro do equipamento, a próxima inspeção periódica obrigatória é agendada para o mesmo mês do cadastro.<br />
                      <strong className="text-orange-600 font-bold">Próxima inspeção agendada: {new Date().toLocaleDateString('pt-BR', {month: '2-digit', year: 'numeric'})}</strong>
                    </p>
                  </div>
                </div>

                {/* Ações de envio */}
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => router.push('/inspecao')}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer rounded-xl ${buttonSecondaryClass}`}
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-lg rounded-xl"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={14} /> : null}
                    SALVAR NO BANCO SPCI
                  </button>
                </div>

              </form>
            </motion.div>
          )}

          {/* CADASTRO DE ATIVO CONCLUÍDO COM SUCESSO */}
          {!loading && isCadastro && cadastroSucesso && (
            <motion.div 
              key="cadastro-sucesso"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`p-6 space-y-6 text-center shadow-2xl rounded-2xl border ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                isDark ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-450' : 'bg-emerald-50 border border-emerald-250 text-emerald-600'
              }`}>
                <Check size={32} />
              </div>

              <div className="space-y-2">
                <h3 className={`text-base font-extrabold uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {isOnline ? 'Ativo Cadastrado com Sucesso!' : 'Ativo Cadastrado Offline!'}
                </h3>
                <p className={`text-xs leading-relaxed font-sans max-w-sm mx-auto ${textMutedClass}`}>
                  {isOnline 
                    ? 'O novo equipamento foi cadastrado e sincronizado com o banco de dados principal do SPCI.'
                    : 'O equipamento foi cadastrado e salvo offline na fila local. Ele será transmitido ao Supabase automaticamente ao detectar conexão.'}
                </p>
              </div>

              <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    setPatrimonioNumero('');
                    setSeloInmetro('');
                    setChassiCorporativo('');
                    setCadastroSucesso(false);
                  }}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer rounded-xl ${buttonSecondaryClass}`}
                >
                  Cadastrar Outro
                </button>
                <button 
                  onClick={() => router.push('/inspecao')}
                  className="flex-1 py-3 bg-red-650 hover:bg-red-750 text-white text-[10px] font-bold uppercase tracking-widest cursor-pointer rounded-xl"
                >
                  Voltar ao Portal
                </button>
              </div>
            </motion.div>
          )}

          {/* =================================================================== */}
          {/* FLOW B: FORMULÁRIO DE INSPEÇÃO DO ATIVO (Existente) */}
          {/* =================================================================== */}
          {!loading && !isCadastro && ativo && !formSubmitted && (
            <motion.div 
              key="inspecao-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* CARD DETALHES DO ATIVO */}
              <section className={`${cardClass} p-5 space-y-4 relative overflow-hidden rounded-2xl`}>
                <div className={`absolute top-1.5 right-3 text-[7px] font-mono tracking-widest uppercase ${labelMutedClass}`}>
                  Identificador: {ativo.id}
                </div>

                <div className={`flex items-start justify-between border-b pb-3 ${borderBottomClass}`}>
                  <div>
                    <span className={`text-[8px] px-2 py-0.5 font-semibold uppercase select-none tracking-wider rounded ${
                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-150 text-slate-650'
                    }`}>
                      {ativo.category || 'EXTINTOR'}
                    </span>
                    <h3 className={`text-sm font-extrabold uppercase tracking-wider mt-1.5 font-sans ${
                      isDark ? 'text-slate-100' : 'text-slate-850'
                    }`}>
                      {ativo.model || 'PQS ABC - 8KG'}
                    </h3>
                  </div>
                  <div className={`text-[9px] font-bold uppercase px-2.5 py-1 border select-none rounded-md ${
                    ativo.status === 'Conforme' 
                      ? 'text-emerald-455 border-emerald-900 bg-emerald-950/20' 
                      : 'text-red-455 border-red-900 bg-red-950/20'
                  }`}>
                    {ativo.status || 'Ativo'}
                  </div>
                </div>

                {/* Grid de Informações */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
                  <div className="space-y-1">
                    <span className={`text-[8px] ${textMutedClass} uppercase tracking-wider`}>Patrimônio</span>
                    <p className={`font-semibold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{ativo.idAtivo || ativo.id_ativo || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className={`text-[8px] ${textMutedClass} uppercase tracking-wider`}>Selo Inmetro</span>
                    <p className={`font-semibold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{ativo.seloInmetro || ativo.inmetro || 'N/A'}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <span className={`text-[8px] ${textMutedClass} uppercase tracking-wider flex items-center gap-1`}>
                      <MapPin size={8} className="text-red-500" />
                      Localização Física
                    </span>
                    <p className={`font-semibold leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {ativo.location} {ativo.subLocation ? ` - ${ativo.subLocation}` : ''}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className={`text-[8px] ${textMutedClass} uppercase tracking-wider flex items-center gap-1`}>
                      <Clock size={8} />
                      Última Recarga
                    </span>
                    <p className={`font-semibold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{ativo.lastRecarga || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className={`text-[8px] ${textMutedClass} uppercase tracking-wider flex items-center gap-1`}>
                      <Clock size={8} />
                      Próxima Recarga
                    </span>
                    <p className="font-semibold text-red-500 font-mono">{ativo.validadeRecarga || 'N/A'}</p>
                  </div>
                </div>
              </section>

              {/* FORMULÁRIO */}
              <form onSubmit={handleInspecaoSubmit} className="space-y-6">
                
                {/* Identificação do Inspetor */}
                <section className={`${cardClass} p-5 space-y-4 rounded-2xl`}>
                  <h3 className={`text-[10px] font-bold uppercase tracking-widest border-b pb-2 flex items-center gap-2 ${borderBottomClass} ${isDark ? 'text-slate-350' : 'text-slate-700'}`}>
                    <User size={12} className="text-red-500" />
                    Responsável pela Inspeção
                  </h3>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="inspector" className={`text-[9px] ${textMutedClass} uppercase tracking-wider`}>
                      Nome Completo do Técnico *
                    </label>
                    <input 
                      id="inspector"
                      type="text"
                      required
                      value={tecnicoNome}
                      onChange={(e) => setTecnicoNome(sanitizeInputText(e.target.value))}
                      placeholder="Ex: Jackson Leal"
                      className={`w-full px-3.5 py-3 text-xs focus:outline-none transition-colors rounded-lg ${inputBgClass}`}
                    />
                  </div>
                </section>

                {/* Checklist */}
                <section className={`${cardClass} p-5 space-y-4 rounded-2xl`}>
                  <div className={`flex items-center justify-between border-b pb-2 ${borderBottomClass}`}>
                    <h3 className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-slate-350' : 'text-slate-700'}`}>
                      <FileText size={12} className="text-red-500" />
                      Checklist de Conformidade NBR
                    </h3>
                    <span className={`text-[8px] ${labelMutedClass} uppercase`}>Todos Obrigatórios</span>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    {checklist.map((item) => (
                      <div key={item.key} className={`space-y-2 border-b pb-3 last:border-0 last:pb-0 ${isDark ? 'border-slate-900/60' : 'border-slate-100'}`}>
                        <p className={`text-[11px] font-sans leading-tight ${isDark ? 'text-slate-300' : 'text-slate-705'}`}>
                          {item.label}
                        </p>
                        
                        <div className="flex items-center gap-2" role="group" aria-label={`Avaliação de: ${item.label}`}>
                          <button 
                            type="button"
                            onClick={() => handleChecklistChange(item.key, true)}
                            aria-pressed={item.conforme === true}
                            aria-label={`Marcar ${item.label} como conforme`}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 cursor-pointer rounded-lg ${
                              item.conforme === true
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                                : isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-750'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm'
                            }`}
                          >
                            <Check size={11} />
                            OK
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => handleChecklistChange(item.key, false)}
                            aria-pressed={item.conforme === false}
                            aria-label={`Marcar ${item.label} como não conforme`}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 cursor-pointer rounded-lg ${
                              item.conforme === false
                                ? 'bg-red-650 border-red-500 text-white shadow'
                                : isDark 
                                ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-750'
                                : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100 shadow-sm'
                            }`}
                          >
                            <X size={11} />
                            Não Conforme
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Observações */}
                <section className={`${cardClass} p-5 space-y-4 rounded-2xl`}>
                  <h3 className={`text-[10px] font-bold uppercase tracking-widest border-b pb-2 ${borderBottomClass} ${isDark ? 'text-slate-350' : 'text-slate-700'}`}>
                    Observações Adicionais (Opcional)
                  </h3>
                  <textarea 
                    value={observacoes}
                    onChange={(e) => setObservacoes(sanitizeInputText(e.target.value))}
                    placeholder="Descreva aqui anomalias encontradas, necessidade de recarga, teste hidrostático ou troca..."
                    rows={4}
                    className={`w-full p-3 text-xs focus:outline-none transition-colors font-sans resize-none rounded-lg ${inputBgClass}`}
                  />
                </section>

                {/* Botão de Enviar */}
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => router.push('/inspecao')}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer rounded-xl ${buttonSecondaryClass}`}
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-lg rounded-xl"
                  >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
                    Gravar / Enviar
                  </button>
                </div>

              </form>
            </motion.div>
          )}

          {/* VISTORIA ENVIADA COM SUCESSO */}
          {!loading && !isCadastro && formSubmitted && (
            <motion.div 
              key="inspecao-sucesso"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`p-6 space-y-6 text-center shadow-2xl rounded-2xl border ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                isDark ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-450' : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
              }`}>
                <Check size={32} />
              </div>

              <div className="space-y-2">
                <h3 className={`text-base font-extrabold uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {submissionStatus === 'success_offline' ? 'Salvo Offline com Sucesso!' : 'Inspeção Registrada!'}
                </h3>
                <p className={`text-xs leading-relaxed font-sans max-w-sm mx-auto ${textMutedClass}`}>
                  {submissionStatus === 'success_offline' 
                    ? 'A vistoria foi gravada localmente na fila do celular por falta de rede. Ela será enviada ao Supabase automaticamente quando você se conectar.'
                    : 'Laudo de inspeção transmitido e integrado ao banco de dados histórico do SPCI com sucesso.'}
                </p>
              </div>

              {submissionStatus === 'success_offline' && (
                <div className={`border p-4 rounded-xl text-left flex items-start gap-3 ${
                  isDark ? 'border-amber-900/40 bg-amber-955/15' : 'border-amber-200 bg-amber-50'
                }`}>
                  <AlertTriangle size={22} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1 font-sans">
                    <h4 className="text-[10px] font-bold text-amber-600 uppercase font-mono tracking-wider">Atenção Técnico:</h4>
                    <p className={`text-[10px] leading-snug ${isDark ? 'text-slate-400' : 'text-slate-650'}`}>
                      Não limpe os dados do navegador até restabelecer internet e ver o botão superior de &quot;Sincronia&quot; zerar.
                    </p>
                  </div>
                </div>
              )}

              <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    setChecklist(DEFAULT_CHECKLIST);
                    setObservacoes('');
                    setFormSubmitted(false);
                  }}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer rounded-xl ${buttonSecondaryClass}`}
                >
                  Nova Vistoria
                </button>
                <button 
                  onClick={() => router.push('/inspecao')}
                  className="flex-1 py-3 bg-red-650 hover:bg-red-750 text-white text-[10px] font-bold uppercase tracking-widest cursor-pointer rounded-xl"
                >
                  Voltar ao Portal
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* FOOTER */}
      <footer className={`w-full text-center py-6 border-t z-15 select-none transition-colors ${
        isDark ? 'border-slate-900 bg-slate-950 text-slate-700' : 'border-slate-250 bg-slate-100 text-slate-500'
      }`}>
        <p className="text-[8px] uppercase tracking-[0.25em]">SISTEMA SPCI • PORTAL DE INSPEÇÕES PÚBLICAS v2.2</p>
        <p className="text-[7px] mt-1 font-sans">Desenvolvido em conformidade com as normas ABNT e NBR brasileiras.</p>
      </footer>

      {/* TUTORIAL MODAL POPUP */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 space-y-4 text-left font-sans shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-200">
                  {isCadastro ? 'Instruções de Cadastro' : 'Como Inspecionar'}
                </h3>
                <button 
                  onClick={() => setShowTutorial(false)}
                  className="text-slate-500 hover:text-slate-200 p-1"
                  aria-label="Fechar tutorial"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-450 leading-relaxed">
                {isCadastro ? (
                  <>
                    <p>1. **Categoria:** Identifique e confirme a categoria do ativo (Extintores, Hidrantes, etc.).</p>
                    <p>2. **Patrimônio:** Insira apenas a numeração física. O prefixo (ex: EXT-) é gerado automaticamente pelo SPCI.</p>
                    <p>3. **Localização:** Escolha o Local e descreva a sala ou área específica no Sub-local.</p>
                    <p>4. **Vencimentos:** O sistema agendará a próxima vistoria no mês corrente do cadastro de forma automática.</p>
                  </>
                ) : (
                  <>
                    <p>1. **Identificação:** Confirme se o patrimônio e selo Inmetro batem com o extintor físico à sua frente.</p>
                    <p>2. **Lacre e Pressão:** Cheque se o manômetro está na faixa verde e o lacre plástico está intacto no gatilho.</p>
                    <p>3. **Acesso:** Garanta que não há caixas ou móveis obstruindo o acesso rápido.</p>
                    <p>4. **Sinalização:** Verifique se há placa identificadora e marcação física.</p>
                  </>
                )}
              </div>

              <button 
                onClick={() => setShowTutorial(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold font-mono uppercase tracking-widest cursor-pointer"
                aria-label="Entendido, fechar tutorial"
              >
                ENTENDIDO
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function InspecaoOuCadastroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono">
        <div className="text-center space-y-4">
          <RefreshCw className="animate-spin text-red-500 mx-auto" size={32} />
          <p className="text-[10px] uppercase text-slate-450 tracking-wider">Iniciando Portal de Campo SPCI...</p>
        </div>
      </div>
    }>
      <InspecaoOuCadastroContent />
    </Suspense>
  );
}

