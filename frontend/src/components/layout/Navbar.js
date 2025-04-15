import React, { useState, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  InputBase,
  styled,
  Tooltip,
  useTheme,
  Chip,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Logout as LogoutIcon,
  Person as ProfileIcon,
  Settings as SettingsIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material';
import { logout } from '../../features/auth/authSlice';
import { getWalletBalance } from '../../features/wallet/walletSlice';
import { ColorModeContext } from '../../App';

const DRAWER_WIDTH = 240;

const SearchInput = styled(InputBase)(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[50],
  width: '384px',
  padding: theme.spacing(1),
  paddingLeft: theme.spacing(5),
  '&:hover': {
    backgroundColor: theme.palette.grey[100],
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  position: 'absolute',
  left: theme.spacing(2),
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
  zIndex: 1,
}));

const Navbar = ({ onDrawerToggle }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { balance = 0, isLoading } = useSelector((state) => state.wallet || {});
  const [anchorEl, setAnchorEl] = useState(null);
  const colorMode = useContext(ColorModeContext);
  const theme = useTheme();

  useEffect(() => {
    if (user && user.token) {
      dispatch(getWalletBalance());
    }
  }, [dispatch, user]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
    handleClose();
  };

  const handleProfile = () => {
    navigate('/app/profile');
    handleClose();
  };

  const handleSettings = () => {
    navigate('/app/settings');
    handleClose();
  };

  const handleWalletClick = () => {
    navigate('/app/wallet');
  };

  const toggleColorMode = () => {
    colorMode.toggleColorMode();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        boxShadow: 1,
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <SearchInput
              placeholder="Search stocks, indices, or news..."
              inputProps={{ 'aria-label': 'search' }}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Wallet Balance */}
          <Tooltip title="View wallet">
            <Chip
              icon={<WalletIcon fontSize="small" />}
              label={`₹${balance.toFixed(2)}`}
              variant="outlined"
              clickable
              onClick={handleWalletClick}
              sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}
            />
          </Tooltip>

          {/* Dark Mode Toggle */}
          <Tooltip title={theme.palette.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggleColorMode} color="inherit" sx={{ mr: 2 }}>
              {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <IconButton color="inherit" sx={{ mr: 2 }}>
            <NotificationsIcon />
          </IconButton>

          {/* User Menu */}
          <Box>
            <Tooltip title="Account settings">
              <IconButton
                onClick={handleMenu}
                size="small"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                color="inherit"
              >
                {user?.avatar ? (
                  <Avatar
                    alt={user.name}
                    src={user.avatar}
                    sx={{ width: 32, height: 32 }}
                  />
                ) : (
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                    {user?.name?.charAt(0) || 'U'}
                  </Avatar>
                )}
              </IconButton>
            </Tooltip>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleProfile}>
                <ProfileIcon fontSize="small" sx={{ mr: 1 }} />
                Profile
              </MenuItem>
              <MenuItem onClick={handleSettings}>
                <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
                Settings
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;