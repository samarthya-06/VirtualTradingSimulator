import React, { createContext, useState, useMemo, Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import websocketService from './app/websocket';

// Layout Components
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import { setupNavigationStyles } from './utils/navigationUtils';
import { initNavigationDebugger } from './utils/navigationDebugger';

// Custom lazy loader with retry logic
const retryLoadComponent = (componentImport, retries = 3, interval = 500) => {
  return new Promise((resolve, reject) => {
    componentImport()
      .then(resolve)
      .catch((error) => {
        // If we still have retries left, try again after the interval
        setTimeout(() => {
          if (retries === 1) {
            reject(error);
            return;
          }
          retryLoadComponent(componentImport, retries - 1, interval)
            .then(resolve)
            .catch(reject);
        }, interval);
      });
  });
};

// Enhanced lazy loading with retry
const enhancedLazy = (importFn, options = {}) => {
  return lazy(() => retryLoadComponent(importFn, options.retries || 3, options.interval || 500));
};

// Lazy loading with chunk naming for better caching and organization
// Auth pages
const Login = enhancedLazy(() => import(/* webpackChunkName: "auth" */ './pages/auth/Login'));
const Register = enhancedLazy(() => import(/* webpackChunkName: "auth" */ './pages/auth/Register'));
const AuthSuccess = enhancedLazy(() => import(/* webpackChunkName: "auth" */ './pages/auth/AuthSuccess'));
const LandingPage = enhancedLazy(() => import(/* webpackChunkName: "public" */ './pages/LandingPage'));

// Core app pages - grouped by feature
// Dashboard
const Dashboard = enhancedLazy(() => import(/* webpackChunkName: "dashboard" */ './pages/dashboard/Dashboard'));

// Market related pages
const Market = enhancedLazy(() => import(/* webpackChunkName: "market" */ './pages/market/Market'));
const TechnicalAnalysis = enhancedLazy(() => import(/* webpackChunkName: "market" */ './pages/market/TechnicalAnalysis'));
const StockScreenerPage = enhancedLazy(() => import(/* webpackChunkName: "market" */ './pages/market/StockScreenerPage'));

// Portfolio and trading pages
const Portfolio = enhancedLazy(() => import(/* webpackChunkName: "portfolio" */ './pages/portfolio/Portfolio'));
const Trading = enhancedLazy(() => import(/* webpackChunkName: "trading" */ './pages/trading/Trading'));
const TradeHistory = enhancedLazy(() => import(/* webpackChunkName: "trading" */ './pages/trading/TradeHistory'));
const Watchlist = enhancedLazy(() => import(/* webpackChunkName: "portfolio" */ './pages/watchlist/Watchlist'));

// Financial pages
const Wallet = enhancedLazy(() => import(/* webpackChunkName: "finance" */ './pages/wallet/Wallet'));
const Transactions = enhancedLazy(() => import(/* webpackChunkName: "finance" */ './pages/transactions/Transactions'));
const Membership = enhancedLazy(() => import(/* webpackChunkName: "finance" */ './pages/membership/Membership'));

// Supplementary features - loaded on demand
const Learn = enhancedLazy(() => import(/* webpackChunkName: "supplementary" */ './pages/learn/Learn'));
// Leaderboard component removed
const Profile = enhancedLazy(() => import(/* webpackChunkName: "user" */ './pages/profile/Profile'));
const ContactUs = enhancedLazy(() => import(/* webpackChunkName: "supplementary" */ './pages/contact/ContactUs'));

// Advanced loading component that shows more detailed progress
const PageLoader = ({ message }) => (
  <LoadingSpinner message={message} />
);

export const ColorModeContext = createContext({
  mode: 'light',
  toggleColorMode: () => {}
});

const App = () => {
  // Get initial mode from localStorage or default to light
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  // Update localStorage when mode changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Set up navigation styles and debugger
  useEffect(() => {
    setupNavigationStyles();

    // Initialize navigation debugger to help with navigation issues
    initNavigationDebugger();

    // Add a global click handler for navigation links as a fallback
    const handleGlobalClick = (e) => {
      // Only process clicks on anchor tags with href starting with /app
      if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('/app')) {
        const path = e.target.getAttribute('href');

        // Check if navigation appears to be stuck
        if (window._navigationState?.isNavigating) {
          console.log('Navigation appears stuck, using direct fallback for:', path);
          e.preventDefault();

          // Reset navigation state
          if (window._navigationState.reset) {
            window._navigationState.reset();
          }

          // Use direct navigation
          window.location.href = path;
        }
      }
    };

    document.body.addEventListener('click', handleGlobalClick);

    return () => {
      document.body.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Initialize WebSocket connection for real-time data when app loads
  useEffect(() => {
    // Initialize WebSocket only if user is logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) {
      console.log('Initializing WebSocket connection for real-time data');
      websocketService.initializeWebSocket();
    }

    // Cleanup function to disconnect WebSocket when app unmounts
    return () => {
      if (websocketService && typeof websocketService.disconnect === 'function') {
        console.log('Disconnecting WebSocket');
        websocketService.disconnect();
      }
    };
  }, []);

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#3f51b5',
            ...(mode === 'dark' && {
              main: '#90caf9',
            }),
          },
          secondary: {
            main: '#f50057',
            ...(mode === 'dark' && {
              main: '#f48fb1',
            }),
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : '#121212',
            paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
              },
            },
          },
        },
      }),
    [mode]
  );

  // Preload critical chunks on initial load
  useEffect(() => {
    // Preload market and portfolio modules since they're commonly used
    const preloadChunks = async () => {
      // Using dynamic imports to preload
      // This runs after initial load but before user navigates
      const promises = [
        import(/* webpackChunkName: "market" */ './pages/market/Market'),
        import(/* webpackChunkName: "portfolio" */ './pages/portfolio/Portfolio')
      ];
      try {
        await Promise.all(promises);
        console.log('Critical chunks preloaded');
      } catch (err) {
        console.error('Error preloading chunks:', err);
      }
    };

    // Run after initial render is complete
    const timeoutId = setTimeout(preloadChunks, 3000);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <ErrorBoundary>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastContainer position="top-right" autoClose={5000} />
          <Routes>
            <Route path="/login" element={
              <Suspense fallback={<PageLoader message="Loading login..." />}>
                <Login />
              </Suspense>
            } />
            <Route path="/register" element={
              <Suspense fallback={<PageLoader message="Loading registration..." />}>
                <Register />
              </Suspense>
            } />
            <Route path="/auth/success" element={
              <Suspense fallback={<PageLoader message="Completing authentication..." />}>
                <AuthSuccess />
              </Suspense>
            } />
            <Route path="/" element={
              <Suspense fallback={<PageLoader message="Loading..." />}>
                <LandingPage />
              </Suspense>
            } />

            <Route
              path="/app/*"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" />} />
              <Route path="dashboard" element={
                <Suspense fallback={<PageLoader message="Loading dashboard..." />}>
                  <Dashboard />
                </Suspense>
              } />

              {/* Market routes group */}
              <Route path="market" element={
                <Suspense fallback={<PageLoader message="Loading market data..." />}>
                  <Market />
                </Suspense>
              } />
              <Route path="stock-screener" element={
                <Suspense fallback={<PageLoader message="Loading stock screener..." />}>
                  <StockScreenerPage />
                </Suspense>
              } />
              <Route path="technical-analysis" element={
                <Suspense fallback={<PageLoader message="Loading technical analysis..." />}>
                  <TechnicalAnalysis />
                </Suspense>
              } />
              <Route path="technical-analysis/:symbol" element={
                <Suspense fallback={<PageLoader message="Loading technical analysis..." />}>
                  <TechnicalAnalysis />
                </Suspense>
              } />

              {/* Portfolio and trading routes group */}
              <Route path="portfolio" element={
                <Suspense fallback={<PageLoader message="Loading portfolio..." />}>
                  <Portfolio />
                </Suspense>
              } />
              <Route path="trading" element={
                <Suspense fallback={<PageLoader message="Loading trading platform..." />}>
                  <Trading />
                </Suspense>
              } />
              <Route path="watchlist" element={
                <Suspense fallback={<PageLoader message="Loading watchlist..." />}>
                  <Watchlist />
                </Suspense>
              } />
              <Route path="trade-history" element={
                <Suspense fallback={<PageLoader message="Loading trade history..." />}>
                  <TradeHistory />
                </Suspense>
              } />

              {/* Financial routes group */}
              <Route path="wallet" element={
                <Suspense fallback={<PageLoader message="Loading wallet..." />}>
                  <Wallet />
                </Suspense>
              } />
              <Route path="transactions" element={
                <Suspense fallback={<PageLoader message="Loading transactions..." />}>
                  <Transactions />
                </Suspense>
              } />
              <Route path="membership" element={
                <Suspense fallback={<PageLoader message="Loading membership plans..." />}>
                  <Membership />
                </Suspense>
              } />

              {/* Supplementary routes group */}
              <Route path="learn" element={
                <Suspense fallback={<PageLoader message="Loading learning resources..." />}>
                  <Learn />
                </Suspense>
              } />
              {/* Leaderboard route removed */}
              <Route path="profile" element={
                <Suspense fallback={<PageLoader message="Loading profile..." />}>
                  <Profile />
                </Suspense>
              } />
              <Route path="contact" element={
                <Suspense fallback={<PageLoader message="Loading contact page..." />}>
                  <ContactUs />
                </Suspense>
              } />
            </Route>
          </Routes>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </ErrorBoundary>
  );
};

const PrivateRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  return user ? children : <Navigate to="/login" />;
};

export default App;