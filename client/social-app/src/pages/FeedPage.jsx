// src/pages/FeedPage.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import PostCard from '../components/PostCard';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get('/posts').then(res => setPosts(res.data));
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {posts.map(p => (
        <PostCard key={p._id} post={p} />
      ))}
    </div>
  );
}
