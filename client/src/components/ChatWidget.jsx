// src/components/ChatWidget.jsx

import React, { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiX, FiArrowLeft } from 'react-icons/fi';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../api';
import dayjs from 'dayjs';

export default function ChatWidget() {
  const { socket, onlineUsers } = useSocket();
  const [friends, setFriends] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [open, setOpen] = useState(false);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef();

  // --- Load friend list once ---
  useEffect(() => {
    api.get('/friends')
      .then(res => setFriends(res.data.friends))
      .catch(console.error);
  }, []);

  // --- When we open widget, fetch unread counts ---
  useEffect(() => {
    if (!open) return;
    api.get('/messages/unread-counts')
      .then(res => setUnreadCounts(res.data))
      .catch(() => { });
  }, [open]);

  // --- When selecting a friend, load last 50 messages ---
  useEffect(() => {
    if (!activeFriend) return;
    api.get(`/messages/${activeFriend._id}`)
      .then(res => setMessages(res.data))
      .catch(console.error);

    // subscribe to live DMs
    const handler = msg => {
      // only push if to/from this conversation
      if (
        (msg.from._id === activeFriend._id) ||
        (msg.to === activeFriend._id)
      ) {
        setMessages(m => [...m, msg]);
      }
    };
    socket?.on('dm', handler);
    return () => socket?.off('dm', handler);
  }, [activeFriend, socket]);

  // --- Always scroll to bottom on new message ---
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !activeFriend) return;
    socket.emit('dm', { to: activeFriend._id, content: input.trim() });
    setInput('');
  };

  return (
    <>
      {/* 1) Chat bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg transition-transform transform hover:scale-110"
        aria-label="Open chat"
      >
        {open ? <FiX size={24} /> : <FiMessageCircle size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 w-80 h-96 bg-base-100 dark:bg-base-200 border border-base-content/20 rounded-lg shadow-xl flex flex-col overflow-hidden z-50">
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-2 bg-base-200 dark:bg-base-300 border-b border-base-content/20">
            {activeFriend ? (
              <>
                <button onClick={() => setActiveFriend(null)} className="icon-button">
                  <FiArrowLeft />
                </button>
                <img
                  src={activeFriend.avatarUrl || '/default-avatar.png'}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover mr-2"
                />
                <span className="font-semibold flex-1">
                  {activeFriend.firstName} {activeFriend.lastName}
                </span>
                <button onClick={() => setOpen(false)} className="icon-button">
                  <FiX />
                </button>
              </>
            ) : (
              <span className="font-semibold">Chats</span>
            )}
          </div>

          {/* BODY */}
          {activeFriend ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {messages.map((m, i) => {
                  const isMe = m.from._id === socket.userId;
                  return (
                    <div
                      key={i}
                      className={`mb-2 flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] px-3 py-1 rounded ${isMe ? 'bg-blue-500 text-white' : 'bg-base-200 dark:bg-base-300'
                          }`}
                      >
                        <div className="text-sm">{m.content}</div>
                        <div className="text-xs text-gray-500 mt-0.5 text-right">
                          {dayjs(m.createdAt).format('h:mm A')}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Input */}
              <div className="p-2 border-t border-base-content/20 flex">
                <input
                  className="flex-1 input input-bordered"
                  placeholder="Type a message…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  className="btn btn-primary btn-sm ml-2"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {friends.map(f => {
                const isOnline = onlineUsers[f._id];
                const unread = unreadCounts[f._id] || 0;
                return (
                  <li
                    key={f._id}
                    onClick={() => setActiveFriend(f)}
                    className="flex items-center px-4 py-2 hover:bg-base-content/10 cursor-pointer transition-colors"
                  >
                    <img
                      src={f.avatarUrl || '/default-avatar.png'}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{f.firstName} {f.lastName}</p>
                      <span className={`text-sm ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {unread > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2">
                        {unread}
                      </span>
                    )}
                  </li>
                );
              })}
              {friends.length === 0 && (
                <li className="p-4 text-center text-base-content/60">
                  You have no friends yet.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
