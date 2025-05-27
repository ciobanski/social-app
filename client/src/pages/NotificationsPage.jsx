import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function NotificationsPage() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    api.get('/notifications').then(res => setNotes(res.data.notifications));
  }, []);

  return (
    <div className="max-w-md mx-auto mt-6 space-y-2">
      <h1 className="text-xl mb-2">Notifications</h1>
      {notes.map(n => (
        <div key={n._id} className={`p-2 border rounded ${n.read ? 'bg-gray-100' : 'bg-white'}`}>
          <p className="text-sm">{n.type} from {n.entity.from?.firstName}</p>
          <p className="mt-1 text-gray-600 text-xs">{new Date(n.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
