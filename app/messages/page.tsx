
'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
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
  LogIn,
  UserPlus,
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

  const [userId, setUserId] = useState<string | null>(
    null
  );

  const [isGuest, setIsGuest] = useState(false);

  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState<string | null>(
    null
  );

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      // A missing session is normal for logged-out visitors.
      // Show the guest screen instead of an error.
      if (!session) {
        setUserId(null);
        setIsGuest(true);
        setConversations([]);
        setModal(false);
        return;
      }

      if (sessionError) {
        throw sessionError;
      }

      // Verify the signed-in user.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setIsGuest(true);
        setConversations([]);
        setModal(false);
        return;
      }

      if (authError) {
        throw authError;
      }

      const me = user.id;

      setUserId(me);
      setIsGuest(false);

      const { data: myRows, error: myError } =
        await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', me);

      if (myError) throw myError;

      const ids = (myRows ?? []).map(
        (row: { conversation_id: string }) =>
          row.conversation_id
      );

      if (ids.length === 0) {
        setConversations([]);
        return;
      }

      const [
        convResult,
        memberResult,
        latestResult,
      ] = await Promise.all([
        supabase
          .from('conversations')
          .select('id, updated_at')
          .in('id', ids)
          .order('updated_at', {
            ascending: false,
          }),

        supabase
          .from('conversation_members')
          .select('conversation_id, user_id')
          .in('conversation_id', ids),

        supabase
          .from('messages')
          .select(
            'conversation_id, text, created_at'
          )
          .in('conversation_id', ids)
          .order('created_at', {
            ascending: false,
          })
          .limit(500),
      ]);

      if (convResult.error) throw convResult.error;
      if (memberResult.error) throw memberResult.error;
      if (latestResult.error) throw latestResult.error;

      const members = (memberResult.data ??
        []) as Member[];

      const otherIds = [
        ...new Set(
          members
            .filter((m) => m.user_id !== me)
            .map((m) => m.user_id)
        ),
      ];

      let profiles: Profile[] = [];

      if (otherIds.length > 0) {
        const profileResult = await supabase
          .from('profiles')
          .select('id, username, name, avatar')
          .in('id', otherIds);

        if (profileResult.error) {
          throw profileResult.error;
        }

        profiles = (profileResult.data ??
          []) as Profile[];
      }

      const profileMap = new Map(
        profiles.map((p) => [p.id, p])
      );

      const previews = new Map<string, string>();

      for (const msg of latestResult.data ?? []) {
        if (!previews.has(msg.conversation_id)) {
          previews.set(
            msg.conversation_id,
            msg.text ?? ''
          );
        }
      }

      const updatedConversations: Conversation[] = (
        convResult.data ?? []
      ).map((c) => {
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
      });

      setConversations(updatedConversations);
    } catch (err) {
      const message = errorText(err);

      // Don't expose missing-session errors to guests.
      if (
        message.toLowerCase().includes(
          'auth session missing'
        ) ||
        message.toLowerCase().includes(
          'session_not_found'
        )
      ) {
        setUserId(null);
        setIsGuest(true);
        setConversations([]);
        setModal(false);
      } else {
        console.error('INBOX_ERROR', err);
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  // Keep the page updated when users sign in or out.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          setUserId(null);
          setIsGuest(true);
          setConversations([]);
          setModal(false);
          setError('');
          setLoading(false);
        }

        if (event === 'SIGNED_IN') {
          void loadInbox();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadInbox]);

  // Search registered users when starting a new chat.
  useEffect(() => {
    if (
      !modal ||
      !userId ||
      !query.trim()
    ) {
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
        .ilike(
          'username',
          `%${query.trim()}%`
        )
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

  const startConversation = async (
    otherId: string
  ) => {
    if (starting || !userId) return;

    setStarting(otherId);
    setError('');

    try {
      const { data, error: rpcError } =
        await supabase.rpc(
          'start_direct_conversation',
          {
            p_other_user_id: otherId,
          }
        );

      if (rpcError) throw rpcError;

      if (typeof data !== 'string') {
        throw new Error(
          'Conversation ID was not returned.'
        );
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
        {/* GUEST VIEW */}
        {!loading && isGuest ? (
          <section className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/30">
              <MessageCircle
                size={40}
                className="text-blue-600"
              />
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Connect with people on Socials
            </h1>

            <p className="mt-4 max-w-md text-sm leading-7 text-neutral-500 sm:text-base">
              Log in or create a free account to
              send private messages, start
              conversations, and connect with
              other members of Socials.
            </p>

            <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                <LogIn size={18} />
                Log In
              </Link>

              <Link
                href="/register"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-300 px-6 py-3 font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                <UserPlus size={18} />
                Sign Up
              </Link>
            </div>

            <Link
              href="/"
              className="mt-6 text-sm font-medium text-neutral-500 hover:text-blue-600"
            >
              Continue browsing Socials
            </Link>
          </section>
        ) : (
          <>
            {/* HEADER */}
            <div className="mb-6 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold">
                Messages
              </h1>

              {userId && (
                <button
                  type="button"
                  onClick={() => setModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={18} />
                  New chat
                </button>
              )}
            </div>

            {/* ERRORS */}
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-300 p-3 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            {/* INBOX */}
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
                      No conversations yet. Start a
                      new chat.
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      type="button"
                      key={conv.id}
                      onClick={() =>
                        router.push(
                          `/messages/${conv.id}`
                        )
                      }
                      className="flex w-full items-center gap-3 border-b border-neutral-200 p-4 text-left last:border-b-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        {conv.other?.avatar ? (
                          <img
                            src={
                              conv.other.avatar
                            }
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User size={22} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          @
                          {conv.other
                            ?.username ?? 'user'}
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

            {/* REFRESH */}
            {!loading && userId && (
              <button
                type="button"
                onClick={() =>
                  void loadInbox()
                }
                className="mt-4 flex items-center gap-2 text-sm text-blue-600"
              >
                <RefreshCw size={15} />
                Refresh inbox
              </button>
            )}

            {/* GOOGLE ADSENSE */}
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
          </>
        )}
      </main>

      {/* NEW CHAT MODAL */}
      {modal && userId && !isGuest && (
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
