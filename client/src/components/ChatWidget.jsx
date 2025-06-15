// src/components/ChatWidget.jsx

import React, {
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react';
import { FiMessageCircle, FiX, FiArrowLeft } from 'react-icons/fi';
import { useSocket } from '../contexts/SocketContext';
import AuthContext from '../AuthContext';
import { api } from '../api';
import defaultAvatar from '../assets/default-avatar.png';
import dayjs from 'dayjs';

export default function ChatWidget() {
  const { socket, onlineUsers } = useSocket();
  const { user: currentUser } = useContext(AuthContext);

  const [friends, setFriends] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [open, setOpen] = useState(false);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bodyRef = useRef();

  // 1) Load friend list once
  useEffect(() => {
    api.get('/friends')
      .then(res => setFriends(res.data.friends))
      .catch(console.error);
  }, []);

  // 2) Fetch unread‐counts on mount & listen for DMs
  useEffect(() => {
    api.get('/messages/unread-counts')
      .then(res => setUnreadCounts(res.data))
      .catch(console.error);

    if (socket) {
      const dmHandler = msg => {
        if (msg.to === currentUser.id) {
          setUnreadCounts(prev => ({
            ...prev,
            [msg.from._id]: (prev[msg.from._id] || 0) + 1,
          }));
        }
      };
      socket.on('dm', dmHandler);
      return () => socket.off('dm', dmHandler);
    }
  }, [socket, currentUser.id]);

  // 3) Open chat → load + clear unread
  useEffect(() => {
    if (!activeFriend) return;
    api.get(`/messages/${activeFriend._id}`)
      .then(res => {
        setMessages(res.data);
        setUnreadCounts(prev => {
          const { [activeFriend._id]: _, ...rest } = prev;
          return rest;
        });
      })
      .catch(console.error);
  }, [activeFriend]);

  // 4) Auto‐scroll
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  // 5) Send
  const sendMessage = () => {
    const text = input.trim();
    if (!text || !activeFriend || !socket?.connected) return;

    const outgoing = {
      from: { _id: currentUser.id },
      to: activeFriend._id,
      content: text,
      createdAt: new Date().toISOString(),
      read: true,
    };
    setMessages(m => [...m, outgoing]);
    socket.emit('dm', { to: activeFriend._id, content: text });
    setInput('');
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, n) => a + n, 0);

  return (
    <>
      {/* Toggle + global badge */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg"
      >
        {open ? <FiX size={24} /> : <FiMessageCircle size={24} />}
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
            {totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 w-80 h-96 flex flex-col bg-base-100 dark:bg-base-200 border border-base-content/20 rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="flex-none flex items-center justify-between px-4 py-2 bg-base-200 dark:bg-base-300 border-b border-base-content/20">
            {activeFriend ? (
              <>
                <button onClick={() => setActiveFriend(null)} className="icon-button">
                  <FiArrowLeft />
                </button>
                <img
                  src={activeFriend.avatarUrl || defaultAvatar}
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

          {/* Body (scrollable) */}
          {activeFriend ? (
            <div className="flex-1 flex flex-col">
              <div
                ref={bodyRef}
                className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0"
              >
                {messages.map((m, i) => {
                  const isMe = m.from._id === currentUser.id;
                  const time = dayjs(m.createdAt);
                  return (
                    <div
                      key={i}
                      className={`flex items-end ${isMe ? 'justify-end' : 'justify-start'
                        }`}
                    >
                      {!isMe && (
                        <img
                          src={activeFriend.avatarUrl || defaultAvatar}
                          alt=""
                          className="w-6 h-6 rounded-full mr-2"
                        />
                      )}
                      <div
                        className={`max-w-[70%] px-3 py-1 rounded ${isMe
                          ? 'bg-blue-500 text-white'
                          : 'bg-base-200 dark:bg-base-300'
                          } ${!isMe && m.read === false
                            ? 'ring-2 ring-blue-400'
                            : ''
                          }`}
                      >
                        <div className="text-sm">{m.content}</div>
                        <div className="text-xs text-gray-500 mt-0.5 text-right">
                          {time.isValid() ? time.format('h:mm A') : '--:--'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input (fixed) */}
              <div className="flex-none p-2 border-t border-base-content/20 flex">
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
            /* Friend list */
            <ul className="flex-1 overflow-y-auto">
              {friends.map(f => {
                const isOnline = !!onlineUsers[f._id];
                const count = unreadCounts[f._id] || 0;
                return (
                  <li
                    key={f._id}
                    onClick={() => setActiveFriend(f)}
                    className="flex items-center px-4 py-2 hover:bg-base-content/10 cursor-pointer transition-colors"
                  >
                    <img
                      src={f.avatarUrl || defaultAvatar}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {f.firstName} {f.lastName}
                      </p>
                      <span
                        className={`text-sm ${isOnline ? 'text-green-500' : 'text-gray-400'
                          }`}
                      >
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {count > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2">
                        {count}
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
