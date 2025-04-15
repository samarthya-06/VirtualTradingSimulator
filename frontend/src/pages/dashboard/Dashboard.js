import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ArrowUpward,
  ArrowDownward,
  ShowChart,
  BarChart,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getPortfolio } from '../../features/trading/tradingSlice';
import { getWalletBalance } from '../../features/wallet/walletSlice';
import { getWatchlist } from '../../features/watchlist/watchlistSlice';
import { getTransactions } from '../../features/transactions/transactionsSlice';
import MarketCountdown from '../../components/dashboard/MarketCountdown';
import OnboardingGuide from '../../components/onboarding/OnboardingGuide';
import DashboardSettings from '../../components/dashboard/DashboardSettings';
import MarketNewsWidget from '../../components/dashboard/MarketNewsWidget';
import clearRemovedWidgets from '../../utils/clearDashboardWidgets';

// Default widgets configuration (same as in DashboardSettings)
const DEFAULT_WIDGETS = [
  { id: 'portfolio-summary', label: 'Portfolio Summary', enabled: true, order: 1 },
  { id: 'market-overview', label: 'Market Overview', enabled: true, order: 2 },
  { id: 'performance-chart', label: 'Performance Chart', enabled: true, order: 3 },
  { id: 'recent-trades', label: 'Recent Trades', enabled: true, order: 4 },
  { id: 'market-news', label: 'Market News', enabled: true, order: 5 }
];

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { portfolio, isLoading: portfolioLoading } = useSelector((state) => state.trading);
  const { isLoading: walletLoading } = useSelector((state) => state.wallet || {});
  const { isLoading: watchlistLoading } = useSelector((state) => state.watchlist);
  const { transactions = [], isLoading: transactionsLoading } = useSelector((state) => state.transactions || {});
  const { isLoading: marketLoading } = useSelector((state) => state.market);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);

  useEffect(() => {
    // Check if user has completed onboarding
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    if (!onboardingCompleted) {
      setOnboardingOpen(true);
    }

    // First, ensure any removed widgets are cleared from localStorage
    clearRemovedWidgets();

    // Load saved widget configuration
    const savedWidgets = localStorage.getItem('dashboardWidgets');
    if (savedWidgets) {
      try {
        const parsedWidgets = JSON.parse(savedWidgets);

        // Double-check to filter out removed widgets (belt and suspenders approach)
        const filteredWidgets = parsedWidgets.filter(widget =>
          !['watchlist-summary', 'top-movers', 'upcoming-events'].includes(widget.id)
        );

        // Update order property
        const updatedWidgets = filteredWidgets.map((widget, index) => ({
          ...widget,
          order: index + 1
        }));

        // Save the filtered widgets back to localStorage
        localStorage.setItem('dashboardWidgets', JSON.stringify(updatedWidgets));

        setWidgets(updatedWidgets);
      } catch (error) {
        console.error('Error parsing saved dashboard widgets:', error);
        // If there's an error, reset to default widgets
        localStorage.setItem('dashboardWidgets', JSON.stringify(DEFAULT_WIDGETS));
        setWidgets(DEFAULT_WIDGETS);
      }
    } else {
      // If no saved widgets, set default widgets
      localStorage.setItem('dashboardWidgets', JSON.stringify(DEFAULT_WIDGETS));
    }

    dispatch(getPortfolio());
    dispatch(getWalletBalance());
    dispatch(getWatchlist());
    dispatch(getTransactions());
  }, [dispatch]);

  const calculateTotalValue = () => {
    if (!portfolio?.holdings || portfolio.holdings.length === 0) return 0;
    return portfolio.holdings.reduce(
      (total, holding) => total + (holding.currentValue || 0),
      0
    );
  };

  const calculateTotalInvestment = () => {
    if (!portfolio?.holdings || portfolio.holdings.length === 0) return 0;
    return portfolio.holdings.reduce(
      (total, holding) => total + (holding.quantity * holding.averageBuyPrice || 0),
      0
    );
  };

  const calculateTotalProfitLoss = () => {
    if (!portfolio?.holdings || portfolio.holdings.length === 0) return 0;
    return portfolio.holdings.reduce(
      (total, holding) => {
        const investment = holding.quantity * holding.averageBuyPrice;
        const profitLoss = holding.currentValue - investment;
        return total + profitLoss;
      },
      0
    );
  };

  // Get the order of widgets for layout
  const getWidgetOrder = () => {
    return widgets
      .filter(w => w.enabled)
      .sort((a, b) => a.order - b.order)
      .map(w => w.id);
  };

  if (portfolioLoading || watchlistLoading || marketLoading || walletLoading || transactionsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const totalValue = calculateTotalValue();
  const totalInvestment = calculateTotalInvestment();
  // eslint-disable-next-line no-unused-vars
  const totalProfitLoss = calculateTotalProfitLoss();

  return (
    <Container maxWidth="xl">
      <OnboardingGuide
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Dashboard
          </Typography>
          <DashboardSettings />
        </Box>

        {/* Render widgets based on user preferences */}
        <Grid container spacing={3}>
          {getWidgetOrder().map(widgetId => {
            switch (widgetId) {
              case 'portfolio-summary':
                return (
                  <Grid item xs={12} md={6} key={widgetId}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Portfolio Summary</Typography>
                        <Typography variant="h4">
                          ₹{totalValue.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Investment: ₹{totalInvestment.toFixed(2)}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Button
                            variant="outlined"
                            startIcon={<AccountBalance />}
                            onClick={() => navigate('/app/portfolio')}
                          >
                            View Portfolio
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              case 'market-overview':
                return (
                  <Grid item xs={12} md={6} key={widgetId}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Market Overview</Typography>
                        <MarketCountdown />
                      </CardContent>
                    </Card>
                  </Grid>
                );
              case 'performance-chart':
                return (
                  <Grid item xs={12} md={6} key={widgetId}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Performance Summary</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <ShowChart sx={{ mr: 1, color: 'primary.main' }} />
                              <Typography variant="subtitle1">Portfolio Metrics</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Total Holdings
                              </Typography>
                              <Typography variant="h6">
                                {portfolio?.holdings?.length || 0} Stocks
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Diversification
                              </Typography>
                              <Typography variant="h6">
                                {portfolio?.holdings?.length > 0 ?
                                  `${Math.min(portfolio.holdings.length * 10, 100)}%` :
                                  '0%'}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Best Performer
                              </Typography>
                              {portfolio?.holdings?.length > 0 ? (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {(() => {
                                    // Find the best performer
                                    const bestPerformer = portfolio.holdings.reduce((best, current) => {
                                      if (!best) return current;
                                      if (!current) return best;

                                      const bestReturn = best.quantity && best.averageBuyPrice
                                        ? (best.currentValue - (best.quantity * best.averageBuyPrice)) / (best.quantity * best.averageBuyPrice) * 100
                                        : 0;
                                      const currentReturn = current.quantity && current.averageBuyPrice
                                        ? (current.currentValue - (current.quantity * current.averageBuyPrice)) / (current.quantity * current.averageBuyPrice) * 100
                                        : 0;

                                      return currentReturn > bestReturn ? current : best;
                                    }, portfolio.holdings[0]);

                                    // Calculate return percentage
                                    const returnPercentage = bestPerformer.quantity && bestPerformer.averageBuyPrice
                                      ? (bestPerformer.currentValue - (bestPerformer.quantity * bestPerformer.averageBuyPrice)) / (bestPerformer.quantity * bestPerformer.averageBuyPrice) * 100
                                      : 0;

                                    return (
                                      <>
                                        <Typography variant="h6" sx={{ mr: 1 }}>
                                          {bestPerformer.symbol || 'N/A'}
                                        </Typography>
                                        <Typography variant="body2" color="success.main">
                                          +{returnPercentage.toFixed(2)}%
                                        </Typography>
                                        <TrendingUp color="success" sx={{ ml: 0.5 }} />
                                      </>
                                    );
                                  })()}
                                </Box>
                              ) : (
                                <Typography variant="h6">-</Typography>
                              )}
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Worst Performer
                              </Typography>
                              {portfolio?.holdings?.length > 0 ? (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {(() => {
                                    // Find the worst performer
                                    const worstPerformer = portfolio.holdings.reduce((worst, current) => {
                                      if (!worst) return current;
                                      if (!current) return worst;

                                      const worstReturn = worst.quantity && worst.averageBuyPrice
                                        ? (worst.currentValue - (worst.quantity * worst.averageBuyPrice)) / (worst.quantity * worst.averageBuyPrice) * 100
                                        : 0;
                                      const currentReturn = current.quantity && current.averageBuyPrice
                                        ? (current.currentValue - (current.quantity * current.averageBuyPrice)) / (current.quantity * current.averageBuyPrice) * 100
                                        : 0;

                                      return currentReturn < worstReturn ? current : worst;
                                    }, portfolio.holdings[0]);

                                    // Calculate return percentage
                                    const returnPercentage = worstPerformer.quantity && worstPerformer.averageBuyPrice
                                      ? (worstPerformer.currentValue - (worstPerformer.quantity * worstPerformer.averageBuyPrice)) / (worstPerformer.quantity * worstPerformer.averageBuyPrice) * 100
                                      : 0;

                                    return (
                                      <>
                                        <Typography variant="h6" sx={{ mr: 1 }}>
                                          {worstPerformer.symbol || 'N/A'}
                                        </Typography>
                                        <Typography variant="body2" color="error.main">
                                          {returnPercentage.toFixed(2)}%
                                        </Typography>
                                        <TrendingDown color="error" sx={{ ml: 0.5 }} />
                                      </>
                                    );
                                  })()}
                                </Box>
                              ) : (
                                <Typography variant="h6">-</Typography>
                              )}
                            </Box>
                          </Grid>
                        </Grid>
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            startIcon={<BarChart />}
                            onClick={() => navigate('/app/portfolio')}
                          >
                            View Detailed Analysis
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              case 'recent-trades':
                return (
                  <Grid item xs={12} md={6} key={widgetId}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Recent Transactions
                        </Typography>
                        <List>
                          {transactions.slice(0, 5).map((transaction, index) => (
                            <React.Fragment key={transaction.id || transaction._id || index}>
                              <ListItem>
                                <ListItemIcon>
                                  {transaction.type === 'BUY' || transaction.type === 'SELL' ? (
                                    transaction.type === 'BUY' ? (
                                      <ArrowUpward color="success" />
                                    ) : (
                                      <ArrowDownward color="error" />
                                    )
                                  ) : transaction.type === 'CREDIT' || transaction.type?.toLowerCase() === 'credit' ? (
                                    <ArrowUpward color="success" />
                                  ) : (
                                    <ArrowDownward color="error" />
                                  )}
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    transaction.type === 'BUY' || transaction.type === 'SELL'
                                      ? `${transaction.type} ${transaction.quantity || ''} ${transaction.symbol || ''}`
                                      : `${transaction.type || 'Transaction'}`
                                  }
                                  secondary={
                                    transaction.timestamp || transaction.createdAt
                                      ? new Date(transaction.timestamp || transaction.createdAt).toLocaleString()
                                      : 'No date available'
                                  }
                                />
                                <Typography
                                  variant="body2"
                                  color={
                                    transaction.type === 'BUY' || transaction.type?.toLowerCase() === 'debit'
                                      ? 'error.main'
                                      : 'success.main'
                                  }
                                >
                                  {transaction.type === 'BUY' || transaction.type?.toLowerCase() === 'debit' ? '-' : '+'}
                                  ₹{(transaction.amount || 0).toFixed(2)}
                                </Typography>
                              </ListItem>
                              {index < Math.min(transactions.length, 5) - 1 && <Divider variant="inset" component="li" />}
                            </React.Fragment>
                          ))}
                          {transactions.length === 0 && (
                            <ListItem>
                              <ListItemText primary="No recent transactions" />
                            </ListItem>
                          )}
                        </List>
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            onClick={() => navigate('/app/transactions')}
                          >
                            View All Transactions
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );

              case 'market-news':
                return (
                  <Grid item xs={12} md={6} key={widgetId}>
                    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <CardContent sx={{ p: 2.5 }}>
                        <MarketNewsWidget />
                      </CardContent>
                    </Card>
                  </Grid>
                );

              default:
                return null;
            }
          })}
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;