
import { Suspense } from 'react';
import EditPostClient from './EditPostClient';

function EditPostLoading() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600" />
        <span>Loading post editor...</span>
      </div>
    </main>
  );
}

export default function EditPostPage() {
  return (
    <Suspense fallback={<EditPostLoading />}>
      <EditPostClient />
    </Suspense>
  );
}
