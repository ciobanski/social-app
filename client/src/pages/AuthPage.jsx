// src/pages/AuthPage.jsx
import React, { useContext, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { FaGoogle } from 'react-icons/fa';
import AuthContext from '../AuthContext';
import { api } from '../api';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import TwoFactorModal from '../components/TwoFactorModal';

const BG_URL =
  'https://images.unsplash.com/photo-1668681919287-7367677cdc4c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

/* ─── yup schemas ──────────────────────────────────────────── */
const loginSchema = yup.object({
  email: yup.string().email('Enter a valid email').required('Required'),
  password: yup.string().required('Required'),
});

const signupSchema = yup.object({
  firstName: yup.string().required('Required'),
  lastName: yup.string().required('Required'),
  email: yup.string().email('Enter a valid email').required('Required'),
  password: yup.string().min(8, '≥ 8 characters').required('Required'),
});

/* ─── component ────────────────────────────────────────────── */
export default function AuthPage() {
  const { login, authLoading } = useContext(AuthContext);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(params.get('mode') === 'signup');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(isSignup ? signupSchema : loginSchema),
  });

  /* toggle mode + keep it in URL */
  const switchMode = () => {
    const next = !isSignup;
    setIsSignup(next);
    params.set('mode', next ? 'signup' : 'login');
    setParams(params, { replace: true });
  };

  /* submit */
  const onSubmit = async (data) => {
    if (!isSignup) {
      const res = await login(data.email, data.password);
      if (!res.success) {
        if (res.need2fa) navigate('/login', { state: { userId: res.userId } });
        else toast.error(res.message);
        return;
      }
      toast.success('Logged in!');
      navigate('/');
    } else {
      try {
        await api.post('/auth/signup', data);
        toast.success('Sign-up successful — verify your e-mail.');
        switchMode();
      } catch (err) {
        toast.error(
          err.response?.status === 409
            ? 'That email is already registered.'
            : err.response?.data?.message || 'Signup failed'
        );
      }
    }
  };

  if (authLoading) return null;

  /* fields depending on mode */
  const fields = isSignup
    ? [
      { name: 'firstName', label: 'First Name', type: 'text' },
      { name: 'lastName', label: 'Last Name', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'password', label: 'Password', type: 'password' },
    ]
    : [
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'password', label: 'Password', type: 'password' },
    ];

  return (
    <div
      className="relative flex min-h-screen items-center bg-cover bg-center"
      style={{ backgroundImage: `url(${BG_URL})` }}
    >
      <div className="absolute inset-0 bg-black/60 -z-10" />

      {/* left split text (desktop only) */}
      <div className="hidden lg:flex w-1/2 items-center justify-end lg:pr-8">

        <h2 className="max-w-lg break-words text-right text-7xl font-black leading-tight text-white">

          Connecting people
        </h2>
      </div>

      {/* right column */}
      <div className="flex w-full lg:w-1/2 items-center justify-center lg:justify-start lg:pl-8">
        <div className="w-full max-w-sm rounded-box bg-base-100/90 p-8 shadow-2xl backdrop-blur-md">

          {/* form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <h1 className="text-center text-3xl font-semibold mb-2">
              {isSignup ? 'Sign Up' : 'Log In'}
            </h1>

            {fields.map(({ name, label, type }) => (
              <Controller
                key={name}
                name={name}
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <div className="form-control">
                    <input
                      {...field}
                      type={type}
                      placeholder={label}
                      className={`input input-bordered ${errors[name] ? 'input-error' : ''}`}
                    />
                    <span className="block min-h-[1.25rem] text-sm text-error">
                      {errors[name]?.message ?? '\u00A0'}
                    </span>
                  </div>
                )}
              />
            ))}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full"
            >
              {isSubmitting
                ? isSignup ? 'Signing up…' : 'Logging in…'
                : isSignup ? 'Sign Up' : 'Log In'}
            </button>

            {/* ───── LOGIN EXTRAS ───── */}
            {!isSignup && (
              <>
                <p className="text-start text-sm ml-0.5">
                  <Link to="/login?forgot=1" className="link link-secondary">
                    Forgot password?
                  </Link>
                </p>

                <p className="text-center text-sm mt-5">
                  Don’t have an account?{' '}
                  <span
                    onClick={switchMode}
                    className="link link-primary cursor-pointer"
                  >
                    Sign up
                  </span>
                </p>

                <div className="divider my-1 before:bg-base-content/20 after:bg-base-content/20">
                  OR
                </div>

                <a
                  href={`${import.meta.env.VITE_API_URL}/auth/google`}
                  className="btn btn-outline gap-2 w-full"
                >
                  <FaGoogle className="h-5 w-5" />
                  Continue with Google
                </a>
              </>
            )}

            {/* ───── SIGN-UP EXTRAS ───── */}
            {isSignup && (
              <p className="text-center text-sm mt-4">
                Already have an account?{' '}
                <span
                  onClick={switchMode}
                  className="link link-primary cursor-pointer"
                >
                  Log in
                </span>
              </p>
            )}
          </form>
        </div>
      </div>
      <ForgotPasswordModal />
      <TwoFactorModal />
    </div>
  );
}
