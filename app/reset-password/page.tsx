
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
} from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function verifyRecovery() {
      try {
        const params = new URLSearchParams(
          window.location.search
        );

        const code = params.get('code');
        const linkError = params.get('error_description');

        if (linkError) {
          throw new Error(linkError);
        }

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(
              code
            );

          if (exchangeError) {
            // The Supabase browser client may have
            // already exchanged the recovery code.
            const { data } =
              await supabase.auth.getSession();

            if (!data.session) {
              throw exchangeError;
            }
          }

          window.history.replaceState(
            {},
            '',
            '/reset-password'
          );
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error(
            'This recovery link is invalid or has expired. Please request a new one.'
          );
        }

        if (active) {
          setAuthorized(true);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to verify your recovery link.'
          );
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void verifyRecovery();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleReset(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!authorized || loading) return;

    setError('');

    if (password.length < 8) {
      setError(
        'Your password must contain at least 8 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) throw updateError;

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');

      // End the recovery session so the user can
      // log in with the new password.
      await supabase.auth.signOut();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update your password.'
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
          <span className="text-3xl font-extrabold">
            Socials
          </span>
        </Link>

        <div className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-9">
          {checking ? (
            <div className="flex items-center justify-center gap-3 py-12 text-neutral-500">
              <Loader2 className="animate-spin" />
              Verifying recovery link...
            </div>
          ) : success ? (
            <div className="text-center">
              <CheckCircle2
                size={52}
                className="mx-auto mb-5 text-green-600"
              />

              <h1 className="text-2xl font-bold">
                Password updated!
              </h1>

              <p className="mt-4 text-sm leading-6 text-neutral-500">
                Your Socials password has been changed
                successfully. You can now log in
                using your new password.
              </p>

              <Link
                href="/login"
                className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Log In to Socials
              </Link>
            </div>
          ) : !authorized ? (
            <div className="text-center">
              <KeyRound
                size={48}
                className="mx-auto mb-5 text-neutral-400"
              />

              <h1 className="text-2xl font-bold">
                Recovery link unavailable
              </h1>

              <p className="mt-4 text-sm leading-6 text-neutral-500">
                {error ||
                  'Your recovery link is invalid or has expired.'}
              </p>

              <Link
                href="/forgot-password"
                className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Request a New Link
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
                <LockKeyhole
                  size={28}
                  className="text-blue-600"
                />
              </div>

              <h1 className="text-2xl font-bold">
                Create a new password
              </h1>

              <p className="mt-3 text-sm leading-6 text-neutral-500">
                Choose a strong password for your
                Socials account.
              </p>

              <form
                onSubmit={handleReset}
                className="mt-7 space-y-5"
              >
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold"
                  >
                    New password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="At least 8 characters"
                      disabled={loading}
                      className="w-full rounded-xl border border-neutral-300 bg-transparent px-4 py-3 pr-12 text-sm outline-none focus:border-blue-500 dark:border-neutral-700"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((v) => !v)
                      }
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400"
                    >
                      {showPassword ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Confirm new password
                  </label>

                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Re-enter your password"
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-neutral-700"
                  />
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
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
