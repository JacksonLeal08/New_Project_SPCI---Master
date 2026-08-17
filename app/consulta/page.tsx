import { Metadata } from 'next';
import ConsultaIndexClient from './ConsultaIndexClient';

export const metadata: Metadata = {
  title: 'Consulta Pública de Equipamentos e Conformidade NBR | SISTEMA SPCI',
  description: 'Auditoria e consulta pública de rastreabilidade de extintores, hidrantes, sinalização e ativos de segurança contra incêndio do SISTEMA SPCI.',
  alternates: {
    canonical: '/consulta',
  },
  openGraph: {
    title: 'Consulta Pública de Ativos de Segurança | SISTEMA SPCI',
    description: 'Verifique a conformidade e histórico de manutenção de equipamentos de combate a incêndio.',
    url: 'https://spci.compliance.app/consulta',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Consulta Pública de Ativos | SISTEMA SPCI',
    description: 'Auditoria técnica e verificação de extintores e hidrantes SPCI.',
  },
};

export default function ConsultaPage() {
  return <ConsultaIndexClient />;
}
