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
  Info,
  MinusCircle
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

  // Atualização dinâmica do título para impressão e salvamento em PDF
  useEffect(() => {
    const assetTag = inspecao?.asset_patrimonio || inspecao?.asset_id;
    if (assetTag) {
      const originalTitle = document.title;
      document.title = `SISTEMA SPCI - Laudo Técnico Pericial - ${assetTag}`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [inspecao?.asset_patrimonio, inspecao?.asset_id]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      const assetTag = inspecao?.asset_patrimonio || inspecao?.asset_id;
      if (assetTag) {
        document.title = `SISTEMA SPCI - Laudo Técnico Pericial - ${assetTag}`;
      }
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

  const numId = Number(inspecao.id);
  const laudoCodigo = !isNaN(numId)
    ? String(numId).padStart(4, '0')
    : (String(inspecao.id || '').slice(0, 8).toUpperCase() || 'PENDENTE');

  // Resolução inteligente e refinada dos dados técnicos do ativo
  const rawTipo =
    asset.model ||
    asset.modelo ||
    asset.tipo ||
    asset.details?.model ||
    detailsObj?.model ||
    detailsObj?.tipo ||
    detailsObj?.asset_snapshot?.model ||
    detailsObj?.asset_snapshot?.modelo ||
    detailsObj?.asset_snapshot?.tipo ||
    '';
  const formatTipo = rawTipo ? String(rawTipo).trim().toUpperCase() : 'ABC';

  const formatChassi =
    asset.numero_serie ||
    asset.chassi ||
    asset.details?.serialNumber ||
    asset.details?.chassi ||
    detailsObj?.numero_serie ||
    detailsObj?.chassi ||
    detailsObj?.asset_snapshot?.numero_serie ||
    detailsObj?.asset_snapshot?.chassi ||
    'N/A';

  const rawCapacidade =
    asset.peso_capacidade ||
    asset.peso ||
    asset.capacidade ||
    asset.details?.peso_capacidade ||
    asset.details?.peso ||
    detailsObj?.peso_capacidade ||
    detailsObj?.capacidade ||
    detailsObj?.asset_snapshot?.peso_capacidade ||
    detailsObj?.asset_snapshot?.peso ||
    '';

  let formatCapacidade = 'N/A';
  if (rawCapacidade) {
    const cleanCap = String(rawCapacidade).trim().toUpperCase();
    if (cleanCap.includes('KG') || cleanCap.includes('L') || cleanCap.includes('G')) {
      formatCapacidade = cleanCap;
    } else {
      const tipoUpper = String(formatTipo).toUpperCase();
      if (tipoUpper.includes('ÁGUA') || tipoUpper.includes('AGUA') || tipoUpper.includes('ESPUMA') || tipoUpper.includes('H2O')) {
        formatCapacidade = `${cleanCap} L`;
      } else {
        formatCapacidade = `${cleanCap} KG`;
      }
    }
  }

  const locPart = asset.location || asset.localizacao || detailsObj?.location || detailsObj?.asset_snapshot?.location || '';
  const subPart = asset.sub_location || asset.subLocation || detailsObj?.subLocation || detailsObj?.asset_snapshot?.sub_location || '';
  const formatLocal = [locPart, subPart].filter(Boolean).join(' - ') || asset.area || detailsObj?.localizacao || 'Área Operacional';

  const formatSite = inspecao.site || asset.site || asset.details?.site || detailsObj?.site || detailsObj?.asset_snapshot?.site || 'SALOBO';

  // Resolução da foto de evidência principal (url direta, details ou primeira foto de não conformidade)
  let fotoEvidenciaFinal = inspecao.foto_evidencia_url || detailsObj?.foto_evidencia_url || null;
  if (!fotoEvidenciaFinal && detailsObj?.dynamicChecklistResults) {
    for (const val of Object.values(detailsObj.dynamicChecklistResults) as any[]) {
      if (val?.fotoEvidencia1 || val?.fotoEvidencia2) {
        fotoEvidenciaFinal = val.fotoEvidencia1 || val.fotoEvidencia2;
        break;
      }
    }
  }

  // Resolução dinâmica de todos os itens normativos do checklist associados ao tipo de ativo
  const resolvedChecklist = (() => {
    const category = (asset.category || asset.categoria || detailsObj?.category || 'extintores').toLowerCase();
    const dynResults = detailsObj?.dynamicChecklistResults || {};

    let baseItems: Array<{
      id: string;
      label: string;
      desc: string;
      tiposAplicaveis?: string[];
      pesosAplicaveis?: string[];
      legacyKey?: string;
      isLegacyInverted?: boolean;
    }> = [];

    if (category === 'extintores' || !category) {
      baseItems = [
        {
          id: 'chk-1',
          label: 'Localização & Modelo',
          desc: 'Conforme projeto de combate a incêndio e pânico',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Todos']
        },
        {
          id: 'chk-2',
          label: 'Acesso & Desobstrução',
          desc: 'Área livre de 1m², sem obstáculos para acesso imediato',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Todos'],
          legacyKey: 'obstruido',
          isLegacyInverted: true
        },
        {
          id: 'chk-3',
          label: 'Suporte & Altura de Instalação',
          desc: 'Fixação rígida e altura máxima de 1,60 m do piso',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Todos']
        },
        {
          id: 'chk-4',
          label: 'Sinalização de Parede',
          desc: 'Placa indicativa conforme NBR 13434 e visibilidade',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Todos'],
          legacyKey: 'sinalizado'
        },
        {
          id: 'chk-5',
          label: 'Sinalização de Piso',
          desc: 'Demarcação de solo regulamentar conforme NBR 13434',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Todos'],
          legacyKey: 'sinalizado'
        },
        {
          id: 'chk-6',
          label: 'Estado do Cilindro / Pintura',
          desc: 'Ausência de corrosão, mossas, amassados ou danos',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Todos'],
          legacyKey: 'casco_pintura'
        },
        {
          id: 'chk-7',
          label: 'Lacre de Segurança & Pino',
          desc: 'Integridade física do lacre numerado e pino trava',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Todos'],
          legacyKey: 'lacre_presente'
        },
        {
          id: 'chk-8',
          label: 'Selo INMETRO & Vencimento',
          desc: 'Selo regulamentar legível e dentro do prazo de vigência',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Todos'],
          legacyKey: 'valido_inmetro'
        },
        {
          id: 'chk-9',
          label: 'Manutenção Anual & TH (5 Anos)',
          desc: 'Inspeção anual e teste hidrostático dentro da validade',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Todos']
        },
        {
          id: 'chk-10',
          label: 'Pesagem Semestral de CO2',
          desc: 'Pesagem com perda de massa inferior a 10% da carga',
          tiposAplicaveis: ['CO2'],
          pesosAplicaveis: ['Todos']
        },
        {
          id: 'chk-11',
          label: 'Pressão do Manômetro (Faixa Verde)',
          desc: 'Indicador de pressão na faixa nominal de operação',
          tiposAplicaveis: ['PQS', 'AP', 'Espuma', 'K'],
          pesosAplicaveis: ['Todos'],
          legacyKey: 'pressao_adequada'
        },
        {
          id: 'chk-12',
          label: 'Acessórios & Válvulas',
          desc: 'Gatilho, punho, difusor e travas íntegros e operacionais',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Todos']
        },
        {
          id: 'chk-13',
          label: 'Mangueira de Descarga',
          desc: 'Mangueira desobstruída, flexível e sem ressecamento',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Todos']
        },
        {
          id: 'chk-14',
          label: 'Conjunto de Rodagem (Carreta)',
          desc: 'Pneus/rodas, eixo e mangueira longa operacionais',
          tiposAplicaveis: ['Todos'],
          pesosAplicaveis: ['Carreta / Sobre Rodas']
        }
      ];

      // Filtra com base nas características do ativo
      const modelUpper = formatTipo.toUpperCase();
      const rawPesoVal = parseFloat(String(rawCapacidade).replace(/\D/g, '')) || 0;
      const isCarreta = modelUpper.includes('CARRETA') || modelUpper.includes('RODAS') || rawPesoVal >= 20;

      let tipoAgente = 'PQS';
      if (modelUpper.includes('CO2')) tipoAgente = 'CO2';
      else if (modelUpper.includes('AGUA') || modelUpper.includes('ÁGUA') || modelUpper.includes('AP')) tipoAgente = 'AP';
      else if (modelUpper.includes('ESPUMA')) tipoAgente = 'Espuma';
      else if (modelUpper.includes('K')) tipoAgente = 'K';

      baseItems = baseItems.filter(item => {
        const tipos = item.tiposAplicaveis || ['Todos'];
        const matchesTipo = tipos.includes('Todos') || tipos.includes(tipoAgente);

        const pesos = item.pesosAplicaveis || ['Todos'];
        const matchesPeso =
          pesos.includes('Todos') ||
          (isCarreta && pesos.includes('Carreta / Sobre Rodas')) ||
          (!isCarreta && pesos.includes('Portátil'));

        return matchesTipo && matchesPeso;
      });
    } else if (category === 'hidrantes') {
      baseItems = [
        { id: 'hid-1', label: 'Abrigo de Hidrante', desc: 'Limpo, desobstruído e sinalizado conforme NBR 13714' },
        { id: 'hid-2', label: 'Mangueiras de Incêndio', desc: 'Enroladas corretamente (aduchadas ou ziguezague)' },
        { id: 'hid-3', label: 'Esguicho & Chaves Storz', desc: 'Esguicho regulável e chaves Storz em perfeito estado' },
        { id: 'hid-4', label: 'Válvula Globo Angular', desc: 'Válvula angular estanque e sem vazamentos' },
        { id: 'hid-5', label: 'Sinalização de Solo e Parede', desc: 'Placas e demarcação de piso regulamentares' }
      ];
    } else if (category === 'sinalizacoes') {
      baseItems = [
        { id: 'sin-1', label: 'Altura de Fixação da Placa', desc: 'Fixada na altura recomendada pela NBR 13434' },
        { id: 'sin-2', label: 'Propriedades Fotoluminescentes', desc: 'Pigmentação fotoluminescente legível e sem desgaste' },
        { id: 'sin-3', label: 'Indicação de Rota de Fuga', desc: 'Seta e sentido corretos conforme projeto de pânico' },
        { id: 'sin-4', label: 'Fixação Rígida do Suporte', desc: 'Sem risco de queda em rota de evacuação' }
      ];
    } else if (category === 'iluminacao') {
      baseItems = [
        { id: 'lum-1', label: 'Bloco Autônomo & Desobstrução', desc: 'Fixado em local desobstruído e visível' },
        { id: 'lum-2', label: 'LEDs de Carga da Bateria', desc: 'Sinalizadores de carregamento ativos na rede' },
        { id: 'lum-3', label: 'Autonomia Mínima (2 Horas)', desc: 'Bateria atende aos requisitos mínimos de autonomia' },
        { id: 'lum-4', label: 'Botão de Teste Rápido', desc: 'Mecanismo de teste rápido acionando as lâmpadas' }
      ];
    } else {
      baseItems = [
        { id: 'gen-1', label: 'Posicionamento & Localização', desc: 'Conforme normas técnicas de segurança e projeto' },
        { id: 'gen-2', label: 'Acesso & Desobstrução', desc: 'Acesso livre e desimpedido para uso imediato' },
        { id: 'gen-3', label: 'Sinalização Regulamentar', desc: 'Identificação visual e sinalização legíveis' },
        { id: 'gen-4', label: 'Validade & Manutenção', desc: 'Dentro do prazo de manutenção e inspeção' },
        { id: 'gen-5', label: 'Integridade Estrutural', desc: 'Sem avarias, amassados, oxidação ou danos' }
      ];
    }

    // Mapeia os estados reais de cada item
    return baseItems.map(item => {
      let status: 'Conforme' | 'Não Conforme' | 'NA' = 'Conforme';
      let ocorrencia = '';
      let fotoEvidencia: string | null = null;

      if (dynResults[item.id]) {
        const d = dynResults[item.id];
        status = d.status === 'Não Conforme' ? 'Não Conforme' : d.status === 'NA' ? 'NA' : 'Conforme';
        ocorrencia = d.ocorrencia || '';
        fotoEvidencia = d.fotoEvidencia1 || d.fotoEvidencia2 || null;
      } else if (item.legacyKey && detailsObj[item.legacyKey] !== undefined) {
        const val = detailsObj[item.legacyKey];
        const isOk = item.isLegacyInverted ? !val : !!val;
        status = isOk ? 'Conforme' : 'Não Conforme';
      } else if (item.legacyKey && checklist[item.legacyKey] !== undefined) {
        const val = checklist[item.legacyKey];
        const isOk = item.isLegacyInverted ? !val : !!val;
        status = isOk ? 'Conforme' : 'Não Conforme';
      }

      return {
        ...item,
        status,
        ocorrencia,
        fotoEvidencia
      };
    });
  })();

  const half = Math.ceil(resolvedChecklist.length / 2);
  const col1 = resolvedChecklist.slice(0, half);
  const col2 = resolvedChecklist.slice(half);

  const renderCheckCard = (item: any, displayIdx: number) => {
    const isConforme = item.status === 'Conforme';
    const isNA = item.status === 'NA';

    return (
      <div
        key={item.id || displayIdx}
        className={`flex items-center justify-between p-2 print:py-1.5 print:px-2.5 rounded-lg border transition ${
          isConforme
            ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 print:border-slate-200 print:bg-white'
            : isNA
            ? 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 print:border-slate-200 print:bg-slate-50/50'
            : 'border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 print:border-red-300 print:bg-red-50/50'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <span className="font-mono font-bold text-slate-400 print:text-[8px] shrink-0">
            {String(displayIdx + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <div className="font-bold text-slate-800 dark:text-slate-100 text-xs print:text-[8.5px] print:text-slate-950 leading-tight truncate">
              {item.label}
            </div>
            <div className="text-[10px] print:text-[7px] text-slate-500 dark:text-slate-400 print:text-slate-600 leading-tight truncate">
              {item.desc}
            </div>
            {item.ocorrencia && (
              <div className="text-[10px] print:text-[7px] text-red-600 dark:text-red-400 font-semibold truncate">
                • {item.ocorrencia}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {isConforme ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-300 print:text-[7px] print:py-0.5 print:px-1.5">
              <CheckCircle2 className="w-3 h-3 print:w-2.5 print:h-2.5 text-emerald-600" />
              CONFORME
            </span>
          ) : isNA ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 print:bg-slate-50 print:text-slate-600 print:border-slate-300 print:text-[7px] print:py-0.5 print:px-1.5">
              N/A
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 print:bg-red-50 print:text-red-800 print:border-red-300 print:text-[7px] print:py-0.5 print:px-1.5">
              <XCircle className="w-3 h-3 print:w-2.5 print:h-2.5 text-red-600" />
              NÃO CONF.
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-4 sm:py-8 px-2 sm:px-6 print:bg-white print:p-0 print:m-0">
      {/* Estilos CSS de impressão injetados de forma compatível com React 19 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 6mm 8mm 6mm 8mm;
            }
            @media print {
              *, *::before, *::after {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
              }
              *::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
              }
              html, body {
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                font-size: 9px !important;
                line-height: 1.3 !important;
                overflow: hidden !important;
                scrollbar-width: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              main {
                overflow: visible !important;
                height: auto !important;
                min-height: auto !important;
                padding: 0 !important;
                margin: 0 !important;
                scrollbar-width: none !important;
              }
              nav, aside, header, footer, .no-print, [class*="fixed"], [class*="bottom-"], [data-fab], .leaflet-control-zoom, .leaflet-control {
                display: none !important;
              }
              .print-page-box {
                min-height: 280mm !important;
                max-height: 284mm !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
                background: #ffffff !important;
                scrollbar-width: none !important;
              }
              .avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* Documento Principal do Laudo Técnico (Estilo Prancheta Corporativa) */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 sm:p-8 print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:max-w-none print-page-box">
        {/* Cabeçalho Oficial SPCI Master */}
        <div className="border-b-2 border-red-600 pb-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:pb-2.5 print:mb-2.5 print:flex-row">
          <div>
            <div className="flex items-center gap-2.5 print:gap-2">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md print:w-8 print:h-8 print:rounded-lg">
                <ShieldCheck className="w-5 h-5 print:w-4.5 print:h-4.5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl print:text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 print:text-slate-950 uppercase">
                  SPCI MASTER • LAUDO TÉCNICO PERICIAL
                </h1>
                <p className="text-[10.5px] print:text-[8.5px] font-semibold text-slate-500 dark:text-slate-400 print:text-slate-600 tracking-wider uppercase">
                  Inspeção Regulatória Conforme Norma ABNT NBR 12962 / NR-23
                </p>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs print:text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 print:bg-slate-100 print:text-slate-900 print:py-0.5 print:px-2 print:text-[9px]">
              <FileText className="w-3.5 h-3.5 print:w-3 print:h-3 text-red-600" />
              LAUDO #{laudoCodigo}
            </div>
            {mounted && (
              <div className="text-[10px] print:text-[7.5px] text-slate-400 dark:text-slate-500 mt-1 print:mt-0.5 font-mono">
                Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        {/* Banner de Status da Vistoria */}
        <div
          className={`mb-4 print:mb-2.5 p-3.5 print:p-2 rounded-xl print:rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 avoid-break print:flex-row ${
            isCancelada
              ? 'bg-slate-100 border-slate-300 dark:bg-slate-800/40 dark:border-slate-700'
              : isConforme
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/40 text-red-900 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-3 print:gap-2.5">
            {isCancelada ? (
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 print:w-7 print:h-7 print:rounded-md">
                <AlertTriangle className="w-5 h-5 print:w-4 print:h-4" />
              </div>
            ) : isConforme ? (
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm print:w-7 print:h-7 print:rounded-md">
                <CheckCircle2 className="w-5 h-5 print:w-4 print:h-4" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm print:w-7 print:h-7 print:rounded-md">
                <XCircle className="w-5 h-5 print:w-4 print:h-4" />
              </div>
            )}
            <div>
              <div className="text-xs print:text-[8px] font-semibold uppercase tracking-wider opacity-80">
                Resultado Oficial da Vistoria
              </div>
              <div className="text-sm sm:text-base print:text-[11px] font-black uppercase tracking-tight">
                {isCancelada
                  ? 'VISTORIA CANCELADA / ANULADA'
                  : isConforme
                  ? 'EQUIPAMENTO CONFORME • APTO PARA USO'
                  : 'NÃO CONFORME • REQUER MANUTENÇÃO IMEDIATA'}
              </div>
            </div>
          </div>

          <div className="text-right text-xs print:text-[8.5px]">
            <span className="font-semibold block print:inline print:mr-1">Data do Registro:</span>
            <span className="font-mono text-[11px] print:text-[8.5px] font-bold">{dataVistoria}</span>
          </div>
        </div>

        {/* Grid de Informações Cadastrais do Ativo & Vistoriador */}
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 mb-4 avoid-break print:gap-3 print:mb-2.5">
          {/* Card: Dados do Ativo */}
          <div className="p-3.5 print:p-2.5 rounded-xl print:rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 print:border-slate-300 print:bg-slate-50/70">
            <h3 className="text-xs print:text-[9px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5 print:mb-1.5 flex items-center gap-2">
              <Building className="w-3.5 h-3.5 print:w-3.5 print:h-3.5 text-red-600" />
              Ficha Técnica do Equipamento
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs print:text-[8.5px] print:gap-y-1">
              <div>
                <span className="text-[10px] print:text-[7.5px] text-slate-400 block uppercase font-medium">Patrimônio</span>
                <span className="font-mono font-black text-slate-800 dark:text-slate-100 text-sm print:text-[10px] text-red-600 dark:text-red-400">
                  {inspecao.asset_patrimonio || 'S/N'}
                </span>
              </div>
              <div>
                <span className="text-[10px] print:text-[7.5px] text-slate-400 block uppercase font-medium">Número de Série / Chassi</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 print:text-[9px]">
                  {formatChassi}
                </span>
              </div>
              <div>
                <span className="text-[10px] print:text-[7.5px] text-slate-400 block uppercase font-medium">Tipo / Agente Extintor</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 print:text-[9px]">
                  {formatTipo}
                </span>
              </div>
              <div>
                <span className="text-[10px] print:text-[7.5px] text-slate-400 block uppercase font-medium">Capacidade Carga</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-[9px]">
                  {formatCapacidade}
                </span>
              </div>
              <div>
                <span className="text-[10px] print:text-[7.5px] text-slate-400 block uppercase font-medium">Contrato / Site</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-[9px]">
                  {formatSite}
                </span>
              </div>
              <div>
                <span className="text-[10px] print:text-[7.5px] text-slate-400 block uppercase font-medium">Localização / Setor</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-[8.5px] truncate block" title={formatLocal}>
                  {formatLocal}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Metadados da Vistoria & Inspetor */}
          <div className="p-3.5 print:p-2.5 rounded-xl print:rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 print:border-slate-300 print:bg-slate-50/70">
            <h3 className="text-xs print:text-[9px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5 print:mb-1.5 flex items-center gap-2">
              <User className="w-3.5 h-3.5 print:w-3.5 print:h-3.5 text-blue-600" />
              Auditoria de Campo & Responsabilidade
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs print:text-[8.5px] print:gap-y-1">
              <div>
                <span className="text-[10px] print:text-[7.5px] text-slate-400 block uppercase font-medium">Técnico Inspetor</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 print:text-[9px]">
                  {inspecao.tecnico_nome || 'Inspetor SPCI'}
                </span>
              </div>
              <div>
                <span className="text-[10px] print:text-[7.5px] text-slate-400 block uppercase font-medium">Horário da Vistoria</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 print:text-[9px]">
                  {dataVistoria}
                </span>
              </div>
              <div>
                <span className="text-[10px] print:text-[7.5px] text-slate-400 block uppercase font-medium">Coordenadas GPS</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300 print:text-[8.5px]">
                  {inspecao.latitude != null && inspecao.longitude != null && !isNaN(inspecao.latitude) && !isNaN(inspecao.longitude)
                    ? `${inspecao.latitude.toFixed(5)}, ${inspecao.longitude.toFixed(5)}`
                    : 'Não capturadas'}
                </span>
              </div>
              <div>
                <span className="text-[10px] print:text-[7.5px] text-slate-400 block uppercase font-medium">Precisão do Dispositivo</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300 print:text-[8.5px]">
                  {inspecao.precisao_gps != null && !isNaN(inspecao.precisao_gps)
                    ? `±${Math.round(inspecao.precisao_gps)} metros`
                    : 'N/A'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] print:text-[7.5px] text-slate-400 block uppercase font-medium">Regulamentação Vigente</span>
                <span className="text-[11px] print:text-[8.5px] text-slate-600 dark:text-slate-400">
                  Portaria INMETRO nº 500/2012 • IT-21 Bombeiros Militar
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist Normativo de Itens Vistoriados em 2 Colunas (Bento Grid) */}
        <div className="mb-3.5 print:mb-2.5 avoid-break">
          <div className="flex items-center justify-between mb-1.5 print:mb-1">
            <h3 className="text-xs print:text-[9px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 print:w-3 print:h-3 text-emerald-600" />
              Checklist Normativo de Itens Vistoriados ({resolvedChecklist.length} Itens Regulamentares)
            </h3>
            <span className="text-[10px] print:text-[7.5px] font-mono text-slate-500 dark:text-slate-400">
              ABNT NBR 12962 • NR-23
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-1.5 print:gap-x-3 print:gap-y-1.5">
            <div className="space-y-1.5 print:space-y-1.5">
              {col1.map((item, idx) => renderCheckCard(item, idx))}
            </div>
            <div className="space-y-1.5 print:space-y-1.5">
              {col2.map((item, idx) => renderCheckCard(item, half + idx))}
            </div>
          </div>
        </div>

        {/* Mini-Mapa Georreferenciado & Foto de Evidência lado a lado (Altura Nobre e Proporcional) */}
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3.5 mb-3.5 avoid-break print:gap-3 print:mb-2">
          {/* Mini-Mapa Georreferenciado */}
          <div>
            <h3 className="text-xs print:text-[9px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 print:mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 print:w-3 print:h-3 text-red-600" />
              Telemetria & Georreferenciamento de Campo
            </h3>
            <div className="h-64 sm:h-72 print:h-[68mm] rounded-xl print:rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 print:border-slate-300">
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
            <h3 className="text-xs print:text-[9px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 print:mb-1 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 print:w-3 print:h-3 text-amber-600" />
              Registro Fotográfico de Evidência
            </h3>
            <div className="h-64 sm:h-72 print:h-[68mm] rounded-xl print:rounded-lg border border-slate-200 dark:border-slate-800 print:border-slate-300 bg-slate-900/90 print:bg-slate-100 overflow-hidden flex items-center justify-center relative group">
              {fotoEvidenciaFinal ? (
                <>
                  <img
                    src={fotoEvidenciaFinal}
                    alt={`Evidência ${inspecao.asset_patrimonio}`}
                    className="w-full h-full object-contain cursor-pointer transition duration-300 group-hover:scale-105 print:object-contain print:max-h-full"
                    onClick={() => setZoomFotoUrl(fotoEvidenciaFinal || null)}
                  />
                  <div
                    onClick={() => setZoomFotoUrl(fotoEvidenciaFinal || null)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer no-print"
                  >
                    <span className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      Clique para Ampliar Foto
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] print:text-[6.5px] text-white font-mono backdrop-blur-sm print:bottom-1 print:left-1">
                    Foto Registrada em Campo
                  </div>
                </>
              ) : (
                <div className="text-center p-3 print:p-2">
                  <Camera className="w-6 h-6 print:w-4 print:h-4 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                  <p className="text-xs print:text-[8px] text-slate-500 font-medium">Sem foto de evidência anexada</p>
                  <p className="text-[10px] print:text-[6.5px] text-slate-400">Vistoria com formulário simplificado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Observações & Justificativas Técnicas */}
        {(inspecao.observacoes || inspecao.justificativa_reinspecao) && (
          <div className="mb-4 print:mb-2 p-3 print:p-1.5 rounded-xl print:rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 avoid-break print:border-slate-300">
            <h3 className="text-xs print:text-[8px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 print:mb-0.5 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 print:w-3 print:h-3 text-blue-600" />
              Parecer Técnico & Justificativas Registradas
            </h3>
            {inspecao.observacoes && (
              <div className="text-xs print:text-[7.5px] text-slate-700 dark:text-slate-300 mb-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">Observação Técnica: </span>
                {inspecao.observacoes}
              </div>
            )}
            {inspecao.justificativa_reinspecao && (
              <div className="text-xs print:text-[7.5px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 print:p-1 rounded-lg border border-amber-200 dark:border-amber-800/40">
                <span className="font-bold">Justificativa / Retificação: </span>
                {inspecao.justificativa_reinspecao}
              </div>
            )}
          </div>
        )}

        {/* Campo Formal de Assinaturas (Padrão Corporativo SST) */}
        <div className="mt-6 print:mt-auto pt-4 print:pt-3 border-t border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-6 print:gap-8 text-center avoid-break">
          <div>
            <div className="border-b border-slate-400 dark:border-slate-600 w-4/5 mx-auto mb-1.5 print:mb-1 pb-6 print:pb-4" />
            <div className="text-xs print:text-[9px] font-bold text-slate-900 dark:text-slate-100">
              {inspecao.tecnico_nome || 'TÉCNICO RESPONSÁVEL'}
            </div>
            <div className="text-[10px] print:text-[7.5px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Inspetor de Equipamentos de Combate a Incêndio (SPCI)
            </div>
          </div>

          <div>
            <div className="border-b border-slate-400 dark:border-slate-600 w-4/5 mx-auto mb-1.5 print:mb-1 pb-6 print:pb-4" />
            <div className="text-xs print:text-[9px] font-bold text-slate-900 dark:text-slate-100">
              VISTO DO GESTOR DE SST / CONTRATO
            </div>
            <div className="text-[10px] print:text-[7.5px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Segurança do Trabalho • Gestão de Ativos
            </div>
          </div>
        </div>

        {/* Rodapé do Relatório */}
        <div className="mt-4 print:mt-2 pt-2 print:pt-1 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] print:text-[7.5px] text-slate-400 dark:text-slate-500 font-mono avoid-break">
          SPCI MASTER ENTERPRISE • SISTEMA DE GESTÃO E CONFORMIDADE DE PROTEÇÃO CONTRA INCÊNDIO • LAUDO HOMOLOGADO (PÁGINA 1/1)
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
