
'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';

import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  Type,
  Upload,
  X,
} from 'lucide-react';

const MAX_CAPTION_LENGTH = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export default function CreatePostPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submittingRef = useRef(false);

  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const hasText = caption.trim().length > 0;
  const hasImage = imageFile !== null;

  const canPublish =
    (hasText || hasImage) &&
    caption.length <= MAX_CAPTION_LENGTH &&
    !loading;

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

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setStatusMessage('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage(
        'Only JPEG, PNG and WebP images are supported.'
      );
      event.target.value = '';
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setErrorMessage(
        'Please choose an image smaller than 5 MB.'
      );
      event.target.value = '';
      return;
    }

    setImageFile(file);
  }

  function removeImage() {
    setImageFile(null);
    setErrorMessage('');
    setStatusMessage('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (submittingRef.current) return;

    const trimmedCaption = caption.trim();

    if (!trimmedCaption && !imageFile) {
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
    setStatusMessage(
      imageFile
        ? 'Scanning your photo before publication...'
        : 'Publishing your post...'
    );

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace('/login');
        return;
      }

      const formData = new FormData();
      formData.append('caption', trimmedCaption);

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to publish your post.'
        );
      }

      setStatusMessage('Post published successfully!');
      router.replace('/');
      router.refresh();
    } catch (error) {
      setStatusMessage('');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to publish your post.'
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">
            Create New Post
          </h1>
          <p className="text-sm text-neutral-500">
            Share your thoughts, photos, or both with
            the Socials community.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              Socials Photo Safety
            </p>
            <p className="mt-1 leading-6">
              Photos are automatically checked before publication.
              Nudity, pornography and sexually explicit images
              are prohibited. Images that need additional review
              will not be published automatically.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {statusMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-black"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="post-caption"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <Type className="h-4 w-4 text-blue-600" />
                Your Post
              </label>

              <span className="text-xs text-neutral-400">
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
              id="post-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative flex aspect-square max-h-[450px] items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                {/* Local blob preview */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white hover:bg-black disabled:opacity-50"
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
                  JPEG, PNG or WebP (Max 5 MB)
                </span>
              </label>
            )}
          </div>

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

          <button
            type="submit"
            disabled={!canPublish}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {imageFile
                  ? 'Checking and publishing...'
                  : 'Publishing...'}
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
