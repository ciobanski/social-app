import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Link as MuiLink } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { toast } from 'react-toastify';

const BG_URL =
  'https://images.unsplash.com/photo-1633886038302-9710437f6ca2?' +
  'q=80&w=1932&auto=format&fit=crop';

export default function SignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/auth/signup', { firstName, lastName, email, password });
      toast.success('Signup successful! Please check your email to verify.');
      navigate('/login');
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('That email is already registered.');
      } else {
        toast.error('Signup failed: ' + (err.response?.data?.message || err.message));
      }
    }
  }

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        overflowX: 'hidden',
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        justifyContent: 'center',  // always center
        alignItems: 'center',      // vertically center
        p: 2
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: 360,
          maxWidth: '90vw',
          bgcolor: 'rgba(30,30,30,0.8)',
          backdropFilter: 'blur(8px)',
          p: 4,
          borderRadius: 2
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Sign Up
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            label="First Name"
            variant="filled"
            required
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' } }}
            InputLabelProps={{ sx: { color: '#ccc' } }}
          />
          <TextField
            label="Last Name"
            variant="filled"
            required
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' } }}
            InputLabelProps={{ sx: { color: '#ccc' } }}
          />
          <TextField
            label="Email"
            variant="filled"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' } }}
            InputLabelProps={{ sx: { color: '#ccc' } }}
          />
          <TextField
            label="Password"
            variant="filled"
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' } }}
            InputLabelProps={{ sx: { color: '#ccc' } }}
          />
          <Button type="submit" variant="contained" size="large" color="secondary">
            Sign Up
          </Button>
        </Box>

        <Typography align="center" sx={{ mt: 2, color: '#ddd' }}>
          Already have an account?{' '}
          <MuiLink component={Link} to="/login">
            Log in
          </MuiLink>
        </Typography>
      </Paper>
    </Box>
  );
}
