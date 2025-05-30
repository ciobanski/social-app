import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Avatar,
  IconButton,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { api } from '../api';

const profileSchema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  country: yup.string().max(56, 'Max 56 characters').nullable(),
  birthday: yup
    .string()
    .nullable()
    .test('is-date', 'Invalid date', val =>
      !val || dayjs(val, 'YYYY-MM-DD', true).isValid()
    ),
  birthdayVisibility: yup
    .mixed()
    .oneOf(['public', 'friends', 'private'])
    .required()
}).required();

export default function EditProfileModal({
  open,
  onClose,
  profile,
  setProfile,
  reloadMe
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  const {
    control,
    handleSubmit,
    reset,
    // setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      country: '',
      birthday: '',
      birthdayVisibility: 'friends'
    }
  });

  // populate form when profile loads
  useEffect(() => {
    if (!profile) return;
    reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      country: profile.country || '',
      birthday: profile.birthday
        ? dayjs(profile.birthday).format('YYYY-MM-DD')
        : '',
      birthdayVisibility: profile.birthdayVisibility || 'friends'
    });
  }, [profile, reset]);

  // avatar upload handler
  const handleAvatarChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await api.post('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // data.avatarUrl from Cloudinary
      setProfile(p => ({ ...p, avatarUrl: data.avatarUrl }));
      await reloadMe();
      toast.success('Avatar uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // save profile handler
  const onSave = async formData => {
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        country: formData.country || undefined,
        birthday: formData.birthday || null,
        birthdayVisibility: formData.birthdayVisibility
      };
      const { data: updated } = await api.put('/users/me', payload);
      setProfile(p => ({ ...p, ...updated }));
      await reloadMe();
      toast.success('Profile updated');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Profile</DialogTitle>
      <form onSubmit={handleSubmit(onSave)}>
        <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
          {/* Avatar picker */}
          <Box sx={{ position: 'relative', width: 80, height: 80, mx: 'auto' }}>
            <Avatar
              src={profile.avatarUrl}
              sx={{ width: 80, height: 80 }}
            />
            <IconButton
              size="small"
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'background.paper'
              }}
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <input
              type="file"
              accept="image/*"
              hidden
              ref={fileInputRef}
              onChange={handleAvatarChange}
            />
          </Box>

          {/* Name fields */}
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="First Name"
                fullWidth
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
            )}
          />
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Last Name"
                fullWidth
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            )}
          />

          {/* Country & Birthday */}
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Country"
                fullWidth
                error={!!errors.country}
                helperText={errors.country?.message}
              />
            )}
          />
          <Controller
            name="birthday"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Birthday"
                type="date"
                InputLabelProps={{ shrink: true }}
                error={!!errors.birthday}
                helperText={errors.birthday?.message}
              />
            )}
          />

          {/* Birthday Visibility */}
          <FormControl>
            <FormLabel>Birthday Visibility</FormLabel>
            <Controller
              name="birthdayVisibility"
              control={control}
              render={({ field }) => (
                <RadioGroup {...field} row>
                  {['public', 'friends', 'private'].map(opt => (
                    <FormControlLabel
                      key={opt}
                      value={opt}
                      control={<Radio />}
                      label={opt.charAt(0).toUpperCase() + opt.slice(1)}
                    />
                  ))}
                </RadioGroup>
              )}
            />
          </FormControl>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
