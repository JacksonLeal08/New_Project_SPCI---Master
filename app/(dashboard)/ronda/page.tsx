'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { 
  Flame, 
  Droplet, 
  TriangleAlert, 
  Lightbulb, 
  Cog, 
  Search, 
  Share2, 
  QrCode, 
  Send, 
  Copy, 
  Check, 
  ExternalLink,
  RefreshCw,
  Smartphone,
  Info,
  ChevronRight,
  UserCheck
} from 'lucide-react';

export default function RondaPage() {
  const router = useRouter();
  const {
    extintores,
    hidrantes,
    sinalizacoes,
    iluminacoes,
    bombas
  } = useSpci();

  // Estados do Cockpit
  const [selectedCategory, setSelectedCategory] = useState<'extintores' | 'hidrantes' | 'sinalizacoes' | 'iluminacoes' | 'bombas'>('extintores');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [copiedType, setCopiedType] = useState<'vistoria' | 'cadastro' | 'portal' | null>(null);
  
  // Controle do Iframe do Celular
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeUrl, setIframeUrl] = useState<string>('/inspecao');
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);

  // Categorias do Cockpit com cores e ícones premium
  const categorias = [
    { key: 'extintores', label: 'Extintores', icon: <Flame size={15} />, color: 'text-red-500', bg: 'bg-red-500/10' },
    { key: 'hidrantes', label: 'Hidrantes', icon: <Droplet size={15} />, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    { key: 'sinalizacoes', label: 'Sinalização', icon: <TriangleAlert size={15} />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { key: 'iluminacoes', label: 'Iluminação', icon: <Lightbulb size={15} />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { key: 'bombas', label: 'Bombas SPCI', icon: <Cog size={15} />, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  ] as const;

  // Função para retornar os ativos da categoria ativa
  const getAssetsList = () => {
    switch (selectedCategory) {
      case 'extintores': return extintores || [];
      case 'hidrantes': return hidrantes || [];
      case 'sinalizacoes': return sinalizacoes || [];
      case 'iluminacoes': return iluminacoes || [];
      case 'bombas': return bombas || [];
      default: return [];
    }
  };

  // Filtragem dos ativos conforme a pesquisa
  const filteredAssets = getAssetsList().filter((asset: any) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const patrimonio = String(asset.idAtivo || asset.id || '').toLowerCase();
    const modelo = String(asset.model || asset.name || '').toLowerCase();
    const local = String(asset.location || '').toLowerCase();
    return patrimonio.includes(query) || modelo.includes(query) || local.includes(query);
  });

  // Montagem dos links de acesso técnico
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const linkPortal = `${origin}/inspecao`;
  const linkVistoria = selectedAsset 
    ? `${origin}/inspecao/${selectedAsset.idAtivo || selectedAsset.id}` 
    : '';
  const linkCadastro = `${origin}/inspecao/novo?category=${selectedCategory}`;

  // Funções de Copiar no Clipboard
  const handleCopyText = async (text: string, type: 'vistoria' | 'cadastro' | 'portal') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Enviar Vistoria via WhatsApp Web
  const handleSendWhatsApp = (type: 'vistoria' | 'cadastro') => {
    let msg = '';
    if (type === 'vistoria' && selectedAsset) {
      msg = `Olá Técnico SPCI! Realize a inspeção periódica obrigatória do ativo ${selectedAsset.idAtivo || selectedAsset.id} (${selectedAsset.model || selectedAsset.name || 'PQS'}) localizado no setor [${selectedAsset.location}]. Clique no link para vistoriar: ${linkVistoria}`;
    } else {
      msg = `Olá Técnico SPCI! Acesse o portal público para realizar o cadastro de novos equipamentos de combate a incêndio: ${linkCadastro}`;
    }
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Atualiza o endereço do simulador móvel ao interagir
  const navigateSimulado = (path: string) => {
    setIframeUrl(path);
    setIsIframeLoading(true);
  };

  // Callback de término de carregamento do iframe
  const handleIframeLoad = () => {
    setIsIframeLoading(false);
  };

  // Recarrega o simulador
  const handleReloadIframe = () => {
    if (iframeRef.current) {
      setIsIframeLoading(true);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  // Quando trocar a categoria, limpa o ativo selecionado
  useEffect(() => {
    setTimeout(() => {
      setSelectedAsset(null);
    }, 0);
  }, [selectedCategory]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-800"
    >
      
      {/* Topo do Cockpit */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-red-600 bg-red-50 px-2.5 py-1 rounded">
            Operações em Tempo Real
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2 font-sans">
            Field Dispatch Cockpit <span className="text-slate-400 font-normal font-mono text-sm">v3.0</span>
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Gerencie, imprima QR Codes de patrimônios e despache vistorias aos técnicos de campo para a brigada SPCI.
          </p>
        </div>

        <button
          onClick={() => navigateSimulado('/inspecao')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-mono text-xs uppercase tracking-wider transition-all shadow-md rounded-xl cursor-pointer"
        >
          <Smartphone size={14} />
          Resetar Portal Geral
        </button>
      </div>

      {/* Grid de Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA (5/12): Simulador Móvel Premium (iframe) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          
          <div className="w-full max-w-[390px] space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Smartphone size={12} className="text-emerald-500 animate-pulse" />
                Simulador Técnico Ativo
              </span>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleReloadIframe}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                  title="Recarregar Simulador"
                >
                  <RefreshCw size={12} className={isIframeLoading ? 'animate-spin' : ''} />
                </button>
                <a 
                  href={iframeUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors flex items-center"
                  title="Abrir em Nova Aba"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Container físico do Celular (Visual Apple/Premium Android) */}
            <div className="relative w-full aspect-[9/18.5] bg-slate-900 rounded-[3rem] p-3.5 shadow-2xl border-4 border-slate-950 flex flex-col overflow-hidden ring-1 ring-slate-800">
              {/* Notch de Câmera */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-b-2xl z-40 flex items-center justify-center">
                {/* Linha do alto-falante e lente da câmera */}
                <div className="w-12 h-1 bg-slate-800 rounded-full mb-1"></div>
                <div className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-slate-800 ml-3"></div>
              </div>

              {/* Botões Laterais Decorativos */}
              <div className="absolute left-[-4px] top-28 w-[4px] h-10 bg-slate-900 rounded-l"></div>
              <div className="absolute left-[-4px] top-40 w-[4px] h-12 bg-slate-900 rounded-l"></div>
              <div className="absolute right-[-4px] top-32 w-[4px] h-16 bg-slate-900 rounded-r"></div>

              {/* Corpo da Tela */}
              <div className="relative flex-grow bg-slate-950 rounded-[2.3rem] overflow-hidden flex flex-col border border-slate-800">
                {isIframeLoading && (
                  <div className="absolute inset-0 bg-slate-950 z-30 flex flex-col items-center justify-center space-y-4">
                    <RefreshCw className="animate-spin text-red-600" size={24} />
                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Carregando Tela SPCI...</p>
                  </div>
                )}
                
                <iframe
                  ref={iframeRef}
                  src={iframeUrl}
                  onLoad={handleIframeLoad}
                  className="w-full h-full border-0 select-none bg-slate-950"
                  title="Simulador de Ronda"
                />
              </div>

              {/* Indicador de Barra Home do iOS */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-800 rounded-full z-30 pointer-events-none"></div>
            </div>
            
            <p className="text-[10px] text-slate-400 text-center font-mono select-none">
              O simulador acima está ativo. Quaisquer ações feitas nele serão sincronizadas com o banco local e Supabase em tempo real.
            </p>
          </div>

        </div>

        {/* COLUNA DIREITA (7/12): Despachador de Links e QR Codes */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. SELETOR DE ATIVO DO CAMPO */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-widest">
                Selecione Categoria de Equipamentos
              </h3>
            </div>

            {/* Grid de categorias de despacho */}
            <div className="grid grid-cols-5 gap-2">
              {categorias.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer select-none active:scale-95 ${
                      isSelected 
                        ? 'border-red-600 bg-red-50 text-red-700 font-bold shadow-sm' 
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-350 hover:bg-slate-100 shadow-xs'
                    }`}
                  >
                    <span className={`p-1.5 rounded-lg mb-1 ${isSelected ? 'bg-red-200/50 text-red-650' : 'bg-slate-200/50 text-slate-600'}`}>
                      {cat.icon}
                    </span>
                    <span className="text-[8px] font-sans font-black tracking-tight uppercase truncate w-full">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Barra de Pesquisa e Filtros */}
            <div className="relative">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Pesquisar na categoria de ${selectedCategory}...`}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-red-500 font-sans shadow-xs text-slate-900"
              />
              <Search size={14} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Listagem de ativos carregada */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto custom-scrollbar">
              {filteredAssets.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-sans">
                  Nenhum ativo localizado para despacho nesta categoria.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredAssets.map((asset: any) => {
                    const isSelected = selectedAsset && (selectedAsset.id === asset.id || selectedAsset.idAtivo === asset.idAtivo);
                    const conforming = asset.status === 'Conforme';
                    return (
                      <button
                        key={asset.id}
                        onClick={() => {
                          setSelectedAsset(asset);
                          navigateSimulado(`/inspecao/${asset.idAtivo || asset.id}`);
                        }}
                        className={`w-full flex items-center justify-between p-3.5 text-left transition-colors cursor-pointer ${
                          isSelected ? 'bg-red-50/50 border-l-4 border-l-red-600' : 'hover:bg-slate-50 bg-white'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase">
                              {asset.idAtivo || asset.id}
                            </span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              conforming ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                            }`}>
                              {asset.status || 'Ativo'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 font-sans">{asset.model || asset.name}</p>
                          <p className="text-[10px] text-slate-500 font-sans flex items-center gap-1">📍 {asset.location}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ação de Cadastro de Novo */}
            <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="font-sans">
                <p className="text-xs font-bold text-slate-800">Novo Ativo nesta Categoria?</p>
                <p className="text-[10px] text-slate-500">Envie o link de cadastro direto para o técnico no local.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateSimulado(`/inspecao/novo?category=${selectedCategory}`)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-mono uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  <Smartphone size={10} />
                  Simulador
                </button>
                <button
                  onClick={() => handleSendWhatsApp('cadastro')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-mono uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none shadow-sm"
                >
                  <Send size={10} />
                  WhatsApp
                </button>
              </div>
            </div>

          </div>

          {/* 2. PAINEL DE DESPACHO E QR CODE DO ATIVO */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden">
            
            <AnimatePresence mode="wait">
              {!selectedAsset ? (
                <motion.div
                  key="no-selection"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-16 text-center space-y-3"
                >
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Info size={24} />
                  </div>
                  <p className="text-xs font-sans text-slate-500 font-semibold">
                    Nenhum equipamento selecionado para despacho.
                  </p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    Selecione um ativo na listagem acima para gerar o QR Code correspondente e despachar as inspeções físicas.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="selection-active"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
                >
                  
                  {/* Bloco QR Code (Esquerda da Ficha) */}
                  <div className="md:col-span-5 text-center space-y-3.5">
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-widest block">
                      Código Patrimonial QR
                    </span>
                    
                    {/* Imagem do QR Code via API pública QRServer */}
                    <div className="relative inline-block border-4 border-slate-100 bg-white p-2 shadow rounded-xl">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(linkVistoria)}`} 
                        alt={`QR Code ${selectedAsset.idAtivo}`} 
                        className="w-36 h-36 mx-auto select-none"
                      />
                    </div>
                    
                    <a
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(linkVistoria)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-red-655 font-bold hover:underline"
                    >
                      <QrCode size={13} />
                      Baixar em Alta NBR
                    </a>
                  </div>

                  {/* Ficha e Ações de Despacho (Direita da Ficha) */}
                  <div className="md:col-span-7 space-y-4">
                    
                    <div className="border-b border-slate-100 pb-3 space-y-1">
                      <span className="text-[9px] bg-red-100 text-red-750 px-2 py-0.5 rounded font-bold font-mono uppercase tracking-wider inline-block">
                        Ativo Selecionado
                      </span>
                      <h4 className="text-base font-black text-slate-900 font-sans tracking-tight uppercase">
                        {selectedAsset.model || selectedAsset.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-sans">
                        Setor: {selectedAsset.location} {selectedAsset.subLocation ? ` - ${selectedAsset.subLocation}` : ''}
                      </p>
                    </div>

                    {/* Ficha técnica em formato compactado */}
                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider block">Patrimônio</span>
                        <span className="font-bold font-mono text-slate-700">{selectedAsset.idAtivo || selectedAsset.id}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider block">Selo Inmetro</span>
                        <span className="font-bold font-mono text-slate-700">{selectedAsset.seloInmetro || 'Isento'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider block">Última Vistoria</span>
                        <span className="font-bold text-slate-750 flex items-center gap-1 mt-0.5">
                          <UserCheck size={12} className="text-emerald-500" />
                          {selectedAsset.lastRecarga || selectedAsset.lastInsp || 'Mês Corrente'} ({selectedAsset.status})
                        </span>
                      </div>
                    </div>

                    {/* Ações de Despacho */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-widest block">
                        Despachar Inspeção de Campo
                      </span>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* WhatsApp Dispatch */}
                        <button
                          onClick={() => handleSendWhatsApp('vistoria')}
                          className="flex-grow flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer border-none shadow-sm rounded-lg active:scale-98"
                        >
                          <Send size={12} />
                          WhatsApp Web
                        </button>
                        
                        {/* Copiar Link de Vistoria */}
                        <button
                          onClick={() => handleCopyText(linkVistoria, 'vistoria')}
                          className={`px-4 py-2.5 border font-mono text-xs uppercase tracking-wider transition-all cursor-pointer rounded-lg flex items-center justify-center gap-2 active:scale-98 ${
                            copiedType === 'vistoria'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {copiedType === 'vistoria' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          {copiedType === 'vistoria' ? 'Copiado!' : 'Copiar Link'}
                        </button>
                      </div>

                      {/* Copiar Link Geral */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 font-mono">
                        <span>Portal Público Geral:</span>
                        <button
                          onClick={() => handleCopyText(linkPortal, 'portal')}
                          className="text-red-655 font-bold hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
                        >
                          {copiedType === 'portal' ? 'Copiado!' : 'Copiar URL Geral'}
                          {copiedType === 'portal' ? <Check size={8} /> : <Copy size={8} />}
                        </button>
                      </div>

                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

      </div>

    </motion.div>
  );
}
