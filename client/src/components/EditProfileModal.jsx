// src/components/EditProfileModal.jsx

import React, { useRef, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import dayjs from 'dayjs';
import { api } from '../api';
import AuthContext from '../AuthContext';
import { toast } from 'react-toastify';

/* Tailwind classes will replace most MUI styling:
   - Dialog → fixed inset-0 bg-black/50 flex items-center justify-center
   - DialogContent → bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg
   - Form fields → block w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
   - Buttons → bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded
*/

const profileSchema = yup
  .object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    country: yup.string().max(56, 'Max 56 characters').nullable(),
    birthday: yup
      .string()
      .nullable()
      .test('is-date', 'Invalid date', (val) =>
        !val || dayjs(val, 'YYYY-MM-DD', true).isValid()
      ),
    birthdayVisibility: yup
      .mixed()
      .oneOf(['public', 'friends', 'private'])
      .required(),
  })
  .required();

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
    },
  });

  // Populate form when profile loads
  useEffect(() => {
    if (!profile) return;
    reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      country: profile.country || '',
      birthday: profile.birthday ? dayjs(profile.birthday).format('YYYY-MM-DD') : '',
      birthdayVisibility: profile.birthdayVisibility || 'friends',
    });
  }, [profile, reset]);

  // Handle avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile((p) => ({ ...p, avatarUrl: data.avatarUrl }));
      await reloadMe();
      toast.success('Avatar updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  // Submit updated profile
  const onSave = async (formData) => {
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        country: formData.country || undefined,
        birthday: formData.birthday || null,
        birthdayVisibility: formData.birthdayVisibility,
      };
      const { data: updated } = await api.put('/users/me', payload);
      setProfile((p) => ({ ...p, ...updated }));
      await reloadMe();
      toast.success('Profile updated!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save profile.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Profile</h2>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          {/* Avatar Picker */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded-full"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Name
            </label>
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`block w-full border ${errors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                  placeholder="First Name"
                />
              )}
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Name
            </label>
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`block w-full border ${errors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                  placeholder="Last Name"
                />
              )}
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
            )}
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Country
            </label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`block w-full border ${errors.country ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                  placeholder="Country"
                />
              )}
            />
            {errors.country && (
              <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>
            )}
          </div>

          {/* Birthday */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Birthday
            </label>
            <Controller
              name="birthday"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="date"
                  className={`block w-full border ${errors.birthday ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                />
              )}
            />
            {errors.birthday && (
              <p className="text-red-500 text-sm mt-1">{errors.birthday.message}</p>
            )}
          </div>

          {/* Birthday Visibility */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Birthday Visibility
            </p>
            <Controller
              name="birthdayVisibility"
              control={control}
              render={({ field }) => (
                <div className="flex space-x-4">
                  {['public', 'friends', 'private'].map((opt) => (
                    <label key={opt} className="inline-flex items-center space-x-2">
                      <input
                        type="radio"
                        value={opt}
                        checked={field.value === opt}
                        onChange={() => field.onChange(opt)}
                        className="form-radio text-indigo-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.birthdayVisibility && (
              <p className="text-red-500 text-sm mt-1">
                {errors.birthdayVisibility.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
