import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FiImage, FiVideo, FiSmile, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { api } from '../api';
import EmojiPicker from 'emoji-picker-react';

import '../index.css'; // for shake animation

const schema = yup
  .object({ content: yup.string().nullable() })
  .required();

export default function NewPostBox({ onNewPost }) {
  const CHARACTER_LIMIT = 500;
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [shake, setShake] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileImageRef = useRef();
  const fileVideoRef = useRef();
  const textareaRef = useRef();

  // Handle dropped files
  const onDrop = useCallback(
    accepted => {
      const total = files.length + accepted.length;
      if (total > 15) {
        toast.error('Maximum of 15 files allowed.');
        return;
      }
      const valid = accepted.filter(f => /(image|video)\//.test(f.type));
      const newPreviews = valid.map(f => ({
        src: URL.createObjectURL(f),
        type: f.type.startsWith('video/') ? 'video' : 'image',
      }));
      setFiles(prev => [...prev, ...valid]);
      setPreviews(prev => [...prev, ...newPreviews]);
    },
    [files]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': [], 'image/jpeg': [], 'image/webp': [], 'image/jfif': [],
      'video/mp4': [], 'video/webm': []
    },
    multiple: true,
    noClick: true,
    noKeyboard: true,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { content: '' },
  });

  const content = watch('content') || '';

  // Prevent over-limit typing
  const handleKeyDown = e => {
    if (
      content.length >= CHARACTER_LIMIT &&
      !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(e.key)
    ) {
      e.preventDefault();
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  // Open pickers
  const handleImageClick = () => fileImageRef.current.click();
  const handleVideoClick = () => fileVideoRef.current.click();
  const handleEmojiClick = () => setShowEmojiPicker(v => !v);

  // Insert emoji at cursor position
  const onEmojiSelect = (emojiData) => {
    const emoji = emojiData.emoji;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const newValue = before + emoji + after;
    reset({ content: newValue });
    setShowEmojiPicker(false);
    setTimeout(() => {
      el.setSelectionRange(start + emoji.length, start + emoji.length);
      el.focus();
    }, 0);
  };

  // File picker change handlers
  const onFileImageChange = e => onDrop(Array.from(e.target.files || []));
  const onFileVideoChange = e => onDrop(Array.from(e.target.files || []));

  // Submit post
  const onPost = async ({ content }) => {
    const trimmed = content.trim();
    if (!trimmed && files.length === 0) {
      toast.error('Please add text or a file.');
      return;
    }
    try {
      const form = new FormData();
      form.append('content', trimmed);
      files.forEach(f => {
        const field = f.type.startsWith('video/') ? 'videos' : 'images';
        form.append(field, f);
      });
      const res = await api.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      onNewPost(res.data);
      reset({ content: '' });               // clear text
      previews.forEach(p => URL.revokeObjectURL(p.src));
      setFiles([]);
      setPreviews([]);
      setUploadProgress(0);
      toast.success('Posted!');
    } catch {
      toast.error('Could not create post');
      setUploadProgress(0);
    }
  };

  // Cleanup previews
  useEffect(() => {
    return () => previews.forEach(p => URL.revokeObjectURL(p.src));
  }, [previews]);

  return (
    <div
      {...getRootProps()}
      className={`card bg-base-200 dark:bg-base-300 p-4 border border-base-content/10 ${isDragActive ? 'ring ring-primary' : ''
        }`}
    >
      <input {...getInputProps()} />
      <form onSubmit={handleSubmit(onPost)} className="space-y-2 relative">
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <div className="relative">
              <textarea
                {...field}
                ref={textareaRef}
                placeholder="What's on your mind?"
                className="textarea textarea-bordered w-full max-h-64 min-h-24 resize-y pr-10"
                maxLength={CHARACTER_LIMIT}
                onKeyDown={handleKeyDown}
              />
              <icon-button
                type="button"
                onClick={handleEmojiClick}
                className="absolute top-2 right-2 text-gray-600 dark:text-gray-300 hover:text-primary"
                aria-label="Add emoji"
              >
                <FiSmile size={20} />
              </icon-button>
              {showEmojiPicker && (
                <div className="absolute top-full right-2 mt-1 z-20 bg-base-300 dark:bg-base-800 p-2 rounded shadow-lg">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="float-right mb-1 text-white"
                    aria-label="Close emoji picker"
                  >
                    <FiX size={20} />
                  </button>
                  <EmojiPicker
                    onEmojiClick={onEmojiSelect}
                    theme="dark"
                  />
                </div>
              )}
            </div>
          )}
        />
        {errors.content && (
          <p className="text-error text-sm">{errors.content.message}</p>
        )}
        <div
          className={`text-sm ${content.length >= CHARACTER_LIMIT
            ? 'text-error'
            : 'text-base-content/60'
            } ${shake ? 'shake' : ''}`}
        >
          {content.length}/{CHARACTER_LIMIT}
        </div>

        {uploadProgress > 0 && (
          <progress
            className="progress progress-primary w-full"
            value={uploadProgress}
            max="100"
          >
            {uploadProgress}%
          </progress>
        )}

        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleImageClick}
              className="icon-button text-gray-600 dark:text-gray-300 hover:text-primary"
              aria-label="Add images"
            >
              <FiImage size={20} />
            </button>
            <button
              type="button"
              onClick={handleVideoClick}
              className="icon-button text-gray-600 dark:text-gray-300 hover:text-primary"
              aria-label="Add videos"
            >
              <FiVideo size={20} />
            </button>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Posting…' : 'Post'}
          </button>
        </div>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jfif"
          multiple
          ref={fileImageRef}
          className="hidden"
          onChange={onFileImageChange}
        />
        <input
          type="file"
          accept="video/mp4,video/webm"
          multiple
          ref={fileVideoRef}
          className="hidden"
          onChange={onFileVideoChange}
        />

        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {previews.slice(0, 4).map((p, i) => (
              <div
                key={i}
                className="relative w-20 h-20 rounded-lg overflow-hidden bg-black"
              >
                {p.type === 'image' ? (
                  <img
                    src={p.src}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={p.src}
                    className="w-full h-full object-contain"
                    muted
                    loop
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFiles(f => f.filter((_, idx) => idx !== i));
                    setPreviews(pr => pr.filter((_, idx) => idx !== i));
                  }}
                  className="icon-button absolute top-1 right-1 text-white"
                  aria-label="Remove file"
                >
                  <FiX size={12} />
                </button>
              </div>
            ))}
            {previews.length > 4 && (
              <div className="w-20 h-20 rounded-lg bg-black/50 flex items-center justify-center font-bold text-white">
                +{previews.length - 4}
              </div>
            )}
          </div>
        )}
      </form>
      {isDragActive && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <p className="text-white text-lg">Drop files here</p>
        </div>
      )}
    </div>
  );
}
