'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  MapPin,
  ShieldCheck,
  FileText,
  Camera,
  Layers,
  X,
  Building,
  Info
} from 'lucide-react';
import { fetchInspecaoById } from '@/lib/supabaseDb';
import { InspecaoRealizada } from '@/lib/types';

// Carregamento dinâmico estrito do Leaflet para evitar exceções de SSR / Hydration na Vercel
const InspectionMiniMap = dynamic(() => import('@/app/components/InspectionMiniMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 sm:h-72 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 flex items-center justify-center text-xs text-slate-400">
      Carregando mapa georreferenciado...
    </div>
  )
});

export default function LaudoInspecaoPage() {
  const params = useParams();
  const router = useRouter();

  // Tratamento seguro do inspecaoId de params
  const rawId = params?.inspecaoId;
  const inspecaoId = Array.isArray(rawId)
    ? decodeURIComponent(rawId[0]).trim()
    : rawId
    ? decodeURIComponent(String(rawId)).trim()
    : '';

  const [inspecao, setInspecao] = useState<InspecaoRealizada | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomFotoUrl, setZoomFotoUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!inspecaoId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchInspecaoById(inspecaoId)
      .then((data) => {
        if (isMounted) {
          setInspecao(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar dados do laudo:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [inspecaoId]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Gerando Laudo Técnico Pericial...
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Buscando evidências fotográficas, telemetria GPS e auditoria da vistoria.
        </p>
      </div>
    );
  }

  if (!inspecao) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Registro de Vistoria Não Encontrado
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 mb-6">
          Não foi possível localizar o identificador informado ou o registro foi cancelado/removido do banco de dados.
        </p>
        <button
          type="button"
          onClick={() => router.push('/extintores/historico-inspecoes')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Histórico de Vistorias
        </button>
      </div>
    );
  }

  // Verificações blindadas de status
  const statusStr = String(inspecao?.status || '').toLowerCase();
  const isConforme =
    statusStr.includes('conforme') && !statusStr.includes('não') && !statusStr.includes('nao');
  const isCancelada = statusStr.includes('cancel');

  const asset = inspecao?.asset_details || {};

  // Normalização de details se vier como string JSON
  let detailsObj: any = {};
  if (typeof inspecao.details === 'string') {
    try {
      detailsObj = JSON.parse(inspecao.details);
    } catch {
      detailsObj = {};
    }
  } else if (inspecao.details && typeof inspecao.details === 'object') {
    detailsObj = inspecao.details;
  }

  const checklist = detailsObj?.checklistItems || detailsObj || {};

  // Formatação segura de datas
  let dataVistoria = 'Não informada';
  if (inspecao.data_inspecao) {
    try {
      const d = new Date(inspecao.data_inspecao);
      if (!isNaN(d.getTime())) {
        dataVistoria = d.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch {
      dataVistoria = String(inspecao.data_inspecao);
    }
  }

  // Itens do checklist NBR
  const checkItems = [
    {
      label: 'Lacre de Segurança & Pino Trava',
      desc: 'Integridade física do lacre numerado e pino de travamento',
      val: checklist.lacre_presente ?? checklist.lacre ?? true
    },
    {
      label: 'Pressão do Manômetro (Faixa Verde)',
      desc: 'Indicador de pressão na faixa nominal de operação',
      val: checklist.pressao_adequada ?? checklist.pressao ?? true
    },
    {
      label: 'Selo INMETRO & Vencimento',
      desc: 'Selo regulamentar legível e dentro do prazo de vigência',
      val: checklist.valido_inmetro ?? checklist.inmetro ?? true
    },
    {
      label: 'Acesso e Desobstrução na Área',
      desc: 'Área livre de 1m², sem obstáculos para acesso imediato',
      val: checklist.obstruido != null ? !checklist.obstruido : true
    },
    {
      label: 'Sinalização Fotoluminescente',
      desc: 'Placa indicativa conforme NBR 13434 e pintura de piso',
      val: checklist.sinalizado ?? true
    },
    {
      label: 'Estado do Cilindro / Pintura',
      desc: 'Ausência de corrosão, mossas, amassados ou danos estruturais',
      val: checklist.casco_pintura ?? checklist.casco ?? true
    }
  ];

  const numId = Number(inspecao.id);
  const laudoCodigo = !isNaN(numId)
    ? String(numId).padStart(4, '0')
    : (String(inspecao.id || '').slice(0, 8).toUpperCase() || 'PENDENTE');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-4 sm:py-8 px-2 sm:px-6 print:bg-white print:p-0">
      {/* Estilos CSS de impressão injetados de forma compatível com React 19 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 12mm 10mm 12mm 10mm;
            }
            @media print {
              body {
                background: #ffffff !important;
                color: #0f172a !important;
                font-size: 11px !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              nav, aside, header, .no-print {
                display: none !important;
              }
              .page-break {
                page-break-before: always;
              }
              .avoid-break {
                page-break-inside: avoid;
              }
            }
          `
        }}
      />

      {/* Barra de Ferramentas Superior (Oculta na Impressão) */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between no-print gap-2">
        <button
          type="button"
          onClick={() => router.push('/extintores/historico-inspecoes')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao Histórico
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* Documento Principal do Laudo Técnico (Estilo Prancheta Corporativa) */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 sm:p-8 print:border-none print:shadow-none print:p-0 print:bg-white">
        {/* Cabeçalho Oficial SPCI Master */}
        <div className="border-b-2 border-red-600 pb-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 print:text-slate-950 uppercase">
                  SPCI MASTER &bull; LAUDO TÉCNICO PERICIAL
                </h1>
                <p className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 print:text-slate-600 tracking-wider uppercase">
                  Inspeção Regulatória Conforme Norma ABNT NBR 12962 / NR-23
                </p>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 print:bg-slate-100 print:text-slate-900">
              <FileText className="w-3.5 h-3.5 text-red-600" />
              LAUDO #{laudoCodigo}
            </div>
            {mounted && (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        {/* Banner de Status da Vistoria */}
        <div
          className={`mb-6 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 avoid-break ${
            isCancelada
              ? 'bg-slate-100 border-slate-300 dark:bg-slate-800/40 dark:border-slate-700'
              : isConforme
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/40 text-red-900 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {isCancelada ? (
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : isConforme ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <XCircle className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Resultado Oficial da Vistoria
              </div>
              <div className="text-base font-black uppercase tracking-tight">
                {isCancelada
                  ? 'VISTORIA CANCELADA / ANULADA'
                  : isConforme
                  ? 'EQUIPAMENTO CONFORME &bull; APTO PARA USO'
                  : 'NÃO CONFORME &bull; REQUER MANUTENÇÃO IMEDIATA'}
              </div>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="font-semibold block">Data do Registro:</span>
            <span className="font-mono text-[11px] font-bold">{dataVistoria}</span>
          </div>
        </div>

        {/* Grid de Informações Cadastrais do Ativo & Vistoriador */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 avoid-break">
          {/* Card: Dados do Ativo */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-red-600" />
              Ficha Técnica do Equipamento
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Patrimônio</span>
                <span className="font-mono font-black text-slate-800 dark:text-slate-100 text-sm text-red-600 dark:text-red-400">
                  {inspecao.asset_patrimonio || 'S/N'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Número de Série / Chassi</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {asset.numero_serie || asset.chassi || detailsObj?.numero_serie || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Tipo / Agente Extintor</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {asset.tipo || asset.modelo || detailsObj?.tipo || 'Pó Químico Seco (PQS)'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Capacidade Carga</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {asset.capacidade || detailsObj?.capacidade || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Contrato / Site</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {inspecao.site || asset.site || 'SALOBO'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Localização / Setor</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {asset.localizacao || asset.area || detailsObj?.localizacao || 'Área Operacional'}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Metadados da Vistoria & Inspetor */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Auditoria de Campo & Responsabilidade
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Técnico Inspetor</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {inspecao.tecnico_nome || 'Inspetor SPCI'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Horário da Vistoria</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {dataVistoria}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Coordenadas GPS</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {inspecao.latitude != null && inspecao.longitude != null && !isNaN(inspecao.latitude) && !isNaN(inspecao.longitude)
                    ? `${inspecao.latitude.toFixed(5)}, ${inspecao.longitude.toFixed(5)}`
                    : 'Não capturadas'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Precisão do Dispositivo</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {inspecao.precisao_gps != null && !isNaN(inspecao.precisao_gps)
                    ? `±${Math.round(inspecao.precisao_gps)} metros`
                    : 'N/A'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Regulamentação Vigente</span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  Portaria INMETRO nº 500/2012 &bull; IT-21 Bombeiros Militar
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Itens Verificados (NBR 12962) */}
        <div className="mb-6 avoid-break">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Checklist Normativo de Itens Vistoriados
          </h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Item Avaliado</th>
                  <th className="py-2.5 px-3">Critério Normativo</th>
                  <th className="py-2.5 px-3 w-28 text-center">Parecer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {checkItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {item.label}
                    </td>
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {item.desc}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {item.val ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10.5px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          CONFORME
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10.5px] bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                          <XCircle className="w-3 h-3" />
                          NÃO CONF.
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mini-Mapa Georreferenciado & Foto de Evidência lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 avoid-break">
          {/* Mini-Mapa Georreferenciado */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              Telemetria & Georreferenciamento de Campo
            </h3>
            <div className="h-64 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
              <InspectionMiniMap
                latitude={inspecao.latitude}
                longitude={inspecao.longitude}
                accuracy={inspecao.precisao_gps}
                assetPatrimonio={inspecao.asset_patrimonio}
                tecnicoNome={inspecao.tecnico_nome}
                dataHora={dataVistoria}
                status={inspecao.status}
                className="h-full w-full"
              />
            </div>
          </div>

          {/* Foto de Evidência da Vistoria */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              Registro Fotográfico de Evidência
            </h3>
            <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-hidden flex items-center justify-center relative group">
              {inspecao.foto_evidencia_url ? (
                <>
                  <img
                    src={inspecao.foto_evidencia_url}
                    alt={`Evidência ${inspecao.asset_patrimonio}`}
                    className="w-full h-full object-cover cursor-pointer transition duration-300 group-hover:scale-105"
                    onClick={() => setZoomFotoUrl(inspecao.foto_evidencia_url || null)}
                  />
                  <div
                    onClick={() => setZoomFotoUrl(inspecao.foto_evidencia_url || null)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer no-print"
                  >
                    <span className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      Clique para Ampliar Foto
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono backdrop-blur-sm">
                    Foto Registrada em Campo
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <Camera className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Sem foto de evidência anexada</p>
                  <p className="text-[10px] text-slate-400">Vistoria realizada com formulário simplificado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Observações & Justificativas Técnicas */}
        {(inspecao.observacoes || inspecao.justificativa_reinspecao) && (
          <div className="mb-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 avoid-break">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Parecer Técnico & Justificativas Registradas
            </h3>
            {inspecao.observacoes && (
              <div className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">Observação Técnica: </span>
                {inspecao.observacoes}
              </div>
            )}
            {inspecao.justificativa_reinspecao && (
              <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/40">
                <span className="font-bold">Justificativa / Retificação: </span>
                {inspecao.justificativa_reinspecao}
              </div>
            )}
          </div>
        )}

        {/* Campo Formal de Assinaturas (Padrão Corporativo SST) */}
        <div className="mt-10 pt-8 border-t border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-8 text-center avoid-break">
          <div>
            <div className="border-b border-slate-400 dark:border-slate-600 w-4/5 mx-auto mb-2 pb-8" />
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {inspecao.tecnico_nome || 'TÉCNICO RESPONSÁVEL'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Inspetor de Equipamentos de Combate a Incêndio (SPCI)
            </div>
          </div>

          <div>
            <div className="border-b border-slate-400 dark:border-slate-600 w-4/5 mx-auto mb-2 pb-8" />
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
              VISTO DO GESTOR DE SST / CONTRATO
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Segurança do Trabalho &bull; Gestão de Ativos
            </div>
          </div>
        </div>

        {/* Rodapé do Relatório */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] text-slate-400 dark:text-slate-500 font-mono avoid-break">
          SPCI MASTER ENTERPRISE &bull; SISTEMA DE GESTÃO E CONFORMIDADE DE PROTEÇÃO CONTRA INCÊNDIO &bull; PÁGINA 1/1
        </div>
      </div>

      {/* Lightbox / Zoom da Foto de Evidência */}
      {zoomFotoUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomFotoUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 p-2">
            <button
              type="button"
              onClick={() => setZoomFotoUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 hover:bg-black text-white transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomFotoUrl}
              alt="Zoom Evidência"
              className="max-h-[82vh] w-auto mx-auto object-contain rounded-xl"
            />
            <div className="p-3 text-center text-xs text-slate-300 font-mono">
              Evidência Fotográfica - Ativo {inspecao.asset_patrimonio}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
