import React from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import StockScreener from '../../components/market/StockScreener';

const StockScreenerPage = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Stock Screener
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Use the stock screener to find investment opportunities based on various criteria including 
            price range, sector, market capitalization, technical indicators, and more.
          </Typography>
        </Paper>
        
        <StockScreener />
      </Box>
    </Container>
  );
};

export default StockScreenerPage; 