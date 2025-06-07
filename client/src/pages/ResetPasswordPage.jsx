// src/pages/ResetPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { api } from '../api';
import { resetPassword } from '../api/auth';

const BG_URL =
  'https://images.unsplash.com/photo-1668681919287-7367677cdc4c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');       // may be null
  const navigate = useNavigate();
  const { register, handleSubmit, formState } = useForm();

  /* state: null=loading, false=invalid, true=valid */
  const [valid, setValid] = useState(null);

  /* ── 1. token-presence & server validation ───────────────── */
  useEffect(() => {
    if (!token) {                   // query param missing
      toast.error('Reset token missing');
      navigate('/login', { replace: true });
      return;
    }

    let mounted = true;
    api
      .get('/auth/check-reset-token', { params: { token }, withCredentials: true })
      .then(({ data }) => mounted && setValid(Boolean(data.ok)))
      .catch(() => mounted && setValid(false));

    return () => { mounted = false; };
  }, [token, navigate]);

  /* ── 2. redirect if token invalid/used ───────────────────── */
  useEffect(() => {
    if (valid === false) {
      toast.dismiss('resetBad'); // avoid StrictMode dupes
      toast.error('Reset link expired or already used', { toastId: 'resetBad' });
      navigate('/login', { replace: true });
    }
  }, [valid, navigate]);

  /* early loading state */
  if (valid === null) return <p className="mt-20 text-center">Verifying…</p>;
  if (valid === false) return null;  // effect will redirect

  /* ── 3. submit new password ─────────────────────────────── */
  const onSubmit = async ({ newPassword }) => {
    try {
      await resetPassword(token, newPassword);
      toast.success('Password changed — log in!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    }
  };

  /* ── 4. render form ─────────────────────────────────────── */
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundImage: `url(${BG_URL})` }}
    >
      <div className="card w-full max-w-sm bg-base-100/90 shadow-2xl backdrop-blur-md">
        <form onSubmit={handleSubmit(onSubmit)} className="card-body gap-4">
          <h1 className="card-title justify-center text-2xl">
            Choose&nbsp;New&nbsp;Password
          </h1>

          <input
            type="password"
            placeholder="New password"
            className="input input-bordered"
            {...register('newPassword', {
              required: true,
              minLength: 8,
              pattern: /^(?=.*[A-Z])(?=.*\d).{8,}$/,
            })}
          />
          {formState.errors.newPassword && (
            <p className="text-error text-sm">
              ≥8 chars, 1 uppercase, 1 number
            </p>
          )}

          <button className="btn btn-primary" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Updating…' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  );
}
