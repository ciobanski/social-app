// src/pages/SignupPage.jsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../contexts/ToastContext';

export default function SignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/auth/signup', {
        firstName,
        lastName,
        email,
        password
      });
      toast(
        'Signup successful! Please check your email to verify your account.',
        'success'
      );
      navigate('/login');
    } catch (err) {
      if (err.response?.status === 409) {
        toast(
          'That email is already registered. Please log in or use a different address.',
          'error'
        );
      } else {
        toast(
          'Signup failed: ' +
          (err.response?.data?.message || err.message),
          'error'
        );
      }
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-4">
      <h1 className="text-2xl mb-4">Sign Up</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          placeholder="First Name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <input
          placeholder="Last Name"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
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
          className="w-full bg-green-600 text-white p-2 rounded"
        >
          Sign Up
        </button>
      </form>
      <p className="mt-4 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600">
          Log in
        </Link>
      </p>
    </div>
  );
}
