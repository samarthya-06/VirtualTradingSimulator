import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

const StockDetail = () => {
  const { symbol } = useParams();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Stock Details: {symbol}
      </Typography>
      <Typography variant="body1">
        Stock details will be displayed here.
      </Typography>
    </Box>
  );
};

export default StockDetail; 