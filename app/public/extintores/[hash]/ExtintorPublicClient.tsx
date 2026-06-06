'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Award, 
  FileText, 
  Loader2 
} from 'lucide-react';

interface ExtintorPublicData {
  id: string;
  qr_code_hash: string;
  numero_patrimonio: string;
  selo_inmetro: string;
  numero_serie: string;
  peso_capacidade: string;
  modelo_tipo: string;
  local_instalacao: string;
  sub_local_instalacao: string;
  data_ultima_recarga: string;
  ano_ultimo_teste_hidro: number;
  foto_url: string | null;
  data_limite_recarga: string;
  data_limite_hidro: string;
  status_conformidade: 'VENCIDO' | 'A VENCER' | 'NO PRAZO';
}

export default function ExtintorPublicClient({ hash }: { hash: string }) {
  const [loading, setLoading] = useState(true);
  const [extintor, setExtintor] = useState<ExtintorPublicData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) return;

    async function fetchPublicData() {
      try {
        setLoading(true);
        setError(null);

        // Busca dados diretamente da view de consulta pública
        const { data, error: fetchError } = await supabase
          .from('vw_extintores_publico')
          .select('*')
          .eq('qr_code_hash', hash)
          .single();

        if (fetchError || !data) {
          throw new Error('Ativo não localizado no sistema de segurança SPCI.');
        }

        setExtintor(data as ExtintorPublicData);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar informações públicas.');
      } finally {
        setLoading(false);
      }
    }

    fetchPublicData();
  }, [hash]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-mono text-slate-800">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin mb-3" />
        <p className="text-xs uppercase tracking-widest font-bold">Carregando Ficha de Segurança SPCI...</p>
      </div>
    );
  }

  if (error || !extintor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-mono">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-md w-full shadow-lg relative text-center space-y-4 text-slate-800">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600 rounded-t-2xl" />
          <div className="w-12 h-12 bg-red-50 text-red-650 flex items-center justify-center text-2xl font-bold rounded-xl mx-auto shadow-inner">⚠️</div>
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">Falha na Identificação</h3>
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            {error || 'Não foi possível carregar as informações do ativo de combate a incêndio.'}
          </p>
          <p className="text-[9px] text-slate-400 font-sans">
            Se o QR Code foi impresso recentemente, os dados podem estar em processo de replicação.
          </p>
        </div>
      </div>
    );
  }

  // Obter link público da foto se cadastrada
  const publicPhotoUrl = extintor.foto_url
    ? supabase.storage.from('fotos_extintores').getPublicUrl(extintor.foto_url).data.publicUrl
    : null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-mono antialiased text-slate-800 p-4 sm:p-6 select-none">
      
      <div className="w-full max-w-xl mx-auto space-y-6">
        
        {/* Cabecalho de Identidade SPCI */}
        <header className="bg-white border border-slate-200 p-5 shadow-sm relative overflow-hidden flex items-center justify-between rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 rounded-t-2xl" />
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-red-600 text-white rounded font-sans font-black text-xs tracking-tighter">
              SPCI
            </span>
            <div>
              <h1 className="text-xs font-black uppercase tracking-wider text-slate-900">SISTEMA SPCI</h1>
              <p className="text-[8px] text-slate-400 uppercase tracking-widest font-sans">Segurança Contra Incêndio</p>
            </div>
          </div>
          <span className="bg-slate-100 text-slate-500 text-[8px] font-black uppercase px-2.5 py-1 rounded-lg border border-slate-200">
            Ficha Pública
          </span>
        </header>

        {/* Status de Conformidade */}
        <section className={`border p-5 rounded-2xl shadow-sm relative overflow-hidden transition-all ${
          extintor.status_conformidade === 'NO PRAZO' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : extintor.status_conformidade === 'VENCIDO' 
              ? 'bg-rose-50 border-rose-200 text-rose-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          {/* Indicador Lateral de Cor */}
          <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
            extintor.status_conformidade === 'NO PRAZO' ? 'bg-emerald-600' : extintor.status_conformidade === 'VENCIDO' ? 'bg-rose-600' : 'bg-amber-500'
          }`} />

          <div className="flex items-start gap-4">
            <div className="shrink-0 mt-0.5">
              {extintor.status_conformidade === 'NO PRAZO' && <ShieldCheck className="w-8 h-8 text-emerald-600" />}
              {extintor.status_conformidade === 'VENCIDO' && <ShieldAlert className="w-8 h-8 text-rose-600 animate-pulse" />}
              {extintor.status_conformidade === 'A VENCER' && <AlertTriangle className="w-8 h-8 text-amber-500" />}
            </div>
            <div>
              <span className="text-[8px] font-black uppercase tracking-widest block opacity-60">Status do Equipamento</span>
              <h2 className="text-sm font-black uppercase tracking-wider mt-0.5">
                {extintor.status_conformidade === 'NO PRAZO' && 'Equipamento em Conformidade'}
                {extintor.status_conformidade === 'VENCIDO' && 'ATENÇÃO: Extintor Vencido'}
                {extintor.status_conformidade === 'A VENCER' && 'Validade Próxima ao Vencimento'}
              </h2>
              <p className="text-[10px] font-sans mt-1 leading-relaxed opacity-85">
                {extintor.status_conformidade === 'NO PRAZO' && 'O ativo passou nas inspeções e todas as validades de recarga e teste hidrostático encontram-se vigentes.'}
                {extintor.status_conformidade === 'VENCIDO' && 'Este equipamento requer recarga ou teste de integridade hidrostática imediato. Não operar sob esta condição.'}
                {extintor.status_conformidade === 'A VENCER' && 'Uma ou mais validades expiram em menos de 30 dias. Um chamado de manutenção preventiva deve ser agendado.'}
              </p>
            </div>
          </div>
        </section>

        {/* Ficha Tecnica do Ativo */}
        <section className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Ficha de Identificação do Ativo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Número do Patrimônio</span>
              <span className="text-slate-900 font-extrabold text-sm uppercase">{extintor.numero_patrimonio}</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Modelo / Agente</span>
              <span className="text-slate-900 font-extrabold text-sm uppercase">{extintor.modelo_tipo}</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Capacidade</span>
              <span className="text-slate-900 font-extrabold text-sm uppercase">{extintor.peso_capacidade}</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Selo Inmetro</span>
              <span className="text-slate-900 font-bold uppercase">{extintor.selo_inmetro || 'N/D'}</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Número de Série (Chassi)</span>
              <span className="text-slate-900 font-bold uppercase">{extintor.numero_serie || 'N/D'}</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Setor / Local</span>
              <span className="text-slate-900 font-extrabold uppercase flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                {extintor.local_instalacao} 
                {extintor.sub_local_instalacao && ` - ${extintor.sub_local_instalacao}`}
              </span>
            </div>
          </div>
        </section>

        {/* Quadro de Validades */}
        <section className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Controle de Cronograma de Prazos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Bloco Recarga */}
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Cronograma de Recarga</span>
              <div className="text-[11px] space-y-1">
                <p className="flex justify-between"><span className="text-slate-500 font-sans">Última Recarga:</span> <span className="font-bold text-slate-800">{formatDate(extintor.data_ultima_recarga)}</span></p>
                <p className="flex justify-between border-t border-slate-200/50 pt-1 font-bold">
                  <span className="text-slate-500 font-sans">Data Limite:</span> 
                  <span className={extintor.status_conformidade === 'VENCIDO' ? 'text-rose-600' : 'text-slate-800'}>
                    {formatDate(extintor.data_limite_recarga)}
                  </span>
                </p>
              </div>
            </div>

            {/* Bloco Teste Hidro */}
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Teste Hidrostático (5 anos)</span>
              <div className="text-[11px] space-y-1">
                <p className="flex justify-between"><span className="text-slate-500 font-sans">Ano do Teste:</span> <span className="font-bold text-slate-800">{extintor.ano_ultimo_teste_hidro}</span></p>
                <p className="flex justify-between border-t border-slate-200/50 pt-1 font-bold">
                  <span className="text-slate-500 font-sans">Ano Limite:</span> 
                  <span className={extintor.status_conformidade === 'VENCIDO' ? 'text-rose-600' : 'text-slate-800'}>
                    {formatDate(extintor.data_limite_hidro)}
                  </span>
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Visualizacao do Ativo (Se houver Foto) */}
        {publicPhotoUrl && (
          <section className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              📷 Foto Registrada do Ativo
            </h3>
            <div className="w-full h-64 border border-slate-100 rounded-xl overflow-hidden shadow-inner flex items-center justify-center bg-slate-50">
              <img 
                src={publicPhotoUrl} 
                alt={`Extintor ${extintor.numero_patrimonio}`} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
          </section>
        )}

      </div>

      <footer className="mt-8 text-center text-slate-400 text-[8px] sm:text-[9px] font-sans">
        <p className="flex items-center justify-center gap-1">
          <Award className="w-3 h-3" /> Sistema Corporativo SPCI • Homologado e Criptografado
        </p>
      </footer>
    </div>
  );
}
