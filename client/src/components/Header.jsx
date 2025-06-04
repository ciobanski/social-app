import React, { useContext } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  InputBase
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AuthContext from '../AuthContext';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': { backgroundColor: alpha(theme.palette.common.white, 0.25) },
  width: '100%',
  maxWidth: 600,
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2)
  }
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%'
  }
}));

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  return (
    <AppBar position="fixed" sx={{ width: '100vw', left: 0, top: 0, zIndex: theme => theme.zIndex.drawer + 1 }}>
      <Toolbar variant="dense">
        {/* Left: Logo */}
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ color: 'inherit', textDecoration: 'none' }}
        >
          Echo
        </Typography>

        {/* Center: Search (forced center) */}
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase placeholder="Search…" inputProps={{ 'aria-label': 'search' }} />
          </Search>
        </Box>

        {/* Right: Icons */}
        <IconButton color="inherit" component={RouterLink} to={`/profile/${user?.id}`} size="small">
          <AccountCircleIcon />
        </IconButton>
        <IconButton color="inherit" component={RouterLink} to="/settings" size="small" sx={{ ml: 1 }}>
          <SettingsIcon />
        </IconButton>
        <IconButton
          color="inherit"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          size="small"
          sx={{ ml: 1 }}
        >
          <LogoutIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
