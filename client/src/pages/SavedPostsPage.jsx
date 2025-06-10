import React, { useEffect, useState, useContext } from 'react';
import { toast } from 'react-toastify';
import AuthContext from '../AuthContext';
import { api } from '../api';
import PostCard from '../components/PostCard';

export default function SavedPostsPage() {
  const { user, authLoading } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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
        const { data } = await api.get('/users/me/saves');
        const arr = Array.isArray(data) ? data : [];
        // mark them saved:true
        setPosts(arr.map(p => ({ ...p, saved: true })));
      } catch (err) {
        console.error(err);
        toast.error('Failed to load saved posts');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  // when unsaved, remove immediately
  const handleSave = async (postId, isNowSaved) => {
    if (!isNowSaved) {
      try {
        await api.delete(`/posts/${postId}/save`);
        setPosts(p => p.filter(x => x._id !== postId));
        toast.success('Removed from saved');
      } catch (err) {
        console.error(err);
        toast.error('Could not remove save');
      }
    }
  };

  const handleLike = (postId, liked, newCount) =>
    setPosts(p => p.map(x => (x._id === postId ? { ...x, liked, likeCount: newCount } : x)));

  const handleShare = original => {
    if (!original?._id) return;
    const shareItem = {
      _id: `share-${original._id}-${user.id}-${Date.now()}`,
      type: 'share',
      sharer: user,
      original,
    };
    setPosts(p => [shareItem, ...p]);
  };

  const handleReport = () => { };
  const handleCommentAdded = postId =>
    setPosts(p => p.map(x => (x._id === postId ? { ...x, commentCount: (x.commentCount || 0) + 1 } : x)));

  if (authLoading) return null;
  if (!user)
    return (
      <div className="flex justify-center items-center h-full py-8">
        <p className="text-lg text-gray-400">Please log in to view your saved posts.</p>
      </div>
    );

  return (
    <div className="mt-14 max-w-screen-xl mx-auto px-4 space-y-6">
      {loading ? (
        [0, 1, 2].map(i => (
          <div key={i} className="h-48 bg-base-content/10 animate-pulse rounded-lg" />
        ))
      ) : posts.length === 0 ? (
        <p className="text-gray-500">You have no saved posts.</p>
      ) : (
        posts
          .filter(p => p && p._id && p.type !== 'share')
          .map(post => (
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
    </div>
  );
}
