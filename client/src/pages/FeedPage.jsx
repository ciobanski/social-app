import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get('/posts').then(res => setPosts(res.data));
  }, []);

  return (
    <div className="max-w-2xl mx-auto mt-6 space-y-4">
      {posts.map(post => (
        <div key={post._id} className="p-4 border rounded">
          <p className="text-sm text-gray-500">
            {post.author.firstName} {post.author.lastName} •{' '}
            {new Date(post.createdAt).toLocaleString()}
          </p>
          <p className="mt-2">{post.content}</p>
        </div>
      ))}
    </div>
  );
}
