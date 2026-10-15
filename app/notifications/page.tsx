
'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';

import {
  Heart,
  MessageCircle,
  UserPlus,
  Bell,
  CheckCheck,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ActorProfile {
  username: string | null;
  avatar: string | null;
}

interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  post_id: string | null;
  type: string;
  created_at: string;
  is_read: boolean;
  profiles: ActorProfile | null;
}

// Supabase may return related profiles as an array.
interface NotificationRow {
  id: string;
  user_id: string;
  actor_id: string | null;
  post_id: string | null;
  type: string;
  created_at: string;
  is_read: boolean | null;
  profiles: ActorProfile | ActorProfile[] | null;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

// Convert Supabase relationship results into a consistent shape.
function normalizeNotifications(
  rows: NotificationRow[]
): Notification[] {
  return rows.map((notification) => ({
    id: notification.id,
    user_id: notification.user_id,
    actor_id: notification.actor_id,
    post_id: notification.post_id,
    type: notification.type,
    created_at: notification.created_at,
    is_read: notification.is_read ?? false,
    profiles: Array.isArray(notification.profiles)
      ? notification.profiles[0] ?? null
      : notification.profiles,
  }));
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

  return 'Unable to load notifications.';
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const difference = Math.max(
    0,
    Date.now() - date.getTime()
  );

  if (difference < 60_000) {
    return 'Just now';
  }

  const minutes = Math.floor(difference / 60_000);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

function getNotificationText(type: string): string {
  switch (type) {
    case 'like':
      return 'liked your post.';

    case 'comment':
      return 'commented on your post.';

    case 'follow':
      return 'started following you.';

    default:
      return 'interacted with your account.';
  }
}

function NotificationIcon({
  type,
}: {
  type: string;
}) {
  switch (type) {
    case 'like':
      return (
        <Heart className="h-5 w-5 fill-red-500 text-red-500" />
      );

    case 'comment':
      return (
        <MessageCircle className="h-5 w-5 text-blue-500" />
      );

    case 'follow':
      return (
        <UserPlus className="h-5 w-5 text-green-500" />
      );

    default:
      return (
        <Bell className="h-5 w-5 text-neutral-500" />
      );
  }
}

export default function NotificationsPage() {
  const router = useRouter();

  // Keep the Supabase client stable across renders.
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [userId, setUserId] = useState<string | null>(
    null
  );

  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const [openingId, setOpeningId] = useState<
    string | null
  >(null);

  const [errorMessage, setErrorMessage] = useState('');

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  // Load notifications from Supabase.
  const fetchNotifications = useCallback(
    async (authenticatedUserId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .select(
          'id, user_id, actor_id, post_id, type, created_at, is_read, profiles:actor_id(username, avatar)'
        )
        .eq('user_id', authenticatedUserId)
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const normalized = normalizeNotifications(
        (data ?? []) as NotificationRow[]
      );

      setNotifications(normalized);
    },
    [supabase]
  );

  // Check authentication and load initial notifications.
  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      setErrorMessage('');

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError) {
          throw authError;
        }

        if (!user) {
          setUserId(null);
          setNotifications([]);
          router.replace('/login');
          return;
        }

        setUserId(user.id);

        const { data, error } = await supabase
          .from('notifications')
          .select(
            'id, user_id, actor_id, post_id, type, created_at, is_read, profiles:actor_id(username, avatar)'
          )
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        if (active) {
          const normalized = normalizeNotifications(
            (data ?? []) as NotificationRow[]
          );

          setNotifications(normalized);
        }
      } catch (error: unknown) {
        console.error(
          'NOTIFICATIONS_LOAD_ERROR',
          error
        );

        if (active) {
          setErrorMessage(
            getErrorMessage(error)
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [supabase, router]);

  // Listen for new notifications in real time.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchNotifications(userId).catch(
            (error: unknown) => {
              console.error(
                'NOTIFICATIONS_REALTIME_ERROR',
                error
              );
            }
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    supabase,
    userId,
    fetchNotifications,
  ]);

  // Refresh notifications manually.
  async function handleRefresh() {
    if (!userId || refreshing) {
      return;
    }

    setRefreshing(true);
    setErrorMessage('');

    try {
      await fetchNotifications(userId);
    } catch (error: unknown) {
      console.error(
        'NOTIFICATIONS_REFRESH_ERROR',
        error
      );

      setErrorMessage(
        getErrorMessage(error)
      );
    } finally {
      setRefreshing(false);
    }
  }

  // Open a notification and mark it as read.
  async function handleNotificationClick(
    notification: Notification
  ) {
    if (!userId || openingId) {
      return;
    }

    setOpeningId(notification.id);
    setErrorMessage('');

    try {
      if (!notification.is_read) {
        const { error } = await supabase
          .from('notifications')
          .update({
            is_read: true,
          })
          .eq('id', notification.id)
          .eq('user_id', userId);

        if (error) {
          throw error;
        }

        setNotifications((previous) =>
          previous.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  is_read: true,
                }
              : item
          )
        );
      }

      // Open the relevant post on the homepage.
      if (
        (notification.type === 'like' ||
          notification.type === 'comment') &&
        notification.post_id
      ) {
        router.push(
          `/#${notification.post_id}`
        );
      } else if (
        notification.type === 'follow' &&
        notification.actor_id
      ) {
        router.push(
          `/profile/${notification.actor_id}`
        );
      } else if (notification.post_id) {
        router.push(
          `/#${notification.post_id}`
        );
      }
    } catch (error: unknown) {
      console.error(
        'NOTIFICATION_OPEN_ERROR',
        error
      );

      setErrorMessage(
        getErrorMessage(error)
      );
    } finally {
      setOpeningId(null);
    }
  }

  // Mark all notifications as read.
  async function handleMarkAllRead() {
    if (
      !userId ||
      markingAll ||
      unreadCount === 0
    ) {
      return;
    }

    setMarkingAll(true);
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        throw error;
      }

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (error: unknown) {
      console.error(
        'MARK_ALL_READ_ERROR',
        error
      );

      setErrorMessage(
        getErrorMessage(error)
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 text-neutral-900 dark:text-neutral-100">
        {/* PAGE HEADER */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Notifications
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              {unreadCount > 0
                ? `${unreadCount} unread ${
                    unreadCount === 1
                      ? 'notification'
                      : 'notifications'
                  }`
                : 'Stay updated with your activity.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleRefresh()
            }
            disabled={
              !userId ||
              loading ||
              refreshing
            }
            aria-label="Refresh notifications"
            title="Refresh notifications"
            className="rounded-xl border border-neutral-200 p-2.5 text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <RefreshCw
              className={`h-5 w-5 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>
        </div>

        {/* MARK ALL AS READ */}
        {!loading && unreadCount > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                void handleMarkAllRead()
              }
              disabled={markingAll}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-950/30"
            >
              {markingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}

              Mark all as read
            </button>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading notifications...
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading &&
          !errorMessage &&
          notifications.length === 0 && (
            <div className="rounded-2xl border border-neutral-200 px-6 py-14 text-center dark:border-neutral-800">
              <Bell className="mx-auto mb-4 h-10 w-10 text-neutral-400" />

              <h2 className="text-lg font-semibold">
                No notifications yet
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                When someone likes, comments on, or
                interacts with your posts, notifications
                will appear here.
              </p>

              <Link
                href="/"
                className="mt-5 inline-block text-sm font-semibold text-blue-600 hover:underline"
              >
                Back to Home
              </Link>
            </div>
          )}

        {/* NOTIFICATION LIST */}
        {!loading &&
          notifications.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
              {notifications.map(
                (notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() =>
                      void handleNotificationClick(
                        notification
                      )
                    }
                    disabled={
                      openingId !== null
                    }
                    className={`flex w-full items-center gap-3 border-b border-neutral-100 p-4 text-left transition last:border-b-0 hover:bg-neutral-50 disabled:opacity-70 dark:border-neutral-800 dark:hover:bg-neutral-900 ${
                      !notification.is_read
                        ? 'bg-blue-50/70 dark:bg-blue-950/20'
                        : ''
                    }`}
                  >
                    {/* AVATAR */}
                    <img
                      src={
                        notification.profiles
                          ?.avatar ||
                        DEFAULT_AVATAR
                      }
                      alt="User avatar"
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />

                    {/* CONTENT */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed">
                        <span className="font-semibold">
                          @
                          {notification
                            .profiles
                            ?.username ||
                            'user'}
                        </span>{' '}

                        <span className="text-neutral-600 dark:text-neutral-300">
                          {getNotificationText(
                            notification.type
                          )}
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-neutral-400">
                        {formatTime(
                          notification.created_at
                        )}
                      </p>
                    </div>

                    {/* ICON AND UNREAD DOT */}
                    <div className="flex shrink-0 items-center gap-2">
                      <NotificationIcon
                        type={
                          notification.type
                        }
                      />

                      {!notification.is_read && (
                        <span
                          aria-label="Unread"
                          className="h-2.5 w-2.5 rounded-full bg-blue-600"
                        />
                      )}

                      {openingId ===
                        notification.id && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </button>
                )
              )}
            </div>
          )}
      </main>
    </AppShell>
  );
}
