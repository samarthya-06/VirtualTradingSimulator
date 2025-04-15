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
  LinearProgress,
  ThemeProvider,
  createTheme,
  Chip
} from '@mui/material';
import {
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import api from '../../utils/axiosConfig';

// Create a default theme to use
const defaultTheme = createTheme();

const RiskAssessment = () => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Function to fetch risk data with optional cache busting
  const fetchRiskData = async (forceRefresh = false) => {
    setRefreshing(true);
    setError(null);
    try {
      // Add timestamp for cache busting if forceRefresh is true
      const url = forceRefresh
        ? `/api/portfolio/risk?t=${Date.now()}`
        : '/api/portfolio/risk';

      console.log(`Fetching risk assessment data with forceRefresh=${forceRefresh}`);
      const { data } = await api.get(url);

      if (data) {
        console.log('Received risk assessment data:', data);
        setRiskData(data);
      } else {
        // Set fallback data if API returns empty data
        console.log('Empty risk data received, using fallback data');
        setRiskData(generateFallbackData());
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching risk data:', err);

      // Check if it's a 404 error (portfolio not found or empty)
      if (err.response && err.response.status === 404) {
        // This is an expected case for new users or empty portfolios
        setError('No portfolio data available for risk assessment');
      } else {
        // Other errors
        setError('Failed to load risk assessment');
      }

      // Set fallback data in either case
      setRiskData(generateFallbackData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    setLoading(true);
    fetchRiskData();
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

    // Set up interval to refresh metrics every 2 minutes during market hours
    const refreshInterval = setInterval(() => {
      if (isMarketOpen()) {
        console.log('Auto-refreshing risk assessment during market hours');
        fetchRiskData(true); // Force refresh
      }
    }, 120000); // 2 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  // Generate fallback risk assessment data if API fails
  const generateFallbackData = () => {
    return {
      riskLevel: 'Medium',
      portfolioBeta: 0.92,
      portfolioVolatility: 0.12,
      topHoldingPercentage: 33.1,
      top3HoldingsPercentage: 70.2,
      diversificationIndex: 0.18,
      sectorConcentration: {
        highestSector: 'Technology',
        percentage: 33.1
      },
      volatilityTrend: 'Decreasing',
      riskFactors: [
        {
          factor: 'Market Risk',
          impact: 'Medium',
          description: 'Sensitivity to market movements'
        },
        {
          factor: 'Concentration Risk',
          impact: 'High',
          description: 'Portfolio is somewhat concentrated in tech sector'
        },
        {
          factor: 'Liquidity Risk',
          impact: 'Low',
          description: 'All holdings have good liquidity'
        }
      ]
    };
  };

  // Helper function to get color based on risk level
  const getRiskColor = (level) => {
    if (!level) return defaultTheme.palette.info.main;

    switch (level) {
      case 'Low':
        return defaultTheme.palette.success.main;
      case 'Medium':
        return defaultTheme.palette.warning.main;
      case 'High':
        return defaultTheme.palette.error.main;
      default:
        return defaultTheme.palette.info.main;
    }
  };

  // Helper function to get icon based on risk level
  const getRiskIcon = (level) => {
    if (!level) return <InfoIcon sx={{ color: defaultTheme.palette.info.main }} />;

    switch (level) {
      case 'Low':
        return <SecurityIcon sx={{ color: defaultTheme.palette.success.main }} />;
      case 'Medium':
        return <TrendingUpIcon sx={{ color: defaultTheme.palette.warning.main }} />;
      case 'High':
        return <WarningIcon sx={{ color: defaultTheme.palette.error.main }} />;
      default:
        return <InfoIcon sx={{ color: defaultTheme.palette.info.main }} />;
    }
  };

  // These functions are kept for future use
  /*
  // Helper function to get progress value for diversification
  const getDiversificationProgress = (index) => {
    if (index === undefined || index === null) return 50;

    // HHI index: < 0.01 is very diversified, > 0.25 is highly concentrated
    // Convert to 0-100 scale for progress bar
    if (index < 0.01) return 10;
    if (index < 0.15) return 40;
    if (index < 0.25) return 70;
    return 90;
  };

  // Format currency in INR
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '₹0.00';

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  */

  // Safely get value with fallback
  const safeValue = (value, defaultValue = 0) => {
    return value !== undefined && value !== null ? value : defaultValue;
  };

  // Safely format number to fixed decimal places
  const safeToFixed = (number, decimals = 2) => {
    if (number === undefined || number === null || isNaN(number)) {
      return (0).toFixed(decimals);
    }
    return Number(number).toFixed(decimals);
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Risk Assessment
            </Typography>
            <Box display="flex" alignItems="center">
              <Typography variant="caption" color="textSecondary" sx={{ mr: 1 }}>
                <AccessTimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
              <IconButton
                size="small"
                onClick={() => fetchRiskData(true)}
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
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={200}>
              <Typography color="textSecondary" variant="body1" align="center" gutterBottom>
                {error}
              </Typography>
              <Typography color="textSecondary" variant="body2" align="center">
                Risk assessment will be available once you have investments in your portfolio.
              </Typography>
            </Box>
          ) : !riskData ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={200}>
              <Typography color="textSecondary">No risk data available</Typography>
            </Box>
          ) : (
            <Box>
              {/* Overall Risk Level */}
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
                p={2}
                bgcolor={defaultTheme.palette.background.default}
                borderRadius={1}
              >
                <Box display="flex" alignItems="center">
                  {getRiskIcon(riskData.riskLevel)}
                  <Typography variant="h6" ml={1}>
                    Overall Risk: <span style={{ color: getRiskColor(riskData.riskLevel) }}>{riskData.riskLevel || 'Unknown'}</span>
                  </Typography>
                </Box>
                <Tooltip title="Based on portfolio beta, volatility, and concentration">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Grid container spacing={2}>
                {/* Beta */}
                <Grid item xs={12} sm={6}>
                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">
                        Portfolio Beta
                      </Typography>
                      <Tooltip title="Measures portfolio's volatility relative to the market. Beta of 1 means same as market, >1 means more volatile, <1 means less volatile.">
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="h6">
                      {safeToFixed(riskData.portfolioBeta)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(safeValue(riskData.portfolioBeta, 1) * 50, 100)}
                      sx={{
                        mt: 1,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: defaultTheme.palette.divider,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: safeValue(riskData.portfolioBeta, 1) > 1.2
                            ? defaultTheme.palette.error.main
                            : safeValue(riskData.portfolioBeta, 1) < 0.8
                              ? defaultTheme.palette.success.main
                              : defaultTheme.palette.warning.main
                        }
                      }}
                    />
                  </Box>
                </Grid>

                {/* Volatility */}
                <Grid item xs={12} sm={6}>
                  <Box mb={2}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">
                        Portfolio Volatility
                      </Typography>
                      <Tooltip title="Standard deviation of portfolio returns, higher values indicate more risk.">
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="h6">
                      {safeToFixed(safeValue(riskData.portfolioVolatility, 0) * 100)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(safeValue(riskData.portfolioVolatility, 0.1) * 500, 100)}
                      sx={{
                        mt: 1,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: defaultTheme.palette.divider,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: safeValue(riskData.portfolioVolatility, 0.1) > 0.2
                            ? defaultTheme.palette.error.main
                            : safeValue(riskData.portfolioVolatility, 0.1) < 0.1
                              ? defaultTheme.palette.success.main
                              : defaultTheme.palette.warning.main
                        }
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Concentration Metrics
              </Typography>

              <Grid container spacing={2}>
                {/* Top Holding */}
                <Grid item xs={12} sm={6}>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Top Holding
                    </Typography>
                    <Typography variant="h6">
                      {safeToFixed(riskData.topHoldingPercentage)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(safeValue(riskData.topHoldingPercentage, 10), 100)}
                      sx={{
                        mt: 1,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: defaultTheme.palette.divider,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: safeValue(riskData.topHoldingPercentage, 10) > 20
                            ? defaultTheme.palette.error.main
                            : safeValue(riskData.topHoldingPercentage, 10) < 10
                              ? defaultTheme.palette.success.main
                              : defaultTheme.palette.warning.main
                        }
                      }}
                    />
                  </Box>
                </Grid>

                {/* Top 3 Holdings */}
                <Grid item xs={12} sm={6}>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Top 3 Holdings
                    </Typography>
                    <Typography variant="h6">
                      {safeToFixed(riskData.top3HoldingsPercentage)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(safeValue(riskData.top3HoldingsPercentage, 30), 100)}
                      sx={{
                        mt: 1,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: defaultTheme.palette.divider,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: safeValue(riskData.top3HoldingsPercentage, 30) > 50
                            ? defaultTheme.palette.error.main
                            : safeValue(riskData.top3HoldingsPercentage, 30) < 30
                              ? defaultTheme.palette.success.main
                              : defaultTheme.palette.warning.main
                        }
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Sector Concentration
              </Typography>

              <Box mb={2}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">
                    Highest Sector: {riskData.sectorConcentration?.highestSector || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {safeToFixed(riskData.sectorConcentration?.percentage)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(safeValue(riskData.sectorConcentration?.percentage, 20), 100)}
                  sx={{
                    mt: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: defaultTheme.palette.divider,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: safeValue(riskData.sectorConcentration?.percentage, 20) > 40
                        ? defaultTheme.palette.error.main
                        : safeValue(riskData.sectorConcentration?.percentage, 20) < 20
                          ? defaultTheme.palette.success.main
                          : defaultTheme.palette.warning.main
                    }
                  }}
                />
                <Box display="flex" justifyContent="flex-end" mt={0.5}>
                  <Typography variant="caption" color="textSecondary">
                    {safeValue(riskData.sectorConcentration?.percentage, 20) > 40 ? 'High concentration' :
                     safeValue(riskData.sectorConcentration?.percentage, 20) > 20 ? 'Moderate concentration' :
                     'Well diversified'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Risk Factors
              </Typography>

              <Grid container spacing={1}>
                {(riskData.riskFactors || []).map((factor, index) => (
                  <Grid item xs={12} key={index}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      p={1}
                      bgcolor={defaultTheme.palette.background.default}
                      borderRadius={1}
                      mb={1}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {factor.factor || 'Unknown Risk'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {factor.description || 'No description available'}
                        </Typography>
                      </Box>
                      <Chip
                        label={factor.impact || 'Unknown'}
                        size="small"
                        sx={{
                          backgroundColor: getRiskColor(factor.impact),
                          color: '#fff',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
                {(!riskData.riskFactors || riskData.riskFactors.length === 0) && (
                  <Grid item xs={12}>
                    <Typography color="textSecondary" align="center" py={2}>
                      No risk factors data available
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
    </ThemeProvider>
  );
};

export default RiskAssessment;