// src/components/EditProfileModal.jsx

import React, { useRef, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import dayjs from 'dayjs';
import { api } from '../api';
import AuthContext from '../AuthContext';
import { toast } from 'react-toastify';

const profileSchema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  country: yup.string().max(56, 'Max 56 characters').nullable(),
  birthday: yup.string()
    .nullable()
    .test('is-date', 'Invalid date', v => !v || dayjs(v, 'YYYY-MM-DD', true).isValid()),
  birthdayVisibility: yup
    .mixed()
    .oneOf(['public', 'friends', 'private'])
    .required(),
}).required();

export default function EditProfileModal({ open, onClose, profile, setProfile, reloadMe }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

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
    }
  });

  // populate
  useEffect(() => {
    if (!profile) return;
    reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      country: profile.country || '',
      birthday: profile.birthday ? dayjs(profile.birthday).format('YYYY-MM-DD') : '',
      birthdayVisibility: profile.birthdayVisibility || 'friends'
    });
  }, [profile, reset]);

  // avatar upload
  const handleAvatarChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await api.post('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(p => ({ ...p, avatarUrl: data.avatarUrl }));
      await reloadMe();
      toast.success('Avatar updated!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // form submit
  const onSave = async vals => {
    try {
      const payload = {
        firstName: vals.firstName,
        lastName: vals.lastName,
        country: vals.country || undefined,
        birthday: vals.birthday || null,
        birthdayVisibility: vals.birthdayVisibility,
      };
      const { data: updated } = await api.put('/users/me', payload);
      setProfile(p => ({ ...p, ...updated }));
      await reloadMe();
      toast.success('Profile updated!');
      onClose();
    } catch {
      toast.error('Save failed');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card bg-base-200 dark:bg-base-300 border border-base-content/10 shadow-lg w-full max-w-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-base-content">Edit Profile</h3>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">

          {/* Avatar Picker */}
          <div className="flex justify-center">
            <div className="relative avatar">
              <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-2 overflow-hidden">
                <img src={profile.avatarUrl} alt="avatar" />
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
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleAvatarChange}
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
                  className={`input input-bordered w-full ${errors.firstName ? 'input-error' : ''}`}
                />
              )}
            />
            {errors.firstName && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.firstName.message}
                </span>
              </label>
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
                  className={`input input-bordered w-full ${errors.lastName ? 'input-error' : ''}`}
                />
              )}
            />
            {errors.lastName && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.lastName.message}
                </span>
              </label>
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
                <input
                  {...field}
                  type="text"
                  placeholder="Country"
                  className={`input input-bordered w-full ${errors.country ? 'input-error' : ''}`}
                />
              )}
            />
            {errors.country && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.country.message}
                </span>
              </label>
            )}
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
                  className={`input input-bordered w-full ${errors.birthday ? 'input-error' : ''}`}
                />
              )}
            />
            {errors.birthday && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.birthday.message}
                </span>
              </label>
            )}
          </div>

          {/* Birthday Visibility */}
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Birthday Visibility</span></label>
            <Controller
              name="birthdayVisibility"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className={`select select-bordered w-full ${errors.birthdayVisibility ? 'select-error' : ''}`}
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends</option>
                  <option value="private">Private</option>
                </select>
              )}
            />
            {errors.birthdayVisibility && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.birthdayVisibility.message}
                </span>
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
