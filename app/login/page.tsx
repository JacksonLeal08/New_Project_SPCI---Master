import { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Entrar no Cockpit - SPCI Compliance',
  description: 'Acesse o Cockpit de governança e gestão de combate a incêndio do sistema SPCI.',
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    title: 'Entrar no Cockpit | SPCI Compliance',
    description: 'Acesse o Cockpit de governança e gestão de combate a incêndio do sistema SPCI.',
    url: 'https://spci.compliance.app/login',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Entrar no Cockpit | SPCI Compliance',
    description: 'Acesse o Cockpit de governança e gestão de combate a incêndio do sistema SPCI.',
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
