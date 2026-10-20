import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!id) return fail('Invalid post ID.', 400);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return fail('Deletion service is not configured.', 503);
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return fail('Please sign in to delete a post.', 401);
  }
  const token = authorization.slice(7).trim();
  if (!token) return fail('Invalid authentication token.', 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return fail('Your session has expired.', 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Verify ownership before reading or deleting any gallery images.
    const { data: post, error: readError } = await admin
      .from('posts')
      .select('id, user_id, image')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (readError) throw readError;
    if (!post) return fail('Post not found or access denied.', 404);

    // Fetch every photo before deleting the parent record. The SQL migration
    // defines ON DELETE CASCADE, so these rows disappear with the post.
    const { data: gallery, error: galleryError } = await admin
      .from('post_images')
      .select('url')
      .eq('post_id', id);

    // Fail closed: deleting now could orphan files whose URLs we could not read.
    if (galleryError) throw galleryError;

    const urls = [
      ...(typeof post.image === 'string' ? [post.image] : []),
      ...(gallery ?? []).map((photo) => photo.url),
    ];
    const storagePaths = Array.from(
      new Set(
        urls
          .filter((url): url is string => typeof url === 'string')
          .map(getStoragePath)
          .filter((path): path is string => path !== null)
      )
    );

    const { data: deleted, error: deleteError } = await admin
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id');

    if (deleteError) throw deleteError;
    if (!deleted?.length) return fail('Post could not be deleted.', 409);

    if (storagePaths.length > 0) {
      const { error: storageError } = await admin.storage
        .from('posts')
        .remove(storagePaths);

      if (storageError) {
        console.error('Post deleted but gallery cleanup failed:', {
          postId: id,
          imageCount: storagePaths.length,
          message: storageError.message,
        });
        return NextResponse.json({
          success: true,
          cleanupComplete: false,
          message: 'Post deleted, but image cleanup needs attention.',
        });
      }
    }

    return NextResponse.json({
      success: true,
      cleanupComplete: true,
      message: 'Post deleted successfully.',
    });
  } catch (error) {
    console.error('Secure post deletion failed:', error);
    return fail('Unable to delete post. Please try again.', 503);
  }
}
