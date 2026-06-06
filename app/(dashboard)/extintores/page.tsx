'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import AssetDetailDrawer from '@/app/components/AssetDetailDrawer';
import DisintegrationOverlay from '@/app/components/DisintegrationOverlay';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Trash2, 
  History, 
  Bell, 
  CheckSquare, 
  QrCode, 
  Upload, 
  Download, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Wrench, 
  FileText, 
  X, 
  ChevronLeft,
  Info,
  Shield,
  Activity,
  Pencil
} from 'lucide-react';

interface ValidatedRow {
  id: string;
  rowNum: number;
  numero_patrimonio: string;
  local: string;
  sub_local: string;
  modelo: string;
  selo_inmetro: string;
  chassi: string;
  peso_capacidade: string;
  data_ultima_recarga: string;
  meses_validade_recarga: number;
  ano_ultimo_teste_hidro: number;
  data_pesagem_co2: string;
  errors: string[];
  isValid: boolean;
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

export default function ExtintoresPage() {
  const {
    extintores,
    setExtintores,
    saveAssetsList,
    deleteAsset,
    setShowAddForm,
    setNewAssetType,
    setSelectedAssetForInspection,
    setSelectedAssetForHistory,
    setSelectedAssetForDetail,
    setPremiumAlert,
    setScanModal,
    triggerSuccessNotification,
    userProfile,
    deletingAssetId,
    setDeletingAssetId,
    requestAssetDeletion
  } = useSpci();

  // --- ESTADOS DO COCKPIT DE IMPORTAÇÃO ---
  const [showBulkImport, setShowBulkImport] = useState<boolean>(false);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [showOnlyErrors, setShowOnlyErrors] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');

  const canDelete = userProfile?.role === 'Desenvolvedor' || userProfile?.role === 'Administrador';

  // --- KPI CALCULATIONS ---
  const totalExtintores = extintores.length;
  const conformes = extintores.filter(x => x.status === 'Conforme' || x.status === 'NO PRAZO').length;
  const vencidos = extintores.filter(x => x.status === 'Vencido' || x.status === 'VENCIDO').length;
  const manutencao = extintores.filter(x => x.status === 'Em Manutenção' || x.status === 'A VENCER').length;
  const compliancePercent = totalExtintores > 0 ? Math.round((conformes / totalExtintores) * 100) : 100;

  const maxBarValue = Math.max(conformes, vencidos, manutencao, 1);

  // --- SEARCH FILTER ---
  const filteredExtintores = searchTerm.trim()
    ? extintores.filter(a => {
        const term = searchTerm.toLowerCase();
        return (
          (a.idAtivo || '').toLowerCase().includes(term) ||
          (a.model || '').toLowerCase().includes(term) ||
          (a.location || '').toLowerCase().includes(term) ||
          (a.chassi || '').toLowerCase().includes(term) ||
          (a.seloInmetro || '').toLowerCase().includes(term)
        );
      })
    : extintores;

  // --- CONFIGURAÇÕES DA BARRA DE FERRAMENTAS ---
  const TOOLBAR_CARDS = [
    { id: 'qr', label: 'QR Code de Inspeção', icon: QrCode, borderClass: 'border-l-4 border-l-amber-500 hover:border-amber-500', iconColor: 'text-amber-500', badgeClass: 'bg-amber-100 text-amber-800' },
    { id: 'novo', label: 'Novo Extintor', icon: Plus, borderClass: 'border-l-4 border-l-rose-500 hover:border-rose-500', iconColor: 'text-rose-600', badgeClass: 'bg-rose-100 text-rose-800' },
    { id: 'import', label: 'Cadastro em massa', icon: Upload, borderClass: 'border-l-4 border-l-blue-500 hover:border-blue-500', iconColor: 'text-blue-600', badgeClass: 'bg-blue-100 text-blue-800', isNew: true },
    { id: 'edit_mass', label: 'Edição em massa', icon: Settings, borderClass: 'border-l-4 border-l-emerald-500 hover:border-emerald-500', iconColor: 'text-emerald-600', badgeClass: 'bg-emerald-100 text-emerald-800', isNew: true },
    { id: 'edit_check', label: 'Edição de checklist', icon: CheckSquare, borderClass: 'border-l-4 border-l-red-650 hover:border-red-650', iconColor: 'text-red-750', badgeClass: 'bg-red-100 text-red-800', isNew: true },
    { id: 'history', label: 'Histórico Inspeções', icon: History, borderClass: 'border-l-4 border-l-rose-500 hover:border-rose-500', iconColor: 'text-rose-600', badgeClass: 'bg-rose-100 text-rose-800' },
    { id: 'manutencao', label: 'Retorno Manutenção', icon: Wrench, borderClass: 'border-l-4 border-l-rose-500 hover:border-rose-500', iconColor: 'text-rose-600', badgeClass: 'bg-rose-100 text-rose-800' },
    { id: 'laudos', label: 'Certificados/Laudos', icon: FileText, borderClass: 'border-l-4 border-l-teal-500 hover:border-teal-500', iconColor: 'text-teal-600', badgeClass: 'bg-teal-100 text-teal-800' },
  ];

  const handleToolbarClick = (id: string) => {
    switch (id) {
      case 'qr':
        setScanModal(true);
        break;
      case 'novo':
        setNewAssetType('extintor');
        setShowAddForm(true);
        break;
      case 'import':
        setShowBulkImport(true);
        break;
      default:
        setPremiumAlert({
          show: true,
          title: 'Funcionalidade em Homologação ⚙️',
          message: `O módulo correspondente a esta ferramenta está em fase final de validação e será disponibilizado em breve.`,
          type: 'info'
        });
        break;
    }
  };

  const getCustomAttributes = (asset: any) => {
    const standardKeys = [
      'id', 'idAtivo', 'category', 'model', 'location', 'subLocation', 'seloInmetro', 'chassi', 'peso',
      'lastRecarga', 'recurrenceInterval', 'validadeRecarga', 'validadeTesteHidro', 'status', 'geolocation',
      'type', 'components', 'lastInsp', 'nextInsp', 'group', 'systemType', 'qty', 'battery', 'autonomy',
      'name', 'code', 'power', 'range', 'starts'
    ];
    return Object.keys(asset).filter(k => {
      if (standardKeys.includes(k)) return false;
      if (standardKeys.some(sk => sk.toLowerCase() === k.toLowerCase())) return false;
      return typeof asset[k] === 'string' && asset[k].trim() !== '';
    }).map(k => ({ key: k, value: asset[k] }));
  };

  const handleOpenAlertCenter = (asset: any) => {
    setPremiumAlert({
      show: true,
      title: 'Central de Emissão de Alertas Premium',
      message: 'Configure e despache alertas de vencimentos e relatórios para gestores de forma imediata via WhatsApp, Telegram ou Email.',
      type: 'critical',
      dispatchData: asset
    });
  };

  // --- GERAÇÃO E DOWNLOAD DE MODELO DE IMPORTAÇÃO ---
  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    const headers = [
      ['numero_patrimonio', 'local', 'sub_local', 'modelo', 'selo_inmetro', 'chassi', 'peso_capacidade', 'data_ultima_recarga', 'meses_validade_recarga', 'ano_ultimo_teste_hidro', 'data_pesagem_co2']
    ];
    const sampleData = [
      ['EXT-1090', 'ALMOXARIFADO', 'DOCA DE CARGA 2', 'PQS ABC - 8KG', 'S-992389', 'CH-9921', '8KG', '2025-06-01', '12', '2024', ''],
      ['EXT-1091', 'MANGANÊS', 'SALA DE GERADORES', 'CO2 - 6KG', 'S-992390', 'CH-9922', '6KG', '2025-05-15', '12', '2023', '2025-05-15']
    ];
    const sheetData = [...headers, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo Importação');

    if (format === 'xlsx') {
      XLSX.writeFile(wb, 'modelo_importacao_extintores.xlsx');
    } else {
      const csvContent = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'modelo_importacao_extintores.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    triggerSuccessNotification('Modelo Baixado!', `Planilha de modelo em formato ${format.toUpperCase()} foi baixada.`);
  };

  // --- LEITURA E PARSING DA PLANILHA ENVIADA ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const parseExcelDate = (val: any) => {
    if (!val) return '';
    if (typeof val === 'number') {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    const dateStr = String(val).trim();
    const ddMmYyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    if (ddMmYyyy.test(dateStr)) {
      const [, d, m, y] = dateStr.match(ddMmYyyy) || [];
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const yyyyMmDd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
    if (yyyyMmDd.test(dateStr)) {
      const [, y, m, d] = dateStr.match(yyyyMmDd) || [];
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0];
    }
    return '';
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json(ws);
        processAndValidate(rawJson);
      } catch (err) {
        alert('Erro ao ler planilha. Certifique-se de usar o modelo estruturado.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- VALIDAÇÃO E CHECAGEM (COCKPIT LOGIC) ---
  const processAndValidate = (rows: any[]) => {
    const validated: ValidatedRow[] = rows.map((row: any, index: number) => {
      const errors: string[] = [];
      
      const pat = String(row.numero_patrimonio || '').trim().toUpperCase();
      const local = String(row.local || '').trim().toUpperCase();
      const model = String(row.modelo || '').trim().toUpperCase();
      const cap = String(row.peso_capacidade || '').trim().toUpperCase();
      const recargaRaw = parseExcelDate(row.data_ultima_recarga);
      const validadeMeses = parseInt(row.meses_validade_recarga || '12', 10);
      const testeHidro = parseInt(row.ano_ultimo_teste_hidro || new Date().getFullYear().toString(), 10);
      const pesagemCo2 = row.data_pesagem_co2 ? parseExcelDate(row.data_pesagem_co2) : '';

      // Regras de validação
      if (!pat) {
        errors.push('Patrimônio é obrigatório.');
      } else if (!pat.startsWith('EXT-')) {
        errors.push('Número do patrimônio deve iniciar com prefixo "EXT-".');
      } else if (extintores.some(x => x.idAtivo === pat)) {
        errors.push(`Número de Patrimônio ${pat} já está cadastrado no sistema.`);
      }

      if (!local) {
        errors.push('Local da instalação é obrigatório.');
      }

      if (!model) {
        errors.push('Modelo do Extintor é obrigatório.');
      }

      if (!cap) {
        errors.push('Peso/Capacidade de carga é obrigatória (ex: 6KG, 10L).');
      }

      if (!recargaRaw) {
        errors.push('Data da última recarga está ausente ou em formato inválido.');
      }

      if (isNaN(validadeMeses) || validadeMeses <= 0) {
        errors.push('Meses de validade da recarga deve ser um número maior que zero.');
      }

      if (isNaN(testeHidro) || testeHidro < 1900 || testeHidro > 2100) {
        errors.push('Ano do último teste hidrostático inválido (deve ser entre 1900 e 2100).');
      }

      if (model.includes('CO2') && !pesagemCo2) {
        errors.push('Extintores do modelo CO2 exigem preenchimento da Data de Pesagem CO2.');
      }

      return {
        id: generateUUID(),
        rowNum: index + 2,
        numero_patrimonio: pat,
        local,
        sub_local: String(row.sub_local || '').trim().toUpperCase(),
        modelo: model,
        selo_inmetro: String(row.selo_inmetro || '').trim().toUpperCase(),
        chassi: String(row.chassi || '').trim().toUpperCase(),
        peso_capacidade: cap,
        data_ultima_recarga: recargaRaw,
        meses_validade_recarga: validadeMeses,
        ano_ultimo_teste_hidro: testeHidro,
        data_pesagem_co2: pesagemCo2,
        errors,
        isValid: errors.length === 0
      };
    });

    setValidatedRows(validated);
    triggerSuccessNotification('Planilha Carregada', `Processadas ${validated.length} linhas no cockpit.`);
  };

  const handleConfirmImport = async () => {
    const validRows = validatedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('Não há linhas válidas para importação!');
      return;
    }

    const newAssets = validRows.map(row => {
      const recargaDate = new Date(row.data_ultima_recarga);
      recargaDate.setMonth(recargaDate.getMonth() + row.meses_validade_recarga);
      const validadeRecargaStr = recargaDate.toISOString().split('T')[0];

      return {
        id: row.id,
        idAtivo: row.numero_patrimonio,
        category: 'extintores',
        location: row.local,
        subLocation: row.sub_local || 'GERAL',
        status: 'Conforme',
        model: row.modelo,
        peso_capacidade: row.peso_capacidade,
        peso: row.peso_capacidade.replace(/\D/g, ''),
        seloInmetro: row.selo_inmetro || 'NBR',
        chassi: row.chassi || 'N/A',
        data_ultima_recarga: row.data_ultima_recarga,
        lastRecarga: row.data_ultima_recarga,
        meses_validade_recarga: row.meses_validade_recarga,
        validadeRecargaMeses: row.meses_validade_recarga,
        ano_ultimo_teste_hidro: row.ano_ultimo_teste_hidro,
        ultimoTesteHidro: row.ano_ultimo_teste_hidro,
        data_pesagem_co2: row.data_pesagem_co2 || null,
        validadeRecarga: validadeRecargaStr
      };
    });

    const updated = [...newAssets, ...extintores];
    setExtintores(updated);
    await saveAssetsList('extintores', updated);

    setValidatedRows([]);
    setShowBulkImport(false);
    triggerSuccessNotification('Importação Concluída!', `${validRows.length} extintores foram salvos e integrados ao sistema SPCI.`);
  };

  const errorCount = validatedRows.reduce((acc, row) => acc + row.errors.length, 0);
  const rowsWithErrors = validatedRows.filter(r => !r.isValid);
  const displayedRows = showOnlyErrors ? rowsWithErrors : validatedRows;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 select-none font-mono">
      
      {/* CRUD DRAWER */}
      <AssetDetailDrawer />

      {/* 1. BARRA DE FERRAMENTAS PREMIUM */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {TOOLBAR_CARDS.map((card) => {
          const IconComponent = card.icon;
          return (
            <motion.button
              key={card.id}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleToolbarClick(card.id)}
              className={`flex flex-col items-center justify-center p-3 bg-white border border-slate-200 shadow-sm rounded-xl cursor-pointer text-center relative transition-all duration-300 min-h-[96px] ${card.borderClass}`}
            >
              {card.isNew && (
                <span className={`absolute top-1.5 right-1.5 text-[7px] font-sans font-black px-1.5 py-0.5 rounded-full select-none ${card.badgeClass}`}>
                  Novo
                </span>
              )}
              <IconComponent className={`w-5 h-5 mb-2 transition-transform duration-300 ${card.iconColor}`} />
              <span className="text-[8.5px] font-sans font-black uppercase leading-tight tracking-wider text-slate-800">
                {card.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {showBulkImport ? (
          // ===================================================================
          // COCKPIT DE IMPORTAÇÃO EM MASSA
          // ===================================================================
          <motion.div
            key="bulk-import-cockpit"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="bg-white border border-slate-200 p-6 rounded-2xl shadow-lg space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            
            {/* Header Cockpit */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => { setShowBulkImport(false); setValidatedRows([]); }}
                  className="p-2 border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 rounded-lg cursor-pointer"
                  title="Voltar ao Inventário"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    ⚙️ COCKPIT DE CHECAGEM E IMPORTAÇÃO
                  </h3>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                    Importe centenas de extintores de forma consolidada e homologue os dados antes de salvar.
                  </p>
                </div>
              </div>

              {/* Botões para download do Modelo */}
              <div className="flex gap-2 text-[10px] font-sans">
                <button
                  onClick={() => handleDownloadTemplate('xlsx')}
                  className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" /> Baixar Modelo Excel
                </button>
                <button
                  onClick={() => handleDownloadTemplate('csv')}
                  className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" /> Baixar Modelo CSV
                </button>
              </div>
            </div>

            {/* Drag and Drop Area */}
            {validatedRows.length === 0 && (
              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors relative cursor-pointer ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/20' 
                    : 'border-slate-250 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400'
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx, .csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3 border border-blue-100 shadow-inner">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Arraste e Solte a planilha modelo aqui
                </span>
                <span className="text-[10px] text-slate-500 mt-1 font-sans">
                  Suporta arquivos .xlsx e .csv
                </span>
              </div>
            )}

            {/* Cockpit HUD e Tabela de dados */}
            {validatedRows.length > 0 && (
              <div className="space-y-6">
                
                {/* HUD Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Processado</span>
                    <span className="text-xl font-extrabold text-slate-800 mt-1 block">{validatedRows.length} Linhas</span>
                    <div className="absolute right-4 bottom-2 text-3xl opacity-10 pointer-events-none">📊</div>
                  </div>

                  <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded-xl relative overflow-hidden">
                    <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider block">Registros Válidos</span>
                    <span className="text-xl font-extrabold text-emerald-700 mt-1 block">
                      {validatedRows.filter(r => r.isValid).length} OK
                    </span>
                    <div className="absolute right-4 bottom-2 text-3xl opacity-10 pointer-events-none text-emerald-700">✓</div>
                  </div>

                  <div className="p-4 bg-rose-50/30 border border-rose-200 rounded-xl relative overflow-hidden">
                    <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider block">Registros com Inconformidade</span>
                    <span className="text-xl font-extrabold text-rose-700 mt-1 block">
                      {rowsWithErrors.length} Linhas
                    </span>
                    <div className="absolute right-4 bottom-2 text-3xl opacity-10 pointer-events-none text-rose-700">✗</div>
                  </div>

                  <div className="p-4 bg-amber-50/30 border border-amber-200 rounded-xl relative overflow-hidden">
                    <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider block">Erros Identificados</span>
                    <span className="text-xl font-extrabold text-amber-700 mt-1 block">
                      {errorCount} Erros
                    </span>
                    <div className="absolute right-4 bottom-2 text-3xl opacity-10 pointer-events-none text-amber-700">⚠️</div>
                  </div>
                </div>

                {/* Filtro de Erros e Gravação */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                  
                  <label className="flex items-center gap-2.5 cursor-pointer group text-[10px] font-bold uppercase text-slate-600">
                    <input
                      type="checkbox"
                      checked={showOnlyErrors}
                      onChange={(e) => setShowOnlyErrors(e.target.checked)}
                      className="w-4 h-4 rounded-md accent-blue-600 cursor-pointer"
                    />
                    <span className="group-hover:text-slate-800 transition-colors">
                      ⚠️ Filtrar apenas linhas contendo erros
                    </span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setValidatedRows([]); setShowOnlyErrors(false); }}
                      className="px-4 py-2.5 text-[10px] uppercase font-bold text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer rounded-lg shadow-xs"
                    >
                      Limpar Planilha
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={validatedRows.filter(r => r.isValid).length === 0}
                      className="px-5 py-2.5 text-[10px] uppercase font-black tracking-wider text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-lg shadow-md transition-all active:scale-[0.98]"
                    >
                      Gravar {validatedRows.filter(r => r.isValid).length} Ativos Válidos
                    </button>
                  </div>
                </div>

                {/* Tabela de Checagem */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto max-h-[380px] scrollbar-thin">
                    <table className="w-full text-[10px] text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="p-3 text-center w-12">Row</th>
                          <th className="p-3">Patrimônio</th>
                          <th className="p-3">Localização</th>
                          <th className="p-3">Modelo</th>
                          <th className="p-3">Capacidade</th>
                          <th className="p-3">Recarga</th>
                          <th className="p-3">Status/Erros</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                        {displayedRows.map((row) => (
                          <tr 
                            key={row.id} 
                            className={`transition-colors hover:bg-slate-50/50 ${
                              !row.isValid 
                                ? 'bg-rose-50/60 text-rose-950 border-l-2 border-l-rose-500' 
                                : 'border-l-2 border-l-emerald-500'
                            }`}
                          >
                            <td className="p-3 text-center font-bold text-slate-400">{row.rowNum}</td>
                            <td className="p-3 font-bold">{row.numero_patrimonio || '---'}</td>
                            <td className="p-3 font-medium">
                              {row.local || '---'}
                              {row.sub_local && <span className="text-[8px] text-slate-400 block font-sans">{row.sub_local}</span>}
                            </td>
                            <td className="p-3 font-medium">{row.modelo || '---'}</td>
                            <td className="p-3 font-bold">{row.peso_capacidade || '---'}</td>
                            <td className="p-3 font-mono">{row.data_ultima_recarga || '---'}</td>
                            <td className="p-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold uppercase bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                                  <CheckCircle className="w-3 h-3" /> Conforme
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {row.errors.map((err, idx) => (
                                    <span key={idx} className="flex items-center gap-1 text-rose-700 font-bold uppercase bg-rose-50 border border-rose-100 px-2 py-0.5 rounded leading-tight w-fit">
                                      <AlertTriangle className="w-3 h-3 text-rose-650 shrink-0" /> {err}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        ) : (
          // ===================================================================
          // DASHBOARD KPI + LISTA DE ATIVOS
          // ===================================================================
          <>
            {/* ═══ KPI DASHBOARD PREMIUM ═══ */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 rounded-t-2xl" />

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {/* KPI: Total */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-xl border border-slate-200 relative overflow-hidden"
                >
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold block">Total Cadastrado</span>
                  <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-slate-900 mt-1">{totalExtintores}</h3>
                  <Activity className="absolute right-3 bottom-3 w-8 h-8 text-slate-200" />
                </motion.div>

                {/* KPI: Conformes */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/40 rounded-xl border border-emerald-200 relative overflow-hidden"
                >
                  <span className="text-[9px] text-emerald-600 uppercase tracking-widest font-extrabold block">Conformes</span>
                  <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-emerald-700 mt-1">{conformes}</h3>
                  <CheckCircle className="absolute right-3 bottom-3 w-8 h-8 text-emerald-200" />
                </motion.div>

                {/* KPI: Vencidos */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                  className="p-4 bg-gradient-to-br from-rose-50 to-rose-100/40 rounded-xl border border-rose-200 relative overflow-hidden"
                >
                  <span className="text-[9px] text-rose-600 uppercase tracking-widest font-extrabold block">Vencidos</span>
                  <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-rose-700 mt-1">{vencidos}</h3>
                  {vencidos > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full animate-ping" />}
                  <AlertTriangle className="absolute right-3 bottom-3 w-8 h-8 text-rose-200" />
                </motion.div>

                {/* KPI: Manutenção */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/40 rounded-xl border border-amber-200 relative overflow-hidden"
                >
                  <span className="text-[9px] text-amber-600 uppercase tracking-widest font-extrabold block">Manutenção / A Vencer</span>
                  <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-amber-700 mt-1">{manutencao}</h3>
                  <Wrench className="absolute right-3 bottom-3 w-8 h-8 text-amber-200" />
                </motion.div>

                {/* KPI: Barra de Conformidade + Mini Chart */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 }}
                  className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-xl border border-slate-200 relative overflow-hidden lg:col-span-1 col-span-2"
                >
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold block">Conformidade</span>
                  <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-slate-900 mt-1">{compliancePercent}%</h3>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${compliancePercent}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                      className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    />
                  </div>

                  {/* Mini bar chart */}
                  <div className="flex items-end gap-1.5 mt-3 h-8">
                    <div className="flex flex-col items-center flex-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(conformes / maxBarValue) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="w-full bg-emerald-500 rounded-t-sm min-h-[2px]"
                      />
                      <span className="text-[7px] text-slate-400 mt-0.5">OK</span>
                    </div>
                    <div className="flex flex-col items-center flex-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(vencidos / maxBarValue) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="w-full bg-rose-500 rounded-t-sm min-h-[2px]"
                      />
                      <span className="text-[7px] text-slate-400 mt-0.5">VNC</span>
                    </div>
                    <div className="flex flex-col items-center flex-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(manutencao / maxBarValue) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                        className="w-full bg-amber-500 rounded-t-sm min-h-[2px]"
                      />
                      <span className="text-[7px] text-slate-400 mt-0.5">MNT</span>
                    </div>
                  </div>

                  <Shield className="absolute right-3 bottom-3 w-8 h-8 text-slate-200 opacity-60" />
                </motion.div>
              </div>
            </motion.div>

            {/* Header Panel */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-650 rounded-t-2xl" />
              <div className="absolute -right-10 -bottom-10 opacity-5 text-9xl select-none pointer-events-none" aria-hidden="true">🧯</div>
              <div>
                <h2 className="font-bold text-xl text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>🧯</span> Inventário de Extintores SPCI
                </h2>
                <p className="text-slate-500 text-xs mt-1 font-sans leading-relaxed">
                  Visão consolidada do controle de conformidades, validades de recarga e teste hidrostático da planta corporativa.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar patrimônio, modelo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 w-48 font-sans transition-all"
                  />
                </div>
                <button 
                  onClick={() => { setShowAddForm(true); setNewAssetType('extintor'); }} 
                  className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer rounded-xl border-none active:scale-[0.97] flex items-center gap-2 shadow-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo Extintor
                </button>
              </div>
            </div>

            {/* Grid of Extinguisher Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-slate-800">
              {filteredExtintores.map((asset) => (
                <motion.div
                  key={asset.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-slate-350 transition-all duration-300 group"
                >
                  <DisintegrationOverlay
                    isActive={deletingAssetId === asset.id}
                    themeColor="#ef4444"
                  />
                  
                  <div className={`flex flex-col justify-between h-full w-full transition-all duration-300 ${
                    deletingAssetId === asset.id ? 'opacity-0 scale-95 pointer-events-none' : ''
                  }`}>
                    {/* Color status bar */}
                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 transition-all duration-300 ${
                      asset.status === 'Conforme' || asset.status === 'NO PRAZO' ? 'bg-emerald-600' : asset.status === 'Vencido' || asset.status === 'VENCIDO' ? 'bg-rose-600' : 'bg-amber-500'
                    }`}></div>
                    
                    <div className="p-5 pl-7">
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div>
                          <span className="font-mono text-slate-400 text-[10px] font-bold tracking-widest block uppercase">PATRIMÔNIO: {asset.idAtivo}</span>
                          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight uppercase mt-0.5">{asset.model}</h3>
                        </div>
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border shrink-0 ${
                          asset.status === 'Conforme' || asset.status === 'NO PRAZO'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                            : asset.status === 'Vencido' || asset.status === 'VENCIDO'
                              ? 'text-rose-700 bg-rose-50 border-rose-100' 
                              : 'text-amber-700 bg-amber-50 border-amber-100'
                        }`}>
                          {asset.status}
                        </span>
                      </div>

                      <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium">
                        <p className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-bold uppercase text-[9px] w-12 tracking-wider shrink-0">Local:</span>
                          <span className="text-slate-900 font-extrabold truncate max-w-[80px]">{asset.location}</span> 
                          <span className="text-slate-400 font-sans">|</span> 
                          <span className="text-slate-600 truncate">{asset.subLocation}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-bold uppercase text-[9px] w-12 tracking-wider shrink-0">Selo:</span>
                          <span className="text-slate-950 font-mono font-bold">{asset.seloInmetro}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-bold uppercase text-[9px] w-12 tracking-wider shrink-0">Chassi:</span>
                          <span className="text-slate-950 font-mono font-bold uppercase">{asset.chassi}</span> 
                          <span className="text-slate-400 font-sans">|</span> 
                          <span className="text-slate-900 font-bold">{asset.peso || asset.peso_capacidade || '---'}</span>
                        </p>
                        
                        {asset.fotoUrl && (
                          <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden h-20 bg-white">
                            <img src={asset.fotoUrl} alt="Extintor" className="w-full h-full object-contain" />
                          </div>
                        )}
                        
                        {getCustomAttributes(asset).length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-200">
                            <p className="text-[8px] font-mono font-black text-teal-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">✨ Campos Auto-Modelados IA</p>
                            <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 text-[9px] font-mono text-slate-700 bg-teal-50/50 p-2 rounded-xl border border-teal-100/60 leading-tight">
                              {getCustomAttributes(asset).map((attr, idx) => (
                                <div key={idx} className="truncate" title={`${attr.key}: ${attr.value}`}>
                                  <span className="font-bold text-teal-800">{attr.key}:</span> {attr.value}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 text-center border-t border-slate-100 pt-3 text-[10px] text-slate-500">
                        <div className="border-r border-slate-100">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Última Recarga</p>
                          <p className="font-extrabold text-slate-700 font-mono mt-0.5">{asset.lastRecarga}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Próxima Validade</p>
                          <p className={`font-black font-mono mt-0.5 ${asset.status === 'Vencido' || asset.status === 'VENCIDO' ? 'text-rose-600 animate-pulse font-bold' : 'text-slate-800'}`}>{asset.validadeRecarga}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex justify-between gap-2 overflow-x-auto shrink-0 scrollbar-none rounded-b-2xl">
                      <button 
                        onClick={() => { setSelectedAssetForInspection(asset); }} 
                        className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase py-2.5 tracking-wider rounded-xl border-none cursor-pointer flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Inspecionar
                      </button>
                      
                      {/* CRUD Edit button - opens detail drawer */}
                      <button 
                        onClick={() => setSelectedAssetForDetail(asset)}
                        className="border border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 font-extrabold px-3 py-2 rounded-xl text-[10px] uppercase flex items-center gap-1.5 bg-white cursor-pointer transition-all active:scale-95 shadow-xs" 
                        title="Editar / Detalhes"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>

                      <button 
                        onClick={() => { setSelectedAssetForHistory({ ...asset, type: 'extintor' }); }} 
                        className="border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 font-extrabold px-3 py-2 rounded-xl text-[10px] uppercase flex items-center gap-1.5 bg-white cursor-pointer transition-all active:scale-95 shadow-xs" 
                        title="Ver Histórico NBR"
                      >
                        <History className="w-3.5 h-3.5" /> Histórico
                      </button>
                      
                      <button 
                        onClick={() => handleOpenAlertCenter(asset)} 
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl border-none cursor-pointer transition-all active:scale-95 shadow-xs" 
                        title="Alerta Corporativo"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                      
                      {canDelete && (
                        <button 
                          onClick={() => {
                            requestAssetDeletion(asset, 'extintor', async () => {
                              setDeletingAssetId(asset.id);
                              await new Promise((resolve) => setTimeout(resolve, 1200));
                              await deleteAsset('extintores', asset.id);
                              setDeletingAssetId(null);
                            });
                          }} 
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-xl border-none cursor-pointer transition-all active:scale-95 shadow-xs" 
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
