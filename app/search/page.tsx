'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { useRouter } from 'next/navigation';
import { Search, User, RefreshCw, AlertCircle } from 'lucide-react';

export default function SearchPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setUsers([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setErrorMessage(err?.message || 'Failed to search users.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    void handleSearch(val);
  };

  return (
    <AppShell>
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Search Users</h1>
          <p className="text-sm text-neutral-500">
            Find and explore creators on phweb.app.
          </p>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search by username or name..."
            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition shadow-sm"
          />
        </div>

        {errorMessage && (
          <div role="alert" className="p-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/20 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-neutral-500 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Searching...</span>
          </div>
        ) : searched && users.length === 0 ? (
          <div className="text-center py-12 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-black p-8 text-neutral-500 text-sm">
            No users found matching "{query}".
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => router.push(`/profile/${user.id}`)}
                className="flex items-center justify-between p-4 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">@{user.username}</h2>
                    <p className="text-xs text-neutral-500">{user.name}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  View Profile
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}