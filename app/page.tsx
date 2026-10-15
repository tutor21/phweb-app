
'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import Link from 'next/link';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import PostCard from '@/app/components/PostCard';
import AdSenseInFeed from '@/app/components/AdSenseInFeed';
import HomePostComposer from '@/app/components/HomePostComposer';

import {
  Compass,
  Sparkles,
  LogIn,
  UserPlus,
  RefreshCw,
} from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  avatar: string | null;
}

interface HomeProfile {
  id: string;
  username: string | null;
  avatar: string | null;
}

interface Post {
  id: string;
  user_id: string;
  caption: string | null;
  image: string | null;
  created_at: string;
  profiles: Profile | null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error
  ) {
    return String(error.message);
  }

  return 'Unable to load posts. Please try again.';
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<{
    id: string;
  } | null>(null);

  const [profile, setProfile] = useState<HomeProfile | null>(
    null
  );

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Check authentication
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.warn('AUTH_ERROR', authError);
      }

      setUser(authUser ? { id: authUser.id } : null);

      // Load logged-in user's profile
      if (authUser) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select('id, username, avatar')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError) {
          console.warn(
            'PROFILE_LOAD_ERROR',
            profileError
          );
        }

        setProfile(
          (profileData as HomeProfile | null) ?? null
        );
      } else {
        setProfile(null);
      }

      // Load latest posts with author profiles
      const { data, error } = await supabase
        .from('posts')
        .select(
          '*, profiles!posts_user_id_fkey(id, username, avatar)'
        )
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      // Normalize nullable usernames to match PostCard
      const normalizedPosts: Post[] = (data ?? []).map(
        (post) => ({
          id: post.id,
          user_id: post.user_id,
          caption: post.caption ?? null,
          image: post.image ?? null,
          created_at: post.created_at,
          profiles: post.profiles
            ? {
                id: post.profiles.id,
                username:
                  post.profiles.username ?? 'user',
                avatar: post.profiles.avatar ?? null,
              }
            : null,
        })
      );

      setPosts(normalizedPosts);
    } catch (error: unknown) {
      console.error('FEED_ERROR', error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  // Remove a deleted post from the feed immediately
  const handlePostDeleted = useCallback(
    (postId: string) => {
      setPosts((previous) =>
        previous.filter((post) => post.id !== postId)
      );
    },
    []
  );

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-4 py-6 text-neutral-900 dark:text-neutral-100">
        {/* Homepage Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Home
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Discover what's happening on PHWeb.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchFeed()}
            disabled={loading}
            aria-label="Refresh feed"
            className="rounded-xl border border-neutral-200 p-2.5 text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <RefreshCw
              size={19}
              className={
                loading ? 'animate-spin' : ''
              }
            />
          </button>
        </div>

        {/* Create Post Composer - Logged-in Users */}
        {user && (
          <HomePostComposer
            username={profile?.username}
            avatar={profile?.avatar}
          />
        )}

        {/* Welcome Banner - Guests Only */}
        {!user && !loading && (
          <section className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-950 dark:bg-blue-950/30">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles
                size={22}
                className="text-blue-600"
              />

              <h2 className="text-lg font-bold">
                Welcome to PHWeb
              </h2>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              Discover posts, connect with people, and
              share what's on your mind. Join our growing
              community to start posting and chatting.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <LogIn size={17} />
                Log In
              </Link>

              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:bg-neutral-900"
              >
                <UserPlus size={17} />
                Sign Up
              </Link>
            </div>
          </section>
        )}

        {/* Feed Heading */}
        <div className="mb-4 flex items-center gap-2">
          <Compass
            size={20}
            className="text-blue-600"
          />

          <h2 className="text-lg font-bold">
            Latest Posts
          </h2>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
          >
            <p className="font-semibold">
              Unable to load the feed
            </p>

            <p className="mt-1">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void fetchFeed()}
              className="mt-3 font-semibold text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-20 text-neutral-500">
            <RefreshCw
              size={22}
              className="animate-spin"
            />

            <span>Loading posts...</span>
          </div>
        )}

        {/* Empty Feed */}
        {!loading &&
          !errorMessage &&
          posts.length === 0 && (
            <div className="rounded-2xl border border-neutral-200 p-10 text-center dark:border-neutral-800">
              <Compass
                size={40}
                className="mx-auto mb-4 text-neutral-400"
              />

              <h3 className="text-lg font-semibold">
                No posts yet
              </h3>

              <p className="mt-2 text-sm text-neutral-500">
                Be the first to share something with
                the community.
              </p>

              {user && (
                <Link
                  href="/create"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create a Post
                </Link>
              )}
            </div>
          )}

        {/* Posts Feed and AdSense */}
        {!loading &&
          !errorMessage &&
          posts.length > 0 && (
            <div className="space-y-5">
              {posts.map((post, index) => (
                <React.Fragment key={post.id}>
                  <PostCard
                    post={post}
                    currentUserId={user?.id ?? ''}
                    onDeleted={handlePostDeleted}
                  />

                  {/* Advertisement after every 5 posts */}
                  {(index + 1) % 5 === 0 && (
                    <div className="py-3">
                      <p className="mb-2 text-center text-xs uppercase tracking-wide text-neutral-400">
                        Advertisement
                      </p>

                      <AdSenseInFeed />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
      </main>
    </AppShell>
  );
}
