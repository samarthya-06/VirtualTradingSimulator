import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { getTransactions, reset } from '../../features/wallet/walletSlice';

const Transactions = () => {
  const dispatch = useDispatch();
  const wallet = useSelector((state) => state.wallet) || { transactions: [], isLoading: false, isError: false, message: '' };
  const { transactions, isLoading, isError, message } = wallet;

  useEffect(() => {
    dispatch(getTransactions());
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 600 }}>
          Transactions
        </Typography>

        {isError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Transaction History
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Transaction ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(transactions || []).map((transaction, index) => (
                    <TableRow key={transaction.transactionId || transaction._id || `transaction-${index}`}>
                      <TableCell>
                        {transaction.timestamp || transaction.createdAt 
                          ? new Date(transaction.timestamp || transaction.createdAt).toLocaleString() 
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{transaction.transactionId || transaction._id || `TXN-${index}`}</TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.type}
                          color={transaction.type === 'CREDIT' || transaction.type === 'credit' ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        ₹{transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.status}
                          color={
                            transaction.status === 'SUCCESS' || transaction.status === 'completed'
                              ? 'success'
                              : transaction.status === 'PENDING' || transaction.status === 'pending'
                              ? 'warning'
                              : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!transactions || transactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No transactions yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Transactions; 