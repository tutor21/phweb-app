
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
    image: string | null;
    caption: string | null;
    created_at: string;
    profiles: Profile | null;
  };
  currentUserId: string;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

export default function PostCard({
  post,
  currentUserId,
}: PostCardProps) {
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

  const hasImage = Boolean(post.image?.trim());
  const hasText = Boolean(post.caption?.trim());

  const goToAuthor = () => {
    router.push(
      authorId === currentUserId
        ? '/profile'
        : `/profile/${authorId}`
    );
  };

  useEffect(() => {
    let active = true;

    async function fetchPostInteractions() {
      const [
        likesResult,
        likeResult,
        saveResult,
        commentsResult,
      ] = await Promise.all([
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

      setIsLiked(Boolean(likeResult.data));
      setIsSaved(Boolean(saveResult.data));

      if (!commentsResult.error) {
        setComments(
          (commentsResult.data || []) as Comment[]
        );
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
    setLikes((prev) =>
      Math.max(0, prev + (wasLiked ? -1 : 1))
    );

    try {
      const { error } = wasLiked
        ? await supabase
            .from('likes')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', currentUserId)
        : await supabase.from('likes').insert({
            post_id: post.id,
            user_id: currentUserId,
          });

      if (error) throw error;
    } catch (error) {
      setIsLiked(wasLiked);
      setLikes((prev) =>
        Math.max(0, prev + (wasLiked ? 1 : -1))
      );

      console.error('Error updating like:', error);
    } finally {
      setIsTogglingLike(false);
    }
  };

  const toggleSave = async () => {
    if (!currentUserId || isTogglingSave) return;

    setIsTogglingSave(true);

    const wasSaved = isSaved;
    setIsSaved(!wasSaved);

    try {
      const { error } = wasSaved
        ? await supabase
            .from('saved_posts')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', currentUserId)
        : await supabase.from('saved_posts').insert({
            post_id: post.id,
            user_id: currentUserId,
          });

      if (error) throw error;
    } catch (error) {
      setIsSaved(wasSaved);
      console.error('Error updating bookmark:', error);
    } finally {
      setIsTogglingSave(false);
    }
  };

  const handleAddComment = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const text = newComment.trim();

    if (!text || !currentUserId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          text,
        })
        .select('*, profiles(username, avatar)')
        .single();

      if (error) throw error;

      if (data) {
        setComments((prev) => [
          ...prev,
          data as Comment,
        ]);

        setNewComment('');
        setShowComments(true);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article
      id={post.id}
      className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black"
    >
      {/* POST HEADER */}
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={goToAuthor}
          className="group flex items-center gap-3 text-left"
        >
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
            <img
              src={post.profiles?.avatar || DEFAULT_AVATAR}
              alt={post.profiles?.username || 'User'}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          </div>

          <div>
            <p className="text-sm font-semibold group-hover:underline">
              @{post.profiles?.username || 'user'}
            </p>

            <p className="text-xs text-neutral-400">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="p-1 text-neutral-400 transition-colors hover:text-red-500"
          title="Report post"
          aria-label="Report post"
        >
          <Flag className="h-5 w-5" />
        </button>
      </div>

      {/* TEXT CONTENT */}
      {hasText && (
        <div
          className={
            hasImage
              ? 'px-4 pb-4'
              : 'px-5 pb-6 pt-3'
          }
        >
          <p
            className={
              hasImage
                ? 'whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-800 dark:text-neutral-200'
                : 'whitespace-pre-wrap break-words text-lg leading-relaxed text-neutral-900 dark:text-neutral-100'
            }
          >
            {post.caption}
          </p>
        </div>
      )}

      {/* IMAGE CONTENT - ONLY RENDER IF PRESENT */}
      {hasImage && (
        <div className="flex w-full items-center justify-center overflow-hidden bg-neutral-100 dark:bg-neutral-900">
          <img
            src={post.image!}
            alt={post.caption || 'Post image'}
            className="max-h-[650px] w-full object-contain"
            loading="lazy"
          />
        </div>
      )}

      {/* ACTION BUTTONS */}
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
              className={`h-6 w-6 ${
                isLiked
                  ? 'fill-red-500 text-red-500'
                  : 'text-neutral-900 dark:text-white'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() =>
              setShowComments((prev) => !prev)
            }
            aria-label="Toggle comments"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleSave}
          disabled={!currentUserId || isTogglingSave}
          aria-label={
            isSaved
              ? 'Remove bookmark'
              : 'Save post'
          }
          aria-pressed={isSaved}
          className="disabled:opacity-50"
        >
          <Bookmark
            className={`h-6 w-6 ${
              isSaved
                ? 'fill-black dark:fill-white'
                : ''
            }`}
          />
        </button>
      </div>

      {/* LIKES, COMMENTS AND INTERACTIONS */}
      <div className="space-y-2 px-4 pb-4">
        <p className="text-sm font-semibold">
          {likes} {likes === 1 ? 'like' : 'likes'}
        </p>

        {/* COMMENTS COUNT */}
        {comments.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setShowComments((prev) => !prev)
            }
            className="pt-1 text-xs text-neutral-500 hover:underline"
          >
            {showComments
              ? 'Hide comments'
              : `View all ${comments.length} comments`}
          </button>
        )}

        {/* COMMENTS LIST */}
        {showComments && (
          <div className="space-y-2 pt-2">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-2 text-sm"
              >
                <span className="whitespace-nowrap font-semibold">
                  @{comment.profiles?.username || 'user'}
                </span>

                <span className="break-words whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                  {comment.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ADD COMMENT */}
        <form
          onSubmit={handleAddComment}
          className="mt-2 flex items-center gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-900"
        >
          <input
            type="text"
            placeholder={
              currentUserId
                ? 'Add a comment...'
                : 'Sign in to comment'
            }
            value={newComment}
            onChange={(event) =>
              setNewComment(event.target.value)
            }
            disabled={!currentUserId || isSubmitting}
            maxLength={1000}
            className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={
              !newComment.trim() ||
              !currentUserId ||
              isSubmitting
            }
            className="text-sm font-semibold text-blue-500 disabled:opacity-40"
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </form>
      </div>

      {/* REPORT MODAL */}
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
