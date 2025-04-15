import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Chip,
  // CircularProgress,
  // Backdrop
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  TrendingUp,
  AccountBalance,
  SwapHoriz,
  Star,
  Wallet,
  Receipt,
  School,
  // Leaderboard icon removed
  Person,
  ContactSupport,
  Logout,
  CardMembership,
  FilterList,
  ShowChart,
} from '@mui/icons-material';
import { logout } from '../../features/auth/authSlice';
import ThemeToggle from './ThemeToggle';
import { safeNavigate, setupNavigationStyles } from '../../utils/navigationUtils';
import { recordNavigationAttempt, recoverFromStuckNavigation } from '../../utils/navigationDebugger';

// Navigation throttling to prevent multiple clicks
const NAVIGATION_THROTTLE = 250; // ms - increased from 150ms for better stability
let lastNavigationTime = 0;
let navigationFailCount = 0;
const MAX_NAVIGATION_FAILS = 3;

// Track consecutive clicks on the same item
let lastClickedPath = null;
let consecutiveClicks = 0;
const CONSECUTIVE_CLICK_THRESHOLD = 2; // After this many clicks, force navigation

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/app/dashboard' },
  { text: 'Market', icon: <TrendingUp />, path: '/app/market' },
  { text: 'Stock Screener', icon: <FilterList />, path: '/app/stock-screener' },
  { text: 'Technical Analysis', icon: <ShowChart />, path: '/app/technical-analysis' },
  { text: 'Portfolio', icon: <AccountBalance />, path: '/app/portfolio' },
  { text: 'Trading', icon: <SwapHoriz />, path: '/app/trading' },
  { text: 'Watchlist', icon: <Star />, path: '/app/watchlist' },
  { text: 'Wallet', icon: <Wallet />, path: '/app/wallet' },
  { text: 'Trade History', icon: <Receipt />, path: '/app/trade-history' },
  { text: 'Transactions', icon: <Receipt />, path: '/app/transactions' },
  { text: 'Membership', icon: <CardMembership />, path: '/app/membership' },
  { text: 'Learn', icon: <School />, path: '/app/learn' },
  // Leaderboard menu item removed
];

const accountItems = [
  { text: 'Profile', icon: <Person />, path: '/app/profile' },
  { text: 'Contact Us', icon: <ContactSupport />, path: '/app/contact' }
];

// Memoized ListItem component for better performance
const NavItem = React.memo(({ item, selected, onClick }) => {
  // Track clicks for this specific item
  const [clickCount, setClickCount] = React.useState(0);

  // Handle click with additional fallback
  const handleClick = React.useCallback((e) => {
    // Increment click counter
    setClickCount(prev => prev + 1);

    // Call the original onClick handler
    onClick();

    // If clicked multiple times, provide a direct fallback
    if (clickCount >= 2) {
      // Add a small delay to allow the normal navigation to work first
      setTimeout(() => {
        // If we're still on the same page after multiple clicks, force direct navigation
        if (window.location.pathname !== item.path) {
          console.log(`Multiple clicks detected (${clickCount + 1}), forcing direct navigation to ${item.path}`);
          window.location.href = item.path;
        }
        // Reset click count after navigation attempt
        setClickCount(0);
      }, 300);
    }
  }, [onClick, clickCount, item.path]);

  return (
    <ListItem key={item.text} disablePadding>
      <ListItemButton
        selected={selected}
        onClick={handleClick}
        // Add href for better accessibility and fallback navigation
        component="a"
        href={item.path}
        // Prevent default to let our custom navigation handle it
        onClickCapture={(e) => e.preventDefault()}
      >
        <ListItemIcon>{item.icon}</ListItemIcon>
        <ListItemText primary={item.text} />
      </ListItemButton>
    </ListItem>
  );
});

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  // const [showBackdrop, setShowBackdrop] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  // Setup navigation styles once on component mount
  useEffect(() => {
    setupNavigationStyles();
  }, []);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(!mobileOpen);
  }, [mobileOpen]);

  const handleMenuOpen = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate('/');
  }, [dispatch, navigate]);

  const handleNavigate = useCallback((path) => {
    const now = Date.now();

    // Track consecutive clicks on the same item
    if (path === lastClickedPath) {
      consecutiveClicks++;
      console.log(`Consecutive click detected (${consecutiveClicks})`);
    } else {
      lastClickedPath = path;
      consecutiveClicks = 1;
    }

    // If we've had multiple navigation failures or consecutive clicks, bypass throttling
    const shouldBypassThrottling =
      navigationFailCount >= MAX_NAVIGATION_FAILS ||
      consecutiveClicks >= CONSECUTIVE_CLICK_THRESHOLD;

    if (shouldBypassThrottling) {
      console.log('Bypassing throttling due to previous failures or multiple clicks');
      navigationFailCount = 0; // Reset counter
    }
    // Otherwise apply throttling
    else if (now - lastNavigationTime < NAVIGATION_THROTTLE || isNavigating) {
      console.log('Navigation throttled or already navigating');
      return;
    }

    // Don't navigate if we're already on this path
    if (location.pathname === path) {
      console.log('Already on this path, no navigation needed');
      if (isMobile) {
        setMobileOpen(false);
      }
      return;
    }

    // Show navigation indicator
    setIsNavigating(true);
    // setShowBackdrop(true);
    lastNavigationTime = now;

    // Record this navigation attempt for debugging
    recordNavigationAttempt(path);

    // Use safe navigation with enhanced error handling
    safeNavigate(navigate, path, {
      debounceTime: 50, // Even faster navigation between internal pages
      showLoading: true,
      resetScroll: true,
      // Bypass debounce completely if we've had multiple clicks or failures
      bypassDebounce: shouldBypassThrottling || consecutiveClicks >= CONSECUTIVE_CLICK_THRESHOLD,
      onComplete: () => {
        setIsNavigating(false);
        // setShowBackdrop(false);
        if (isMobile) {
          setMobileOpen(false);
        }
        // Reset navigation fail count on successful navigation
        navigationFailCount = 0;
        // Reset consecutive clicks after successful navigation
        if (path === lastClickedPath) {
          consecutiveClicks = 0;
        }
      }
    });

    // Set a safety timeout to hide backdrop if navigation fails
    setTimeout(() => {
      // If we're still navigating after this timeout, something went wrong
      if (isNavigating) {
        // setShowBackdrop(false);
        setIsNavigating(false);
        navigationFailCount++;
        console.warn(`Navigation timeout detected (fail count: ${navigationFailCount})`);

        // If we've had multiple failures or clicks, try to recover
        if (navigationFailCount >= MAX_NAVIGATION_FAILS || consecutiveClicks >= CONSECUTIVE_CLICK_THRESHOLD) {
          console.warn('Multiple navigation failures or clicks detected, attempting recovery');
          // Force a reload if we've had many consecutive clicks
          const forceReload = consecutiveClicks >= CONSECUTIVE_CLICK_THRESHOLD + 1;
          recoverFromStuckNavigation(path, forceReload);
        }
      }
    }, 1500); // Further reduced from 2000ms
  }, [navigate, location.pathname, isMobile, isNavigating]);

  // Memoize the drawer content to prevent unnecessary re-renders
  const drawer = useMemo(() => (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          Virtual Trading
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <NavItem
            key={item.text}
            item={item}
            selected={location.pathname === item.path}
            onClick={() => handleNavigate(item.path)}
          />
        ))}
      </List>
      <Divider />
      <List>
        {accountItems.map((item) => (
          <NavItem
            key={item.text}
            item={item}
            selected={location.pathname === item.path}
            onClick={() => handleNavigate(item.path)}
          />
        ))}
      </List>
    </Box>
  ), [location.pathname, handleNavigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Chip
              label={user?.membership ? `${user.membership.charAt(0).toUpperCase() + user.membership.slice(1)} Plan` : 'Free Plan'}
              color={user?.membership === 'premium' ? 'secondary' : (user?.membership === 'pro' ? 'primary' : 'default')}
              size="small"
              sx={{ mr: 2 }}
            />
            <ThemeToggle />
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
              sx={{ ml: 1 }}
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.name?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => handleNavigate('/app/profile')}>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          height: '100vh',
          overflow: 'auto',
          p: 3
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {/* Navigation loading indicator - Removed */}
    </Box>
  );
};

export default Layout;