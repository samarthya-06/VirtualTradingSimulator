import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  styled,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as MarketIcon,
  AccountBalance as PortfolioIcon,
  Star as WatchlistIcon,
  SwapHoriz as TradingIcon,
  School as LearnIcon,
  // Leaderboard icon removed
  AccountBalanceWallet as WalletIcon,
  Receipt as TransactionIcon,
  Person as UserIcon,
  Chat as MessageIcon,
  Logout as LogOutIcon,
  FilterList as ScreenerIcon,
  ShowChart as TechnicalAnalysisIcon,
} from '@mui/icons-material';
import { logout } from '../../features/auth/authSlice';

const StyledListItem = styled(ListItem)(({ theme, active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1, 1.5),
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  color: active ? theme.palette.grey[900] : theme.palette.grey[600],
  backgroundColor: active ? theme.palette.grey[100] : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.grey[50],
  },
  '& .MuiListItemIcon-root': {
    minWidth: 'auto',
    color: 'inherit',
    fontSize: '1.25rem',
  },
  '& .MuiListItemText-primary': {
    fontSize: '0.875rem',
    fontWeight: active ? 600 : 400,
  },
}));

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/app/dashboard' },
  { text: 'Market', icon: <MarketIcon />, path: '/app/market' },
  { text: 'Stock Screener', icon: <ScreenerIcon />, path: '/app/stock-screener' },
  { text: 'Technical Analysis', icon: <TechnicalAnalysisIcon />, path: '/app/technical-analysis' },
  { text: 'Portfolio', icon: <PortfolioIcon />, path: '/app/portfolio' },
  { text: 'Trading', icon: <TradingIcon />, path: '/app/trading' },
  { text: 'Watchlist', icon: <WatchlistIcon />, path: '/app/watchlist' },
  { text: 'Wallet', icon: <WalletIcon />, path: '/app/wallet' },
  { text: 'Trade History', icon: <TransactionIcon />, path: '/app/trade-history' },
  { text: 'Transactions', icon: <TransactionIcon />, path: '/app/transactions' },
  { text: 'Learn', icon: <LearnIcon />, path: '/app/learn' },
  // Leaderboard menu item removed
];

const accountItems = [
  { text: 'Profile', icon: <UserIcon />, path: '/app/profile' },
  { text: 'Contact Us', icon: <MessageIcon />, path: '/app/contact' }
];

const Sidebar = ({ drawerWidth, mobileOpen, onDrawerToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const handleClick = (item) => {
    if (item.text === 'Logout') {
      handleLogout();
    } else {
      navigate(item.path);
    }
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderBottom: '1px solid',
        borderColor: 'grey.200',
        height: '64px',
      }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            bgcolor: '#1976d2',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700 }}>
            VT
          </Typography>
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.900' }}>
          Virtual Trading
        </Typography>
      </Box>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
        <List sx={{ '& > *:not(:last-child)': { mb: 0.5 } }}>
          {menuItems.map((item) => (
            <StyledListItem
              key={item.text}
              active={location.pathname === item.path ? 1 : 0}
              onClick={() => handleClick(item)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </StyledListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Account Section */}
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            color: 'text.secondary',
            textTransform: 'uppercase',
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}
        >
          Account
        </Typography>
        <List sx={{ mt: 1, '& > *:not(:last-child)': { mb: 0.5 } }}>
          {accountItems.map((item) => (
            <StyledListItem
              key={item.text}
              active={location.pathname === item.path ? 1 : 0}
              onClick={() => handleClick(item)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </StyledListItem>
          ))}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: { sm: drawerWidth },
        flexShrink: { sm: 0 },
      }}
      aria-label="navigation sidebar"
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            bgcolor: 'background.paper',
            borderRight: 'none'
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            bgcolor: 'background.paper',
            borderRight: 'none',
            borderColor: 'grey.200'
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;