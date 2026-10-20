
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';

import type { User as SupabaseUser } from '@supabase/supabase-js';

import {
  Home,
  Clapperboard,
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
  external?: boolean;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // AUTHENTICATION AND ROLE CHECK
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

  // DESKTOP NAVIGATION
  const desktopNavItems = useMemo<NavigationItem[]>(() => {
    const items: NavigationItem[] = [
      { href: '/', label: 'Home', icon: Home },
      { href: 'https://watch.primeflix4all.site', label: 'Movies', icon: Clapperboard, external: true },
      { href: '/search', label: 'Search', icon: Search },
      { href: '/messages', label: 'Messages', icon: MessageCircle },
      { href: '/notifications', label: 'Notifications', icon: Heart },
      { href: '/create', label: 'Create', icon: PlusSquare },
    ];

    if (user) {
      items.push(
        { href: '/profile', label: 'Profile', icon: User },
        { href: '/settings', label: 'Settings', icon: Settings }
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

  // MOBILE NAVIGATION
  const mobileNavItems = useMemo<NavigationItem[]>(() => {
    if (user) {
      return [
        { href: '/', label: 'Home', icon: Home },
      { href: 'https://watch.primeflix4all.site', label: 'Movies', icon: Clapperboard, external: true },
        { href: '/search', label: 'Search', icon: Search },
        { href: '/create', label: 'Create', icon: PlusSquare },
        { href: '/messages', label: 'Messages', icon: MessageCircle },
        { href: '/profile', label: 'Profile', icon: User },
      ];
    }

    return [
      { href: '/', label: 'Home', icon: Home },
      { href: 'https://watch.primeflix4all.site', label: 'Movies', icon: Clapperboard, external: true },
      { href: '/search', label: 'Search', icon: Search },
      { href: '/login', label: 'Sign In', icon: LogIn },
    ];
  }, [user]);

  // MOBILE MORE MENU
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
    if (href.startsWith('https://')) return false;
    if (href === '/') {
      return pathname === '/';
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="flex min-h-screen bg-white text-neutral-900 dark:bg-black dark:text-neutral-100">

      {/* DESKTOP FLOATING SIDEBAR */}
      <aside
        className="
          sticky top-4 ml-4 mb-4
          hidden h-[calc(100vh-2rem)] w-72 shrink-0
          select-none flex-col
          rounded-[28px]
          border border-neutral-200
          bg-white
          p-6
          shadow-xl
          dark:border-neutral-800
          dark:bg-neutral-950
          md:flex
        "
      >
        <Link
          href="/"
          className="mb-8 flex items-center gap-3 rounded-xl"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-md">
            S
          </div>

          <span className="text-2xl font-bold tracking-tight">
            PHWeb
          </span>
        </Link>

        <nav
          aria-label="Desktop Navigation"
          className="flex-1 space-y-2 overflow-y-auto"
        >
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);

            return (
              <Link
                key={item.href}
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  flex min-h-14 items-center gap-4
                  rounded-2xl px-4 py-3
                  text-sm font-medium
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-blue-50 font-semibold text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white'
                  }
                `}
              >
                <Icon className="h-6 w-6 shrink-0" />

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-200 pt-4 text-center text-xs text-neutral-400 dark:border-neutral-800">
          PHWeb
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1 pb-32 md:pb-0">
        {children}
      </main>

      {/* MOBILE MORE MENU */}
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close additional navigation"
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMoreOpen(false)}
          />

          <div
            className="
              fixed inset-x-3 bottom-28 z-50
              rounded-[24px]
              border border-neutral-200
              bg-white p-3 shadow-xl
              dark:border-neutral-800
              dark:bg-neutral-950
              md:hidden
            "
          >
            <div className="mb-2 flex items-center justify-between px-2 py-1">
              <h2 className="font-semibold">More</h2>

              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
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
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`
                      flex items-center gap-3
                      rounded-2xl px-4 py-3
                      text-sm font-medium
                      ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950'
                          : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900'
                      }
                    `}
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

      {/* MOBILE FLOATING BOTTOM NAVIGATION */}
      <nav
        aria-label="Mobile Navigation"
        className="
          fixed bottom-4 left-3 right-3 z-50
          flex min-h-20 items-center justify-around
          rounded-[28px]
          border border-neutral-200
          bg-white/95
          px-3 py-2
          shadow-xl backdrop-blur-lg
          dark:border-neutral-800
          dark:bg-neutral-950/95
          md:hidden
        "
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveRoute(item.href);

          return (
            <Link
              key={item.href}
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`
                flex min-w-0 flex-1 flex-col
                items-center justify-center gap-1
                rounded-2xl px-1 py-3
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                }
              `}
            >
              <Icon
                className="h-6 w-6"
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span className="text-[10px] font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-label="More navigation options"
          aria-expanded={moreOpen}
          className={`
            flex min-w-0 flex-1 flex-col
            items-center justify-center gap-1
            rounded-2xl px-1 py-3
            transition-all duration-200
            ${
              moreOpen
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }
          `}
        >
          <MoreHorizontal
            className="h-6 w-6"
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
