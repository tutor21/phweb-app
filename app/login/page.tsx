
'use client';

import {
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createClient } from '@/app/utils/supabase/client';

import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setErrorMessage('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !password) {
        setErrorMessage(
          'Please enter your email and password.'
        );
        return;
      }

      const { error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        const message = error.message.toLowerCase();

        if (message.includes('invalid login credentials')) {
          setErrorMessage(
            'Incorrect email or password. Please try again.'
          );
        } else if (message.includes('email not confirmed')) {
          setErrorMessage(
            'Please verify your email address before logging in.'
          );
        } else {
          setErrorMessage(error.message);
        }

        return;
      }

      router.replace('/');
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT: SOCIALS BRANDING */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">

          {/* LOGO */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl font-black text-blue-700">
              S
            </div>

            <span className="text-3xl font-extrabold tracking-tight">
              Socials
            </span>
          </div>

          {/* BRAND MESSAGE */}
          <div className="relative z-10 max-w-lg">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
              <MessageCircle size={40} />
            </div>

            <h1 className="text-5xl font-extrabold leading-tight">
              Your world.
              <br />
              Your community.
              <br />
              Your Socials.
            </h1>

            <p className="mt-6 max-w-md text-lg leading-8 text-blue-100">
              Connect with friends, share your moments,
              discover conversations, and be part of a
              growing community.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">

              {/* CONNECT CARD */}
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                <Users className="mb-3" size={25} />

                <h3 className="font-bold">
                  Connect
                </h3>

                <p className="mt-2 text-sm text-blue-100">
                  Meet people and build meaningful connections.
                </p>
              </div>

              {/* SECURITY CARD */}
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                <ShieldCheck className="mb-3" size={25} />

                <h3 className="font-bold">
                  Your account
                </h3>

                <p className="mt-2 text-sm text-blue-100">
                  Sign in securely and manage your profile.
                </p>
              </div>
            </div>
          </div>

          {/* STATIC COPYRIGHT YEAR: NEXT.JS 16 SAFE */}
          <p className="relative z-10 text-sm text-blue-100">
            © 2026 Socials. All rights reserved.
          </p>

          {/* BACKGROUND DECORATION */}
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
        </section>

        {/* RIGHT: LOGIN FORM */}
        <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8 lg:px-14">
          <div className="w-full max-w-md">

            {/* MOBILE LOGO */}
            <Link
              href="/"
              className="mb-9 flex items-center justify-center gap-3 lg:hidden"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white">
                S
              </div>

              <span className="text-3xl font-extrabold">
                Socials
              </span>
            </Link>

            {/* LOGIN HEADING */}
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Welcome back
              </h2>

              <p className="mt-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                Log in to your Socials account to continue
                connecting with your community.
              </p>
            </div>

            {/* LOGIN FORM */}
            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >

              {/* EMAIL FIELD */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  />

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </div>
              </div>

              {/* PASSWORD FIELD */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-12 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
                  />

                  {/* SHOW / HIDE PASSWORD */}
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    aria-pressed={showPassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 transition hover:text-blue-600"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>

                {/* FORGOT PASSWORD LINK */}
                <div className="mt-3 flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline dark:text-blue-400"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* ERROR MESSAGE */}
              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                >
                  {errorMessage}
                </div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />
                    Logging in...
                  </>
                ) : (
                  <>
                    Log In
                    <ArrowRight size={19} />
                  </>
                )}
              </button>
            </form>

            {/* SIGN UP LINK */}
            <div className="mt-8 text-center">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Don't have an account?{' '}
                <Link
                  href="/register"
                  className="font-bold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Sign Up
                </Link>
              </p>
            </div>

            {/* GUEST BROWSING */}
            <div className="mt-7 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-blue-600"
              >
                Continue browsing Socials
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* FOOTER */}
            <div className="mt-12 border-t border-neutral-200 pt-6 text-center dark:border-neutral-800">
              <p className="text-xs text-neutral-400">
                By continuing, you agree to the
                community guidelines of Socials.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
