'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import PostCard from '@/app/components/PostCard';
import Link from 'next/link';
import { Compass, Sparkles, LogIn, UserPlus, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = useMemo(() => createClient(), []);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      // Explicitly specify the foreign key relationship !posts_user_id_fkey to resolve PGRST201 ambiguity
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(id, username, avatar)')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setPosts(data || []);
    } catch (err: any) {
      console.error('Error fetching feed:', err);
      let msg = 'Failed to load feed posts.';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null) {
        msg = err.message || err.error_description || JSON.stringify(err);
      }
      if (msg.includes('PGRST201') || msg === '{}') {
        msg = 'Supabase relationship error (PGRST201). Please apply the updated query with explicit foreign key hints.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {!user && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              <h2 className="text-xl font-bold">Welcome to phweb.app</h2>
            </div>
            <p className="text-sm text-blue-100 max-w-lg">
              Share your moments, discover stunning minimalist photography, and connect with creators worldwide.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/login"
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white border border-blue-500 rounded-xl text-sm font-semibold transition"
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </Link>
            </div>
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="p-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/20 text-red-600 text-sm space-y-2">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => void fetchFeed()}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {loading ? (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="flex items-center gap-3 text-neutral-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading feed...</span>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-black p-8 space-y-3">
            <Compass className="w-12 h-12 text-neutral-400 mx-auto" />
            <h3 className="font-bold text-lg">No posts yet</h3>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto">
              Be the first to share a moment on phweb.app!
            </p>
            {user ? (
              <Link
                href="/create"
                className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
              >
                Create Post
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold transition"
              >
                Sign in to Post
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id || ''}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}