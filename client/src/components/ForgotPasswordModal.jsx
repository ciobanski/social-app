// src/components/ForgotPasswordModal.jsx
import React, { useState } from 'react';
import { api } from '../api';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ForgotPasswordModal() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // only show when ?forgot=1
  const isOpen = searchParams.get('forgot') === '1';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');    // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);

  const close = () => {
    searchParams.delete('forgot');
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setError(null);
    try {
      await api.post('/auth/request-password-reset', { email });
      setStatus('success');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send reset link.');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="relative bg-base-100/90 p-8 shadow-2xl backdrop-blur-md rounded-lg  w-full max-w-md">
        <button
          onClick={close}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          &times;
        </button>
        <h2 className="text-xl font-semibold mb-4">Reset your password</h2>

        {status === 'success' ? (
          <p className="text-green-600">
            If that email exists, you’ll get a reset link shortly.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 block w-full border rounded px-3 py-2"
                placeholder="you@example.com"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {status === 'loading' ? 'Sending…' : 'Send reset link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
