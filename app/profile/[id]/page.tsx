'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { useParams, useRouter } from 'next/navigation';
import { User, Grid, Bookmark, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.id as string;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchProfileData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setCurrentUser(authUser);

      // If viewing own profile via ID, redirect to /profile
      if (authUser && authUser.id === userId) {
        router.replace('/profile');
        return;
      }

      // Fetch target user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setErrorMessage('User profile not found.');
        setLoading(false);
        return;
      }
      setProfileUser(profileData);

      // Fetch user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(id, username, avatar)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

      // Check follow status if logged in
      if (authUser) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', authUser.id)
          .eq('following_id', userId)
          .maybeSingle();

        setIsFollowing(!!followData);
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setErrorMessage(err?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, router]);

  useEffect(() => {
    void fetchProfileData();
  }, [fetchProfileData]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId,
          });
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      setIsFollowing(wasFollowing);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="flex items-center gap-3 text-neutral-500">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading profile...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (errorMessage || !profileUser) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold">Profile Not Found</h1>
          <p className="text-sm text-neutral-500">{errorMessage || 'The user profile does not exist.'}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shrink-0">
            {profileUser.avatar ? (
              <img src={profileUser.avatar} alt={profileUser.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                <User className="w-10 h-10" />
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h1 className="text-2xl font-bold tracking-tight">@{profileUser.username}</h1>
              <button
                type="button"
                onClick={handleToggleFollow}
                className={`px-6 py-2 rounded-xl text-sm font-semibold transition ${
                  isFollowing
                    ? 'border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>

            <div className="flex justify-center sm:justify-start gap-6 text-sm text-neutral-600 dark:text-neutral-400">
              <div><strong className="text-neutral-900 dark:text-neutral-100">{posts.length}</strong> posts</div>
            </div>

            <div>
              <h2 className="font-semibold text-sm">{profileUser.name}</h2>
              <p className="text-sm text-neutral-500 mt-1 whitespace-pre-line break-words">
                {profileUser.bio || 'No bio provided.'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            <Grid className="w-4 h-4" />
            <span>Posts</span>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-black p-8 text-neutral-500 text-sm">
              This user hasn't posted anything yet.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => router.push(`/#${post.id}`)}
                  className="aspect-square bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden cursor-pointer group relative border border-neutral-200 dark:border-neutral-800"
                >
                  <img src={post.image} alt={post.caption || 'Post'} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}