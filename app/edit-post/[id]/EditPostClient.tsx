'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ImagePlus, X, Save } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';

const MAX_LENGTH = 500;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export default function EditPostClient() {
  const router = useRouter();
  const params = useParams();
  const postId = typeof params.id === 'string' ? params.id : '';
  const supabase = useMemo(() => createClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState('');
  const [caption, setCaption] = useState('');
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadPost() {
      setLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) { router.replace('/login'); return; }
        const { data, error: postError } = await supabase.from('posts')
          .select('id, user_id, caption, image').eq('id', postId).single();
        if (postError) throw postError;
        if (data.user_id !== user.id) throw new Error('You cannot edit another user’s post.');
        if (!active) return;
        setUserId(user.id);
        setCaption(data.caption || '');
        setExistingImage(data.image || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load post.');
      } finally { if (active) setLoading(false); }
    }
    if (postId) void loadPost();
    else { setError('Invalid post ID.'); setLoading(false); }
    return () => { active = false; };
  }, [postId, router, supabase]);

  useEffect(() => {
    if (!newFile) { setPreview(null); return; }
    const url = URL.createObjectURL(newFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newFile]);

  function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Choose a JPEG, PNG, WebP, GIF, or AVIF image.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    setNewFile(file);
  }

  function removeImage() {
    setNewFile(null);
    setExistingImage(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function savePost(event: React.FormEvent) {
    event.preventDefault();
    if (saving || loading || !userId) return;
    const text = caption.trim();
    if (!text && !existingImage && !newFile) { setError('Write something or attach an image.'); return; }
    if (caption.length > MAX_LENGTH) { setError('Post text is too long.'); return; }
    setSaving(true);
    setError('');
    let uploadedPath: string | null = null;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || user?.id !== userId) throw new Error('Your session has expired. Please sign in again.');
      let image = existingImage;
      if (newFile) {
        const ext = newFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        uploadedPath = `posts/${user.id}-${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('posts')
          .upload(uploadedPath, newFile, { upsert: false, contentType: newFile.type });
        if (uploadError) throw uploadError;
        image = supabase.storage.from('posts').getPublicUrl(uploadedPath).data.publicUrl;
      }
      const { data, error: updateError } = await supabase.from('posts')
        .update({ caption: text, image })
        .eq('id', postId).eq('user_id', user.id).select('id');
      if (updateError) throw updateError;
      if (!data?.length) throw new Error('Post was not updated. Check your Supabase update policy.');
      router.push('/');
      router.refresh();
    } catch (err) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from('posts').remove([uploadedPath]);
        if (cleanupError) console.warn('Could not clean up uploaded image:', cleanupError.message);
      }
      setError(err instanceof Error ? err.message : 'Unable to update post.');
    } finally { setSaving(false); }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-xl space-y-5 px-4 py-8">
        <h1 className="text-2xl font-bold">Edit Post</h1>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading post...</p>
        ) : !userId ? (
          <div className="space-y-3"><p role="alert" className="text-sm text-red-600">{error || 'Post unavailable.'}</p><Link href="/" className="text-sm text-blue-600">Return to feed</Link></div>
        ) : (
          <form onSubmit={savePost} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20">{error}</p>}
            <div>
              <label htmlFor="edit-caption" className="mb-2 block text-sm font-semibold">Post text</label>
              <textarea id="edit-caption" value={caption} onChange={e => setCaption(e.target.value)} maxLength={MAX_LENGTH} rows={6} disabled={saving} placeholder="What's on your mind?" className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-900" />
              <p className="text-right text-xs text-neutral-500">{caption.length} / {MAX_LENGTH}</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Photo (optional)</p>
              <input ref={fileInput} id="edit-image" type="file" accept={ALLOWED_TYPES.join(',')} onChange={selectFile} disabled={saving} className="hidden" />
              {(preview || existingImage) && (
                <div className="relative overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
                  <img src={preview || existingImage || ''} alt="Post photo" className="max-h-96 w-full object-contain" />
                  <button type="button" onClick={removeImage} disabled={saving} aria-label="Remove photo" className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white"><X className="h-4 w-4" /></button>
                </div>
              )}
              <label htmlFor="edit-image" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 px-4 py-4 text-sm hover:border-blue-500 dark:border-neutral-700">
                <ImagePlus className="h-5 w-5" /> {preview || existingImage ? 'Replace photo' : 'Add photo'}
              </label>
            </div>
            <div className="flex gap-3">
              <Link href="/" className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-center text-sm font-semibold dark:border-neutral-700">Cancel</Link>
              <button type="submit" disabled={saving || (!caption.trim() && !existingImage && !newFile)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </main>
    </AppShell>
  );
}
