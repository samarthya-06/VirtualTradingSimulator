import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Tabs,
  Tab,
  Alert,
  TextField,
  Autocomplete,
  CircularProgress,
  Button,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useLocation, useNavigate } from 'react-router-dom';
import OrderForm from '../../components/trading/OrderForm';
import StockInfo from '../../components/trading/StockInfo';
// Removed TradeHistory import
import { getPortfolio, getTradeHistory } from '../../features/trading/tradingSlice';
import {
  searchStocks,
  subscribeToStocks,
  unsubscribeFromStocks,
  fetchNSEStocks,
  fetchBSEStocks,
  initializeWebSocket
} from '../../features/market/marketSlice';

const Trading = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedStock, setSelectedStock] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { portfolio, isLoading: portfolioLoading, isError, message } = useSelector(
    (state) => state.trading
  );

  const {
    searchResults,
    nseStocks,
    bseStocks,
    isLoading: marketLoading,
    error: marketError
  } = useSelector((state) => state.market);

  // Initialize WebSocket connection and handle authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { state: { from: location } });
      return;
    }
    dispatch(initializeWebSocket());
  }, [dispatch, navigate, location]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    // Get initial data
    dispatch(getPortfolio());
    dispatch(getTradeHistory());

    // Fetch stock listings from both exchanges
    dispatch(fetchNSEStocks());
    dispatch(fetchBSEStocks());

    // Get stock symbol and type from URL if present
    const params = new URLSearchParams(location.search);
    const symbol = params.get('symbol');
    const orderType = params.get('type') || 'MARKET';

    // Check URL first, then localStorage for selected stock
    let stockToSelect = symbol;
    if (!stockToSelect) {
      try {
        stockToSelect = localStorage.getItem('selectedStock');
      } catch (err) {
        console.error('Error reading from localStorage:', err);
      }
    }

    if (stockToSelect) {
      setSelectedStock(stockToSelect);
      dispatch(subscribeToStocks([stockToSelect]));

      // Update the URL if we got the stock from localStorage
      if (!symbol && stockToSelect) {
        const newParams = new URLSearchParams(location.search);
        newParams.set('symbol', stockToSelect);
        navigate({
          pathname: location.pathname,
          search: newParams.toString()
        }, { replace: true });
      }
    }

    // Set active tab based on order type from URL
    setActiveTab(orderType === 'MARKET' ? 0 : 1);

    // Cleanup function
    return () => {
      if (selectedStock) {
        dispatch(unsubscribeFromStocks([selectedStock]));
      }
    };
  }, [dispatch, location, navigate]);

  // Handle stock search
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('No authentication token found');
          }
          await dispatch(searchStocks(searchQuery)).unwrap();
        } catch (error) {
          console.error('Search failed:', error);
          if (error.message && error.message.includes('token')) {
            navigate('/login', { state: { from: location } });
          }
        } finally {
          setIsSearching(false);
        }
      }
    }, 400); // Reduced for faster response

    return () => clearTimeout(searchTimer);
  }, [searchQuery, dispatch, navigate, location]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleStockSelect = (event, stock) => {
    if (!stock) return;

    try {
      // Unsubscribe from previous stock if any
      if (selectedStock) {
        dispatch(unsubscribeFromStocks([selectedStock]));
      }

      const newSymbol = stock.symbol;
      setSelectedStock(newSymbol);
      dispatch(subscribeToStocks([newSymbol]));

      // Save to localStorage for persistence
      localStorage.setItem('selectedStock', newSymbol);

      // Update URL with selected stock and maintain the order type
      const searchParams = new URLSearchParams(location.search);
      const currentType = searchParams.get('type') || 'MARKET';

      searchParams.set('symbol', newSymbol);
      searchParams.set('type', currentType);

      navigate({
        pathname: location.pathname,
        search: searchParams.toString()
      });
    } catch (error) {
      console.error('Error selecting stock:', error);
    }
  };

  const handleRetry = () => {
    dispatch(getPortfolio());
    dispatch(getTradeHistory());
    dispatch(fetchNSEStocks());
    dispatch(fetchBSEStocks());
  };

  // Combine search results with NSE and BSE stocks data for more comprehensive search
  const getStockOptions = () => {
    // Start with direct search results
    let options = [...searchResults];

    // If search query length is 2 or more, filter NSE and BSE stocks that match
    if (searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase();

      // Add matching NSE stocks
      const matchingNSE = nseStocks.filter(stock =>
        (stock.symbol && stock.symbol.toLowerCase().includes(query)) ||
        (stock.name && stock.name.toLowerCase().includes(query))
      );

      // Add matching BSE stocks
      const matchingBSE = bseStocks.filter(stock =>
        (stock.symbol && stock.symbol.toLowerCase().includes(query)) ||
        (stock.name && stock.name.toLowerCase().includes(query))
      );

      // Combine and deduplicate (by symbol)
      const allStocks = [...options, ...matchingNSE, ...matchingBSE];
      const uniqueStocks = [];
      const symbols = new Set();

      allStocks.forEach(stock => {
        if (!symbols.has(stock.symbol)) {
          symbols.add(stock.symbol);
          uniqueStocks.push(stock);
        }
      });

      options = uniqueStocks;
    }

    return options;
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 600 }}>
          Trading
        </Typography>

        {isError && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={handleRetry}>
                RETRY
              </Button>
            }
          >
            {message || 'Failed to fetch portfolio. Please try again.'}
          </Alert>
        )}

        {marketError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {marketError}
          </Alert>
        )}

        {/* Enhanced Stock Search */}
        <Box sx={{ mb: 3 }}>
          <Autocomplete
            fullWidth
            options={getStockOptions()}
            getOptionLabel={(option) => `${option.name || option.shortname || option.longname || option.symbol} (${option.symbol})`}
            loading={isSearching}
            onInputChange={(event, value) => setSearchQuery(value)}
            onChange={handleStockSelect}
            groupBy={(option) => option.exchange || 'Other'}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Indian Stocks (NSE/BSE)"
                variant="outlined"
                placeholder="Search by company name or symbol..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <>
                      {isSearching ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Box>

        <Grid container spacing={3}>
          {/* Left Section: Stock Info and Chart */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <StockInfo symbol={selectedStock} />
              </CardContent>
            </Card>
          </Grid>

          {/* Right Section: Order Form */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab label="Market Order" />
                    <Tab label="Limit Order" />
                  </Tabs>
                </Box>
                <OrderForm
                  symbol={selectedStock}
                  type={activeTab === 0 ? 'MARKET' : 'LIMIT'}
                  portfolio={portfolio}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Removed Bottom Section: Trade History */}
        </Grid>
      </Box>
    </Container>
  );
};

export default Trading;