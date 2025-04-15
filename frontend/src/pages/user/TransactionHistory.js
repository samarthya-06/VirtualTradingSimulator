import React from 'react';
import { Box, Typography } from '@mui/material';

const TransactionHistory = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Transaction History
      </Typography>
      <Typography variant="body1">
        User transaction history will be displayed here.
      </Typography>
    </Box>
  );
};

export default TransactionHistory; 