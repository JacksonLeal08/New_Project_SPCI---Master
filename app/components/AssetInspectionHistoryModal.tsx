'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Printer, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  User, 
  FileText, 
  Camera, 
  ShieldCheck, 
  Clock,
  ExternalLink,
  Info,
  Flame,
  Check
} from 'lucide-react';
import { fetchInspecoesByAssetId } from '@/lib/supabaseDb';
import { InspecaoRealizada } from '@/lib/types';
import { formatDateBr } from '@/lib/utils';
import { useSpci } from '@/app/context/SpciContext';

interface AssetInspectionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
  isDark?: boolean;
}

const CHECKLIST_LABELS: Record<string, string> = {
  lacre_presente: 'Lacre de Segurança Preservado e Íntegro',
  pressao_adequada: 'Manômetro com Pressão na Faixa Verde',
  valido_inmetro: 'Selo do Inmetro Válido e Legível',
  obstruido: 'Acesso Livre e Desobstruído',
  sinalizado: 'Sinalização Visual Adequada (Parede e Piso)',
  casco_pintura: 'Estado do Casco e Pintura sem Corrosão'
};

export default function AssetInspectionHistoryModal({
  isOpen,
  onClose,
  asset,
  isDark = true
}: AssetInspectionHistoryModalProps) {
  const { complianceLogs } = useSpci();
  const [inspecoes, setInspecoes] = useState<InspecaoRealizada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedInspecao, setSelectedInspecao] = useState<InspecaoRealizada | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'laudo'>('timeline');

  useEffect(() => {
    if (!isOpen || !asset) return;

    const carregarHistorico = async () => {
      setLoading(true);
      try {
        const idOrPat = asset.idAtivo || asset.id_ativo || asset.numero_patrimonio || asset.id;
        const res = await fetchInspecoesByAssetId(String(idOrPat));

        if (res && res.length > 0) {
          setInspecoes(res);
          setSelectedInspecao(res[0]);
        } else {
          // Fallback para complianceLogs do contexto local se ainda não sincronizado
          const logsLocais: InspecaoRealizada[] = (complianceLogs || [])
            .filter((l: any) => l.assetId === idOrPat)
            .map((l: any, idx: number) => ({
              id: `local-${idx}`,
              asset_id: asset.id,
              asset_patrimonio: idOrPat,
              status: (l.status === 'Não Conforme' ? 'Não Conforme' : 'Conforme') as 'Conforme' | 'Não Conforme',
              tecnico_nome: l.notes?.includes('Técnico:') ? l.notes.split('Técnico:')[1].split(',')[0].trim() : (l.tecnico_nome || 'Jackson (Técnico)'),
              data_inspecao: l.date ? `${l.date}T${l.time || '10:00:00'}` : new Date().toISOString(),
              observacoes: l.notes,
              details: {
                lacre_presente: true,
                pressao_adequada: true,
                valido_inmetro: true,
                obstruido: true,
                sinalizado: true
              }
            }));

          setInspecoes(logsLocais);
          if (logsLocais.length > 0) {
            setSelectedInspecao(logsLocais[0]);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar histórico de inspeções:', err);
      } finally {
        setLoading(false);
      }
    };

    carregarHistorico();
  }, [isOpen, asset, complianceLogs]);

  if (!isOpen || !asset) return null;

  const patrimonio = asset.idAtivo || asset.id_ativo || asset.numero_patrimonio || asset.id || 'N/A';
  const modelo = asset.model || asset.modelo || 'Extintor / Equipamento SPCI';
  const local = asset.location || 'Local Geral';
  const subLocal = asset.subLocation || asset.sub_location || '';
  const selo = asset.seloInmetro || asset.inmetro || 'NBR';
  const chassi = asset.chassi || asset.numero_serie || 'N/A';
  const fabricante = asset.fabricante || 'CHAMATEX / Diversos';
  const validadeRecarga = asset.validadeRecarga || asset.data_vencimento_teste || 'Vigente';
  const photoUrl = selectedInspecao?.foto_evidencia_url || selectedInspecao?.details?.foto_evidencia_url || asset.fotoUrl || asset.foto_url;

  const handlePrint = () => {
    window.print();
  };

  const bgModal = isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-2xl';
  const cardBg = isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #laudo-impresso, #laudo-impresso * {
              visibility: visible;
            }
            #laudo-impresso {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 15mm;
              background: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
            .page-break-avoid {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}</style>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl ${bgModal}`}
        >
          {/* TOPO DO MODAL (NO-PRINT) */}
          <div className="no-print p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500">
                <History size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-red-500">
                    Histórico & Laudos Técnicos
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                    {patrimonio}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold uppercase font-sans">
                  {modelo}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex bg-slate-800/60 p-1 rounded-xl border border-slate-750 text-xs font-semibold">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'timeline' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Linha do Tempo
                </button>
                <button
                  onClick={() => setViewMode('laudo')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'laudo' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Laudo Oficial (PDF)
                </button>
              </div>

              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Imprimir laudo técnico ou salvar em PDF"
              >
                <Printer size={15} />
                <span>Imprimir / PDF</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* CORPO DO MODAL */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent animate-spin mx-auto rounded-full" />
                <p className="text-xs uppercase font-mono text-slate-400">Carregando histórico completo de vistorias...</p>
              </div>
            ) : inspecoes.length === 0 ? (
              <div className="py-16 text-center border border-dashed rounded-2xl border-slate-800 text-slate-400 space-y-2">
                <Info size={32} className="mx-auto text-slate-500" />
                <p className="text-xs uppercase font-mono">Nenhuma vistoria registrada anteriormente para este equipamento.</p>
                <p className="text-[11px] text-slate-500">Realize a primeira inspeção no menu de ronda para iniciar a linha do tempo.</p>
              </div>
            ) : (
              <>
                {/* Visualização de Timeline */}
                {viewMode === 'timeline' && (
                  <div className="space-y-4 no-print">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Vistorias Registradas ({inspecoes.length})
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500">
                        Clique em uma vistoria para visualizar o laudo técnico
                      </span>
                    </div>

                    <div className="space-y-3">
                      {inspecoes.map((insp, index) => {
                        const isSelected = selectedInspecao?.id === insp.id;
                        const isConforme = insp.status === 'Conforme';
                        const hasJustificativa = !!insp.justificativa_reinspecao;

                        return (
                          <div
                            key={insp.id || index}
                            onClick={() => setSelectedInspecao(insp)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-red-500/80 bg-red-950/10 shadow-md ring-1 ring-red-500/30'
                                : `${cardBg} hover:border-slate-700`
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isConforme ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {isConforme ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold font-mono">
                                      {formatDateBr(insp.data_inspecao)}
                                    </span>
                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                                      isConforme
                                        ? 'border-emerald-800 bg-emerald-950/30 text-emerald-400'
                                        : 'border-red-800 bg-red-950/30 text-red-400'
                                    }`}>
                                      {insp.status}
                                    </span>
                                    {hasJustificativa && (
                                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-800/50">
                                        Re-inspeção
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                    <User size={12} /> Técnico: <strong>{insp.tecnico_nome}</strong>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                {(insp.latitude || insp.details?.geo_latitude) && (
                                  <span className="text-[10px] font-mono flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded">
                                    <MapPin size={11} className="text-red-400" />
                                    GPS OK
                                  </span>
                                )}
                                {(insp.foto_evidencia_url || insp.details?.foto_evidencia_url) && (
                                  <span className="text-[10px] font-mono flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded">
                                    <Camera size={11} className="text-cyan-400" />
                                    Foto Anexa
                                  </span>
                                )}
                              </div>
                            </div>

                            {hasJustificativa && (
                              <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] text-amber-300/90 font-sans">
                                <strong>Justificativa Técnica:</strong> {insp.justificativa_reinspecao}
                              </div>
                            )}

                            {insp.observacoes && (
                              <p className="text-[11px] text-slate-400 italic mt-1">
                                &ldquo;{insp.observacoes}&rdquo;
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VISUALIZAÇÃO DO LAUDO TÉCNICO OFICIAL (EM TELA E IMPRESSO) */}
                {selectedInspecao && (
                  <div
                    id="laudo-impresso"
                    className={`p-6 sm:p-8 rounded-2xl border page-break-avoid ${
                      viewMode === 'laudo' ? 'block' : 'hidden sm:block'
                    } ${isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    {/* CABEÇALHO DO LAUDO */}
                    <div className="flex items-start justify-between border-b-2 border-red-600 pb-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                          <Flame size={28} />
                        </div>
                        <div>
                          <h1 className="text-lg font-black tracking-wider uppercase">
                            SPCI MASTER — LAUDO TÉCNICO DE VISTORIA
                          </h1>
                          <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                            SISTEMA DE PROTEÇÃO CONTRA INCÊNDIO & PÂNICO • NBR 12962 / NBR 13434
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-xs font-mono">
                        <p className="font-bold">Protocolo: #{selectedInspecao.id?.toString().slice(0, 8) || 'SPCI-2026'}</p>
                        <p className="text-[11px] text-slate-400">Emissão: {formatDateBr(new Date().toISOString())}</p>
                      </div>
                    </div>

                    {/* DADOS CADASTRAIS DO EQUIPAMENTO */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-750 text-xs mb-6 font-sans">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Patrimônio</span>
                        <strong className="text-sm font-mono text-red-400">{patrimonio}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Modelo / Tipo</span>
                        <strong className="text-xs">{modelo}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Setor / Local</span>
                        <strong className="text-xs">{local} {subLocal ? ` - ${subLocal}` : ''}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Selo Inmetro</span>
                        <strong className="text-xs font-mono">{selo}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Fabricante / Chassi</span>
                        <span className="text-xs">{fabricante} / {chassi}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Vencimento Recarga</span>
                        <span className="text-xs font-mono">{validadeRecarga}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Data da Vistoria</span>
                        <strong className="text-xs font-mono">{formatDateBr(selectedInspecao.data_inspecao)}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Status Final</span>
                        <strong className={`text-xs font-mono uppercase ${
                          selectedInspecao.status === 'Conforme' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {selectedInspecao.status}
                        </strong>
                      </div>
                    </div>

                    {/* SEÇÃO PRINCIPAL: ITENS DO CHECKLIST AO LADO DA FOTO EM TAMANHO MÉDIO */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start mb-6 page-break-avoid">
                      {/* COLUNA ESQUERDA: CHECKLIST DE CONFORMIDADE */}
                      <div className="md:col-span-7 space-y-2.5">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-750">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                            Itens do Checklist de Conformidade
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">NBR 12962</span>
                        </div>

                        <div className="space-y-1.5">
                          {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
                            const details = selectedInspecao.details || {};
                            const val = details[key];
                            const isItemOk = val === true || val === 'true' || val === undefined;

                            return (
                              <div
                                key={key}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 border border-slate-750/70 text-xs"
                              >
                                <span className="font-medium text-slate-200">{label}</span>
                                <span className={`flex items-center gap-1 font-bold text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                                  isItemOk
                                    ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-800/60'
                                    : 'text-red-400 bg-red-950/30 border border-red-800/60'
                                }`}>
                                  {isItemOk ? <Check size={11} /> : <X size={11} />}
                                  {isItemOk ? 'Conforme' : 'Irregular'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* COLUNA DIREITA: FOTO DO EQUIPAMENTO EM TAMANHO MÉDIO */}
                      <div className="md:col-span-5 flex flex-col items-center">
                        <div className="w-full pb-1 border-b border-slate-750 mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <Camera size={14} className="text-red-400" />
                            Foto do Equipamento
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">Evidência Técnica</span>
                        </div>

                        <div className="w-full max-w-[280px] h-[220px] rounded-xl border border-slate-700 bg-slate-950 overflow-hidden relative shadow-md flex items-center justify-center">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={`Registro fotográfico do ativo ${patrimonio}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="p-4 text-center space-y-2 text-slate-500">
                              <Camera size={36} className="mx-auto opacity-40" />
                              <p className="text-[10px] uppercase font-mono">Sem registro fotográfico gravado</p>
                            </div>
                          )}

                          {/* Tag informativa sobre a imagem */}
                          <div className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-xs p-1.5 text-[9px] font-mono text-slate-300 flex items-center justify-between border-t border-white/10">
                            <span>{patrimonio}</span>
                            <span>{formatDateBr(selectedInspecao.data_inspecao)}</span>
                          </div>
                        </div>

                        {/* Coordenadas e precisão abaixo da foto */}
                        {(selectedInspecao.latitude || selectedInspecao.details?.geo_latitude) && (
                          <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1 text-center">
                            <MapPin size={11} className="text-red-400 shrink-0" />
                            <span>
                              Lat: {Number(selectedInspecao.latitude || selectedInspecao.details?.geo_latitude).toFixed(6)} | 
                              Lng: {Number(selectedInspecao.longitude || selectedInspecao.details?.geo_longitude).toFixed(6)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* JUSTIFICATIVA TÉCNICA SE HOUVER */}
                    {selectedInspecao.justificativa_reinspecao && (
                      <div className="p-3.5 rounded-xl border border-amber-800/40 bg-amber-950/20 text-xs mb-4 page-break-avoid">
                        <strong className="text-amber-400 uppercase tracking-wider block text-[10px] mb-1">
                          Justificativa Técnica de Re-inspeção:
                        </strong>
                        <p className="text-slate-300">{selectedInspecao.justificativa_reinspecao}</p>
                      </div>
                    )}

                    {/* OBSERVAÇÕES TÉCNICAS */}
                    {selectedInspecao.observacoes && (
                      <div className="p-3 rounded-xl border border-slate-800 bg-slate-800/30 text-xs mb-6 page-break-avoid">
                        <strong className="text-slate-400 uppercase tracking-wider block text-[10px] mb-1">
                          Observações do Inspetor:
                        </strong>
                        <p className="text-slate-300 italic">{selectedInspecao.observacoes}</p>
                      </div>
                    )}

                    {/* ASSINATURAS E AUTENTICAÇÃO */}
                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-800 page-break-avoid">
                      <div className="text-center">
                        <div className="border-b border-slate-500 pb-1 mb-1 font-serif text-sm">
                          {selectedInspecao.tecnico_nome}
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">
                          Inspetor Técnico de Campo
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          Assinatura Digital SPCI Mobile
                        </span>
                      </div>

                      <div className="text-center">
                        <div className="border-b border-slate-500 pb-1 mb-1 font-serif text-sm">
                          Engenharia / Coordenação SPCI
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">
                          Responsável Técnico de Segurança
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          Homologação NBR 12962
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
