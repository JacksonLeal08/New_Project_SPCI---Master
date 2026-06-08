'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { fetchInspecoesByAssetId } from '@/lib/supabaseDb';
import {
  X,
  Save,
  Trash2,
  ClipboardList,
  History,
  Camera,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Shield,
  Loader2
} from 'lucide-react';

type TabKey = 'dados' | 'inspecoes' | 'historico' | 'fotos';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { key: 'dados', label: 'Dados', icon: FileText },
  { key: 'inspecoes', label: 'Inspeções', icon: ClipboardList },
  { key: 'historico', label: 'Histórico', icon: History },
  { key: 'fotos', label: 'Fotos', icon: Camera },
];

export default function AssetDetailDrawer() {
  const {
    selectedAssetForDetail,
    setSelectedAssetForDetail,
    updateExtintorAsset,
    deleteExtintorAsset,
    userProfile,
    complianceLogs,
    requestAssetDeletion,
    setDeletingAssetId,
  } = useSpci();

  const [activeTab, setActiveTab] = useState<TabKey>('dados');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dbInspecoes, setDbInspecoes] = useState<any[]>([]);
  const [loadingInspecoes, setLoadingInspecoes] = useState(false);

  // Editable form state
  const [formData, setFormData] = useState<any>({});

  const asset = selectedAssetForDetail;
  const isOpen = !!asset;
  const canDelete = userProfile?.role === 'Desenvolvedor' || userProfile?.role === 'Administrador';

  // Sync form data when asset changes
  useEffect(() => {
    if (asset) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({ ...asset });
      setActiveTab('dados');
    }
  }, [asset]);

  // Load inspections from Supabase when tab is opened
  const loadInspecoes = useCallback(async () => {
    if (!asset) return;
    setLoadingInspecoes(true);
    try {
      const results = await fetchInspecoesByAssetId(asset.idAtivo || asset.id);
      setDbInspecoes(results);
    } catch {
      setDbInspecoes([]);
    } finally {
      setLoadingInspecoes(false);
    }
  }, [asset]);

  useEffect(() => {
    if (activeTab === 'inspecoes' && asset) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadInspecoes();
    }
  }, [activeTab, asset, loadInspecoes]);

  const handleClose = () => setSelectedAssetForDetail(null);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateExtintorAsset(formData);
    } catch { /* handled by context */ }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!asset) return;
    
    requestAssetDeletion(asset, 'extintor', async () => {
      setIsDeleting(true);
      try {
        // 1. Close detail drawer first so the user can see the card disintegrate in the list
        setSelectedAssetForDetail(null);
        
        // 2. Trigger particle disintegration animation on the card
        setDeletingAssetId(asset.id);
        
        // 3. Wait for the particle animation (1.2s)
        await new Promise((resolve) => setTimeout(resolve, 1200));
        
        // 4. Perform actual database/state deletion
        await deleteExtintorAsset(asset.id);
      } catch { /* handled by context */ }
      finally { 
        setIsDeleting(false); 
        setDeletingAssetId(null);
      }
    });
  };

  // Merge session logs + DB inspections for this asset
  const sessionInspecoes = complianceLogs.filter(
    (log: any) => log.assetId === asset?.idAtivo || log.assetId === asset?.id
  );

  const getStatusColor = (status: string) => {
    if (status === 'Conforme' || status === 'Operacional') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (status === 'Vencido') return 'text-rose-700 bg-rose-50 border-rose-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={handleClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[540px] bg-white shadow-2xl z-[61] flex flex-col overflow-hidden border-l border-slate-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 relative overflow-hidden shrink-0">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-bold block mb-1 font-mono">
                      PATRIMÔNIO
                    </span>
                    <h2 className="text-white font-extrabold text-xl tracking-tight font-['Hanken_Grotesk']">
                      {asset?.idAtivo || asset?.id}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1 font-medium">{asset?.model}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${getStatusColor(asset?.status || '')}`}>
                      <Shield className="w-3 h-3" />
                      {asset?.status}
                    </span>
                    <button
                      onClick={handleClose}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border-none cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-3 px-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer ${
                      isActive
                        ? 'text-red-700 bg-white border-b-2 border-red-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    style={isActive ? { borderBottom: '2px solid #af101a' } : {}}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                {/* TAB: DADOS */}
                {activeTab === 'dados' && (
                  <motion.div
                    key="dados"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <FieldInput label="Patrimônio" value={formData.idAtivo || ''} onChange={(v) => handleFieldChange('idAtivo', v)} mono />
                      <FieldInput label="Modelo" value={formData.model || ''} onChange={(v) => handleFieldChange('model', v)} />
                      <FieldInput label="Local" value={formData.location || ''} onChange={(v) => handleFieldChange('location', v)} icon={<MapPin className="w-3.5 h-3.5 text-slate-400" />} />
                      <FieldInput label="Sub-local" value={formData.subLocation || ''} onChange={(v) => handleFieldChange('subLocation', v)} />
                      <FieldInput label="Selo INMETRO" value={formData.seloInmetro || ''} onChange={(v) => handleFieldChange('seloInmetro', v)} mono />
                      <FieldInput label="Chassi / Nº Série" value={formData.chassi || ''} onChange={(v) => handleFieldChange('chassi', v)} mono />
                      <FieldInput label="Peso / Capacidade" value={formData.peso || formData.peso_capacidade || ''} onChange={(v) => handleFieldChange('peso', v)} />
                      <FieldInput label="Validade (meses)" value={formData.validadeRecargaMeses || formData.meses_validade_recarga || '12'} onChange={(v) => handleFieldChange('validadeRecargaMeses', v)} type="number" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <FieldInput label="Última Recarga" value={formData.lastRecarga || formData.data_ultima_recarga || ''} onChange={(v) => handleFieldChange('lastRecarga', v)} type="date" />
                      <FieldInput label="Ano Teste Hidrostático" value={formData.ultimoTesteHidro || formData.ano_ultimo_teste_hidro || ''} onChange={(v) => handleFieldChange('ultimoTesteHidro', v)} type="number" />
                      <FieldInput label="Ano Fabricação" value={formData.anoFabricacao || formData.ano_fabricacao || ''} onChange={(v) => handleFieldChange('anoFabricacao', v)} type="number" />
                    </div>

                    <FieldInput label="URL da Foto" value={formData.fotoUrl || formData.foto_url || ''} onChange={(v) => handleFieldChange('fotoUrl', v)} fullWidth />

                    {(formData.fotoUrl || formData.foto_url) && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
                        <img src={formData.fotoUrl || formData.foto_url} alt="Foto do ativo" className="w-full h-32 object-contain rounded-lg" />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TAB: INSPEÇÕES */}
                {activeTab === 'inspecoes' && (
                  <motion.div
                    key="inspecoes"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    {/* Session inspections */}
                    {sessionInspecoes.length > 0 && (
                      <div>
                        <h4 className="text-[10px] text-emerald-700 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Sessão Atual
                        </h4>
                        <div className="space-y-2">
                          {sessionInspecoes.map((log: any, i: number) => (
                            <InspecaoCard key={`session-${i}`} data={log} formatDate={formatDate} isSession />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DB inspections */}
                    <div>
                      <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                        <History className="w-3 h-3" /> Histórico de Inspeções (Supabase)
                      </h4>
                      {loadingInspecoes ? (
                        <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                        </div>
                      ) : dbInspecoes.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                          Nenhuma inspeção registrada no banco para este ativo.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dbInspecoes.map((insp: any, i: number) => (
                            <InspecaoCard key={`db-${i}`} data={insp} formatDate={formatDate} />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* TAB: HISTÓRICO */}
                {activeTab === 'historico' && (
                  <motion.div
                    key="historico"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-0"
                  >
                    <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">
                      Timeline do Ativo
                    </h4>
                    <div className="relative ml-3 pl-6 border-l-2 border-slate-200 space-y-6">
                      {asset?.lastRecarga && (
                        <TimelineItem
                          color="bg-emerald-500"
                          title="Última Recarga Registrada"
                          date={formatDate(asset.lastRecarga || asset.data_ultima_recarga)}
                          description={`Modelo ${asset.model} — Capacidade ${asset.peso || asset.peso_capacidade}`}
                        />
                      )}
                      {asset?.validadeRecarga && (
                        <TimelineItem
                          color={asset.status === 'Vencido' ? 'bg-rose-500' : 'bg-blue-500'}
                          title="Próximo Vencimento Recarga"
                          date={formatDate(asset.validadeRecarga)}
                          description={asset.status === 'Vencido' ? '⚠️ VENCIDO — Ação imediata necessária' : 'Dentro do prazo de conformidade'}
                        />
                      )}
                      {asset?.ultimoTesteHidro && (
                        <TimelineItem
                          color="bg-amber-500"
                          title="Último Teste Hidrostático"
                          date={String(asset.ultimoTesteHidro || asset.ano_ultimo_teste_hidro)}
                          description={`Próximo teste: ${Number(asset.ultimoTesteHidro || asset.ano_ultimo_teste_hidro) + 5}`}
                        />
                      )}
                      {(asset?.anoFabricacao || asset?.ano_fabricacao) && (
                        <TimelineItem
                          color="bg-sky-500"
                          title="Ano de Fabricação"
                          date={String(asset.anoFabricacao || asset.ano_fabricacao)}
                          description="Ano de fabricação original do casco do extintor"
                        />
                      )}
                      <TimelineItem
                        color="bg-slate-400"
                        title="Ativo Cadastrado no Sistema"
                        date={asset?.createdAt ? formatDate(asset.createdAt) : 'Data não disponível'}
                        description={`Patrimônio: ${asset?.idAtivo}`}
                      />
                    </div>
                  </motion.div>
                )}

                {/* TAB: FOTOS */}
                {activeTab === 'fotos' && (
                  <motion.div
                    key="fotos"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    {(asset?.fotoUrl || asset?.foto_url) ? (
                      <div className="space-y-3">
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
                          <img
                            src={asset.fotoUrl || asset.foto_url}
                            alt={`Foto ${asset.idAtivo}`}
                            className="w-full h-64 object-contain"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 text-center font-mono uppercase tracking-wider">
                          📷 Foto principal do ativo {asset.idAtivo}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-slate-300">
                        <Camera className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="text-xs text-slate-400 font-medium">Nenhuma foto registrada para este ativo.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Use o campo &quot;URL da Foto&quot; na aba Dados para adicionar.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-slate-200 bg-slate-50/80 p-4 flex items-center justify-between gap-3 shrink-0">
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Excluir
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleClose}
                  className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer transition-all"
                >
                  Fechar
                </button>
                {activeTab === 'dados' && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar Alterações
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --- Sub-components ---

function FieldInput({ label, value, onChange, type = 'text', mono, icon, fullWidth }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  mono?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-1">
        {label}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-2.5 top-1/2 -translate-y-1/2">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 transition-all ${
            mono ? 'font-mono font-bold text-slate-900' : 'text-slate-700'
          } ${icon ? 'pl-8' : ''}`}
        />
      </div>
    </div>
  );
}

function InspecaoCard({ data, formatDate, isSession }: { data: any; formatDate: (d: string) => string; isSession?: boolean }) {
  const isConforme = data.status === 'Conforme' || data.status === 'Operacional';
  return (
    <div className={`p-3 rounded-xl border text-xs ${
      isSession ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase ${
          isConforme ? 'text-emerald-700' : 'text-rose-700'
        }`}>
          {isConforme ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {data.status}
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          {formatDate(data.data_inspecao || data.date || '')}
        </span>
      </div>
      {(data.observacoes || data.notes) && (
        <p className="text-slate-600 text-[11px] mt-1 italic leading-relaxed">
          {data.observacoes || data.notes}
        </p>
      )}
      {data.tecnico_nome && (
        <p className="text-[9px] text-slate-400 mt-1.5 font-mono uppercase tracking-wider">
          Técnico: {data.tecnico_nome}
        </p>
      )}
    </div>
  );
}

function TimelineItem({ color, title, date, description }: {
  color: string;
  title: string;
  date: string;
  description: string;
}) {
  return (
    <div className="relative">
      <div className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full ${color} border-2 border-white shadow-sm`} />
      <div>
        <h5 className="text-xs font-extrabold text-slate-800">{title}</h5>
        <p className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">{date}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
