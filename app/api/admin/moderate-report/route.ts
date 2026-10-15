import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ModerationAction = 'remove' | 'dismiss';

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getStoragePath(imageUrl: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const url = new URL(imageUrl);
    const base = new URL(supabaseUrl);
    if (url.origin !== base.origin) return null;

    const prefix = '/storage/v1/object/public/posts/';
    if (!url.pathname.startsWith(prefix)) return null;

    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!path.startsWith('posts/')) return null;
    if (path.includes('..') || path.includes('\\') || path.includes('\0')) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return fail('Moderation service is not configured.', 503);
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return fail('Please sign in to moderate reports.', 401);
  }

  const token = authorization.slice(7).trim();
  if (!token) return fail('Invalid authentication token.', 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail('Invalid JSON request.', 400);
  }

  if (!payload || typeof payload !== 'object') {
    return fail('Invalid request.', 400);
  }

  const body = payload as Record<string, unknown>;
  const reportId = body.reportId;
  const action = body.action;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof reportId !== 'string' || !uuidPattern.test(reportId)) {
    return fail('Invalid report ID.', 400);
  }
  if (action !== 'remove' && action !== 'dismiss') {
    return fail('Invalid moderation action.', 400);
  }
  const moderationAction: ModerationAction = action;

  // Use a user-scoped client for the RPC, so auth.uid() is the real caller.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authError } =
    await userClient.auth.getUser(token);
  if (authError || !user) return fail('Your session has expired.', 401);

  // The service-role client never runs in the browser.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: role, error: roleError } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError) throw roleError;
    if (role?.role !== 'superadmin') return fail('Access denied.', 403);

    const { data: report, error: reportError } = await admin
      .from('reports')
      .select('id, target_id, target_type, status')
      .eq('id', reportId)
      .maybeSingle();

    if (reportError) throw reportError;
    if (!report) return fail('Report not found.', 404);
    if (report.status !== 'pending') {
      return fail('This report has already been moderated.', 409);
    }
    if (moderationAction === 'remove' && report.target_type !== 'post') {
      return fail('Only post removal is currently supported.', 400);
    }

    let imagePath: string | null = null;
    if (moderationAction === 'remove') {
      const { data: post, error: postError } = await admin
        .from('posts')
        .select('id, image')
        .eq('id', report.target_id)
        .maybeSingle();

      if (postError) throw postError;
      if (post && typeof post.image === 'string') {
        imagePath = getStoragePath(post.image);
      }
    }

    // Reuse the database's superadmin-checked, transactional moderation RPC.
    // It deletes the post and marks the report resolved (or dismisses it).
    const { error: rpcError } = await userClient.rpc('moderate_report', {
      p_report_id: reportId,
      p_action: moderationAction,
    });

    if (rpcError) {
      console.error('Report moderation RPC failed:', rpcError);
      return fail('Unable to complete moderation action.', 503);
    }

    if (moderationAction === 'remove' && imagePath) {
      const { error: storageError } = await admin.storage
        .from('posts')
        .remove([imagePath]);

      if (storageError) {
        console.error('Moderation completed but image cleanup failed:', {
          reportId,
          imagePath,
          message: storageError.message,
        });
        return NextResponse.json({
          success: true,
          cleanupComplete: false,
          message: 'Post removed, but image cleanup needs attention.',
        });
      }
    }

    return NextResponse.json({
      success: true,
      cleanupComplete: true,
      message: moderationAction === 'remove'
        ? 'Post removed successfully.'
        : 'Report dismissed successfully.',
    });
  } catch (error) {
    console.error('Admin moderation failed:', error);
    return fail('Unable to moderate report. Please try again.', 503);
  }
}
