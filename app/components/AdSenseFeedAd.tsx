'use client';

import React, { useEffect } from 'react';

interface AdSenseFeedAdProps {
  publisherId?: string;
  slotId?: string;
}

export default function AdSenseFeedAd({ publisherId = 'ca-pub-XXXXXXXXXXXXXXXX', slotId = '1234567890' }: AdSenseFeedAdProps) {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-4 my-2 text-center">
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Sponsored Advertisement</div>
      
      {/* Real AdSense Slot or Development Placeholder */}
      <div className="min-h-[250px] flex flex-col items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-xl p-4 bg-white dark:bg-black">
        <span className="text-xs text-neutral-400 mb-1">Google AdSense Feed Unit</span>
        <span className="text-xs font-mono text-neutral-500">Pub: {publisherId} / Slot: {slotId}</span>
        
        {/* Optional: Uncomment below when deploying with verified publisher ID */}
        {/* 
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client={publisherId}
             data-ad-slot={slotId}
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        */}
      </div>
    </div>
  );
}