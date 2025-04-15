import React, { useEffect, useState } from 'react';
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
  Button,
  CircularProgress,
  Paper,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getPortfolio } from '../../features/trading/tradingSlice';
import { getWalletBalance } from '../../features/wallet/walletSlice';
import PerformanceChart from '../../components/portfolio/PerformanceChart';
import PerformanceMetrics from '../../components/portfolio/PerformanceMetrics';
import SectorBreakdown from '../../components/portfolio/SectorBreakdown';
import RiskAssessment from '../../components/portfolio/RiskAssessment';

const Portfolio = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { portfolio, isLoading: portfolioLoading, isError, message } = useSelector((state) => state.trading);
  const { virtualBalance = 0, isLoading: walletLoading } = useSelector((state) => state.wallet || {});
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [sortValue, setSortValue] = useState('valueDesc');
  const [showFilters, setShowFilters] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchPortfolioData();
    dispatch(getWalletBalance());

    // Set up interval to refresh portfolio data every 30 seconds when market is live
    const refreshInterval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const day = now.getDay();

      // Only refresh during market hours (9:15 AM to 3:30 PM, Monday to Friday)
      const isMarketHours = hours >= 9 && (hours < 15 || (hours === 15 && minutes <= 30));
      const isWeekday = day >= 1 && day <= 5;

      if (isMarketHours && isWeekday) {
        console.log('Auto-refreshing portfolio data during market hours');
        fetchPortfolioData(true); // Pass true to force refresh
      }
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [dispatch]);

  const fetchPortfolioData = (forceRefresh = false) => {
    try {
      // Add timestamp for cache busting if forceRefresh is true
      const options = forceRefresh ? { forceRefresh: true, timestamp: Date.now() } : {};

      dispatch(getPortfolio(options))
        .unwrap()
        .then((data) => {
          // Update last updated timestamp
          setLastUpdated(new Date());

          // Log portfolio data for debugging
          if (forceRefresh) {
            console.log('Portfolio refreshed with latest data:', data);
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to fetch portfolio data');
        });
    } catch (err) {
      setError('Failed to fetch portfolio data');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      console.log('Manually refreshing portfolio data');

      // Force refresh portfolio data
      fetchPortfolioData(true);
      await dispatch(getWalletBalance()).unwrap();

      // Add a small delay to ensure UI updates
      setTimeout(() => {
        console.log('Portfolio refresh completed');
        console.log('Current portfolio values:');
        console.log('Total Value:', calculateTotalValue());
        console.log('Total Investment:', calculateTotalInvestment());
        console.log('Profit/Loss:', calculateTotalProfitLoss());
        console.log('Profit/Loss %:', calculateProfitLossPercentage(calculateTotalProfitLoss(), calculateTotalInvestment()));
      }, 500);
    } catch (err) {
      console.error('Portfolio refresh error:', err);
      setError(err.message || 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const calculateTotalValue = () => {
    if (!portfolio || !portfolio.holdings) return 0;
    return portfolio.holdings.reduce((total, holding) => {
      return total + holding.currentValue;
    }, 0);
  };

  const calculateTotalInvestment = () => {
    if (!portfolio || !portfolio.holdings) return 0;
    return portfolio.holdings.reduce((total, holding) => {
      return total + (holding.averageBuyPrice * holding.quantity);
    }, 0);
  };

  const calculateTotalProfitLoss = () => {
    const totalValue = calculateTotalValue();
    const totalInvestment = calculateTotalInvestment();
    return totalValue - totalInvestment;
  };

  const calculateProfitLossPercentage = (profitLoss, investment) => {
    if (investment === 0) return 0;
    return (profitLoss / investment) * 100;
  };

  // Format currency in INR
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Function to check if the market is currently open
  const isMarketOpen = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();

    // Market hours: 9:15 AM to 3:30 PM, Monday to Friday
    const isMarketHours = hours >= 9 && (hours < 15 || (hours === 15 && minutes <= 30));
    const isWeekday = day >= 1 && day <= 5;

    return isMarketHours && isWeekday;
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterChange = (event) => {
    setFilterValue(event.target.value);
  };

  const handleSortChange = (event) => {
    setSortValue(event.target.value);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleTrade = (symbol) => {
    console.log(`Navigating to trading page for symbol: ${symbol}`);
    navigate(`/app/trading?symbol=${symbol}`);
  };

  const handleManageWallet = () => {
    console.log('Navigating to wallet page');
    navigate('/app/wallet');
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getFilteredHoldings = () => {
    if (!portfolio || !portfolio.holdings) return [];

    let filtered = [...portfolio.holdings];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (holding) =>
          holding.stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          holding.stock.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply profit/loss filter
    if (filterValue === 'profit') {
      filtered = filtered.filter((holding) => holding.profitLoss > 0);
    } else if (filterValue === 'loss') {
      filtered = filtered.filter((holding) => holding.profitLoss < 0);
    }

    // Apply sorting
    switch (sortValue) {
      case 'valueDesc':
        filtered.sort((a, b) => b.currentValue - a.currentValue);
        break;
      case 'valueAsc':
        filtered.sort((a, b) => a.currentValue - b.currentValue);
        break;
      case 'profitDesc':
        filtered.sort((a, b) => b.profitLoss - a.profitLoss);
        break;
      case 'profitAsc':
        filtered.sort((a, b) => a.profitLoss - b.profitLoss);
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.stock.symbol.localeCompare(b.stock.symbol));
        break;
      default:
        filtered.sort((a, b) => b.currentValue - a.currentValue);
    }

    return filtered;
  };

  const totalValue = calculateTotalValue();
  const totalInvestment = calculateTotalInvestment();
  const totalProfitLoss = calculateTotalProfitLoss();
  const profitLossPercentage = calculateProfitLossPercentage(totalProfitLoss, totalInvestment);
  const filteredHoldings = getFilteredHoldings();

  if (portfolioLoading || walletLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Portfolio
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
          size="large"
        >
          {refreshing ? 'Refreshing...' : 'Refresh Portfolio'}
        </Button>
      </Box>

      {/* Add a notice about refreshing if portfolio is empty */}
      {(!portfolio || !portfolio.holdings || portfolio.holdings.length === 0) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          If you recently made a trade and don't see your holdings, please click the Refresh Portfolio button above to update your portfolio data.
        </Alert>
      )}

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        sx={{ mb: 3 }}
      >
        <Tab label="Overview" />
        <Tab label="Analytics" />
        <Tab label="Holdings" />
      </Tabs>

      {tabValue === 0 && (
        <>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6">
                      Portfolio Summary
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: isMarketOpen() ? 'success.main' : 'text.disabled',
                          display: 'inline-block',
                          mr: 1
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {isMarketOpen() ? 'Market Open' : 'Market Closed'}
                      </Typography>
                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Total Value
                      </Typography>
                      <Typography variant="h5" component="div">
                        {formatCurrency(totalValue)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Total Investment
                      </Typography>
                      <Typography variant="h5" component="div">
                        {formatCurrency(totalInvestment)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Profit/Loss
                      </Typography>
                      <Box display="flex" alignItems="center">
                        {totalProfitLoss >= 0 ? (
                          <TrendingUp color="success" fontSize="small" sx={{ mr: 0.5 }} />
                        ) : (
                          <TrendingDown color="error" fontSize="small" sx={{ mr: 0.5 }} />
                        )}
                        <Typography
                          variant="h5"
                          component="div"
                          color={totalProfitLoss >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(Math.abs(totalProfitLoss))}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Profit/Loss %
                      </Typography>
                      <Typography
                        variant="h5"
                        component="div"
                        color={profitLossPercentage >= 0 ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {profitLossPercentage >= 0 ? '+' : ''}
                        {profitLossPercentage.toFixed(2)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Last updated: {lastUpdated.toLocaleTimeString()}
                        </Typography>
                        <Button
                          size="small"
                          onClick={handleRefresh}
                          startIcon={<RefreshIcon />}
                          disabled={refreshing}
                        >
                          {refreshing ? 'Updating...' : 'Update'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Available Balance
                  </Typography>
                  <Typography variant="h4" component="div" gutterBottom>
                    {virtualBalance.toLocaleString()} VC
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleManageWallet}
                    sx={{ mt: 1 }}
                  >
                    Manage Wallet
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <PerformanceChart />
        </>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <PerformanceMetrics />
          </Grid>
          <Grid item xs={12}>
            <RiskAssessment />
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <>
          <Box mb={3} display="flex" flexDirection="column">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center">
                <Typography variant="h6" mr={2}>Holdings</Typography>
                <Typography variant="caption" color="text.secondary">
                  <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </Typography>
              </Box>
              <Box>
                <IconButton onClick={toggleFilters} color={showFilters ? 'primary' : 'default'}>
                  <FilterIcon />
                </IconButton>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleRefresh}
                  startIcon={<RefreshIcon />}
                  disabled={refreshing}
                  sx={{ ml: 1 }}
                >
                  {refreshing ? 'Updating...' : 'Update'}
                </Button>
              </Box>
            </Box>

            {showFilters && (
              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Search"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Filter</InputLabel>
                      <Select value={filterValue} onChange={handleFilterChange} label="Filter">
                        <MenuItem value="all">All Holdings</MenuItem>
                        <MenuItem value="profit">Profit Only</MenuItem>
                        <MenuItem value="loss">Loss Only</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Sort By</InputLabel>
                      <Select value={sortValue} onChange={handleSortChange} label="Sort By">
                        <MenuItem value="valueDesc">Value (High to Low)</MenuItem>
                        <MenuItem value="valueAsc">Value (Low to High)</MenuItem>
                        <MenuItem value="profitDesc">Profit (High to Low)</MenuItem>
                        <MenuItem value="profitAsc">Profit (Low to High)</MenuItem>
                        <MenuItem value="alphabetical">Alphabetical</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>

          {filteredHoldings.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                {searchTerm || filterValue !== 'all'
                  ? 'No holdings match your filters'
                  : 'You have no holdings yet. Start trading to build your portfolio!'}
              </Typography>
              {(searchTerm || filterValue !== 'all') && (
                <Button
                  variant="text"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterValue('all');
                  }}
                  sx={{ mt: 1 }}
                >
                  Clear Filters
                </Button>
              )}
            </Paper>
          ) : (
            <TableContainer component={Paper} elevation={2}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Avg. Buy Price</TableCell>
                    <TableCell align="right">Current Price</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">Profit/Loss</TableCell>
                    <TableCell align="right">P/L %</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHoldings.map((holding) => {
                    // Ensure we're using the most up-to-date price
                    const currentPrice = holding.stock.currentPrice;
                    // Calculate profit/loss based on current price
                    const investmentValue = holding.averageBuyPrice * holding.quantity;
                    const currentValue = currentPrice * holding.quantity;
                    const profitLoss = currentValue - investmentValue;
                    const profitLossPercentage = investmentValue > 0 ? (profitLoss / investmentValue) * 100 : 0;

                    return (
                      <TableRow key={holding.stock._id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {holding.stock.symbol}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={holding.stock.companyName}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              {holding.stock.companyName}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">{holding.quantity}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(holding.averageBuyPrice)}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(currentPrice)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(currentValue)}
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end">
                            {profitLoss >= 0 ? (
                              <TrendingUp color="success" fontSize="small" sx={{ mr: 0.5 }} />
                            ) : (
                              <TrendingDown color="error" fontSize="small" sx={{ mr: 0.5 }} />
                            )}
                            <Typography
                              variant="body2"
                              color={profitLoss >= 0 ? 'success.main' : 'error.main'}
                              fontWeight="bold"
                            >
                              {profitLoss >= 0 ? '+' : ''}{formatCurrency(Math.abs(profitLoss))}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${profitLossPercentage >= 0 ? '+' : ''}${profitLossPercentage.toFixed(2)}%`}
                            color={profitLossPercentage >= 0 ? 'success' : 'error'}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            size="small"
                            color="primary"
                            onClick={() => handleTrade(holding.stock.symbol)}
                            startIcon={<TimelineIcon />}
                          >
                            Trade
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Container>
  );
};

export default Portfolio;