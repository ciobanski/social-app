// src/pages/LoginPage.jsx
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AuthContext from '../AuthContext';
import { toast } from 'react-toastify';
import { FaGoogle } from 'react-icons/fa';

const BG_URL =
  'https://images.unsplash.com/photo-1668681919287-7367677cdc4c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

const schema = yup
  .object({
    email: yup.string().email('Enter a valid email').required('Email is required'),
    password: yup
      .string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  })
  .required();

export default function LoginPage() {
  const { login, authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async ({ email, password }) => {
    const res = await login(email, password);
    if (!res.success) return toast.error(res.message || 'Login failed');
    localStorage.removeItem('token');
    toast.success('Logged in successfully!');
    navigate('/');
  };

  if (authLoading) return null;

  return (
    <div
      className="relative flex min-h-screen items-center bg-cover bg-center"
      style={{ backgroundImage: `url(${BG_URL})` }}
    >
      {/* dark overlay for legibility */}
      <div className="absolute inset-0 bg-black/60 -z-10" />

      {/* ----------  LEFT 50 %  ---------- */}
      <div className="hidden lg:flex w-1/2 items-center justify-end lg:pr-8">
        <h2 className="max-w-lg break-words text-right text-7xl font-extrabold leading-tight text-white">
          Fuckleyewt on ma jikkalyang snoopsnapp
        </h2>
      </div>

      {/* ----------  RIGHT 50 %  ---------- */}
      <div className="flex w-full lg:w-1/2 items-center justify-center lg:justify-start lg:pl-8 ">
        <div className="w-full max-w-sm rounded-box bg-base-100/90 p-8 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <h1 className="text-center text-3xl font-semibold">Log&nbsp;In</h1>

            {['email', 'password'].map((name) => (
              <Controller
                key={name}
                name={name}
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <div className="form-control">
                    <input
                      {...field}
                      type={name}
                      placeholder={name === 'email' ? 'Email' : 'Password'}
                      autoComplete="new-password"
                      className={`input input-bordered ${errors[name] ? 'input-error' : ''}`}
                    />
                    {/* reserve height so layout never jumps */}
                    <span className="block min-h-[1.25rem] text-sm text-error">
                      {errors[name]?.message ?? '\u00A0'}
                    </span>
                  </div>
                )}
              />
            ))}

            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in…' : 'Log In'}
            </button>
            <p className="text-end text-sm">
              <Link to="/forgot-password" className="link link-secondary">
                Forgot password?
              </Link>
            </p>
            {/* OAuth divider */}
            <div className="divider my-1 before:bg-base-content/20 after:bg-base-content/20">
              OR
            </div>

            <a
              href={`${import.meta.env.VITE_API_URL}/auth/google`}
              className="btn btn-outline gap-2"
            >
              <FaGoogle className="h-5 w-5" />
              Continue with Google
            </a>
            <p className="text-center text-sm opacity-70">
              Don’t have an account?{' '}
              <Link to="/signup" className="link link-secondary ms-1">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div >
  );
}
