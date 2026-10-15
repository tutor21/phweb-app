
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
  Menu,
  X,
  LogIn,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!active) return;

      setUser(authUser);
      setIsSuperadmin(false);

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

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void checkAuth();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const navItems = useMemo(() => {
    const items = [
      { href: '/', label: 'Home', icon: Home },
      { href: '/search', label: 'Search', icon: Search },
      { href: '/messages', label: 'Messages', icon: MessageCircle },
      { href: '/notifications', label: 'Notifications', icon: Heart },
      { href: '/create', label: 'Create', icon: PlusSquare },

      ...(user
        ? [{ href: '/profile', label: 'Profile', icon: User }]
        : []),

      ...(user
        ? [{ href: '/settings', label: 'Settings', icon: Settings }]
        : []),
    ];

    if (isSuperadmin) {
      items.push({
        href: '/admin',
        label: 'Superadmin',
        icon: ShieldAlert,
      });
    }

    return items;
  }, [user, isSuperadmin]);

  const mobileNavItems = useMemo(() => {
    if (user) {
      return [
        { href: '/', label: 'Home', icon: Home },
        { href: '/search', label: 'Search', icon: Search },
        { href: '/create', label: 'Create', icon: PlusSquare },
        { href: '/messages', label: 'Messages', icon: MessageCircle },
        { href: '/profile', label: 'Profile', icon: User },
      ];
    }

    return [
      { href: '/', label: 'Home', icon: Home },
      { href: '/search', label: 'Search', icon: Search },
      { href: '/login', label: 'Sign In', icon: LogIn },
    ];
  }, [user]);

  const moreItems = useMemo(() => {
    const items = [
      { href: '/notifications', label: 'Notifications', icon: Heart },

      ...(user
        ? [{ href: '/settings', label: 'Settings', icon: Settings }]
        : []),
    ];

    if (isSuperadmin) {
      items.push({
        href: '/admin',
        label: 'Superadmin',
        icon: ShieldAlert,
      });
    }

    return items;
  }, [user, isSuperadmin]);

  const isActiveRoute = (href: string) => {
    if (href === '/') return pathname === '/';

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  return (
    <div className="flex min-h-screen bg-white text-neutral-900 dark:bg-black dark:text-neutral-100">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 select-none flex-col border-r border-neutral-200 p-6 dark:border-neutral-800 md:flex">
        <Link
          href="/"
          className="mb-8 flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            S
          </div>

          <span className="text-xl font-bold tracking-tight">
            Socials
          </span>
        </Link>

        <nav
          aria-label="Desktop Navigation"
          className="flex-1 space-y-1 overflow-y-auto"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-100 font-semibold text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900/50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-black md:hidden">
        <Link
          href="/"
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
            S
          </div>

          <span className="font-bold tracking-tight">
            Socials
          </span>
        </Link>

        <button
          type="button"
          aria-label={moreOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((value) => !value)}
          className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
        >
          {moreOpen ? (
            <X size={23} />
          ) : (
            <Menu size={23} />
          )}
        </button>
      </header>

      {/* Mobile More Menu */}
      {moreOpen && (
        <div className="fixed inset-x-0 top-14 z-40 border-b border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-950 md:hidden">
          <nav aria-label="Additional mobile navigation">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={
                    isActive ? 'page' : undefined
                  }
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950'
                      : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 flex min-h-16 items-center justify-around border-t border-neutral-200 bg-white px-1 pb-[env(safe-area-inset-bottom)] dark:border-neutral-800 dark:bg-black md:hidden"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveRoute(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={
                isActive ? 'page' : undefined
              }
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span className="text-[10px] font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
