'use client';

import React, { useState, useMemo } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername) {
        throw new Error('Username is required.');
      }

      // Sign up with Supabase auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
            name: name.trim() || cleanUsername,
          },
        },
      });

      if (authError) throw authError;

      if (data.user) {
        // Upsert profile record explicitly to ensure username and name are set
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: cleanUsername,
            name: name.trim() || cleanUsername,
            avatar: null,
            bio: '',
          });

        if (profileError) {
          console.warn('Profile upsert warning:', profileError.message);
        }
      }

      setSuccessMessage('Account created successfully! Please check your email for confirmation before signing in.');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4 py-8">
      <div className="max-w-md w-full space-y-8 p-8 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center mx-auto">
            P
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create a phweb.app account</h1>
          <p className="text-sm text-neutral-500">Join our minimalist photo sharing community</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage ? (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div className="space-y-1">
              <h2 className="font-semibold text-emerald-900 dark:text-emerald-100 text-base">Check your email</h2>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
                {successMessage}
              </p>
            </div>
            <Link
              href="/login"
              className="inline-block w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition shadow-sm"
            >
              Proceed to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Username</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-3.5 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Full Name</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-neutral-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <span className="text-[11px] text-neutral-400 mt-1 block">Must be at least 6 characters long.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        )}

        {!successMessage && (
          <div className="text-center text-sm text-neutral-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}