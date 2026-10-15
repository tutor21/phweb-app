'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Bookmark, Flag, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import ReportModal from '@/app/components/ReportModal';

interface Profile { id: string; username: string; avatar: string | null }
interface Comment {
  id: string;
  text: string;
  created_at?: string;
  profiles: { username: string; avatar: string | null } | null;
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

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

export default function PostCard({ post, currentUserId, onDeleted }: PostCardProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isTogglingSave, setIsTogglingSave] = useState(false);
  const authorId = post.profiles?.id || post.user_id;
  const isOwner = !!currentUserId && post.user_id === currentUserId;
  const authorUrl = authorId === currentUserId ? '/profile' : `/profile/${authorId}`;

  useEffect(() => {
    let active = true;
    async function fetchPostInteractions() {
      const [likesResult, likeResult, saveResult, commentsResult] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
        currentUserId
          ? supabase.from('likes').select('user_id').eq('post_id', post.id).eq('user_id', currentUserId).maybeSingle()
          : Promise.resolve({ data: null }),
        currentUserId
          ? supabase.from('saved_posts').select('user_id').eq('post_id', post.id).eq('user_id', currentUserId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('comments').select('*, profiles(username, avatar)').eq('post_id', post.id).order('created_at', { ascending: true }),
      ]);
      if (!active) return;
      if (!likesResult.error) setLikes(likesResult.count || 0);
      setIsLiked(!!likeResult.data);
      setIsSaved(!!saveResult.data);
      if (!commentsResult.error) setComments((commentsResult.data || []) as Comment[]);
    }
    void fetchPostInteractions();
    return () => { active = false; };
  }, [post.id, currentUserId, supabase]);

  async function toggleLike() {
    if (!currentUserId || isTogglingLike) return;
    setIsTogglingLike(true);
    const previous = isLiked;
    setIsLiked(!previous);
    setLikes(n => Math.max(0, n + (previous ? -1 : 1)));
    try {
      const { error } = previous
        ? await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
        : await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId });
      if (error) throw error;
    } catch (error) {
      setIsLiked(previous);
      setLikes(n => Math.max(0, n + (previous ? 1 : -1)));
      console.error('Error updating like:', error);
    } finally { setIsTogglingLike(false); }
  }

  async function toggleSave() {
    if (!currentUserId || isTogglingSave) return;
    setIsTogglingSave(true);
    const previous = isSaved;
    setIsSaved(!previous);
    try {
      const { error } = previous
        ? await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', currentUserId)
        : await supabase.from('saved_posts').insert({ post_id: post.id, user_id: currentUserId });
      if (error) throw error;
    } catch (error) {
      setIsSaved(previous);
      console.error('Error updating bookmark:', error);
    } finally { setIsTogglingSave(false); }
  }

  async function addComment(event: React.FormEvent) {
    event.preventDefault();
    const text = newComment.trim();
    if (!text || !currentUserId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('comments')
        .insert({ post_id: post.id, user_id: currentUserId, text })
        .select('*, profiles(username, avatar)').single();
      if (error) throw error;
      setComments(previous => [...previous, data as Comment]);
      setNewComment('');
      setShowComments(true);
    } catch (error) { console.error('Error adding comment:', error); }
    finally { setIsSubmitting(false); }
  }

  async function deletePost() {
    if (!isOwner || deleting) return;
    setDeleting(true);
    setActionError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || user?.id !== post.user_id) throw new Error('You must be the post owner to delete it.');
      const { data, error } = await supabase.from('posts').delete()
        .eq('id', post.id).eq('user_id', user.id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Post was not deleted. Check your Supabase delete policy.');
      setConfirmDelete(false);
      if (onDeleted) onDeleted(post.id);
      else { router.refresh(); window.location.reload(); }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to delete post.');
    } finally { setDeleting(false); }
  }

  return (
    <article id={post.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="flex items-center justify-between p-4">
        <button type="button" onClick={() => router.push(authorUrl)} className="group flex items-center gap-3 text-left">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
            <img src={post.profiles?.avatar || DEFAULT_AVATAR} alt={post.profiles?.username || 'User'} className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-semibold group-hover:underline">@{post.profiles?.username || 'user'}</p>
            <p className="text-xs text-neutral-400">{new Date(post.created_at).toLocaleDateString()}</p>
          </div>
        </button>
        {isOwner ? (
          <div className="relative">
            <button type="button" aria-label="Manage post" aria-expanded={showManageMenu} onClick={() => setShowManageMenu(v => !v)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900">
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {showManageMenu && (
              <div className="absolute right-0 top-full z-20 w-44 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                <Link href={`/edit-post/${post.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"><Pencil className="h-4 w-4" /> Edit post</Link>
                <button type="button" onClick={() => { setShowManageMenu(false); setConfirmDelete(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /> Delete post</button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => setShowReportModal(true)} className="p-1 text-neutral-400 hover:text-red-500" aria-label="Report post" title="Report post"><Flag className="h-5 w-5" /></button>
        )}
      </div>

      {!!post.caption?.trim() && (
        <p className={`whitespace-pre-wrap break-words px-4 ${post.image?.trim() ? 'pb-4 text-sm' : 'pb-6 pt-2 text-lg'} leading-relaxed`}>{post.caption}</p>
      )}
      {!!post.image?.trim() && (
        <div className="flex w-full items-center justify-center overflow-hidden bg-neutral-100 dark:bg-neutral-900">
          <img src={post.image} alt={post.caption || 'Post image'} className="max-h-[650px] w-full object-contain" loading="lazy" />
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button type="button" onClick={toggleLike} disabled={!currentUserId || isTogglingLike} aria-label={isLiked ? 'Unlike post' : 'Like post'} aria-pressed={isLiked} className="transition-transform active:scale-125 disabled:opacity-50">
            <Heart className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-neutral-900 dark:text-white'}`} />
          </button>
          <button type="button" onClick={() => setShowComments(v => !v)} aria-label="Toggle comments"><MessageCircle className="h-6 w-6" /></button>
        </div>
        <button type="button" onClick={toggleSave} disabled={!currentUserId || isTogglingSave} aria-label={isSaved ? 'Remove bookmark' : 'Save post'} aria-pressed={isSaved} className="disabled:opacity-50">
          <Bookmark className={`h-6 w-6 ${isSaved ? 'fill-black dark:fill-white' : ''}`} />
        </button>
      </div>

      <div className="space-y-2 px-4 pb-4">
        <p className="text-sm font-semibold">{likes} {likes === 1 ? 'like' : 'likes'}</p>
        {comments.length > 0 && (
          <button type="button" onClick={() => setShowComments(v => !v)} className="pt-1 text-xs text-neutral-500 hover:underline">
            {showComments ? 'Hide comments' : `View all ${comments.length} comments`}
          </button>
        )}
        {showComments && (
          <div className="space-y-2 pt-2">
            {comments.map(comment => (
              <div key={comment.id} className="flex items-start gap-2 text-sm">
                <span className="whitespace-nowrap font-semibold">@{comment.profiles?.username || 'user'}</span>
                <span className="whitespace-pre-wrap break-words text-neutral-700 dark:text-neutral-300">{comment.text}</span>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={addComment} className="mt-2 flex items-center gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-900">
          <input type="text" placeholder={currentUserId ? 'Add a comment...' : 'Sign in to comment'} value={newComment} onChange={e => setNewComment(e.target.value)} disabled={!currentUserId || isSubmitting} maxLength={1000} className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none disabled:opacity-50" />
          <button type="submit" disabled={!newComment.trim() || !currentUserId || isSubmitting} className="text-sm font-semibold text-blue-500 disabled:opacity-40">{isSubmitting ? 'Posting...' : 'Post'}</button>
        </form>
      </div>

      {actionError && <p role="alert" className="px-4 pb-3 text-sm text-red-600">{actionError}</p>}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby={`delete-title-${post.id}`}>
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-neutral-900 dark:bg-neutral-900 dark:text-white">
            <h2 id={`delete-title-${post.id}`} className="text-lg font-bold">Delete this post?</h2>
            <p className="text-sm text-neutral-500">This action cannot be undone. Your post will be removed.</p>
            {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={deletePost} disabled={deleting} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showReportModal && <ReportModal targetId={post.id} targetType="post" onClose={() => setShowReportModal(false)} />}
    </article>
  );
}
