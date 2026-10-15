
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
        {children}
      </body>
    </html>
  );
}
