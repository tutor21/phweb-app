
'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';

import type { User as SupabaseUser } from '@supabase/supabase-js';

import {
  Home,
  Search,
  MessageCircle,
  Heart,
  PlusSquare,
  User,
  Settings,
  ShieldAlert,
  MoreHorizontal,
  LogIn,
  X,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname();

  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<SupabaseUser | null>(
    null
  );

  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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

  const desktopNavItems = useMemo<NavigationItem[]>(() => {
    const items: NavigationItem[] = [
      {
        href: '/',
        label: 'Home',
        icon: Home,
      },
      {
        href: '/search',
        label: 'Search',
        icon: Search,
      },
      {
        href: '/messages',
        label: 'Messages',
        icon: MessageCircle,
      },
      {
        href: '/notifications',
        label: 'Notifications',
        icon: Heart,
      },
      {
        href: '/create',
        label: 'Create',
        icon: PlusSquare,
      },
    ];

    if (user) {
      items.push(
        {
          href: '/profile',
          label: 'Profile',
          icon: User,
        },
        {
          href: '/settings',
          label: 'Settings',
          icon: Settings,
        }
      );
    }

    if (isSuperadmin) {
      items.push({
        href: '/admin',
        label: 'Superadmin',
        icon: ShieldAlert,
      });
    }

    return items;
  }, [user, isSuperadmin]);

  const mobileNavItems = useMemo<NavigationItem[]>(() => {
    if (user) {
      return [
        {
          href: '/',
          label: 'Home',
          icon: Home,
        },
        {
          href: '/search',
          label: 'Search',
          icon: Search,
        },
        {
          href: '/create',
          label: 'Create',
          icon: PlusSquare,
        },
        {
          href: '/messages',
          label: 'Messages',
          icon: MessageCircle,
        },
        {
          href: '/profile',
          label: 'Profile',
          icon: User,
        },
      ];
    }

    return [
      {
        href: '/',
        label: 'Home',
        icon: Home,
      },
      {
        href: '/search',
        label: 'Search',
        icon: Search,
      },
      {
        href: '/login',
        label: 'Sign In',
        icon: LogIn,
      },
    ];
  }, [user]);

  const moreItems = useMemo<NavigationItem[]>(() => {
    const items: NavigationItem[] = [
      {
        href: '/notifications',
        label: 'Notifications',
        icon: Heart,
      },
    ];

    if (user) {
      items.push({
        href: '/settings',
        label: 'Settings',
        icon: Settings,
      });
    }

    if (isSuperadmin) {
      items.push({
        href: '/admin',
        label: 'Superadmin',
        icon: ShieldAlert,
      });
    }

    return items;
  }, [user, isSuperadmin]);

  function isActiveRoute(href: string) {
    if (href === '/') {
      return pathname === '/';
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-neutral-900 dark:bg-black dark:text-neutral-100">

      {/* DESKTOP SIDEBAR - UNCHANGED */}

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
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  isActive ? 'page' : undefined
                }
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-100 font-semibold text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900/50'
                }`}
              >
                <Icon className="h-5 w-5" />

                <span>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT */}

      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* MOBILE TOP HEADER REMOVED */}

      {/* MOBILE MORE MENU */}

      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close additional navigation"
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMoreOpen(false)}
          />

          <div className="fixed inset-x-3 bottom-20 z-50 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-800 dark:bg-neutral-950 md:hidden">

            <div className="mb-2 flex items-center justify-between px-2 py-1">
              <h2 className="font-semibold">
                More
              </h2>

              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <X size={20} />
              </button>
            </div>

            <nav aria-label="Additional mobile navigation">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
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
        </>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}

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

        {/* MORE BUTTON */}

        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-label="More navigation options"
          aria-expanded={moreOpen}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 transition-colors ${
            moreOpen
              ? 'text-blue-600'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          <MoreHorizontal
            className="h-5 w-5"
            strokeWidth={moreOpen ? 2.5 : 2}
          />

          <span className="text-[10px] font-medium">
            More
          </span>
        </button>
      </nav>
    </div>
  );
}
