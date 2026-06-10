import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { supabase } from '@/lib/supabaseClient';
import { compressImage } from '@/lib/imageCompressor';
import { MediaQueue } from '@/lib/mediaQueue';
import { 
  Flame, 
  Droplet, 
  AlertTriangle, 
  Lightbulb, 
  Sliders, 
  Check, 
  X,
  QrCode
} from 'lucide-react';
import QrCameraScanner from './QrCameraScanner';
import { parseInmetroCode } from '@/lib/utils';

interface AssetAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function AssetAddModal({ isOpen, onClose }: AssetAddModalProps) {
  const {
    newAssetType,
    setNewAssetType,
    extintores,
    setExtintores,
    hidrantes,
    setHidrantes,
    sinalizacoes,
    setSinalizacoes,
    iluminacoes,
    setIluminacoes,
    bombas,
    setBombas,
    saveAssetsList,
    triggerSuccessNotification,
    logSystemAction
  } = useSpci();

  // --- ESTADOS PARA METADADOS DO SUPABASE ---
  const [locaisList, setLocaisList] = useState<any[]>([]);
  const [subLocaisList, setSubLocaisList] = useState<any[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [selectedLocalId, setSelectedLocalId] = useState('');
  const [selectedSubLocalId, setSelectedSubLocalId] = useState('');
  const [newSubLocalName, setNewSubLocalName] = useState('');
  const [selectedModeloId, setSelectedModeloId] = useState('');
  const [modelosList, setModelosList] = useState<any[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // --- ESTADOS LOCAIS DO FORMULÁRIO ---
  const [formLocal, setFormLocal] = useState('MANGANÊS');
  const [newLocalName, setNewLocalName] = useState('');
  const [formSubLocal, setFormSubLocal] = useState('BARRAGEM DO AZUL');
  const [formPatrimonio, setFormPatrimonio] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSelo, setFormSelo] = useState('');
  const [formChassi, setFormChassi] = useState('');
  const [formSystemType, setFormSystemType] = useState('CONJUNTO DE BLOCO AUTÔNOMO');
  const [multiSelectModels, setMultiSelectModels] = useState<string[]>([]);

  // Novos campos específicos de Extintores
  const [formWeightCap, setFormWeightCap] = useState('6KG');
  const [formDataRecarga, setFormDataRecarga] = useState(new Date().toISOString().substring(0, 10));
  const [formValidadeRecargaMeses, setFormValidadeRecargaMeses] = useState('12');
  const [formAnoTesteHidro, setFormAnoTesteHidro] = useState(new Date().getFullYear().toString());
  const [formDataPesagemCo2, setFormDataPesagemCo2] = useState('');

  // Upload de Imagem
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressionDetails, setCompressionDetails] = useState<{ original: string; compressed: string; reduction: number } | null>(null);

  // Carregar dados de locais e modelos de extintor do banco
  useEffect(() => {
    if (isOpen) {
      const loadMetadata = async () => {
        setLoadingMetadata(true);
        try {
          // 1. Buscar locais
          const { data: locales, error: locErr } = await supabase
            .from('locais')
            .select('*')
            .order('nome', { ascending: true });
          
          let loadedLocales = locales || [];
          if (loadedLocales.length === 0) {
            // Seed se vazio
            const defaultLocales = [
              { nome: 'MANGANÊS' },
              { nome: 'ALMOXARIFADO' },
              { nome: 'SALA ELÉTRICA' },
              { nome: 'BARRAGEM DO AZUL' },
              { nome: 'ROTA DE FUGA 01' },
              { nome: 'ROTA DE FUGA 02' },
              { nome: 'RECEPÇÃO' },
              { nome: 'COBRE' },
              { nome: 'FERRO' }
            ];
            const { data: seeded } = await supabase
              .from('locais')
              .insert(defaultLocales)
              .select('*');
            if (seeded) loadedLocales = seeded;
          }
          setLocaisList(loadedLocales);
          if (loadedLocales.length > 0) {
            setSelectedLocalId(loadedLocales[0].id);
            setFormLocal(loadedLocales[0].nome);
          }

          // 2. Buscar modelos_extintores
          const { data: models, error: modErr } = await supabase
            .from('modelos_extintores')
            .select('*')
            .order('nome', { ascending: true });
          
          let loadedModels = models || [];
          if (loadedModels.length === 0) {
            const defaultModels = [
              { nome: 'PQS ABC - 8KG' },
              { nome: 'CO2 - 6KG' },
              { nome: 'ÁGUA PRESSURIZADA - 10L' },
              { nome: 'PQS BC - 4KG' }
            ];
            const { data: seeded } = await supabase
              .from('modelos_extintores')
              .insert(defaultModels)
              .select('*');
            if (seeded) loadedModels = seeded;
          }
          setModelosList(loadedModels);
          if (loadedModels.length > 0) {
            setSelectedModeloId(loadedModels[0].id);
            setFormModel(loadedModels[0].nome);
          }

          // 3. Buscar sub_locais
          const { data: subLocales } = await supabase
            .from('sub_locais')
            .select('*')
            .order('nome', { ascending: true });
          
          setSubLocaisList(subLocales || []);
        } catch (e) {
          console.error('Erro ao carregar metadados do Supabase:', e);
        } finally {
          setLoadingMetadata(false);
        }
      };
      
      loadMetadata();
      // Reseta estados de upload de forma assíncrona para evitar renderização em cascata
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setCompressionDetails(null);
        setSelectedSubLocalId('');
        setNewSubLocalName('');
        setIsScannerOpen(false);
      }, 0);
    }
  }, [isOpen]);

  const filteredSubLocais = subLocaisList.filter(s => s.local_id === selectedLocalId);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedLocalId === 'NEW') {
        setSelectedSubLocalId('NEW');
      } else {
        setSelectedSubLocalId('');
        setNewSubLocalName('');
        setFormSubLocal('');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedLocalId]);

  if (!isOpen) return null;

  const SECTORS_LIST = [
    'MANGANÊS', 'ALMOXARIFADO', 'SALA ELÉTRICA', 'BARRAGEM DO AZUL', 
    'ROTA DE FUGA 01', 'ROTA DE FUGA 02', 'RECEPÇÃO', 'COBRE', 'FERRO'
  ];

  // Categories config
  const CATEGORIES: { id: 'extintor' | 'hidrante' | 'sinalizacao' | 'iluminacao' | 'bomba'; label: string; sublabel: string; icon: any }[] = [
    { id: 'extintor', label: 'Extintor', sublabel: 'Combate Primário', icon: Flame },
    { id: 'hidrante', label: 'Hidrante', sublabel: 'Rede Hidrantes', icon: Droplet },
    { id: 'sinalizacao', label: 'Sinalização', sublabel: 'Rota de Fuga', icon: AlertTriangle },
    { id: 'iluminacao', label: 'Iluminação', sublabel: 'Blocos Emerg.', icon: Lightbulb },
    { id: 'bomba', label: 'Bombas', sublabel: 'Casa de Bombas', icon: Sliders }
  ];

  // Helper to detect if selected model is CO2
  const selectedModelName = modelosList.find((m: any) => m.id === selectedModeloId)?.nome || formModel || '';
  const isCo2 = selectedModelName.toUpperCase().includes('CO2');

  const handleLocalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedLocalId(val);
    if (val === 'NEW') {
      setFormLocal('');
      setNewLocalName('');
    } else {
      const locName = locaisList.find(l => l.id === val)?.nome || '';
      setFormLocal(locName);
    }
  };

  const handleModeloChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedModeloId(val);
    const modName = modelosList.find((m: any) => m.id === val)?.nome || '';
    setFormModel(modName);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const result = await compressImage(file);
        setSelectedFile(result.file);
        setPreviewUrl(result.previewUrl);
        
        const originalStr = result.originalSizeKb > 1024 
          ? `${(result.originalSizeKb / 1024).toFixed(2)} MB` 
          : `${result.originalSizeKb.toFixed(0)} KB`;
          
        const compressedStr = result.compressedSizeKb > 1024 
          ? `${(result.compressedSizeKb / 1024).toFixed(2)} MB` 
          : `${result.compressedSizeKb.toFixed(0)} KB`;

        setCompressionDetails({
          original: originalStr,
          compressed: compressedStr,
          reduction: result.reductionPercentage
        });

        triggerSuccessNotification(
          "Imagem Otimizada! 📸",
          `A imagem foi compactada com sucesso para economizar espaço.\nRedução: ${result.reductionPercentage}% (${originalStr} → ${compressedStr})`
        );
      } catch (err: any) {
        console.error('Erro ao compactar imagem:', err);
        // Fallback
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  // Helper to dynamically calculate next inspection MM/YYYY
  const getNextInspectionDateStr = () => {
    const today = new Date();
    let targetMonth = today.getMonth() + 1; // 1-indexed
    let targetYear = today.getFullYear();

    if (newAssetType === 'extintor') {
      targetYear += 1;
    } else if (newAssetType === 'hidrante') {
      targetMonth += 6;
      if (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }
    } else {
      // Outros: Rota/Bloco/Bomba padrão 1 ano
      targetYear += 1;
    }

    const monthStr = String(targetMonth).padStart(2, '0');
    return `${monthStr}/${targetYear}`;
  };

  const handleAddNewAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatrimonio) {
      alert("Preencha o Número de Patrimônio!");
      return;
    }

    let finalLocalId = selectedLocalId;
    let finalLocalName = formLocal;

    if (selectedLocalId === 'NEW') {
      const uppercaseNewLocal = newLocalName.trim().toUpperCase();
      const localDup = locaisList.find(l => l.nome.toUpperCase() === uppercaseNewLocal);
      if (localDup) {
        finalLocalId = localDup.id;
        finalLocalName = localDup.nome;
      } else {
        const { data: newLocObj, error: locInsErr } = await supabase
          .from('locais')
          .insert({ nome: uppercaseNewLocal })
          .select('*')
          .single();

        if (locInsErr) throw locInsErr;
        if (newLocObj) {
          finalLocalId = newLocObj.id;
          finalLocalName = newLocObj.nome;
          setLocaisList(prev => [...prev, newLocObj].sort((a, b) => a.nome.localeCompare(b.nome)));
        }
      }
    }

    let finalSubLocalId = selectedSubLocalId;
    let finalSubLocalName = formSubLocal;

    if (selectedSubLocalId === 'NEW') {
      const uppercaseNewSub = newSubLocalName.trim().toUpperCase();
      const subDup = subLocaisList.find(s => s.local_id === finalLocalId && s.nome.toUpperCase() === uppercaseNewSub);
      if (subDup) {
        finalSubLocalId = subDup.id;
        finalSubLocalName = subDup.nome;
      } else {
        const { data: newSubObj, error: subInsErr } = await supabase
          .from('sub_locais')
          .insert({ local_id: finalLocalId, nome: uppercaseNewSub })
          .select('*')
          .single();

        if (subInsErr) throw subInsErr;
        if (newSubObj) {
          finalSubLocalId = newSubObj.id;
          finalSubLocalName = newSubObj.nome;
          setSubLocaisList(prev => [...prev, newSubObj].sort((a, b) => a.nome.localeCompare(b.nome)));
        }
      }
    }

    const getPrefix = () => {
      switch (newAssetType) {
        case 'extintor': return 'EXT-';
        case 'hidrante': return 'HD-';
        case 'sinalizacao': return 'SE-';
        case 'iluminacao': return 'IE-';
        case 'bomba': return 'CB-';
        default: return 'PAT-';
      }
    };
    const prefix = getPrefix();
    const codePatrimonio = formPatrimonio.toUpperCase().startsWith(prefix) 
      ? formPatrimonio.toUpperCase() 
      : `${prefix}${formPatrimonio.toUpperCase()}`;

    // Gerar UUID para persistência no banco relacional
    const uniqueId = generateUUID();

    // Upload da foto para o Supabase Storage se houver arquivo
    let uploadedFotoUrl = '';
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop() || 'jpg';
      const fileName = `ext_${codePatrimonio}_${Date.now()}.${fileExt}`;
      const isOnline = typeof window !== 'undefined' && navigator.onLine;

      if (isOnline) {
        setUploadingImage(true);
        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('fotos_extintores')
            .upload(fileName, selectedFile);

          if (uploadErr) throw uploadErr;

          // Recuperar a URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('fotos_extintores')
            .getPublicUrl(uploadData.path);

          uploadedFotoUrl = publicUrl;
        } catch (err: any) {
          console.warn('Erro ao enviar imagem ao storage online, enfileirando:', err);
          await MediaQueue.enqueue(uniqueId, 'extintores', fileName, selectedFile);
        } finally {
          setUploadingImage(false);
        }
      } else {
        console.log('[Offline] Enfileirando foto na MediaQueue...');
        await MediaQueue.enqueue(uniqueId, 'extintores', fileName, selectedFile);
      }
    }

    if (newAssetType === 'extintor') {
      const selectedModeloObj = modelosList.find((m: any) => m.id === selectedModeloId);

      // Calcular data de validade da recarga localmente para exibir rápido
      const recargaDate = new Date(formDataRecarga);
      const validityMonths = parseInt(formValidadeRecargaMeses, 10) || 12;
      recargaDate.setMonth(recargaDate.getMonth() + validityMonths);
      const validadeRecargaStr = recargaDate.toISOString().substring(0, 10);

      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        category: 'extintores',
        location: finalLocalName,
        subLocation: finalSubLocalName || formSubLocal || 'GERAL',
        status: 'Conforme', // Será recalculado pela View do banco
        
        // Chaves estrangeiras relacionais
        local_id: finalLocalId || null,
        sub_local_id: finalSubLocalId || null,
        modelo_id: selectedModeloId || null,
        
        // Mapeamento específico e de compatibilidade
        model: selectedModeloObj?.nome || formModel || 'PQS ABC - 8KG',
        peso_capacidade: formWeightCap,
        peso: formWeightCap.replace(/\D/g, ''), // Compatibilidade antiga
        seloInmetro: formSelo,
        chassi: formChassi,
        data_ultima_recarga: formDataRecarga,
        lastRecarga: formDataRecarga,
        meses_validade_recarga: validityMonths,
        validadeRecargaMeses: validityMonths,
        ano_ultimo_teste_hidro: parseInt(formAnoTesteHidro, 10) || new Date().getFullYear(),
        ultimoTesteHidro: parseInt(formAnoTesteHidro, 10) || new Date().getFullYear(),
        data_pesagem_co2: isCo2 ? (formDataPesagemCo2 || null) : null,
        fotoUrl: uploadedFotoUrl,
        foto_url: uploadedFotoUrl,
        validadeRecarga: validadeRecargaStr
      };

      const updated = [newObj, ...extintores];
      setExtintores(updated);
      await saveAssetsList('extintores', updated);
    } else if (newAssetType === 'hidrante') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: finalLocalName,
        subLocation: finalSubLocalName || formSubLocal || 'GERAL',
        components: ['2 Mangueiras (15m)', '1 Esguicho Regulável', '2 Chaves Storz'],
        lastInsp: new Date().toISOString().substring(0, 10),
        nextInsp: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        status: 'Conforme',
        category: 'hidrantes'
      };
      const updated = [newObj, ...hidrantes];
      setHidrantes(updated);
      await saveAssetsList('hidrantes', updated);
    } else if (newAssetType === 'sinalizacao') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: finalLocalName,
        subLocation: finalSubLocalName || formSubLocal || 'GERAL',
        model: multiSelectModels.join(', ') || 'Placa Multi-Direcional - C3',
        group: 'Rota de Fuga',
        status: 'Conforme',
        category: 'sinalizacoes'
      };
      const updated = [newObj, ...sinalizacoes];
      setSinalizacoes(updated);
      await saveAssetsList('sinalizacoes', updated);
    } else if (newAssetType === 'iluminacao') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: finalLocalName,
        subLocation: finalSubLocalName || formSubLocal || 'GERAL',
        systemType: formSystemType,
        model: multiSelectModels.join(', ') || 'Bloco 30 LEDs',
        qty: 1,
        battery: '100%',
        autonomy: '120m / 120m',
        status: 'Operacional',
        category: 'iluminacao'
      };
      const updated = [newObj, ...iluminacoes];
      setIluminacoes(updated);
      await saveAssetsList('iluminacao', updated);
    } else if (newAssetType === 'bomba') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: finalLocalName,
        subLocation: finalSubLocalName || formSubLocal || 'GERAL',
        model: formModel || 'Bomba Centrífuga Principal',
        pressure: 'Estável - 120 MCA',
        starts: '0',
        power: 'Rede 380V',
        range: '100 - 125 PSI',
        status: 'Standby',
        category: 'bombas'
      };
      const updated = [newObj, ...bombas];
      setBombas(updated);
      await saveAssetsList('bombas', updated);
    }

    const categoryPlural = newAssetType === 'extintor' 
      ? 'extintores' 
      : (newAssetType === 'sinalizacao' 
        ? 'sinalizacoes' 
        : (newAssetType === 'iluminacao' 
          ? 'iluminacao' 
          : (newAssetType === 'bomba' ? 'bombas' : 'hidrantes')));
    
    await logSystemAction(
      'CADASTRO_ATIVO', 
      categoryPlural, 
      codePatrimonio, 
      `Ativo ${newAssetType} patrimônio ${codePatrimonio} cadastrado com sucesso.`
    ).catch(console.error);

    setFormPatrimonio('');
    setFormSelo('');
    setFormChassi('');
    setFormWeightCap('6KG');
    setFormValidadeRecargaMeses('12');
    setFormAnoTesteHidro(new Date().getFullYear().toString());
    setFormDataPesagemCo2('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setMultiSelectModels([]);
    setSelectedSubLocalId('');
    setNewSubLocalName('');
    setNewLocalName('');
    onClose();
    triggerSuccessNotification('Equipamento Registrado!', `Ativo ${codePatrimonio} foi cadastrado no banco de dados SPCI.`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-45 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-2xl relative my-8 font-mono text-xs text-slate-800"
      >
        {/* Accent Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-650 rounded-t-2xl" aria-hidden="true" />

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl pt-7">
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">
              CADASTRO DE EQUIPAMENTOS
            </span>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mt-1 flex items-center gap-1.5">
              ✍️ Cadastrar Novo Ativo no Sistema SPCI
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-800 border border-slate-200 hover:border-slate-350 bg-white p-2 transition-all rounded-xl cursor-pointer shadow-xs"
            title="Fechar Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body (Scrollable Form) */}
        <div className="p-6 space-y-6 max-h-[68vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50">
          
          {/* Visual Category Selection Grid */}
          <div>
            <span className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-3">
              Selecione a Categoria do Ativo
            </span>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {CATEGORIES.map((item) => {
                const Icon = item.icon;
                const isSelected = newAssetType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNewAssetType(item.id)}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer text-center group active:scale-95 ${
                      isSelected 
                        ? 'border-2 border-red-600 bg-red-50/40 text-red-600 font-bold shadow-xs' 
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {/* Badge Checkmark */}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-red-650 text-white rounded-full flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 font-bold" />
                      </div>
                    )}
                    <Icon className={`w-6 h-6 mb-2 transition-transform group-hover:scale-110 ${isSelected ? 'text-red-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] uppercase font-extrabold leading-none">{item.label}</span>
                    <span className="text-[8px] text-slate-400 font-medium font-sans mt-1 leading-none">{item.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleAddNewAssetSubmit} className="space-y-5 text-slate-700">
            {loadingMetadata ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-red-600 rounded-full animate-spin"></div>
                <span>Carregando dados da planta...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Local */}
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Setor da Planta *</label>
                  <select 
                    value={selectedLocalId} 
                    onChange={handleLocalChange} 
                    className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold shadow-xs cursor-pointer"
                    required
                  >
                    {locaisList.map(loc => <option key={loc.id} value={loc.id}>{loc.nome}</option>)}
                    <option value="NEW">+ Adicionar Novo Setor...</option>
                  </select>
                </div>

                {/* New Sector Input (if selected NEW) */}
                {selectedLocalId === 'NEW' && (
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold uppercase text-red-655 mb-2">Nome do Novo Setor *</label>
                    <input 
                      type="text" 
                      value={newLocalName}
                      onChange={(e) => setNewLocalName(e.target.value)}
                      placeholder="Ex: CALDEIRAS"
                      className="w-full bg-white border border-red-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-850 outline-none font-bold uppercase"
                      required
                    />
                  </div>
                )}

                {/* Sub Local Select */}
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Sub-Local (Posição Física) *</label>
                  <select
                    value={selectedSubLocalId}
                    onChange={(e) => {
                      setSelectedSubLocalId(e.target.value);
                      const selectedSub = filteredSubLocais.find(s => s.id === e.target.value);
                      setFormSubLocal(selectedSub ? selectedSub.nome : '');
                    }}
                    className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold shadow-xs cursor-pointer"
                    required
                  >
                    <option value="">Selecione...</option>
                    {filteredSubLocais.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.nome}</option>
                    ))}
                    <option value="NEW">+ Adicionar Novo Sub-Local...</option>
                  </select>
                </div>

                {/* New Sub-Local Input (if selected NEW) */}
                {selectedSubLocalId === 'NEW' && (
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold uppercase text-red-655 mb-2">Nome do Novo Sub-Local *</label>
                    <input
                      type="text"
                      value={newSubLocalName}
                      onChange={(e) => setNewSubLocalName(e.target.value)}
                      placeholder="Ex: COPA"
                      className="w-full bg-white border border-red-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-850 outline-none font-bold uppercase"
                      required
                    />
                  </div>
                )}

                {/* Patrimonio */}
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Número do Patrimônio *</label>
                  <div className="flex shadow-xs rounded-xl overflow-hidden border border-slate-200 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600">
                    <span className="bg-slate-100 text-slate-500 text-xs px-4 flex items-center border-r border-slate-200 select-none font-bold">
                      {newAssetType === 'extintor' ? 'EXT-' : newAssetType === 'hidrante' ? 'HD-' : newAssetType === 'sinalizacao' ? 'SE-' : newAssetType === 'iluminacao' ? 'IE-' : newAssetType === 'bomba' ? 'CB-' : 'PAT-'}
                    </span>
                    <input 
                      type="text" 
                      value={formPatrimonio} 
                      onChange={(e) => setFormPatrimonio(e.target.value)} 
                      className="w-full bg-white p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold uppercase" 
                      placeholder="Ex: 1042" 
                      required 
                    />
                  </div>
                </div>

                {/* EXTINTORES EXTRA FIELDS */}
                {newAssetType === 'extintor' && (
                  <>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Modelo do Extintor *</label>
                      {modelosList.length > 0 ? (
                        <select 
                          value={selectedModeloId} 
                          onChange={handleModeloChange} 
                          className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-850 outline-none font-bold shadow-xs cursor-pointer"
                        >
                          {modelosList.map((mod: any) => <option key={mod.id} value={mod.id}>{mod.nome}</option>)}
                        </select>
                      ) : (
                        <select 
                          value={formModel} 
                          onChange={(e) => setFormModel(e.target.value)} 
                          className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-850 outline-none font-bold shadow-xs cursor-pointer"
                        >
                          <option value="PQS ABC - 8KG">Pós Químico ABC - 8KG</option>
                          <option value="CO2 - 6KG">Gás Carbônico CO2 - 6KG</option>
                          <option value="ÁGUA PRESSURIZADA - 10L">Água Pressurizada - 10L</option>
                          <option value="PQS BC - 4KG">Pós Químico BC - 4KG</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Capacidade / Peso *</label>
                      <input 
                        type="text" 
                        value={formWeightCap} 
                        onChange={(e) => setFormWeightCap(e.target.value)} 
                        className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-mono" 
                        placeholder="Ex: 6KG, 8KG, 10L" 
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Selo Inmetro (Opcional)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={formSelo} 
                          onChange={(e) => setFormSelo(e.target.value)} 
                          className="flex-grow bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-850 outline-none font-mono" 
                          placeholder="S-123456" 
                        />
                        <button
                          type="button"
                          onClick={() => setIsScannerOpen(true)}
                          className="px-3 bg-red-650 hover:bg-red-700 text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-sm active:scale-95 border-none"
                          title="Escanear Selo com a Câmera"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Chassi Corporativo</label>
                      <input 
                        type="text" 
                        value={formChassi} 
                        onChange={(e) => setFormChassi(e.target.value)} 
                        className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none uppercase" 
                        placeholder="E-4099" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Data da Última Recarga *</label>
                      <input 
                        type="date" 
                        value={formDataRecarga} 
                        onChange={(e) => setFormDataRecarga(e.target.value)} 
                        className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold" 
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Validade da Recarga (Meses) *</label>
                      <input 
                        type="number" 
                        value={formValidadeRecargaMeses} 
                        onChange={(e) => setFormValidadeRecargaMeses(e.target.value)} 
                        className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none" 
                        min="1" 
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Ano do Último Teste Hidrostático *</label>
                      <input 
                        type="number" 
                        value={formAnoTesteHidro} 
                        onChange={(e) => setFormAnoTesteHidro(e.target.value)} 
                        className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none" 
                        min="1900" 
                        max="2100" 
                        required
                      />
                    </div>

                    {/* Campo Condicional para Pesagem de CO2 */}
                    {isCo2 && (
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Data da Pesagem CO2 *</label>
                        <input 
                          type="date" 
                          value={formDataPesagemCo2} 
                          onChange={(e) => setFormDataPesagemCo2(e.target.value)} 
                          className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold" 
                          required={isCo2}
                        />
                      </div>
                    )}

                    {/* Foto Upload Picker */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Foto do Extintor</label>
                      <div className="border-2 border-dashed border-slate-200 hover:border-red-650 transition-all rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50/50 cursor-pointer relative group">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange} 
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        {previewUrl ? (
                          <div className="flex flex-col items-center gap-2">
                            <img src={previewUrl} alt="Preview" className="h-32 object-contain rounded-lg border border-slate-200" />
                            <span className="text-[10px] text-slate-500 font-bold">Clique para alterar a imagem</span>
                            {compressionDetails && (
                              <div className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-md font-sans font-bold flex flex-col items-center">
                                <span>⚡ IMAGEM COMPACTADA ⚡</span>
                                <span>Economia de {compressionDetails.reduction}% ({compressionDetails.original} → {compressionDetails.compressed})</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-center text-slate-400 group-hover:text-red-600">
                            <span className="text-xl">📸</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Clique para selecionar foto</span>
                            <span className="text-[8px] font-sans">PNG, JPG ou WEBP</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* SINALIZACOES EXTRA FIELDS */}
                {newAssetType === 'sinalizacao' && (
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-3">Selecione os Modelos Visuais *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { key: 'C3 Seta Esquerda', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNNbUfk2-mF0LxprKV2C7RKYXByvjbUXy_XWGbND3PaNoNkZwm1WPALDNXzWKlln0_0NhdfGno-XDTHgppxN_u_498yg03tdmYfiXnVOZmjdDfRjlduzDfLIZOdwrukwEBBsjFja9AeeWHamh8Oj6ix518U7tf8MlGGpDq_EoeNy-CpyAUiBoiAeQIdJ8TsTDvlPcjLNk61VGY7vOr1sIpD81yn4jzCVzqDrNzI9qIwa3kLdAva8y-52WbK7TegbKDD9z-fC8hNds', desc: 'Saída Esquerda' },
                        { key: 'C2 Seta Escada', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4jlkr2uN2Tr6OJK6xOqq__Dmr4HqtdL80oYJ6xWONK9spyiKxm43StnH--3VPFVk3V2XvVl_oGmZF5F5Uckdfj_OMtvTldfCBdMMEs8kM6bKlsvNx4Dhk1iFXyYzAXZOs4XY-8L9NBBMOfMOj391GSo1Giw5N39-HB3gvS6RBY0QOmesGudZbE-gzJGedDPv9HK6BepGwGVEUC9sN4FqqkHlrCtabrdHhw-CcdWchRdmKVmkhJleznOXtmpaGQsIbLWLIQCOHztk', desc: 'Saída Descendo' },
                        { key: 'C3 Seta Direita', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqRdNZ3PxX3jI5lZpnWd--u2m8jxVQqLaqU5vQ0pkiBWzfqr50eBZzbBsJKE85XpDbsDZEa31a6kA6sqnv8_Am4020bV21UWRP3xqBcxjHNQtlqgZ6cQI-s8sXNS25S4tlRyp4FgxG2ni9Wz4f5tlN28lxhNVEVU48Np-IXSp9m588pUkW-fDPGTsWVIglvkAXH9H2yl9Z7t9W71qZKjMsRzE4HCaRnTv6XkbI2BUqhUF5lx86aP3hEpAt7kez4KrFHpv8Tw3ieGM', desc: 'Saída Direita' }
                      ].map(item => {
                        const isChecked = multiSelectModels.includes(item.key);
                        return (
                          <label 
                            key={item.key} 
                            className={`relative border p-3 flex flex-col items-center cursor-pointer transition-all rounded-xl hover:bg-slate-50 ${
                              isChecked ? 'border-red-600 bg-red-50/20' : 'border-slate-200 bg-white'
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) setMultiSelectModels([...multiSelectModels, item.key]);
                                else setMultiSelectModels(multiSelectModels.filter(g => g !== item.key));
                              }}
                              className="absolute top-2 left-2 cursor-pointer w-4.5 h-4.5 accent-red-650" 
                            />
                            <img src={item.url} alt={item.desc} className="h-12 w-full object-contain mb-2 brightness-95 saturate-50 mix-blend-multiply" />
                            <span className="text-[9px] text-center font-black text-slate-600 uppercase leading-none">{item.desc}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ILUMINACAO EXTRA FIELDS */}
                {newAssetType === 'iluminacao' && (
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Tipo de Sistema *</label>
                    <select 
                      value={formSystemType} 
                      onChange={(e) => setFormSystemType(e.target.value)} 
                      className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold shadow-xs cursor-pointer"
                    >
                      <option value="CONJUNTO DE BLOCO AUTÔNOMO">CONJUNTO DE BLOCO AUTÔNOMO</option>
                      <option value="SISTEMA CENTRALIZADO BATERIAS">SISTEMA CENTRALIZADO BATERIAS</option>
                    </select>
                  </div>
                )}

                {/* BOMBAS EXTRA FIELDS */}
                {newAssetType === 'bomba' && (
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Modelo da Bomba *</label>
                    <input 
                      type="text" 
                      value={formModel} 
                      onChange={(e) => setFormModel(e.target.value)} 
                      className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold shadow-xs" 
                      placeholder="Ex: Bomba Centrífuga Principal" 
                    />
                  </div>
                )}

              </div>
            )}

            {/* Dynamic Alert Banner */}
            <div className="border border-amber-300 bg-[#fff5f5] border-l-4 border-l-amber-500 rounded-xl p-4 transition-all">
              <div className="flex gap-3 items-start text-amber-850 font-sans text-xs leading-relaxed">
                <span className="text-base select-none">⚠️</span>
                <div>
                  <span className="font-extrabold block text-[10px] uppercase tracking-wide text-amber-900 mb-0.5 font-mono">
                    Aviso Automático SPCI
                  </span>
                  No cadastro do equipamento, a próxima inspeção periódica obrigatória é agendada para o mesmo mês do cadastro. 
                  Próxima inspeção agendada: <span className="font-mono font-black text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">{getNextInspectionDateStr()}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex justify-between items-center pt-5 border-t border-slate-100">
              <button 
                type="button" 
                onClick={onClose} 
                className="text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider text-[10px] sm:text-xs underline decoration-dotted transition-all cursor-pointer"
              >
                Cancelar Operação
              </button>
              <button 
                type="submit" 
                disabled={uploadingImage}
                className="px-6 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white bg-[#007F3E] hover:bg-[#006631] rounded-xl cursor-pointer shadow-sm transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? 'Enviando Foto...' : 'Salvar no Banco SPCI'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* SCANNER DE QR CODE DO INMETRO */}
      <QrCameraScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          setIsScannerOpen(false);
          const parsed = parseInmetroCode(code);
          setFormSelo(parsed);
          triggerSuccessNotification("Selo Escaneado! 🧯", `Selo INMETRO ${parsed} obtido com sucesso.`);
        }}
      />
    </motion.div>
  );
}
