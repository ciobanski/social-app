import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FiImage, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { api } from '../api';
import '../index.css'; // for shake animation

const schema = yup
  .object({
    content: yup.string().nullable(),
  })
  .required();

export default function NewPostBox({ onNewPost }) {
  const CHARACTER_LIMIT = 500;
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [shake, setShake] = useState(false);
  const fileInputRef = useRef();

  const onDrop = useCallback(
    (accepted) => {
      const total = files.length + accepted.length;
      if (total > 15) {
        toast.error('Maximum of 15 files allowed.');
        return;
      }
      const valid = accepted.filter((f) => /(image|video)\//.test(f.type));
      if (!valid.length) return;
      const newPreviews = valid.map((f) => ({
        src: URL.createObjectURL(f),
        type: f.type.startsWith('video/') ? 'video' : 'image',
      }));
      setFiles((p) => [...p, ...valid]);
      setPreviews((p) => [...p, ...newPreviews]);
    },
    [files]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    multiple: true,
    noClick: true,
    noKeyboard: true,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { content: '' },
  });

  const content = watch('content') || '';

  // Shake on over-limit attempts
  const handleKeyDown = (e) => {
    if (content.length >= CHARACTER_LIMIT && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handlePhotoClick = () => fileInputRef.current.click();
  const onFileSelected = (e) => onDrop(Array.from(e.target.files || []));

  const onPost = async ({ content }) => {
    const trimmed = content.trim();
    if (!trimmed && files.length === 0) {
      toast.error('Please add text or a file.');
      return;
    }
    try {
      const form = new FormData();
      form.append('content', trimmed);
      files.forEach((f) => {
        const field = f.type.startsWith('video/') ? 'videos' : 'images';
        form.append(field, f);
      });
      const res = await api.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onNewPost(res.data);
      reset();
      previews.forEach((p) => URL.revokeObjectURL(p.src));
      setFiles([]);
      setPreviews([]);
      toast.success('Posted!');
    } catch {
      toast.error('Could not create post');
    }
  };

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.src));
  }, [previews]);

  return (
    <div
      {...getRootProps()}
      className={`card bg-base-200 dark:bg-base-300 p-4 border border-base-content/10 ${isDragActive ? 'ring ring-primary' : ''
        }`}
    >
      <input {...getInputProps()} />
      <form onSubmit={handleSubmit(onPost)} className="space-y-2">
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              placeholder="What's on your mind?"
              className={`textarea textarea-bordered w-full max-h-64 min-h-24 resize-y`}
              maxLength={CHARACTER_LIMIT}
              onKeyDown={handleKeyDown}
            />
          )}
        />
        {errors.content && (
          <p className="text-error text-sm">{errors.content.message}</p>
        )}
        <div className={`text-sm ${content.length >= CHARACTER_LIMIT ? 'text-error' : 'text-base-content/60'} ${shake ? 'shake' : ''}`}>
          {content.length}/{CHARACTER_LIMIT}
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handlePhotoClick}
            className="icon-button text-gray-600 dark:text-gray-300 hover:text-primary transition"
            aria-label="Add file"
          >
            <FiImage size={20} />
          </button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? 'Posting…' : 'Post'}
          </button>
        </div>

        <input
          type="file"
          accept="image/*,video/*"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={onFileSelected}
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
                    setFiles((f) => f.filter((_, idx) => idx !== i));
                    setPreviews((pr) => pr.filter((_, idx) => idx !== i));
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
    </div>
  );
}
