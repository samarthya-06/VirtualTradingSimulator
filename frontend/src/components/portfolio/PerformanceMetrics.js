import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Divider,
  Tooltip,
  IconButton,
  ThemeProvider,
  createTheme
} from '@mui/material';
import {
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import api from '../../utils/axiosConfig';

// Create a default theme to use
const defaultTheme = createTheme();

const PerformanceMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Function to fetch metrics with optional cache busting
  const fetchMetrics = async (forceRefresh = false) => {
    setRefreshing(true);
    setError(null);
    try {
      // Add timestamp for cache busting if forceRefresh is true
      const url = forceRefresh
        ? `/api/portfolio/performance?t=${Date.now()}`
        : '/api/portfolio/performance';

      console.log(`Fetching performance metrics with forceRefresh=${forceRefresh}`);
      const { data } = await api.get(url);

      console.log('Received performance metrics:', data);
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching performance metrics:', err);
      setError('Failed to load performance metrics');
      // Set fallback data on error
      setMetrics(generateFallbackData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    setLoading(true);
    fetchMetrics();
  }, []);

  // Set up auto-refresh during market hours
  useEffect(() => {
    // Function to check if market is open
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

    // Set up interval to refresh metrics every 60 seconds during market hours
    const refreshInterval = setInterval(() => {
      if (isMarketOpen()) {
        console.log('Auto-refreshing performance metrics during market hours');
        fetchMetrics(true); // Force refresh
      }
    }, 60000); // 60 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Generate fallback performance metrics data
  const generateFallbackData = () => {
    return {
      currentValue: 1608.46,
      totalInvestment: 1612.94,
      overallProfitLoss: -4.48,
      profitLossPercentage: -0.28,
      performance: {
        daily: {
          valueChange: -0.67,
          percentageChange: -0.04
        },
        weekly: {
          valueChange: 5.21,
          percentageChange: 0.32
        },
        monthly: {
          valueChange: -8.32,
          percentageChange: -0.51
        },
        yearly: {
          valueChange: 64.19,
          percentageChange: 4.15
        }
      },
      gains: {
        realized: 120.35,
        unrealized: -124.83
      },
      annualizedReturn: 2.86,
      sharpeRatio: 0.42,
      lastUpdated: new Date().toISOString()
    };
  };

  // Helper function to format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Helper function to format percentage
  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Helper function to get color based on value
  const getValueColor = (value) => {
    return value >= 0 ? defaultTheme.palette.success.main : defaultTheme.palette.error.main;
  };

  // Helper function to get icon based on value
  const getValueIcon = (value) => {
    return value >= 0
      ? <TrendingUpIcon sx={{ color: defaultTheme.palette.success.main }} />
      : <TrendingDownIcon sx={{ color: defaultTheme.palette.error.main }} />;
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Performance Metrics</Typography>
            <Box display="flex" alignItems="center">
              <Typography variant="caption" color="textSecondary" sx={{ mr: 1 }}>
                <AccessTimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
              <IconButton
                size="small"
                onClick={() => fetchMetrics(true)}
                disabled={refreshing}
                color="primary"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={200}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={200}>
              <Typography color="error">{error}</Typography>
            </Box>
          ) : !metrics ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={200}>
              <Typography color="textSecondary">No performance data available</Typography>
            </Box>
          ) : (
            <Box>
              {/* Overall Performance */}
              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} sm={6}>
                  <Box
                    p={2}
                    bgcolor={defaultTheme.palette.background.default}
                    borderRadius={1}
                    height="100%"
                  >
                    <Typography variant="body2" color="textSecondary">
                      Current Value
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(metrics.currentValue)}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Typography
                        variant="body2"
                        color={getValueColor(metrics.overallProfitLoss)}
                        fontWeight="medium"
                        sx={{ display: 'flex', alignItems: 'center' }}
                      >
                        {getValueIcon(metrics.overallProfitLoss)}
                        <span style={{ marginLeft: '4px' }}>
                          {formatCurrency(metrics.overallProfitLoss)} ({formatPercentage(metrics.profitLossPercentage)})
                        </span>
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box
                    p={2}
                    bgcolor={defaultTheme.palette.background.default}
                    borderRadius={1}
                    height="100%"
                  >
                    <Typography variant="body2" color="textSecondary">
                      Total Investment
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(metrics.totalInvestment)}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ display: 'flex', alignItems: 'center' }}
                      >
                        <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Time Period Performance
              </Typography>

              <Grid container spacing={2}>
                {/* Daily Performance */}
                <Grid item xs={6} sm={3}>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Daily
                    </Typography>
                    <Box display="flex" alignItems="center">
                      {getValueIcon(metrics.performance.daily.valueChange)}
                      <Typography
                        variant="body1"
                        fontWeight="medium"
                        color={getValueColor(metrics.performance.daily.valueChange)}
                        ml={0.5}
                      >
                        {formatPercentage(metrics.performance.daily.percentageChange)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Weekly Performance */}
                <Grid item xs={6} sm={3}>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Weekly
                    </Typography>
                    <Box display="flex" alignItems="center">
                      {getValueIcon(metrics.performance.weekly.valueChange)}
                      <Typography
                        variant="body1"
                        fontWeight="medium"
                        color={getValueColor(metrics.performance.weekly.valueChange)}
                        ml={0.5}
                      >
                        {formatPercentage(metrics.performance.weekly.percentageChange)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Monthly Performance */}
                <Grid item xs={6} sm={3}>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Monthly
                    </Typography>
                    <Box display="flex" alignItems="center">
                      {getValueIcon(metrics.performance.monthly.valueChange)}
                      <Typography
                        variant="body1"
                        fontWeight="medium"
                        color={getValueColor(metrics.performance.monthly.valueChange)}
                        ml={0.5}
                      >
                        {formatPercentage(metrics.performance.monthly.percentageChange)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Yearly Performance */}
                <Grid item xs={6} sm={3}>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Yearly
                    </Typography>
                    <Box display="flex" alignItems="center">
                      {getValueIcon(metrics.performance.yearly.valueChange)}
                      <Typography
                        variant="body1"
                        fontWeight="medium"
                        color={getValueColor(metrics.performance.yearly.valueChange)}
                        ml={0.5}
                      >
                        {formatPercentage(metrics.performance.yearly.percentageChange)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Advanced Metrics
              </Typography>

              <Grid container spacing={2}>
                {/* Realized Gains */}
                <Grid item xs={6} sm={3}>
                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">
                        Realized Gains
                      </Typography>
                      <Tooltip title="Profits from completed trades">
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color={getValueColor(metrics.gains.realized)}
                    >
                      {formatCurrency(metrics.gains.realized)}
                    </Typography>
                  </Box>
                </Grid>

                {/* Unrealized Gains */}
                <Grid item xs={6} sm={3}>
                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">
                        Unrealized Gains
                      </Typography>
                      <Tooltip title="Potential profit/loss from current holdings">
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color={getValueColor(metrics.gains.unrealized)}
                    >
                      {formatCurrency(metrics.gains.unrealized)}
                    </Typography>
                  </Box>
                </Grid>

                {/* Annualized Return */}
                <Grid item xs={6} sm={3}>
                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">
                        Annualized Return
                      </Typography>
                      <Tooltip title="Average yearly return on investment">
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color={getValueColor(metrics.annualizedReturn)}
                    >
                      {formatPercentage(metrics.annualizedReturn)}
                    </Typography>
                  </Box>
                </Grid>

                {/* Sharpe Ratio */}
                <Grid item xs={6} sm={3}>
                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">
                        Sharpe Ratio
                      </Typography>
                      <Tooltip title="Measure of risk-adjusted return. Higher is better.">
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color={
                        metrics.sharpeRatio > 1
                          ? defaultTheme.palette.success.main
                          : metrics.sharpeRatio > 0
                            ? defaultTheme.palette.warning.main
                            : defaultTheme.palette.error.main
                      }
                    >
                      {metrics.sharpeRatio.toFixed(2)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
    </ThemeProvider>
  );
};

export default PerformanceMetrics;