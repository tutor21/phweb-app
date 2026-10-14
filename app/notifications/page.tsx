'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { Heart, MessageCircle, UserPlus } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*, profiles:actor_id(username, avatar)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data);
      }
      setLoading(false);
    }

    fetchNotifications();
  }, [supabase]);

  return (
    <AppShell>
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold tracking-tight mb-4">Notifications</h1>

        {loading ? (
          <p className="text-sm text-neutral-500 text-center py-8">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-8">No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="flex items-center justify-between p-3 border-b border-neutral-100 dark:border-neutral-900">
              <div className="flex items-center gap-3">
                <img src={n.profiles?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                <div className="text-sm">
                  <span className="font-semibold mr-1">@{n.profiles?.username}</span>
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {n.type === 'like' && 'liked your post.'}
                    {n.type === 'comment' && 'commented on your post.'}
                    {n.type === 'follow' && 'started following you.'}
                  </span>
                </div>
              </div>
              <div className="text-neutral-400">
                {n.type === 'like' && <Heart className="w-5 h-5 text-red-500 fill-red-500" />}
                {n.type === 'comment' && <MessageCircle className="w-5 h-5" />}
                {n.type === 'follow' && <UserPlus className="w-5 h-5" />}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}