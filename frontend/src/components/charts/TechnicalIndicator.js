import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
  TextField,
  Grid,
  Button,
  Alert
} from '@mui/material';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  ReferenceLine, 
  CartesianGrid,
  ComposedChart,
  Bar,
  Cell
} from 'recharts';
import axios from 'axios';

// API base URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

/**
 * Technical Indicator component
 * @param {Object} props
 * @param {string} props.symbol - Stock symbol
 * @param {string} props.indicatorType - Type of indicator (rsi, macd, bollinger, sma, ema)
 * @param {Object} props.defaultParams - Default parameters for the indicator
 * @param {function} props.onIndicatorChange - Callback when indicator data changes
 */
const TechnicalIndicator = ({ 
  symbol, 
  indicatorType = 'rsi', 
  defaultParams = {}, 
  onIndicatorChange = () => {}
}) => {
  const [indicatorData, setIndicatorData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({
    // RSI defaults
    rsiPeriod: defaultParams.rsiPeriod || 14,
    
    // MACD defaults
    fastPeriod: defaultParams.fastPeriod || 12,
    slowPeriod: defaultParams.slowPeriod || 26,
    signalPeriod: defaultParams.signalPeriod || 9,
    
    // Bollinger defaults
    bollingerPeriod: defaultParams.bollingerPeriod || 20,
    stdDev: defaultParams.stdDev || 2,
    
    // Moving Average defaults
    maPeriod: defaultParams.maPeriod || 20,
    maType: defaultParams.maType || 'sma',
    
    // Common params
    interval: defaultParams.interval || 'daily',
    limit: defaultParams.limit || 30
  });

  const fetchIndicator = async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '';
      let requestParams = { interval: params.interval, limit: params.limit };
      
      switch (indicatorType) {
        case 'rsi':
          endpoint = `/api/indicators/rsi/${symbol}`;
          requestParams.period = params.rsiPeriod;
          break;
        case 'macd':
          endpoint = `/api/indicators/macd/${symbol}`;
          requestParams.fastPeriod = params.fastPeriod;
          requestParams.slowPeriod = params.slowPeriod;
          requestParams.signalPeriod = params.signalPeriod;
          break;
        case 'bollinger':
          endpoint = `/api/indicators/bollinger/${symbol}`;
          requestParams.period = params.bollingerPeriod;
          requestParams.stdDev = params.stdDev;
          break;
        case 'ma':
          endpoint = `/api/indicators/ma/${symbol}`;
          requestParams.type = params.maType;
          requestParams.period = params.maPeriod;
          break;
        default:
          setError('Unknown indicator type');
          setLoading(false);
          return;
      }
      
      // Get auth token if available
      let headers = {};
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          if (userData.token) {
            headers.Authorization = `Bearer ${userData.token}`;
          }
        } catch (e) {
          console.warn('Failed to parse user data from localStorage');
        }
      }
      
      console.log(`Fetching ${indicatorType} for ${symbol} with params:`, requestParams);
      
      const url = `${API_URL}${endpoint}`;
      const response = await axios.get(url, { 
        params: requestParams,
        headers
      });
      
      if (response.data && (
        (response.data.values && response.data.values.length > 0) || 
        (indicatorType === 'bollinger' && response.data.values && response.data.values.length > 0)
      )) {
        setIndicatorData(response.data);
        onIndicatorChange(response.data);
        setError(null);
      } else {
        throw new Error('Invalid or empty data received');
      }
    } catch (err) {
      console.error('Error fetching indicator:', err);
      setError(err.response?.data?.message || 'Error fetching indicator data');
      
      // Generate fallback data if there's an error
      const fallbackData = generateFallbackData(symbol, indicatorType, params);
      if (fallbackData) {
        setIndicatorData(fallbackData);
        onIndicatorChange(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch indicator data when symbol or indicator type changes
  useEffect(() => {
    if (symbol) {
      fetchIndicator();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, indicatorType]);

  // Generate fallback data for different indicator types
  const generateFallbackData = (symbol, type, params) => {
    const now = new Date();
    const values = [];
    
    for (let i = 0; i < params.limit; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (params.limit - i));
      const time = date.getTime();
      
      switch(type) {
        case 'rsi':
          // Generate random RSI between 30 and 70 with occasional extremes
          let value;
          if (i % 10 === 0) {
            value = Math.random() > 0.5 ? Math.random() * 20 + 70 : Math.random() * 20;
          } else {
            value = Math.random() * 40 + 30;
          }
          values.push({ time, value: parseFloat(value.toFixed(2)) });
          break;
          
        case 'macd':
          // Generate random MACD, signal and histogram
          const macd = (Math.random() - 0.5) * 4;
          const signal = macd + (Math.random() - 0.5);
          const histogram = macd - signal;
          values.push({ 
            time, 
            macd: parseFloat(macd.toFixed(2)), 
            signal: parseFloat(signal.toFixed(2)),
            histogram: parseFloat(histogram.toFixed(2))
          });
          break;
          
        case 'bollinger':
          // Generate random middle price with bands
          const middle = 1000 + (Math.random() * 500);
          const stdDevValue = middle * (params.stdDev * 0.02); // 2% of price per stdDev
          values.push({
            time,
            middle: parseFloat(middle.toFixed(2)),
            upper: parseFloat((middle + stdDevValue).toFixed(2)),
            lower: parseFloat((middle - stdDevValue).toFixed(2))
          });
          break;
          
        case 'ma':
          // Generate random price
          const price = 1000 + (Math.random() * 500);
          values.push({ time, value: parseFloat(price.toFixed(2)) });
          break;
          
        default:
          return null;
      }
    }
    
    return {
      symbol,
      indicator: getIndicatorName(type),
      timestamp: new Date(),
      values
    };
  };

  const handleParamChange = (e) => {
    setParams({ ...params, [e.target.name]: e.target.value });
  };

  const applyChanges = () => {
    fetchIndicator();
  };

  const renderControls = () => {
    switch (indicatorType) {
      case 'rsi':
        return (
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Period"
                name="rsiPeriod"
                type="number"
                value={params.rsiPeriod}
                onChange={handleParamChange}
                inputProps={{ min: 2, max: 50 }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Button 
                variant="contained" 
                onClick={applyChanges} 
                fullWidth
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        );
      case 'macd':
        return (
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Fast Period"
                name="fastPeriod"
                type="number"
                value={params.fastPeriod}
                onChange={handleParamChange}
                inputProps={{ min: 2, max: 50 }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Slow Period"
                name="slowPeriod"
                type="number"
                value={params.slowPeriod}
                onChange={handleParamChange}
                inputProps={{ min: 2, max: 50 }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Signal Period"
                name="signalPeriod"
                type="number"
                value={params.signalPeriod}
                onChange={handleParamChange}
                inputProps={{ min: 2, max: 50 }}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <Button 
                variant="contained" 
                onClick={applyChanges} 
                fullWidth
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        );
      case 'bollinger':
        return (
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                label="Period"
                name="bollingerPeriod"
                type="number"
                value={params.bollingerPeriod}
                onChange={handleParamChange}
                inputProps={{ min: 2, max: 50 }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <FormControl fullWidth size="small">
                <InputLabel>Standard Deviation</InputLabel>
                <Select
                  name="stdDev"
                  value={params.stdDev}
                  onChange={handleParamChange}
                  label="Standard Deviation"
                >
                  <MenuItem value={1}>1</MenuItem>
                  <MenuItem value={1.5}>1.5</MenuItem>
                  <MenuItem value={2}>2</MenuItem>
                  <MenuItem value={2.5}>2.5</MenuItem>
                  <MenuItem value={3}>3</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button 
                variant="contained" 
                onClick={applyChanges} 
                fullWidth
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        );
      case 'ma':
        return (
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Period"
                name="maPeriod"
                type="number"
                value={params.maPeriod}
                onChange={handleParamChange}
                inputProps={{ min: 2, max: 50 }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  name="maType"
                  value={params.maType}
                  onChange={handleParamChange}
                  label="Type"
                >
                  <MenuItem value="sma">SMA</MenuItem>
                  <MenuItem value="ema">EMA</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button 
                variant="contained" 
                onClick={applyChanges} 
                fullWidth
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        );
      default:
        return null;
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const renderChart = () => {
    if (!indicatorData || !indicatorData.values || indicatorData.values.length === 0) {
      return <Typography>No indicator data available</Typography>;
    }

    switch (indicatorType) {
      case 'rsi':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={indicatorData.values}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tickFormatter={formatDate}
                minTickGap={20}
              />
              <YAxis domain={[0, 100]} ticks={[0, 30, 50, 70, 100]} />
              <Tooltip 
                formatter={(value) => [`${value.toFixed(2)}`, 'RSI']}
                labelFormatter={(label) => formatDate(label)}
              />
              <ReferenceLine y={70} stroke="red" strokeDasharray="3 3" label="Overbought (70)" />
              <ReferenceLine y={30} stroke="green" strokeDasharray="3 3" label="Oversold (30)" />
              <ReferenceLine y={50} stroke="gray" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8884d8" 
                dot={false} 
                name="RSI"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'macd':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={indicatorData.values}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tickFormatter={formatDate}
                minTickGap={20}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${value.toFixed(2)}`, '']}
                labelFormatter={(label) => formatDate(label)}
              />
              <ReferenceLine y={0} stroke="#000" strokeWidth={0.5} />
              <Bar 
                dataKey="histogram" 
                name="Histogram"
                fillOpacity={0.5}
                isAnimationActive={false}
                barSize={5}
                stroke="none"
              >
                {indicatorData.values.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.histogram >= 0 ? '#4CAF50' : '#FF5252'} 
                  />
                ))}
              </Bar>
              <Line 
                type="monotone" 
                dataKey="macd" 
                stroke="#2196F3" 
                dot={false} 
                name="MACD"
              />
              <Line 
                type="monotone" 
                dataKey="signal" 
                stroke="#FF5722" 
                dot={false} 
                name="Signal"
              />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        );
      case 'bollinger':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={indicatorData.values}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tickFormatter={formatDate}
                minTickGap={20}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${value.toFixed(2)}`, '']}
                labelFormatter={(label) => formatDate(label)}
              />
              <Line 
                type="monotone" 
                dataKey="upper" 
                stroke="#ff5722" 
                dot={false} 
                name="Upper"
              />
              <Line 
                type="monotone" 
                dataKey="middle" 
                stroke="#2196f3" 
                dot={false} 
                name="SMA"
              />
              <Line 
                type="monotone" 
                dataKey="lower" 
                stroke="#4caf50" 
                dot={false} 
                name="Lower"
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'ma':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={indicatorData.values}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tickFormatter={formatDate}
                minTickGap={20}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${value.toFixed(2)}`, indicatorData.indicator]}
                labelFormatter={(label) => formatDate(label)}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2196f3" 
                dot={false} 
                name={indicatorData.indicator}
                strokeWidth={2}
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return <Typography>Unsupported indicator type</Typography>;
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {getIndicatorName(indicatorType)} {symbol ? `- ${symbol}` : ''}
        </Typography>
        
        {renderControls()}
        
        <Box sx={{ mt: 2 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error} (using fallback data)
            </Alert>
          ) : null}
          
          {renderChart()}
        </Box>
      </CardContent>
    </Card>
  );
};

// Helper function to get full indicator name
const getIndicatorName = (type) => {
  switch (type) {
    case 'rsi':
      return 'Relative Strength Index (RSI)';
    case 'macd':
      return 'Moving Average Convergence Divergence (MACD)';
    case 'bollinger':
      return 'Bollinger Bands';
    case 'ma':
      return 'Moving Average';
    default:
      return type.toUpperCase();
  }
};

export default TechnicalIndicator; 