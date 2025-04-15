import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Button, CircularProgress, Typography, Alert, Paper } from '@mui/material';
import { executeTrade } from '../../features/trading/tradingSlice';
import { toast } from 'react-toastify';
import { getWalletBalance } from '../../features/wallet/walletSlice';

// Add wallet balance display at the top of the form
const TradeForm = ({ onClose }) => {
  const dispatch = useDispatch();
  const { selectedStock, isLoading, isError, message } = useSelector((state) => state.trading);
  const { walletBalance, availableBalance } = useSelector(state => state.wallet);
  
  useEffect(() => {
    // Fetch wallet balance when component mounts
    dispatch(getWalletBalance());
  }, [dispatch]);
  
  // Display wallet balance information
  const renderWalletInfo = () => {
    return (
      <Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Available Balance: ₹{availableBalance?.toFixed(2) || '0.00'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Wallet Balance: ₹{walletBalance?.toFixed(2) || '0.00'}
        </Typography>
      </Box>
    );
  };
  
  // Inside your return statement, add the wallet info
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      {renderWalletInfo()}
      {/* Your existing form code */}
      
      {/* Improve error handling */}
      {isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {message && message.includes('Insufficient balance') 
            ? <Box>
                <Typography variant="body2" fontWeight="bold">Insufficient Balance</Typography>
                <Typography variant="body2">{message}</Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  color="primary" 
                  sx={{ mt: 1 }}
                  onClick={() => {/* Add navigation to wallet */}}
                >
                  Add Funds
                </Button>
              </Box>
            : message
          }
        </Alert>
      )}
      
      {/* Rest of your component */}
    </Paper>
  );
};

export default TradeForm; 