import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  useTheme,
  Switch,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Star,
  TrendingUp,
  ShowChart,
  Newspaper,
  BarChart,
  Speed,
  Notifications,
  Check,
  Close,
} from '@mui/icons-material';
import { updateMembership } from '../../features/auth/authSlice';
import { initializeRazorpay } from '../../services/razorpayService';
import membershipService from '../../services/membershipService';

const Membership = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch current membership details if user is logged in
    if (user && user.token) {
      const fetchMembership = async () => {
        try {
          await membershipService.getCurrentMembership();
        } catch (error) {
          console.error('Error fetching membership:', error);
        }
      };

      fetchMembership();
    }
  }, [user]);

  const handleBillingCycleChange = () => {
    setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly');
  };

  const handleUpgrade = async (plan) => {
    if (!user) {
      setSnackbarMessage('Please log in to upgrade your membership');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setIsLoading(true);

    try {
      // Create order on the server
      const orderData = await membershipService.createMembershipOrder(
        { plan, billingCycle }
      );

      // Initialize Razorpay payment
      initializeRazorpay(
        {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.orderId,
          name: 'Virtual Trading Simulator',
          description: `${plan.toUpperCase()} Membership (${billingCycle})`,
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.profile?.phone || '',
          },
        },
        // Success callback
        async (response) => {
          try {
            // Verify payment on the server
            // eslint-disable-next-line no-unused-vars
            const verificationData = await membershipService.verifyMembershipPayment(
              {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                plan,
                billingCycle,
              }
            );

            // Update local state
            dispatch(updateMembership({ plan }))
              .unwrap()
              .then(() => {
                setSnackbarMessage(`Successfully upgraded to ${plan} plan!`);
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
                // Log verification data for debugging
                console.log('Payment verification successful:', verificationData);
              });
          } catch (error) {
            console.error('Payment verification failed:', error);
            setSnackbarMessage(`Payment verification failed: ${error.message || 'Unknown error'}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
          } finally {
            setIsLoading(false);
          }
        },
        // Error callback
        (error) => {
          console.error('Payment failed:', error);
          setSnackbarMessage(`Payment failed: ${error.description || 'Unknown error'}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Error creating order:', error);
      setSnackbarMessage(`Error creating order: ${error.message || 'Unknown error'}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const plans = [
    {
      name: 'Free',
      description: 'Basic features for casual virtual traders',
      price: { monthly: 0, annual: 0 },
      features: [
        { name: '5,000 virtual coins to start', included: true },
        { name: 'Basic market data', included: true },
        { name: 'Limited stock search', included: true },
        { name: 'Basic portfolio tracking', included: true },
        { name: 'Standard charts', included: true },
        { name: 'Delayed market data (15 min)', included: true },
        { name: 'Real-time market data', included: false },
        { name: 'Advanced analytics', included: false },
        { name: 'Advanced charts with indicators', included: false },
        { name: 'News integration', included: false },
        { name: 'Unlimited stock search', included: false },
      ],
      color: theme.palette.grey[700],
      buttonText: user?.membership === 'free' ? 'Current Plan' : 'Downgrade',
      buttonDisabled: user?.membership === 'free',
      plan: 'free',
    },
    {
      name: 'Pro',
      description: 'Advanced features for serious virtual traders',
      price: { monthly: 499, annual: 4999 },
      features: [
        { name: '25,000 virtual coins to start', included: true },
        { name: 'Advanced market data', included: true },
        { name: 'Unlimited stock search', included: true },
        { name: 'Advanced portfolio tracking', included: true },
        { name: 'Advanced charts with indicators', included: true },
        { name: 'Real-time market data', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'News integration', included: true },
        { name: 'Advanced technical indicators', included: true },
        { name: 'Real-time profit/loss tracking', included: true },
        { name: 'Custom price alerts', included: true },
      ],
      color: theme.palette.primary.main,
      buttonText: user?.membership === 'pro' ? 'Current Plan' : 'Upgrade',
      buttonDisabled: user?.membership === 'pro',
      plan: 'pro',
      highlighted: true,
    },
  ];

  const features = [
    {
      title: 'Virtual Trading Coins',
      description: 'Start with 25,000 virtual coins (₹500 value) to build your portfolio',
      icon: <TrendingUp />,
    },
    {
      title: 'Real-time Market Data',
      description: 'Get access to real-time market data with no delays for accurate trading',
      icon: <Speed />,
    },
    {
      title: 'Advanced Charts',
      description: 'Technical analysis tools and advanced chart patterns for better decisions',
      icon: <ShowChart />,
    },
    {
      title: 'News Integration',
      description: 'Latest news and analysis for all stocks to stay informed',
      icon: <Newspaper />,
    },
    {
      title: 'Live Profit/Loss Tracking',
      description: 'Real-time portfolio performance metrics and risk assessment',
      icon: <BarChart />,
    },
    {
      title: 'Custom Alerts',
      description: 'Set custom alerts for price movements and market opportunities',
      icon: <Notifications />,
    },
  ];

  // FAQ content is directly used in the JSX below

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Membership Plans
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Upgrade your virtual trading experience with our pro features
        </Typography>

        {/* Billing Cycle Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 6 }}>
          <Typography variant={billingCycle === 'monthly' ? 'subtitle1' : 'body1'} color={billingCycle === 'monthly' ? 'text.primary' : 'text.secondary'}>
            Monthly
          </Typography>
          <Switch
            checked={billingCycle === 'annual'}
            onChange={handleBillingCycleChange}
            color="primary"
            sx={{ mx: 1 }}
          />
          <Typography variant={billingCycle === 'annual' ? 'subtitle1' : 'body1'} color={billingCycle === 'annual' ? 'text.primary' : 'text.secondary'}>
            Annual
            <Box component="span" sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'success.main', color: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
              Save 20%
            </Box>
          </Typography>
        </Box>

        {/* Pricing Cards */}
        <Grid container spacing={4} sx={{ mb: 6, justifyContent: 'center' }}>
          {plans.map((plan) => (
            <Grid item xs={12} md={6} key={plan.name}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: plan.highlighted ? `2px solid ${plan.color}` : 'none',
                  boxShadow: plan.highlighted ? `0 0 20px rgba(0,0,0,0.2)` : 'none',
                  transform: plan.highlighted ? 'scale(1.02)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {plan.highlighted && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      zIndex: 1,
                    }}
                  >
                    <Chip
                      label="Most Popular"
                      color="primary"
                      size="small"
                      icon={<Star fontSize="small" />}
                    />
                  </Box>
                )}
                <CardHeader
                  title={plan.name}
                  subheader={plan.description}
                  titleTypographyProps={{ align: 'center', variant: 'h5', fontWeight: 600 }}
                  subheaderTypographyProps={{ align: 'center' }}
                  sx={{ bgcolor: 'background.paper', pb: 0 }}
                />
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography component="h2" variant="h3" color="text.primary">
                      ₹{plan.price[billingCycle]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {billingCycle === 'monthly' ? 'per month' : 'per year'}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <List sx={{ flexGrow: 1 }}>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {feature.included ? (
                            <Check color="success" />
                          ) : (
                            <Close color="error" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={feature.name}
                          primaryTypographyProps={{
                            variant: 'body2',
                            color: feature.included ? 'text.primary' : 'text.secondary',
                            style: { textDecoration: feature.included ? 'none' : 'line-through' }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Box sx={{ pt: 3 }}>
                    <Button
                      fullWidth
                      variant={plan.highlighted ? "contained" : "outlined"}
                      color="primary"
                      disabled={plan.buttonDisabled || isLoading}
                      onClick={() => handleUpgrade(plan.plan)}
                    >
                      {isLoading ? 'Processing...' : plan.buttonText}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Features Section */}
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Pro Virtual Trading Features
        </Typography>
        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: 'primary.light',
                      color: 'primary.main'
                    }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6">{feature.title}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* FAQ Section */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Frequently Asked Questions
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    How do I upgrade my plan?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Simply select the plan you want and click the upgrade button. You'll be guided through a secure payment process to complete your subscription.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Can I cancel my subscription anytime?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Yes, you can cancel your subscription at any time. Your pro features will remain active until the end of your billing period.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    What payment methods do you accept?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    We accept all major credit cards, debit cards, UPI, and net banking options for Indian users.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Is this a real money trading platform?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No, this is exclusively a virtual trading simulator. You trade with virtual coins (1 rs = 50 virtual coins) to practice and learn without any financial risk. Free users start with 5,000 coins and Pro users get 25,000 coins.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Membership;