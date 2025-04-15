import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { InputAdornment } from '@mui/material';
import {
  getWalletBalance,
  reset,
  setAlert,
  clearAlert,
} from '../../features/wallet/walletSlice';
import api from '../../utils/axiosConfig';

const Wallet = () => {
  const dispatch = useDispatch();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const wallet = useSelector((state) => state.wallet) || { balance: 0, virtualBalance: 0, isLoading: false, isError: false, message: '', alert: { show: false } };
  const { balance, virtualBalance, isLoading, isError, message, alert } = wallet;
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getWalletBalance());
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      document.body.appendChild(script);
    });
  };

  const handleAddFunds = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      dispatch(setAlert({
        type: 'error',
        message: 'Please enter a valid amount'
      }));
      return;
    }

    try {
      setIsProcessing(true);
      await loadRazorpay();

      const response = await api.post('/api/wallet/recharge', {
        amount: Number(amount)
      });

      const options = {
        key: response.data.keyId,
        amount: response.data.amount,
        currency: response.data.currency,
        name: 'Virtual Trading Simulator',
        description: 'Add funds to wallet',
        order_id: response.data.orderId,
        handler: async function (response) {
          try {
            console.log('Payment successful, verifying with data:', {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature ? 'Present' : 'Missing'
            });

            const verifyResponse = await api.post('/api/wallet/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });

            console.log('Verification response:', verifyResponse.data);

            if (verifyResponse.data.success) {
              // Update wallet balance immediately
              try {
                await dispatch(getWalletBalance());
                setAmount('');

                // Show success notification
                dispatch(
                  setAlert({
                    type: 'success',
                    message: 'Payment successful! Your wallet has been updated.'
                  })
                );
              } catch (error) {
                console.error('Error updating wallet balance:', error);
              }
            } else {
              dispatch(
                setAlert({
                  type: 'error',
                  message: 'Payment verification failed. Please contact support.'
                })
              );
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            dispatch(
              setAlert({
                type: 'error',
                message: 'Payment verification failed. Please contact support if amount was deducted.'
              })
            );
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#3f51b5',
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        dispatch(
          setAlert({
            type: 'error',
            message: `Payment failed: ${response.error.description}`
          })
        );
        setIsProcessing(false);
      });

      razorpay.open();
    } catch (error) {
      console.error('Error initiating payment:', error);
      dispatch(
        setAlert({
          type: 'error',
          message: 'Failed to initiate payment. Please try again.'
        })
      );
      setIsProcessing(false);
    }
  };

  const handleCloseAlert = () => {
    dispatch(clearAlert());
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <AccountBalanceWalletIcon fontSize="large" color="primary" sx={{ mr: 2 }} />
                <Typography variant="h5" component="h2">
                  Virtual Currency
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', p: 3, bgcolor: 'background.paper', borderRadius: 2, mb: 3 }}>
                <Typography variant="h3" component="p" fontWeight="medium" color="primary.main">
                  {virtualBalance.toLocaleString()}
                </Typography>
                <Typography variant="h6" color="primary.main" sx={{ mt: 1 }}>
                  Virtual Coins
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                For every ₹1 added, you get 50 virtual coins for trading.
              </Typography>

              <Box mt={4} sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Add Virtual Coins
                </Typography>

                <TextField
                  label="Amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  disabled={isProcessing || isLoading}
                  InputProps={{
                    inputProps: { min: 10 },
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }}
                  helperText="Minimum amount: ₹10"
                />

                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 2 }}>
                  <ArrowRightAltIcon color="action" />
                  <Typography variant="body2" color="primary" sx={{ ml: 1 }}>
                    You'll receive <strong>{Number(amount || 0) * 50}</strong> Virtual Coins
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddFunds}
                  disabled={isProcessing || isLoading || !amount || Number(amount) < 10}
                  fullWidth
                  size="large"
                  sx={{ mt: 2 }}
                  startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : <AddIcon />}
                >
                  {isProcessing ? 'Processing...' : 'Add Funds'}
                </Button>
              </Box>

              {isError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {message}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={alert.show}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.type} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Wallet;