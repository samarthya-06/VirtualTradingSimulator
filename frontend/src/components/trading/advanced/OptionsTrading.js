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
  Tab
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

const OptionsTrading = () => {
  const [symbol, setSymbol] = useState('');
  const [optionsChain, setOptionsChain] = useState(null);
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const { enqueueSnackbar } = useSnackbar();

  // Strategy form state
  const [strategyForm, setStrategyForm] = useState({
    name: '',
    description: '',
    category: 'SPREAD',
    legs: []
  });

  // Greeks visualization data
  const [greeksData, setGreeksData] = useState(null);

  const fetchOptionsChain = async () => {
    if (!symbol) {
      enqueueSnackbar('Please enter a symbol', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/options/chain/${symbol}`);
      const data = await response.json();
      setOptionsChain(data);
      if (data.expiries.length > 0) {
        setSelectedExpiry(data.expiries[0]);
      }
      enqueueSnackbar('Options chain fetched successfully', { variant: 'success' });
    } catch (error) {
      setError('Failed to fetch options chain');
      enqueueSnackbar('Failed to fetch options chain', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addLeg = () => {
    setStrategyForm(prev => ({
      ...prev,
      legs: [
        ...prev.legs,
        {
          symbol,
          strike: 0,
          expiry: selectedExpiry,
          isCall: true,
          isLong: true,
          quantity: 1
        }
      ]
    }));
  };

  const updateLeg = (index, field, value) => {
    setStrategyForm(prev => ({
      ...prev,
      legs: prev.legs.map((leg, i) =>
        i === index ? { ...leg, [field]: value } : leg
      )
    }));
  };

  const removeLeg = (index) => {
    setStrategyForm(prev => ({
      ...prev,
      legs: prev.legs.filter((_, i) => i !== index)
    }));
  };

  const handleStrategySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/options/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(strategyForm)
      });
      const data = await response.json();
      enqueueSnackbar('Strategy created successfully', { variant: 'success' });
      setStrategyForm({
        name: '',
        description: '',
        category: 'SPREAD',
        legs: []
      });
    } catch (error) {
      setError('Failed to create strategy');
      enqueueSnackbar('Failed to create strategy', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const calculateStrategyPayoff = () => {
    if (!optionsChain || !strategyForm.legs.length) return null;

    const currentPrice = optionsChain.currentPrice;
    const priceRange = Array.from(
      { length: 41 },
      (_, i) => currentPrice * (0.8 + (i * 0.01))
    );

    return priceRange.map(price => {
      let payoff = 0;
      strategyForm.legs.forEach(leg => {
        const optionPayoff = leg.isCall
          ? Math.max(price - leg.strike, 0)
          : Math.max(leg.strike - price, 0);
        payoff += leg.quantity * (leg.isLong ? optionPayoff : -optionPayoff);
      });
      return { price, payoff };
    });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Options Trading
      </Typography>

      <Grid container spacing={3}>
        {/* Options Chain Input */}
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
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Expiry</InputLabel>
                  <Select
                    value={selectedExpiry || ''}
                    onChange={(e) => setSelectedExpiry(e.target.value)}
                  >
                    {optionsChain?.expiries.map(expiry => (
                      <MenuItem key={expiry} value={expiry}>
                        {new Date(expiry).toLocaleDateString()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={fetchOptionsChain}
                  disabled={loading || !symbol}
                >
                  {loading ? <CircularProgress size={24} /> : 'Fetch Options Chain'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Options Chain Display */}
        {optionsChain && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Options Chain
              </Typography>
              <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label="Calls" />
                <Tab label="Puts" />
              </Tabs>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Strike</TableCell>
                      <TableCell>Last Price</TableCell>
                      <TableCell>Bid</TableCell>
                      <TableCell>Ask</TableCell>
                      <TableCell>Volume</TableCell>
                      <TableCell>Open Interest</TableCell>
                      <TableCell>IV</TableCell>
                      <TableCell>Delta</TableCell>
                      <TableCell>Gamma</TableCell>
                      <TableCell>Theta</TableCell>
                      <TableCell>Vega</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(activeTab === 0 ? optionsChain.calls : optionsChain.puts)
                      .filter(option => option.expiry === selectedExpiry)
                      .map(option => (
                        <TableRow key={option.strike}>
                          <TableCell>{option.strike}</TableCell>
                          <TableCell>{option.lastPrice.toFixed(2)}</TableCell>
                          <TableCell>{option.bid.toFixed(2)}</TableCell>
                          <TableCell>{option.ask.toFixed(2)}</TableCell>
                          <TableCell>{option.volume}</TableCell>
                          <TableCell>{option.openInterest}</TableCell>
                          <TableCell>{(option.impliedVolatility * 100).toFixed(1)}%</TableCell>
                          <TableCell>{option.delta.toFixed(3)}</TableCell>
                          <TableCell>{option.gamma.toFixed(3)}</TableCell>
                          <TableCell>{option.theta.toFixed(3)}</TableCell>
                          <TableCell>{option.vega.toFixed(3)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}

        {/* Strategy Builder */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Create Options Strategy
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
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={strategyForm.category}
                      onChange={(e) => setStrategyForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <MenuItem value="SPREAD">Spread</MenuItem>
                      <MenuItem value="STRADDLE">Straddle</MenuItem>
                      <MenuItem value="STRANGLE">Strangle</MenuItem>
                      <MenuItem value="BUTTERFLY">Butterfly</MenuItem>
                      <MenuItem value="IRON_CONDOR">Iron Condor</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    onClick={addLeg}
                    disabled={!optionsChain || !selectedExpiry}
                    sx={{ mb: 2 }}
                  >
                    Add Leg
                  </Button>
                  {strategyForm.legs.map((leg, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                              value={leg.isCall ? 'CALL' : 'PUT'}
                              onChange={(e) => updateLeg(index, 'isCall', e.target.value === 'CALL')}
                            >
                              <MenuItem value="CALL">Call</MenuItem>
                              <MenuItem value="PUT">Put</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth>
                            <InputLabel>Position</InputLabel>
                            <Select
                              value={leg.isLong ? 'LONG' : 'SHORT'}
                              onChange={(e) => updateLeg(index, 'isLong', e.target.value === 'LONG')}
                            >
                              <MenuItem value="LONG">Long</MenuItem>
                              <MenuItem value="SHORT">Short</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Strike"
                            value={leg.strike}
                            onChange={(e) => updateLeg(index, 'strike', Number(e.target.value))}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Quantity"
                            value={leg.quantity}
                            onChange={(e) => updateLeg(index, 'quantity', Number(e.target.value))}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => removeLeg(index)}
                          >
                            Remove Leg
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
                    disabled={loading || !strategyForm.legs.length}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Create Strategy'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>

        {/* Strategy Payoff Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Strategy Payoff
            </Typography>
            {strategyForm.legs.length > 0 && (
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={calculateStrategyPayoff()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="price" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="payoff"
                      stroke="#8884d8"
                      name="Strategy Payoff"
                    />
                  </LineChart>
                </ResponsiveContainer>
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

export default OptionsTrading; 