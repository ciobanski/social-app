// src/pages/SignupPage.jsx

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { api } from '../api';
import { toast } from 'react-toastify';

const BG_URL =
  'https://images.unsplash.com/photo-1633886038302-9710437f6ca2?' +
  'q=80&w=1932&auto=format&fit=crop';

const schema = yup
  .object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    email: yup.string().email('Enter a valid email').required('Email is required'),
    password: yup
      .string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  })
  .required();

export default function SignupPage() {
  const navigate = useNavigate();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (data) => {
    try {
      await api.post('/auth/signup', data);
      toast.success('Signup successful! Please check your email to verify.');
      navigate('/login');
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('That email is already registered.');
      } else {
        toast.error('Signup failed: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: `url(${BG_URL})` }}
    >
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-lg shadow-lg w-11/12 max-w-md p-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-6">
          Sign Up
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1">
              First Name
            </label>
            <Controller
              name="firstName"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 border ${errors.firstName ? 'border-red-500' : 'border-transparent'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              )}
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1">
              Last Name
            </label>
            <Controller
              name="lastName"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 border ${errors.lastName ? 'border-red-500' : 'border-transparent'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              )}
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <Controller
              name="email"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <input
                  {...field}
                  type="email"
                  className={`w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 border ${errors.email ? 'border-red-500' : 'border-transparent'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              )}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <Controller
              name="password"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <input
                  {...field}
                  type="password"
                  className={`w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 border ${errors.password ? 'border-red-500' : 'border-transparent'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              )}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition disabled:opacity-50"
          >
            {isSubmitting ? 'Signing up…' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-gray-700 dark:text-gray-300 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
