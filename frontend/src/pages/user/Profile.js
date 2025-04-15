import React from 'react';
import { Box, Typography } from '@mui/material';

const Profile = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      <Typography variant="body1">
        User profile information will be displayed here.
      </Typography>
    </Box>
  );
};

export default Profile; 