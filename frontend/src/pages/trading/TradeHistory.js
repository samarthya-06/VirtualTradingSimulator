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
  Chip,
  Paper,
  TextField,
  MenuItem,
  Button,
  IconButton,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { getTradeHistory } from '../../features/trading/tradingSlice';
import { useNavigate } from 'react-router-dom';

const TradeHistoryPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tradeHistory, isLoading } = useSelector((state) => state.trading);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    type: '',
    orderType: '',
    status: '',
    dateRange: 'all',
  });

  useEffect(() => {
    dispatch(getTradeHistory());
  }, [dispatch]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilterOptions({
      ...filterOptions,
      [name]: value,
    });
  };

  const handleRefresh = () => {
    dispatch(getTradeHistory());
  };

  const handleViewTrade = (symbol) => {
    navigate(`/trading?symbol=${symbol}`);
  };

  const filteredTrades = tradeHistory
    ? tradeHistory.filter((trade) => {
        // Filter by search query (symbol)
        if (searchQuery) {
          const symbol = typeof trade.stock === 'object' && trade.stock?.symbol 
            ? trade.stock.symbol 
            : trade.symbol || '';
          
          if (!symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
          }
        }

        // Filter by trade type
        if (filterOptions.type && trade.type !== filterOptions.type) {
          return false;
        }

        // Filter by order type
        if (filterOptions.orderType && trade.orderType !== filterOptions.orderType) {
          return false;
        }

        // Filter by status
        if (filterOptions.status && trade.status !== filterOptions.status) {
          return false;
        }

        // Filter by date range
        if (filterOptions.dateRange !== 'all') {
          const tradeDate = new Date(trade.createdAt || trade.executedAt);
          const today = new Date();
          const daysDiff = Math.floor(
            (today - tradeDate) / (1000 * 60 * 60 * 24)
          );

          if (
            (filterOptions.dateRange === 'today' && daysDiff > 0) ||
            (filterOptions.dateRange === 'week' && daysDiff > 7) ||
            (filterOptions.dateRange === 'month' && daysDiff > 30)
          ) {
            return false;
          }
        }

        return true;
      })
    : [];

  // Separate trades based on active tab
  const activeTrades = filteredTrades.filter(
    (trade) => trade.status === 'PENDING' || trade.status === 'PARTIAL'
  );
  const completedTrades = filteredTrades.filter(
    (trade) => trade.status === 'COMPLETED' || trade.status === 'EXECUTED' || trade.status === 'CANCELLED'
  );

  const displayTrades = activeTab === 0 ? filteredTrades : activeTab === 1 ? activeTrades : completedTrades;

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 600 }}>
          Trade History
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search by symbol..."
                  value={searchQuery}
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
              <Grid item xs={12} md={7}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    select
                    name="type"
                    label="Type"
                    value={filterOptions.type}
                    onChange={handleFilterChange}
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="BUY">Buy</MenuItem>
                    <MenuItem value="SELL">Sell</MenuItem>
                  </TextField>
                  <TextField
                    select
                    name="orderType"
                    label="Order Type"
                    value={filterOptions.orderType}
                    onChange={handleFilterChange}
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="MARKET">Market</MenuItem>
                    <MenuItem value="LIMIT">Limit</MenuItem>
                  </TextField>
                  <TextField
                    select
                    name="status"
                    label="Status"
                    value={filterOptions.status}
                    onChange={handleFilterChange}
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="EXECUTED">Executed</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    <MenuItem value="PARTIAL">Partial</MenuItem>
                  </TextField>
                  <TextField
                    select
                    name="dateRange"
                    label="Date Range"
                    value={filterOptions.dateRange}
                    onChange={handleFilterChange}
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="all">All Time</MenuItem>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                  </TextField>
                </Box>
              </Grid>
              <Grid item xs={12} md={1} sx={{ textAlign: 'right' }}>
                <IconButton onClick={handleRefresh} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Grid>
            </Grid>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label="All Trades" />
                <Tab label="Active Orders" />
                <Tab label="Completed Orders" />
              </Tabs>
            </Box>

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : displayTrades.length > 0 ? (
              <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Symbol</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Order Type</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayTrades.map((trade) => (
                      <TableRow key={trade._id} hover>
                        <TableCell>
                          {new Date(trade.createdAt || trade.executedAt || Date.now()).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {typeof trade.stock === 'object' && trade.stock?.symbol 
                            ? trade.stock.symbol 
                            : trade.symbol || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={trade.type}
                            color={trade.type === 'BUY' ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{trade.orderType}</TableCell>
                        <TableCell align="right">{trade.quantity}</TableCell>
                        <TableCell align="right">₹{(trade.price || 0).toFixed(2)}</TableCell>
                        <TableCell align="right">₹{(trade.totalAmount || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={trade.status}
                            color={
                              trade.status === 'COMPLETED' || trade.status === 'EXECUTED' 
                                ? 'success' 
                                : trade.status === 'PENDING' 
                                  ? 'warning'
                                  : 'error'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              const symbol = typeof trade.stock === 'object' && trade.stock?.symbol 
                                ? trade.stock.symbol 
                                : trade.symbol;
                              if (symbol) handleViewTrade(symbol);
                            }}
                            disabled={!(typeof trade.stock === 'object' && trade.stock?.symbol) && !trade.symbol}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No trades found matching your filters
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Trading Statistics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Trades
                  </Typography>
                  <Typography variant="h4">
                    {tradeHistory ? tradeHistory.length : 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Buy Orders
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {tradeHistory
                      ? tradeHistory.filter((t) => t.type === 'BUY').length
                      : 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Sell Orders
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {tradeHistory
                      ? tradeHistory.filter((t) => t.type === 'SELL').length
                      : 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Active Orders
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {tradeHistory
                      ? tradeHistory.filter(
                          (t) => t.status === 'PENDING' || t.status === 'PARTIAL'
                        ).length
                      : 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Completed Orders
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {tradeHistory
                      ? tradeHistory.filter(
                          (t) => t.status === 'COMPLETED' || t.status === 'EXECUTED'
                        ).length
                      : 0}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default TradeHistoryPage;