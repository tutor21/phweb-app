'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { Upload } from 'lucide-react';

export default function CreatePostPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to post.');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          image: publicUrl,
          caption,
        });

      if (insertError) throw insertError;

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error uploading post');
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-6 tracking-tight">Create New Post</h1>

        {error && (
          <div className="mb-4 p-3 text-sm bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-6">
          {preview ? (
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
              <img src={preview} alt="Preview" className="object-cover w-full h-full" />
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-3 right-3 px-3 py-1 bg-black/70 text-white rounded-lg text-xs font-medium"
              >
                Change Photo
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center aspect-square w-full rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 cursor-pointer hover:border-black dark:hover:border-white transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                <Upload className="w-10 h-10 mb-3 text-neutral-400" />
                <p className="text-sm font-semibold mb-1">Click to upload photo</p>
                <p className="text-xs text-neutral-500">PNG, JPG or GIF (up to 10MB)</p>
              </div>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" required />
            </label>
          )}

          <div>
            <textarea
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Share Post'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}