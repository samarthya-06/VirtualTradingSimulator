import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Box, CircularProgress, Typography } from '@mui/material';
import { setCredentials } from '../../features/auth/authSlice';
import axios from '../../utils/axiosConfig';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    const handleAuthSuccess = async () => {
      try {
        // Get token from URL query params
        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (!token) {
          console.error('No token found in URL');
          navigate('/login');
          return;
        }

        // Get user data using the token
        const response = await axios.get('/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Create user object with token
        const userData = {
          ...response.data,
          token,
        };

        // Save to localStorage and Redux store
        localStorage.setItem('user', JSON.stringify(userData));
        dispatch(setCredentials(userData));

        // Initialize portfolio
        try {
          await axios.post('/api/portfolio', {}, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        } catch (error) {
          console.error('Error initializing portfolio:', error);
          // Continue even if portfolio initialization fails
        }

        // Redirect to dashboard
        navigate('/app/dashboard');
      } catch (error) {
        console.error('Error during auth success handling:', error);
        navigate('/login');
      }
    };

    handleAuthSuccess();
  }, [dispatch, location.search, navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Completing authentication...
      </Typography>
    </Box>
  );
};

export default AuthSuccess;
