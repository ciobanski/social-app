import React, { useEffect, useState, useContext } from 'react';
import { toast } from 'react-toastify';
import AuthContext from '../AuthContext';
import { api } from '../api';
import ProfileSidebar from '../components/ProfileSidebar';
import FriendsSidebar from '../components/FriendsSidebar';
import NewPostBox from '../components/NewPostBox';
import PostCard from '../components/PostCard';

export default function FeedPage() {
  const { user, authLoading } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSavedShares = () => {
    try {
      const arr = JSON.parse(localStorage.getItem('sharedPosts') || '[]');
      if (!Array.isArray(arr)) return [];
      // only keep stubs with complete data
      return arr.filter(
        (s) =>
          s &&
          s.type === 'share' &&
          typeof s._id === 'string' &&
          s.sharer?._id &&
          s.original?._id
      );
    } catch {
      return [];
    }
  };
  const saveShares = (shares) => {
    localStorage.setItem('sharedPosts', JSON.stringify(shares));
  };

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
        // 1) Fetch raw feed
        const { data: feedData } = await api.get('/posts');
        const rawPosts = Array.isArray(feedData) ? feedData : [];

        // 2) Load share stubs
        const shareStubs = loadSavedShares();

        // 3) Fetch saved IDs for only real posts
        const realIds = rawPosts.map((p) => p._id);
        let savedSet = new Set();
        try {
          const { data: meSaves } = await api.get('/users/me/saves');
          savedSet = new Set(
            Array.isArray(meSaves)
              ? meSaves.map((p) => p._id).filter((id) => realIds.includes(id))
              : []
          );
        } catch (err) {
          console.debug('Could not fetch saves', err);
        }

        // 4) Map real posts => include saved flag
        const realPosts = rawPosts
          .filter((p) => p && p._id)
          .map((p) => ({ ...p, saved: savedSet.has(p._id), type: 'post' }));

        // 5) Also mark stubs saved=false by default
        const shares = shareStubs.map((s) => ({ ...s, saved: false }));

        setPosts([...shares, ...realPosts]);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load feed');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  const handleNewPost = (newPost) => {
    if (newPost?._id) setPosts((p) => [newPost, ...p]);
  };
  const handleLike = (postId, liked, newCount) =>
    setPosts((p) =>
      p.map((x) =>
        x._id === postId ? { ...x, liked, likeCount: newCount } : x
      )
    );
  // just toggle the bookmark icon
  const handleSave = (postId, isNowSaved) =>
    setPosts((p) =>
      p.map((x) =>
        x._id === postId ? { ...x, saved: isNowSaved } : x
      )
    );
  const handleShare = (original) => {
    if (!original?._id) return;
    const shareItem = {
      _id: `share-${original._id}-${user._id}-${Date.now()}`,
      type: 'share',
      sharer: user,
      original,
      saved: false,
    };
    const existing = loadSavedShares();
    saveShares([shareItem, ...existing]);
    setPosts((p) => [shareItem, ...p]);
  };
  const handleReport = () => { };
  const handleCommentAdded = (postId) =>
    setPosts((p) =>
      p.map((x) =>
        x._id === postId
          ? { ...x, commentCount: (x.commentCount || 0) + 1 }
          : x
      )
    );
  const handleDelete = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((p) => p.filter((x) => x._id !== postId));
      saveShares(loadSavedShares().filter((s) => s._id !== postId));
      toast.success('Post deleted');
    } catch (err) {
      console.error(err);
      toast.error('Could not delete post');
    }
  };

  if (authLoading) return null;
  if (!user)
    return (
      <div className="flex justify-center items-center h-full py-8">
        <p className="text-lg text-gray-400">Please log in to see the feed.</p>
      </div>
    );

  return (
    <div className="mt-14 flex flex-col lg:flex-row max-w-screen-xl mx-auto px-4 gap-6">
      <div className="hidden lg:block lg:w-2/12"><ProfileSidebar /></div>
      <div className="w-full lg:w-8/12 space-y-6">
        <NewPostBox onNewPost={handleNewPost} />
        {loading
          ? [0, 1, 2].map(i => <div key={i} className="h-48 bg-base-content/10 animate-pulse rounded-lg" />)
          : posts.map(post => (
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
          ))
        }
      </div>
      <div className="hidden lg:block lg:w-2/12"><FriendsSidebar /></div>
    </div>
  );
}
