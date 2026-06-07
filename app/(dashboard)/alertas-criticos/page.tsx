'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { useRouter } from 'next/navigation';

export default function AlertasCriticosPage() {
  const router = useRouter();
  const {
    extintores,
    hidrantes,
    sinalizacoes,
    iluminacoes,
    bombas,
    setSelectedAssetForInspection,
    setSelectedAssetForDetail,
    setPremiumAlert
  } = useSpci();

  const [filterCategory, setFilterCategory] = useState<'ALL' | 'extintores' | 'hidrantes' | 'sinalizacoes' | 'iluminacao' | 'bombas'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICO' | 'ATENCAO'>('ALL');

  // --- UNIFY CRITICAL AND EXPIRED ASSETS ---
  const criticalExtintores = extintores
    .filter(x => x.status === 'Vencido' || x.status === 'Em Manutenção' || x.status === 'Atenção')
    .map(x => ({
      id: x.id,
      idAtivo: x.idAtivo || x.id,
      category: 'extintores' as const,
      categoryLabel: '🧯 Extintor',
      model: x.model || 'Extintor de Incêndio',
      location: x.location || 'Não Definido',
      subLocation: x.subLocation || 'N/A',
      status: x.status,
      severity: (x.status === 'Vencido' ? 'CRITICO' : 'ATENCAO') as 'CRITICO' | 'ATENCAO',
      statusColor: x.status === 'Vencido' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200',
      nbr: 'NBR 12962',
      recommendation: 'Realizar recarga anual (Manutenção de 2º Nível) e/ou ensaio hidrostático a cada 5 anos (Manutenção de 3º Nível) conforme NBR 12962.',
      original: x
    }));

  const criticalHidrantes = hidrantes
    .filter(x => x.status === 'Vencido' || x.status === 'Em Manutenção')
    .map(x => ({
      id: x.id,
      idAtivo: x.idAtivo || x.id,
      category: 'hidrantes' as const,
      categoryLabel: '💧 Hidrante',
      model: x.model || 'Abrigo de Hidrante',
      location: x.location || 'Não Definido',
      subLocation: x.subLocation || 'N/A',
      status: x.status,
      severity: (x.status === 'Vencido' ? 'CRITICO' : 'ATENCAO') as 'CRITICO' | 'ATENCAO',
      statusColor: x.status === 'Vencido' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200',
      nbr: 'NBR 13714',
      recommendation: 'Efetuar inspeção visual mensal, teste de pressão anual e ensaio hidrostático das mangueiras a cada 5 anos conforme NBR 13714 e NBR 11861.',
      original: { ...x, category: 'hidrantes' }
    }));

  const criticalSinalizacoes = sinalizacoes
    .filter(x => x.status === 'Faltante' || x.status === 'Não Conforme')
    .map(x => ({
      id: x.id,
      idAtivo: x.idAtivo || x.id,
      category: 'sinalizacoes' as const,
      categoryLabel: '🚸 Sinalização',
      model: x.model || 'Placa de Sinalização',
      location: x.location || 'Não Definido',
      subLocation: x.subLocation || 'N/A',
      status: x.status,
      severity: (x.status === 'Faltante' ? 'CRITICO' : 'ATENCAO') as 'CRITICO' | 'ATENCAO',
      statusColor: x.status === 'Faltante' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200',
      nbr: 'NBR 13434',
      recommendation: 'Substituir placas degradadas ou instalar placas faltantes com propriedades fotoluminescentes adequadas e dimensões corretas conforme NBR 13434.',
      original: { ...x, category: 'sinalizacoes' }
    }));

  const criticalIluminacoes = iluminacoes
    .filter(x => x.status === 'Falha Carga' || x.status === 'Atenção')
    .map(x => ({
      id: x.id,
      idAtivo: x.idAtivo || x.id,
      category: 'iluminacao' as const,
      categoryLabel: '💡 Iluminação',
      model: x.model || 'Bloco Autônomo',
      location: x.location || 'Não Definido',
      subLocation: x.subLocation || 'N/A',
      status: x.status,
      severity: (x.status === 'Falha Carga' ? 'CRITICO' : 'ATENCAO') as 'CRITICO' | 'ATENCAO',
      statusColor: x.status === 'Falha Carga' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200',
      nbr: 'NBR 10898',
      recommendation: 'Verificar fusíveis, lâmpadas ou substituir acumuladores (baterias) inoperantes; realizar teste de autonomia mensal de 1h de duração conforme NBR 10898.',
      original: { ...x, category: 'iluminacao' }
    }));

  const criticalBombas = bombas
    .filter(x => x.status === 'Manutenção Req.' || x.status === 'Nível Óleo Baixo' || x.starts === 'Nível Óleo Baixo' || x.status === 'Atenção')
    .map(x => ({
      id: x.id,
      idAtivo: x.code || x.idAtivo || x.id,
      category: 'bombas' as const,
      categoryLabel: '⛽ Bomba de Incêndio',
      model: x.name || x.type || 'Moto-Bomba',
      location: x.location || 'Casa de Bombas',
      subLocation: x.subLocation || 'Painel Principal',
      status: x.status,
      severity: (x.status === 'Manutenção Req.' ? 'CRITICO' : 'ATENCAO') as 'CRITICO' | 'ATENCAO',
      statusColor: x.status === 'Manutenção Req.' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200',
      nbr: 'NBR 10897 / 13714',
      recommendation: 'Realizar teste de partida semanal automático/manual; inspecionar nível do diesel, sistema de arrefecimento e carga das baterias de partida conforme NBR 10897.',
      original: { ...x, category: 'bombas' }
    }));

  const allAlerts = [
    ...criticalExtintores,
    ...criticalHidrantes,
    ...criticalSinalizacoes,
    ...criticalIluminacoes,
    ...criticalBombas
  ];

  // Apply filters
  const filteredAlerts = allAlerts.filter(alert => {
    const matchesCat = filterCategory === 'ALL' || alert.category === filterCategory;
    const matchesSev = filterSeverity === 'ALL' || alert.severity === filterSeverity;
    return matchesCat && matchesSev;
  });

  const countSeverity = (severity: 'CRITICO' | 'ATENCAO') => {
    return allAlerts.filter(a => a.severity === severity).length;
  };

  const handleTriggerAlert = (alert: any) => {
    setPremiumAlert({
      show: true,
      title: 'Central de Emissão de Alertas Premium',
      message: `Despachar alerta corporativo para o ativo crítico ${alert.idAtivo}.`,
      type: 'critical',
      dispatchData: alert.original
    });
  };

  const handleEditAsset = (alert: any) => {
    if (alert.category === 'extintores') {
      setSelectedAssetForDetail(alert.original);
    } else {
      // Outras categorias: redireciona para a página correspondente e avisa
      setPremiumAlert({
        show: true,
        title: 'Edição de Ativo',
        message: `Para editar hidrantes, sinalizações, iluminações ou bombas, localize o ativo na respectiva página de controle e clique em editar. Redirecionando para a página correspondente...`,
        type: 'info'
      });
      setTimeout(() => {
        router.push(`/${alert.category === 'iluminacao' ? 'iluminacao' : alert.category === 'sinalizacoes' ? 'sinalizacao' : alert.category}`);
      }, 2500);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Banner Superior HUD */}
      <div className="bg-gradient-to-r from-[#1e293b] via-[#1c252a] to-[#0f172a] text-white p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-red-700/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>
        <div className="relative z-10">
          <span className="bg-red-700 text-white text-[10px] font-bold py-1 px-3 rounded-full uppercase tracking-wider shadow-sm font-mono">Central de Resolução SPCI</span>
          <h2 className="font-['Hanken_Grotesk'] font-extrabold text-3xl md:text-4xl text-white tracking-tight mt-3">Tratamento de Alertas Críticos & Vencimentos</h2>
          <p className="text-slate-300 text-sm mt-1">
            Garantia de conformidade física e documental dos ativos em conformidade com as Normas Brasileiras Regulamentadoras (NBRs).
          </p>
        </div>
      </div>

      {/* Estatísticas de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold block">Total Pendências</span>
            <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-slate-800 mt-1">{allAlerts.length}</h3>
          </div>
          <span className="text-3xl">⚠️</span>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100/30 rounded-2xl border border-red-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-red-600 uppercase tracking-widest font-extrabold block">Críticos (Ações Imediatas)</span>
            <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-red-650 mt-1">{countSeverity('CRITICO')}</h3>
          </div>
          <span className="text-3xl">🛑</span>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/30 rounded-2xl border border-amber-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-amber-600 uppercase tracking-widest font-extrabold block">Atenção / Prazos Expirados</span>
            <h3 className="font-['Hanken_Grotesk'] font-extrabold text-3xl text-amber-650 mt-1">{countSeverity('ATENCAO')}</h3>
          </div>
          <span className="text-3xl">🔧</span>
        </div>
      </div>

      {/* Controles de Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'ALL', label: 'Todos os Alertas' },
            { id: 'extintores', label: '🧯 Extintores' },
            { id: 'hidrantes', label: '💧 Hidrantes' },
            { id: 'sinalizacoes', label: '🚸 Sinalização' },
            { id: 'iluminacao', label: '💡 Iluminação' },
            { id: 'bombas', label: '⛽ Bombas' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterCategory(btn.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border-none cursor-pointer active:scale-95 ${
                filterCategory === btn.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {[
            { id: 'ALL', label: 'Todas as Severidades' },
            { id: 'CRITICO', label: '🛑 Críticos' },
            { id: 'ATENCAO', label: '🔧 Atenção' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterSeverity(btn.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer active:scale-95 ${
                filterSeverity === btn.id
                  ? 'bg-red-600 text-white shadow-sm font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listagem de Alertas */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <span className="text-4xl block mb-2">🎉</span>
            <h3 className="font-['Hanken_Grotesk'] font-bold text-slate-800">Todos os ativos conforme!</h3>
            <p className="text-slate-500 text-xs mt-1">Nenhum alerta crítico ou de atenção pendente de resolução.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`${alert.category}-${alert.id}`}
              className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6 hover:shadow-md transition-shadow relative"
            >
              <div className="space-y-3 flex-1">
                {/* Cabeçalho do Card */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                    {alert.categoryLabel}
                  </span>
                  <span className="text-xs font-bold text-[#af101a] font-mono">{alert.idAtivo}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${alert.statusColor}`}>
                    {alert.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold ml-auto sm:ml-0 font-mono">
                    📍 {alert.location} {alert.subLocation !== 'N/A' && ` - ${alert.subLocation}`}
                  </span>
                </div>

                {/* Modelo / Descrição */}
                <div>
                  <h4 className="font-['Hanken_Grotesk'] font-bold text-slate-800 text-sm">{alert.model}</h4>
                </div>

                {/* Quadro NBR de Recomendação */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-1">
                  <span className="text-[9px] text-[#af101a] font-black uppercase tracking-wider font-mono">
                    📋 Diretiva Normativa - {alert.nbr}
                  </span>
                  <p className="text-slate-600 text-xs leading-relaxed font-sans">{alert.recommendation}</p>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="flex flex-row md:flex-col gap-2.5 justify-end md:w-48 self-end md:self-center">
                <button
                  onClick={() => setSelectedAssetForInspection(alert.original)}
                  className="flex-1 md:w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-['Hanken_Grotesk'] font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  📋 Inspecionar
                </button>
                <button
                  onClick={() => handleTriggerAlert(alert)}
                  className="flex-1 md:w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-['Hanken_Grotesk'] font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  🚨 Avisar Gestor
                </button>
                <button
                  onClick={() => handleEditAsset(alert)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-['Hanken_Grotesk'] font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  ⚙️ Detalhes
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
