'use client';

import React, { useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { Search as SearchIcon, Loader2 } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
      .limit(10);

    if (!error && data) {
      setResults(data);
    }
    setLoading(false);
  };

  return (
    <AppShell>
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold tracking-tight mb-2">Search Users</h1>

        <div className="relative">
          <SearchIcon className="w-5 h-5 absolute left-3.5 top-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search username or name..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
          />
        </div>

        {loading && (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        )}

        <div className="space-y-2">
          {results.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
              <div className="flex items-center gap-3">
                <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-800" />
                <div>
                  <p className="font-semibold text-sm">@{user.username}</p>
                  <p className="text-xs text-neutral-500">{user.name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}