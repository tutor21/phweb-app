
'use client';

import React, { useMemo, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) throw loginError;

      if (!data.user || !data.session) {
        throw new Error(
          'Login succeeded but no authentication session was returned.'
        );
      }

      // Verify that Supabase can retrieve the authenticated user.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error(
          'Unable to verify your authentication session.'
        );
      }

      // Navigate only after authentication has been verified.
      router.replace('/profile');
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to sign in. Please try again.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-black">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-neutral-200 p-8 shadow-sm dark:border-neutral-800">

        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white">
            P
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back to phweb.app
          </h1>

          <p className="text-sm text-neutral-500">
            Sign in to your account to continue
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/20"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">

          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500"
            >
              Email
            </label>

            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-neutral-400" />

              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-11 pr-4 text-sm transition focus:border-blue-500 focus:outline-none disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500"
            >
              Password
            </label>

            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-neutral-400" />

              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-11 pr-4 text-sm transition focus:border-blue-500 focus:outline-none disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        <div className="text-center text-sm text-neutral-500">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-blue-600 hover:underline"
          >
            Sign up
          </Link>
        </div>

      </div>
    </div>
  );
}
