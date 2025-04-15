import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
  Alert,
} from '@mui/material';
import { 
  Delete, 
  TrendingUp, 
  TrendingDown, 
  Refresh as RefreshIcon,
  Info as InfoIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getWatchlist, removeFromWatchlist } from '../../features/watchlist/watchlistSlice';

const Watchlist = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { watchlist, isLoading, isError, message } = useSelector((state) => state.watchlist);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchWatchlistData = () => {
    return dispatch(getWatchlist())
      .unwrap()
      .then(() => {
        setLastUpdated(new Date());
      })
      .catch(err => {
        console.error('Error fetching watchlist:', err);
      });
  };

  useEffect(() => {
    fetchWatchlistData();
    
    // Set up an interval to refresh watchlist data every minute
    const intervalId = setInterval(() => {
      fetchWatchlistData();
    }, 60000); // 60000 ms = 1 minute
    
    return () => clearInterval(intervalId); // Clean up on unmount
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchWatchlistData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemove = (symbol) => {
    dispatch(removeFromWatchlist(symbol));
  };

  const handleTrade = (symbol) => {
    // Store the selected stock in localStorage for persistence
    try {
      localStorage.setItem('selectedStock', symbol);
    } catch (err) {
      console.error('Error saving selected stock:', err);
    }
    // Navigate to the trading page with the stock symbol as a query parameter
    navigate(`/app/trading?symbol=${encodeURIComponent(symbol)}`);
  };

  const formatChangePercent = (change) => {
    if (change === undefined || change === null) return '0.00%';
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  if (isLoading && !refreshing) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" fontWeight="600">
            Watchlist
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
            <Tooltip title="Refresh watchlist data">
              <IconButton 
                onClick={handleRefresh} 
                disabled={refreshing}
                color="primary"
              >
                {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Market prices may be delayed. If the market is closed, prices won't change until it reopens.">
              <IconButton color="info">
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {isError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {message || 'An error occurred while loading your watchlist.'}
          </Alert>
        )}

        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell align="right">Day Range</TableCell>
                    <TableCell align="right">Volume</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {watchlist.map((stock) => (
                    <TableRow key={stock.symbol} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {stock.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell>{stock.name}</TableCell>
                      <TableCell align="right">₹{stock.price.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Chip
                          icon={stock.change >= 0 ? <TrendingUp /> : <TrendingDown />}
                          label={formatChangePercent(stock.change)}
                          color={stock.change > 0 ? 'success' : stock.change < 0 ? 'error' : 'default'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {stock.dayLow && stock.dayHigh ? 
                          `₹${stock.dayLow.toFixed(2)} - ₹${stock.dayHigh.toFixed(2)}` : 
                          'N/A'}
                      </TableCell>
                      <TableCell align="right">
                        {stock.volume.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleTrade(stock.symbol)}
                            color="primary"
                          >
                            Trade
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemove(stock.symbol)}
                            aria-label="Remove from watchlist"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {watchlist.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          Your watchlist is empty. Add stocks from the Market page!
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

export default Watchlist;