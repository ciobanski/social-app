// src/pages/FeedPage.jsx

import React, { useEffect, useState, useContext, useRef } from 'react';
import { toast } from 'react-toastify';
import { FiArrowUp } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import AuthContext from '../AuthContext';
import { api } from '../api';
import ProfileSidebar from '../components/ProfileSidebar';
import FriendsSidebar from '../components/FriendsSidebar';
import NewPostBox from '../components/NewPostBox';
import PostCard from '../components/PostCard';

export default function FeedPage() {
  const { user, authLoading } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showScroll, setShowScroll] = useState(false);
  const sentinelRef = useRef();

  // Scroll-to-top button visibility
  useEffect(() => {
    const onScroll = () => setShowScroll(window.pageYOffset > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: 'smooth' });

  // Merge new batch with dedupe
  const mergePosts = newBatch => {
    setPosts(prev => {
      const combined = [...prev, ...newBatch];
      const seen = new Set();
      return combined.filter(item => {
        if (seen.has(item._id)) return false;
        seen.add(item._id);
        return true;
      });
    });
  };

  // Load next page
  const loadPage = async () => {
    if (!hasMore) return;
    setLoading(true);
    try {
      const pageSize = 10;
      const { data: newPosts } = await api.get('/posts', {
        params: { offset, limit: pageSize }
      });

      // build a set of originals the user has already shared
      const sharedSet = new Set(
        newPosts
          .filter(
            p =>
              p.type === 'share' &&
              ((p.sharer._id || p.sharer.id) === user.id)
          )
          .map(p => p.original._id)
      );

      // annotate each post with .shared
      const normalized = newPosts.map(p => {
        if (p.type === 'share') {
          return { ...p, shared: true };
        } else {
          return {
            ...p,
            shared: sharedSet.has(p._id),
          };
        }
      });

      if (normalized.length < pageSize) setHasMore(false);
      mergePosts(normalized);
      setOffset(prev => prev + normalized.length);
    } catch (err) {
      console.error('Feed load error:', err);
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  // Initial / reset load
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    setPosts([]);
    setOffset(0);
    setHasMore(true);
    loadPage();
  }, [user, authLoading]);

  // Infinite-scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && hasMore) {
          loadPage();
        }
      },
      { rootMargin: '200px' }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loading, hasMore]);

  // Persist saved state whenever posts change
  useEffect(() => {
    let isMounted = true;
    api.get('/users/me/saves')
      .then(res => {
        if (!isMounted) return;
        const savedIds = new Set(
          res.data
            .filter(p => p && p._id)
            .map(p => p._id)
        );
        setPosts(prev => {
          let changed = false;
          const updated = prev.map(p => {
            const shouldBe = p.type === 'post' && savedIds.has(p._id);
            if (p.saved !== shouldBe) {
              changed = true;
              return { ...p, saved: shouldBe };
            }
            return p;
          });
          return changed ? updated : prev;
        });
      })
      .catch(console.error);
    return () => { isMounted = false; };
  }, [posts]);

  // Persist shared state by scanning your share-stubs
  useEffect(() => {
    setPosts(prev => {
      // find originals you shared
      const sharedIds = new Set(
        prev
          .filter(p => p.type === 'share' && p.sharer._id === user.id)
          .map(s => s.original._id)
      );
      let changed = false;
      const updated = prev.map(p => {
        if (p.type === 'post') {
          const shouldBe = sharedIds.has(p._id);
          if (p.shared !== shouldBe) {
            changed = true;
            return { ...p, shared: shouldBe };
          }
        }
        return p;
      });
      return changed ? updated : prev;
    });
  }, [posts, user.id]);

  // Handlers
  const handleNewPost = newPost => {
    if (newPost?._id) {
      setPosts(prev => [newPost, ...prev]);
    }
  };

  const handleLike = (id, liked, cnt) =>
    setPosts(prev =>
      prev.map(p =>
        p._id === id ? { ...p, liked, likeCount: cnt } : p
      )
    );

  const handleSave = (id, saved) =>
    setPosts(prev =>
      prev.map(p => (p._id === id ? { ...p, saved } : p))
    );

  const handleShare = original => {
    if (!original?._id) return;
    const stubId = `stub-${uuidv4()}`;
    const stub = {
      _id: stubId,
      type: 'share',
      sharer: { ...user },
      original,
      saved: false,
      createdAt: new Date().toISOString(),
      shared: true,
    };

    // insert stub & mark the original as shared
    setPosts(prev =>
      [
        stub,
        ...prev.map(p =>
          p._id === original._id
            ? {
              ...p,
              shared: true,
              shareCount: (p.shareCount || 0) + 1,
            }
            : p
        ),
      ]
    );

    // persist
    api
      .post(`/shares/${original._id}`)
      .then(() => toast.success('Post shared'))
      .catch(err => {
        if (err.response?.status === 409) toast.info('Already shared');
        else {
          console.error('Share error:', err);
          toast.error('Failed to share');
        }
        // rollback on failure
        setPosts(prev => prev.filter(p => p._id !== stubId));
      });
  };

  const handleReport = () => toast.success('Reported');

  const handleCommentAdded = postId =>
    setPosts(prev =>
      prev.map(p =>
        p._id === postId
          ? { ...p, commentCount: (p.commentCount || 0) + 1 }
          : p
      )
    );

  const handleDelete = async id => {
    try {
      await api.delete(`/posts/${id}`);
      setPosts(prev => prev.filter(p => p._id !== id));
      toast.success('Post deleted');
    } catch {
      toast.error('Could not delete post');
    }
  };

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="flex justify-center items-center h-full py-8">
        <p className="text-lg text-gray-400">
          Please log in to see the feed.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-14 flex flex-col lg:flex-row max-w-screen-xl mx-auto px-4 gap-6">
      {/* Sidebar */}
      <div className="hidden lg:block lg:w-3/12">
        <ProfileSidebar />
      </div>

      {/* Feed */}
      <div className="w-full lg:w-7/12 bg-base-100 dark:bg-base-200 p-4 rounded-lg space-y-6">
        <NewPostBox onNewPost={handleNewPost} />

        {posts.map(post => (
          <PostCard
            key={post._id}
            post={post}
            onLike={handleLike}
            onSave={handleSave}
            onShare={handleShare}
            onReport={handleReport}
            onCommentAdded={handleCommentAdded}
            onDelete={handleDelete}
            isSharedPreview={post.type === 'share'}
            sharer={post.sharer}
          />
        ))}

        {/* Loading placeholders */}
        {loading &&
          [0, 1, 2].map(i => (
            <div
              key={`load-${i}`}
              className="h-48 bg-base-content/10 animate-pulse rounded-lg"
            />
          ))}

        {/* Sentinel */}
        <div ref={sentinelRef} />
      </div>

      {/* Friends */}
      <div className="hidden lg:block lg:w-2/12">
        <FriendsSidebar />
      </div>

      {/* Scroll top */}
      {showScroll && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 p-3 bg-blue-500 rounded-full text-white shadow-lg hover:bg-blue-600"
        >
          <FiArrowUp size={24} />
        </button>
      )}
    </div>
  );
}
