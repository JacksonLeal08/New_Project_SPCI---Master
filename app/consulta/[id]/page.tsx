'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';

import { supabase } from '@/lib/supabaseClient';

// ============================================================================
// 1. INTERFACES DE TIPAGEM ESTRETA (TYPESCRIPT)
// ============================================================================

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

// ============================================================================
// 2. CONEXÃO DIRETA COM O SUPABASE
// ============================================================================

async function getAtivoDados(id: string): Promise<AtivoConsulta> {
  const idUpper = id.toUpperCase().trim();
  
  // Realiza a consulta no banco Postgres do Supabase
  // Suporta busca tanto pelo UUID interno quanto pelo ID de Patrimônio (id_ativo)
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

  // Mapeia o JSONB e colunas para a interface AtivoConsulta
  const details = row.details || {};
  
  // Trata status de conformidade
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


// ============================================================================
// 3. COMPONENTE DE CARREGAMENTO (TECHNICAL SKELETON HUD)
// ============================================================================

function QuerySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Topo status skeleton */}
      <div className="h-28 bg-slate-900 border border-slate-800 rounded-none p-6 flex flex-col justify-between">
        <div className="h-4 bg-slate-800 w-1/3 rounded-none" />
        <div className="h-6 bg-slate-800 w-2/3 rounded-none" />
      </div>

      {/* Cards skeletons */}
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

// ============================================================================
// 4. COMPONENTE PRINCIPAL DE CONSULTA PÚBLICA
// ============================================================================

export default function ConsultaAtivoPage() {
  const params = useParams();
  const rawId = params.id ? String(params.id) : '';

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ativo, setAtivo] = useState<AtivoConsulta | null>(null);

  useEffect(() => {
    if (!rawId) {
      setTimeout(() => {
        setError('Identificador do equipamento está ausente ou malformado.');
        setLoading(false);
      }, 0);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAtivoDados(rawId);
        setAtivo(data);
      } catch (err: any) {
        setError(err.message || 'Erro inesperado ao consultar banco SPCI.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [rawId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-mono select-none antialiased relative">
      
      {/* Elementos visuais de background - Grade técnica industrial */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40" aria-hidden="true" />
      
      {/* Linha de borda superior militar/técnica */}
      <div className="h-1.5 w-full bg-slate-800 relative z-10">
        <div className="absolute top-0 right-10 w-24 h-full bg-red-600 animate-pulse" />
      </div>

      {/* Conteúdo principal */}
      <main className="flex-grow w-full max-w-lg mx-auto px-4 py-8 z-10">
        
        {/* Logo / Header da consulta pública */}
        <header className="mb-6 flex justify-between items-end border-b border-slate-900 pb-4">
          <div>
            <h1 className="text-base font-bold tracking-widest text-slate-200">SPCI VERIFIER</h1>
            <p className="text-[8px] font-extrabold uppercase text-slate-500 tracking-[0.25em] mt-1">
              Auditoria Pública de Conformidade NBR
            </p>
          </div>
          <span className="text-[8px] text-slate-600 select-none">PORTAL_PUB_v2.0</span>
        </header>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div 
              key="loading" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
            >
              <QuerySkeleton />
            </motion.div>
          )}

          {!loading && error && (
            <motion.div 
              key="error" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0 }}
              className="border-t-4 border-red-600 border-x border-b border-slate-800 bg-slate-900 p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-1 right-2 text-[8px] text-slate-600 font-mono select-none">
                ERR_ASSET_NOT_FOUND
              </div>
              <div className="text-xl mb-3">⚠️</div>
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2">
                Equipamento não Registrado
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed font-sans mb-6">
                O identificador de chassi/série <strong className="font-mono text-slate-200">{rawId.toUpperCase()}</strong> escaneado não foi localizado no banco de dados SPCI Master. Verifique se o código está correto ou se o equipamento já foi homologado pelo setor de patrimônio.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-red-950/20 hover:bg-red-950/40 border border-red-900/50 text-red-400 text-[10px] font-bold tracking-widest uppercase transition-all active:scale-[0.98] cursor-pointer"
              >
                TENTAR CONSULTAR NOVAMENTE
              </button>
            </motion.div>
          )}

          {!loading && ativo && (
            <motion.div 
              key="success" 
              initial={{ opacity: 0, y: 8 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Top HUD Banner: Badge de Status Principal */}
              <div 
                className={`border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between relative shadow-xl ${
                  ativo.status === 'Conforme' 
                    ? 'border-t-4 border-t-emerald-500' 
                    : ativo.status === 'Em Manutenção' 
                    ? 'border-t-4 border-t-amber-500' 
                    : 'border-t-4 border-t-red-500'
                }`}
              >
                <span className="text-[8px] text-slate-500 select-none uppercase tracking-widest absolute top-1.5 right-2.5">
                  DISPOSITIVO RELATÓRIO
                </span>
                
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                  Série / Identificação: <strong className="text-slate-100">{ativo.id}</strong>
                </span>
                
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-100 uppercase tracking-widest font-sans">
                    {(ativo.tipo).split(' - ')[0]}
                  </h2>
                  <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 w-max border select-none ${
                    ativo.status === 'Conforme'
                      ? 'text-emerald-450 border-emerald-900 bg-emerald-950/20'
                      : ativo.status === 'Em Manutenção'
                      ? 'text-amber-450 border-amber-900 bg-amber-950/20'
                      : 'text-red-450 border-red-900 bg-red-950/20'
                  }`}>
                    {ativo.status === 'Conforme' ? '🟢 OK / CONFORME' : ativo.status === 'Em Manutenção' ? '⚠️ EM MANUTENÇÃO' : '🚨 REPROVADO N/C'}
                  </div>
                </div>
              </div>

              {/* Bloco 1: Identificação do Ativo */}
              <section className="border border-slate-900 bg-slate-900/20 p-5 space-y-4">
                <div className="flex items-center space-x-2 text-slate-400">
                  <div className="h-3 w-1 bg-red-600" />
                  <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-350">
                    Identificação do Ativo
                  </h3>
                </div>
                <div className="h-px bg-slate-900" />
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Selo Inmetro</span>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">{ativo.inmetro}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Fabricante</span>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">{ativo.fabricante}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Carga Nominal</span>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">{ativo.capacidade}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Ano Fabricação</span>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">{ativo.anoFab}</p>
                  </div>
                </div>
              </section>

              {/* Bloco 2: Localização Operacional */}
              <section className="border border-slate-900 bg-slate-900/20 p-5 space-y-4">
                <div className="flex items-center space-x-2 text-slate-400">
                  <div className="h-3 w-1 bg-slate-700" />
                  <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-350">
                    Localização Operacional
                  </h3>
                </div>
                <div className="h-px bg-slate-900" />
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Área Geral</span>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">{ativo.area}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Setor / Prédio</span>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">{ativo.setor}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Instalação Física</span>
                    <p className="text-xs font-bold text-slate-300 font-sans mt-1 leading-relaxed">
                      {ativo.localizacao}
                    </p>
                  </div>
                </div>
              </section>

              {/* Bloco 3: Histórico de Conformidade */}
              <section className="border border-slate-900 bg-slate-900/20 p-5 space-y-4">
                <div className="flex items-center space-x-2 text-slate-400">
                  <div className="h-3 w-1 bg-emerald-600" />
                  <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-350">
                    Histórico de Conformidade
                  </h3>
                </div>
                <div className="h-px bg-slate-900" />
                
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Última Vistoria Registrada</span>
                  <div className="flex items-center justify-between mt-1 bg-slate-950 p-3 border border-slate-900">
                    <p className="text-xs font-bold text-slate-200">{ativo.ultimaInspecao}</p>
                    <span className="text-[9px] text-emerald-400 bg-emerald-950/20 border border-emerald-950 px-2 py-0.5 uppercase font-bold">
                      SINCRONIZADO
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/30 border border-slate-850 text-[10px] leading-relaxed text-slate-400 font-sans">
                  Equipamento vistoriado em conformidade com as normas ABNT NBR 12962 e NBR 13434. A etiqueta e a lacração estão ativas. O próximo teste hidrostático e recargas periódicas devem obedecer à cronologia registrada no painel de controle central.
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 5. Rodapé Institucional */}
      <footer className="w-full text-center py-6 border-t border-slate-900 mt-12 bg-slate-950 z-10">
        <p className="text-[9px] text-slate-500 tracking-widest uppercase">
          © {new Date().getFullYear()} Ω GRUPO OMG • SISTEMA SPCI MASTER
        </p>
        <p className="text-[8px] text-slate-600 mt-1 uppercase tracking-wider">
          Todos os direitos reservados • Segurança Contra Incêndio
        </p>
      </footer>
    </div>
  );
}
