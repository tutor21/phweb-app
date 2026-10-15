
'use client';

import Link from 'next/link';
import { ImagePlus, PenLine, UserRound } from 'lucide-react';

interface HomePostComposerProps {
  username?: string | null;
  avatar?: string | null;
}

export default function HomePostComposer({
  username,
  avatar,
}: HomePostComposerProps) {
  return (
    <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          aria-label="View your profile"
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
        >
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound
              size={22}
              className="text-neutral-500"
            />
          )}
        </Link>

        <Link
          href="/create"
          className="flex min-h-11 flex-1 items-center rounded-full bg-neutral-100 px-4 text-left text-sm text-neutral-500 transition-colors hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          {username
            ? `What's on your mind, ${username}?`
            : "What's on your mind?"}
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <Link
          href="/create"
          className="flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          <ImagePlus
            size={20}
            className="text-green-600"
          />
          Photo
        </Link>

        <Link
          href="/create"
          className="flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          <PenLine
            size={20}
            className="text-blue-600"
          />
          Text Post
        </Link>
      </div>
    </section>
  );
}
