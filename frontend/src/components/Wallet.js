import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Snackbar, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useSelector } from 'react-redux';

const Wallet = () => {
    const [wallet, setWallet] = useState(null);
    const [amount, setAmount] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    
    // Get auth token from Redux store
    const { user } = useSelector(state => state.auth);
    const token = user?.token;

    useEffect(() => {
        fetchWallet();
        fetchTransactions();
    }, []);

    const fetchWallet = async () => {
        try {
            setError(null);
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/wallet/balance`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setWallet(response.data);
        } catch (error) {
            console.error('Error fetching wallet:', error);
            setError('Failed to fetch wallet balance');
        }
    };

    const fetchTransactions = async () => {
        try {
            setError(null);
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/wallet/transactions`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setTransactions(response.data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setError('Failed to fetch transaction history');
        }
    };

    const handleAddFunds = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Create a payment order
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/wallet/recharge`, 
                { amount: Number(amount) },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            const options = {
                key: process.env.REACT_APP_RAZORPAY_KEY_ID,
                amount: response.data.amount,
                currency: response.data.currency,
                name: 'Virtual Trading Simulator',
                description: 'Virtual Currency Purchase',
                order_id: response.data.orderId,
                handler: async function (response) {
                    try {
                        console.log('Payment successful, verifying with data:', {
                            orderId: response.razorpay_order_id,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature ? 'Present' : 'Missing'
                        });
                        
                        // Use the correct endpoint for payment verification
                        const verificationData = {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        };
                        
                        console.log('Sending verification request to server:', verificationData);
                        
                        const verificationResponse = await axios.post(
                            `${process.env.REACT_APP_API_URL}/api/wallet/verify`, 
                            verificationData,
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                }
                            }
                        );
                        
                        console.log('Verification response:', verificationResponse.data);
                        
                        // Show success notification
                        setNotification({
                            open: true,
                            message: 'Payment successful! Your wallet has been updated.',
                            severity: 'success'
                        });
                        
                        // Refresh wallet and transactions
                        fetchWallet();
                        fetchTransactions();
                        setAmount('');
                    } catch (error) {
                        console.log('Payment verification error:', error);
                        console.log('Error response:', error.response?.data);
                        setError('Payment verification failed. Please contact support.');
                        setNotification({
                            open: true,
                            message: 'Payment verification failed. Please contact support.',
                            severity: 'error'
                        });
                    } finally {
                        setLoading(false);
                    }
                },
                prefill: {
                    name: user?.name || 'User',
                    email: user?.email || 'user@example.com'
                },
                theme: {
                    color: '#3f51b5'
                },
                modal: {
                    ondismiss: function() {
                        console.log('Payment modal dismissed');
                        setLoading(false);
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.on('payment.failed', function (response) {
                console.error('Payment failed:', response.error);
                setError(`Payment failed: ${response.error.description}`);
                setNotification({
                    open: true,
                    message: `Payment failed: ${response.error.description}`,
                    severity: 'error'
                });
                setLoading(false);
            });
            
            razorpay.open();
        } catch (error) {
            console.error('Error initiating recharge:', error);
            setError('Failed to initiate payment. Please try again.');
            setNotification({
                open: true,
                message: 'Failed to initiate payment. Please try again.',
                severity: 'error'
            });
            setLoading(false);
        }
    };

    const handleCloseNotification = () => {
        setNotification({
            ...notification,
            open: false
        });
    };

    return (
        <Box sx={{ maxWidth: 800, margin: '0 auto', padding: 3 }}>
            <Typography variant="h4" gutterBottom>
                Wallet
            </Typography>

            {error && (
                <Alert severity="error" sx={{ marginBottom: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ padding: 3, marginBottom: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Current Balance: ₹{wallet?.balance || 0}
                </Typography>
                
                <Typography variant="body1" color="text.secondary">
                    Available Balance: ₹{wallet?.availableBalance || 0}
                </Typography>
                
                <Typography variant="body1" color="text.secondary">
                    Held for Orders: ₹{wallet?.heldBalance || 0}
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, marginTop: 2 }}>
                    <TextField
                        type="number"
                        label="Amount (₹)"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={loading}
                        inputProps={{ min: 10 }}
                        helperText="Minimum amount: ₹10"
                    />
                    <Button
                        variant="contained"
                        onClick={handleAddFunds}
                        disabled={!amount || Number(amount) < 10 || loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {loading ? 'Processing...' : 'Add Funds'}
                    </Button>
                </Box>
            </Paper>

            <Typography variant="h6" gutterBottom>
                Transaction History
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.length > 0 ? (
                            transactions.map((transaction, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        {new Date(transaction.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>{transaction.type}</TableCell>
                                    <TableCell>₹{transaction.amount}</TableCell>
                                    <TableCell>{transaction.status}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No transactions found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
            >
                <Alert 
                    onClose={handleCloseNotification} 
                    severity={notification.severity}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Wallet;