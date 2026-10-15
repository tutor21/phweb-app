'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import {
  Home,
  Search,
  MessageCircle,
  Heart,
  PlusSquare,
  User,
  Settings,
  ShieldAlert,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    async function checkAuth() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!active) return;
      setUser(authUser);
      if (!authUser) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (!active) return;
      if (
        roleData?.role === 'superadmin' ||
        authUser.email === 'fctutor1984@gmail.com'
      ) {
        setIsSuperadmin(true);
      }
    }
    checkAuth();
    return () => {
      active = false;
    };
  }, [supabase]);

  const navItems = useMemo(() => {
    const items = [
      { href: '/', label: 'Home', icon: Home },
      { href: '/search', label: 'Search', icon: Search },
      { href: '/messages', label: 'Messages', icon: MessageCircle },
      { href: '/notifications', label: 'Notifications', icon: Heart },
      { href: '/create', label: 'Create', icon: PlusSquare },
      ...(user ? [{ href: '/profile', label: 'Profile', icon: User }] : []),
      ...(user ? [{ href: '/settings', label: 'Settings', icon: Settings }] : []),
    ];
    if (isSuperadmin) {
      items.push({ href: '/admin', label: 'Superadmin', icon: ShieldAlert });
    }
    return items;
  }, [user, isSuperadmin]);

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-neutral-200 dark:border-neutral-800 p-6 select-none shrink-0 sticky top-0 h-screen">
        <Link href="/" className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            P
          </div>
          <span className="text-xl font-bold tracking-tight">phweb.app</span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-100 dark:bg-neutral-900 font-semibold text-neutral-900 dark:text-neutral-100'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>

      {/* Mobile Bottom Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around px-2 z-50"
      >
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-3 rounded-lg ${
                isActive ? 'text-blue-600' : 'text-neutral-500'
              }`}
            >
              <Icon className="w-6 h-6" />
            </Link>
          );
        })}
        {isSuperadmin && (
          <Link
            href="/admin"
            className={`p-3 rounded-lg ${
              pathname === '/admin' ? 'text-red-600' : 'text-neutral-500'
            }`}
          >
            <ShieldAlert className="w-6 h-6" />
          </Link>
        )}
      </nav>
    </div>
  );
}