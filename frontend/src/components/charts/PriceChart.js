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
  Grid,
  Button,
  Alert
} from '@mui/material';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';
import axios from 'axios';

// API base URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

/**
 * Price Chart component
 * @param {Object} props
 * @param {string} props.symbol - Stock symbol
 * @param {string} props.exchange - Exchange (NSE/BSE)
 */
const PriceChart = ({ symbol, exchange = 'NSE' }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interval, setInterval] = useState('daily');
  const [timeRange, setTimeRange] = useState(90);
  const [chartType, setChartType] = useState('area');

  const fetchChartData = async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
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
      
      console.log(`Fetching chart data for ${symbol} on ${exchange} with interval ${interval} and range ${timeRange}`);
      
      const url = `${API_URL}/api/indicators/chart/${symbol}`;
      const response = await axios.get(url, { 
        params: {
          interval,
          limit: timeRange,
          exchange
        },
        headers
      });
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        console.log(`Received ${response.data.data.length} data points`);
        setChartData(response.data);
        setError(null);
      } else {
        throw new Error('No data points received from API');
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(err.response?.data?.message || 'Error fetching chart data');
      
      // If there's fallback data in the error response, use it
      if (err.response?.data?.data) {
        setChartData({
          symbol,
          interval,
          data: err.response.data.data
        });
      } else {
        // Generate dummy data
        const dummyData = generateDummyData(symbol, timeRange);
        setChartData({
          symbol,
          interval,
          data: dummyData
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchChartData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, exchange, interval, timeRange]);

  // Generate dummy data in case the API fails
  const generateDummyData = (symbol, limit) => {
    const data = [];
    const now = new Date();
    let price = 1000 + Math.random() * 1000; // Starting price between 1000-2000
    
    for (let i = 0; i < limit; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (limit - i));
      
      // Add some randomness to price movement
      const change = (Math.random() - 0.5) * (price * 0.02); // Max 2% change
      price += change;
      
      // Generate candle data
      const open = price;
      const close = price + (Math.random() - 0.5) * (price * 0.01);
      const high = Math.max(open, close) + Math.random() * (price * 0.005);
      const low = Math.min(open, close) - Math.random() * (price * 0.005);
      const volume = Math.floor(Math.random() * 1000000) + 100000;
      
      data.push({
        time: date.getTime(),
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return data;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const handleIntervalChange = (event) => {
    setInterval(event.target.value);
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleChartTypeChange = (event) => {
    setChartType(event.target.value);
  };

  const renderChart = () => {
    if (!chartData || !chartData.data || chartData.data.length === 0) {
      return <Typography>No data available for the selected timeframe</Typography>;
    }

    switch (chartType) {
      case 'ohlc':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tickFormatter={formatDate}
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                labelFormatter={(label) => formatDate(label)}
                formatter={(value) => [value.toFixed(2), '']}
              />
              <Line 
                type="monotone" 
                dataKey="high" 
                stroke="#4CAF50" 
                dot={false} 
                name="High"
              />
              <Line 
                type="monotone" 
                dataKey="low" 
                stroke="#FF5252" 
                dot={false} 
                name="Low"
              />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#2196F3" 
                dot={false} 
                name="Close"
                strokeWidth={2}
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
      default:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData.data}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                tickFormatter={formatDate}
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip
                formatter={(value) => [value.toFixed(2), 'Price']}
                labelFormatter={(label) => formatDate(label)}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="close" 
                stroke="#8884d8" 
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                name="Price"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {symbol} Price Chart {exchange ? `(${exchange})` : ''}
          </Typography>
          
          <Box display="flex" gap={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="chart-type-select-label">Chart Type</InputLabel>
              <Select
                labelId="chart-type-select-label"
                value={chartType}
                label="Chart Type"
                onChange={handleChartTypeChange}
              >
                <MenuItem value="area">Area</MenuItem>
                <MenuItem value="ohlc">OHLC</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="interval-select-label">Interval</InputLabel>
              <Select
                labelId="interval-select-label"
                value={interval}
                label="Interval"
                onChange={handleIntervalChange}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="timerange-select-label">Range</InputLabel>
              <Select
                labelId="timerange-select-label"
                value={timeRange}
                label="Range"
                onChange={handleTimeRangeChange}
              >
                <MenuItem value={30}>1 Month</MenuItem>
                <MenuItem value={90}>3 Months</MenuItem>
                <MenuItem value={180}>6 Months</MenuItem>
                <MenuItem value={365}>1 Year</MenuItem>
              </Select>
            </FormControl>
            
            <Button 
              variant="outlined" 
              size="small" 
              onClick={fetchChartData}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Box>
        
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
          
          {chartData ? (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                {renderChart()}
              </Grid>
              
              {/* Volume Chart */}
              <Grid item xs={12}>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={chartData.data}>
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={formatDate}
                      minTickGap={30}
                      height={0}
                      tick={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                        return value;
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [value.toLocaleString(), 'Volume']}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Bar 
                      dataKey="volume" 
                      fill="#82ca9d" 
                      name="Volume"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          ) : (
            <Typography>No chart data available</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default PriceChart; 