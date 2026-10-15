
'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Save, ArrowLeft, ShieldCheck } from 'lucide-react';

import AppShell from '@/app/components/AppShell';
import { createClient } from '@/app/utils/supabase/client';

const MAX_LENGTH = 500;

interface Post {
  id: string;
  user_id: string;
  caption: string | null;
  image: string | null;
}

interface EditPostClientProps {
  postId: string;
}

export default function EditPostClient({
  postId,
}: EditPostClientProps) {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [caption, setCaption] = useState('');
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load the existing post and verify ownership.
  useEffect(() => {
    let active = true;

    async function loadPost() {
      setLoading(true);
      setError('');

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace('/login');
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('posts')
          .select('id, user_id, caption, image')
          .eq('id', postId)
          .single();

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        const post = data as Post | null;

        if (!post) {
          throw new Error('Post not found.');
        }

        if (post.user_id !== user.id) {
          throw new Error(
            'You do not have permission to edit this post.'
          );
        }

        if (!active) return;

        setUserId(user.id);
        setCaption(post.caption ?? '');
        setExistingImage(post.image ?? null);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load post.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (postId) {
      void loadPost();
    } else {
      setError('Invalid post ID.');
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [postId, router, supabase]);

  // Save caption only.
  async function savePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || loading || !userId) {
      return;
    }

    const text = caption.trim();

    if (!text && !existingImage) {
      setError('Write something before saving.');
      return;
    }

    if (caption.length > MAX_LENGTH) {
      setError(
        `Post text cannot exceed ${MAX_LENGTH} characters.`
      );
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== userId) {
        throw new Error(
          'Your session has expired. Please sign in again.'
        );
      }

      /*
       * SECURITY:
       *
       * Only update the caption column.
       *
       * Never include "image" here because:
       * 1. Supabase now grants UPDATE(caption) only.
       * 2. Image changes must pass through server-side
       *    OpenAI moderation before publication.
       */

      const { data, error: updateError } = await supabase
        .from('posts')
        .update({
          caption: text,
        })
        .eq('id', postId)
        .eq('user_id', user.id)
        .select('id');

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (!data || data.length === 0) {
        throw new Error(
          'Post was not updated. Please check your permissions.'
        );
      }

      setSuccess('Post updated successfully.');

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update post.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-xl space-y-5 px-4 py-8">

        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to feed"
            className="rounded-lg p-2 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold">
              Edit Post
            </h1>

            <p className="text-sm text-neutral-500">
              Update your post caption securely.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
            <Loader2 className="h-5 w-5 animate-spin" />

            <p className="text-sm text-neutral-500">
              Loading post...
            </p>
          </div>
        ) : !userId ? (
          <div className="space-y-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">

            <p
              role="alert"
              className="text-sm text-red-600"
            >
              {error || 'Post unavailable.'}
            </p>

            <Link
              href="/"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Return to feed
            </Link>
          </div>
        ) : (
          <form
            onSubmit={savePost}
            className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-black"
          >

            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/20"
              >
                {success}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="edit-caption"
                className="block text-sm font-semibold"
              >
                Post text
              </label>

              <textarea
                id="edit-caption"
                value={caption}
                onChange={(event) => {
                  setCaption(event.target.value);
                  setError('');
                }}
                maxLength={MAX_LENGTH}
                rows={6}
                disabled={saving}
                placeholder="What's on your mind?"
                className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
              />

              <p className="text-right text-xs text-neutral-500">
                {caption.length} / {MAX_LENGTH}
              </p>
            </div>

            {existingImage && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">
                  Current photo
                </p>

                <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                  {/* Existing image is displayed but cannot be changed. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={existingImage}
                    alt="Current post attachment"
                    className="max-h-96 w-full object-contain"
                  />
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/20 dark:text-blue-300">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

                  <p>
                    Image replacement and removal are temporarily
                    disabled. You can edit your caption without
                    changing your existing photo.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">

              <Link
                href="/"
                className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-center text-sm font-medium transition hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>

            </div>

          </form>
        )}

      </main>
    </AppShell>
  );
}
