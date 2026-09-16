import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk, IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import { SpciProvider } from './context/SpciContext';
import { ThemeProvider } from './context/ThemeContext';
import { WindowModalProvider } from './context/WindowModalContext';
import WindowDockTray from './components/WindowDockTray';
import InstallPwaBanner from './components/InstallPwaBanner';
import SyncStatusPanel from './components/SyncStatusPanel';
import { SITE_URL, SEO_CONFIG } from '@/config/seo';
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
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SEO_CONFIG.defaultTitle,
    template: SEO_CONFIG.titleTemplate,
  },
  description: SEO_CONFIG.defaultDescription,
  keywords: SEO_CONFIG.keywords,
  category: SEO_CONFIG.category,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
    title: 'SPCI Master',
  },
  openGraph: {
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    url: SITE_URL,
    siteName: SEO_CONFIG.siteName,
    locale: SEO_CONFIG.locale,
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SISTEMA SPCI Master - Governança e Segurança Contra Incêndio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    images: ['/og-image.png'],
  },
};

const jsonLdData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Grupo OMG - Segurança Contra Incêndio',
      url: SITE_URL,
      logo: `${SITE_URL}/logo-omg.png`,
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#webapp`,
      name: 'SISTEMA SPCI Master',
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'All',
      url: SITE_URL,
      description: SEO_CONFIG.defaultDescription,
      publisher: {
        '@id': `${SITE_URL}/#organization`,
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'BRL',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
      lang="pt-BR" 
      translate="no"
      className={`light ${hankenGrotesk.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable} notranslate`}
    >
      <head>
        <meta name="google" content="notranslate" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body suppressHydrationWarning className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 antialiased transition-colors duration-300">
        <ThemeProvider>
          <SpciProvider>
            <WindowModalProvider>
              {children}
              <WindowDockTray />
              <InstallPwaBanner />
              <SyncStatusPanel />
            </WindowModalProvider>
          </SpciProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('PWA Service Worker registrado no escopo:', reg.scope);
                      reg.update();
                    },
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
