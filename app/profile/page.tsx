
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Grid3X3,
  Pencil,
  RefreshCw,
  UserRound,
} from 'lucide-react';

import AppShell from '@/app/components/AppShell';
import { createClient } from '@/app/utils/supabase/client';

interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  bio: string | null;
}

interface ProfilePost {
  id: string;
  image: string | null;
  caption: string | null;
}

function formatError(error: unknown): string {
  if (error && typeof error === 'object') {
    const details = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    const parts = [
      details.code ? `Code ${details.code}` : '',
      details.message ?? '',
      details.details ?? '',
      details.hint ?? '',
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' — ');
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);

  // Followers and following counts
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Check authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!user) {
        setRedirecting(true);
        router.replace('/login');
        return;
      }

      if (authError) {
        throw authError;
      }

      setRedirecting(false);

      // Load profile, posts, and follow counts
      const [
        profileResult,
        postsResult,
        followersResult,
        followingResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, name, avatar, bio')
          .eq('id', user.id)
          .maybeSingle(),

        supabase
          .from('posts')
          .select('id, image, caption')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id),

        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (postsResult.error) throw postsResult.error;
      if (followersResult.error) throw followersResult.error;
      if (followingResult.error) throw followingResult.error;

      if (!profileResult.data) {
        throw new Error(
          'Your profile record was not found. Please check the profiles table.'
        );
      }

      setProfile(profileResult.data as Profile);
      setPosts((postsResult.data ?? []) as ProfilePost[]);

      setFollowersCount(followersResult.count ?? 0);
      setFollowingCount(followingResult.count ?? 0);
    } catch (error: unknown) {
      const message = formatError(error);

      if (
        message.toLowerCase().includes('auth session missing') ||
        message.toLowerCase().includes('session_not_found')
      ) {
        setRedirecting(true);
        router.replace('/login');
        return;
      }

      console.error('OWN_PROFILE_ERROR:', message);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  if (loading || redirecting) {
    return (
      <AppShell>
        <main className="flex min-h-[75vh] items-center justify-center px-4">
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            {redirecting
              ? 'Redirecting to login...'
              : 'Loading your profile...'}
          </div>
        </main>
      </AppShell>
    );
  }

  if (errorMessage || !profile) {
    return (
      <AppShell>
        <main className="mx-auto max-w-xl space-y-5 px-4 py-16 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />

          <h1 className="text-xl font-bold">
            Unable to Load Profile
          </h1>

          <p className="text-sm text-neutral-500">
            {errorMessage || 'Your profile could not be loaded.'}
          </p>

          <button
            type="button"
            onClick={() => void fetchProfile()}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">

        {/* PROFILE HEADER */}
        <section className="flex flex-col items-center gap-6 rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 sm:flex-row sm:items-start">

          {/* AVATAR */}
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username || 'Profile picture'}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound className="h-12 w-12 text-neutral-400" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">

            {/* USERNAME AND EDIT BUTTON */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <h1 className="break-all text-2xl font-bold">
                @{profile.username || 'unknown'}
              </h1>

              <button
                type="button"
                onClick={() => router.push('/settings')}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
            </div>

            {/* POSTS / FOLLOWERS / FOLLOWING */}
            <div className="flex flex-wrap justify-center gap-6 text-sm sm:justify-start">
              <div>
                <strong>{posts.length}</strong> posts
              </div>

              <div>
                <strong>{followersCount}</strong> followers
              </div>

              <div>
                <strong>{followingCount}</strong> following
              </div>
            </div>

            {/* DISPLAY NAME AND BIO */}
            <div>
              {profile.name && (
                <h2 className="font-semibold">
                  {profile.name}
                </h2>
              )}

              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-500">
                {profile.bio || 'No bio provided.'}
              </p>
            </div>

          </div>
        </section>

        {/* POSTS GRID */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 text-sm font-semibold uppercase tracking-wider dark:border-neutral-800">
            <Grid3X3 className="h-4 w-4" />
            Posts
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-12 text-center dark:border-neutral-800">
              <Grid3X3 className="mx-auto mb-3 h-10 w-10 text-neutral-400" />

              <p className="text-sm text-neutral-500">
                You haven&apos;t posted anything yet.
              </p>

              <button
                type="button"
                onClick={() => router.push('/create')}
                className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create Your First Post
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => router.push(`/#${post.id}`)}
                  aria-label={
                    post.caption
                      ? `View post: ${post.caption}`
                      : 'View post'
                  }
                  className="aspect-square overflow-hidden rounded-xl bg-neutral-100 transition-opacity hover:opacity-80 dark:bg-neutral-900"
                >
                  {post.image ? (
                    <img
                      src={post.image}
                      alt={post.caption || 'Your post'}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Grid3X3 className="h-8 w-8 text-neutral-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

      </main>
    </AppShell>
  );
}
