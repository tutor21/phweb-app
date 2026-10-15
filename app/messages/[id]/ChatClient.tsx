'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { ArrowLeft, RefreshCw, Send, User } from 'lucide-react';

type Profile = { id: string; username: string | null; avatar: string | null };
type Message = { id: string; conversation_id: string; sender_id: string; text: string; created_at: string };

function errorText(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (value && typeof value === 'object' && 'message' in value) return String(value.message);
  return 'Something went wrong.';
}

export default function ChatClient({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setAuthorized(false);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) {
        router.replace(`/login?next=${encodeURIComponent(`/messages/${conversationId}`)}`);
        return;
      }
      const me = auth.user.id;
      setUserId(me);

      // Membership is required before loading any conversation data.
      const { data: membership, error: membershipError } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId);
      if (membershipError) throw membershipError;
      if (!(membership ?? []).some((row: { user_id: string }) => row.user_id === me)) {
        throw new Error('Conversation not found or access denied.');
      }

      const otherId = (membership ?? []).find((row: { user_id: string }) => row.user_id !== me)?.user_id;
      if (otherId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar')
          .eq('id', otherId)
          .maybeSingle();
        if (profileError) throw profileError;
        setOther(profile as Profile | null);
      } else {
        setOther(null);
      }

      const { data, error: messagesError } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, text, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (messagesError) throw messagesError;
      setMessages((data ?? []) as Message[]);
      setAuthorized(true);
    } catch (err) {
      console.error('CHAT_LOAD_ERROR', err);
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [conversationId, router, supabase]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!authorized) return;
    const channel = supabase.channel(`dm:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => {
        const incoming = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]);
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Live updates disconnected. Refresh to check for new messages.');
        }
      });
    return () => { void supabase.removeChannel(channel); };
  }, [authorized, conversationId, supabase]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = text.trim();
    if (!content || !userId || !authorized || sending || content.length > 5000) return;
    setSending(true);
    setError('');
    try {
      const { data, error: insertError } = await supabase.from('messages')
        .insert({ conversation_id: conversationId, sender_id: userId, text: content })
        .select('id, conversation_id, sender_id, text, created_at')
        .single();
      if (insertError) throw insertError;
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as Message]);
      setText('');
    } catch (err) {
      console.error('SEND_MESSAGE_ERROR', err);
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto flex h-[calc(100dvh-5rem)] max-w-3xl flex-col border-x border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-black dark:text-white">
        <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <button type="button" onClick={() => router.push('/messages')} aria-label="Back to inbox" className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"><ArrowLeft size={20} /></button>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">{other?.avatar ? <img src={other.avatar} alt="" className="h-full w-full object-cover" /> : <User size={19} />}</div>
          <div className="min-w-0 flex-1"><h1 className="truncate font-semibold">@{other?.username ?? 'Conversation'}</h1><p className="text-xs text-neutral-500">Direct message</p></div>
          <button type="button" onClick={() => void load()} aria-label="Refresh messages" className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"><RefreshCw size={18} /></button>
        </header>
        {error && <div role="alert" className="mx-4 mt-3 rounded-lg border border-red-300 p-3 text-sm text-red-600">{error}</div>}
        <section aria-label="Messages" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? <div className="flex items-center justify-center gap-2 py-12 text-neutral-500"><RefreshCw size={18} className="animate-spin" /> Loading messages...</div> : !authorized ? <p className="py-12 text-center text-neutral-500">You cannot view this conversation.</p> : messages.length === 0 ? <p className="py-12 text-center text-neutral-500">No messages yet. Say hello!</p> : messages.map(msg => {
            const mine = msg.sender_id === userId;
            return <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm sm:max-w-[70%] ${mine ? 'bg-blue-600 text-white' : 'bg-neutral-100 dark:bg-neutral-900'}`}><p className="whitespace-pre-wrap break-words">{msg.text}</p><p className={`mt-1 text-right text-[10px] ${mine ? 'text-blue-100' : 'text-neutral-500'}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p></div></div>;
          })}
          <div ref={bottomRef} />
        </section>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
          <input value={text} onChange={e => setText(e.target.value)} maxLength={5000} disabled={!authorized || sending} placeholder="Type a message..." aria-label="Message text" className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:opacity-50 dark:border-neutral-700" />
          <button type="submit" disabled={!authorized || sending || !text.trim()} aria-label="Send message" className="rounded-xl bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-50">{sending ? <RefreshCw size={19} className="animate-spin" /> : <Send size={19} />}</button>
        </form>
      </main>
    </AppShell>
  );
}
