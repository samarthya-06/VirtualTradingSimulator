import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Slider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  FilterList,
  Search,
  TrendingUp,
  TrendingDown,
  Delete,
  BarChart,
  Timeline,
  Info,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const sectors = [
  'All Sectors',
  'Information Technology',
  'Banking',
  'Healthcare',
  'Energy',
  'Consumer Goods',
  'Automobile',
  'Telecommunications',
  'Metal',
  'Pharmaceuticals',
  'Oil & Gas',
  'Real Estate',
];

const priceRanges = [
  { value: [0, 100], label: '₹0 - ₹100' },
  { value: [100, 500], label: '₹100 - ₹500' },
  { value: [500, 1000], label: '₹500 - ₹1000' },
  { value: [1000, 5000], label: '₹1000 - ₹5000' },
  { value: [5000, 999999], label: '₹5000+' },
];

const marketCaps = [
  { value: 'small', label: 'Small Cap (< ₹5,000 Cr)' },
  { value: 'mid', label: 'Mid Cap (₹5,000 - ₹20,000 Cr)' },
  { value: 'large', label: 'Large Cap (> ₹20,000 Cr)' },
];

const technicalIndicators = [
  { value: 'rsi_oversold', label: 'RSI Oversold (< 30)' },
  { value: 'rsi_overbought', label: 'RSI Overbought (> 70)' },
  { value: 'macd_bullish', label: 'MACD Bullish Crossover' },
  { value: 'macd_bearish', label: 'MACD Bearish Crossover' },
  { value: 'above_200_ma', label: 'Price Above 200-Day MA' },
  { value: 'below_200_ma', label: 'Price Below 200-Day MA' },
];

// Add a utility function to find a matching price range or default to the last one
const findMatchingPriceRange = (currentRange) => {
  // Find exact match
  const exactMatch = priceRanges.find(range => 
    range.value[0] === currentRange[0] && range.value[1] === currentRange[1]
  );
  
  if (exactMatch) {
    return exactMatch.value;
  }
  
  // If no exact match, return the last range (₹5000+)
  return priceRanges[priceRanges.length - 1].value;
};

// Add debounce utility function
// eslint-disable-next-line no-unused-vars
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Mock data for development
const allMockStocks = [
  {
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries',
    price: 2456.75,
    change: 1.23,
    marketCap: 'large',
    marketCapValue: '16,75,000 Cr',
    sector: 'Oil & Gas',
    pe: 28.5,
    dividendYield: 0.4,
  },
  {
    symbol: 'TCS.NS',
    name: 'Tata Consultancy Services',
    price: 3567.80,
    change: -0.45,
    marketCap: 'large',
    marketCapValue: '12,98,000 Cr',
    sector: 'Information Technology',
    pe: 35.2,
    dividendYield: 1.2,
  },
  {
    symbol: 'HDFCBANK.NS',
    name: 'HDFC Bank',
    price: 1678.50,
    change: 0.75,
    marketCap: 'large',
    marketCapValue: '9,34,000 Cr',
    sector: 'Banking',
    pe: 22.8,
    dividendYield: 0.8,
  },
  {
    symbol: 'INFY.NS',
    name: 'Infosys',
    price: 1456.35,
    change: -1.05,
    marketCap: 'large',
    marketCapValue: '6,12,000 Cr',
    sector: 'Information Technology',
    pe: 29.1,
    dividendYield: 2.5,
  },
  {
    symbol: 'SUNPHARMA.NS',
    name: 'Sun Pharmaceutical',
    price: 1025.60,
    change: 2.15,
    marketCap: 'mid',
    marketCapValue: '2,45,000 Cr',
    sector: 'Pharmaceuticals',
    pe: 33.7,
    dividendYield: 0.6,
  },
  {
    symbol: 'BHARTIARTL.NS',
    name: 'Bharti Airtel',
    price: 783.25,
    change: 1.55,
    marketCap: 'large',
    marketCapValue: '4,38,000 Cr',
    sector: 'Telecommunications',
    pe: 41.2,
    dividendYield: 0.3,
  },
  {
    symbol: 'SBIN.NS',
    name: 'State Bank of India',
    price: 542.90,
    change: 0.65,
    marketCap: 'large',
    marketCapValue: '4,84,000 Cr',
    sector: 'Banking',
    pe: 10.3,
    dividendYield: 2.8,
  },
  {
    symbol: 'TITAN.NS',
    name: 'Titan Company',
    price: 2356.40,
    change: -0.25,
    marketCap: 'large',
    marketCapValue: '2,09,000 Cr',
    sector: 'Consumer Goods',
    pe: 75.3,
    dividendYield: 0.4,
  },
  {
    symbol: 'ADANIPORTS.NS',
    name: 'Adani Ports & SEZ',
    price: 752.65,
    change: -1.85,
    marketCap: 'mid',
    marketCapValue: '1,53,000 Cr',
    sector: 'Shipping',
    pe: 27.9,
    dividendYield: 0.7,
  },
  {
    symbol: 'ASIANPAINT.NS',
    name: 'Asian Paints',
    price: 3124.50,
    change: 0.35,
    marketCap: 'large',
    marketCapValue: '2,99,000 Cr',
    sector: 'Consumer Goods',
    pe: 82.4,
    dividendYield: 0.9,
  },
  {
    symbol: 'MARUTI.NS',
    name: 'Maruti Suzuki',
    price: 9456.30,
    change: 1.05,
    marketCap: 'large',
    marketCapValue: '2,85,000 Cr',
    sector: 'Automobile',
    pe: 32.1,
    dividendYield: 0.5,
  },
  {
    symbol: 'TATASTEEL.NS',
    name: 'Tata Steel',
    price: 124.75,
    change: -2.15,
    marketCap: 'mid',
    marketCapValue: '1,52,000 Cr',
    sector: 'Metal',
    pe: 6.3,
    dividendYield: 3.2,
  },
  {
    symbol: 'CIPLA.NS',
    name: 'Cipla',
    price: 892.35,
    change: 0.95,
    marketCap: 'mid',
    marketCapValue: '72,000 Cr',
    sector: 'Pharmaceuticals',
    pe: 28.7,
    dividendYield: 1.5,
  },
  {
    symbol: 'HCLTECH.NS',
    name: 'HCL Technologies',
    price: 1064.50,
    change: -0.75,
    marketCap: 'large',
    marketCapValue: '2,89,000 Cr',
    sector: 'Information Technology',
    pe: 22.5,
    dividendYield: 3.8,
  },
  {
    symbol: 'TATAMOTORS.NS',
    name: 'Tata Motors',
    price: 632.40,
    change: 3.25,
    marketCap: 'large',
    marketCapValue: '2,10,000 Cr',
    sector: 'Automobile',
    pe: 45.7,
    dividendYield: 0.0,
  },
];

const StockScreener = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});
  const [totalResults, setTotalResults] = useState(0);
  const [searchParams, setSearchParams] = useState({});
  const [debouncedSearchParams, setDebouncedSearchParams] = useState({});

  // Filter states
  const [sector, setSector] = useState('All Sectors');
  const [priceRange, setPriceRange] = useState(findMatchingPriceRange([0, 999999]));
  const [customPriceRange, setCustomPriceRange] = useState([0, 999999]);
  const [marketCap, setMarketCap] = useState('');
  const [technicalFilter, setTechnicalFilter] = useState('');
  const [peRatio, setPeRatio] = useState([0, 100]);
  const [dividend, setDividend] = useState(0);
  
  // Define executeSearch before it's used in useEffect
  const executeSearch = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Mock implementation using allMockStocks
      // In a real implementation, you'd call your API here
      // const response = await axios.get('/api/stock-screener', { params: debouncedSearchParams });
      
      // Apply actual filtering logic (same as before)
      let filteredResults = [...allMockStocks];

      // Filter by sector
      if (activeFilters.sector) {
        filteredResults = filteredResults.filter(stock => 
          stock.sector === activeFilters.sector
        );
      }

      // Filter by price
      if (activeFilters.minPrice !== undefined || activeFilters.maxPrice !== undefined) {
        filteredResults = filteredResults.filter(stock => 
          (activeFilters.minPrice === undefined || stock.price >= activeFilters.minPrice) && 
          (activeFilters.maxPrice === undefined || stock.price <= activeFilters.maxPrice)
        );
      }

      // Filter by market cap
      if (activeFilters.marketCap) {
        filteredResults = filteredResults.filter(stock => 
          stock.marketCap === activeFilters.marketCap
        );
      }

      // Filter by PE ratio
      if (activeFilters.minPE !== undefined || activeFilters.maxPE !== undefined) {
        filteredResults = filteredResults.filter(stock => 
          (activeFilters.minPE === undefined || stock.pe >= activeFilters.minPE) && 
          (activeFilters.maxPE === undefined || stock.pe <= activeFilters.maxPE)
        );
      }

      // Filter by dividend yield
      if (activeFilters.minDividendYield !== undefined) {
        filteredResults = filteredResults.filter(stock => 
          stock.dividendYield >= activeFilters.minDividendYield
        );
      }

      // Apply technical indicators 
      if (activeFilters.technicalIndicator) {
        // Mock implementation - in real app, these would be calculated values
        const technicalFilterMap = {
          'rsi_oversold': stock => stock.symbol.includes('TATA') || stock.symbol.includes('HCL'),
          'rsi_overbought': stock => stock.change > 2.0,
          'macd_bullish': stock => stock.change > 0,
          'macd_bearish': stock => stock.change < 0,
          'above_200_ma': stock => stock.price > 1000,
          'below_200_ma': stock => stock.price < 1000
        };
        
        if (technicalFilterMap[activeFilters.technicalIndicator]) {
          filteredResults = filteredResults.filter(technicalFilterMap[activeFilters.technicalIndicator]);
        }
      }

      setResults(filteredResults);
      setTotalResults(filteredResults.length);
    } catch (error) {
      console.error('Error fetching stock screener results:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilters]);

  // Apply debounce to the search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchParams(searchParams);
    }, 500); // 500ms debounce time
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchParams]);

  // When debounced params change, trigger search
  useEffect(() => {
    if (Object.keys(debouncedSearchParams).length > 0) {
      executeSearch();
    }
  }, [debouncedSearchParams, executeSearch]);

  const handleSearch = () => {
    // Validate price range before building filters
    const validatedPriceRange = findMatchingPriceRange(priceRange);
    if (JSON.stringify(validatedPriceRange) !== JSON.stringify(priceRange)) {
      setPriceRange(validatedPriceRange);
      setCustomPriceRange(validatedPriceRange);
    }

    // Build filters object
    const filters = {};

    if (sector !== 'All Sectors') {
      filters.sector = sector;
    }

    if (validatedPriceRange[0] !== 0 || validatedPriceRange[1] !== 999999) {
      filters.minPrice = validatedPriceRange[0];
      filters.maxPrice = validatedPriceRange[1];
    }

    if (marketCap) {
      filters.marketCap = marketCap;
    }

    if (technicalFilter) {
      filters.technicalIndicator = technicalFilter;
    }

    if (peRatio[0] !== 0 || peRatio[1] !== 100) {
      filters.minPE = peRatio[0];
      filters.maxPE = peRatio[1];
    }

    if (dividend > 0) {
      filters.minDividendYield = dividend;
    }

    // Save active filters for display and search
    setActiveFilters(filters);
    setSearchParams(filters); // This will trigger the debounced search
  };

  const handleReset = () => {
    setSector('All Sectors');
    setPriceRange(findMatchingPriceRange([0, 999999]));
    setCustomPriceRange([0, 999999]);
    setMarketCap('');
    setTechnicalFilter('');
    setPeRatio([0, 100]);
    setDividend(0);
    setActiveFilters({});
    setResults([]);
    setTotalResults(0);
  };

  const handleViewStock = (symbol) => {
    navigate(`/app/technical-analysis/${symbol}`);
  };

  const handleTechnicalAnalysis = (symbol) => {
    navigate(`/app/technical-analysis/${symbol}`);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(price);
  };

  const removeFilter = (filterKey) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterKey];
    setActiveFilters(newFilters);

    // Reset the corresponding filter state
    switch (filterKey) {
      case 'sector':
        setSector('All Sectors');
        break;
      case 'minPrice':
      case 'maxPrice':
        setPriceRange(findMatchingPriceRange([0, 999999]));
        setCustomPriceRange([0, 999999]);
        break;
      case 'marketCap':
        setMarketCap('');
        break;
      case 'technicalIndicator':
        setTechnicalFilter('');
        break;
      case 'minPE':
      case 'maxPE':
        setPeRatio([0, 100]);
        break;
      case 'minDividendYield':
        setDividend(0);
        break;
      default:
        break;
    }

    // Update search params to trigger a search with the updated filters
    setSearchParams(newFilters);
  };

  const renderActiveFilters = () => {
    if (Object.keys(activeFilters).length === 0) {
      return null;
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Active Filters:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(activeFilters).map(([key, value]) => {
            let label = `${key}: ${value}`;

            // Format filter labels for better readability
            if (key === 'sector') {
              label = `Sector: ${value}`;
            } else if (key === 'minPrice') {
              label = `Min Price: ₹${value}`;
            } else if (key === 'maxPrice') {
              label = `Max Price: ₹${value}`;
            } else if (key === 'marketCap') {
              const capLabel = marketCaps.find(cap => cap.value === value)?.label || value;
              label = `Market Cap: ${capLabel}`;
            } else if (key === 'technicalIndicator') {
              const indicatorLabel = technicalIndicators.find(ind => ind.value === value)?.label || value;
              label = indicatorLabel;
            } else if (key === 'minPE') {
              label = `Min P/E: ${value}`;
            } else if (key === 'maxPE') {
              label = `Max P/E: ${value}`;
            } else if (key === 'minDividendYield') {
              label = `Min Dividend: ${value}%`;
            }

            return (
              <Chip
                key={key}
                label={label}
                onDelete={() => removeFilter(key)}
                color="primary"
                variant="outlined"
              />
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Stock Screener
      </Typography>

      <Grid container spacing={3}>
        {/* Filter Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <FilterList sx={{ mr: 1 }} />
                Filters
              </Typography>

              <Box sx={{ mt: 2 }}>
                <TextField
                  select
                  fullWidth
                  id="sector-select"
                  name="sector"
                  label="Sector"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  margin="normal"
                  variant="outlined"
                >
                  {sectors.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>

                <Box sx={{ mt: 3, mb: 2 }}>
                  <Typography id="price-range-label" gutterBottom>Price Range</Typography>
                  <TextField
                    select
                    fullWidth
                    id="price-range-select"
                    name="priceRange"
                    aria-labelledby="price-range-label"
                    value={JSON.stringify(priceRange)}
                    onChange={(e) => {
                      const range = JSON.parse(e.target.value);
                      setPriceRange(range);
                      setCustomPriceRange(range);
                    }}
                    margin="normal"
                    variant="outlined"
                  >
                    {priceRanges.map((option) => (
                      <MenuItem key={option.label} value={JSON.stringify(option.value)}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
                    <Grid item xs={5}>
                      <TextField
                        label="Min"
                        id="min-price"
                        name="minPrice"
                        type="number"
                        value={customPriceRange[0]}
                        onChange={(e) => setCustomPriceRange([Number(e.target.value), customPriceRange[1]])}
                        fullWidth
                        InputProps={{
                          startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography>,
                        }}
                      />
                    </Grid>
                    <Grid item xs={2} sx={{ textAlign: 'center' }}>
                      <Typography>to</Typography>
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        label="Max"
                        id="max-price"
                        name="maxPrice"
                        type="number"
                        value={customPriceRange[1] === 999999 ? '' : customPriceRange[1]}
                        onChange={(e) => setCustomPriceRange([customPriceRange[0], Number(e.target.value) || 999999])}
                        fullWidth
                        InputProps={{
                          startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography>,
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => {
                      // Apply custom range by finding a matching predefined range
                      const validatedRange = findMatchingPriceRange(customPriceRange);
                      setPriceRange(validatedRange);
                      setCustomPriceRange(validatedRange);
                    }}
                  >
                    Apply Custom Range
                  </Button>
                </Box>

                <TextField
                  select
                  fullWidth
                  id="market-cap-select"
                  name="marketCap"
                  label="Market Capitalization"
                  value={marketCap}
                  onChange={(e) => setMarketCap(e.target.value)}
                  margin="normal"
                  variant="outlined"
                >
                  <MenuItem value="">Any Market Cap</MenuItem>
                  {marketCaps.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  id="technical-indicator"
                  name="technicalIndicator"
                  label="Technical Indicators"
                  value={technicalFilter}
                  onChange={(e) => setTechnicalFilter(e.target.value)}
                  margin="normal"
                  variant="outlined"
                >
                  <MenuItem value="">Any Technical Pattern</MenuItem>
                  {technicalIndicators.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <Box sx={{ mt: 3, mb: 1 }}>
                  <Typography id="pe-ratio-label" gutterBottom>P/E Ratio Range</Typography>
                  <Slider
                    value={peRatio}
                    onChange={(_, newValue) => setPeRatio(newValue)}
                    valueLabelDisplay="auto"
                    min={0}
                    max={100}
                    step={1}
                    aria-labelledby="pe-ratio-label"
                    name="peRatio"
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">0</Typography>
                    <Typography variant="caption">50</Typography>
                    <Typography variant="caption">100+</Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography id="dividend-yield-label" gutterBottom>Minimum Dividend Yield (%)</Typography>
                  <Slider
                    value={dividend}
                    onChange={(_, newValue) => setDividend(newValue)}
                    valueLabelDisplay="auto"
                    min={0}
                    max={10}
                    step={0.5}
                    aria-labelledby="dividend-yield-label"
                    name="dividendYield"
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">0%</Typography>
                    <Typography variant="caption">5%</Typography>
                    <Typography variant="caption">10%+</Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSearch}
                    startIcon={<Search />}
                    fullWidth
                  >
                    Search
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleReset}
                    startIcon={<Delete />}
                  >
                    Reset
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Results Card */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BarChart sx={{ mr: 1 }} />
                  Results
                  {totalResults > 0 && (
                    <Chip
                      label={`${totalResults} stocks`}
                      size="small"
                      color="primary"
                      sx={{ ml: 2 }}
                    />
                  )}
                </Box>
              </Typography>

              {renderActiveFilters()}

              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                  <CircularProgress />
                </Box>
              ) : results.length > 0 ? (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Symbol</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Change</TableCell>
                        <TableCell>Sector</TableCell>
                        <TableCell>Market Cap</TableCell>
                        <TableCell>P/E</TableCell>
                        <TableCell>Div Yield</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.map((stock) => (
                        <TableRow key={stock.symbol} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography variant="body2" fontWeight="bold">{stock.symbol.split('.')[0]}</Typography>
                              <Typography variant="caption" color="text.secondary">{stock.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{formatPrice(stock.price)}</TableCell>
                          <TableCell sx={{ color: stock.change >= 0 ? 'success.main' : 'error.main' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {stock.change >= 0 ? <TrendingUp fontSize="small" sx={{ mr: 0.5 }} /> : <TrendingDown fontSize="small" sx={{ mr: 0.5 }} />}
                              {stock.change >= 0 ? '+' : ''}{stock.change}%
                            </Box>
                          </TableCell>
                          <TableCell>{stock.sector}</TableCell>
                          <TableCell>{stock.marketCapValue}</TableCell>
                          <TableCell>{stock.pe.toFixed(1)}</TableCell>
                          <TableCell>{stock.dividendYield}%</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex' }}>
                              <IconButton size="small" onClick={() => handleViewStock(stock.symbol.split('.')[0])}>
                                <Info fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleTechnicalAnalysis(stock.symbol.split('.')[0])}>
                                <Timeline fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
                  <Typography variant="body1" color="text.secondary" align="center">
                    {Object.keys(activeFilters).length > 0
                      ? "No stocks match your criteria. Try adjusting your filters."
                      : "Use the filters to find stocks that match your investment criteria."}
                  </Typography>
                  {Object.keys(activeFilters).length > 0 && (
                    <Button
                      variant="outlined"
                      sx={{ mt: 2 }}
                      onClick={handleReset}
                    >
                      Reset All Filters
                    </Button>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StockScreener;