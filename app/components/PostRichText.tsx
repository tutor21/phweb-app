'use client';

import React from 'react';
import Link from 'next/link';

type Props = { text: string };

// URL tokens take priority so hashtags inside URLs aren't turned into separate links.
const TOKEN_REGEX = /(?:https?:\/\/|www\.)[^\s<>]+|(^|[^\p{L}\p{N}_])#[\p{L}\p{N}_]+/giu;
const URL_START = /^(?:https?:\/\/|www\.)/i;
const HASHTAG = /^#[\p{L}\p{N}_]+$/u;

export default function PostRichText({ text }: Props) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = 0;

  for (const match of text.matchAll(TOKEN_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    const token = match[0];
    const prefix = match[1] ?? '';
    if (prefix) nodes.push(prefix);
    const content = prefix ? token.slice(prefix.length) : token;

    if (URL_START.test(content)) {
      const trailing = content.match(/[.,!?;:]+$/)?.[0] ?? '';
      const candidate = trailing ? content.slice(0, -trailing.length) : content;
      try {
        const url = new URL(/^www\./i.test(candidate) ? `https://${candidate}` : candidate);
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Invalid URL');
        nodes.push(
          <a key={`url-${index++}`} href={url.href} target="_blank" rel="noopener noreferrer ugc nofollow" className="break-all text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            {candidate}
          </a>
        );
        if (trailing) nodes.push(trailing);
      } catch {
        nodes.push(content);
      }
    } else if (HASHTAG.test(content)) {
      const tag = content.slice(1);
      nodes.push(
        <Link key={`tag-${index++}`} href={`/hashtag/${encodeURIComponent(tag.toLowerCase())}`} className="text-blue-600 hover:underline dark:text-blue-400">
          {content}
        </Link>
      );
    } else {
      nodes.push(content);
    }
    lastIndex = start + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return <>{nodes}</>;
}
