'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';

export default function AlertsPage() {
  const {
    triggerSuccessNotification
  } = useSpci();

  const [alertFormChannel, setAlertFormChannel] = useState<'whatsapp' | 'telegram' | 'email'>('whatsapp');
  const [alertTargetContact, setAlertTargetContact] = useState('');
  const [generatedReportText, setGeneratedReportText] = useState(
    `🚨 ALERTA SPCI - RELATÓRIO DE NÃO CONFORMIDADES\n\nPrezado Gestor,\n\nSolicitamos a verificação periódica de conformidade nos ativos SPCI com status pendente de recarga/inspeção.\n\n_Responsável:_ SPCI Compliance`
  );

  const dispatchAlertNotification = () => {
    const textEncoded = encodeURIComponent(generatedReportText);
    if (alertFormChannel === 'whatsapp') {
      const formattedNum = alertTargetContact.replace(/\D/g, '');
      const url = `https://api.whatsapp.com/send?phone=${formattedNum || '5500000000000'}&text=${textEncoded}`;
      window.open(url, '_blank');
    } else if (alertFormChannel === 'telegram') {
      const url = `https://t.me/share/url?url=${encodeURIComponent('https://sistema-spci.com')}&text=${textEncoded}`;
      window.open(url, '_blank');
    } else {
      const url = `mailto:${alertTargetContact || 'gestao@empresa.com'}?subject=${encodeURIComponent('ALERTA DE SEGURANÇA SPCI')}&body=${textEncoded}`;
      window.open(url, '_blank');
    }
    
    triggerSuccessNotification('Alerta despachado com sucesso!', 'Os responsáveis receberam a notificação de conformidade.');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="font-['Hanken_Grotesk'] font-bold text-2xl text-slate-800">🔔 Despache de Alertas Periódicos e Relatórios</h2>
        <p className="text-slate-500 text-xs">Mande relatórios e avisos de equipamentos vencidos imediatamente via WhatsApp, Telegram ou Email</p>
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm max-w-2xl mx-auto space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-rose-600"></div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">Selecione o Canal de Despache</label>
            <div className="flex gap-2">
              {(['whatsapp', 'telegram', 'email'] as const).map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => setAlertFormChannel(channel)}
                  className={`flex-grow py-3 text-xs uppercase font-['Hanken_Grotesk'] font-bold rounded-xl border transition-all cursor-pointer border-none ${alertFormChannel === channel ? 'bg-gradient-to-r from-slate-800 to-slate-950 text-white border-slate-900 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-770'}`}
                >
                  {channel === 'whatsapp' && '💬 WhatsApp'}
                  {channel === 'telegram' && '✈️ Telegram'}
                  {channel === 'email' && '✉️ E-mail'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
              {alertFormChannel === 'email' ? 'E-mail do Destinatário' : 'Celular (com DDI e DDD)'}
            </label>
            <input 
              type="text" 
              value={alertTargetContact}
              onChange={(e) => setAlertTargetContact(e.target.value)}
              placeholder={alertFormChannel === 'email' ? 'exemplo@empresa.com' : '5511999998888'}
              className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-xs focus:outline-none focus:border-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">Corpo da Mensagem (Texto de Alerta NBR / Relatório)</label>
            <textarea 
              value={generatedReportText} 
              onChange={(e) => setGeneratedReportText(e.target.value)}
              rows={6}
              className="w-full bg-slate-50 border border-[#CFD8DC] rounded-xl p-3 text-xs focus:outline-none focus:border-slate-800 font-mono"
            />
          </div>

          <button 
            onClick={dispatchAlertNotification}
            className="w-full bg-gradient-to-r from-red-700 to-rose-600 text-white font-['Hanken_Grotesk'] font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest hover:opacity-90 shadow-md transition-all transform hover:scale-[1.01] border-none cursor-pointer"
          >
            🚀 ENVIAR ALERTA DE VENCIMENTO
          </button>
        </div>
      </div>
    </motion.div>
  );
}
