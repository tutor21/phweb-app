import { Suspense } from 'react';
import HashtagClient from './HashtagClient';

export default function HashtagPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-4 py-6">Loading hashtag posts...</main>}>
      <HashtagClient />
    </Suspense>
  );
}
