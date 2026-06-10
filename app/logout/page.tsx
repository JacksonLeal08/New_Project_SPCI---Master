import React, { Suspense } from 'react';
import LogoutClient from './LogoutClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Desconectando... | SPCI',
  description: 'Encerrando sessão com segurança.'
};

export default function LogoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono text-slate-400">
        Encerrando sessão...
      </div>
    }>
      <LogoutClient />
    </Suspense>
  );
}
