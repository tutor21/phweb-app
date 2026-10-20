'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { AlertCircle, Check, Image as ImageIcon, Loader2, ShieldCheck, Type, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';

const MAX_CAPTION_LENGTH = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
type Preview = { id: string; file: File; url: string };

export default function CreatePostPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submittingRef = useRef(false);
  const [caption, setCaption] = useState('');
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const previewsRef = useRef<Preview[]>([]);
  useEffect(() => { previewsRef.current = previews; }, [previews]);
  useEffect(() => () => { previewsRef.current.forEach(item => URL.revokeObjectURL(item.url)); }, []);
  const hasText = caption.trim().length > 0;
  const hasImage = previews.length > 0;
  const canPublish = (hasText || hasImage) && caption.length <= MAX_CAPTION_LENGTH && !loading;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    setErrorMessage(''); setStatusMessage('');
    if (files.length + previews.length > MAX_IMAGES) {
      setErrorMessage(`You can upload up to ${MAX_IMAGES} photos per post.`); return;
    }
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) { setErrorMessage('Only JPEG, PNG and WebP photos are supported.'); return; }
      if (file.size === 0 || file.size > MAX_FILE_SIZE) { setErrorMessage('Each photo must be no larger than 5 MB.'); return; }
    }
    setPreviews(previous => [...previous, ...files.map(file => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))]);
  }
  function removeImage(id: string) {
    setPreviews(previous => {
      const item = previous.find(photo => photo.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return previous.filter(photo => photo.id !== id);
    });
  }
  function moveImage(index: number, delta: number) {
    setPreviews(previous => {
      const nextIndex = index + delta;
      if (nextIndex < 0 || nextIndex >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;
    const trimmedCaption = caption.trim();
    if (!trimmedCaption && !previews.length) { setErrorMessage('Add text or photos before publishing.'); return; }
    if (trimmedCaption.length > MAX_CAPTION_LENGTH) { setErrorMessage('Caption exceeds 500 characters.'); return; }
    submittingRef.current = true; setLoading(true); setErrorMessage('');
    setStatusMessage(previews.length ? `Scanning ${previews.length} photo(s) before publication...` : 'Publishing your post...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) { router.replace('/login'); return; }
      const formData = new FormData();
      formData.append('caption', trimmedCaption);
      previews.forEach(item => formData.append('images', item.file));
      const response = await fetch('/api/posts', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to publish your post.');
      setStatusMessage('Post published successfully!');
      router.replace('/'); router.refresh();
    } catch (error) {
      setStatusMessage(''); setErrorMessage(error instanceof Error ? error.message : 'Failed to publish your post.');
    } finally { submittingRef.current = false; setLoading(false); }
  }
  return <AppShell><main className="mx-auto max-w-xl space-y-6 px-4 py-8">
    <div><h1 className="mb-1 text-2xl font-bold tracking-tight">Create New Post</h1><p className="text-sm text-neutral-500">Share your thoughts and up to five photos with PHWeb.</p></div>
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0"/><div><p className="font-semibold">PHWeb Photo Safety</p><p className="mt-1 leading-6">Every photo is checked before publication. Nudity, pornography and sexually explicit images are prohibited. Photos needing review are not published automatically.</p></div></div>
    {errorMessage && <div role="alert" className="flex gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400"><AlertCircle className="h-4 w-4 shrink-0"/>{errorMessage}</div>}
    {statusMessage && <div role="status" className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-950/20 dark:text-blue-300">{loading && <Loader2 className="h-4 w-4 animate-spin"/>}{statusMessage}</div>}
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-black">
      <div className="space-y-3"><div className="flex items-center justify-between"><label htmlFor="post-caption" className="flex items-center gap-2 text-sm font-semibold"><Type className="h-4 w-4 text-blue-600"/>Your Post</label><span className="text-xs text-neutral-400">{caption.length} / {MAX_CAPTION_LENGTH}</span></div><textarea id="post-caption" value={caption} onChange={event => setCaption(event.target.value)} rows={6} maxLength={MAX_CAPTION_LENGTH} placeholder="What's on your mind?" disabled={loading} className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-900"/></div>
      <div className="space-y-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="h-4 w-4 text-blue-600"/>Photos <span className="text-xs font-normal text-neutral-400">(Optional)</span></div><span className="text-xs text-neutral-500">{previews.length} / {MAX_IMAGES}</span></div>
        <input ref={fileInputRef} id="post-images" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={loading || previews.length >= MAX_IMAGES} className="hidden"/>
        {previews.length > 0 ? <><div ref={galleryRef} className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-3" aria-label="Selected photo previews">{previews.map((photo, index) => <div key={photo.id} className="relative h-64 w-[78%] max-w-[310px] shrink-0 snap-center overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900"><img src={photo.url} alt={`Photo ${index + 1} preview`} className="h-full w-full object-cover"/><button type="button" onClick={() => removeImage(photo.id)} disabled={loading} aria-label={`Remove photo ${index + 1}`} className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white"><X className="h-4 w-4"/></button><div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs text-white"><button type="button" disabled={loading || index === 0} onClick={() => moveImage(index, -1)} aria-label={`Move photo ${index + 1} left`} className="disabled:opacity-30"><ChevronLeft className="h-4 w-4"/></button>{index + 1} / {previews.length}<button type="button" disabled={loading || index === previews.length - 1} onClick={() => moveImage(index, 1)} aria-label={`Move photo ${index + 1} right`} className="disabled:opacity-30"><ChevronRight className="h-4 w-4"/></button></div></div>)}</div><p className="text-xs text-neutral-500">Swipe to preview. Use arrows on each photo to reorder.</p></> : null}
        {previews.length < MAX_IMAGES && <label htmlFor="post-images" className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm font-semibold hover:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900/50 ${loading ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-5 w-5"/>{previews.length ? 'Add more photos' : 'Add up to 5 photos'}</label>}
        <p className="text-xs text-neutral-500">JPEG, PNG or WebP · 5 MB per photo · 5 photos maximum</p>
      </div>
      <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm dark:bg-neutral-900"><span className="text-neutral-500">Post type: </span><span className="font-semibold">{hasText && hasImage ? 'Text and Photos' : hasText ? 'Text Only' : hasImage ? 'Photos Only' : 'Nothing added yet'}</span></div>
      <button type="submit" disabled={!canPublish} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin"/>Checking and publishing...</> : <><Check className="h-4 w-4"/>Publish Post</>}</button>
    </form>
  </main></AppShell>;
}
