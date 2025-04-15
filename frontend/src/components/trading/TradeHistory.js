import React from 'react';
import { useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
} from '@mui/material';

const TradeHistory = () => {
  const { tradeHistory } = useSelector((state) => state.trading);

  if (!tradeHistory || tradeHistory.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No trades yet
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date & Time</TableCell>
            <TableCell>Symbol</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Order Type</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">Total Value</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tradeHistory.map((trade) => (
            <TableRow key={trade._id || trade.createdAt}>
              <TableCell>
                {new Date(trade.createdAt || trade.executedAt || Date.now()).toLocaleString()}
              </TableCell>
              <TableCell>
                {typeof trade.stock === 'object' && trade.stock?.symbol 
                  ? trade.stock.symbol 
                  : trade.symbol || 'Unknown'}
              </TableCell>
              <TableCell>
                <Chip
                  label={trade.type}
                  color={trade.type === 'BUY' ? 'success' : 'error'}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>{trade.orderType}</TableCell>
              <TableCell align="right">{trade.quantity}</TableCell>
              <TableCell align="right">₹{(trade.price || 0).toFixed(2)}</TableCell>
              <TableCell align="right">₹{(trade.totalAmount || 0).toFixed(2)}</TableCell>
              <TableCell>
                <Chip
                  label={trade.status}
                  color={
                    trade.status === 'COMPLETED' || trade.status === 'EXECUTED' 
                      ? 'success' 
                      : trade.status === 'PENDING' 
                        ? 'warning'
                        : 'error'
                  }
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TradeHistory;