
'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import type {
  ChangeEvent,
  FormEvent,
} from 'react';

import { useRouter } from 'next/navigation';

import {
  Settings,
  LogOut,
  Check,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';

import { createClient } from '@/app/utils/supabase/client';
import AppShell from '@/app/components/AppShell';
import ThemeSelector from '@/app/components/ThemeSelector';

const MAX_BIO_LENGTH = 160;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

interface Profile {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  bio: string | null;
}

interface ErrorDetails {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

function getErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;

    return {
      code:
        typeof record.code === 'string'
          ? record.code
          : undefined,
      message:
        typeof record.message === 'string'
          ? record.message
          : undefined,
      details:
        typeof record.details === 'string'
          ? record.details
          : undefined,
      hint:
        typeof record.hint === 'string'
          ? record.hint
          : undefined,
    };
  }

  return {
    message: String(error),
  };
}

function formatError(error: unknown): string {
  const details = getErrorDetails(error);

  const parts = [
    details.code ? `Code ${details.code}` : '',
    details.message ?? '',
    details.details ?? '',
    details.hint ? `Hint: ${details.hint}` : '',
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(' — ')
    : 'Unknown error. Check your Supabase schema and permissions.';
}

function sanitizeBio(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .slice(0, MAX_BIO_LENGTH);
}

export default function SettingsPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar, bio')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const profile = data as Profile | null;

      setName(profile?.name ?? '');
      setUsername(profile?.username ?? '');
      setAvatar(profile?.avatar ?? '');
      setBio(profile?.bio ?? '');
    } catch (error: unknown) {
      const details = getErrorDetails(error);

      console.warn('PROFILE_LOAD_DIAGNOSTICS', {
        code: details.code ?? 'UNKNOWN',
        message: details.message ?? 'Unknown error',
        details: details.details ?? '',
        hint: details.hint ?? '',
      });

      setErrorMessage(
        `Unable to load profile: ${formatError(error)}`
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('');

    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      setErrorMessage(
        'Invalid image format. Use JPEG, PNG, WebP, GIF, or AVIF.'
      );
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setErrorMessage(
        'Avatar image must be 5 MB or smaller.'
      );
      event.target.value = '';
      return;
    }

    setUploadingAvatar(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.replace('/login');
        return;
      }

      const extension = ALLOWED_IMAGE_TYPES[file.type];

      const fileName = `${crypto.randomUUID()}.${extension}`;

      // Uploads to the authenticated user's folder.
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatar(data.publicUrl);

      setSuccessMessage(
        'Avatar uploaded successfully. Click Save Changes to apply it.'
      );
    } catch (error: unknown) {
      const details = getErrorDetails(error);

      console.warn('AVATAR_UPLOAD_DIAGNOSTICS', {
        code: details.code ?? 'UNKNOWN',
        message: details.message ?? 'Unknown error',
        details: details.details ?? '',
        hint: details.hint ?? '',
      });

      setErrorMessage(
        `Avatar upload failed: ${formatError(error)}`
      );
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleBioChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    setBio(sanitizeBio(event.target.value));
  };

  const handleSave = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (saving || uploadingAvatar) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanAvatar = avatar.trim();
    const cleanBio = sanitizeBio(bio.trim());

    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      setErrorMessage(
        'Username must contain 3–30 letters, numbers, or underscores.'
      );
      return;
    }

    if (cleanName.length > 100) {
      setErrorMessage(
        'Display name must be 100 characters or fewer.'
      );
      return;
    }

    if (cleanBio.length > MAX_BIO_LENGTH) {
      setErrorMessage(
        'Biography must be 160 characters or fewer.'
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.replace('/login');
        return;
      }

      // These column names must exist in your profiles table.
      const payload = {
        name: cleanName,
        username: cleanUsername,
        avatar: cleanAvatar,
        bio: cleanBio,
      };

      // Check whether this user already has a profile.
      const {
        data: existingProfile,
        error: lookupError,
      } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (lookupError) {
        throw lookupError;
      }

      if (existingProfile) {
        // Update an existing profile.
        const { data, error: updateError } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id)
          .select('id')
          .single();

        if (updateError) {
          throw updateError;
        }

        if (!data) {
          throw new Error(
            'Profile update did not return a record.'
          );
        }
      } else {
        // Insert only when no profile exists.
        const { data, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            ...payload,
          })
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        if (!data) {
          throw new Error(
            'Profile creation did not return a record.'
          );
        }
      }

      setUserId(user.id);
      setName(cleanName);
      setUsername(cleanUsername);
      setAvatar(cleanAvatar);
      setBio(cleanBio);

      setSuccessMessage(
        'Profile settings updated successfully!'
      );

      router.refresh();
    } catch (error: unknown) {
      const details = getErrorDetails(error);

      console.warn('PROFILE_SAVE_DIAGNOSTICS', {
        code: details.code ?? 'UNKNOWN',
        message: details.message ?? 'Unknown error',
        details: details.details ?? '',
        hint: details.hint ?? '',
      });

      if (details.code === '23505') {
        setErrorMessage(
          'This username or another unique profile value is already in use.'
        );
      } else {
        setErrorMessage(
          `Profile save failed: ${formatError(error)}`
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMessage('');

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(
        `Sign out failed: ${formatError(error)}`
      );
      return;
    }

    router.replace('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex min-h-[80vh] items-center justify-center">
          <div className="flex items-center gap-3 text-neutral-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading settings...</span>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <header>
          <div className="mb-1 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />

            <h1 className="text-2xl font-bold">
              Account Settings
            </h1>
          </div>

          <p className="text-sm text-neutral-500">
            Manage your Socials appearance, profile information, and avatar.
          </p>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <span className="break-words">
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/20"
          >
            <Check className="h-4 w-4 shrink-0" />

            <span>{successMessage}</span>
          </div>
        )}

        {/* Theme selection is independent of profile saving. */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-black">
          <ThemeSelector />
        </section>

        <form
          onSubmit={handleSave}
          className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-black"
        >
          {/* Avatar */}
          <section className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Profile Avatar
            </label>

            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-400">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold transition hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                  {uploadingAvatar ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}

                  <span>
                    {uploadingAvatar
                      ? 'Uploading image...'
                      : 'Upload Avatar Image'}
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    onChange={handleAvatarFileChange}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                </label>

                <p className="text-xs text-neutral-500">
                  JPEG, PNG, WebP, GIF, or AVIF. Maximum 5 MB.
                </p>
              </div>
            </div>
          </section>

          {/* Display name */}
          <div>
            <label
              htmlFor="display-name"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500"
            >
              Display Name
            </label>

            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              placeholder="Your full name"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
            />
          </div>

          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500"
            >
              Username
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={30}
              required
              autoComplete="username"
              placeholder="username"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
            />

            <p className="mt-1 text-xs text-neutral-500">
              3–30 characters. Letters, numbers, and underscores.
            </p>
          </div>

          {/* Biography */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label
                htmlFor="biography"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-500"
              >
                Biography
              </label>

              <span className="text-xs text-neutral-400">
                {bio.length}/{MAX_BIO_LENGTH}
              </span>
            </div>

            <textarea
              id="biography"
              value={bio}
              onChange={handleBioChange}
              rows={3}
              maxLength={MAX_BIO_LENGTH}
              placeholder="Tell the world about yourself..."
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
            />

            <p className="mt-1 text-xs text-neutral-500">
              Plain text only. Maximum 160 characters.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={
                saving ||
                uploadingAvatar ||
                !userId
              }
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && (
                <RefreshCw className="h-4 w-4 animate-spin" />
              )}

              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </form>
      </main>
    </AppShell>
  );
}
