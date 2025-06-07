// src/pages/ResetPasswordPage.jsx
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { resetPassword } from '../api/auth';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const { register, handleSubmit, formState } = useForm();

  const onSubmit = async ({ newPassword }) => {
    try {
      await resetPassword(token, newPassword);
      toast.success('Password updated—log in!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    }
  };

  if (!token) return <p className="text-center mt-20">Reset token missing.</p>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm shadow-xl bg-base-100">
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
