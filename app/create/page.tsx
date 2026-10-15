
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import { useRouter } from 'next/navigation';
import {
  Image as ImageIcon,
  Upload,
  AlertCircle,
  Check,
  Loader2,
  X,
  Type,
} from 'lucide-react';

const MAX_CAPTION_LENGTH = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object') {
    const details = error as {
      message?: string;
      error_description?: string;
      code?: string;
    };

    if (details.message) {
      return details.code
        ? `${details.code}: ${details.message}`
        : details.message;
    }

    if (details.error_description) {
      return details.error_description;
    }
  }

  return 'Failed to publish your post. Please try again.';
}

export default function CreatePostPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const hasText = caption.trim().length > 0;
  const hasImage = imageFile !== null;
  const canPublish =
    (hasText || hasImage) &&
    caption.length <= MAX_CAPTION_LENGTH &&
    !loading;

  // Release temporary image URLs when changed or unmounted.
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [imageFile]);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('');

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage(
        'Invalid file format. Only JPEG, PNG, WebP, GIF, and AVIF images are accepted.'
      );
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(
        'File size exceeds the 5 MB limit. Please choose a smaller image.'
      );
      event.target.value = '';
      return;
    }

    setImageFile(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setErrorMessage('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (loading) return;

    setErrorMessage('');
    setSuccessMessage('');

    const trimmedCaption = caption.trim();

    // Allow text, image, or both.
    if (!trimmedCaption && !imageFile) {
      setErrorMessage(
        'Please write something or upload an image before publishing.'
      );
      return;
    }

    if (caption.length > MAX_CAPTION_LENGTH) {
      setErrorMessage(
        `Post text cannot exceed ${MAX_CAPTION_LENGTH} characters.`
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.replace('/login');
        return;
      }

      // Text-only posts have no image URL.
      let imageUrl: string | null = null;
      let uploadedFilePath: string | null = null;

      // Only upload when an image is attached.
      if (imageFile) {
        const extension =
          imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';

        const fileName = `${user.id}-${crypto.randomUUID()}.${extension}`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, imageFile, {
            upsert: false,
            contentType: imageFile.type,
          });

        if (uploadError) throw uploadError;

        uploadedFilePath = filePath;

        const {
          data: { publicUrl },
        } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Insert post into Supabase.
      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: trimmedCaption,
          image: imageUrl,
        });

      if (insertError) {
        // Clean up an uploaded image if the database insert fails.
        if (uploadedFilePath) {
          const { error: cleanupError } = await supabase.storage
            .from('posts')
            .remove([uploadedFilePath]);

          if (cleanupError) {
            console.warn(
              'Unable to clean up uploaded image:',
              cleanupError.message
            );
          }
        }

        throw insertError;
      }

      setSuccessMessage('Post published successfully!');
      setCaption('');
      setImageFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      router.push('/');
      router.refresh();
    } catch (error: unknown) {
      console.error('Error creating post:', error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        {/* PAGE HEADER */}
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">
            Create New Post
          </h1>

          <p className="text-sm text-neutral-500">
            Share your thoughts, photos, or both with the phweb.app
            community.
          </p>
        </div>

        {/* ERROR MESSAGE */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/20"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-600 dark:bg-emerald-950/20"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-black"
        >
          {/* TEXT INPUT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="post-caption"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <Type className="h-4 w-4 text-blue-600" />
                Your Post
              </label>

              <span
                className={`text-xs ${
                  caption.length > MAX_CAPTION_LENGTH
                    ? 'font-bold text-red-500'
                    : 'text-neutral-400'
                }`}
              >
                {caption.length} / {MAX_CAPTION_LENGTH}
              </span>
            </div>

            <textarea
              id="post-caption"
              value={caption}
              onChange={(event) =>
                setCaption(event.target.value)
              }
              rows={6}
              maxLength={MAX_CAPTION_LENGTH}
              placeholder="What's on your mind?"
              disabled={loading}
              className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm outline-none transition focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
            />

            <p className="text-xs text-neutral-500">
              You can publish text without adding a photo.
            </p>
          </div>

          {/* IMAGE ATTACHMENT */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ImageIcon className="h-4 w-4 text-blue-600" />
              Photo
              <span className="text-xs font-normal text-neutral-400">
                (Optional)
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
              id="post-image"
            />

            {imagePreview ? (
              <div className="relative flex max-h-[450px] aspect-square items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                <img
                  src={imagePreview}
                  alt="Selected photo preview"
                  className="h-full w-full object-contain"
                />

                <button
                  type="button"
                  onClick={removeImage}
                  disabled={loading}
                  aria-label="Remove selected image"
                  className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white transition hover:bg-black disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="post-image"
                className={`flex aspect-video flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 transition dark:border-neutral-700 dark:bg-neutral-900/50 ${
                  loading
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:border-blue-500'
                }`}
              >
                <Upload className="mb-3 h-10 w-10 text-neutral-400" />

                <span className="text-sm font-semibold">
                  Add a photo
                </span>

                <span className="mt-1 px-3 text-center text-xs text-neutral-400">
                  JPEG, PNG, WebP, GIF, AVIF (Max 5 MB)
                </span>
              </label>
            )}
          </div>

          {/* POST TYPE */}
          <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm dark:bg-neutral-900">
            <span className="text-neutral-500">
              Post type:{' '}
            </span>

            <span className="font-semibold">
              {hasText && hasImage
                ? 'Text and Photo'
                : hasText
                ? 'Text Only'
                : hasImage
                ? 'Photo Only'
                : 'Nothing added yet'}
            </span>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={!canPublish}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Publish Post
              </>
            )}
          </button>
        </form>
      </main>
    </AppShell>
  );
}
