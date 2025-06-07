// src/pages/ForgotPasswordPage.jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { requestReset } from '../api/auth';

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState } = useForm();

  const onSubmit = async ({ email }) => {
    try {
      console.log('handler runs');   // <— should print
      await requestReset(email);
      toast.success('If the address exists, a reset link was sent.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm shadow-xl bg-base-100">
        <form onSubmit={handleSubmit(onSubmit)} className="card-body gap-4">
          <h1 className="card-title justify-center text-2xl">
            Forgot&nbsp;Password
          </h1>

          <input
            type="email"
            placeholder="Your email"
            className="input input-bordered"
            {...register('email', { required: true })}
          />
          {formState.errors.email && (
            <p className="text-error text-sm">Email is required</p>
          )}

          <button className="btn btn-primary" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  );
}
