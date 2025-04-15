import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Grid,
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
  Paper,
  // CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  fetchMarketIndices,
  fetchNSEStocks,
  fetchBSEStocks,
  searchStocks,
  clearSearchResults
} from '../../features/market/marketSlice';
import { debounce } from 'lodash';
import websocketService from '../../app/websocket'; // Import the websocket service

const Market = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    indices,
    nseStocks,
    bseStocks,
    searchResults = [],
    lastUpdated
  } = useSelector((state) => state.market);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Use a ref to track which symbols we're already subscribed to
  const subscribedSymbols = useRef(new Set());

  const [defaultIndices] = useState([
    {
      symbol: 'NIFTY50',
      name: 'NIFTY 50',
      price: 22345.60,
      change: 167.59,
      changePercent: 0.75,
      volume: 123456789
    },
    {
      symbol: 'SENSEX',
      name: 'BSE SENSEX',
      price: 73456.25,
      change: -235.06,
      changePercent: -0.32,
      volume: 98765432
    }
  ]);

  // Debounced search function defined first
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.trim().length >= 2) {
        dispatch(searchStocks(query))
          .unwrap()
          .then(() => {
            setShowSearchResults(true);
          })
          .catch((err) => {
            setErrorMessage('Search failed: ' + (err.message || 'Unknown error'));
            setShowError(true);
          });
      } else {
        dispatch(clearSearchResults());
        setShowSearchResults(false);
      }
    }, 500),
    [dispatch]
  );

  // Define handleSearch after debouncedSearch
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  // Now useEffect can safely use handleSearch
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sector = params.get('sector');
    if (sector) {
      setSearchQuery(sector);
      handleSearch(sector);
    }
  }, [location.search, handleSearch]);

  const handleSearchInputChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleSearchResultClick = (stock) => {
    setShowSearchResults(false);
    navigate(`/app/technical-analysis/${stock.symbol}`);
  };

  const closeSearchResults = () => {
    setShowSearchResults(false);
  };

  const fetchMarketData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchMarketIndices()).unwrap(),
        dispatch(fetchNSEStocks()).unwrap(),
        dispatch(fetchBSEStocks()).unwrap()
      ]);
    } catch (error) {
      console.error('Error fetching market data:', error);
      setErrorMessage('Failed to load market data: ' + (error.message || 'Unknown error'));
      setShowError(true);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  // Wrap handleTrade in useCallback
  const handleTrade = useCallback((symbol) => {
    navigate(`/app/trading?symbol=${symbol}&type=MARKET`);
  }, [navigate]);

  // Wrap handleViewStockInfo in useCallback
  const handleViewStockInfo = useCallback((stock) => {
    navigate(`/app/technical-analysis/${stock.symbol}`);
  }, [navigate]);

  // Fix the useEffect for WebSocket subscription
  useEffect(() => {
    // Initial data fetch
    fetchMarketData();

    // Initialize WebSocket - do this only once at component mount
    const websocket = websocketService.initializeWebSocket();

    // Return cleanup function
    return () => {
      // No need to unsubscribe - the WebSocket service handles this on cleanup
      dispatch(clearSearchResults());
      // Don't disconnect the socket here, as it's now shared across components
    };
  }, [dispatch, fetchMarketData]); // Remove nseStocks and bseStocks to prevent re-subscriptions

  // Add a separate effect for subscribing to stocks that runs only when stock lists change
  useEffect(() => {
    // Skip if no stocks are available yet
    if (nseStocks.length === 0 && bseStocks.length === 0) return;

    console.log('Updating subscriptions based on visible stocks');
    const symbolsToSubscribe = [];

    // Add NSE stocks
    nseStocks.forEach(stock => {
      if (stock.symbol && !subscribedSymbols.current.has(stock.symbol)) {
        symbolsToSubscribe.push(stock.symbol);
        subscribedSymbols.current.add(stock.symbol);
      }
    });

    // Add BSE stocks
    bseStocks.forEach(stock => {
      if (stock.symbol && !subscribedSymbols.current.has(stock.symbol)) {
        symbolsToSubscribe.push(stock.symbol);
        subscribedSymbols.current.add(stock.symbol);
      }
    });

    // Subscribe to all symbols at once - but limit to avoid overwhelming the server
    const BATCH_SIZE = 5;
    for (let i = 0; i < symbolsToSubscribe.length; i += BATCH_SIZE) {
      const batch = symbolsToSubscribe.slice(i, i + BATCH_SIZE);
      setTimeout(() => {
        batch.forEach(symbol => {
          console.log(`Subscribing to: ${symbol}`);
          websocketService.subscribeToStock(symbol);
        });
      }, i * 300); // Stagger subscriptions with 300ms delay between batches
    }
  }, [nseStocks.length, bseStocks.length]); // Only depend on the array lengths to avoid frequent re-renders

  // Add an effect to show the last update time - use a ref to avoid infinite updates
  const lastUpdateTimeRef = useRef(lastUpdated);
  useEffect(() => {
    if (lastUpdated && lastUpdateTimeRef.current !== lastUpdated) {
      // Only update if actually changed
      lastUpdateTimeRef.current = lastUpdated;
      // Update the last refresh time when we get real-time updates
      setLastRefresh(new Date(lastUpdated));
    }
  }, [lastUpdated]);

  // Replace the manual refresh function with a more efficient one that
  // forces WebSocket to resend data for subscribed symbols
  const handleRefresh = () => {
    setRefreshing(true);

    // Force refresh of socket data
    websocketService.refreshStocks();

    // Also fetch any non-real-time data
    fetchMarketData().then(() => {
      setRefreshing(false);
      setLastRefresh(new Date());
    });
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  // Use default indices if no indices are available or if still loading
  const displayIndices = (indices && indices.length > 0) ? indices : defaultIndices;

  // Memoize the displayed stocks to reduce re-rendering
  const memoizedRenderNSEStocks = useCallback(() => {
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              NSE Stocks
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Typography>
          </Box>
          {/* Loading spinner removed */}
          {(
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell align="right">Volume</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {nseStocks.map((stock) => (
                    <TableRow
                      key={stock.symbol}
                      hover
                      onClick={() => handleViewStockInfo(stock)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{stock.symbol}</TableCell>
                      <TableCell>{stock.name}</TableCell>
                      <TableCell align="right">₹{stock.price?.toFixed(2)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: stock.changePercent >= 0 ? 'success.main' : 'error.main' }}
                      >
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                      </TableCell>
                      <TableCell align="right">{stock.volume?.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrade(stock.symbol);
                          }}
                        >
                          <TimelineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    );
  }, [nseStocks, refreshing, lastRefresh, handleViewStockInfo, handleTrade]);

  const memoizedRenderBSEStocks = useCallback(() => {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              BSE Stocks
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Typography>
          </Box>
          {/* Loading spinner removed */}
          {(
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell align="right">Volume</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bseStocks.map((stock) => (
                    <TableRow
                      key={stock.symbol}
                      hover
                      onClick={() => handleViewStockInfo(stock)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{stock.symbol}</TableCell>
                      <TableCell>{stock.name}</TableCell>
                      <TableCell align="right">₹{stock.price?.toFixed(2)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: stock.changePercent >= 0 ? 'success.main' : 'error.main',
                        }}
                      >
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                      </TableCell>
                      <TableCell align="right">
                        {stock.volume?.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrade(stock.symbol);
                          }}
                        >
                          <TimelineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    );
  }, [bseStocks, refreshing, lastRefresh, handleViewStockInfo, handleTrade]);

  // Render the indices section with real-time data
  const renderIndices = useCallback(() => {
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {displayIndices.slice(0, 2).map((index) => (
          <Grid item xs={12} md={6} key={index.symbol}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    {index.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {index.changePercent >= 0 ? (
                      <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} />
                    ) : (
                      <TrendingDown sx={{ color: 'error.main', mr: 0.5 }} />
                    )}
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color={index.changePercent >= 0 ? 'success.main' : 'error.main'}
                    >
                      {index.changePercent >= 0 ? '+' : ''}{index.changePercent?.toFixed(2)}%
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  ₹{index.price?.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last updated: {new Date(index.lastUpdated || lastUpdated || Date.now()).toLocaleTimeString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }, [displayIndices, lastUpdated]);

  // Render method - use the memoized components to reduce rendering overhead
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Market Overview
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{ mr: 2 }}
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
            <Box sx={{ position: 'relative', width: '300px' }}>
              <TextField
                fullWidth
                placeholder="Search stocks or mutual funds..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearchQuery('');
                          dispatch(clearSearchResults());
                          setShowSearchResults(false);
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
              />
              {showSearchResults && searchResults.length > 0 && (
                <Paper
                  sx={{
                    position: 'absolute',
                    width: '100%',
                    maxHeight: '400px',
                    overflow: 'auto',
                    mt: 0.5,
                    zIndex: 1000,
                    boxShadow: 3,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                    <IconButton size="small" onClick={closeSearchResults}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <List dense>
                    {searchResults.map((stock, index) => (
                      <React.Fragment key={`${stock.symbol}-${index}`}>
                        <ListItem
                          button
                          onClick={() => handleSearchResultClick(stock)}
                        >
                          <ListItemText
                            primary={`${stock.symbol} - ${stock.name}`}
                            secondary={`${stock.exchange} • ${stock.type || 'EQUITY'}`}
                          />
                          <Typography
                            variant="body2"
                            color={stock.changePercent >= 0 ? 'success.main' : 'error.main'}
                          >
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                          </Typography>
                        </ListItem>
                        {index < searchResults.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
          </Box>
        </Box>

        {/* Market indices */}
        {renderIndices()}

        {/* NSE Stocks */}
        {memoizedRenderNSEStocks()}

        {/* BSE Stocks */}
        {memoizedRenderBSEStocks()}

        {/* Error handling */}
        <Snackbar
          open={showError}
          autoHideDuration={6000}
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default React.memo(Market);