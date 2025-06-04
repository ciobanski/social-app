// src/pages/LoginPage.jsx
import React, { useContext } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link as MuiLink,
} from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import AuthContext from '../AuthContext'
import { toast } from 'react-toastify'

const BG_URL =
  'https://images.unsplash.com/photo-1633886038302-9710437f6ca2?' +
  'q=80&w=1932&auto=format&fit=crop'

const schema = yup
  .object({
    email: yup.string().email('Enter a valid email').required('Email is required'),
    password: yup
      .string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  })
  .required()

export default function LoginPage() {
  const { login, authLoading } = useContext(AuthContext)
  const navigate = useNavigate()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) })

  const onSubmit = async (data) => {
    // data = { email, password }
    const result = await login(data.email, data.password)
    if (!result.success) {
      // show the backend‐sent error (or generic) in a toast
      toast.error(result.message || 'Login failed')
      return
    }
    toast.success('Logged in successfully!')
    navigate('/')
  }

  // If AuthContext is still checking an existing token, show nothing (or a spinner)
  if (authLoading) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Box
        sx={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" align="center" gutterBottom>
            Log In
          </Typography>

          <Box
            component="form"
            autoComplete="off"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {['email', 'password'].map((name) => (
              <Controller
                key={name}
                name={name}
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    type={name}
                    label={name === 'email' ? 'Email' : 'Password'}
                    variant="filled"
                    error={!!errors[name]}
                    helperText={errors[name]?.message}
                    autoComplete="new-password"
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: '4px',
                        bgcolor: 'rgba(255,255,255,0.1)',
                      },
                      '& .MuiFilledInput-input:-webkit-autofill': {
                        WebkitBoxShadow: `0 0 0 1000px rgba(255,255,255,0.1) inset`,
                        WebkitTextFillColor: '#fff',
                        borderRadius: '4px',
                      },
                    }}
                    InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
                  />
                )}
              />
            ))}

            <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in…' : 'Log In'}
            </Button>
          </Box>

          <Typography align="center" sx={{ mt: 2, color: 'text.secondary' }}>
            Don’t have an account?{' '}
            <MuiLink component={Link} to="/signup" color="secondary">
              Sign up
            </MuiLink>
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}
