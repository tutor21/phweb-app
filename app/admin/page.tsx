
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';

interface Report {
  id: string;
  target_id: string;
  target_type: string;
  reason: string;
  status: string;
  created_at: string;
  profiles: {
    username: string;
  } | null;
}

interface DashboardStats {
  users: number;
  posts: number;
  reports: number;
}

type ModerationAction = 'dismiss' | 'remove';

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    posts: 0,
    reports: 0,
  });

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Verify the current authenticated user.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setIsAdmin(false);
        router.replace('/login');
        return;
      }

      // Read the user's role from Supabase.
      // Actual authorization must also be enforced
      // by database RLS and protected RPC functions.
      const { data: roleData, error: roleError } =
        await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

      if (roleError) {
        throw roleError;
      }

      if (roleData?.role !== 'superadmin') {
        setIsAdmin(false);
        router.replace('/');
        return;
      }

      setIsAdmin(true);

      // Fetch platform statistics and pending reports.
      const [
        usersResult,
        postsResult,
        reportsCountResult,
        reportsResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', {
            count: 'exact',
            head: true,
          }),

        supabase
          .from('posts')
          .select('*', {
            count: 'exact',
            head: true,
          }),

        supabase
          .from('reports')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('status', 'pending'),

        supabase
          .from('reports')
          .select(
            '*, profiles:reports_reporter_id_fkey(username)'
          )
          .eq('status', 'pending')
          .order('created_at', {
            ascending: false,
          }),
      ]);

      const queryError =
        usersResult.error ||
        postsResult.error ||
        reportsCountResult.error ||
        reportsResult.error;

      if (queryError) {
        throw queryError;
      }

      setStats({
        users: usersResult.count ?? 0,
        posts: postsResult.count ?? 0,
        reports: reportsCountResult.count ?? 0,
      });

      // Normalize the profile relationship returned
      // by Supabase into the Report interface.
      const normalizedReports: Report[] = (
        reportsResult.data ?? []
      ).map((report) => {
        const profile = report.profiles;

        const normalizedProfile = Array.isArray(profile)
          ? profile[0] ?? null
          : profile ?? null;

        return {
          id: report.id,
          target_id: report.target_id,
          target_type: report.target_type,
          reason: report.reason,
          status: report.status,
          created_at: report.created_at,
          profiles: normalizedProfile,
        };
      });

      setReports(normalizedReports);
    } catch (error) {
      console.error('Admin dashboard error:', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load dashboard data. Check Supabase permissions and configuration.'
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  // Load dashboard on initial render.
  useEffect(() => {
    void fetchAdminData();
  }, [fetchAdminData]);

  // Resolve or dismiss a reported item.
  const handleResolveReport = async (
    report: Report,
    action: ModerationAction
  ) => {
    if (processingId !== null || isAdmin !== true) {
      return;
    }

    if (action === 'remove') {
      if (report.target_type !== 'post') {
        setErrorMessage(
          'Only post removal is currently supported.'
        );
        return;
      }

      const confirmed = window.confirm(
        'Are you sure you want to remove this post? This action may be irreversible.'
      );

      if (!confirmed) {
        return;
      }
    }

    setProcessingId(report.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // This RPC must exist in Supabase and securely
      // verify the caller's Superadmin privileges.
      const { error: rpcError } = await supabase.rpc(
        'moderate_report',
        {
          p_report_id: report.id,
          p_action: action,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      await fetchAdminData();

      setSuccessMessage(
        action === 'remove'
          ? 'Content moderation action completed.'
          : 'Report dismissed successfully.'
      );
    } catch (error) {
      console.error('Moderation error:', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to complete moderation action. Verify that the moderate_report RPC exists and has the correct permissions.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  // Loading screen.
  if (isAdmin === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center dark:bg-black">
        <RefreshCw className="h-8 w-8 animate-spin text-neutral-500" />

        <p className="text-sm text-neutral-500">
          Verifying administrator privileges...
        </p>

        {errorMessage && (
          <p
            role="alert"
            className="max-w-md text-sm text-red-600"
          >
            {errorMessage}
          </p>
        )}
      </main>
    );
  }

  // Unauthorized screen.
  if (!isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center dark:bg-black">
        <ShieldAlert className="h-12 w-12 text-red-500" />

        <h1 className="text-2xl font-bold">
          Access Denied
        </h1>

        <p className="max-w-md text-sm text-neutral-500">
          You do not have permission to access the
          Superadmin Dashboard.
        </p>

        {errorMessage && (
          <p role="alert" className="text-sm text-red-600">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-lg bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-black"
        >
          Return Home
        </button>
      </main>
    );
  }

  // Main dashboard.
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
        {/* Dashboard Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">
              Superadmin Dashboard
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Secure platform administration and
              content moderation control center.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSuccessMessage('');
              void fetchAdminData();
            }}
            disabled={loading || processingId !== null}
            className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? 'animate-spin' : ''
              }`}
            />

            Refresh
          </button>
        </header>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20"
          >
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            role="status"
            className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/20"
          >
            {successMessage}
          </div>
        )}

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Total Users */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500">
                Total Users
              </span>

              <Users className="h-5 w-5 text-neutral-400" />
            </div>

            <p className="text-3xl font-bold">
              {stats.users}
            </p>
          </div>

          {/* Total Posts */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500">
                Total Posts
              </span>

              <FileText className="h-5 w-5 text-neutral-400" />
            </div>

            <p className="text-3xl font-bold">
              {stats.posts}
            </p>
          </div>

          {/* Pending Reports */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500">
                Pending Reports
              </span>

              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>

            <p className="text-3xl font-bold">
              {stats.reports}
            </p>
          </div>
        </section>

        {/* Moderation Section */}
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-black md:p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <h2 className="text-base font-bold">
              Content & Report Moderation
            </h2>

            <span className="text-xs text-neutral-500">
              {stats.reports} pending reports
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-10">
              <RefreshCw className="h-5 w-5 animate-spin text-neutral-500" />

              <span className="text-sm text-neutral-500">
                Loading reports...
              </span>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-10 text-center">
              <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-neutral-400" />

              <p className="text-sm text-neutral-500">
                No content reports requiring review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-neutral-100 p-4 text-sm dark:border-neutral-900 sm:flex-row sm:items-center"
                >
                  {/* Report Details */}
                  <div className="min-w-0">
                    <p className="mb-1 font-semibold">
                      @{report.profiles?.username || 'user'}
                    </p>

                    <p className="break-words text-neutral-500">
                      Flagged {report.target_type}: "{report.reason}"
                    </p>

                    <p className="mt-2 text-xs text-neutral-400">
                      Reported:{' '}
                      {new Date(
                        report.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex shrink-0 gap-2">
                    {report.target_type === 'post' && (
                      <button
                        type="button"
                        disabled={
                          processingId !== null || loading
                        }
                        onClick={() =>
                          void handleResolveReport(
                            report,
                            'remove'
                          )
                        }
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId === report.id
                          ? 'Processing...'
                          : 'Remove Content'}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={
                        processingId !== null || loading
                      }
                      onClick={() =>
                        void handleResolveReport(
                          report,
                          'dismiss'
                        )
                      }
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                      Dismiss
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
