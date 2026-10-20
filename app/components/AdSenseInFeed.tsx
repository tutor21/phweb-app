
'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSenseInFeed() {
  const adRef = useRef<HTMLModElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !adRef.current) return;

    const ad = adRef.current;

    // Prevent duplicate initialization.
    if (ad.getAttribute('data-adsbygoogle-status')) {
      initialized.current = true;
      return;
    }

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      initialized.current = true;
    } catch (error) {
      console.error('AdSense initialization error:', error);
    }
  }, []);

  return (
    <div className="my-6 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <p className="mb-2 text-center text-xs text-neutral-400">
        Advertisement
      </p>

      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-8497336644414125"
        data-ad-slot="9090262155"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

