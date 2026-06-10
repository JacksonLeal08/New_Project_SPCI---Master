import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk, IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import { SpciProvider } from './context/SpciContext';
import InstallPwaBanner from './components/InstallPwaBanner';
import './globals.css';

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#af101a',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'SISTEMA SPCI - Gestão de Ativos e Inspeção',
  description: 'Gestão Inteligente de Ativos, Prevenção de Incêndios e Inspeções de Campo SPCI',
  manifest: '/manifest.json',
  robots: 'index, follow',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SPCI Inspeções',
  },
  openGraph: {
    title: 'SISTEMA SPCI - Gestão de Ativos e Inspeção',
    description: 'Gestão Inteligente de Ativos, Prevenção de Incêndios e Inspeções de Campo SPCI',
    url: 'https://spci.compliance.app',
    siteName: 'SISTEMA SPCI',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
      lang="pt-BR" 
      className={`${hankenGrotesk.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning className="bg-slate-50 text-slate-900 antialiased">
        <SpciProvider>
          {children}
          <InstallPwaBanner />
        </SpciProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) { console.log('PWA Service Worker registrado no escopo:', reg.scope); },
                    function(err) { console.error('Erro ao registrar PWA Service Worker:', err); }
                  );
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
