'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { Settings, Grid, Bookmark } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const supabase = createClient();

  useEffect(() => {
    async function fetchProfileData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setProfile(profileData);
      setPosts(postsData || []);
      setLoading(false);
    }

    fetchProfileData();
  }, [supabase]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <p className="text-sm text-neutral-500">Loading profile...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-6">
          <img
            src={profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt="Avatar"
            className="w-20 h-20 rounded-full object-cover border border-neutral-200 dark:border-neutral-800"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold tracking-tight">@{profile?.username}</h1>
              <Link href="/settings" className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                <Settings className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex gap-6 text-sm">
              <span><strong>{posts.length}</strong> posts</span>
              <span><strong>0</strong> followers</span>
              <span><strong>0</strong> following</span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-sm">{profile?.name}</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{profile?.bio || 'No bio yet.'}</p>
        </div>

        <div className="flex border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 font-medium text-xs tracking-wider uppercase transition-colors ${
              activeTab === 'posts' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-neutral-400'
            }`}
          >
            <Grid className="w-4 h-4" /> Posts
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 font-medium text-xs tracking-wider uppercase transition-colors ${
              activeTab === 'saved' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-neutral-400'
            }`}
          >
            <Bookmark className="w-4 h-4" /> Saved
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <div key={post.id} className="aspect-square bg-neutral-100 dark:bg-neutral-900 overflow-hidden relative group">
              <img src={post.image} alt="Post" className="object-cover w-full h-full" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}