import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-base-200 text-base-content">
      {/* Fixed Header */}
      <Header />

      {/* Main content: offset for header (h-16) */}
      <main className="pt-16 flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
