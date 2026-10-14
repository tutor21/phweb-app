'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Heart, MessageCircle, Bookmark, Send } from 'lucide-react';
import Link from 'next/link';

interface PostCardProps {
  post: {
    id: string;
    image: string;
    caption: string;
    created_at: string;
    profiles: {
      id: string;
      username: string;
      avatar: string;
    };
  };
  currentUserId: string;
}

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const [likes, setLikes] = useState<number>(0);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [showComments, setShowComments] = useState<boolean>(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchPostInteractions() {
      // Check likes count & user like status
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      setLikes(count || 0);

      const { data: userLike } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
        .single();
      if (userLike) setIsLiked(true);

      // Check saved status
      const { data: userSave } = await supabase
        .from('saved_posts')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
        .single();
      if (userSave) setIsSaved(true);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      setComments(commentsData || []);
    }

    if (currentUserId) fetchPostInteractions();
  }, [post.id, currentUserId, supabase]);

  const toggleLike = async () => {
    if (!currentUserId) return;
    if (isLiked) {
      setIsLiked(false);
      setLikes(likes - 1);
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
    } else {
      setIsLiked(true);
      setLikes(likes + 1);
      await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId });
    }
  };

  const toggleSave = async () => {
    if (!currentUserId) return;
    if (isSaved) {
      setIsSaved(false);
      await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', currentUserId);
    } else {
      setIsSaved(true);
      await supabase.from('saved_posts').insert({ post_id: post.id, user_id: currentUserId });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: post.id,
        user_id: currentUserId,
        text: newComment.trim(),
      })
      .select('*, profiles(username, avatar)')
      .single();

    if (!error && data) {
      setComments([...comments, data]);
      setNewComment('');
    }
  };

  return (
    <article className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black mb-4 pb-4">
      {/* Post Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={post.profiles?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={post.profiles?.username}
            className="w-8 h-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-800"
          />
          <span className="font-semibold text-sm">@{post.profiles?.username}</span>
        </div>
      </div>

      {/* Post Image */}
      <div className="aspect-square w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
        <img src={post.image} alt="Post content" className="object-cover w-full h-full" />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} className="transition-transform active:scale-125">
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
          <button onClick={() => setShowComments(!showComments)}>
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>
        <button onClick={toggleSave}>
          <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-black dark:fill-white' : ''}`} />
        </button>
      </div>

      {/* Likes & Caption */}
      <div className="px-4 space-y-1">
        <p className="font-semibold text-sm">{likes} likes</p>
        <p className="text-sm">
          <strong className="mr-2">@{post.profiles?.username}</strong>
          {post.caption}
        </p>

        {/* Comments Toggle / List */}
        {comments.length > 0 && (
          <button
            onClick={() => setShowComments(!showComments)}
            className="text-xs text-neutral-500 pt-1"
          >
            {showComments ? 'Hide comments' : `View all ${comments.length} comments`}
          </button>
        )}

        {showComments && (
          <div className="space-y-2 pt-2">
            {comments.map((c) => (
              <div key={c.id} className="text-sm flex items-start gap-2">
                <span className="font-semibold">@{c.profiles?.username}</span>
                <span className="text-neutral-700 dark:text-neutral-300">{c.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Add Comment Input */}
        <form onSubmit={handleAddComment} className="flex items-center pt-3 border-t border-neutral-100 dark:border-neutral-900 mt-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none py-1"
          />
          <button type="submit" disabled={!newComment.trim()} className="text-sm font-semibold disabled:opacity-40">
            Post
          </button>
        </form>
      </div>
    </article>
  );
}