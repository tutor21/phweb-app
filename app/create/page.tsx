'use client';

import React, { useState, useMemo } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Upload, AlertCircle, Check, Loader2, X } from 'lucide-react';

export default function CreatePostPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const MAX_CAPTION_LENGTH = 500;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('');

    // Validate file extension / MIME type
    if (!file.type.startsWith('image/') || !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage('Invalid file format. Only image files (JPEG, PNG, WebP, GIF, AVIF) are accepted.');
      return;
    }

    // Validate file size (max 5 MB)
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('File size exceeds the 5MB limit. Please choose a smaller image.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setImagePreview(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!imageFile && !imagePreview) {
      setErrorMessage('Please upload an image for your post.');
      return;
    }

    if (caption.length > MAX_CAPTION_LENGTH) {
      setErrorMessage(`Caption cannot exceed ${MAX_CAPTION_LENGTH} characters.`);
      return;
    }

    setLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace('/login');
        return;
      }

      let imageUrl = imagePreview;

      // If we have a raw file, upload it to Supabase Storage 'posts' bucket
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, imageFile, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Insert post into database
      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          image: imageUrl,
          caption: caption.trim(),
        });

      if (insertError) {
        throw insertError;
      }

      setSuccessMessage('Post published successfully!');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error('Error creating post:', err);
      const msg = err?.message || err?.error_description || (typeof err === 'object' && err !== null ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : String(err));
      setErrorMessage(
        msg === '{}' || !msg
          ? 'Failed to publish post. Ensure the "posts" storage bucket exists and RLS policies are applied in Supabase.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Create New Post</h1>
          <p className="text-sm text-neutral-500">
            Share moments with the phweb.app community. Max image size: 5MB.
          </p>
        </div>

        {errorMessage && (
          <div role="alert" className="p-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/20 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div role="status" className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-black space-y-6">
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 aspect-square max-h-[450px] flex items-center justify-center border border-neutral-200 dark:border-neutral-800">
              <img src={imagePreview} alt="Upload preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white p-2 rounded-full transition"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition group bg-neutral-50 dark:bg-neutral-900/50">
              <Upload className="w-10 h-10 text-neutral-400 group-hover:text-blue-500 transition mb-3" />
              <span className="font-semibold text-sm text-neutral-700 dark:text-neutral-300">Click to upload image</span>
              <span className="text-xs text-neutral-400 mt-1">JPEG, PNG, WebP, GIF, AVIF (Max 5MB)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Caption
              </label>
              <span className={`text-xs ${caption.length > MAX_CAPTION_LENGTH ? 'text-red-500 font-bold' : 'text-neutral-400'}`}>
                {caption.length} / {MAX_CAPTION_LENGTH}
              </span>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              maxLength={MAX_CAPTION_LENGTH}
              placeholder="Write a caption for your post..."
              className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !imagePreview || caption.length > MAX_CAPTION_LENGTH}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <span>Publish Post</span>
            )}
          </button>
        </form>
      </div>
    </AppShell>
  );
}