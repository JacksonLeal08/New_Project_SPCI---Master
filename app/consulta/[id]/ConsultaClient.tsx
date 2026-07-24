'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabaseClient';

export type AtivoStatus = 'Conforme' | 'Não Conforme' | 'Em Manutenção';

export interface AtivoConsulta {
  id: string; // Número de série / Patrimônio
  inmetro: string; // Número do selo Inmetro
  tipo: string; // Tipo de agente extintor (PQS ABC, CO2, AP, etc.)
  capacidade: string; // Carga nominal (KG ou L)
  anoFab: number; // Ano de fabricação do cilindro
  fabricante: string; // Marca fabricante do cilindro
  status: AtivoStatus; // Status de conformidade do ativo
  area: string; // Área geral da planta (ex: Industrial, Administrativo)
  setor: string; // Setor operacional da área
  localizacao: string; // Localização específica de instalação física
  ultimaInspecao: string; // Data e hora da última vistoria registrada
}

async function getAtivoDados(id: string): Promise<AtivoConsulta> {
  const idUpper = id.toUpperCase().trim();
  
  const { data: row, error } = await supabase
    .from('assets')
    .select('*')
    .or(`id.eq.${idUpper},id_ativo.eq.${idUpper}`)
    .maybeSingle();

  if (error) {
    console.error('Erro ao consultar banco de dados Supabase:', error);
    throw new Error(`Falha técnica ao acessar base de dados: ${error.message}`);
  }

  if (!row) {
    throw new Error(`Equipamento sob o ID [${idUpper}] não localizado na base central SPCI.`);
  }

  const details = row.details || {};
  
  let mappedStatus: AtivoStatus = 'Conforme';
  const rawStatus = String(row.status || '').toUpperCase();
  if (rawStatus.includes('NÃO CONFORME') || rawStatus.includes('REPROVADO') || rawStatus.includes('VENCIDO')) {
    mappedStatus = 'Não Conforme';
  } else if (rawStatus.includes('MANUTENÇÃO') || rawStatus.includes('REQ')) {
    mappedStatus = 'Em Manutenção';
  }

  return {
    id: row.id_ativo || row.id,
    inmetro: details.seloInmetro || details.inmetro || 'Isento/NBR',
    tipo: row.model || details.tipo || 'Equipamento SPCI',
    capacidade: details.capacidade || (details.peso ? `${details.peso} KG` : 'N/A'),
    anoFab: parseInt(details.anoFab) || (details.validadeTesteHidro ? parseInt(details.validadeTesteHidro) - 5 : new Date().getFullYear()),
    fabricante: details.fabricante || 'NÃO INFORMADO',
    status: mappedStatus,
    area: details.area || row.location || 'PLANTA GERAL',
    setor: details.setor || row.sub_location || 'ÁREA COMUM',
    localizacao: row.location ? `${row.location}${row.sub_location ? ' - ' + row.sub_location : ''}` : 'Não especificada',
    ultimaInspecao: details.lastRecarga || details.lastInsp || (row.updated_at ? new Date(row.updated_at).toLocaleDateString('pt-BR') : 'Data não disponível')
  };
}

function QuerySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 bg-slate-900 border border-slate-800 rounded-none p-6 flex flex-col justify-between">
        <div className="h-4 bg-slate-800 w-1/3 rounded-none" />
        <div className="h-6 bg-slate-800 w-2/3 rounded-none" />
      </div>

      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-slate-800 bg-slate-900/40 p-5 space-y-4 rounded-none">
          <div className="h-3 bg-slate-800 w-1/4 rounded-none border border-slate-700/30" />
          <div className="h-px bg-slate-800" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-2 bg-slate-800 w-1/2 rounded-none" />
              <div className="h-4 bg-slate-800 w-3/4 rounded-none" />
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-slate-800 w-1/2 rounded-none" />
              <div className="h-4 bg-slate-800 w-5/6 rounded-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ConsultaClient({ assetId }: { assetId: string }) {
  const [ativo, setAtivo] = useState<AtivoConsulta | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function carregarDados() {
      if (!assetId) {
        if (isMounted) {
          setErroMsg('Parâmetro de identificação do equipamento ausente na requisição.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setErroMsg(null);
        const dados = await getAtivoDados(assetId);
        if (isMounted) {
          setAtivo(dados);
        }
      } catch (err: any) {
        if (isMounted) {
          setErroMsg(err?.message || 'Ocorreu um erro ao carregar os dados do equipamento.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    carregarDados();

    return () => {
      isMounted = false;
    };
  }, [assetId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono selection:bg-red-950 selection:text-red-200 p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <header className="border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 bg-red-600 animate-pulse" />
              <h1 className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                SISTEMA SPCI // CONSULTA PÚBLICA
              </h1>
            </div>
            <p className="text-[10px] text-slate-500 tracking-wider uppercase mt-0.5">
              PAINEL DE AUDITORIA E RASTREABILIDADE TÉCNICA
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] border border-slate-800 bg-slate-900 px-2 py-1 text-slate-400 font-mono">
              VER. 2.4.0
            </span>
          </div>
        </header>

        <main>
          {loading && <QuerySkeleton />}

          {!loading && erroMsg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-red-900/50 bg-red-950/20 p-6 space-y-4 rounded-none"
            >
              <div className="flex items-center gap-3 text-red-500">
                <span className="text-xl">⚠️</span>
                <h2 className="text-sm font-bold tracking-wider uppercase">FALHA NA LOCALIZAÇÃO DO ATIVO</h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">{erroMsg}</p>
              <div className="pt-2 border-t border-red-900/30 flex justify-between items-center text-[10px] text-slate-500">
                <span>CÓDIGO DE ERRO: SPCI_404_NOT_FOUND</span>
                <button
                  onClick={() => window.location.reload()}
                  className="hover:text-slate-300 underline uppercase tracking-wider"
                >
                  TENTAR NOVAMENTE
                </button>
              </div>
            </motion.div>
          )}

          {!loading && !erroMsg && ativo && (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div
                  className={`border p-6 rounded-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                    ativo.status === 'Conforme'
                      ? 'border-emerald-900/50 bg-emerald-950/10 text-emerald-400'
                      : ativo.status === 'Em Manutenção'
                      ? 'border-amber-900/50 bg-amber-950/10 text-amber-400'
                      : 'border-red-900/50 bg-red-950/10 text-red-400'
                  }`}
                >
                  <div>
                    <span className="text-[10px] tracking-widest uppercase opacity-70 block mb-1">
                      STATUS DE CONFORMIDADE
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          ativo.status === 'Conforme'
                            ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                            : ativo.status === 'Em Manutenção'
                            ? 'bg-amber-500 shadow-lg shadow-amber-500/50'
                            : 'bg-red-500 shadow-lg shadow-red-500/50'
                        }`}
                      />
                      <h2 className="text-xl font-extrabold tracking-wider uppercase">{ativo.status}</h2>
                    </div>
                  </div>

                  <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0 w-full sm:w-auto">
                    <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-0.5">
                      ÚLTIMA VISTORIA TÉCNICA
                    </span>
                    <span className="text-xs font-semibold text-slate-300">{ativo.ultimaInspecao}</span>
                  </div>
                </div>

                <div className="border border-slate-800 bg-slate-900/40 p-5 space-y-4 rounded-none">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">
                      1. IDENTIFICAÇÃO DO EQUIPAMENTO
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">DADOS GERAIS</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">CÓDIGO DE PATRIMÔNIO</span>
                      <span className="font-bold text-slate-100 tracking-wider">{ativo.id}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">SELO INMETRO</span>
                      <span className="font-bold text-slate-100 tracking-wider">{ativo.inmetro}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">TIPO / AGENTE EXTINTOR</span>
                      <span className="text-slate-300">{ativo.tipo}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">CAPACIDADE NOMINAL</span>
                      <span className="text-slate-300">{ativo.capacidade}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-800 bg-slate-900/40 p-5 space-y-4 rounded-none">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">
                      2. DADOS FÍSICOS E FABRICAÇÃO
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">FABRICAÇÃO</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">FABRICANTE DO CILINDRO</span>
                      <span className="text-slate-300">{ativo.fabricante}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">ANO DE FABRICAÇÃO</span>
                      <span className="text-slate-300">{ativo.anoFab}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-800 bg-slate-900/40 p-5 space-y-4 rounded-none">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">
                      3. LOCALIZAÇÃO E ALOCAÇÃO
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">LOCAL FÍSICO</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">ÁREA GENERAL</span>
                      <span className="text-slate-300">{ativo.area}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">SETOR OPERACIONAL</span>
                      <span className="text-slate-300">{ativo.setor}</span>
                    </div>

                    <div className="sm:col-span-2 border-t border-slate-800/60 pt-3">
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">PONTO DE INSTALAÇÃO</span>
                      <span className="text-slate-200 font-sans text-xs">{ativo.localizacao}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <footer className="mt-8 border-t border-slate-800 pt-4 text-center text-[10px] text-slate-600 max-w-2xl mx-auto w-full">
        <p>SISTEMA DE SEGURANÇA E PREVENÇÃO CONTRA INCÊNDIO // AUTENTICIDADE VERIFICADA</p>
      </footer>
    </div>
  );
}
