'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import AdSenseInFeed from '@/app/components/AdSenseInFeed';

type TrendingTag = { tag: string; count: number };
const TAG_REGEX = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]{1,50})/gu;

export default function WhatsHappening() {
  const supabase = useMemo(() => createClient(), []);
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const counts = new Map<string, number>();
      const batchSize = 1000;
      let from = 0;
      let failed = false;
      // Read all accessible recent posts, not just the first 1000.
      while (active) {
        const { data, error: queryError } = await supabase
          .from('posts')
          .select('caption')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);
        if (queryError) { failed = true; break; }
        const rows = data ?? [];
        for (const row of rows) {
          const unique = new Set<string>();
          for (const match of (row.caption ?? '').matchAll(TAG_REGEX)) {
            unique.add(match[2].toLocaleLowerCase());
          }
          for (const tag of unique) counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
        if (rows.length < batchSize) break;
        from += batchSize;
      }
      if (!active) return;
      setError(failed);
      if (!failed) setTags([...counts].map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)).slice(0, 5));
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [supabase]);

  return (
    <aside className="space-y-5" aria-label="Trending hashtags and advertisements">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold"><TrendingUp className="text-blue-600" size={19} />What's Happening</h2>
          <span className="text-xs text-neutral-500">Last 7 days</span>
        </div>
        {loading ? <p className="text-sm text-neutral-500">Loading trends…</p>
          : error ? <p className="text-sm text-neutral-500">Trends unavailable right now.</p>
          : tags.length === 0 ? <p className="text-sm text-neutral-500">No trending hashtags yet.</p>
          : <ol className="space-y-4">{tags.map(({ tag, count }, index) => (
              <li key={tag}>
                <Link href={`/hashtag/${encodeURIComponent(tag)}`} className="block rounded-lg hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                  <span className="block text-xs text-neutral-500">Trending #{index + 1}</span>
                  <span className="block font-semibold">#{tag}</span>
                  <span className="block text-xs text-neutral-500">{count.toLocaleString()} {count === 1 ? 'post' : 'posts'}</span>
                </Link>
              </li>
            ))}</ol>}
      </section>
      <section aria-label="Advertisement" className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <p className="mb-3 text-center text-xs uppercase tracking-wide text-neutral-400">Advertisement</p>
        <AdSenseInFeed />
      </section>
    </aside>
  );
}
