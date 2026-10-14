'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import PostCard from '@/app/components/PostCard';
import Link from 'next/link';
import { PlusSquare, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchFeed = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    // Fetch posts and explicitly hint the user_id foreign key relationship
    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*, profiles:user_id(id, username, avatar)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feed:', error.message);
    } else if (postsData) {
      const formattedPosts = postsData.map(p => ({
        ...p,
        profiles: p.profiles || { id: p.user_id, username: 'user', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }
      }));
      setPosts(formattedPosts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeed();
  }, [supabase]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <p className="text-sm text-neutral-500">Loading feed...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="w-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h1 className="font-bold text-sm">Feed</h1>
          <button onClick={fetchFeed} className="p-1 text-neutral-500 hover:text-black dark:hover:text-white transition-colors" title="Refresh feed">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <p className="text-neutral-500 text-sm">No posts yet. Be the first to share a photo!</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-semibold"
            >
              <PlusSquare className="w-4 h-4" /> Create Post
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))
        )}
      </div>
    </AppShell>
  );
}