'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Grid3X3, RefreshCw, AlertCircle, ArrowLeft, MessageCircle } from 'lucide-react';
import AppShell from '@/app/components/AppShell';
import { createClient } from '@/app/utils/supabase/client';

interface UserProfileClientProps { userId: string }
interface Profile { id: string; username: string | null; name: string | null; avatar: string | null; bio: string | null }
interface ProfilePost { id: string; image: string | null; caption: string | null }

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { code?: string; message?: string; details?: string; hint?: string };
    const parts = [e.code ? `Code ${e.code}` : '', e.message ?? '', e.details ?? '', e.hint ?? ''].filter(Boolean);
    if (parts.length) return parts.join(' — ');
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

export default function UserProfileClient({ userId }: UserProfileClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [followError, setFollowError] = useState('');
  const [messageError, setMessageError] = useState('');

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    setProfileUser(null);
    setPosts([]);
    setFollowersCount(0);
    setFollowingCount(0);
    setIsFollowing(false);

    try {
      if (!userId) throw new Error('Invalid user profile ID.');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      // A missing session is okay when viewing a public profile.
      if (authError && user) throw authError;
      setCurrentUserId(user?.id ?? null);
      if (user?.id === userId) {
        router.replace('/profile');
        return;
      }

      const [profileResult, postsResult, followersResult, followingResult] = await Promise.all([
        supabase.from('profiles').select('id, username, name, avatar, bio').eq('id', userId).maybeSingle(),
        supabase.from('posts').select('id, image, caption').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (postsResult.error) throw postsResult.error;
      if (followersResult.error) throw followersResult.error;
      if (followingResult.error) throw followingResult.error;
      if (!profileResult.data) throw new Error('User profile not found.');
      setProfileUser(profileResult.data as Profile);
      setPosts((postsResult.data ?? []) as ProfilePost[]);
      setFollowersCount(followersResult.count ?? 0);
      setFollowingCount(followingResult.count ?? 0);

      if (user) {
        const { data: followData, error: followQueryError } = await supabase
          .from('follows').select('follower_id')
          .eq('follower_id', user.id).eq('following_id', userId).maybeSingle();
        if (followQueryError) throw followQueryError;
        setIsFollowing(Boolean(followData));
      }
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, router]);

  useEffect(() => { void fetchProfileData(); }, [fetchProfileData]);

  const handleToggleFollow = async () => {
    if (!currentUserId) { router.push('/login'); return; }
    if (followLoading || currentUserId === userId) return;
    setFollowLoading(true);
    setFollowError('');
    try {
      // Reverify the signed-in user before changing their follow relationship.
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== currentUserId) {
        router.push('/login');
        return;
      }
      if (isFollowing) {
        const { error } = await supabase.from('follows').delete()
          .eq('follower_id', user.id).eq('following_id', userId);
        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount(count => Math.max(0, count - 1));
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: userId,
        });
        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount(count => count + 1);
      }
    } catch (error: unknown) {
      setFollowError(getErrorMessage(error));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (messageLoading) return;
    setMessageError('');
    setMessageLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.push('/login'); return; }
      if (user.id === userId) { router.push('/profile'); return; }
      const { data: conversationId, error } = await supabase.rpc('start_direct_conversation', {
        p_other_user_id: userId,
      });
      if (error) throw error;
      if (typeof conversationId !== 'string' || !conversationId) {
        throw new Error('Unable to open this conversation.');
      }
      router.push(`/messages/${conversationId}`);
    } catch (error: unknown) {
      setMessageError(getErrorMessage(error));
    } finally {
      setMessageLoading(false);
    }
  };

  if (loading) return (
    <AppShell>
      <main className="flex min-h-[80vh] items-center justify-center gap-3 text-neutral-500">
        <RefreshCw className="h-5 w-5 animate-spin" /> Loading profile...
      </main>
    </AppShell>
  );

  if (errorMessage || !profileUser) return (
    <AppShell>
      <main className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="text-xl font-bold">Unable to Load Profile</h1>
        <p className="text-sm text-neutral-500">{errorMessage || 'Profile not found.'}</p>
        <button type="button" onClick={() => void fetchProfileData()}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Retry</button>
      </main>
    </AppShell>
  );

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">
        <button type="button" onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-neutral-500">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <section className="flex flex-col items-center gap-6 rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 sm:flex-row sm:items-start">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
            {profileUser.avatar ? (
              <img src={profileUser.avatar} alt={profileUser.username || 'User'} className="h-full w-full object-cover" />
            ) : <User className="h-12 w-12 text-neutral-400" />}
          </div>

          <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
            <h1 className="break-all text-2xl font-bold">@{profileUser.username || 'unknown'}</h1>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <button type="button" onClick={() => void handleToggleFollow()} disabled={followLoading}
                className={`rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-50 ${isFollowing
                  ? 'border border-neutral-300 dark:border-neutral-700'
                  : 'bg-blue-600 text-white'}`}>
                {followLoading ? 'Updating...' : isFollowing ? 'Following' : 'Follow'}
              </button>
              <button type="button" onClick={() => void handleSendMessage()} disabled={messageLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-5 py-2 text-sm font-semibold disabled:opacity-50 dark:border-neutral-700">
                <MessageCircle className="h-4 w-4" />
                {messageLoading ? 'Opening chat...' : 'Send Message'}
              </button>
            </div>
            {followError && <p role="alert" className="text-sm text-red-600">{followError}</p>}
            {messageError && <p role="alert" className="text-sm text-red-600">{messageError}</p>}

            <div className="flex flex-wrap justify-center gap-6 text-sm sm:justify-start">
              <span><strong>{posts.length}</strong> posts</span>
              <span><strong>{followersCount}</strong> followers</span>
              <span><strong>{followingCount}</strong> following</span>
            </div>
            <div>
              {profileUser.name && <h2 className="font-semibold">{profileUser.name}</h2>}
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-500">
                {profileUser.bio || 'No bio provided.'}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 text-sm font-semibold uppercase tracking-wider dark:border-neutral-800">
            <Grid3X3 className="h-4 w-4" /> Posts
          </div>
          {posts.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-500">This user hasn&apos;t posted anything yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {posts.map(post => (
                <button key={post.id} type="button" onClick={() => router.push(`/#${post.id}`)}
                  className="aspect-square overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
                  {post.image ? (
                    <img src={post.image} alt={post.caption || 'Post'} loading="lazy" className="h-full w-full object-cover" />
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
