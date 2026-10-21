'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { AlertCircle, Check, Image as ImageIcon, Loader2, ShieldCheck, Type, Upload, X, Palette } from 'lucide-react';

const MAX_CAPTION_LENGTH = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const THEMES = [
  { id: 'classic', name: 'Classic', background: '#f5f5f5', color: '#171717' },
  { id: 'ocean', name: 'Ocean', background: 'linear-gradient(135deg,#1769e0,#05c8ed)', color: '#ffffff' },
  { id: 'sunset', name: 'Sunset', background: 'linear-gradient(135deg,#ff5b62,#ffad42)', color: '#ffffff' },
  { id: 'purple', name: 'Purple', background: 'linear-gradient(135deg,#7028d8,#d45de5)', color: '#ffffff' },
  { id: 'forest', name: 'Forest', background: 'linear-gradient(135deg,#125b3b,#41b96b)', color: '#ffffff' },
  { id: 'midnight', name: 'Midnight', background: 'linear-gradient(135deg,#14142f,#444a84)', color: '#ffffff' },
  { id: 'rose', name: 'Rose', background: 'linear-gradient(135deg,#ec4899,#fda4af)', color: '#ffffff' },
] as const;

type ThemeId = (typeof THEMES)[number]['id'];
type Preview = { file: File; url: string };

export default function CreatePostPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submittingRef = useRef(false);
  const previewRef = useRef<Preview | null>(null);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => { previewRef.current = preview; }, [preview]);
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
  }, []);

  const hasText = caption.trim().length > 0;
  const hasImage = !!preview;
  const selectedTheme = THEMES.find(item => item.id === theme);
  const canPublish = (hasText || hasImage) && caption.length <= MAX_CAPTION_LENGTH && !loading;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    setErrorMessage('');
    setStatusMessage('');
    if (files.length !== 1) {
      setErrorMessage('Only one photo is allowed per post.');
      return;
    }
    const file = files[0];
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage('Only JPEG, PNG and WebP photos are supported.');
      return;
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setErrorMessage('The photo must be no larger than 5 MB.');
      return;
    }
    setPreview(previous => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { file, url: URL.createObjectURL(file) };
    });
    setTheme(null);
  }

  function removeImage() {
    setPreview(previous => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const trimmedCaption = caption.trim();
    if (!trimmedCaption && !preview) {
      setErrorMessage('Add text or a photo before publishing.');
      return;
    }
    if (trimmedCaption.length > MAX_CAPTION_LENGTH) {
      setErrorMessage('Caption exceeds 500 characters.');
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    setErrorMessage('');
    setStatusMessage(preview ? 'Scanning your photo before publication...' : 'Publishing your post...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.replace('/login');
        return;
      }
      const formData = new FormData();
      formData.append('caption', trimmedCaption);
      if (preview) formData.append('images', preview.file);
      if (!preview && trimmedCaption && theme) formData.append('background_theme', theme);
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to publish your post.');
      setStatusMessage('Post published successfully!');
      router.replace('/');
      router.refresh();
    } catch (error) {
      setStatusMessage('');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to publish your post.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">Create New Post</h1>
          <p className="text-sm text-neutral-500">Share your thoughts, choose a text background, or add one photo.</p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">PHWeb Photo Safety</p>
            <p className="mt-1 leading-6">Every photo is checked before publication. Nudity, pornography and sexually explicit images are prohibited. Photos needing review are not published automatically.</p>
          </div>
        </div>
        {errorMessage && <div role="alert" className="flex gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400"><AlertCircle className="h-4 w-4 shrink-0" />{errorMessage}</div>}
        {statusMessage && <div role="status" className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-950/20 dark:text-blue-300">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{statusMessage}</div>}
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-black">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="post-caption" className="flex items-center gap-2 text-sm font-semibold"><Type className="h-4 w-4 text-blue-600" />Your Post</label>
              <span className="text-xs text-neutral-400">{caption.length} / {MAX_CAPTION_LENGTH}</span>
            </div>
            <textarea id="post-caption" value={caption} onChange={event => setCaption(event.target.value)} rows={5} maxLength={MAX_CAPTION_LENGTH} placeholder="What's on your mind?" disabled={loading} className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-base outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-900" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Palette className="h-4 w-4 text-blue-600" />Text Background <span className="text-xs font-normal text-neutral-400">(Optional)</span></div>
            <p className="text-xs text-neutral-500">Backgrounds are available for text-only posts.</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Choose text background">
              <button type="button" disabled={loading || hasImage} onClick={() => setTheme(null)} aria-label="No background" aria-pressed={theme === null} className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 bg-white text-xs text-neutral-800 disabled:opacity-40 ${theme === null ? 'border-blue-600' : 'border-neutral-300'}`}>None</button>
              {THEMES.map(item => <button key={item.id} type="button" disabled={loading || hasImage} onClick={() => setTheme(item.id)} aria-label={`${item.name} background`} title={item.name} aria-pressed={theme === item.id} className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 disabled:opacity-40 ${theme === item.id ? 'border-blue-600 ring-2 ring-blue-300' : 'border-transparent'}`} style={{ background: item.background, color: item.color }}>{theme === item.id && <Check className="h-5 w-5" />}</button>)}
            </div>
            {selectedTheme && !hasImage && <div className="flex min-h-52 items-center justify-center rounded-2xl px-6 py-10 text-center" style={{ background: selectedTheme.background, color: selectedTheme.color }}><p className="whitespace-pre-wrap break-words text-xl font-bold leading-relaxed">{caption.trim() || 'Your colorful post preview'}</p></div>}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="h-4 w-4 text-blue-600" />Photo <span className="text-xs font-normal text-neutral-400">(Optional)</span></div><span className="text-xs text-neutral-500">{hasImage ? 1 : 0} / 1</span></div>
            <input ref={fileInputRef} id="post-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={loading} className="hidden" />
            {preview && <div className="relative overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900"><img src={preview.url} alt="Selected photo preview" className="max-h-[450px] w-full object-contain" /><button type="button" onClick={removeImage} disabled={loading} aria-label="Remove photo" className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white"><X className="h-4 w-4" /></button></div>}
            <label htmlFor="post-image" className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm font-semibold hover:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900/50 ${loading ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-5 w-5" />{preview ? 'Replace photo' : 'Add one photo'}</label>
            <p className="text-xs text-neutral-500">JPEG, PNG or WebP · 5 MB maximum · One photo per post</p>
          </div>
          <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm dark:bg-neutral-900"><span className="text-neutral-500">Post type: </span><span className="font-semibold">{hasText && hasImage ? 'Text and Photo' : hasImage ? 'Photo Only' : hasText && theme ? 'Colorful Text' : hasText ? 'Text Only' : 'Nothing added yet'}</span></div>
          <button type="submit" disabled={!canPublish} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Checking and publishing...</> : <><Check className="h-4 w-4" />Publish Post</>}</button>
        </form>
      </main>
    </AppShell>
  );
}
