import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function ProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.get(`/users/${id}`).then(res => setProfile(res.data));
  }, [id]);

  if (!profile) return <div>Loading…</div>;
  return (
    <div className="max-w-md mx-auto mt-6 p-4 border rounded">
      <h1 className="text-xl">{profile.firstName} {profile.lastName}</h1>
      <p>Email: {profile.email}</p>
      <p>Country: {profile.country || 'N/A'}</p>
    </div>
  );
}
