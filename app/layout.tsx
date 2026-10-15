
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const ADSENSE_CLIENT_ID = 'ca-pub-8523183868184574';

export const metadata: Metadata = {
  title: 'phweb.app - Share Your Moments',
  description: 'Minimalist photo sharing web application',
  manifest: '/manifest.json',
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
