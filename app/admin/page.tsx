'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  FileText,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Save,
  Eye,
  X,
  Trash2,
  CheckCircle,
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

interface PostDetails {
  id: string;
  image: string;
  caption: string;
  created_at: string;
  profiles: {
    username: string;
    avatar: string | null;
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

  // Advertisement Settings State
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [publisherId, setPublisherId] = useState('');
  const [adSlotId, setAdSlotId] = useState('');
  const [adFrequency, setAdFrequency] = useState(5);
  const [savingAds, setSavingAds] = useState(false);

  // Post Preview Modal State
  const [previewingPostId, setPreviewingPostId] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<PostDetails | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setIsAdmin(false);
        router.replace('/login');
        return;
      }

      const { data: roleData, error: roleError } = await supabase
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

      const [
        usersResult,
        postsResult,
        reportsCountResult,
        reportsResult,
        settingsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('reports')
          .select('*, profiles:reports_reporter_id_fkey(username)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase.from('platform_settings').select('*'),
      ]);

      const queryError =
  usersResult.error ||
  postsResult.error ||
  reportsCountResult.error ||
  reportsResult.error ||
  settingsResult.error;

if (queryError) {
  throw queryError;
}

      setStats({
        users: usersResult.count ?? 0,
        posts: postsResult.count ?? 0,
        reports: reportsCountResult.count ?? 0,
      });

      if (settingsResult.data) {
        settingsResult.data.forEach((setting: any) => {
          if (setting.key === 'ads_enabled') setAdsEnabled(setting.value === 'true');
          if (setting.key === 'ads_publisher_id') setPublisherId(setting.value);
          if (setting.key === 'ads_slot_id') setAdSlotId(setting.value);
          if (setting.key === 'ads_frequency') setAdFrequency(parseInt(setting.value, 10) || 5);
        });
      }

      const normalizedReports: Report[] = (reportsResult.data ?? []).map((report) => {
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

  useEffect(() => {
    void fetchAdminData();
  }, [fetchAdminData]);

  // Handle opening post preview modal
  const handleOpenPreview = async (targetId: string) => {
    setPreviewingPostId(targetId);
    setLoadingPreview(true);
    setPreviewPost(null);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, image, caption, created_at, profiles:posts_user_id_fkey(username, avatar)')
        .eq('id', targetId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const profile = data.profiles;
        const normProfile = Array.isArray(profile) ? profile[0] : profile;
        setPreviewPost({
          id: data.id,
          image: data.image,
          caption: data.caption,
          created_at: data.created_at,
          profiles: normProfile || null,
        });
      }
    } catch (err) {
      console.error('Error fetching post for preview:', err);
      setErrorMessage('Failed to load post preview details.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveAdSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAds(true);
    setErrorMessage('');
    setSuccessMessage('');

    const pubClean = publisherId.trim();
    if (pubClean && !/^ca-pub-\d{16}$/.test(pubClean)) {
      setErrorMessage('Invalid Publisher ID format. Must match format: ca-pub-XXXXXXXXXXXXXXXX');
      setSavingAds(false);
      return;
    }

    const slotClean = adSlotId.trim();
    if (slotClean && !/^\d+$/.test(slotClean)) {
      setErrorMessage('Invalid Ad Slot ID. Must contain digits only.');
      setSavingAds(false);
      return;
    }

    try {
      const settingsUpserts = [
        { key: 'ads_enabled', value: String(adsEnabled) },
        { key: 'ads_publisher_id', value: pubClean },
        { key: 'ads_slot_id', value: slotClean },
        { key: 'ads_frequency', value: String(Math.max(1, adFrequency)) },
      ];

      for (const item of settingsUpserts) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert(item, { onConflict: 'key' });

        if (error) throw error;
      }

      setSuccessMessage('Advertisement settings saved securely.');
    } catch (error) {
      console.error('Error saving ad settings:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save advertisement settings.'
      );
    } finally {
      setSavingAds(false);
    }
  };

  const handleResolveReport = async (report: Report, action: ModerationAction) => {
    if (processingId !== null || isAdmin !== true) return;

    if (action === 'remove' && report.target_type !== 'post') {
      setErrorMessage('Only post removal is currently supported.');
      return;
    }

    setProcessingId(report.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error: rpcError } = await supabase.rpc('moderate_report', {
        p_report_id: report.id,
        p_action: action,
      });

      if (rpcError) throw rpcError;

      // Close preview modal if the resolved report matches currently previewed post
      if (previewingPostId === report.target_id) {
        setPreviewingPostId(null);
        setPreviewPost(null);
      }

      await fetchAdminData();
      setSuccessMessage(
        action === 'remove' ? 'Content moderation action completed.' : 'Report dismissed successfully.'
      );
    } catch (error) {
      console.error('Moderation error:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to complete moderation action.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  if (isAdmin === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center dark:bg-black">
        <RefreshCw className="h-8 w-8 animate-spin text-neutral-500" />
        <p className="text-sm text-neutral-500">Verifying administrator privileges...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center dark:bg-black">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
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

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">Superadmin Dashboard</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Secure platform administration, monetization, and moderation control center.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSuccessMessage('');
              void fetchAdminData();
            }}
            disabled={loading || processingId !== null}
            className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        {errorMessage && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/20">
            {successMessage}
          </div>
        )}

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500">Total Users</span>
              <Users className="h-5 w-5 text-neutral-400" />
            </div>
            <p className="text-3xl font-bold">{stats.users}</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500">Total Posts</span>
              <FileText className="h-5 w-5 text-neutral-400" />
            </div>
            <p className="text-3xl font-bold">{stats.posts}</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500">Pending Reports</span>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold">{stats.reports}</p>
          </div>
        </section>

        {/* Advertisement Management Section */}
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-black">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold">Advertisement & AdSense Management</h2>
          </div>
          <p className="text-xs text-neutral-500">
            Configure Google AdSense identifiers and feed advertisement frequency safely.
          </p>

          <form onSubmit={handleSaveAdSettings} className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label htmlFor="ads-toggle" className="text-sm font-semibold">Enable Feed Advertisements</label>
              <input
                id="ads-toggle"
                type="checkbox"
                checked={adsEnabled}
                onChange={(e) => setAdsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                AdSense Publisher ID
              </label>
              <input
                type="text"
                value={publisherId}
                onChange={(e) => setPublisherId(e.target.value)}
                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">Format: ca-pub- followed by 16 digits.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                Default Ad Slot ID
              </label>
              <input
                type="text"
                value={adSlotId}
                onChange={(e) => setAdSlotId(e.target.value)}
                placeholder="1234567890"
                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">Numeric AdSense ad unit slot ID.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                Advertisement Frequency (Every N posts)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={adFrequency}
                onChange={(e) => setAdFrequency(parseInt(e.target.value, 10) || 5)}
                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingAds}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              <Save className="h-4 w-4" />
              {savingAds ? 'Saving Settings...' : 'Save Ad Settings'}
            </button>
          </form>
        </section>

        {/* Moderation Section */}
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-black">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Content & Report Moderation</h2>
            <span className="text-xs text-neutral-500">{stats.reports} pending reports</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-10">
              <RefreshCw className="h-5 w-5 animate-spin text-neutral-500" />
              <span className="text-sm text-neutral-500">Loading reports...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-10 text-center">
              <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
              <p className="text-sm text-neutral-500">No content reports requiring review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-neutral-100 p-4 text-sm dark:border-neutral-900 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="mb-1 font-semibold">@{report.profiles?.username || 'user'}</p>
                    <p className="break-words text-neutral-500">
                      Flagged {report.target_type}: "{report.reason}"
                    </p>
                    <p className="mt-2 text-xs text-neutral-400">
                      Reported: {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2 flex-wrap">
                    {report.target_type === 'post' && (
                      <button
                        type="button"
                        onClick={() => void handleOpenPreview(report.target_id)}
                        className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview Post
                      </button>
                    )}

                    {report.target_type === 'post' && (
                      <button
                        type="button"
                        disabled={processingId !== null || loading}
                        onClick={() => void handleResolveReport(report, 'remove')}
                        className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {processingId === report.id ? 'Processing...' : 'Remove'}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={processingId !== null || loading}
                      onClick={() => void handleResolveReport(report, 'dismiss')}
                      className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Dismiss
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Post Preview Modal */}
        {previewingPostId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-black space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-900">
                <h3 className="text-base font-bold">Flagged Post Preview</h3>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewingPostId(null);
                    setPreviewPost(null);
                  }}
                  className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  aria-label="Close preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingPreview ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="h-6 w-6 animate-spin text-neutral-500" />
                </div>
              ) : !previewPost ? (
                <div className="py-12 text-center text-sm text-neutral-500">
                  Post could not be found or may have already been removed.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                      <img
                        src={previewPost.profiles?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={previewPost.profiles?.username || 'User'}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">@{previewPost.profiles?.username || 'user'}</p>
                      <p className="text-xs text-neutral-400">{new Date(previewPost.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="aspect-square w-full rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <img
                      src={previewPost.image}
                      alt="Flagged post preview"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {previewPost.caption && (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 break-words">
                      {previewPost.caption}
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    {reports.find((r) => r.target_id === previewPost.id) && (
                      <button
                        type="button"
                        onClick={() => {
                          const rep = reports.find((r) => r.target_id === previewPost.id);
                          if (rep) void handleResolveReport(rep, 'remove');
                        }}
                        className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        Remove Content
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewingPostId(null);
                        setPreviewPost(null);
                      }}
                      className="flex-1 rounded-xl border border-neutral-300 py-2.5 text-sm font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}