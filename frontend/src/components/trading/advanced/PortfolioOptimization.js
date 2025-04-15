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
  Slider,
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useSnackbar } from 'notistack';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const PortfolioOptimization = () => {
  const [symbols, setSymbols] = useState([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [constraints, setConstraints] = useState({
    minWeight: 0,
    maxWeight: 1,
    sectorLimit: 0.4,
    useSectorLimits: false
  });
  const { enqueueSnackbar } = useSnackbar();

  const addSymbol = () => {
    if (newSymbol && !symbols.includes(newSymbol.toUpperCase())) {
      setSymbols([...symbols, newSymbol.toUpperCase()]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbol) => {
    setSymbols(symbols.filter(s => s !== symbol));
  };

  const optimizePortfolio = async () => {
    if (symbols.length < 2) {
      enqueueSnackbar('Please add at least 2 symbols', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/portfolio/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbols,
          constraints
        })
      });
      const data = await response.json();
      setOptimizationResults(data);
      enqueueSnackbar('Portfolio optimized successfully', { variant: 'success' });
    } catch (error) {
      setError('Failed to optimize portfolio');
      enqueueSnackbar('Failed to optimize portfolio', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConstraintChange = (field, value) => {
    setConstraints(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateRebalancingRecommendations = () => {
    if (!optimizationResults) return null;

    return optimizationResults.weights.map((weight, index) => ({
      symbol: symbols[index],
      currentWeight: 0, // This should come from the user's current portfolio
      targetWeight: weight,
      recommendedAction: weight > 0 ? 'BUY' : 'SELL',
      amount: Math.abs(weight) // This should be calculated based on portfolio value
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Portfolio Optimization
      </Typography>

      <Grid container spacing={3}>
        {/* Symbol Input */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Add Symbol"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={addSymbol}
                  disabled={!newSymbol}
                >
                  Add Symbol
                </Button>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {symbols.map(symbol => (
                <Chip
                  key={symbol}
                  label={symbol}
                  onDelete={() => removeSymbol(symbol)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Optimization Constraints */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Optimization Constraints
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography gutterBottom>Minimum Weight</Typography>
                <Slider
                  value={constraints.minWeight}
                  onChange={(_, value) => handleConstraintChange('minWeight', value)}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Typography variant="caption" display="block" align="center">
                  {constraints.minWeight.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>Maximum Weight</Typography>
                <Slider
                  value={constraints.maxWeight}
                  onChange={(_, value) => handleConstraintChange('maxWeight', value)}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Typography variant="caption" display="block" align="center">
                  {constraints.maxWeight.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={constraints.useSectorLimits}
                      onChange={(e) => handleConstraintChange('useSectorLimits', e.target.checked)}
                    />
                  }
                  label="Use Sector Limits"
                />
              </Grid>
              {constraints.useSectorLimits && (
                <Grid item xs={12}>
                  <Typography gutterBottom>Sector Limit</Typography>
                  <Slider
                    value={constraints.sectorLimit}
                    onChange={(_, value) => handleConstraintChange('sectorLimit', value)}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                  <Typography variant="caption" display="block" align="center">
                    {constraints.sectorLimit.toFixed(2)}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={optimizePortfolio}
                  disabled={loading || symbols.length < 2}
                >
                  {loading ? <CircularProgress size={24} /> : 'Optimize Portfolio'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Optimization Results */}
        {optimizationResults && (
          <>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Optimization Results
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">Portfolio Metrics</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>Expected Return</TableCell>
                            <TableCell>{(optimizationResults.expectedReturn * 100).toFixed(2)}%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Standard Deviation</TableCell>
                            <TableCell>{(optimizationResults.standardDeviation * 100).toFixed(2)}%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Sharpe Ratio</TableCell>
                            <TableCell>{optimizationResults.sharpeRatio.toFixed(2)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Beta</TableCell>
                            <TableCell>{optimizationResults.beta.toFixed(2)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Alpha</TableCell>
                            <TableCell>{(optimizationResults.alpha * 100).toFixed(2)}%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">Optimal Weights</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Symbol</TableCell>
                            <TableCell>Weight</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {optimizationResults.weights.map((weight, index) => (
                            <TableRow key={symbols[index]}>
                              <TableCell>{symbols[index]}</TableCell>
                              <TableCell>{(weight * 100).toFixed(2)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Portfolio Allocation Chart */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Portfolio Allocation
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={optimizationResults.weights.map((weight, index) => ({
                          name: symbols[index],
                          value: weight * 100
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {optimizationResults.weights.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Rebalancing Recommendations */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Rebalancing Recommendations
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Symbol</TableCell>
                        <TableCell>Current Weight</TableCell>
                        <TableCell>Target Weight</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calculateRebalancingRecommendations()?.map(rec => (
                        <TableRow key={rec.symbol}>
                          <TableCell>{rec.symbol}</TableCell>
                          <TableCell>{(rec.currentWeight * 100).toFixed(2)}%</TableCell>
                          <TableCell>{(rec.targetWeight * 100).toFixed(2)}%</TableCell>
                          <TableCell>
                            <Chip
                              label={rec.recommendedAction}
                              color={rec.recommendedAction === 'BUY' ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>{rec.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </>
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

export default PortfolioOptimization; 