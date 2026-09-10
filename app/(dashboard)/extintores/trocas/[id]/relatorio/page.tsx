'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  FileText,
  Calendar,
  MapPin,
  Flame,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  getAssetSwapsAction,
  SubstituicaoAtivoRecord
} from '@/app/actions/assetSwapActions';
import { formatFriendlyPatrimonio } from '@/lib/maintenanceBatchReports';
import {
  formatFriendlyMotivo,
  generateSwapReportPDF
} from '@/lib/assetSwapReports';

export default function RelatorioTrocaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trocaId = params.id as string;

  const [troca, setTroca] = useState<SubstituicaoAtivoRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getAssetSwapsAction();
        if (res.success && res.trocas) {
          const found = res.trocas.find((t) => t.id === trocaId);
          if (found) {
            setTroca(found);
          }
        }
      } catch (e) {
        console.error('Erro ao buscar troca:', e);
      } finally {
        setLoading(false);
      }
    }
    if (trocaId) load();
  }, [trocaId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-xs">
        Carregando laudo técnico pericial de substituição...
      </div>
    );
  }

  if (!troca) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-3 font-mono">
        <div className="text-red-500 font-bold text-sm">Registro de troca não localizado.</div>
        <button
          onClick={() => router.push('/extintores/trocas')}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs"
        >
          Voltar para Lista de Trocas
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-mono text-xs select-none">
      {/* Barra Superior */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <button
          type="button"
          onClick={() => router.push('/extintores/trocas')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-bold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Trocas</span>
        </button>

        <button
          type="button"
          onClick={() => generateSwapReportPDF(troca)}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Laudo PDF Oficial</span>
        </button>
      </div>

      {/* Cartão Principal do Laudo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="text-[9.5px] font-black uppercase tracking-widest text-red-600 dark:text-red-500 block">
              LAUDO TÉCNICO PERICIAL DE SUBSTITUIÇÃO
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight font-['Hanken_Grotesk'] mt-0.5">
              Certificado de Troca Bilateral de Extintor
            </h1>
            <div className="text-[10px] text-slate-500 mt-1">
              Conformidade ABNT NBR 12962 • NBR 15808 • Instruções Técnicas do Corpo de Bombeiros
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs border border-slate-200 dark:border-slate-700">
              {troca.id}
            </span>
            <div className="text-[10px] text-slate-400 mt-2">
              Data: {new Date(troca.criado_em).toLocaleDateString('pt-BR')} • {new Date(troca.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Comparativo Bilateral */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-red-600" />
            <span>Equipamentos Envolvidos na Troca</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Extintor Retirado */}
            <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-2">
              <div className="flex items-center justify-between border-b border-red-200/60 dark:border-red-900/60 pb-2">
                <span className="font-bold text-red-700 dark:text-red-400 text-xs uppercase">
                  🔴 Ativo Retirado da Área
                </span>
                <span className="text-[9.5px] px-2 py-0.5 rounded bg-red-200/80 dark:bg-red-900 text-red-800 dark:text-red-300 font-bold">
                  Destino: Manutenção
                </span>
              </div>
              <div className="space-y-1 text-[11px] pt-1">
                <div>
                  <strong className="text-slate-500">Identificação:</strong>{' '}
                  <span className="font-bold text-red-700 dark:text-red-300">
                    {formatFriendlyPatrimonio(troca.ativo_retirado_id, troca.ativo_retirado_patrimonio)}
                  </span>
                </div>
                <div>
                  <strong className="text-slate-500">Nº de Série / Chassi:</strong>{' '}
                  <span className="font-mono text-slate-800 dark:text-slate-200">{troca.ativo_retirado_chassi || 'N/A'}</span>
                </div>
                <div>
                  <strong className="text-slate-500">Agente Extintor / Modelo:</strong>{' '}
                  <span className="text-slate-800 dark:text-slate-200">{troca.ativo_retirado_modelo}</span>
                </div>
                <div>
                  <strong className="text-slate-500">Capacidade / Carga:</strong>{' '}
                  <span className="text-slate-800 dark:text-slate-200">{troca.ativo_retirado_capacidade}</span>
                </div>
              </div>
            </div>

            {/* Extintor Substituto */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-900/60 pb-2">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs uppercase">
                  🟢 Ativo Substituto Instalado
                </span>
                <span className="text-[9.5px] px-2 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold">
                  Status: Na Área (Ativo)
                </span>
              </div>
              <div className="space-y-1 text-[11px] pt-1">
                <div>
                  <strong className="text-slate-500">Identificação:</strong>{' '}
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    {formatFriendlyPatrimonio(troca.ativo_substituto_id, troca.ativo_substituto_patrimonio)}
                  </span>
                </div>
                <div>
                  <strong className="text-slate-500">Nº de Série / Chassi:</strong>{' '}
                  <span className="font-mono text-slate-800 dark:text-slate-200">{troca.ativo_substituto_chassi || 'N/A'}</span>
                </div>
                <div>
                  <strong className="text-slate-500">Agente Extintor / Modelo:</strong>{' '}
                  <span className="text-slate-800 dark:text-slate-200">{troca.ativo_substituto_modelo}</span>
                </div>
                <div>
                  <strong className="text-slate-500">Capacidade / Carga:</strong>{' '}
                  <span className="text-slate-800 dark:text-slate-200">{troca.ativo_substituto_capacidade}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dados Operacionais e Parecer Técnico */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
            <div>
              <strong className="text-slate-500 block">Setor de Alocação:</strong>
              <span className="font-bold text-slate-900 dark:text-slate-100">{troca.setor}</span>
            </div>
            <div>
              <strong className="text-slate-500 block">Ponto Específico:</strong>
              <span className="font-bold text-slate-900 dark:text-slate-100">{troca.local_especifico || 'Conforme Mapa Operacional'}</span>
            </div>
            <div>
              <strong className="text-slate-500 block">Técnico / Responsável:</strong>
              <span className="font-bold text-slate-900 dark:text-slate-100">{troca.tecnico_responsavel_nome}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <strong className="text-slate-500">Motivo da Substituição:</strong>{' '}
            <span className="font-bold text-red-600 dark:text-red-400">{formatFriendlyMotivo(troca.motivo_troca)}</span>
            {troca.descricao_motivo && (
              <p className="text-slate-600 dark:text-slate-400 mt-1 italic">
                "{troca.descricao_motivo}"
              </p>
            )}
          </div>
        </div>

        {/* Galeria de Fotos */}
        {(troca.foto_antes_url || troca.foto_depois_url) && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
              📸 Evidências Fotográficas Registradas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center">
                {troca.foto_antes_url ? (
                  <img src={troca.foto_antes_url} alt="Foto Antes" className="max-h-48 mx-auto rounded-xl" />
                ) : (
                  <div className="p-8 text-slate-400">Sem foto do ativo retirado</div>
                )}
                <span className="block text-[10px] font-bold text-slate-500 mt-2 uppercase">
                  1. Condição do Ativo Retirado
                </span>
              </div>

              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center">
                {troca.foto_depois_url ? (
                  <img src={troca.foto_depois_url} alt="Foto Depois" className="max-h-48 mx-auto rounded-xl" />
                ) : (
                  <div className="p-8 text-slate-400">Sem foto do ativo instalado</div>
                )}
                <span className="block text-[10px] font-bold text-slate-500 mt-2 uppercase">
                  2. Substituto Instalado no Suporte
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Termo de Responsabilidade */}
        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[10px] text-amber-900 dark:text-amber-300">
          <strong>Certificação de Segurança:</strong> A presente substituição mantém o setor 100% guarnecido de equipamentos de combate a incêndio em plena conformidade com as normas regulamentadoras ABNT. O equipamento retirado foi encaminhado imediatamente à baia de triagem para revisão técnica.
        </div>
      </div>
    </div>
  );
}
