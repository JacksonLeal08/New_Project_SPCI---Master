import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'SISTEMA SPCI - Gestão de Ativos e Inspeção',
  description: 'Gestão Inteligente de Ativos, Prevenção de Incêndios e Inspeções de Campo SPCI',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
