// src/pages/SavedPostsPage.jsx

import React, { useEffect, useState, useContext } from 'react';
import { toast } from 'react-toastify';
import AuthContext from '../AuthContext';
import { api } from '../api';
import PostCard from '../components/PostCard';
import { FiArrowUp } from 'react-icons/fi';
export default function SavedPostsPage() {
  const { user, authLoading } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScroll(window.pageYOffset > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: 'smooth' });
  // load saved‐posts, then re‐fetch each for full stats
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        if (authLoading || !user) return;
        const { data: saves } = await api.get('/users/me/saves');
        const detailed = await Promise.all(
          (saves || []).map(async raw => {
            if (!user) return;
            const { data: full } = await api.get(`/posts/${raw._id}`);
            return { ...full, saved: true };
          })
        );
        setPosts(detailed);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load saved posts');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  // un‐save
  const handleSave = async (postId, isNowSaved) => {
    if (!isNowSaved) {
      try {
        await api.delete(`/posts/${postId}/save`);
        setPosts(p => p.filter(x => x._id !== postId));
        toast.success('Removed from saved');
      } catch {
        toast.error('Could not remove save');
      }
    }
  };

  const handleLike = (postId, liked, newCount) =>
    setPosts(p =>
      p.map(x =>
        x._id === postId ? { ...x, liked, likeCount: newCount } : x
      )
    );

  // ←—— this is the change: we tag the post as shared **and** give it type 'share'
  const handleShare = async original => {
    if (!original?._id) return;
    // optimistic UI: mark it shared
    setPosts(p =>
      p.map(x =>
        x._id === original._id
          ? {
            ...x,
            shared: true,                          // flag it shared
            shareCount: (x.shareCount || 0) + 1,  // bump count
            type: 'share'                         // tell PostCard this is a “share”
          }
          : x
      )
    );

    try {
      await api.post(`/shares/${original._id}`);
      toast.success('Post shared');
    } catch (err) {
      if (err.response?.status === 409) {
        toast.info('Already shared');
      } else {
        console.error(err);
        toast.error('Failed to share');
      }
      // rollback on error
      setPosts(p =>
        p.map(x =>
          x._id === original._id
            ? {
              ...x,
              shared: false,
              shareCount: (x.shareCount || 1) - 1,
              type: undefined
            }
            : x
        )
      );
    }
  };

  const handleReport = () => { };
  const handleCommentAdded = postId =>
    setPosts(p =>
      p.map(x =>
        x._id === postId
          ? { ...x, commentCount: (x.commentCount || 0) + 1 }
          : x
      )
    );

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="flex justify-center items-center h-full py-8">
        <p className="text-lg text-gray-400">
          Please log in to view your saved posts.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-14 max-w-screen-xl mx-auto px-4 space-y-6">
      {loading ? (
        [0, 1, 2].map(i => (
          <div
            key={i}
            className="h-48 bg-base-content/10 animate-pulse rounded-lg"
          />
        ))
      ) : posts.length === 0 ? (
        <p className="text-gray-500">You have no saved posts.</p>
      ) : (
        posts.map(post => (
          <PostCard
            key={post._id}
            post={post}
            onLike={handleLike}
            onSave={handleSave}
            onShare={handleShare}
            onReport={handleReport}
            onCommentAdded={handleCommentAdded}
            onDelete={() => { }}
          />
        ))
      )}
      {showScroll && (
        <button
          onClick={scrollToTop}
          className="
              fixed bottom-4 left-4 p-3
              bg-base-100 dark:bg-base-800
              rounded-sm
              border border-gray-300 dark:border-gray-600
              text-black dark:text-white
              shadow-lg
              hover:bg-base-200 dark:hover:bg-base-700
              transition-colors
              cursor-pointer
              "
        >
          <FiArrowUp size={24} color='#9f9f9f' />
        </button>
      )}
    </div>
  );
}
