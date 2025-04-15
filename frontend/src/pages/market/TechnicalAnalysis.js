import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  Tabs,
  Tab,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import TechnicalIndicator from '../../components/charts/TechnicalIndicator';
import PriceChart from '../../components/charts/PriceChart';
import { fetchNSEStocks, fetchBSEStocks } from '../../features/market/marketSlice';

const TechnicalAnalysis = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [selectedSymbol, setSelectedSymbol] = useState(symbol || '');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [indicators, setIndicators] = useState([
    { id: 1, type: 'rsi', params: {} },
    { id: 2, type: 'macd', params: {} }
  ]);
  const [nextIndicatorId, setNextIndicatorId] = useState(3);
  const [activeTab, setActiveTab] = useState(0);
  const [availableStocks, setAvailableStocks] = useState([]);

  const { nseStocks, bseStocks } = useSelector(state => state.market);

  // Redirect to market page if accessed without a symbol parameter
  useEffect(() => {
    if (!symbol && window.location.pathname === '/app/technical-analysis') {
      // Only redirect if we're on the base technical-analysis route without a symbol
      navigate('/app/market');
    }
  }, [symbol, navigate]);

  useEffect(() => {
    // Fetch stock data if not already loaded
    if (!nseStocks.length) {
      dispatch(fetchNSEStocks());
    }
    if (!bseStocks.length) {
      dispatch(fetchBSEStocks());
    }
  }, [dispatch, nseStocks.length, bseStocks.length]);

  // Update stocks list based on active tab
  useEffect(() => {
    if (activeTab === 0 && nseStocks.length) {
      setAvailableStocks(nseStocks);
    } else if (activeTab === 1 && bseStocks.length) {
      setAvailableStocks(bseStocks);
    }
  }, [activeTab, nseStocks, bseStocks]);

  // Update URL when symbol changes
  useEffect(() => {
    if (selectedSymbol && selectedSymbol !== symbol) {
      navigate(`/app/technical-analysis/${selectedSymbol}`);
    }
  }, [selectedSymbol, navigate, symbol]);

  // Set selected symbol from URL params
  useEffect(() => {
    if (symbol) {
      setSelectedSymbol(symbol);
    }
  }, [symbol]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAddIndicator = () => {
    setIndicators([
      ...indicators,
      { id: nextIndicatorId, type: 'ma', params: {} }
    ]);
    setNextIndicatorId(nextIndicatorId + 1);
  };

  const handleRemoveIndicator = (id) => {
    setIndicators(indicators.filter(indicator => indicator.id !== id));
  };

  const handleIndicatorTypeChange = (id, newType) => {
    setIndicators(indicators.map(indicator =>
      indicator.id === id ? { ...indicator, type: newType } : indicator
    ));
  };

  const handleStockSelect = (event, value) => {
    if (value) {
      setSelectedSymbol(value.symbol);
    }
  };

  // Filter stocks based on search query
  const filteredStocks = stockSearchQuery.length > 1
    ? availableStocks.filter(stock =>
        stock.symbol.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(stockSearchQuery.toLowerCase())
      ).slice(0, 10)
    : [];

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 600 }}>
          Technical Analysis
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Autocomplete
                    value={availableStocks.find(s => s.symbol === selectedSymbol) || null}
                    onChange={handleStockSelect}
                    inputValue={stockSearchQuery}
                    onInputChange={(event, newInputValue) => {
                      setStockSearchQuery(newInputValue);
                    }}
                    options={filteredStocks}
                    getOptionLabel={(option) => `${option.symbol} - ${option.name}`}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search for a stock"
                        fullWidth
                        variant="outlined"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    indicatorColor="primary"
                    textColor="primary"
                  >
                    <Tab label="NSE" />
                    <Tab label="BSE" />
                  </Tabs>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Price Chart */}
          {selectedSymbol && (
            <Grid item xs={12}>
              <PriceChart
                symbol={selectedSymbol}
                exchange={activeTab === 0 ? 'NSE' : 'BSE'}
              />
            </Grid>
          )}

          {/* Technical Indicators */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Technical Indicators
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddIndicator}
              >
                Add Indicator
              </Button>
            </Box>

            {selectedSymbol ? (
              indicators.map(indicator => (
                <Box key={indicator.id} sx={{ position: 'relative', mb: 2 }}>
                  <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 120, mr: 1 }}>
                      <Select
                        value={indicator.type}
                        onChange={(e) => handleIndicatorTypeChange(indicator.id, e.target.value)}
                        displayEmpty
                        variant="outlined"
                      >
                        <MenuItem value="rsi">RSI</MenuItem>
                        <MenuItem value="macd">MACD</MenuItem>
                        <MenuItem value="bollinger">Bollinger Bands</MenuItem>
                        <MenuItem value="ma">Moving Average</MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveIndicator(indicator.id)}
                      sx={{ bgcolor: 'rgba(255,255,255,0.8)' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <TechnicalIndicator
                    symbol={selectedSymbol}
                    indicatorType={indicator.type}
                    defaultParams={indicator.params}
                  />
                </Box>
              ))
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  Select a stock to view technical indicators
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default TechnicalAnalysis;