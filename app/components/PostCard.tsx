'use client';
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Flag,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import ReportModal from '@/app/components/ReportModal';
interface Profile {
  id: string;
  username: string;
  avatar: string | null;
}
interface Comment {
  id: string;
  user_id: string;
  text: string;
  created_at?: string;
  profiles: {
    username: string;
    avatar: string | null;
  } | null;
}
interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    image: string | null;
    caption: string | null;
    created_at: string;
    profiles: Profile | null;
  };
  currentUserId: string;
  onDeleted?: (postId: string) => void;
}
// Render URLs as safe links while leaving other comment text escaped by React.
function CommentText({ text }: { text: string }) {
  const parts = text.split(/((?:https?:\/\/|www\.)[^\s<>]+)/gi);
  return (
    <>
      {parts.map((part, index) => {
        if (!/^(?:https?:\/\/|www\.)/i.test(part)) {
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }
        const trailing = part.match(/[.,!?;:]+$/)?.[0] || '';
        const candidate = trailing ? part.slice(0, -trailing.length) : part;
        try {
          const url = new URL(/^www\./i.test(candidate) ? `https://${candidate}` : candidate);
          if (!['https:', 'http:'].includes(url.protocol) || !url.hostname) {
            return <React.Fragment key={index}>{part}</React.Fragment>;
          }
          return (
            <React.Fragment key={index}>
              <a
                href={url.href}
                target="_blank"
                rel="noopener noreferrer ugc nofollow"
                className="break-all text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
              >
                {candidate}
              </a>
              {trailing}
            </React.Fragment>
          );
        } catch {
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }
      })}
    </>
  );
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
export default function PostCard({
  post,
  currentUserId,
  onDeleted,
}: PostCardProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);