
import { Suspense } from 'react';
import HashtagClient from './HashtagClient';

// Loading state while the hashtag page is rendered
function HashtagLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="animate-pulse space-y-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-48 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-64 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        </div>

        {/* Post skeletons */}
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-neutral-200 dark:bg-neutral-800" />

              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-4 w-4/5 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-40 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// Server Component provides the Suspense boundary
export default function HashtagPage() {
  return (
    <Suspense fallback={<HashtagLoading />}>
      <HashtagClient />
    </Suspense>
  );
}
