'use client';

import React, {

  useEffect,

  useMemo,

  useRef,

  useState,

} from 'react';

import Link from 'next/link';

import { createPortal } from 'react-dom';

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

  X,

} from 'lucide-react';

import { createClient } from '@/app/utils/supabase/client';

import ReportModal from '@/app/components/ReportModal';

import PostRichText from '@/app/components/PostRichText';

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
    background_theme?: string | null;

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

const POST_BACKGROUND_THEMES: Record<string, string> = {
  classic: 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white',
  ocean: 'bg-gradient-to-br from-blue-700 to-cyan-400 text-white',
  sunset: 'bg-gradient-to-br from-rose-500 to-amber-400 text-white',
  purple: 'bg-gradient-to-br from-violet-800 to-fuchsia-500 text-white',
  forest: 'bg-gradient-to-br from-emerald-900 to-green-500 text-white',
  midnight: 'bg-gradient-to-br from-slate-950 to-indigo-700 text-white',
  rose: 'bg-gradient-to-br from-pink-600 to-rose-300 text-white',
};

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

  const [comments, setComments] = useState<Comment[]>([]);

  const [newComment, setNewComment] = useState('');

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const [editCommentText, setEditCommentText] = useState('');

  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);

  const [commentError, setCommentError] = useState('');

  const [editedCommentIds, setEditedCommentIds] = useState<string[]>([]);

  const [showComments, setShowComments] = useState(false);

  const photoUrls = post.image?.trim() ? [post.image] : [];
  const currentPhotoUrl = photoUrls[0];

  const [photoOpen, setPhotoOpen] = useState(false);

  const [photoCommentsOpen, setPhotoCommentsOpen] = useState(false);

  const [photoZoom, setPhotoZoom] = useState(1);

  const gesture = useRef<{ startY: number; startX: number; startDistance: number; startZoom: number; pinching: boolean } | null>(null);

  const sheetStartY = useRef<number | null>(null);

  const touchDistance = (touches: React.TouchList) => {

    const dx = touches[0].clientX - touches[1].clientX;

    const dy = touches[0].clientY - touches[1].clientY;

    return Math.hypot(dx, dy);

  };

  function onPhotoTouchStart(event: React.TouchEvent<HTMLDivElement>) {

    if (event.touches.length === 2) {

      gesture.current = { startY: 0, startX: 0, startDistance: touchDistance(event.touches), startZoom: photoZoom, pinching: true };

    } else if (event.touches.length === 1) {

      gesture.current = { startY: event.touches[0].clientY, startX: event.touches[0].clientX, startDistance: 0, startZoom: photoZoom, pinching: false };

    }

  }

  function onPhotoTouchMove(event: React.TouchEvent<HTMLDivElement>) {

    const g = gesture.current;

    if (!g) return;

    if (event.touches.length === 2) {

      if (!g.pinching) {

        gesture.current = { ...g, startDistance: touchDistance(event.touches), startZoom: photoZoom, pinching: true };

        return;

      }

      setPhotoZoom(Math.max(1, Math.min(4, g.startZoom * touchDistance(event.touches) / Math.max(g.startDistance, 1))));

    }

  }

  function onPhotoTouchEnd(event: React.TouchEvent<HTMLDivElement>) {

    const g = gesture.current;

    if (!g) return;

    if (event.touches.length > 0) {

      // Avoid treating the remaining finger of a pinch as a swipe.

      if (g.pinching) gesture.current = null;

      return;

    }

    gesture.current = null;

    if (g.pinching || photoZoom > 1.05) return;

    const dy = event.changedTouches[0].clientY - g.startY;

    const dx = event.changedTouches[0].clientX - g.startX;

    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.3) {

      // Horizontal swipes do nothing for single-photo posts.

      return;

    }

    if (Math.abs(dy) < 65 || Math.abs(dy) < Math.abs(dx) * 1.3) return;

    if (dy < 0) setPhotoCommentsOpen(true);

    else if (photoCommentsOpen) setPhotoCommentsOpen(false);

  }

  function closePhoto() {

    setPhotoOpen(false);

    setPhotoCommentsOpen(false);

    setPhotoZoom(1);

  }

  const [showReportModal, setShowReportModal] = useState(false);

  const [checkingReportAuth, setCheckingReportAuth] = useState(false);

  const [showManageMenu, setShowManageMenu] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [actionError, setActionError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isTogglingLike, setIsTogglingLike] = useState(false);

  const [isTogglingSave, setIsTogglingSave] = useState(false);

  const authorId = post.profiles?.id || post.user_id;

  const isOwner =

    !!currentUserId && post.user_id === currentUserId;

  const authorUrl =

    authorId === currentUserId

      ? '/profile'

      : `/profile/${authorId}`;

  useEffect(() => {

    if (!photoOpen) return;

    const oldOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {

      if (event.key === 'Escape') closePhoto();

    };

    window.addEventListener('keydown', onKeyDown);

    return () => {

      document.body.style.overflow = oldOverflow;

      window.removeEventListener('keydown', onKeyDown);

    };

  }, [photoOpen]);

  // LOAD LIKES, SAVED POSTS, AND COMMENTS

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

          .select('*', {

            count: 'exact',

            head: true,

          })

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

          .order('created_at', {

            ascending: true,

          }),

      ]);

      if (!active) return;

      if (!likesResult.error) {

        setLikes(likesResult.count || 0);

      }

      setIsLiked(!!likeResult.data);

      setIsSaved(!!saveResult.data);

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

  // LIKE OR UNLIKE POST

  async function toggleLike() {

    if (!currentUserId || isTogglingLike) return;

    setIsTogglingLike(true);

    const previous = isLiked;

    setIsLiked(!previous);

    setLikes((count) =>

      Math.max(0, count + (previous ? -1 : 1))

    );

    try {

      const { error } = previous

        ? await supabase

            .from('likes')

            .delete()

            .eq('post_id', post.id)

            .eq('user_id', currentUserId)

        : await supabase

            .from('likes')

            .insert({

              post_id: post.id,

              user_id: currentUserId,

            });

      if (error) throw error;

    } catch (error) {

      setIsLiked(previous);

      setLikes((count) =>

        Math.max(0, count + (previous ? 1 : -1))

      );

      console.error('Error updating like:', error);

    } finally {

      setIsTogglingLike(false);

    }

  }

  // SAVE OR UNSAVE POST

  async function toggleSave() {

    if (!currentUserId || isTogglingSave) return;

    setIsTogglingSave(true);

    const previous = isSaved;

    setIsSaved(!previous);

    try {

      const { error } = previous

        ? await supabase

            .from('saved_posts')

            .delete()

            .eq('post_id', post.id)

            .eq('user_id', currentUserId)

        : await supabase

            .from('saved_posts')

            .insert({

              post_id: post.id,

              user_id: currentUserId,

            });

      if (error) throw error;

    } catch (error) {

      setIsSaved(previous);

      console.error('Error updating bookmark:', error);

    } finally {

      setIsTogglingSave(false);

    }

  }

  // ADD COMMENT

  async function addComment(event: React.FormEvent) {

    event.preventDefault();

    const text = newComment.trim();

    if (

      !text ||

      !currentUserId ||

      isSubmitting

    ) {

      return;

    }

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

      setComments((previous) => [

        ...previous,

        data as Comment,

      ]);

      setNewComment('');

      setShowComments(true);

    } catch (error) {

      console.error('Error adding comment:', error);

    } finally {

      setIsSubmitting(false);

    }

  }

  // Confirm the authenticated user before modifying a comment.

  async function verifyCommentOwner(comment: Comment) {

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user || user.id !== comment.user_id || user.id !== currentUserId) {

      throw new Error('Please sign in as the comment author to continue.');

    }

    return user.id;

  }

  function startEditingComment(comment: Comment) {

    if (!currentUserId || comment.user_id !== currentUserId || busyCommentId) return;

    setEditingCommentId(comment.id);

    setEditCommentText(comment.text);

    setCommentError('');

    setShowComments(true);

  }

  async function saveComment(comment: Comment) {

    const text = editCommentText.trim();

    if (!text || text.length > 1000 || busyCommentId) return;

    setBusyCommentId(comment.id);

    setCommentError('');

    try {

      const userId = await verifyCommentOwner(comment);

      const { data, error } = await supabase

        .from('comments')

        .update({ text })

        .eq('id', comment.id)

        .eq('post_id', post.id)

        .eq('user_id', userId)

        .select('id, text')

        .maybeSingle();

      if (error) throw error;

      if (!data) throw new Error('Comment could not be updated. Check your permissions.');

      setComments(previous => previous.map(item =>

        item.id === comment.id ? { ...item, text: data.text } : item

      ));

      setEditedCommentIds(previous => previous.includes(comment.id) ? previous : [...previous, comment.id]);

      setEditingCommentId(null);

      setEditCommentText('');

    } catch (error) {

      setCommentError(error instanceof Error ? error.message : 'Unable to edit comment.');

    } finally {

      setBusyCommentId(null);

    }

  }

  async function deleteComment(comment: Comment) {

    if (busyCommentId || comment.user_id !== currentUserId) return;

    if (!window.confirm('Delete this comment? This cannot be undone.')) return;

    setBusyCommentId(comment.id);

    setCommentError('');

    try {

      const userId = await verifyCommentOwner(comment);

      const { data, error } = await supabase

        .from('comments')

        .delete()

        .eq('id', comment.id)

        .eq('post_id', post.id)

        .eq('user_id', userId)

        .select('id')

        .maybeSingle();

      if (error) throw error;

      if (!data) throw new Error('Comment could not be deleted. Check your permissions.');

      setComments(previous => previous.filter(item => item.id !== comment.id));

      if (editingCommentId === comment.id) {

        setEditingCommentId(null);

        setEditCommentText('');

      }

    } catch (error) {

      setCommentError(error instanceof Error ? error.message : 'Unable to delete comment.');

    } finally {

      setBusyCommentId(null);

    }

  }

  // REPORT POST - AUTHENTICATED USERS ONLY

  async function handleReportClick() {

    if (checkingReportAuth || isOwner) return;

    if (!currentUserId) {

      router.push('/login');

      return;

    }

    setCheckingReportAuth(true);

    setActionError('');

    try {

      const {

        data: { user },

        error,

      } = await supabase.auth.getUser();

      if (error || !user || user.id !== currentUserId) {

        router.push('/login');

        return;

      }

      if (user.id === post.user_id) {

        return;

      }

      setShowReportModal(true);

    } catch (error) {

      console.error('Report authentication error:', error);

      setActionError(

        'Unable to verify your account. Please try again.'

      );

    } finally {

      setCheckingReportAuth(false);

    }

  }

  // DELETE POST - OWNER ONLY

  async function deletePost() {

    if (!isOwner || deleting) return;

    setDeleting(true);

    setActionError('');

    try {

      const {

        data: { session },

        error: sessionError,

      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {

        throw new Error('Your session has expired. Please sign in again.');

      }

      if (session.user.id !== post.user_id) {

        throw new Error('You must be the post owner to delete it.');

      }

      const response = await fetch(

        `/api/posts/${encodeURIComponent(post.id)}`,

        {

          method: 'DELETE',

          headers: {

            Authorization: `Bearer ${session.access_token}`,

          },

          cache: 'no-store',

        }

      );

      const result = (await response.json()) as {

        success?: boolean;

        cleanupComplete?: boolean;

        error?: string;

        message?: string;

      };

      if (!response.ok || !result.success) {

        throw new Error(result.error || 'Unable to delete post.');

      }

      if (result.cleanupComplete === false) {

        console.warn('Post deleted but image cleanup was incomplete:', post.id);

        setActionError('Post deleted, but photo cleanup needs attention.');

      }

      setConfirmDelete(false);

      if (onDeleted) {

        onDeleted(post.id);

      } else {

        router.refresh();

        window.location.reload();

      }

    } catch (error) {

      setActionError(

        error instanceof Error ? error.message : 'Unable to delete post.'

      );

    } finally {

      setDeleting(false);

    }

  }

  const interactionsPanel = (

    <>

      {/* LIKE COUNT AND COMMENTS */}

      <div className="space-y-2 px-4 pb-4">

        <p className="text-sm font-semibold">

          {likes}{' '}

          {likes === 1

            ? 'like'

            : 'likes'}

        </p>

        {comments.length > 0 && (

          <button

            type="button"

            onClick={() =>

              setShowComments((value) => !value)

            }

            className="pt-1 text-xs text-neutral-500 hover:underline"

          >

            {(showComments || (photoOpen && photoCommentsOpen))

              ? 'Hide comments'

              : `View all ${comments.length} comments`}

          </button>

        )}

        {(showComments || (photoOpen && photoCommentsOpen)) && (

          <div className="space-y-2 pt-2">

            {comments.map((comment) => (

              <div key={comment.id} className="rounded-lg py-1 text-sm">

                <div className="flex items-start justify-between gap-3">

                  <div className="min-w-0 flex-1">

                    <span className="font-semibold">@{comment.profiles?.username || 'user'}</span>

                    {editingCommentId === comment.id ? (

                      <form

                        className="mt-2 space-y-2"

                        onSubmit={(event) => { event.preventDefault(); void saveComment(comment); }}

                      >

                        <textarea

                          value={editCommentText}

                          onChange={(event) => setEditCommentText(event.target.value)}

                          maxLength={1000}

                          rows={2}

                          aria-label="Edit comment"

                          disabled={busyCommentId === comment.id}

                          className="w-full resize-y rounded-lg border border-neutral-300 bg-transparent p-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700"

                        />

                        <div className="flex gap-3">

                          <button type="submit" disabled={!editCommentText.trim() || !!busyCommentId} className="font-semibold text-blue-600 disabled:opacity-50">Save</button>

                          <button type="button" disabled={!!busyCommentId} onClick={() => { setEditingCommentId(null); setCommentError(''); }} className="text-neutral-500 disabled:opacity-50">Cancel</button>

                        </div>

                      </form>

                    ) : (

                      <p className="whitespace-pre-wrap break-words text-neutral-700 dark:text-neutral-300">

                        <CommentText text={comment.text} />

                        {editedCommentIds.includes(comment.id) && <span className="ml-1 text-xs text-neutral-400">(edited)</span>}

                      </p>

                    )}

                  </div>

                  {!!currentUserId && comment.user_id === currentUserId && editingCommentId !== comment.id && (

                    <div className="flex shrink-0 items-center gap-2">

                      <button type="button" aria-label="Edit comment" title="Edit comment" disabled={!!busyCommentId} onClick={() => startEditingComment(comment)} className="text-neutral-500 hover:text-blue-600 disabled:opacity-50"><Pencil className="h-4 w-4" /></button>

                      <button type="button" aria-label="Delete comment" title="Delete comment" disabled={!!busyCommentId} onClick={() => void deleteComment(comment)} className="text-neutral-500 hover:text-red-600 disabled:opacity-50">{busyCommentId === comment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>

                    </div>

                  )}

                </div>

              </div>

            ))}

          </div>

        )}

        {commentError && <p role="alert" className="text-sm text-red-600">{commentError}</p>}

        {/* ADD COMMENT */}

        <form

          onSubmit={addComment}

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

            disabled={

              !currentUserId ||

              isSubmitting

            }

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

            {isSubmitting

              ? 'Posting...'

              : 'Post'}

          </button>

        </form>

      </div>

    </>

  );

  return (

    <article

      id={post.id}

      className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black"

    >

      {/* POST HEADER */}

      <div className="flex items-center justify-between p-4">

        <button

          type="button"

          onClick={() => router.push(authorUrl)}

          className="group flex items-center gap-3 text-left"

        >

          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">

            <img

              src={

                post.profiles?.avatar ||

                DEFAULT_AVATAR

              }

              alt={

                post.profiles?.username ||

                'User'

              }

              className="h-full w-full object-cover"

            />

          </div>

          <div>

            <p className="text-sm font-semibold group-hover:underline">

              @{post.profiles?.username || 'user'}

            </p>

            <p className="text-xs text-neutral-400">

              {new Date(

                post.created_at

              ).toLocaleDateString()}

            </p>

          </div>

        </button>

        {/* OWNER MENU */}

        {isOwner ? (

          <div className="relative">

            <button

              type="button"

              aria-label="Manage post"

              aria-expanded={showManageMenu}

              onClick={() =>

                setShowManageMenu((value) => !value)

              }

              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"

            >

              <MoreHorizontal className="h-5 w-5" />

            </button>

            {showManageMenu && (

              <div className="absolute right-0 top-full z-20 w-44 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">

                <Link

                  href={`/edit-post/${post.id}`}

                  onClick={() =>

                    setShowManageMenu(false)

                  }

                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"

                >

                  <Pencil className="h-4 w-4" />

                  Edit post

                </Link>

                <button

                  type="button"

                  onClick={() => {

                    setShowManageMenu(false);

                    setConfirmDelete(true);

                  }}

                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"

                >

                  <Trash2 className="h-4 w-4" />

                  Delete post

                </button>

              </div>

            )}

          </div>

        ) : (

          /* REPORT BUTTON */

          <button

            type="button"

            onClick={() =>

              void handleReportClick()

            }

            disabled={checkingReportAuth}

            aria-label={

              currentUserId

                ? 'Report post'

                : 'Sign in to report post'

            }

            title={

              currentUserId

                ? 'Report post'

                : 'Sign in to report'

            }

            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30"

          >

            {checkingReportAuth ? (

              <Loader2 className="h-5 w-5 animate-spin" />

            ) : (

              <Flag className="h-5 w-5" />

            )}

          </button>

        )}

      </div>

      {/* COLORFUL TEXT-ONLY POST OR NORMAL CAPTION */}
      {!!post.caption?.trim() && (
        !currentPhotoUrl && post.background_theme && POST_BACKGROUND_THEMES[post.background_theme] ? (
          <div className={`mx-3 mb-3 flex min-h-[230px] items-center justify-center overflow-hidden rounded-2xl px-6 py-10 text-center ${POST_BACKGROUND_THEMES[post.background_theme]}`}>
            <div className="max-w-full whitespace-pre-wrap break-words text-xl font-bold leading-relaxed sm:text-2xl">
              <PostRichText text={post.caption} />
            </div>
          </div>
        ) : (
          <p className={`whitespace-pre-wrap break-words px-4 leading-relaxed ${currentPhotoUrl ? 'pb-4 text-sm' : 'pb-6 pt-2 text-lg'}`}>
            <PostRichText text={post.caption} />
          </p>
        )
      )}

      {/* SINGLE PHOTO: rounded preview and full-screen viewer */}
      {currentPhotoUrl && (
        <div className="mb-1 px-3 pb-2">
          <button
            type="button"
            aria-label="Expand post photo"
            onClick={() => { setPhotoOpen(true); setPhotoCommentsOpen(false); setPhotoZoom(1); }}
            className="flex w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900"
          >
            <img src={currentPhotoUrl} alt={post.caption || 'Post image'} loading="lazy" className="max-h-[650px] w-full object-contain" />
          </button>
        </div>
      )}

      {/* LIKE, COMMENT, BOOKMARK BUTTONS */}

      <div className="flex items-center justify-between px-4 py-3">

        <div className="flex items-center gap-4">

          <button

            type="button"

            onClick={() => void toggleLike()}

            disabled={

              !currentUserId ||

              isTogglingLike

            }

            aria-label={

              isLiked

                ? 'Unlike post'

                : 'Like post'

            }

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

              setShowComments((value) => !value)

            }

            aria-label="Toggle comments"

          >

            <MessageCircle className="h-6 w-6" />

          </button>

        </div>

        <button

          type="button"

          onClick={() => void toggleSave()}

          disabled={

            !currentUserId ||

            isTogglingSave

          }

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

      {!photoOpen && interactionsPanel}

      {/* ACTION ERROR */}

      {actionError && (

        <p

          role="alert"

          className="px-4 pb-3 text-sm text-red-600"

        >

          {actionError}

        </p>

      )}

      {/* DELETE CONFIRMATION */}

      {confirmDelete && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"

          role="dialog"

          aria-modal="true"

          aria-labelledby={`delete-title-${post.id}`}

        >

          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-neutral-900 dark:bg-neutral-900 dark:text-white">

            <h2

              id={`delete-title-${post.id}`}

              className="text-lg font-bold"

            >

              Delete this post?

            </h2>

            <p className="text-sm text-neutral-500">

              This action cannot be undone.

              Your post will be removed.

            </p>

            {actionError && (

              <p

                role="alert"

                className="text-sm text-red-600"

              >

                {actionError}

              </p>

            )}

            <div className="flex justify-end gap-3">

              <button

                type="button"

                onClick={() =>

                  setConfirmDelete(false)

                }

                disabled={deleting}

                className="rounded-lg border px-4 py-2 text-sm"

              >

                Cancel

              </button>

              <button

                type="button"

                onClick={() =>

                  void deletePost()

                }

                disabled={deleting}

                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"

              >

                {deleting && (

                  <Loader2 className="h-4 w-4 animate-spin" />

                )}

                Delete

              </button>

            </div>

          </div>

        </div>

      )}

      {photoOpen && currentPhotoUrl && typeof document !== 'undefined' && createPortal(

        <div

          role="dialog"

          aria-modal="true"

          aria-label="Photo viewer"

          className="fixed inset-0 z-[200] flex flex-col bg-black text-white"

        >

          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">

            <button type="button" onClick={closePhoto} aria-label="Close photo viewer" className="rounded-full bg-black/60 p-2"><X className="h-6 w-6" /></button>

            <span className="max-w-[70%] truncate text-sm font-semibold">@{post.profiles?.username || 'user'}</span>

          </div>

          <div

            className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pt-14 transition-all duration-300 ease-out"

            style={{ touchAction: 'none' }}

            onTouchStart={onPhotoTouchStart}

            onTouchMove={onPhotoTouchMove}

            onTouchEnd={onPhotoTouchEnd}

            onDoubleClick={() => setPhotoZoom(value => value > 1 ? 1 : 2)}

          >

            <img

              src={currentPhotoUrl}

              alt={post.caption || 'Post image'}

              draggable={false}

              className="max-h-full max-w-full select-none object-contain transition-transform duration-150"

              style={{ transform: `scale(${photoZoom})` }}

            />

          </div>

          <div className="flex shrink-0 items-center gap-5 px-5 py-3 text-white">

            <button type="button" onClick={() => void toggleLike()} disabled={!currentUserId || isTogglingLike} aria-label={isLiked ? 'Unlike post' : 'Like post'} className="flex items-center gap-2 disabled:opacity-50">

              <Heart className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />

              <span className="text-sm">{likes}</span>

            </button>

            <button type="button" onClick={() => setPhotoCommentsOpen(value => !value)} aria-expanded={photoCommentsOpen} aria-label="Toggle photo comments" className="flex items-center gap-2">

              <MessageCircle className="h-6 w-6" /><span className="text-sm">{comments.length}</span>

            </button>

            <button type="button" onClick={() => void toggleSave()} disabled={!currentUserId || isTogglingSave} aria-label={isSaved ? 'Remove bookmark' : 'Save post'} className="ml-auto disabled:opacity-50">

              <Bookmark className={`h-6 w-6 ${isSaved ? 'fill-white' : ''}`} />

            </button>

          </div>

          {photoCommentsOpen && (

            <div className="flex h-[min(58dvh,580px)] shrink-0 flex-col overflow-hidden rounded-t-3xl bg-white text-neutral-900 shadow-2xl dark:bg-neutral-950 dark:text-white">

              <button

                type="button"

                onClick={() => setPhotoCommentsOpen(false)}

                onTouchStart={event => { sheetStartY.current = event.touches[0]?.clientY ?? null; }}

                onTouchEnd={event => {

                  if (sheetStartY.current !== null && event.changedTouches[0].clientY - sheetStartY.current > 55) setPhotoCommentsOpen(false);

                  sheetStartY.current = null;

                }}

                className="flex shrink-0 flex-col items-center gap-2 py-3 touch-pan-y"

                aria-label="Collapse comments"

              >

                <span className="h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />

                <span className="text-sm font-semibold">Comments ({comments.length})</span>

              </button>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">

                {interactionsPanel}

              </div>

            </div>

          )}

        </div>,

        document.body

      )}

      {/* REPORT MODAL - AUTHENTICATED USERS ONLY */}

      {showReportModal &&

        currentUserId &&

        !isOwner && (

          <ReportModal

            targetId={post.id}

            targetType="post"

            onClose={() =>

              setShowReportModal(false)

            }

          />

        )}

    </article>

  );

}