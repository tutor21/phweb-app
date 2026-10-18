'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/app/components/AppShell';
import PostCard from '@/app/components/PostCard';
import { createClient } from '@/app/utils/supabase/client';

type Post = {
  id: string; user_id: string; caption: string | null; image: string | null;
  created_at: string; profiles: { id: string; username: string; avatar: string | null } | null;
};

export default function HashtagPage() {
  const params = useParams();
  const tag = typeof params.tag === 'string' ? params.tag.toLocaleLowerCase() : '';
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    if (!/^[\p{L}\p{N}_]{1,50}$/u.test(tag)) {
      setError('Invalid hashtag'); setLoading(false); return;
    }
    const { data: auth } = await supabase.auth.getUser();
    setUserId(auth.user?.id ?? '');
    // Match hashtag as a token, not a substring (e.g. #cat != #cats).
    // Supabase filter narrows candidates; JavaScript performs exact token matching.
    const escaped = tag.replace(/[\\%_]/g, '\\$&');
    const result: Post[] = [];
    let from = 0;
    const batchSize = 500;
    while (true) {
      const { data, error: queryError } = await supabase.from('posts')
        .select('*, profiles!posts_user_id_fkey(id, username, avatar)')
        .ilike('caption', `%#${escaped}%`)
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);
      if (queryError) { setError(queryError.message); break; }
      const rows = data ?? [];
      for (const post of rows) {
        const hashtags = [...(post.caption ?? '').matchAll(/(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]{1,50})/gu)]
          .map((m) => m[2].toLocaleLowerCase());
        if (hashtags.includes(tag)) {
          result.push({ ...post, profiles: post.profiles ? {
            id: post.profiles.id, username: post.profiles.username ?? 'user', avatar: post.profiles.avatar ?? null,
          } : null });
        }
      }
      if (rows.length < batchSize) break;
      from += batchSize;
    }
    setPosts(result); setLoading(false);
  }, [supabase, tag]);

  useEffect(() => { void load(); }, [load]);
  return <AppShell><main className="mx-auto max-w-2xl px-4 py-6 text-neutral-900 dark:text-neutral-100">
    <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Home</Link>
    <h1 className="mb-5 mt-3 text-2xl font-bold">#{tag}</h1>
    {loading ? <p>Loading posts…</p> : error ? <p role="alert">{error}</p>
      : posts.length === 0 ? <p>No posts found for this hashtag.</p>
      : <div className="space-y-5">{posts.map((post) => <PostCard key={post.id} post={post}
          currentUserId={userId} onDeleted={(id: string) => setPosts((old) => old.filter((p) => p.id !== id))} />)}</div>}
  </main></AppShell>;
}
