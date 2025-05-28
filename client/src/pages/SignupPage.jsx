// src/pages/SignupPage.jsx
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link as MuiLink
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { api } from '../api';
import { toast } from 'react-toastify';

const BG_URL =
  'https://images.unsplash.com/photo-1633886038302-9710437f6ca2?' +
  'q=80&w=1932&auto=format&fit=crop';

const schema = yup
  .object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    email: yup.string().email('Enter a valid email').required('Email is required'),
    password: yup
      .string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required')
  })
  .required();

export default function SignupPage() {
  const navigate = useNavigate();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (data) => {
    try {
      await api.post('/auth/signup', data);
      toast.success('Signup successful! Please check your email to verify.');
      navigate('/login');
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('That email is already registered.');
      } else {
        toast.error('Signup failed: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <Box
        sx={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Paper
          elevation={8}
          sx={{
            width: { xs: '90%', sm: 400 },
            maxWidth: 400,
            bgcolor: 'background.paper',
            backdropFilter: 'blur(8px)',
            p: 4,
            borderRadius: 2
          }}
        >
          <Typography variant="h4" align="center" gutterBottom>
            Sign Up
          </Typography>

          <Box
            component="form"
            autoComplete="off"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {[
              { name: 'firstName', label: 'First Name' },
              { name: 'lastName', label: 'Last Name' },
              { name: 'email', label: 'Email', type: 'email' },
              { name: 'password', label: 'Password', type: 'password' }
            ].map(({ name, label, type }) => (
              <Controller
                key={name}
                name={name}
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={label}
                    type={type || 'text'}
                    variant="filled"
                    error={!!errors[name]}
                    helperText={errors[name]?.message}
                    autoComplete="new-password"
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: '4px',
                        bgcolor: 'rgba(255,255,255,0.1)'
                      },
                      '& .MuiFilledInput-input:-webkit-autofill': {
                        WebkitBoxShadow: `0 0 0 1000px rgba(255,255,255,0.1) inset`,
                        WebkitTextFillColor: '#fff',
                        borderRadius: '4px'
                      }
                    }}
                    InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
                  />
                )}
              />
            ))}

            <Button type="submit" variant="contained" size="large" color="secondary" disabled={isSubmitting}>
              {isSubmitting ? 'Signing up…' : 'Sign Up'}
            </Button>
          </Box>

          <Typography align="center" sx={{ mt: 2, color: 'text.secondary' }}>
            Already have an account?{' '}
            <MuiLink component={Link} to="/login">
              Log in
            </MuiLink>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
