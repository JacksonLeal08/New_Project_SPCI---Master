import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk, IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import { SpciProvider } from './context/SpciContext';
import { ThemeProvider } from './context/ThemeContext';
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
  metadataBase: new URL('https://spci.compliance.app'),
  title: {
    default: 'SISTEMA SPCI - Gestão de Ativos e Inspeção',
    template: '%s | SISTEMA SPCI',
  },
  description: 'Gestão Inteligente de Ativos, Prevenção de Incêndios e Inspeções de Campo SPCI',
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/omega-icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192.png',
  },
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
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Logo Sistema SPCI - Gestão de Incêndio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SISTEMA SPCI - Gestão de Ativos e Inspeção',
    description: 'Gestão Inteligente de Ativos, Prevenção de Incêndios e Inspeções de Campo SPCI',
    images: ['/icons/icon-512.png'],
  },
};

const jsonLdData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'SISTEMA SPCI',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'All',
  url: 'https://spci.compliance.app',
  description: 'Gestão Inteligente de Ativos, Prevenção de Incêndios e Inspeções de Campo SPCI',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BRL',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
      lang="pt-BR" 
      className={`${hankenGrotesk.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body suppressHydrationWarning className="bg-slate-50 dark:bg-[#333333] text-slate-900 dark:text-[#C4C4C4] antialiased transition-colors duration-300">
        <ThemeProvider>
          <SpciProvider>
            {children}
            <InstallPwaBanner />
          </SpciProvider>
        </ThemeProvider>
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
