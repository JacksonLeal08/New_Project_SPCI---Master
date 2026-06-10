import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { supabase } from '@/lib/supabaseClient';
import { compressImage } from '@/lib/imageCompressor';
import { MediaQueue } from '@/lib/mediaQueue';
import { Flame, Check, X, Upload, Shield, Calendar, MapPin, ClipboardList, Info, Plus, QrCode } from 'lucide-react';
import QrCameraScanner from './QrCameraScanner';
import { parseInmetroCode } from '@/lib/utils';

interface ExtintorAddModalProps {
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

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

export default function ExtintorAddModal({ isOpen, onClose }: ExtintorAddModalProps) {
  const {
    extintores,
    setExtintores,
    saveAssetsList,
    triggerSuccessNotification,
    logSystemAction
  } = useSpci();

  // --- METADADOS SUPABASE ---
  const [locaisList, setLocaisList] = useState<any[]>([]);
  const [subLocaisList, setSubLocaisList] = useState<any[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [selectedSubLocalId, setSelectedSubLocalId] = useState('');
  const [newSubLocalName, setNewSubLocalName] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // --- PATRIMONIO AUTO SEQUENCE ---
  const [maxPatrimonio, setMaxPatrimonio] = useState<number>(0);
  const [recommendedPatrimonio, setRecommendedPatrimonio] = useState<number>(0);

  // --- REGISTRATION LOADING & SUCCESS STATES ---
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [registeredAssetData, setRegisteredAssetData] = useState<{ patrimonio: string; chassi: string } | null>(null);

  // --- FORM STATES ---
  // Section 1: Identificação
  const [formPatrimonio, setFormPatrimonio] = useState('');
  const [formChassi, setFormChassi] = useState('');
  const [formSelo, setFormSelo] = useState('');

  // Section 2: Dados Técnicos
  const [selectedModel, setSelectedModel] = useState(''); // "AB", "ABC", "ABC-PREMIUM", "CO²", "CUSTOM"
  const [customModelName, setCustomModelName] = useState('');
  const [formWeightCap, setFormWeightCap] = useState('6KG');
  const [formEtiquetaGarantia, setFormEtiquetaGarantia] = useState('');
  
  // Month/Year selects
  const [lastRechargeMonth, setLastRechargeMonth] = useState(new Date().getMonth() + 1);
  const [lastRechargeYear, setLastRechargeYear] = useState(new Date().getFullYear());
  const [expiryMonth, setExpiryMonth] = useState(new Date().getMonth() + 1);
  const [expiryYear, setExpiryYear] = useState(new Date().getFullYear() + 1);
  
  const [formAnoTesteHidro, setFormAnoTesteHidro] = useState(new Date().getFullYear().toString());
  const [formAnoFabricacao, setFormAnoFabricacao] = useState(new Date().getFullYear().toString());
  const [formDataPesagemCo2, setFormDataPesagemCo2] = useState('');

  // Section 3: Localização
  const [selectedLocalId, setSelectedLocalId] = useState(''); // local ID or "NEW"
  const [newLocalName, setNewLocalName] = useState('');
  const [formSubLocal, setFormSubLocal] = useState('');

  // --- IMAGE & COMPRESSION STATES ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressionDetails, setCompressionDetails] = useState<{
    original: string;
    compressed: string;
    reduction: number;
  } | null>(null);

  // Generate Year options
  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: 16 }, (_, i) => currentYear - 5 + i);

  // --- SYNTHESIZED TACTICAL AUDIO EFFECTS ---
  const playTacticalBeep = (type: 'compress' | 'success') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      if (type === 'compress') {
        const playPip = (time: number, freq: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.04, time + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
          osc.start(time);
          osc.stop(time + 0.08);
        };
        playPip(now, 1200);
        playPip(now + 0.07, 1500);
      } else if (type === 'success') {
        const playTone = (time: number, freq: number, dur: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.06, time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
          osc.start(time);
          osc.stop(time + dur);
        };
        playTone(now, 523.25, 0.15); // C5
        playTone(now + 0.08, 659.25, 0.15); // E5
        playTone(now + 0.16, 783.99, 0.25); // G5
      }
    } catch (e) {
      console.warn('AudioContext not supported:', e);
    }
  };

  // --- DYNAMIC CALCULATIONS ---
  // 1. Recharge validity (months difference)
  const calculatedValidityMonths = (expiryYear - lastRechargeYear) * 12 + (expiryMonth - lastRechargeMonth);

  // 2. Days remaining to expiration
  const getDaysRemaining = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiryYear, expiryMonth - 1, 1);
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();
  const isExpired = daysRemaining < 0;

  // --- FETCH METADATA AND CALC SEQUENCE ---
  useEffect(() => {
    if (isOpen) {
      const loadMetadata = async () => {
        setLoadingMetadata(true);
        try {
          const { data: locales } = await supabase
            .from('locais')
            .select('*')
            .order('nome', { ascending: true });
          
          const loadedLocales = locales || [];
          setLocaisList(loadedLocales);
          if (loadedLocales.length > 0) {
            setSelectedLocalId(loadedLocales[0].id);
          }

          const { data: subLocales } = await supabase
            .from('sub_locais')
            .select('*')
            .order('nome', { ascending: true });
          
          setSubLocaisList(subLocales || []);
        } catch (e) {
          console.error('Error fetching locales/sub_locales:', e);
        } finally {
          setLoadingMetadata(false);
        }
      };

      loadMetadata();

      // Reset files & states
      setTimeout(() => {
        // Calc Patrimonio Sequence
        let max = 0;
        extintores.forEach(ext => {
          const match = ext.idAtivo?.match(/EXT-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > max) max = num;
          }
        });
        setMaxPatrimonio(max);
        const recommended = max > 0 ? max + 1 : 1000;
        setRecommendedPatrimonio(recommended);
        setFormPatrimonio(String(recommended));

        setSelectedFile(null);
        setPreviewUrl(null);
        setCompressionDetails(null);
        setIsSaving(false);
        setShowSuccessPopup(false);
        setRegisteredAssetData(null);
        setFormChassi('');
        setFormSelo('');
        setFormSubLocal('');
        setSelectedSubLocalId('');
        setNewSubLocalName('');
        setIsScannerOpen(false);
        setSelectedModel('');
        setCustomModelName('');
        setFormWeightCap('6KG');
        setFormEtiquetaGarantia('');
        setLastRechargeMonth(new Date().getMonth() + 1);
        setLastRechargeYear(new Date().getFullYear());
        setExpiryMonth(new Date().getMonth() + 1);
        setExpiryYear(new Date().getFullYear() + 1);
        setFormAnoTesteHidro(new Date().getFullYear().toString());
        setFormAnoFabricacao(new Date().getFullYear().toString());
        setFormDataPesagemCo2('');
      }, 0);
    }
  }, [isOpen, extintores]);

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

  // Adjust expiry automatically to lastRecharge + 12 months when lastRecharge changes
  const handleLastRechargeChange = (month: number, year: number) => {
    setLastRechargeMonth(month);
    setLastRechargeYear(year);

    let expM = month;
    let expY = year + 1; // + 12 months
    
    setExpiryMonth(expM);
    setExpiryYear(expY);
  };

  if (!isOpen) return null;

  // Check if CO2 model selected
  const activeModelName = selectedModel === 'CUSTOM' ? customModelName : selectedModel;
  const isCo2 = activeModelName.toUpperCase().includes('CO2') || activeModelName.toUpperCase().includes('CO²');

  // --- HANDLE PHOTO UPLOAD & COMPRESSION ---
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

        playTacticalBeep('compress');

        triggerSuccessNotification(
          "Imagem Otimizada! 📸",
          `Imagem compactada. Redução de ${result.reductionPercentage}% (${originalStr} → ${compressedStr})`
        );
      } catch (err: any) {
        console.error('Error compressing image:', err);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  // --- RESET FORM FUNCTION ---
  const handleResetForm = () => {
    setFormPatrimonio(String(recommendedPatrimonio));
    setFormChassi('');
    setFormSelo('');
    setSelectedModel('');
    setCustomModelName('');
    setFormWeightCap('6KG');
    setFormEtiquetaGarantia('');
    setLastRechargeMonth(new Date().getMonth() + 1);
    setLastRechargeYear(new Date().getFullYear());
    setExpiryMonth(new Date().getMonth() + 1);
    setExpiryYear(new Date().getFullYear() + 1);
    setFormAnoTesteHidro(new Date().getFullYear().toString());
    setFormAnoFabricacao(new Date().getFullYear().toString());
    setFormDataPesagemCo2('');
    setSelectedLocalId(locaisList.length > 0 ? locaisList[0].id : '');
    setNewLocalName('');
    setSelectedSubLocalId('');
    setNewSubLocalName('');
    setFormSubLocal('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setCompressionDetails(null);

    playTacticalBeep('compress');
    triggerSuccessNotification("Formulário Limpo!", "Todos os campos foram resetados para os valores padrão.");
  };

  // --- SUBMIT REGISTRATION ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatrimonio) {
      alert("Por favor, preencha o número de Patrimônio!");
      return;
    }

    const codePatrimonio = formPatrimonio.toUpperCase().startsWith('EXT-') 
      ? formPatrimonio.toUpperCase() 
      : `EXT-${formPatrimonio.toUpperCase()}`;

    // Verify duplicate locally
    if (extintores.some(x => x.idAtivo === codePatrimonio)) {
      alert(`Erro: O patrimônio ${codePatrimonio} já está cadastrado no inventário.`);
      return;
    }

    // Verify duplicate sector
    if (selectedLocalId === 'NEW' && !newLocalName.trim()) {
      alert("Por favor, preencha o nome do novo setor.");
      return;
    }

    if (!selectedModel) {
      alert("Por favor, selecione o modelo do equipamento.");
      return;
    }

    if (selectedModel === 'CUSTOM' && !customModelName.trim()) {
      alert("Por favor, preencha o nome do modelo personalizado.");
      return;
    }

    setIsSaving(true);
    playTacticalBeep('compress');

    // Simulate premium registration transition effect
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      let finalLocalName = '';
      let finalLocalId = selectedLocalId;

      // 1. Dynamic Local creation if new
      if (selectedLocalId === 'NEW') {
        const uppercaseNewLocal = newLocalName.trim().toUpperCase();
        
        // check local cache duplicate
        const localDup = locaisList.find(l => l.nome.toUpperCase() === uppercaseNewLocal);
        if (localDup) {
          finalLocalId = localDup.id;
          finalLocalName = localDup.nome;
        } else {
          // insert new local
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
      } else {
        finalLocalName = locaisList.find(l => l.id === selectedLocalId)?.nome || '';
      }

      // 1.5. Dynamic Sub-Local creation if new
      let finalSubLocalName = '';
      let finalSubLocalId = selectedSubLocalId;

      if (selectedSubLocalId === 'NEW') {
        const uppercaseNewSub = newSubLocalName.trim().toUpperCase();
        
        // check sub-local duplicate in cache
        const subDup = subLocaisList.find(s => s.local_id === finalLocalId && s.nome.toUpperCase() === uppercaseNewSub);
        if (subDup) {
          finalSubLocalId = subDup.id;
          finalSubLocalName = subDup.nome;
        } else {
          // insert new sub-local
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
      } else {
        finalSubLocalName = subLocaisList.find(s => s.id === selectedSubLocalId)?.nome || '';
      }

      // 2. Dynamic Model creation if custom and register in supabase modelos_extintores
      let finalModelName = selectedModel === 'CUSTOM' ? customModelName.trim().toUpperCase() : selectedModel;
      
      if (selectedModel === 'CUSTOM') {
        // Optional: register in modelos_extintores in Supabase to keep relational sync
        const { data: newModObj } = await supabase
          .from('modelos_extintores')
          .insert({ nome: finalModelName })
          .select('*')
          .single();
        // Fallback or dynamic handling works even if it fails due to DB restrictions
      }

      const uniqueId = generateUUID();
      let uploadedFotoUrl = '';

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop() || 'jpg';
        const fileName = `ext_${codePatrimonio}_${Date.now()}.${fileExt}`;
        const isOnline = typeof window !== 'undefined' && navigator.onLine;

        if (isOnline) {
          try {
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('fotos_extintores')
              .upload(fileName, selectedFile);

            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage
              .from('fotos_extintores')
              .getPublicUrl(uploadData.path);

            uploadedFotoUrl = publicUrl;
          } catch (err: any) {
            console.warn('Image storage upload failed, enqueuing offline:', err);
            await MediaQueue.enqueue(uniqueId, 'extintores', fileName, selectedFile);
          }
        } else {
          await MediaQueue.enqueue(uniqueId, 'extintores', fileName, selectedFile);
        }
      }

      const dateUltimaRecargaStr = `${lastRechargeYear}-${String(lastRechargeMonth).padStart(2, '0')}-01`;
      const dateVencimentoStr = `${expiryYear}-${String(expiryMonth).padStart(2, '0')}-01`;

      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        category: 'extintores',
        location: finalLocalName,
        subLocation: finalSubLocalName || formSubLocal || 'GERAL',
        status: 'Conforme',
        
        local_id: finalLocalId || null,
        sub_local_id: finalSubLocalId || null, 
        modelo_id: null, // Resolvido no trigger/View do banco
        
        model: finalModelName,
        peso_capacidade: formWeightCap,
        peso: formWeightCap.replace(/\D/g, ''), 
        seloInmetro: formSelo || 'NBR',
        chassi: formChassi || 'N/A',
        etiqueta_garantia: formEtiquetaGarantia || null,
        data_ultima_recarga: dateUltimaRecargaStr,
        lastRecarga: dateUltimaRecargaStr,
        meses_validade_recarga: calculatedValidityMonths,
        validadeRecargaMeses: calculatedValidityMonths,
        ano_ultimo_teste_hidro: parseInt(formAnoTesteHidro, 10) || new Date().getFullYear(),
        ultimoTesteHidro: parseInt(formAnoTesteHidro, 10) || new Date().getFullYear(),
        anoFabricacao: parseInt(formAnoFabricacao, 10) || new Date().getFullYear(),
        ano_fabricacao: parseInt(formAnoFabricacao, 10) || new Date().getFullYear(),
        data_pesagem_co2: isCo2 ? (formDataPesagemCo2 || null) : null,
        fotoUrl: uploadedFotoUrl,
        foto_url: uploadedFotoUrl,
        validadeRecarga: dateVencimentoStr
      };

      const updated = [newObj, ...extintores];
      setExtintores(updated);
      await saveAssetsList('extintores', updated);

      // Registrar log de auditoria no cliente
      await logSystemAction(
        'CADASTRO_ATIVO',
        'extintores',
        codePatrimonio,
        `Extintor patrimônio ${codePatrimonio} cadastrado com sucesso via modal.`
      ).catch(console.error);

      playTacticalBeep('success');
      setRegisteredAssetData({ patrimonio: codePatrimonio, chassi: newObj.chassi });
      setShowSuccessPopup(true);
    } catch (error) {
      console.error("Error saving extintor:", error);
      alert("Erro ao salvar o extintor. Verifique a conexão com o banco.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 font-mono select-none">
      
      {/* Scrollbar-none CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 15 }}
        className="w-full max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-2xl relative overflow-hidden flex flex-col max-h-[92vh] text-slate-800"
      >
        {/* SPCI Red Top Line */}
        <div className="h-1.5 w-full bg-red-600" />

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col gap-0.5">
            <span className="text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Flame className="w-4 h-4 animate-pulse" /> SPCI PLANTA CORPORATIVA
            </span>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mt-1">
              REGISTRO DE NOVO EXTINTOR
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 border border-slate-200 bg-white p-2.5 transition-all rounded-xl cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar flex-grow bg-slate-50/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* SEÇÃO 1: IDENTIFICAÇÃO DO ATIVO */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 space-y-4 shadow-xs relative">
              <div className="absolute top-3 right-4 text-[8px] font-black text-slate-400">SEÇÃO 01</div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                📂 IDENTIFICAÇÃO E SELOS DO ATIVO
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Patrimonio */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                    Patrimônio *
                  </label>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 focus-within:border-red-500">
                    <span className="bg-slate-100 text-slate-500 text-xs px-3 flex items-center select-none font-bold border-r border-slate-200">
                      EXT-
                    </span>
                    <input 
                      type="text" 
                      value={formPatrimonio}
                      onChange={(e) => setFormPatrimonio(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white text-slate-800 p-2 text-xs outline-none font-bold"
                      placeholder="Ex: 1092"
                      required
                    />
                  </div>
                  {maxPatrimonio > 0 && (
                    <span className="text-[8px] text-slate-400 block mt-1">
                      Último: EXT-{maxPatrimonio} | Sugerido: EXT-{recommendedPatrimonio}
                    </span>
                  )}
                </div>

                {/* Chassi */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                    Chassi / Lote
                  </label>
                  <input 
                    type="text" 
                    value={formChassi}
                    onChange={(e) => setFormChassi(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-100 rounded-lg p-2 text-xs outline-none font-bold uppercase"
                    placeholder="Ex: CH-9088"
                  />
                </div>

                {/* Selo Inmetro */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                    Selo INMETRO
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formSelo}
                      onChange={(e) => setFormSelo(e.target.value)}
                      className="flex-grow bg-white border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-100 rounded-lg p-2 text-xs outline-none font-mono font-bold"
                      placeholder="Ex: S-809221"
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="px-3 bg-red-650 hover:bg-red-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors shadow-sm active:scale-95 border-none"
                      title="Escanear Selo com a Câmera"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: DADOS TÉCNICOS & VALIDADE */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 space-y-4 shadow-xs relative">
              <div className="absolute top-3 right-4 text-[8px] font-black text-slate-400">SEÇÃO 02</div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                ⚙️ DADOS TÉCNICOS E VISTORIAS DO EQUIPAMENTO
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Modelo dropdown */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                    Modelo do Equipamento *
                  </label>
                  <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 focus:border-red-500 rounded-lg p-2 text-xs outline-none font-bold cursor-pointer"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="AB">AB</option>
                    <option value="ABC">ABC</option>
                    <option value="ABC-PREMIUM">ABC-PREMIUM</option>
                    <option value="CO²">CO²</option>
                    <option value="CUSTOM">+ Outro Modelo...</option>
                  </select>
                </div>

                {/* Custom Model Input (if Custom selected) */}
                {selectedModel === 'CUSTOM' && (
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-red-650 mb-1.5">
                      Escreva o Nome do Modelo *
                    </label>
                    <input 
                      type="text" 
                      value={customModelName}
                      onChange={(e) => setCustomModelName(e.target.value)}
                      placeholder="Ex: ESPUMA MECÂNICA ABC"
                      className="w-full bg-white border border-red-200 focus:border-red-500 rounded-lg p-2 text-xs outline-none font-bold uppercase"
                      required
                    />
                  </div>
                )}

                {/* Capacidade Operacional (Carga) - Condicional */}
                {selectedModel !== '' && (
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                      Capacidade Operacional (Carga) *
                    </label>
                    <select 
                      value={formWeightCap}
                      onChange={(e) => setFormWeightCap(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 focus:border-red-500 rounded-lg p-2 text-xs outline-none font-bold cursor-pointer"
                      required
                    >
                      <option value="2KG">2KG</option>
                      <option value="4KG">4KG</option>
                      <option value="4,5KG">4,5KG</option>
                      <option value="6KG">6KG</option>
                      <option value="8KG">8KG</option>
                      <option value="9KG">9KG</option>
                      <option value="12KG">12KG</option>
                      <option value="20KG">20KG</option>
                      <option value="25KG">25KG</option>
                      <option value="30KG">30KG</option>
                      <option value="50KG">50KG</option>
                      <option value="55KG">55KG</option>
                    </select>
                  </div>
                )}

                {/* Etiqueta Garantia */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                    Etiqueta Garantia (Código)
                  </label>
                  <input 
                    type="text" 
                    value={formEtiquetaGarantia}
                    onChange={(e) => setFormEtiquetaGarantia(e.target.value)}
                    placeholder="Ex: GAR-09823"
                    className="w-full bg-white border border-slate-200 focus:border-red-500 rounded-lg p-2 text-xs outline-none font-mono"
                  />
                </div>

                {/* Data Última Recarga Month/Year Select */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                    Mês/Ano Última Recarga *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={lastRechargeMonth}
                      onChange={(e) => handleLastRechargeChange(parseInt(e.target.value, 10), lastRechargeYear)}
                      className="w-full bg-white border border-slate-200 text-slate-800 focus:border-red-500 rounded-lg p-2 text-xs outline-none cursor-pointer"
                    >
                      {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select 
                      value={lastRechargeYear}
                      onChange={(e) => handleLastRechargeChange(lastRechargeMonth, parseInt(e.target.value, 10))}
                      className="w-full bg-white border border-slate-200 text-slate-800 focus:border-red-500 rounded-lg p-2 text-xs outline-none cursor-pointer"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Data Vencimento Month/Year Select */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                    Mês/Ano do Vencimento *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={expiryMonth}
                      onChange={(e) => setExpiryMonth(parseInt(e.target.value, 10))}
                      className="w-full bg-white border border-slate-200 text-slate-800 focus:border-red-500 rounded-lg p-2 text-xs outline-none cursor-pointer"
                    >
                      {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select 
                      value={expiryYear}
                      onChange={(e) => setExpiryYear(parseInt(e.target.value, 10))}
                      className="w-full bg-white border border-slate-200 text-slate-800 focus:border-red-500 rounded-lg p-2 text-xs outline-none cursor-pointer"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  {/* Days remaining display */}
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`text-[8.5px] font-bold ${isExpired ? 'text-rose-600' : 'text-emerald-700 bg-emerald-50 border border-emerald-100/60 px-1.5 py-0.5 rounded'}`}>
                      {isExpired ? `⚠️ Expirado há ${Math.abs(daysRemaining)} dias` : `⏱️ ${daysRemaining} dias restantes para vencimento`}
                    </span>
                  </div>
                </div>

                {/* Validade Recarga (Meses) - Bloqueado */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-1.5">
                    Validade da Recarga (Meses - Calculado)
                  </label>
                  <input 
                    type="text" 
                    value={calculatedValidityMonths > 0 ? `${calculatedValidityMonths} Meses` : '0 Meses'}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-lg p-2 text-xs outline-none font-bold"
                  />
                </div>

                {/* Ano Teste Hidrostático */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                    Ano Último Teste Hidro *
                  </label>
                  <input 
                    type="number" 
                    value={formAnoTesteHidro}
                    onChange={(e) => setFormAnoTesteHidro(e.target.value)}
                    min="1950"
                    max="2100"
                    className="w-full bg-white border border-slate-200 focus:border-red-500 rounded-lg p-2 text-xs outline-none font-bold"
                    required
                  />
                </div>

                {/* Ano Fabricação */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                    Ano Fabricação *
                  </label>
                  <input 
                    type="number" 
                    value={formAnoFabricacao}
                    onChange={(e) => setFormAnoFabricacao(e.target.value)}
                    min="1900"
                    max="2100"
                    className="w-full bg-white border border-slate-200 focus:border-red-500 rounded-lg p-2 text-xs outline-none font-bold"
                    required
                  />
                </div>

                {/* Conditional Field: Pesagem CO2 */}
                {isCo2 && (
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-red-650 mb-1.5 flex items-center gap-1">
                      ⚖️ Data Pesagem CO2 *
                    </label>
                    <input 
                      type="date" 
                      value={formDataPesagemCo2}
                      onChange={(e) => setFormDataPesagemCo2(e.target.value)}
                      className="w-full bg-white border border-red-200 focus:border-red-500 rounded-lg p-2.5 text-xs outline-none font-bold"
                      required={isCo2}
                    />
                  </div>
                )}
              </div>

              {/* Photo Upload with Compression Info */}
              <div className="border border-dashed border-slate-200 hover:border-red-500 transition-all rounded-xl p-4.5 flex flex-col items-center justify-center bg-slate-50/50 cursor-pointer relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {previewUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={previewUrl} alt="Preview" className="h-32 object-contain rounded-lg border border-slate-200 bg-white" />
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Clique para alterar foto</span>
                    {compressionDetails && (
                      <div className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-md font-sans font-bold text-center">
                        <span>⚡ FOTO COMPACTADA NATIVAMENTE ⚡</span>
                        <span className="block font-mono mt-0.5">{compressionDetails.original} → {compressionDetails.compressed} ({compressionDetails.reduction}% economia)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-center text-slate-400 group-hover:text-red-500">
                    <span className="text-xl">📷</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider">Selecionar Foto do Extintor</span>
                    <span className="text-[7.5px] font-sans text-slate-400">Filtro de otimização de banda de rede</span>
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO 3: LOCALIZAÇÃO DO EXTINTOR */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 space-y-4 shadow-xs relative">
              <div className="absolute top-3 right-4 text-[8px] font-black text-slate-400">SEÇÃO 03</div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                📍 LOCALIZAÇÃO DO ATIVO NA PLANTA
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Sector / Setor */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                    Setor da Planta *
                  </label>
                  <select 
                    value={selectedLocalId}
                    onChange={(e) => setSelectedLocalId(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 focus:border-red-500 rounded-lg p-2 text-xs outline-none font-bold cursor-pointer"
                    required
                  >
                    {locaisList.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.nome}</option>
                    ))}
                    <option value="NEW">+ Adicionar Novo Setor...</option>
                  </select>
                </div>

                {/* New Sector Input (if selected NEW) */}
                {selectedLocalId === 'NEW' && (
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-red-655 mb-1.5">
                      Nome do Novo Setor *
                    </label>
                    <input 
                      type="text" 
                      value={newLocalName}
                      onChange={(e) => setNewLocalName(e.target.value)}
                      placeholder="Ex: CALDEIRAS"
                      className="w-full bg-white border border-red-200 focus:border-red-500 rounded-lg p-2 text-xs outline-none font-bold uppercase"
                      required
                    />
                  </div>
                )}

                {/* Sub Local Select */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1.5">
                    Sub-Local (Posição Física) *
                  </label>
                  <select
                    value={selectedSubLocalId}
                    onChange={(e) => {
                      setSelectedSubLocalId(e.target.value);
                      const selectedSub = filteredSubLocais.find(s => s.id === e.target.value);
                      setFormSubLocal(selectedSub ? selectedSub.nome : '');
                    }}
                    className="w-full bg-white border border-slate-200 text-slate-800 focus:border-red-500 rounded-lg p-2 text-xs outline-none font-bold cursor-pointer"
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
                    <label className="block text-[9px] font-extrabold uppercase text-red-655 mb-1.5">
                      Nome do Novo Sub-Local *
                    </label>
                    <input
                      type="text"
                      value={newSubLocalName}
                      onChange={(e) => setNewSubLocalName(e.target.value)}
                      placeholder="Ex: COPA"
                      className="w-full bg-white border border-red-200 focus:border-red-500 rounded-lg p-2 text-xs outline-none font-bold uppercase"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex justify-between items-center pt-5 border-t border-slate-100">
              <div className="flex gap-2.5">
                <button 
                  type="button"
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-800 text-[10px] font-bold uppercase tracking-wider underline decoration-dotted transition-all cursor-pointer"
                >
                  Fechar
                </button>
                <button 
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                >
                  LIMPAR
                </button>
              </div>
              
              <button 
                type="submit" 
                disabled={uploadingImage || isSaving}
                className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl cursor-pointer shadow-lg transition-all active:scale-[0.97]"
              >
                {isSaving ? 'REGISTRANDO ATIVO...' : 'GRAVAR EXTINTOR'}
              </button>
            </div>

          </form>
        </div>
      </motion.div>

      {/* --- LIGHT THEME SUCCESS MODAL --- */}
      <AnimatePresence>
        {showSuccessPopup && registeredAssetData && (
          <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative overflow-hidden"
            >
              {/* Dynamic top success bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
              
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500 mb-4 animate-bounce">
                  <Check className="w-6 h-6" />
                </div>

                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  ATÍVO REGISTRADO COM SUCESSO!
                </h3>
                <p className="text-[11px] text-slate-500 font-sans mt-1">
                  O extintor foi validado de acordo com a NBR 12962 e integrado ao SPCI.
                </p>

                {/* Details card */}
                <div className="w-full bg-slate-50 border border-slate-150 rounded-xl p-4 mt-4 text-left text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Tipo do Ativo</span>
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5">🧯 Extintor</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Nº Patrimônio</span>
                    <span className="font-mono font-bold text-slate-950">{registeredAssetData.patrimonio}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Chassi Corporativo</span>
                    <span className="font-mono font-bold text-slate-950 uppercase">{registeredAssetData.chassi || 'N/A'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessPopup(false);
                    onClose();
                  }}
                  className="w-full mt-6 py-3 text-[10px] font-black uppercase tracking-wider text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  CONCLUÍDO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
    </div>
  );
}
