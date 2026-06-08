import React from 'react';
import LogoutClient from './LogoutClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Desconectando... | SPCI',
  description: 'Encerrando sessão com segurança.'
};

export default function LogoutPage() {
  return <LogoutClient />;
}
