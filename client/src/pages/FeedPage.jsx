// src/pages/FeedPage.jsx

import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  useRef
} from 'react';
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
  FiChevronUp
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { api } from '../api';
import AuthContext from '../AuthContext';

dayjs.extend(customParseFormat);

const postSchema = yup
  .object({
    content: yup.string().nullable()
  })
  .required();

export default function FeedPage() {
  const { user, authLoading } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsState, setCommentsState] = useState({});
  const [showScroll, setShowScroll] = useState(false);

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');

  const [expandedPosts, setExpandedPosts] = useState({});
  const [carouselIndices, setCarouselIndices] = useState({});
  const fileInputRef = useRef();

  const onDrop = useCallback(
    (accepted) => {
      const total = imageFiles.length + accepted.length;
      if (total > 15) {
        return toast.error('Max 15 images');
      }
      const imgs = accepted.filter((f) => f.type.startsWith('image/'));
      const newPreviews = imgs.map((f) => URL.createObjectURL(f));
      setImageFiles((p) => [...p, ...imgs]);
      setImagePreviews((p) => [...p, ...newPreviews]);
    },
    [imageFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    noClick: true,
    noKeyboard: true
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(postSchema),
    defaultValues: { content: '' }
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/posts');
        setPosts(data);
      } catch {
        toast.error('Unable to load feed');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  useEffect(() => {
    const onScroll = () => setShowScroll(window.pageYOffset > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handlePhotoClick = () => fileInputRef.current.click();
  const onFileSelected = (e) => onDrop(Array.from(e.target.files || []));

  const onPost = async ({ content }) => {
    const text = content.trim();
    if (!text && imageFiles.length === 0) {
      return toast.error('Add text or images');
    }
    try {
      let res;
      if (imageFiles.length) {
        const form = new FormData();
        form.append('content', text);
        imageFiles.forEach((f) => form.append('images', f));
        res = await api.post('/posts', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.post('/posts', { content: text });
      }
      setPosts((p) => [res.data, ...p]);
      reset();
      imagePreviews.forEach(URL.revokeObjectURL);
      setImageFiles([]);
      setImagePreviews([]);
      toast.success('Posted!');
    } catch {
      toast.error('Post failed');
    }
  };

  const handleLike = async (postId) => {
    const p = posts.find((x) => x._id === postId);
    if (!p) return;
    try {
      if (p.liked) {
        await api.delete(`/posts/${postId}/like`);
      } else {
        await api.post(`/posts/${postId}/like`);
      }
      setPosts((ps) =>
        ps.map((x) =>
          x._id === postId
            ? {
              ...x,
              liked: !x.liked,
              likeCount: x.liked ? x.likeCount - 1 : x.likeCount + 1
            }
            : x
        )
      );
    } catch {
      toast.error('Like failed');
    }
  };

  const toggleComments = (postId) => {
    setCommentsState((s) => {
      const cs = s[postId] || { open: false, comments: [], input: '' };
      const open = !cs.open;
      if (open && !cs.comments.length) {
        api
          .get(`/comments/post/${postId}`)
          .then((r) =>
            setCommentsState((prev) => ({
              ...prev,
              [postId]: { ...cs, open, comments: r.data }
            }))
          )
          .catch(() => toast.error('Comments failed'));
      }
      return { ...s, [postId]: { ...cs, open } };
    });
  };

  const handleCommentChange = (pid, v) =>
    setCommentsState((s) => ({
      ...s,
      [pid]: { ...(s[pid] || {}), input: v }
    }));

  const handleCommentSubmit = async (e, pid) => {
    e.preventDefault();
    const cs = commentsState[pid];
    if (!cs.input.trim()) return;
    try {
      const { data: c } = await api.post('/comments', {
        postId: pid,
        content: cs.input.trim(),
        parentComment: cs.parentComment || null
      });
      setCommentsState((prev) => {
        const cur = prev[pid];
        const idx = cur.comments.findIndex(
          (x) => x._id === (cur.parentComment || '')
        );
        const updated =
          idx >= 0
            ? [
              ...cur.comments.slice(0, idx + 1),
              c,
              ...cur.comments.slice(idx + 1)
            ]
            : [...cur.comments, c];
        return {
          ...prev,
          [pid]: { ...cur, comments: updated, input: '' }
        };
      });
      setPosts((ps) =>
        ps.map((x) =>
          x._id === pid ? { ...x, commentCount: x.commentCount + 1 } : x
        )
      );
      toast.success('Comment added');
    } catch {
      toast.error('Comment failed');
    }
  };

  const handleCommentLike = async (pid, cid) => {
    const cs = commentsState[pid];
    if (!cs) return;
    const cobj = cs.comments.find((c) => c._id === cid);
    const liked = cobj.liked;
    setCommentsState((prev) => ({
      ...prev,
      [pid]: {
        ...cs,
        comments: cs.comments.map((c) =>
          c._id === cid
            ? {
              ...c,
              liked: !c.liked,
              likeCount: liked ? c.likeCount - 1 : c.likeCount + 1
            }
            : c
        )
      }
    }));
    try {
      if (liked) {
        await api.delete(`/comments/${cid}/like`);
      } else {
        await api.post(`/comments/${cid}/like`);
      }
    } catch {
      toast.error('Comment like failed');
      // revert
      setCommentsState((prev) => ({
        ...prev,
        [pid]: {
          ...cs,
          comments: cs.comments.map((c) =>
            c._id === cid
              ? {
                ...c,
                liked,
                likeCount: liked ? c.likeCount + 1 : c.likeCount - 1
              }
              : c
          )
        }
      }));
    }
  };

  const handleShowReply = (pid, cid) =>
    setCommentsState((s) => {
      const cs = s[pid];
      return {
        ...s,
        [pid]: {
          ...cs,
          comments: cs.comments.map((c) =>
            c._id === cid ? { ...c, showReply: !c.showReply } : c
          )
        }
      };
    });

  const handleReplySubmit = async (e, pid, pc) => {
    e.preventDefault();
    const cs = commentsState[pid];
    const val = e.target.elements[`reply-${pc}`].value.trim();
    if (!val) return;
    try {
      const { data: r } = await api.post('/comments', {
        postId: pid,
        content: val,
        parentComment: pc
      });
      setCommentsState((prev) => {
        const cur = prev[pid];
        const idx = cur.comments.findIndex((c) => c._id === pc);
        const updated = [
          ...cur.comments.slice(0, idx + 1),
          r,
          ...cur.comments.slice(idx + 1)
        ];
        return { ...prev, [pid]: { ...cur, comments: updated } };
      });
      setPosts((ps) =>
        ps.map((x) =>
          x._id === pid ? { ...x, commentCount: x.commentCount + 1 } : x
        )
      );
      toast.success('Reply added');
      e.target.reset();
    } catch {
      toast.error('Reply failed');
    }
  };

  const TRUNCATE = 200;
  const isTruncated = (s) => s.length > TRUNCATE;
  const displayText = (post) => {
    const ct = post.content || '';
    if (expandedPosts[post._id] || !isTruncated(ct)) return ct;
    return ct.slice(0, TRUNCATE) + '…';
  };
  const toggleExpand = (pid) => {
    setExpandedPosts((p) => ({ ...p, [pid]: !p[pid] }));
  };

  const formatDate = (raw) => {
    let d = dayjs(raw, 'DD-MM-YYYY HH:mm:ss', true);
    if (!d.isValid()) d = dayjs(raw);
    return d.isValid()
      ? d.format('MMM D, YYYY h:mm A')
      : 'Invalid date';
  };

  useEffect(
    () => () => imagePreviews.forEach(URL.revokeObjectURL),
    [imagePreviews]
  );

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-base-content/60">
          Please log in to see the feed.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-16 lg:mt-20 flex flex-col lg:flex-row max-w-screen-xl mx-auto px-4 lg:px-6 gap-6">
      {/* Profile Sidebar */}
      <aside className="hidden lg:block lg:w-2/12">
        <div className="card bg-base-100 shadow">
          <div className="card-body text-center space-y-4">
            <div className="avatar mx-auto">
              <div className="w-24 h-24 rounded-full">
                <img
                  src={user.avatarUrl || '/default-avatar.png'}
                  alt="avatar"
                />
              </div>
            </div>
            <a
              href={`/profile/${user.id}`}
              className="font-semibold text-primary"
            >
              {user.firstName} {user.lastName}
            </a>
          </div>
        </div>
      </aside>

      {/* Main Feed */}
      <section className="w-full lg:w-8/12 space-y-6">
        {/* New Post */}
        <div
          {...getRootProps()}
          className={`card bg-base-100 shadow ${isDragActive ? 'ring ring-primary' : ''
            }`}
        >
          <div className="card-body space-y-4">
            <form onSubmit={handleSubmit(onPost)} className="space-y-4">
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    placeholder="What's on your mind?"
                    className="textarea textarea-bordered w-full"
                  />
                )}
              />
              {errors.content && (
                <p className="text-error text-sm">
                  {errors.content.message}
                </p>
              )}

              <div className="flex items-center justify-between">
                <input {...getInputProps()} />
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handlePhotoClick}
                    className="btn btn-square btn-ghost"
                  >
                    <FiCamera />
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                  >
                    {isSubmitting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>

              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.slice(0, 4).map((src, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                      <img
                        src={src}
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFiles((f) => f.filter((_, idx) => idx !== i));
                          setImagePreviews((p) => p.filter((_, idx) => idx !== i));
                        }}
                        className="btn btn-xs btn-circle absolute top-1 right-1"
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.length > 4 && (
                    <div className="w-20 h-20 bg-base-200 rounded-lg flex items-center justify-center text-lg font-bold">
                      +{imagePreviews.length - 4}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          Array(3)
            .fill(0)
            .map((_, idx) => (
              <div
                key={idx}
                className="h-48 bg-base-200 animate-pulse rounded-lg"
              />
            ))
        ) : (
          posts.map((post) => {
            const cs = commentsState[post._id] || {
              open: false,
              comments: [],
              input: ''
            };
            const imgs = post.imageUrls || [];
            const idx = carouselIndices[post._id] || 0;
            return (
              <div key={post._id} className="card bg-base-100 shadow">
                <div className="card-body space-y-4">
                  {/* Header */}
                  <div className="flex items-center space-x-3">
                    <a href={`/profile/${post.author._id}`}>
                      <div className="avatar">
                        <div className="w-10 h-10 rounded-full">
                          <img src={post.author.avatarUrl} alt="" />
                        </div>
                      </div>
                    </a>
                    <div>
                      <a
                        href={`/profile/${post.author._id}`}
                        className="font-semibold"
                      >
                        {post.author.firstName} {post.author.lastName}
                      </a>
                      <p className="text-xs text-base-content/60">
                        {formatDate(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Carousel */}
                  {imgs.length > 0 && (
                    <div className="relative">
                      <img
                        src={imgs[idx]}
                        className="rounded-lg max-h-96 w-full object-contain cursor-pointer"
                        onClick={() => {
                          setLightboxSrc(imgs[idx]);
                          setLightboxOpen(true);
                        }}
                      />
                      {idx > 0 && (
                        <button
                          onClick={() =>
                            setCarouselIndices((p) => ({
                              ...p,
                              [post._id]: idx - 1
                            }))
                          }
                          className="btn btn-circle btn-ghost absolute left-2 top-1/2 transform -translate-y-1/2"
                        >
                          <FiChevronLeft />
                        </button>
                      )}
                      {idx < imgs.length - 1 && (
                        <button
                          onClick={() =>
                            setCarouselIndices((p) => ({
                              ...p,
                              [post._id]: idx + 1
                            }))
                          }
                          className="btn btn-circle btn-ghost absolute right-2 top-1/2 transform -translate-y-1/2"
                        >
                          <FiChevronRight />
                        </button>
                      )}
                      <div className="badge absolute bottom-2 right-2">
                        {idx + 1}/{imgs.length}
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <p>
                    {displayText(post)}
                    {isTruncated(post.content || '') && (
                      <button
                        onClick={() => toggleExpand(post._id)}
                        className="btn btn-link btn-sm"
                      >
                        {expandedPosts[post._id] ? 'See less' : 'See more'}
                      </button>
                    )}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center space-x-6">
                    <button
                      onClick={() => handleLike(post._id)}
                      className="flex items-center space-x-2 btn btn-ghost"
                    >
                      <FiHeart
                        className={
                          post.liked ? 'text-error' : 'text-base-content'
                        }
                      />
                      <span>{post.likeCount}</span>
                    </button>
                    <button
                      onClick={() => toggleComments(post._id)}
                      className="flex items-center space-x-2 btn btn-ghost"
                    >
                      <FiMessageCircle />
                      <span>{post.commentCount}</span>
                    </button>
                  </div>

                  {/* Comments */}
                  {cs.open && (
                    <div className="space-y-4">
                      <div className="space-y-4 max-h-60 overflow-y-auto">
                        {(cs.comments || []).map((c) => {
                          const replies = (cs.comments || []).filter(
                            (x) => x.parentComment === c._id
                          );
                          if (c.parentComment) return null;
                          return (
                            <div key={c._id} className="space-y-2">
                              <div className="flex items-start space-x-3">
                                <div className="avatar">
                                  <div className="w-8 h-8 rounded-full">
                                    <img
                                      src={c.author.avatarUrl}
                                      alt=""
                                    />
                                  </div>
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-baseline justify-between">
                                    <a
                                      href={`/profile/${c.author._id}`}
                                      className="font-medium"
                                    >
                                      {c.author.firstName}{' '}
                                      {c.author.lastName}
                                    </a>
                                    <span className="text-xs text-base-content/60">
                                      {formatDate(c.createdAt)}
                                    </span>
                                  </div>
                                  <p>{c.content}</p>
                                  <div className="flex items-center space-x-4">
                                    <button
                                      onClick={() =>
                                        handleCommentLike(post._id, c._id)
                                      }
                                      className="btn btn-ghost btn-sm flex items-center space-x-1"
                                    >
                                      <FiHeart
                                        className={
                                          c.liked
                                            ? 'text-error'
                                            : 'text-base-content'
                                        }
                                      />
                                      <span>{c.likeCount}</span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleShowReply(post._id, c._id)
                                      }
                                      className="btn btn-ghost btn-sm flex items-center space-x-1"
                                    >
                                      <FiMessageCircle />
                                      <span>Reply</span>
                                    </button>
                                  </div>

                                  {/* Replies */}
                                  {replies.map((r) => (
                                    <div
                                      key={r._id}
                                      className="flex items-start space-x-3 ml-10"
                                    >
                                      <div className="avatar">
                                        <div className="w-8 h-8 rounded-full">
                                          <img
                                            src={r.author.avatarUrl}
                                            alt=""
                                          />
                                        </div>
                                      </div>
                                      <div className="flex-1 space-y-1">
                                        <div className="flex items-baseline justify-between">
                                          <a
                                            href={`/profile/${r.author._id}`}
                                            className="font-medium"
                                          >
                                            {r.author.firstName}{' '}
                                            {r.author.lastName}
                                          </a>
                                          <span className="text-xs text-base-content/60">
                                            {formatDate(r.createdAt)}
                                          </span>
                                        </div>
                                        <p>
                                          <a
                                            href={`/profile/${c.author._id}`}
                                            className="text-primary"
                                          >
                                            @{c.author.firstName}
                                          </a>{' '}
                                          {r.content}
                                        </p>
                                        <div className="flex items-center space-x-4">
                                          <button
                                            onClick={() =>
                                              handleCommentLike(
                                                post._id,
                                                r._id
                                              )
                                            }
                                            className="btn btn-ghost btn-sm flex items-center space-x-1"
                                          >
                                            <FiHeart
                                              className={
                                                r.liked
                                                  ? 'text-error'
                                                  : 'text-base-content'
                                              }
                                            />
                                            <span>{r.likeCount}</span>
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleShowReply(
                                                post._id,
                                                r._id
                                              )
                                            }
                                            className="btn btn-ghost btn-sm flex items-center space-x-1"
                                          >
                                            <FiMessageCircle />
                                            <span>Reply</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  {c.showReply && (
                                    <form
                                      onSubmit={(e) =>
                                        handleReplySubmit(e, post._id, c._id)
                                      }
                                      className="flex items-center space-x-2"
                                    >
                                      <input
                                        name={`reply-${c._id}`}
                                        type="text"
                                        placeholder="Write a reply…"
                                        className="input input-sm input-bordered flex-1"
                                      />
                                      <button
                                        type="submit"
                                        className="btn btn-circle btn-sm"
                                      >
                                        <FiChevronUp />
                                      </button>
                                    </form>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* New Comment */}
                      <form
                        onSubmit={(e) =>
                          handleCommentSubmit(e, post._id)
                        }
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="text"
                          placeholder="Write a comment…"
                          value={cs.input}
                          onChange={(e) =>
                            handleCommentChange(post._id, e.target.value)
                          }
                          className="input input-bordered flex-1"
                        />
                        <button className="btn btn-circle btn-sm">
                          <FiMessageCircle />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {showScroll && (
          <button
            onClick={() =>
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
            className="btn btn-circle btn-primary fixed bottom-6 right-6"
          >
            <FiChevronUp />
          </button>
        )}
      </section>

      {/* Friends Sidebar */}
      <FriendsSidebar />

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-base-100/80 flex items-center justify-center z-50">
          <button
            onClick={() => setLightboxOpen(false)}
            className="btn btn-circle btn-ghost absolute top-4 right-4"
          >
            <FiX />
          </button>
          <img
            src={lightboxSrc}
            className="max-w-full max-h-full"
            alt="full"
          />
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        onChange={onFileSelected}
        className="hidden"
      />
    </div>
  );
}
