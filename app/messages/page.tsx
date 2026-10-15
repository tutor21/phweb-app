
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import AdSenseInFeed from '@/app/components/AdSenseInFeed';
import {
  MessageCircle,
  Plus,
  Search,
  User,
  RefreshCw,
  X,
} from 'lucide-react';

type Profile = {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
};

type Conversation = {
  id: string;
  updated_at: string;
  other: Profile | null;
  preview: string | null;
};

type Member = {
  conversation_id: string;
  user_id: string;
};

function errorText(value: unknown): string {
  if (value instanceof Error) return value.message;

  if (
    value &&
    typeof value === 'object' &&
    'message' in value
  ) {
    return String(value.message);
  }

  return 'Something went wrong.';
}

export default function MessagesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!auth.user) {
        router.replace('/login');
        return;
      }

      const me = auth.user.id;
      setUserId(me);

      const { data: myRows, error: myError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', me);

      if (myError) throw myError;

      const ids = (myRows ?? []).map(
        (row: { conversation_id: string }) => row.conversation_id
      );

      if (ids.length === 0) {
        setConversations([]);
        return;
      }

      const [convResult, memberResult, latestResult] =
        await Promise.all([
          supabase
            .from('conversations')
            .select('id, updated_at')
            .in('id', ids)
            .order('updated_at', { ascending: false }),

          supabase
            .from('conversation_members')
            .select('conversation_id, user_id')
            .in('conversation_id', ids),

          supabase
            .from('messages')
            .select('conversation_id, text, created_at')
            .in('conversation_id', ids)
            .order('created_at', { ascending: false })
            .limit(500),
        ]);

      if (convResult.error) throw convResult.error;
      if (memberResult.error) throw memberResult.error;
      if (latestResult.error) throw latestResult.error;

      const members = (memberResult.data ?? []) as Member[];

      const otherIds = [
        ...new Set(
          members
            .filter((m) => m.user_id !== me)
            .map((m) => m.user_id)
        ),
      ];

      let profiles: Profile[] = [];

      if (otherIds.length) {
        const profileResult = await supabase
          .from('profiles')
          .select('id, username, name, avatar')
          .in('id', otherIds);

        if (profileResult.error) throw profileResult.error;

        profiles = (profileResult.data ?? []) as Profile[];
      }

      const profileMap = new Map(
        profiles.map((p) => [p.id, p])
      );

      const previews = new Map<string, string>();

      for (const msg of latestResult.data ?? []) {
        if (!previews.has(msg.conversation_id)) {
          previews.set(msg.conversation_id, msg.text);
        }
      }

      setConversations(
        (convResult.data ?? []).map((c) => {
          const otherId = members.find(
            (m) =>
              m.conversation_id === c.id &&
              m.user_id !== me
          )?.user_id;

          return {
            id: c.id,
            updated_at: c.updated_at,
            other: otherId
              ? profileMap.get(otherId) ?? null
              : null,
            preview: previews.get(c.id) ?? null,
          };
        })
      );
    } catch (err) {
      console.error('INBOX_ERROR', err);
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!modal || !userId || !query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(async () => {
      setSearching(true);

      const {
        data,
        error: searchError,
      } = await supabase
        .from('profiles')
        .select('id, username, name, avatar')
        .neq('id', userId)
        .ilike('username', `%${query.trim()}%`)
        .limit(12);

      if (!cancelled) {
        setSearching(false);

        if (searchError) {
          setError(errorText(searchError));
        } else {
          setResults((data ?? []) as Profile[]);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [modal, query, supabase, userId]);

  const startConversation = async (otherId: string) => {
    if (starting) return;

    setStarting(otherId);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'start_direct_conversation',
        { p_other_user_id: otherId }
      );

      if (rpcError) throw rpcError;

      if (typeof data !== 'string') {
        throw new Error('Conversation ID was not returned.');
      }

      router.push(`/messages/${data}`);
    } catch (err) {
      console.error('START_CHAT_ERROR', err);
      setError(errorText(err));
    } finally {
      setStarting(null);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-6 text-neutral-900 dark:text-neutral-100">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">
            Messages
          </h1>

          <button
            type="button"
            onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            New chat
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-300 p-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-neutral-500">
            <RefreshCw
              className="animate-spin"
              size={18}
            />
            Loading inbox...
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
            {conversations.length === 0 ? (
              <div className="px-6 py-16 text-center text-neutral-500">
                <MessageCircle
                  className="mx-auto mb-3"
                  size={36}
                />
                <p>
                  No conversations yet. Start a new chat.
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  type="button"
                  key={conv.id}
                  onClick={() =>
                    router.push(`/messages/${conv.id}`)
                  }
                  className="flex w-full items-center gap-3 border-b border-neutral-200 p-4 text-left last:border-b-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    {conv.other?.avatar ? (
                      <img
                        src={conv.other.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={22} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      @{conv.other?.username ?? 'user'}
                    </p>

                    <p className="truncate text-sm text-neutral-500">
                      {conv.preview ??
                        'Start the conversation'}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-neutral-400">
                    {new Date(
                      conv.updated_at
                    ).toLocaleDateString()}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => void loadInbox()}
          className="mt-4 flex items-center gap-2 text-sm text-blue-600"
        >
          <RefreshCw size={15} />
          Refresh inbox
        </button>

        {/* GOOGLE ADSENSE - BELOW THE MESSAGES SECTION */}
        {!loading && userId && (
          <section
            aria-label="Advertisement"
            className="mt-8 w-full border-t border-neutral-200 pt-6 dark:border-neutral-800"
          >
            <p className="mb-3 text-center text-xs uppercase tracking-wider text-neutral-400">
              Advertisement
            </p>

            <AdSenseInFeed />
          </section>
        )}
      </main>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModal(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="New chat"
            className="w-full max-w-md rounded-2xl bg-white p-5 text-neutral-900 shadow-xl dark:bg-neutral-950 dark:text-white"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                New message
              </h2>

              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setModal(false);
                  setQuery('');
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3 top-3 text-neutral-400"
                size={18}
              />

              <input
                autoFocus
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                placeholder="Search username"
                className="w-full rounded-xl border border-neutral-300 bg-transparent py-2.5 pl-10 pr-3 outline-none focus:border-blue-500 dark:border-neutral-700"
              />
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto">
              {searching && (
                <p className="p-3 text-sm text-neutral-500">
                  Searching...
                </p>
              )}

              {!searching &&
                query.trim() &&
                results.length === 0 && (
                  <p className="p-3 text-sm text-neutral-500">
                    No matching users
                  </p>
                )}

              {results.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  disabled={!!starting}
                  onClick={() =>
                    void startConversation(p.id)
                  }
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-900"
                >
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={18} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      @{p.username ?? 'user'}
                    </p>

                    <p className="truncate text-xs text-neutral-500">
                      {p.name ?? ''}
                    </p>
                  </div>

                  {starting === p.id && (
                    <RefreshCw
                      className="ml-auto animate-spin"
                      size={16}
                    />
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
