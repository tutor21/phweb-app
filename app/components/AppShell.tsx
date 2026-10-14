'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Compass, 
  MessageCircle, 
  Heart, 
  PlusSquare, 
  User, 
  Settings, 
  ShieldAlert, 
  Sun, 
  Moon, 
  Menu 
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

export default function AppShell({ children, isAdmin = false }: AppShellProps) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check user preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Explore', href: '/explore', icon: Compass },
    { name: 'Messages', href: '/messages', icon: MessageCircle },
    { name: 'Notifications', href: '/notifications', icon: Heart },
    { name: 'Create', href: '/create', icon: PlusSquare },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Admin Dashboard', href: '/admin', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
      
      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 border-r border-neutral-200 dark:border-neutral-800 p-4 fixed h-screen z-30 bg-white dark:bg-black">
        <div className="py-4 px-3 mb-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            phweb<span className="text-neutral-400">.app</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive 
                    ? 'font-bold bg-neutral-100 dark:bg-neutral-900' 
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-3">
          <span className="text-xs text-neutral-500">Theme</span>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* MOBILE TOP HEADER */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-30">
        <Link href="/" className="text-lg font-bold tracking-tight">
          phweb<span className="text-neutral-400">.app</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-neutral-700 dark:text-neutral-300"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <Link href="/messages" className="text-neutral-700 dark:text-neutral-300">
            <MessageCircle className="w-6 h-6" />
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 flex justify-center">
        <div className="w-full max-w-[600px] min-h-screen border-x border-neutral-200 dark:border-neutral-800">
          {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around px-2 z-30">
        <Link href="/" className={`p-3 ${pathname === '/' ? 'text-black dark:text-white' : 'text-neutral-500'}`}>
          <Home className="w-6 h-6" />
        </Link>
        <Link href="/search" className={`p-3 ${pathname === '/search' ? 'text-black dark:text-white' : 'text-neutral-500'}`}>
          <Search className="w-6 h-6" />
        </Link>
        <Link href="/create" className={`p-3 ${pathname === '/create' ? 'text-black dark:text-white' : 'text-neutral-500'}`}>
          <PlusSquare className="w-6 h-6" />
        </Link>
        <Link href="/notifications" className={`p-3 ${pathname === '/notifications' ? 'text-black dark:text-white' : 'text-neutral-500'}`}>
          <Heart className="w-6 h-6" />
        </Link>
        <Link href="/profile" className={`p-3 ${pathname === '/profile' ? 'text-black dark:text-white' : 'text-neutral-500'}`}>
          <User className="w-6 h-6" />
        </Link>
      </nav>

    </div>
  );
}