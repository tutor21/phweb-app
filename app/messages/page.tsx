'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { Send } from 'lucide-react';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function initChat() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from('conversation_members')
        .select('conversation_id, conversations(*)')
        .eq('user_id', user.id);

      if (data) setConversations(data);
    }

    initChat();
  }, [supabase]);

  useEffect(() => {
    if (!activeChat) return;

    async function fetchMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeChat)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
    }

    fetchMessages();

    // Real-time subscription for new messages
    const channel = supabase
      .channel(`chat:${activeChat}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeChat}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat, supabase]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;

    await supabase.from('messages').insert({
      conversation_id: activeChat,
      sender_id: currentUserId,
      text: text.trim(),
    });

    setText('');
  };

  return (
    <AppShell>
      <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row">
        {/* Chat List */}
        <div className={`w-full md:w-1/3 border-r border-neutral-200 dark:border-neutral-800 p-4 overflow-y-auto ${activeChat ? 'hidden md:block' : 'block'}`}>
          <h1 className="text-xl font-bold mb-4 tracking-tight">Messages</h1>
          {conversations.length === 0 ? (
            <p className="text-sm text-neutral-500">No active conversations.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.conversation_id}
                onClick={() => setActiveChat(c.conversation_id)}
                className={`p-3 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors ${activeChat === c.conversation_id ? 'bg-neutral-100 dark:bg-neutral-900' : ''}`}
              >
                <p className="font-semibold text-sm">Conversation #{c.conversation_id.slice(0, 6)}</p>
              </div>
            ))
          )}
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
          {activeChat ? (
            <>
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <button onClick={() => setActiveChat(null)} className="md:hidden text-sm font-semibold">← Back</button>
                <span className="font-semibold text-sm">Chat</span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-2xl text-sm max-w-xs ${m.sender_id === currentUserId ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-neutral-100 dark:bg-neutral-900'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm focus:outline-none"
                />
                <button type="submit" className="p-2 rounded-xl bg-black dark:bg-white text-white dark:text-black">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
              Select a conversation to start messaging.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}