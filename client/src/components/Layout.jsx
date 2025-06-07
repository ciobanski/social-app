// src/components/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Fixed Header */}
      <Header />

      {/* Main content wrapper: pad for header (h-16) */}
      <div className="pt-16 flex-1 overflow-x-hidden">
        <Outlet />

        {/* Chat bubble on small screens */}
        <button
          className="fixed bottom-4 left-4 bg-indigo-500 text-white p-3 rounded-full shadow-lg md:hidden"
          aria-label="Chat"
        >
          <span className="material-icons">chat_bubble_outline</span>
        </button>
      </div>
    </div>
  );
}
