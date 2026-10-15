
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const ADSENSE_CLIENT_ID = 'ca-pub-8523183868184574';

export const metadata: Metadata = {
  metadataBase: new URL('https://socials.primeflix4all.site'),

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

  openGraph: {
    title: 'Socials',
    description:
      'Share your moments, connect with friends, and discover what is happening on Socials.',
    url: 'https://socials.primeflix4all.site',
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
    <html lang="en">
      <body
        className={`${inter.className} h-full bg-white dark:bg-black text-neutral-900 dark:text-neutral-100`}
      >
        {/* Google AdSense Auto Ads */}
        <Script
          id="google-adsense"
          strategy="afterInteractive"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />

        {children}
      </body>
    </html>
  );
}
