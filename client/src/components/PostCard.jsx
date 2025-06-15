// src/components/PostCard.jsx

import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import AuthContext from '../AuthContext';
import {
  FiMessageCircle,
  FiRepeat,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiTrash2,
} from 'react-icons/fi';
import { AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import { HiOutlineFlag } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { api } from '../api';

dayjs.extend(customParseFormat);

export default function PostCard({
  post,
  onLike,
  onSave,
  onShare,
  onReport,
  onCommentAdded,
  onDelete,
  isSharedPreview = false,
  sharer,
  hideSaveButton = false,
}) {
  const { user } = useContext(AuthContext);

  // === State ===
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [likeCount, setLikeCount] = useState(Number(post.likeCount || 0));
  const [saved, setSaved] = useState(Boolean(post.saved));
  const initialShared = post.shared ?? (post.type === 'share');
  const [shared, setShared] = useState(initialShared);
  const [commentCount, setCommentCount] = useState(Number(post.commentCount || 0));
  const [shareCount, setShareCount] = useState(Number(post.shareCount || 0));
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [parentTo, setParentTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');
  const bottomInputRef = useRef();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync props → state
  useEffect(() => setSaved(Boolean(post.saved)), [post.saved]);
  useEffect(() => setLiked(Boolean(post.liked)), [post.liked]);
  useEffect(() => {
    setShared(post.shared ?? (post.type === 'share'));
  }, [post.shared, post.type]);

  // Load comments when panel opens
  useEffect(() => {
    if (commentsOpen && comments.length === 0) {
      api.get(`/comments/post/${post._id}`)
        .then(res => {
          const data = res.data || [];
          setComments(data.map(c => ({
            ...c,
            liked: Boolean(c.liked),
            likeCount: Number(c.likeCount || 0),
          })));
        })
        .catch(() => toast.error('Failed to load comments'));
    }
  }, [commentsOpen, comments.length, post._id]);

  // Fetch share count if not a shared-preview stub
  useEffect(() => {
    if (!isSharedPreview) {
      api.get(`/shares/${post._id}`)
        .then(res => setShareCount(res.data.count))
        .catch(() => { });
    }
  }, [post._id, isSharedPreview]);

  // Render shared‐preview stub
  if (isSharedPreview && post.original && sharer) {
    return (
      <div className="max-w-screen-md mx-auto card bg-base-200 dark:bg-base-300 border border-base-content/10 shadow-md mb-6">
        <div className="flex items-center p-3 border-b border-base-content/10 bg-base-100 dark:bg-base-200 space-x-2">
          <Link
            to={`/profile/${sharer._id}`}
            className="font-semibold text-white hover:text-gray-200"
          >
            {sharer.firstName} {sharer.lastName}
          </Link>
          <span className="mx-1">shared</span>
          <Link
            to={`/profile/${post.original.author._id}`}
            className="font-semibold text-white hover:text-gray-200"
          >
            {post.original.author.firstName} {post.original.author.lastName}
          </Link>
          <span className="ml-1">{'\u2019'}s post</span>
        </div>
        <div className="p-3">
          <PostCard
            post={post.original}
            onLike={onLike}
            onSave={onSave}
            onShare={() => { }}
            onReport={onReport}
            onCommentAdded={onCommentAdded}
            onDelete={onDelete}
            hideSaveButton={true}
          />
        </div>
      </div>
    );
  }

  // === Helpers ===
  const formatDate = raw => {
    let d = dayjs(raw, 'DD-MM-YYYY HH:mm:ss', true);
    if (!d.isValid()) d = dayjs(raw);
    return d.isValid() ? d.format('MMM D, YYYY h:mm A') : '';
  };

  const MAX = 200;
  const isLong = text => (text || '').length > MAX;
  const showText = () => {
    const full = post.content || '';
    return expanded || !isLong(full) ? full : full.slice(0, MAX) + '…';
  };

  const media = [
    ...(post.imageUrls || []).map(u => ({ url: u, type: 'image' })),
    ...(post.videoUrls || []).map(u => ({ url: u, type: 'video' })),
  ];

  const getReplies = (all, parentId) =>
    all.filter(c => {
      let curr = c;
      while (curr.parentComment) {
        if (curr.parentComment === parentId) return true;
        curr = all.find(x => x._id === curr.parentComment) || {};
      }
      return false;
    });

  // === Action handlers ===
  const handleLikeClick = async () => {
    const orig = liked;
    setLiked(!orig);
    setLikeCount(c => (orig ? c - 1 : c + 1));
    onLike?.(post._id, !orig, likeCount + (orig ? -1 : +1));
    try {
      if (orig) await api.delete(`/posts/${post._id}/like`);
      else await api.post(`/posts/${post._id}/like`);
    } catch {
      setLiked(orig);
      setLikeCount(likeCount);
      toast.error('Could not update like');
    }
  };

  const handleSaveClick = async () => {
    try {
      if (saved) {
        await api.delete(`/posts/${post._id}/save`);
        setSaved(false);
        onSave?.(post._id, false);
        toast.success('Removed save');
      } else {
        await api.post(`/posts/${post._id}/save`);
        setSaved(true);
        onSave?.(post._id, true);
        toast.success('Saved post');
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg === 'Already saved') {
        setSaved(true);
        onSave?.(post._id, true);
        toast.info('Already saved');
      } else {
        toast.error('Could not update save');
      }
    }
  };

  const handleShareClick = () => {
    setShared(true);
    setShareCount(c => c + 1);
    onShare?.(post);
  };

  const handleReportClick = async () => {
    try {
      await api.post(`/posts/${post._id}/report`);
      toast.success('Reported');
      onReport?.();
    } catch {
      toast.error('Report failed');
    }
  };

  const toggleComments = () => setCommentsOpen(o => !o);

  const handleReply = cid => {
    setParentTo(cid);
    setShowReplies(m => ({ ...m, [cid]: true }));
    setTimeout(() => bottomInputRef.current?.focus(), 0);
  };

  const handleCommentLike = async cid => {
    setComments(cs =>
      cs.map(c =>
        c._id === cid
          ? {
            ...c,
            liked: !c.liked,
            likeCount: c.liked ? c.likeCount - 1 : c.likeCount + 1,
          }
          : c
      )
    );
    try {
      const cObj = comments.find(c => c._id === cid);
      if (cObj.liked) await api.delete(`/comments/${cid}/like`);
      else await api.post(`/comments/${cid}/like`);
    } catch {
      toast.error('Could not update comment like');
    }
  };

  const handleCommentSubmit = async e => {
    e.preventDefault();
    const txt = commentInput.trim();
    if (!txt) return;
    try {
      const { data: newC } = await api.post('/comments', {
        postId: post._id,
        content: txt,
        parentComment: parentTo,
      });
      setComments(cs => [
        ...cs,
        { ...newC, liked: Boolean(newC.liked), likeCount: Number(newC.likeCount || 0) },
      ]);
      setCommentInput('');
      setParentTo(null);
      setCommentCount(c => c + 1);
      onCommentAdded?.(post._id);
      if (parentTo) setShowReplies(m => ({ ...m, [parentTo]: true }));
    } catch {
      toast.error('Could not add comment');
    }
  };

  const openLightbox = url => {
    setLightboxSrc(url);
    setLightboxOpen(true);
  };

  // === Render ===
  return (
    <div className="max-w-screen-md mx-auto mb-6 card bg-base-200 dark:bg-base-300 border border-base-content/10 shadow-md hover:shadow-lg relative">
      {showDeleteConfirm && (
        <div className="modal modal-open">
          <div className="modal-box max-w-80">
            <h3 className="font-bold text-lg">Delete post?</h3>
            <p className="py-8">Are you sure?</p>
            <div className="modal-action">
              <button
                onClick={() => {
                  onDelete?.(post._id);
                  setShowDeleteConfirm(false);
                }}
                className="btn"
              >
                Yes
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center p-4 space-x-3">
        <Link to={`/profile/${post.author._id}`}>
          <img
            src={post.author.avatarUrl || '/default-avatar.png'}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
        </Link>
        <div className="flex-1">
          <Link
            to={`/profile/${post.author._id}`}
            className="font-semibold text-white hover:text-gray-200"
          >
            {post.author.firstName} {post.author.lastName}
          </Link>
          <p className="text-xs text-base-content/60">
            {formatDate(post.createdAt)}
          </p>
        </div>
      </div>

      {/* Media Carousel */}
      {media.length > 0 && (
        <div className="relative bg-black">
          {media[carouselIdx].type === 'image' ? (
            <img
              src={media[carouselIdx].url}
              alt=""
              className="w-full h-96 object-contain cursor-pointer"
              onClick={() => openLightbox(media[carouselIdx].url)}
            />
          ) : (
            <video
              src={media[carouselIdx].url}
              className="w-full h-96 object-contain"
              controls
            />
          )}
          {carouselIdx > 0 && (
            <button
              onClick={() => setCarouselIdx(i => i - 1)}
              className="icon-button absolute left-2 top-1/2 -translate-y-1/2 text-white shadow"
            >
              <FiChevronLeft size={24} />
            </button>
          )}
          {carouselIdx < media.length - 1 && (
            <button
              onClick={() => setCarouselIdx(i => i + 1)}
              className="icon-button absolute right-2 top-1/2 -translate-y-1/2 text-white shadow"
            >
              <FiChevronRight size={24} />
            </button>
          )}
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
            {carouselIdx + 1}/{media.length}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <p className="leading-relaxed">
          {showText()}
          {isLong(post.content) && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="icon-button ml-2 hover:text-primary transition"
            >
              {expanded ? 'See less' : 'See more'}
            </button>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center px-4 pb-3 space-x-6">
        {/* Like */}
        <button
          onClick={handleLikeClick}
          className={`icon-button flex items-center space-x-1 transition-colors ${liked
            ? 'text-red-500'
            : 'text-gray-600 dark:text-gray-300 hover:text-red-500'
            }`}
        >
          {liked ? <AiFillHeart size={20} /> : <AiOutlineHeart size={20} />}
          <span>{likeCount}</span>
        </button>

        {/* Comment */}
        <button
          onClick={toggleComments}
          className="icon-button flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
        >
          <FiMessageCircle size={20} />
          <span>{commentCount}</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShareClick}
          className={`icon-button flex items-center space-x-1 transition-colors ${shared
            ? 'text-green-500'
            : 'text-gray-600 dark:text-gray-300 hover:text-green-500'
            }`}
        >
          <FiRepeat size={20} />
          <span>{shareCount}</span>
        </button>

        {/* Save */}
        {!hideSaveButton && (
          <button
            onClick={handleSaveClick}
            className={`icon-button flex items-center space-x-1 transition-colors ${saved
              ? 'text-yellow-400'
              : 'text-gray-600 dark:text-gray-300 hover:text-yellow-400'
              }`}
          >
            {saved ? <BsBookmarkFill size={20} /> : <BsBookmark size={20} />}
          </button>
        )}

        {/* Delete */}
        {user?.id === post.author._id && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="icon-button text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
          >
            <FiTrash2 size={20} />
          </button>
        )}

        {/* Report */}
        <button
          onClick={handleReportClick}
          className="icon-button ml-auto text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
        >
          <HiOutlineFlag size={20} />
        </button>
      </div>

      {/* Comments Panel */}
      {commentsOpen && (
        <div className="p-4 space-y-4">
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {comments
              .filter(c => !c.parentComment)
              .map(parent => {
                const replies = getReplies(comments, parent._id);
                return (
                  <div key={parent._id} className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <img
                        src={parent.author.avatarUrl || '/default-avatar.png'}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <Link
                            to={`/profile/${parent.author._id}`}
                            className="font-semibold text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-primary transition"
                          >
                            {parent.author.firstName} {parent.author.lastName}
                          </Link>
                          <span className="text-xs text-base-content/60">
                            {formatDate(parent.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1">{parent.content}</p>
                        <div className="flex space-x-4 text-sm mt-1">
                          <button
                            onClick={() => handleCommentLike(parent._id)}
                            className={`icon-button flex items-center space-x-1 transition-colors ${parent.liked
                              ? 'text-red-500'
                              : 'text-gray-600 dark:text-gray-300'
                              }`}
                          >
                            {parent.liked ? (
                              <AiFillHeart size={16} />
                            ) : (
                              <AiOutlineHeart size={16} />
                            )}
                            <span>{parent.likeCount}</span>
                          </button>
                          <button
                            onClick={() => handleReply(parent._id)}
                            className="icon-button flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                          >
                            <FiMessageCircle size={16} />
                            <span>Reply</span>
                          </button>
                        </div>

                        {replies.length > 0 && (
                          <button
                            onClick={() =>
                              setShowReplies(m => ({
                                ...m,
                                [parent._id]: !m[parent._id],
                              }))
                            }
                            className="icon-button flex items-center space-x-1 text-sm mt-1 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                          >
                            {showReplies[parent._id] ? (
                              <FiChevronUp size={16} />
                            ) : (
                              <FiChevronDown size={16} />
                            )}
                            <span>
                              {showReplies[parent._id] ? 'Hide' : 'Show'} replies ({replies.length})
                            </span>
                          </button>
                        )}

                        {showReplies[parent._id] &&
                          replies.map(c => {
                            const mention = comments.find(x => x._id === c.parentComment);
                            return (
                              <div key={c._id} className="mt-2 text-sm">
                                <div className="flex justify-between">
                                  <div className="flex items-center space-x-2">
                                    <img
                                      src={c.author.avatarUrl || '/default-avatar.png'}
                                      alt=""
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                    <Link
                                      to={`/profile/${c.author._id}`}
                                      className="font-semibold text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-primary transition"
                                    >
                                      {c.author.firstName} {c.author.lastName}
                                    </Link>
                                  </div>
                                  <span className="text-xs text-base-content/60">
                                    {formatDate(c.createdAt)}
                                  </span>
                                </div>
                                <p className="ml-8">
                                  {mention?.author && (
                                    <Link
                                      to={`/profile/${mention.author._id}`}
                                      className="text-primary hover:underline"
                                    >
                                      @{mention.author.firstName}
                                    </Link>
                                  )}{' '}
                                  {c.content}
                                </p>
                                <div className="flex space-x-4 text-xs ml-8 mt-1">
                                  <button
                                    onClick={() => handleCommentLike(c._id)}
                                    className={`icon-button flex items-center space-x-1 transition-colors ${c.liked
                                      ? 'text-red-500'
                                      : 'text-gray-600 dark:text-gray-300'
                                      }`}
                                  >
                                    {c.liked ? (
                                      <AiFillHeart size={14} />
                                    ) : (
                                      <AiOutlineHeart size={14} />
                                    )}
                                    <span>{c.likeCount}</span>
                                  </button>
                                  <button
                                    onClick={() => handleReply(c._id)}
                                    className="icon-button flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                  >
                                    <FiMessageCircle size={14} />
                                    <span>Reply</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Comment input */}
          <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2 mt-2">
            <input
              ref={bottomInputRef}
              type="text"
              placeholder={
                parentTo
                  ? `Reply to ${comments.find(c => c._id === parentTo)?.author.firstName}…`
                  : 'Write a comment…'
              }
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              className="input input-bordered flex-1"
            />
            <button type="submit" className="icon-button text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
              <FiChevronRight size={20} />
            </button>
          </form>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <button onClick={() => setLightboxOpen(false)} className="icon-button absolute top-4 right-4 text-gray-200">
            <FiX size={24} />
          </button>
          <img src={lightboxSrc} alt="full" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
