
'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
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
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function checkLogin() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (data.session) {
        router.replace('/');
        router.refresh();
      } else {
        setChecking(false);
      }
    }

    void checkLogin().catch(() => {
      if (active) setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) throw loginError;

      router.replace('/');
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed.';

      setError(
        message.toLowerCase().includes('invalid login credentials')
          ? 'Incorrect email or password. Please try again.'
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-12 text-white lg:flex">
        <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" />

        <Link href="/" className="relative z-10 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl font-black text-blue-600">
            S
          </span>
          <span className="text-3xl font-extrabold">Socials</span>
        </Link>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            Your world.
            <br />
            Your people.
            <br />
            Your Socials.
          </h1>

          <p className="mt-6 max-w-md text-lg leading-8 text-blue-100">
            Share your moments, discover conversations, and stay
            connected with your community.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { icon: MessageCircle, title: 'Messages' },
              { icon: Heart, title: 'Connections' },
              { icon: Users, title: 'Community' },
            ].map(({ icon: Icon, title }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/20 bg-white/10 p-4"
              >
                <Icon size={23} />
                <p className="mt-3 text-sm font-semibold">{title}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-blue-100/80">
          © {new Date().getFullYear()} Socials
        </p>
      </section>

      <section className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">
              S
            </span>
            <span className="text-xl font-extrabold">Socials</span>
          </Link>

          <p className="ml-auto text-sm text-neutral-500">
            New here?{' '}
            <Link href="/register" className="font-semibold text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                <ShieldCheck size={14} />
                Secure account access
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Welcome back
              </h2>

              <p className="mt-3 text-sm text-neutral-500">
                Log in to continue connecting on Socials.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold">
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-12 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-neutral-800 dark:bg-neutral-900"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="text-sm font-semibold">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    id="password"
                    type={visible ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-300 bg-white py-3.5 pl-12 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-neutral-800 dark:bg-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-blue-600"
                  >
                    {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Log In <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-neutral-200 pt-7 text-center dark:border-neutral-800">
              <p className="text-sm text-neutral-500">
                Don't have an account?
              </p>
              <Link
                href="/register"
                className="mt-3 flex w-full items-center justify-center rounded-xl border border-neutral-300 px-5 py-3 font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                Create a Free Account
              </Link>
            </div>

            <p className="mt-6 text-center text-xs text-neutral-400">
              Forgot your credentials?{' '}
              <Link href="/forgot-password" className="font-semibold text-blue-600 hover:underline">
                Reset your password
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
