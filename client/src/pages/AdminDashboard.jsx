import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api.get('/admin/metrics').then(res => setMetrics(res.data));
  }, []);

  if (!metrics) return <div>Loading…</div>;
  return (
    <div className="max-w-2xl mx-auto mt-6 space-y-4">
      <h1 className="text-2xl">Admin Dashboard</h1>
      <ul className="list-disc pl-5">
        <li>Total Users: {metrics.totalUsers}</li>
        <li>Signups This Month: {metrics.signupsThisMonth}</li>
        <li>Total Posts: {metrics.totalPosts}</li>
        <li>Posts This Month: {metrics.postsThisMonth}</li>
        <li>Total Logins: {metrics.totalLogins}</li>
        <li>Logins This Month: {metrics.loginsThisMonth}</li>
        <li>Total Reports: {metrics.totalReports}</li>
        <li>Unresolved Reports: {metrics.unresolvedReports}</li>
        <li>Reported Posts: {metrics.reportedPosts}</li>
        <li>Banned Users: {metrics.bannedUsers}</li>
      </ul>
    </div>
  );
}
