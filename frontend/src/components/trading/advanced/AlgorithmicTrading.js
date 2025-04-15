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
  Chip,
  Slider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useSnackbar } from 'notistack';

const AlgorithmicTrading = () => {
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [backtestResults, setBacktestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  // Strategy form state
  const [strategyForm, setStrategyForm] = useState({
    name: '',
    description: '',
    category: 'MOMENTUM',
    initialCapital: 100000,
    maxPositions: 5,
    rules: []
  });

  // Backtest parameters
  const [backtestParams, setBacktestParams] = useState({
    symbol: '',
    startDate: '',
    endDate: '',
    initialCapital: 100000
  });

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/strategies');
      const data = await response.json();
      setStrategies(data);
    } catch (error) {
      setError('Failed to fetch strategies');
      enqueueSnackbar('Failed to fetch strategies', { variant: 'error' });
    }
  };

  const handleStrategySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(strategyForm)
      });
      const data = await response.json();
      setStrategies([...strategies, data]);
      enqueueSnackbar('Strategy created successfully', { variant: 'success' });
      setStrategyForm({
        name: '',
        description: '',
        category: 'MOMENTUM',
        initialCapital: 100000,
        maxPositions: 5,
        rules: []
      });
    } catch (error) {
      setError('Failed to create strategy');
      enqueueSnackbar('Failed to create strategy', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBacktest = async () => {
    if (!selectedStrategy) {
      enqueueSnackbar('Please select a strategy first', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/strategies/${selectedStrategy._id}/backtest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backtestParams)
      });
      const data = await response.json();
      setBacktestResults(data);
      enqueueSnackbar('Backtest completed successfully', { variant: 'success' });
    } catch (error) {
      setError('Failed to run backtest');
      enqueueSnackbar('Failed to run backtest', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addRule = () => {
    setStrategyForm(prev => ({
      ...prev,
      rules: [
        ...prev.rules,
        {
          indicator: 'RSI',
          period: 14,
          condition: 'GT',
          value: 70,
          action: 'SELL'
        }
      ]
    }));
  };

  const updateRule = (index, field, value) => {
    setStrategyForm(prev => ({
      ...prev,
      rules: prev.rules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const removeRule = (index) => {
    setStrategyForm(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Algorithmic Trading
      </Typography>

      <Grid container spacing={3}>
        {/* Strategy List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Your Strategies
            </Typography>
            {strategies.map(strategy => (
              <Chip
                key={strategy._id}
                label={strategy.name}
                onClick={() => setSelectedStrategy(strategy)}
                color={selectedStrategy?._id === strategy._id ? 'primary' : 'default'}
                sx={{ m: 0.5 }}
              />
            ))}
          </Paper>
        </Grid>

        {/* Strategy Builder */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Create New Strategy
            </Typography>
            <form onSubmit={handleStrategySubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Strategy Name"
                    value={strategyForm.name}
                    onChange={(e) => setStrategyForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={strategyForm.description}
                    onChange={(e) => setStrategyForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={strategyForm.category}
                      onChange={(e) => setStrategyForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <MenuItem value="MOMENTUM">Momentum</MenuItem>
                      <MenuItem value="MEAN_REVERSION">Mean Reversion</MenuItem>
                      <MenuItem value="BREAKOUT">Breakout</MenuItem>
                      <MenuItem value="SCALPING">Scalping</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Initial Capital"
                    value={strategyForm.initialCapital}
                    onChange={(e) => setStrategyForm(prev => ({ ...prev, initialCapital: Number(e.target.value) }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    onClick={addRule}
                    sx={{ mb: 2 }}
                  >
                    Add Rule
                  </Button>
                  {strategyForm.rules.map((rule, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth>
                            <InputLabel>Indicator</InputLabel>
                            <Select
                              value={rule.indicator}
                              onChange={(e) => updateRule(index, 'indicator', e.target.value)}
                            >
                              <MenuItem value="RSI">RSI</MenuItem>
                              <MenuItem value="MACD">MACD</MenuItem>
                              <MenuItem value="BB">Bollinger Bands</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Period"
                            value={rule.period}
                            onChange={(e) => updateRule(index, 'period', Number(e.target.value))}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth>
                            <InputLabel>Condition</InputLabel>
                            <Select
                              value={rule.condition}
                              onChange={(e) => updateRule(index, 'condition', e.target.value)}
                            >
                              <MenuItem value="GT">Greater Than</MenuItem>
                              <MenuItem value="LT">Less Than</MenuItem>
                              <MenuItem value="CROSS_ABOVE">Cross Above</MenuItem>
                              <MenuItem value="CROSS_BELOW">Cross Below</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Value"
                            value={rule.value}
                            onChange={(e) => updateRule(index, 'value', Number(e.target.value))}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => removeRule(index)}
                          >
                            Remove Rule
                          </Button>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Create Strategy'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>

        {/* Backtesting */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Backtesting
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Symbol"
                  value={backtestParams.symbol}
                  onChange={(e) => setBacktestParams(prev => ({ ...prev, symbol: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={backtestParams.startDate}
                  onChange={(e) => setBacktestParams(prev => ({ ...prev, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="End Date"
                  value={backtestParams.endDate}
                  onChange={(e) => setBacktestParams(prev => ({ ...prev, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Initial Capital"
                  value={backtestParams.initialCapital}
                  onChange={(e) => setBacktestParams(prev => ({ ...prev, initialCapital: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleBacktest}
                  disabled={loading || !selectedStrategy}
                >
                  {loading ? <CircularProgress size={24} /> : 'Run Backtest'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Backtest Results */}
        {backtestResults && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Backtest Results
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1">Performance Metrics</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography>Total Return: {backtestResults.metrics.totalReturn.toFixed(2)}%</Typography>
                    <Typography>Annualized Return: {backtestResults.metrics.annualizedReturn.toFixed(2)}%</Typography>
                    <Typography>Sharpe Ratio: {backtestResults.metrics.sharpeRatio.toFixed(2)}</Typography>
                    <Typography>Max Drawdown: {backtestResults.metrics.maxDrawdown.toFixed(2)}%</Typography>
                    <Typography>Win Rate: {backtestResults.metrics.winRate.toFixed(2)}%</Typography>
                    <Typography>Profit Factor: {backtestResults.metrics.profitFactor.toFixed(2)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1">Equity Curve</Typography>
                  <Box sx={{ height: 300, mt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={backtestResults.equity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#8884d8"
                          name="Portfolio Value"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default AlgorithmicTrading; 