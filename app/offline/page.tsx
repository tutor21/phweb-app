
'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-neutral-900 dark:bg-black dark:text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-neutral-100 p-6 dark:bg-neutral-900">
            <WifiOff className="h-12 w-12 text-neutral-500" />
          </div>
        </div>

        <h1 className="mb-3 text-2xl font-bold">
          You're offline
        </h1>

        <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-neutral-500">
          Please check your internet connection.
          Some features of phweb.app require an active
          internet connection.
        </p>

        {isOnline && (
          <p className="mb-4 text-sm font-medium text-green-600">
            Your internet connection has been restored.
          </p>
        )}

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center justify-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-lg border border-neutral-300 px-5 py-3 text-sm font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>

        <p className="mt-8 text-xs text-neutral-400">
          phweb.app — Share Your Moments
        </p>
      </div>
    </main>
  );
}
