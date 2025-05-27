// src/pages/LoginPage.jsx

import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { AuthContext } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function LoginPage() {
  const { setUser, reload } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', {
        email,
        password
      });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      reload();
      toast('Logged in successfully!', 'success');
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Login failed. Please try again.';
      toast(msg, 'error');
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-4">
      <h1 className="text-2xl mb-4">Log In</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          Log In
        </button>
      </form>
      <p className="mt-4 text-center">
        Don’t have an account?{' '}
        <Link to="/signup" className="text-blue-600">
          Sign up
        </Link>
      </p>
    </div>
  );
}
