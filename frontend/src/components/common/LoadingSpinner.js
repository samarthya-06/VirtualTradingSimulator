import React, { useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  // Set a timeout to automatically hide the spinner after a certain time
  // This prevents UI from getting stuck in loading state
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Find all loading spinners and add a class to fade them out
      const spinners = document.querySelectorAll('.loading-spinner-container');
      spinners.forEach(spinner => {
        spinner.classList.add('loading-timeout');
      });
    }, 5000); // 5 seconds timeout

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <Box
      className="loading-spinner-container"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        opacity: 1,
        transition: 'opacity 0.5s ease-in-out',
        '&.loading-timeout': {
          opacity: 0.3,
        }
      }}
    >
      <CircularProgress size={30} thickness={4} />
      <Typography variant="body1" sx={{ mt: 2 }}>
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;