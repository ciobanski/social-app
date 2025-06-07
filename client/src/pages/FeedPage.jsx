// src/pages/FeedPage.jsx

import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
  FiHeart,
  FiMessageCircle,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiCamera,
  FiChevronUp,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { api } from '../api';
import AuthContext from '../AuthContext';

dayjs.extend(customParseFormat);

// Validation schema: allow empty string because image‐only posts are permitted
const postSchema = yup
  .object({
    content: yup.string().nullable(),
  })
  .required();

export default function FeedPage() {
  const { user, authLoading } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsState, setCommentsState] = useState({}); // { [postId]: { open, comments[], input } }
  const [showScroll, setShowScroll] = useState(false);

  // New‐post preview state
  const [imageFiles, setImageFiles] = useState([]); // File[]
  const [imagePreviews, setImagePreviews] = useState([]); // object URLs

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');

  // "See more" expansion
  const [expandedPosts, setExpandedPosts] = useState({}); // { [postId]: bool }

  // Carousel indices per post
  const [carouselIndices, setCarouselIndices] = useState({}); // { [postId]: index }

  // Hidden file input ref (for Photo button)
  const fileInputRef = useRef();

  //
  // ── Dropzone (drag‐and‐drop only; no click) ─────────────────────────────────
  //
  const onDrop = useCallback(
    (acceptedFiles) => {
      const total = imageFiles.length + acceptedFiles.length;
      if (total > 15) {
        toast.error('Maximum of 15 photos allowed.');
        return;
      }
      const imgs = acceptedFiles.filter((f) => f.type.startsWith('image/'));
      if (!imgs.length) return;
      const newPreviews = imgs.map((f) => URL.createObjectURL(f));
      setImageFiles((prev) => [...prev, ...imgs]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    },
    [imageFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
    noClick: true, // disable click‐to‐open
    noKeyboard: true, // disable space/enter opening
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(postSchema),
    defaultValues: { content: '' },
  });

  //
  // ── Load feed (only when user is known) ──────────────────────────────────
  //
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/posts');
        setPosts(data);
      } catch {
        toast.error('Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  //
  // ── Scroll‐to‐top control ──────────────────────────────────────────────────
  //
  useEffect(() => {
    const onScroll = () => setShowScroll(window.pageYOffset > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  //
  // ── Handle Photo‐button file selection ────────────────────────────────────
  //
  const handlePhotoClick = () => {
    fileInputRef.current.click();
  };
  const onFileSelected = (e) => {
    const files = Array.from(e.target.files || []);
    onDrop(files);
  };

  //
  // ── Create new post (text + images) ───────────────────────────────────────
  //
  const onPost = async ({ content }) => {
    const trimmed = content?.trim() || '';
    if (!trimmed && imageFiles.length === 0) {
      return toast.error('Please add text or at least one image.');
    }
    try {
      let res;
      if (imageFiles.length > 0) {
        const form = new FormData();
        form.append('content', trimmed);
        imageFiles.forEach((file) => form.append('images', file));
        res = await api.post('/posts', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/posts', { content: trimmed });
      }
      setPosts((prev) => [res.data, ...prev]);
      reset();
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImageFiles([]);
      setImagePreviews([]);
      toast.success('Posted!');
    } catch {
      toast.error('Could not create post');
    }
  };

  //
  // ── Like/unlike a post ───────────────────────────────────────────────────
  //
  const handleLike = async (postId) => {
    const p = posts.find((x) => x._id === postId);
    if (!p) return;
    try {
      if (p.liked) {
        await api.delete(`/posts/${postId}/like`);
        setPosts((ps) =>
          ps.map((x) =>
            x._id === postId
              ? { ...x, liked: false, likeCount: x.likeCount - 1 }
              : x
          )
        );
      } else {
        await api.post(`/posts/${postId}/like`);
        setPosts((ps) =>
          ps.map((x) =>
            x._id === postId
              ? { ...x, liked: true, likeCount: x.likeCount + 1 }
              : x
          )
        );
      }
    } catch {
      toast.error('Could not update like');
    }
  };

  //
  // ── Toggle & load comments for a post ────────────────────────────────────
  //
  const toggleComments = (postId) => {
    setCommentsState((s) => {
      const cs = s[postId] || { open: false, comments: [], input: '' };
      const open = !cs.open;
      if (open && !cs.comments.length) {
        api
          .get(`/comments/post/${postId}`)
          .then((res) =>
            setCommentsState((prev) => ({
              ...prev,
              [postId]: { ...cs, open, comments: res.data },
            }))
          )
          .catch(() => toast.error('Failed to load comments'));
      }
      return { ...s, [postId]: { ...cs, open } };
    });
  };

  const handleCommentChange = (postId, value) =>
    setCommentsState((s) => ({
      ...s,
      [postId]: { ...(s[postId] || {}), input: value },
    }));

  //
  // ── Submit a new comment (parent or reply) ───────────────────────────────
  //
  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const cs = commentsState[postId];
    if (!cs.input.trim()) return;
    try {
      const { data: newC } = await api.post('/comments', {
        postId,
        content: cs.input.trim(),
        parentComment: cs.parentComment || null,
      });

      // Insert new comment/reply immediately after its parent (or at end if parentComment is null)
      setCommentsState((prev) => {
        const cs2 = prev[postId];
        if (!cs2) return prev;

        // Find index of parent (or, if top-level, index = -1 → push to end)
        const idx = cs2.comments.findIndex(
          (c) => c._id === (cs2.parentComment || '')
        );
        const updatedList =
          idx >= 0
            ? [
              ...cs2.comments.slice(0, idx + 1),
              newC,
              ...cs2.comments.slice(idx + 1),
            ]
            : [...cs2.comments, newC];

        return {
          ...prev,
          [postId]: { ...cs2, comments: updatedList, input: '' },
        };
      });

      setPosts((ps) =>
        ps.map((x) =>
          x._id === postId
            ? { ...x, commentCount: x.commentCount + 1 }
            : x
        )
      );
      toast.success('Comment added');
    } catch {
      toast.error('Could not add comment');
    }
  };

  //
  // ── Like/unlike a comment ───────────────────────────────────────────────
  //
  const handleCommentLike = async (postId, commentId) => {
    const cs = commentsState[postId];
    if (!cs) return;

    // Toggle locally first
    const updatedComments = cs.comments.map((c) => {
      if (c._id === commentId) {
        return {
          ...c,
          liked: !c.liked,
          likeCount: c.liked ? c.likeCount - 1 : c.likeCount + 1,
        };
      }
      return c;
    });

    setCommentsState((prev) => ({
      ...prev,
      [postId]: { ...cs, comments: updatedComments },
    }));

    // Then sync with server
    try {
      const cObj = cs.comments.find((c) => c._id === commentId);
      if (cObj && cObj.liked) {
        await api.delete(`/comments/${commentId}/like`);
      } else {
        await api.post(`/comments/${commentId}/like`);
      }
    } catch {
      toast.error('Could not update comment like');

      // Revert on failure
      const reverted = updatedComments.map((c) =>
        c._id === commentId
          ? {
            ...c,
            liked: !c.liked,
            likeCount: c.liked ? c.likeCount + 1 : c.likeCount - 1,
          }
          : c
      );
      setCommentsState((prev) => ({
        ...prev,
        [postId]: { ...cs, comments: reverted },
      }));
    }
  };

  //
  // ── Show/hide a reply input under a specific comment ──────────────────────
  //
  const handleShowReply = (postId, commentId) => {
    setCommentsState((s) => {
      const cs = s[postId];
      if (!cs) return s;

      return {
        ...s,
        [postId]: {
          ...cs,
          comments: cs.comments.map((c) =>
            c._id === commentId ? { ...c, showReply: !c.showReply } : c
          ),
        },
      };
    });
  };

  //
  // ── Submit a reply to a specific comment (parentCommentId) ───────────────
  //
  const handleReplySubmit = async (e, postId, parentCommentId) => {
    e.preventDefault();
    const cs = commentsState[postId];
    if (!cs) return;

    const replyText = e.target.elements[`reply-${parentCommentId}`].value;
    if (!replyText.trim()) return;

    try {
      const { data: newReply } = await api.post('/comments', {
        postId,
        content: replyText.trim(),
        parentComment: parentCommentId,
      });

      // Insert new reply immediately after its parent
      setCommentsState((prev) => {
        const cs2 = prev[postId];
        if (!cs2) return prev;

        const idx = cs2.comments.findIndex((c) => c._id === parentCommentId);
        if (idx < 0) return prev;

        const updatedList = [
          ...cs2.comments.slice(0, idx + 1),
          newReply,
          ...cs2.comments.slice(idx + 1),
        ];
        return {
          ...prev,
          [postId]: { ...cs2, comments: updatedList },
        };
      });

      setPosts((ps) =>
        ps.map((x) =>
          x._id === postId
            ? { ...x, commentCount: x.commentCount + 1 }
            : x
        )
      );
      toast.success('Reply added');
      // Clear the input
      e.target.reset();
    } catch {
      toast.error('Could not add reply');
    }
  };

  //
  // ── Truncate post text with "See more" toggle ─────────────────────────────
  //
  const TRUNCATE_LENGTH = 200;
  const isTruncated = (text) => text.length > TRUNCATE_LENGTH;
  const displayText = (post) => {
    const full = post.content || '';
    if (expandedPosts[post._id] || !isTruncated(full)) return full;
    return full.slice(0, TRUNCATE_LENGTH) + '…';
  };
  const toggleExpand = (postId) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  //
  // ── Format a raw timestamp ────────────────────────────────────────────────
  //
  const formatDate = (raw) => {
    let d = dayjs(raw, 'DD-MM-YYYY HH:mm:ss', true);
    if (!d.isValid()) d = dayjs(raw);
    return d.isValid() ? d.format('MMM D, YYYY h:mm A') : 'Invalid date';
  };

  //
  // ── Revoke preview URLs on unmount ────────────────────────────────────────
  //
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  //
  // ── Early return if still checking auth or not logged in ──────────────────
  //
  if (authLoading) return null;
  if (!user) {
    return (
      <div className="flex justify-center items-center h-full py-8">
        <p className="text-lg text-gray-300">Please log in to see the feed.</p>
      </div>
    );
  }

  return (
    <div className="mt-14 flex flex-col lg:flex-row max-w-screen-xl mx-auto px-2 lg:px-4 gap-6">
      {/* ── Left Sidebar (Profile) ─────────────────────────────────────────── */}
      <div className="hidden lg:block lg:w-2/12">
        <div className="bg-gray-800 rounded-lg p-4 text-center mb-6">
          <img
            src={user.avatarUrl || '/default-avatar.png'}
            alt="Your avatar"
            className="w-24 h-24 rounded-full mx-auto mb-2 object-cover"
          />
          <a
            href={`/profile/${user.id}`}
            className="text-white text-lg font-semibold hover:text-gray-300"
          >
            {user.firstName} {user.lastName}
          </a>
        </div>
      </div>

      {/* ── Main Feed ───────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-8/12">
        {/* New Post Box */}
        <div
          {...getRootProps()}
          className={`bg-gray-800 rounded-lg pt-6 px-4 pb-4 mb-6 ${isDragActive ? 'border-2 border-blue-500' : ''
            }`}
        >
          <input {...getInputProps()} />
          <form onSubmit={handleSubmit(onPost)}>
            {/* Textarea */}
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  placeholder="What's on your mind?"
                  className="w-full bg-gray-900 text-white placeholder-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-800 resize-y min-h-[80px]"
                />
              )}
            />
            {errors.content && (
              <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
            )}

            {/* Photo & Submit Buttons */}
            <div className="flex items-center justify-between mt-4 mb-2">
              {/* Photo Button (icon only) */}
              <button
                type="button"
                onClick={handlePhotoClick}
                className="icon-button p-2 rounded-full hover:bg-gray-700 focus:outline-none"
              >
                <FiCamera size={20} className="text-blue-600" />
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-800 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {isSubmitting ? 'Posting…' : 'Post'}
              </button>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              multiple
              ref={fileInputRef}
              onChange={onFileSelected}
            />

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {imagePreviews.slice(0, 4).map((src, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 bg-gray-700 rounded overflow-hidden"
                  >
                    <img
                      src={src}
                      alt={`preview-${idx}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFiles((files) => files.filter((_, i) => i !== idx));
                        setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="icon-button absolute top-1 right-1 p-2 rounded-full hover:bg-gray-600 focus:outline-none"
                    >
                      <FiX size={14} className="text-gray-200" />
                    </button>
                  </div>
                ))}
                {imagePreviews.length > 4 && (
                  <div className="relative w-20 h-20 bg-gray-700 rounded flex items-center justify-center text-white font-bold">
                    +{imagePreviews.length - 4}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Feed Posts */}
        {loading ? (
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-gray-800 rounded-lg mb-4 animate-pulse h-48"
            ></div>
          ))
        ) : (
          posts.map((post) => {
            const cs = commentsState[post._id] || {
              open: false,
              comments: [],
              input: '',
              parentComment: null,
            };
            const images = post.imageUrls || [];
            const idx = carouselIndices[post._id] || 0;

            const goPrev = () => {
              setCarouselIndices((prev) => ({
                ...prev,
                [post._id]: Math.max(idx - 1, 0),
              }));
            };
            const goNext = () => {
              setCarouselIndices((prev) => ({
                ...prev,
                [post._id]: Math.min(idx + 1, images.length - 1),
              }));
            };

            // allComments is the flat array of comments and replies
            const allComments = cs.comments || [];
            // only top‐level (parentComment === null)
            const topComments = allComments.filter((c) => !c.parentComment);

            return (
              <div
                key={post._id}
                className="bg-gray-800 rounded-lg mb-6 overflow-hidden shadow"
              >
                {/* Post Header */}
                <div className="flex items-center px-4 py-3">
                  <a href={`/profile/${post.author._id}`}>
                    <img
                      src={post.author.avatarUrl || '/default-avatar.png'}
                      alt="author-avatar"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </a>
                  <div className="ml-3 flex-1">
                    <a
                      href={`/profile/${post.author._id}`}
                      className="text-gray-100 font-semibold hover:text-gray-300"
                    >
                      {post.author.firstName} {post.author.lastName}
                    </a>
                    <p className="text-gray-500 text-sm">
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Images Carousel */}
                {images.length > 0 && (
                  <div className="relative bg-black flex items-center justify-center">
                    <img
                      src={images[idx]}
                      alt={`img-${idx}`}
                      className="w-full max-h-96 object-contain cursor-pointer"
                      onClick={() => {
                        setLightboxSrc(images[idx]);
                        setLightboxOpen(true);
                      }}
                    />
                    {idx > 0 && (
                      <button
                        onClick={goPrev}
                        className="icon-button absolute left-2 p-2 rounded-full hover:bg-gray-700 focus:outline-none"
                      >
                        <FiChevronLeft size={24} className="text-white" />
                      </button>
                    )}
                    {idx < images.length - 1 && (
                      <button
                        onClick={goNext}
                        className="icon-button absolute right-2 p-2 rounded-full hover:bg-gray-700 focus:outline-none"
                      >
                        <FiChevronRight size={24} className="text-white" />
                      </button>
                    )}
                    <div className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                      {idx + 1}/{images.length}
                    </div>
                  </div>
                )}

                {/* Post Content */}
                <div className="px-4 py-3 text-left">
                  <p className="text-gray-100">
                    {displayText(post)}
                    {isTruncated(post.content || '') && (
                      <button
                        onClick={() => toggleExpand(post._id)}
                        className="ml-2 text-blue-900 hover:text-blue-700 text-sm focus:outline-none"
                      >
                        {expandedPosts[post._id] ? 'See less' : 'See more'}
                      </button>
                    )}
                  </p>
                </div>

                {/* Likes / Comments Actions */}
                <div className="flex items-center px-4 pb-3 space-x-6">
                  <button
                    onClick={() => handleLike(post._id)}
                    className="icon-button flex items-center space-x-1 hover:text-red-500 focus:outline-none p-2 rounded-full"
                  >
                    {post.liked ? (
                      <FiHeart size={20} className="text-red-500" />
                    ) : (
                      <FiHeart size={20} className="text-gray-300 hover:text-red-500" />
                    )}
                    <span className="text-sm text-gray-300">{post.likeCount}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(post._id)}
                    className="icon-button flex items-center space-x-1 hover:text-blue-500 focus:outline-none p-2 rounded-full"
                  >
                    <FiMessageCircle size={20} className="text-gray-300 hover:text-blue-500" />
                    <span className="text-sm text-gray-300">{post.commentCount}</span>
                  </button>
                </div>

                {/* Comments Section */}
                {cs.open && (
                  <div className="px-4 pb-4">
                    <div className="border-t border-gray-700 mt-2 pt-2 max-h-60 overflow-y-auto pr-1">
                      {topComments.map((parent) => {
                        return (
                          <div key={parent._id} className="mb-4">
                            {/* ── Parent Comment ──────────────────────────── */}
                            <div className="flex">
                              <img
                                src={parent.author.avatarUrl || '/default-avatar.png'}
                                alt="commenter-avatar"
                                className="w-8 h-8 rounded-full object-cover mr-2"
                              />
                              <div className="flex-1">
                                <div className="flex items-baseline space-x-2">
                                  <a
                                    href={`/profile/${parent.author._id}`}
                                    className="text-gray-100 font-semibold hover:text-gray-300 text-sm"
                                  >
                                    {parent.author.firstName} {parent.author.lastName}
                                  </a>
                                  <span className="text-gray-500 text-xs">
                                    {formatDate(parent.createdAt)}
                                  </span>
                                </div>
                                <p className="text-gray-200 text-sm mt-1">{parent.content}</p>

                                {/* ── Parent Comment Actions: like & reply ── */}
                                <div className="flex items-center space-x-4 mt-1">
                                  <button
                                    onClick={() =>
                                      handleCommentLike(post._id, parent._id)
                                    }
                                    className="icon-button flex items-center space-x-1 hover:text-red-500 focus:outline-none p-1 rounded-full"
                                  >
                                    {parent.liked ? (
                                      <FiHeart size={16} className="text-red-500" />
                                    ) : (
                                      <FiHeart
                                        size={16}
                                        className="text-gray-400 hover:text-red-500"
                                      />
                                    )}
                                    <span className="text-xs text-gray-400">
                                      {parent.likeCount}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleShowReply(post._id, parent._id)
                                    }
                                    className="icon-button flex items-center space-x-1 hover:text-blue-500 focus:outline-none p-1 rounded-full"
                                  >
                                    <FiMessageCircle
                                      size={16}
                                      className="text-gray-400 hover:text-blue-500"
                                    />
                                    <span className="text-xs text-gray-400">Reply</span>
                                  </button>
                                </div>

                                {/* ── Render Replies to This Parent ─────────── */}
                                {allComments
                                  .filter((c) => c.parentComment === parent._id)
                                  .map((child) => {
                                    return (
                                      <div key={child._id} className="flex mt-3 ml-10">
                                        <img
                                          src={child.author.avatarUrl || '/default-avatar.png'}
                                          alt="replier-avatar"
                                          className="w-8 h-8 rounded-full object-cover mr-2"
                                        />
                                        <div className="flex-1">
                                          <div className="flex items-baseline space-x-2">
                                            <a
                                              href={`/profile/${child.author._id}`}
                                              className="text-gray-100 font-semibold hover:text-gray-300 text-sm"
                                            >
                                              {child.author.firstName}{' '}
                                              {child.author.lastName}
                                            </a>
                                            <span className="text-gray-500 text-xs">
                                              {formatDate(child.createdAt)}
                                            </span>
                                          </div>
                                          <p className="text-gray-200 text-sm mt-1">
                                            {/* Mention only the immediate parent */}
                                            <a
                                              href={`/profile/${parent.author._id}`}
                                              className="text-blue-600 hover:text-blue-500"
                                            >
                                              @{parent.author.firstName}
                                            </a>{' '}
                                            {child.content}
                                          </p>

                                          {/* ── Child Comment Actions ─────────── */}
                                          <div className="flex items-center space-x-4 mt-1">
                                            <button
                                              onClick={() =>
                                                handleCommentLike(post._id, child._id)
                                              }
                                              className="icon-button flex items-center space-x-1 hover:text-red-500 focus:outline-none p-1 rounded-full"
                                            >
                                              {child.liked ? (
                                                <FiHeart size={16} className="text-red-500" />
                                              ) : (
                                                <FiHeart
                                                  size={16}
                                                  className="text-gray-400 hover:text-red-500"
                                                />
                                              )}
                                              <span className="text-xs text-gray-400">
                                                {child.likeCount}
                                              </span>
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleShowReply(post._id, child._id)
                                              }
                                              className="icon-button flex items-center space-x-1 hover:text-blue-500 focus:outline-none p-1 rounded-full"
                                            >
                                              <FiMessageCircle
                                                size={16}
                                                className="text-gray-400 hover:text-blue-500"
                                              />
                                              <span className="text-xs text-gray-400">
                                                Reply
                                              </span>
                                            </button>
                                          </div>

                                          {/* ── Reply Input Under Child (if toggled) ── */}
                                          {child.showReply && (
                                            <form
                                              onSubmit={(e) =>
                                                handleReplySubmit(e, post._id, child._id)
                                              }
                                              className="flex items-center space-x-2 mt-2 ml-6"
                                            >
                                              <input
                                                name={`reply-${child._id}`}
                                                type="text"
                                                placeholder="Write a reply…"
                                                className="flex-1 bg-gray-900 text-white placeholder-gray-400 px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                                              />
                                              <button
                                                type="submit"
                                                className="icon-button p-1 rounded-full hover:bg-gray-700 focus:outline-none"
                                              >
                                                <FiChevronUp
                                                  size={16}
                                                  className="text-blue-600 hover:text-blue-500"
                                                />
                                              </button>
                                            </form>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}

                                {/* ── Reply Input Under Parent (if toggled) ── */}
                                {parent.showReply && (
                                  <form
                                    onSubmit={(e) =>
                                      handleReplySubmit(e, post._id, parent._id)
                                    }
                                    className="flex items-center space-x-2 mt-2 ml-6"
                                  >
                                    <input
                                      name={`reply-${parent._id}`}
                                      type="text"
                                      placeholder="Write a reply…"
                                      className="flex-1 bg-gray-900 text-white placeholder-gray-400 px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                                    />
                                    <button
                                      type="submit"
                                      className="icon-button p-1 rounded-full hover:bg-gray-700 focus:outline-none"
                                    >
                                      <FiChevronUp
                                        size={16}
                                        className="text-blue-600 hover:text-blue-500"
                                      />
                                    </button>
                                  </form>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ── New comment form ───────────────────────── */}
                    <form
                      onSubmit={(e) => handleCommentSubmit(e, post._id)}
                      className="flex items-center space-x-2 mt-2"
                    >
                      <input
                        type="text"
                        placeholder="Write a comment…"
                        value={cs.input}
                        onChange={(e) =>
                          handleCommentChange(post._id, e.target.value)
                        }
                        className="flex-1 bg-gray-900 text-white placeholder-gray-400 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="submit"
                        className="icon-button p-2 rounded-full hover:bg-gray-700 focus:outline-none"
                      >
                        <FiMessageCircle
                          size={20}
                          className="text-blue-600 hover:text-blue-500"
                        />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Scroll‐to‐Top Button */}
        {showScroll && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="icon-button fixed bottom-6 right-6 p-2 rounded-full hover:bg-gray-700 focus:outline-none"
          >
            <FiChevronUp size={24} className="text-blue-600 hover:text-blue-500" />
          </button>
        )}
      </div>

      {/* ── Right Sidebar (Friends) ───────────────────────────────────────── */}
      <div className="hidden lg:block lg:w-2/12">
        <div className="bg-gray-800 rounded-lg p-4 h-[calc(100vh-4rem)] overflow-y-auto mb-6">
          <h2 className="text-gray-100 text-lg font-semibold mb-3">Friends</h2>
          <ul className="space-y-3">
            {[
              'Alice Wonderland',
              'Bob Builder',
              'Charlie Chaplin',
              'Diana Prince',
              'Eve Polastri',
              'Frank Sinatra',
              'Grace Hopper',
              'Hank Scorpio',
            ].map((name, idx) => {
              const initials = name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase();
              const isOnline = idx % 2 === 0;
              return (
                <li
                  key={idx}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700 cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-100 text-sm">{name}</p>
                    <p
                      className={`text-xs ${isOnline ? 'text-green-400' : 'text-gray-500'
                        }`}
                    >
                      {isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* ── Lightbox Dialog ──────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <button
            onClick={() => setLightboxOpen(false)}
            className="icon-button absolute top-4 right-4 p-2 rounded-full hover:bg-gray-700 focus:outline-none"
          >
            <FiX size={24} className="text-white" />
          </button>
          <img
            src={lightboxSrc}
            alt="full"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
