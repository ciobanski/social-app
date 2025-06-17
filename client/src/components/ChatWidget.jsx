// src/components/ChatWidget.jsx

import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  FiMessageCircle,
  FiX,
  FiArrowLeft,
  FiArrowRight,
  FiSmile,
  FiImage
} from 'react-icons/fi';
import EmojiPicker from 'emoji-picker-react';
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
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);


  const bodyRef = useRef();
  const fileInputRef = useRef();

  // Sync emoji picker theme with dark/light mode
  useEffect(() => {
    const root = document.documentElement;
    const update = () =>

      update();
    const mo = new MutationObserver(update);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  // Cleanup object URLs on unmount or when previews change
  useEffect(() => {
    return () => {
      mediaPreviews.forEach(URL.revokeObjectURL);
    };
  }, [mediaPreviews]);

  // Load friend list
  useEffect(() => {
    api.get('/friends')
      .then(res => {
        console.log('Loaded friends:', res.data.friends);
        setFriends(res.data.friends);
      })
      .catch(console.error);
  }, []);

  // Fetch unread counts & listen for incoming DMs
  useEffect(() => {
    api.get('/messages/unread-counts')
      .then(res => {
        console.log('Initial unread-counts:', res.data);
        setUnreadCounts(res.data);
      })
      .catch(console.error);

    if (!socket) return;
    const handler = msg => {
      console.log('Socket DM received (global):', msg);
      if (msg.to === currentUser.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.from]: (prev[msg.from] || 0) + 1
        }));
      }
    };
    socket.on('dm', handler);
    return () => socket.off('dm', handler);
  }, [socket, currentUser.id]);

  // Load conversation when a friend is selected
  useEffect(() => {
    console.log('Active friend changed:', activeFriend);
    setShowEmojiPicker(false);
    if (!activeFriend) {
      setMessages([]);
      return;
    }
    api.get(`/messages/${activeFriend._id}`)
      .then(res => {
        console.log(`Loaded messages for ${activeFriend._id}:`, res.data);
        setMessages(res.data);
        setUnreadCounts(prev => {
          const { [activeFriend._id]: _, ...rest } = prev;
          return rest;
        });
      })
      .catch(console.error);
  }, [activeFriend]);

  // Real-time incoming messages into open chat
  useEffect(() => {
    if (!socket || !activeFriend) return;
    const handler = msg => {
      console.log('Socket DM received (chat):', msg);
      if (msg.from === activeFriend._id) {
        setMessages(prev => [...prev, { ...msg, read: true }]);
      }
    };
    socket.on('dm', handler);
    return () => socket.off('dm', handler);
  }, [socket, activeFriend]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  // Emoji picker handler
  const onEmojiSelect = emojiData => {
    console.log('Emoji selected:', emojiData);
    setInput(prev => prev + emojiData.emoji);
  };

  // Handle selecting media files
  const handleMediaChange = e => {
    const files = Array.from(e.target.files || []);
    console.log('Media files selected:', files);
    setMediaFiles(files);
    const previews = files.map(f => URL.createObjectURL(f));
    console.log('Media previews created:', previews);
    setMediaPreviews(previews);
  };

  // Send message with optional media
  const sendMessage = async () => {
    const text = input.trim();
    console.log('sendMessage called with text:', text, 'mediaFiles:', mediaFiles);
    // require text or media
    if ((!text && mediaFiles.length === 0) || !activeFriend || !socket?.connected) {
      console.log('sendMessage aborted: no text or media, or no activeFriend/socket');
      return;
    }

    // 1) Upload media if any
    let mediaUrls = [];
    let mediaType = null;
    if (mediaFiles.length > 0) {
      const form = new FormData();
      mediaFiles.forEach(f => form.append('media', f));
      try {
        const { data } = await api.post('/messages/media', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Media upload response:', data);
        mediaUrls = data.urls;
        mediaType = data.type;
      } catch (err) {
        console.error('Chat media upload error:', err);
      }
    }

    // 2) Build a local message object, including local previews
    const localMsg = {
      from: { _id: currentUser.id },
      to: activeFriend._id,
      content: text,
      mediaUrls,           // server-returned URLs (or [])
      mediaPreviews,       // local preview URLs
      mediaType,           // 'image' | 'video' | null
      createdAt: new Date().toISOString(),
      read: false
    };
    console.log('Local message object:', localMsg);

    // 3) Immediately append locally
    setMessages(prev => [...prev, localMsg]);

    // 4) Emit to server
    console.log('Emitting dm:', {
      from: currentUser.id,
      to: activeFriend._id,
      content: text,
      mediaUrls,
      mediaType
    });
    socket.emit('dm', {
      from: currentUser.id,
      to: activeFriend._id,
      content: text,
      mediaUrls,
      mediaType
    });

    // 5) Clear inputs & previews
    setInput('');
    setMediaFiles([]);
    mediaPreviews.forEach(URL.revokeObjectURL);
    setMediaPreviews([]);
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, n) => a + n, 0);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-50 w-[76px] h-[76px] btn btn-primary btn-circle p-6 rounded-full"
      >
        {open ? <FiX size={28} /> : <FiMessageCircle size={32} />}
        {totalUnread > 0 && (
          <span className="badge badge-secondary absolute top-0 right-0">
            {totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 w-[480px] h-[540px] flex flex-col bg-base-200 border border-base-content/20 rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="flex-none flex items-center justify-between px-4 py-2 bg-base-300 border-b border-base-content/20">
            <span className="font-semibold">Chats</span>
            <FiX className="cursor-pointer" onClick={() => setOpen(false)} />
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Friends list */}
            <ul className="w-1/3 bg-base-100 overflow-y-auto border-r border-base-content/20">
              {friends.length === 0 && (
                <li className="p-4 text-center text-base-content/60">No friends</li>
              )}
              {friends.map(f => {
                const unread = unreadCounts[f._id] || 0;
                const isOnline = !!onlineUsers[f._id];
                return (
                  <li
                    key={f._id}
                    onClick={() => setActiveFriend(f)}
                    className={`
                      flex items-center px-3 py-2 cursor-pointer hover:bg-base-200
                      border-t border-white/20
                      ${activeFriend?._id === f._id ? 'bg-base-300' : ''}
                    `}
                  >
                    <img
                      src={f.avatarUrl || defaultAvatar}
                      alt=""
                      className="w-7 h-7 rounded-full mr-2"
                    />
                    <div className="flex-1 text-sm">
                      <div className="flex items-center">
                        <span>{f.firstName} {f.lastName}</span>
                        {isOnline && (
                          <span className="ml-1 w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="badge badge-error ml-auto">{unread}</span>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Chat pane */}
            <div className="w-2/3 flex flex-col">
              {/* Chat header */}
              <div className="flex-none flex items-center px-4 py-2 bg-base-300 border-b border-base-content/20">
                {activeFriend ? (
                  <>
                    <FiArrowLeft
                      className="cursor-pointer mr-2"
                      onClick={() => setActiveFriend(null)}
                    />
                    <span className="font-medium">
                      {activeFriend.firstName} {activeFriend.lastName}
                    </span>
                  </>
                ) : (
                  <span className="text-base-content/60">Select a chat</span>
                )}
              </div>

              {/* Messages */}
              <div
                ref={bodyRef}
                className="flex-1 p-3 overflow-y-auto space-y-2 bg-base-200"
              >
                {activeFriend &&
                  messages.map((m, i) => {
                    console.log('Rendering DM bubble:', m);
                    const isMe = m.from._id === currentUser.id;
                    const isLast = i === messages.length - 1;
                    const time = dayjs(m.createdAt).format('h:mm A');
                    // choose URLs: server mediaUrls or local previews
                    const urls =
                      m.mediaUrls?.length > 0
                        ? m.mediaUrls
                        : m.mediaPreviews || [];
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
                          className={`
                            max-w-[70%] break-words px-3 py-2 rounded-lg
                            ${isMe
                              ? 'bg-blue-500 text-white'
                              : 'bg-base-100 dark:bg-base-300'
                            }
                          `}
                        >
                          {/* Inline media */}
                          {urls.map((url, idx) =>
                            m.mediaType === 'video' ? (
                              <video
                                key={idx}
                                src={url}
                                controls
                                className="max-w-full rounded mb-1"
                              />
                            ) : (
                              <img
                                key={idx}
                                src={url}
                                className="max-w-full rounded mb-1"
                              />
                            )
                          )}

                          <div className="text-sm">{m.content}</div>
                          <div className="text-xs text-base-content/60 text-right mt-1">
                            {time}
                            {isMe && m.read && isLast && ' · Read'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Media previews + input row */}
              {activeFriend && (
                <div className="flex-none flex flex-col">
                  {/* Pre-send previews */}
                  {mediaPreviews.length > 0 && (
                    <div className="flex space-x-2 mb-2 px-4">
                      {mediaPreviews.map((src, idx) => (
                        <div key={idx} className="relative w-12 h-12">
                          {mediaFiles[idx].type.startsWith('video/') ? (
                            <video
                              src={src}
                              controls
                              className="object-cover w-full h-full rounded"
                            />
                          ) : (
                            <img
                              src={src}
                              className="object-cover w-full h-full rounded"
                            />
                          )}
                          <button
                            onClick={() => {
                              setMediaFiles(f =>
                                f.filter((_, i) => i !== idx)
                              );
                              setMediaPreviews(p =>
                                p.filter((_, i) => i !== idx)
                              );
                            }}
                            className="absolute top-0 right-0 btn btn-xs btn-ghost p-0 m-0"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input + controls */}
                  <div className="relative flex items-center px-4 py-2 bg-base-300 border-t border-base-content/20">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={handleMediaChange}
                    />
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="btn btn-ghost btn-sm btn-circle mr-2 p-0"
                    >
                      <FiImage size={20} />
                    </button>

                    {/* Emoji picker */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-4 mb-2 z-50 bg-base-100 dark:bg-base-800 p-2 rounded-lg shadow-lg">
                        <button
                          onClick={() => setShowEmojiPicker(false)}
                          className="absolute top-1 right-1 btn btn-ghost p-0 m-0 btn-xs z-10"
                          aria-label="Close emoji picker"
                        >
                          <FiX size={14} color='gray' />
                        </button>
                        <EmojiPicker className='emoji-picker'
                          onEmojiClick={onEmojiSelect}
                          theme='dark'
                          emojiStyle="google"
                          width={300}
                          height={300}

                        />
                      </div>
                    )}
                    <button
                      onClick={() => setShowEmojiPicker(v => !v)}
                      className="btn btn-ghost btn-sm mr-2 p-0"
                    >
                      <FiSmile size={20} />
                    </button>

                    {/* Text input */}
                    <input
                      type="text"
                      className="input input-bordered input-sm flex-1"
                      placeholder="Type a message…"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e =>
                        e.key === 'Enter' && sendMessage()
                      }
                    />

                    {/* Send button */}
                    <button
                      onClick={sendMessage}
                      className="btn btn-primary btn-sm ml-2"
                    >
                      <FiArrowRight />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
