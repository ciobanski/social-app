// src/components/TwoFactorModal.jsx
import React, { useRef, useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { toast } from 'react-toastify';
import AuthContext from '../AuthContext';

export default function TwoFactorModal() {
  /* hooks must always run */
  const { state } = useLocation();        // { userId } put there by LoginPage
  const navigate = useNavigate();
  const { refreshUser } = useContext(AuthContext);

  /* local OTP state */
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [remember, setRemember] = useState(false);
  const inputs = useRef([]);

  /* no 2-FA challenge → render nothing */
  if (!state?.userId) return null;

  /* ───────── input handlers ───────── */
  const handleChange = (e, idx) => {
    const val = e.target.value.replace(/\D/, '');
    if (!val) return;
    const next = [...digits];
    next[idx] = val[0];
    setDigits(next);
    if (idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = '';
      setDigits(next);
      inputs.current[idx - 1]?.focus();
    }
  };

  /* ───────── submit OTP ───────── */
  const onSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) return toast.error('Enter all 6 digits');

    try {
      await api.post(
        '/auth/verify-2fa',
        { userId: state.userId, code, rememberDevice: remember },
        { withCredentials: true }
      );
      await refreshUser();                 // update global user
      toast.success('Logged in!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect code');
      setDigits(Array(6).fill(''));
      inputs.current[0]?.focus();
    }
  };

  return (
    <dialog open className="modal modal-bottom sm:modal-middle">
      <div className="modal-box w-full max-w-sm text-center">
        <h3 className="font-bold text-lg mb-4">Enter 6-digit code</h3>

        <form onSubmit={onSubmit} className="flex flex-col items-center gap-4">
          <div className="flex justify-center gap-2">
            {digits.map((d, idx) => (
              <input
                key={idx}
                ref={(el) => (inputs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={d}
                onChange={(e) => handleChange(e, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className="input input-bordered w-12 text-center text-xl"
              />
            ))}
          </div>

          <label className="label cursor-pointer gap-2 mt-2">
            <input
              type="checkbox"
              className="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Remember this device 30 days</span>
          </label>

          <button className="btn btn-primary w-full mt-2">Verify</button>
        </form>

        <div className="modal-action">
          <button onClick={() => navigate('/login', { replace: true })}
            className="btn btn-sm">
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
