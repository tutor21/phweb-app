'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { ShieldAlert, Users, FileText, AlertTriangle, Settings, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ users: 0, posts: 0, reports: 0 });
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function verifyAndLoadAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const authorized = roleData?.role === 'superadmin' || user.email === 'fctutor1984@gmail.com';
      
      if (!authorized) {
        router.push('/');
        return;
      }

      setIsAdmin(true);

      // Fetch dashboard metrics
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: postsCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      const { count: reportsCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');

      setStats({
        users: usersCount || 0,
        posts: postsCount || 0,
        reports: reportsCount || 0,
      });

      // Fetch pending reports
      const { data: reportsData } = await supabase
        .from('reports')
        .select('*, profiles:reporter_id(username)')
        .order('created_at', { ascending: false });

      setReports(reportsData || []);
      setLoading(false);
    }

    verifyAndLoadAdmin();
  }, [supabase, router]);

  if (loading || isAdmin === null) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <p className="text-sm text-neutral-500">Verifying administrator privileges...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell isAdmin={true}>
      <div className="p-4 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Superadmin Dashboard</h1>
            <p className="text-xs text-neutral-500">Secure platform administration & moderation control center.</p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-black">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-neutral-500 uppercase font-semibold">Total Users</span>
              <Users className="w-5 h-5 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold">{stats.users}</p>
          </div>

          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-black">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-neutral-500 uppercase font-semibold">Total Posts</span>
              <FileText className="w-5 h-5 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold">{stats.posts}</p>
          </div>

          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-black">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-neutral-500 uppercase font-semibold">Pending Reports</span>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold">{stats.reports}</p>
          </div>
        </div>

        {/* Content Moderation Section */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-black space-y-4">
          <h2 className="font-bold text-base">Content & Report Moderation</h2>
          {reports.length === 0 ? (
            <p className="text-sm text-neutral-500">No content reports requiring review.</p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 border border-neutral-100 dark:border-neutral-900 rounded-xl text-sm">
                  <div>
                    <span className="font-semibold mr-2">@{report.profiles?.username || 'user'}</span>
                    <span className="text-neutral-500">reported {report.target_type}: "{report.reason}"</span>
                  </div>
                  <span className="px-2.5 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-medium">
                    {report.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}