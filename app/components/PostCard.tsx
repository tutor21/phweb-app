'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Heart, MessageCircle, Bookmark, Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReportModal from '@/app/components/ReportModal';

interface Profile {
  id: string;
  username: string;
  avatar: string | null;
}

interface Comment {
  id: string;
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
    image: string;
    caption: string;
    created_at: string;
    profiles: Profile | null;
  };
  currentUserId: string;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const router = useRouter();
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isTogglingSave, setIsTogglingSave] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const authorId = post.profiles?.id || post.user_id;

  useEffect(() => {
    let active = true;

    async function fetchPostInteractions() {
      const [likesResult, likeResult, saveResult, commentsResult] = await Promise.all([
        supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id),

        currentUserId
          ? supabase
              .from('likes')
              .select('user_id')
              .eq('post_id', post.id)
              .eq('user_id', currentUserId)
              .maybeSingle()
          : Promise.resolve({ data: null }),

        currentUserId
          ? supabase
              .from('saved_posts')
              .select('user_id')
              .eq('post_id', post.id)
              .eq('user_id', currentUserId)
              .maybeSingle()
          : Promise.resolve({ data: null }),

        supabase
          .from('comments')
          .select('*, profiles(username, avatar)')
          .eq('post_id', post.id)
          .order('created_at', { ascending: true }),
      ]);

      if (!active) return;

      if (!likesResult.error) {
        setLikes(likesResult.count || 0);
      }

      setIsLiked(!!likeResult.data);
      setIsSaved(!!saveResult.data);

      if (!commentsResult.error) {
        setComments((commentsResult.data || []) as Comment[]);
      }
    }

    void fetchPostInteractions();

    return () => {
      active = false;
    };
  }, [post.id, currentUserId, supabase]);

  const toggleLike = async () => {
    if (!currentUserId || isTogglingLike) return;

    setIsTogglingLike(true);
    const wasLiked = isLiked;

    setIsLiked(!wasLiked);
    setLikes((prev) => Math.max(0, prev + (wasLiked ? -1 : 1)));

    const { error } = wasLiked
      ? await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
      : await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId });

    if (error) {
      setIsLiked(wasLiked);
      setLikes((prev) => Math.max(0, prev + (wasLiked ? 1 : -1)));
      console.error('Error updating like:', error.message);
    }

    setIsTogglingLike(false);
  };

  const toggleSave = async () => {
    if (!currentUserId || isTogglingSave) return;

    setIsTogglingSave(true);
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);

    const { error } = wasSaved
      ? await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', currentUserId)
      : await supabase.from('saved_posts').insert({ post_id: post.id, user_id: currentUserId });

    if (error) {
      setIsSaved(wasSaved);
      console.error('Error updating bookmark:', error.message);
    }

    setIsTogglingSave(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newComment.trim();

    if (!text || !currentUserId || isSubmitting) return;

    setIsSubmitting(true);

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: post.id,
        user_id: currentUserId,
        text,
      })
      .select('*, profiles(username, avatar)')
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data as Comment]);
      setNewComment('');
      setShowComments(true);
    } else {
      console.error('Error adding comment:', error?.message);
    }

    setIsSubmitting(false);
  };

  return (
    <article id={post.id} className="border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-black shadow-sm overflow-hidden">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div
          onClick={() => router.push(authorId === currentUserId ? '/profile' : `/profile/${authorId}`)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shrink-0">
            <img
              src={post.profiles?.avatar || DEFAULT_AVATAR}
              alt={post.profiles?.username || 'User'}
              className="w-full h-full object-cover group-hover:scale-105 transition"
            />
          </div>
          <div>
            <p className="font-semibold text-sm group-hover:underline">
              @{post.profiles?.username || 'user'}
            </p>
            <p className="text-xs text-neutral-400">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="text-neutral-400 hover:text-red-500 transition-colors p-1"
          title="Report post"
          aria-label="Report post"
        >
          <Flag className="w-5 h-5" />
        </button>
      </div>

      {/* Post Image */}
      <div className="aspect-square w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
        <img
          src={post.image}
          alt={post.caption || 'Post image'}
          className="object-cover w-full h-full"
          loading="lazy"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleLike}
            disabled={!currentUserId || isTogglingLike}
            aria-label={isLiked ? 'Unlike post' : 'Like post'}
            aria-pressed={isLiked}
            className="transition-transform active:scale-125 disabled:opacity-50"
          >
            <Heart
              className={`w-6 h-6 ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-neutral-900 dark:text-white'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            aria-label="Toggle comments"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleSave}
          disabled={!currentUserId || isTogglingSave}
          aria-label={isSaved ? 'Remove bookmark' : 'Save post'}
          aria-pressed={isSaved}
          className="disabled:opacity-50"
        >
          <Bookmark
            className={`w-6 h-6 ${isSaved ? 'fill-black dark:fill-white' : ''}`}
          />
        </button>
      </div>

      {/* Likes and Caption */}
      <div className="px-4 pb-4 space-y-2">
        <p className="font-semibold text-sm">
          {likes} {likes === 1 ? 'like' : 'likes'}
        </p>

        <p className="text-sm break-words">
          <strong
            onClick={() => router.push(authorId === currentUserId ? '/profile' : `/profile/${authorId}`)}
            className="mr-2 cursor-pointer hover:underline"
          >
            @{post.profiles?.username || 'user'}
          </strong>
          {post.caption}
        </p>

        {/* Comments Count */}
        {comments.length > 0 && (
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className="text-xs text-neutral-500 pt-1 hover:underline"
          >
            {showComments ? 'Hide comments' : `View all ${comments.length} comments`}
          </button>
        )}

        {/* Comments List */}
        {showComments && (
          <div className="space-y-2 pt-2">
            {comments.map((comment) => (
              <div key={comment.id} className="text-sm flex items-start gap-2">
                <span className="font-semibold whitespace-nowrap">
                  @{comment.profiles?.username || 'user'}
                </span>
                <span className="text-neutral-700 dark:text-neutral-300 break-words">
                  {comment.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Add Comment */}
        <form
          onSubmit={handleAddComment}
          className="flex items-center gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-900 mt-2"
        >
          <input
            type="text"
            placeholder={currentUserId ? 'Add a comment...' : 'Sign in to comment'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!currentUserId || isSubmitting}
            maxLength={1000}
            className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none py-1 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!newComment.trim() || !currentUserId || isSubmitting}
            className="text-sm font-semibold text-blue-500 disabled:opacity-40"
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </form>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          targetId={post.id}
          targetType="post"
          onClose={() => setShowReportModal(false)}
        />
      )}
    </article>
  );
}