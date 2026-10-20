
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import ThemeProvider from '@/app/components/ThemeProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// Updated Google AdSense Publisher ID
const ADSENSE_CLIENT_ID = 'ca-pub-8497336644414125';

// New primary domain
const SITE_URL = 'https://phweb.net';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: 'Socials',
    template: '%s | Socials',
  },

  description:
    'Connect with friends, share your moments, discover posts, and join conversations on Socials.',

  applicationName: 'Socials',

  keywords: [
    'Socials',
    'social network',
    'social media',
    'photo sharing',
    'community',
    'connect with friends',
  ],

  alternates: {
    canonical: '/',
  },

  openGraph: {
    title: 'Socials',
    description:
      'Share your moments, connect with friends, and discover what is happening on Socials.',
    url: SITE_URL,
    siteName: 'Socials',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: 'Socials',
    description:
      'Connect, share, and discover on Socials.',
  },

  appleWebApp: {
    capable: true,
    title: 'Socials',
    statusBarStyle: 'default',
  },

  manifest: '/manifest.json',

  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-white text-neutral-900 dark:bg-black dark:text-neutral-100`}
      >
        <ThemeProvider>
          {/* Google AdSense - New Publisher ID */}
          <Script
            id="google-adsense"
            strategy="afterInteractive"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />

          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
