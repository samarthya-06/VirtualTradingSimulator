import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { useSnackbar } from 'notistack';

const AdvancedAnalytics = () => {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [predictionParams, setPredictionParams] = useState({
    horizon: 30,
    confidenceLevel: 0.95,
    useTechnicalIndicators: true,
    useSentimentAnalysis: false
  });
  const [correlationSymbols, setCorrelationSymbols] = useState([]);
  const [newCorrelationSymbol, setNewCorrelationSymbol] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const addCorrelationSymbol = () => {
    if (newCorrelationSymbol && !correlationSymbols.includes(newCorrelationSymbol.toUpperCase())) {
      setCorrelationSymbols([...correlationSymbols, newCorrelationSymbol.toUpperCase()]);
      setNewCorrelationSymbol('');
    }
  };

  const removeCorrelationSymbol = (symbol) => {
    setCorrelationSymbols(correlationSymbols.filter(s => s !== symbol));
  };

  const fetchPricePredictions = async () => {
    if (!symbol) {
      enqueueSnackbar('Please enter a symbol', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/analytics/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          ...predictionParams
        })
      });
      const data = await response.json();
      setAnalyticsData(prev => ({ ...prev, predictions: data }));
      enqueueSnackbar('Price predictions generated successfully', { variant: 'success' });
    } catch (error) {
      setError('Failed to generate price predictions');
      enqueueSnackbar('Failed to generate price predictions', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCorrelationAnalysis = async () => {
    if (correlationSymbols.length < 2) {
      enqueueSnackbar('Please add at least 2 symbols for correlation analysis', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/analytics/correlations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbols: correlationSymbols
        })
      });
      const data = await response.json();
      setAnalyticsData(prev => ({ ...prev, correlations: data }));
      enqueueSnackbar('Correlation analysis completed successfully', { variant: 'success' });
    } catch (error) {
      setError('Failed to perform correlation analysis');
      enqueueSnackbar('Failed to perform correlation analysis', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchVolatilityForecast = async () => {
    if (!symbol) {
      enqueueSnackbar('Please enter a symbol', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/analytics/volatility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbol })
      });
      const data = await response.json();
      setAnalyticsData(prev => ({ ...prev, volatility: data }));
      enqueueSnackbar('Volatility forecast generated successfully', { variant: 'success' });
    } catch (error) {
      setError('Failed to generate volatility forecast');
      enqueueSnackbar('Failed to generate volatility forecast', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePredictionParamChange = (field, value) => {
    setPredictionParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Advanced Analytics
      </Typography>

      <Grid container spacing={3}>
        {/* Symbol Input */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Button
                  variant="contained"
                  onClick={fetchPricePredictions}
                  disabled={loading || !symbol}
                  sx={{ mr: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Generate Predictions'}
                </Button>
                <Button
                  variant="contained"
                  onClick={fetchVolatilityForecast}
                  disabled={loading || !symbol}
                >
                  {loading ? <CircularProgress size={24} /> : 'Forecast Volatility'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Correlation Analysis */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Correlation Analysis
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Add Symbol for Correlation"
                  value={newCorrelationSymbol}
                  onChange={(e) => setNewCorrelationSymbol(e.target.value.toUpperCase())}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={addCorrelationSymbol}
                  disabled={!newCorrelationSymbol}
                  sx={{ mr: 2 }}
                >
                  Add Symbol
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={fetchCorrelationAnalysis}
                  disabled={loading || correlationSymbols.length < 2}
                >
                  {loading ? <CircularProgress size={24} /> : 'Analyze Correlations'}
                </Button>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {correlationSymbols.map(symbol => (
                <Chip
                  key={symbol}
                  label={symbol}
                  onDelete={() => removeCorrelationSymbol(symbol)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Prediction Parameters */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Prediction Parameters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Prediction Horizon (days)"
                  value={predictionParams.horizon}
                  onChange={(e) => handlePredictionParamChange('horizon', Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Confidence Level"
                  value={predictionParams.confidenceLevel}
                  onChange={(e) => handlePredictionParamChange('confidenceLevel', Number(e.target.value))}
                  inputProps={{ min: 0, max: 1, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={predictionParams.useTechnicalIndicators}
                      onChange={(e) => handlePredictionParamChange('useTechnicalIndicators', e.target.checked)}
                    />
                  }
                  label="Use Technical Indicators"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={predictionParams.useSentimentAnalysis}
                      onChange={(e) => handlePredictionParamChange('useSentimentAnalysis', e.target.checked)}
                    />
                  }
                  label="Use Sentiment Analysis"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Analytics Results */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab label="Price Predictions" />
              <Tab label="Correlations" />
              <Tab label="Volatility" />
            </Tabs>

            {/* Price Predictions Tab */}
            {activeTab === 0 && analyticsData?.predictions && (
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.predictions.historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#8884d8"
                      name="Historical Price"
                    />
                    <Line
                      type="monotone"
                      dataKey="prediction"
                      stroke="#82ca9d"
                      name="Predicted Price"
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}

            {/* Correlations Tab */}
            {activeTab === 1 && analyticsData?.correlations && (
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" />
                    <YAxis type="number" dataKey="y" />
                    <ZAxis type="number" dataKey="z" />
                    <Tooltip />
                    <Legend />
                    <Scatter
                      data={analyticsData.correlations.scatterData}
                      fill="#8884d8"
                      name="Correlation"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
                <TableContainer sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Symbol Pair</TableCell>
                        <TableCell>Correlation</TableCell>
                        <TableCell>Strength</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analyticsData.correlations.correlationMatrix.map((row, i) =>
                        row.map((corr, j) => (
                          <TableRow key={`${i}-${j}`}>
                            <TableCell>
                              {correlationSymbols[i]} vs {correlationSymbols[j]}
                            </TableCell>
                            <TableCell>{corr.toFixed(3)}</TableCell>
                            <TableCell>
                              <Chip
                                label={Math.abs(corr) > 0.7 ? 'Strong' : Math.abs(corr) > 0.4 ? 'Moderate' : 'Weak'}
                                color={Math.abs(corr) > 0.7 ? 'error' : Math.abs(corr) > 0.4 ? 'warning' : 'success'}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Volatility Tab */}
            {activeTab === 2 && analyticsData?.volatility && (
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.volatility.forecastData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="historical"
                      stroke="#8884d8"
                      name="Historical Volatility"
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="#82ca9d"
                      name="Forecasted Volatility"
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <TableContainer sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Metric</TableCell>
                        <TableCell>Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Current Volatility</TableCell>
                        <TableCell>{(analyticsData.volatility.currentVolatility * 100).toFixed(2)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Forecasted Volatility (30d)</TableCell>
                        <TableCell>{(analyticsData.volatility.forecastedVolatility * 100).toFixed(2)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Volatility Trend</TableCell>
                        <TableCell>
                          <Chip
                            label={analyticsData.volatility.trend}
                            color={analyticsData.volatility.trend === 'Increasing' ? 'error' : 'success'}
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default AdvancedAnalytics; 