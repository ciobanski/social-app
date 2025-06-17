// src/components/EditProfileModal.jsx

import React, { useRef, useState, useEffect, useContext } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import dayjs from 'dayjs';
import { api } from '../api';
import AuthContext from '../AuthContext';
import { toast } from 'react-toastify';
import countries from '../data/countries.json';

const profileSchema = yup
  .object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    country: yup.string().nullable(),
    birthday: yup
      .string()
      .nullable()
      .test(
        'is-date',
        'Invalid date',
        (v) => !v || dayjs(v, 'YYYY-MM-DD', true).isValid()
      ),
    birthdayVisibility: yup
      .mixed()
      .oneOf(['public', 'friends', 'private'])
      .required(),
  })
  .required();

export default function EditProfileModal({
  open,
  onClose,
  profile,
  setProfile,
  reloadMe,
}) {
  // pull reloadMe from AuthContext if not passed explicitly
  const auth = useContext(AuthContext);
  const realReload = typeof reloadMe === 'function' ? reloadMe : auth.reload;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      country: '',
      birthday: '',
      birthdayVisibility: 'friends',
    },
  });

  const fileInputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [localAvatar, setLocalAvatar] = useState(profile?.avatarUrl);

  // when profile loads or changes, reset form + avatar preview
  useEffect(() => {
    if (!profile) return;
    setLocalAvatar(profile.avatarUrl);
    reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      country: profile.country || '',
      birthday: profile.birthday
        ? dayjs(profile.birthday).format('YYYY-MM-DD')
        : '',
      birthdayVisibility: profile.birthdayVisibility || 'friends',
    });
  }, [profile, reset]);

  if (!open) return null;

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalAvatar(URL.createObjectURL(file));
    e.target.fileForUpload = file;
  };

  const onSave = async (vals, e) => {
    e.preventDefault();
    const payload = {
      firstName: vals.firstName,
      lastName: vals.lastName,
      country: vals.country || undefined,
      birthday: vals.birthday || null,
      birthdayVisibility: vals.birthdayVisibility,
    };

    try {
      // 1) avatar upload if changed
      const file = fileInputRef.current?.fileForUpload;
      if (file) {
        setUploading(true);
        const form = new FormData();
        form.append('avatar', file);
        const { data } = await api.post('/users/me/avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setProfile((p) => ({ ...p, avatarUrl: data.avatarUrl }));
        if (typeof realReload === 'function') {
          try { await realReload(); }
          catch (e) { console.warn('reloadMe (avatar) failed', e); }
        }
        toast.success('Avatar updated!');
      }

      // 2) other fields
      const { data: updated } = await api.put('/users/me', payload);
      setProfile((p) => ({ ...p, ...updated }));
      if (typeof realReload === 'function') {
        try { await realReload(); }
        catch (e) { console.warn('reloadMe (profile) failed', e); }
      }
      toast.success('Profile updated!');
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Save failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card bg-base-200 dark:bg-base-300 border border-base-content/10 shadow-lg w-full max-w-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-base-content">
          Edit Profile
        </h3>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          {/* Avatar Picker */}
          <div className="flex justify-center">
            <div className="relative avatar">
              <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-2 overflow-hidden">
                <img src={localAvatar} alt="avatar preview" />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
                className="btn btn-sm btn-primary btn-circle absolute bottom-0 right-0"
              >
                ✎
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>
          </div>

          {/* First Name */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">First Name</span>
            </label>
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="First Name"
                  className={`input input-bordered w-full ${errors.firstName ? 'input-error' : ''
                    }`}
                />
              )}
            />
            {errors.firstName && (
              <p className="text-error text-sm">
                {errors.firstName.message}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Last Name</span>
            </label>
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Last Name"
                  className={`input input-bordered w-full ${errors.lastName ? 'input-error' : ''
                    }`}
                />
              )}
            />
            {errors.lastName && (
              <p className="text-error text-sm">
                {errors.lastName.message}
              </p>
            )}
          </div>

          {/* Country */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Country</span>
            </label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="select select-bordered w-full"
                >
                  <option value="">(none)</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          {/* Birthday */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Birthday</span>
            </label>
            <Controller
              name="birthday"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="date"
                  className={`input input-bordered w-full ${errors.birthday ? 'input-error' : ''
                    }`}
                />
              )}
            />
            {errors.birthday && (
              <p className="text-error text-sm">
                {errors.birthday.message}
              </p>
            )}
          </div>

          {/* Birthday Visibility */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Birthday Visibility</span>
            </label>
            <Controller
              name="birthdayVisibility"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="select select-bordered w-full"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends</option>
                  <option value="private">Private</option>
                </select>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || uploading}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploading}
              className="btn btn-primary"
            >
              {isSubmitting || uploading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
