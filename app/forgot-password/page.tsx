
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/app/utils/supabase/client';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const redirectTo =
        `${window.location.origin}/reset-password`;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo }
        );

      if (resetError) throw resetError;

      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to send the reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10 text-neutral-900 dark:bg-neutral-950 dark:text-white">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-3"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white">
            S
          </span>
          <span className="text-3xl font-extrabold tracking-tight">
            Socials
          </span>
        </Link>

        <div className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-9">
          {sent ? (
            <div className="text-center">
              <CheckCircle2
                size={48}
                className="mx-auto mb-5 text-green-600"
              />

              <h1 className="text-2xl font-bold">
                Check your email
              </h1>

              <p className="mt-4 text-sm leading-7 text-neutral-500">
                If an account exists for this email,
                you will receive a password reset link.
                Please also check your spam folder.
              </p>

              <Link
                href="/login"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Return to Log In
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
                <ShieldCheck
                  size={28}
                  className="text-blue-600"
                />
              </div>

              <h1 className="text-2xl font-bold">
                Forgot your password?
              </h1>

              <p className="mt-3 text-sm leading-6 text-neutral-500">
                Enter the email associated with your
                Socials account. We'll send you a
                secure link to reset your password.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-7 space-y-5"
              >
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
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="you@example.com"
                      disabled={loading}
                      className="w-full rounded-xl border border-neutral-300 bg-transparent py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 dark:border-neutral-700"
                    />
                  </div>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <Link
                href="/login"
                className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-neutral-500 hover:text-blue-600"
              >
                <ArrowLeft size={16} />
                Back to Log In
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
