import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Typography,
  Alert,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Grid,
  Divider,
  Tooltip,
  Switch,
  MenuItem,
  Select,
  Paper,
} from '@mui/material';
import { executeTrade, reset } from '../../features/trading/tradingSlice';
import walletService from '../../services/walletService';

const OrderForm = ({ type = 'MARKET', symbol, portfolio }) => {
  const dispatch = useDispatch();
  const { isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.trading
  );
  const { nseStocks, bseStocks, stockPrices } = useSelector((state) => state.market);

  // Create a normalized portfolio positions object that works with both data structures
  const [normalizedPositions, setNormalizedPositions] = useState({});

  // Debug portfolio data (for development only)
  console.log('Portfolio data in OrderForm:', portfolio);
  console.log('Symbol:', symbol);

  // Normalize portfolio data on component mount or when portfolio changes
  useEffect(() => {
    if (!portfolio) return;

    const positions = {};

    // If portfolio has positions object (frontend structure)
    if (portfolio.positions) {
      Object.assign(positions, portfolio.positions);
    }
    // If portfolio has holdings array (backend structure)
    else if (portfolio.holdings && Array.isArray(portfolio.holdings)) {
      portfolio.holdings.forEach(holding => {
        if (!holding.stock) return;

        const stockSymbol = typeof holding.stock === 'string'
          ? holding.stock
          : holding.stock.symbol;

        if (stockSymbol) {
          positions[stockSymbol] = {
            quantity: holding.quantity,
            averagePrice: holding.averageBuyPrice,
            currentPrice: holding.currentValue / holding.quantity
          };
        }
      });
    }

    setNormalizedPositions(positions);
    console.log('Normalized positions:', positions);
  }, [portfolio]);

  const [formData, setFormData] = useState({
    orderType: 'BUY',
    quantity: '',
    limitPrice: '',
    stopLoss: '',
    takeProfit: '',
    advancedOrderType: 'REGULAR',
    orderValidity: 'DAY',
    useMargin: false,
    tradingStrategy: 'NONE',

  });

  const [error, setError] = useState('');
  const [currentPrice, setCurrentPrice] = useState(null);
  const [totalValue, setTotalValue] = useState(0);
  const [walletBalance, setWalletBalance] = useState(null);
  const [virtualBalance, setVirtualBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  // Add a flag to track if a trade was just executed
  const [tradeExecuted, setTradeExecuted] = useState(false);
  // Add risk assessment state
  const [riskAssessment, setRiskAssessment] = useState({
    riskLevel: 'LOW',
    riskScore: 0,
    message: '',
    visible: false
  });

  // New function to calculate portfolio impact
  const [portfolioImpact, setPortfolioImpact] = useState({
    newHolding: 0,
    newAveragePrice: 0,
    profitLossChange: 0,
    portfolioValueChange: 0,
    showImpact: false
  });

  // Risk assessment calculation
  const calculateRiskAssessment = useCallback((quantity, price) => {
    if (!quantity || !price) return;

    const orderValue = quantity * price;
    let riskScore = 0;
    let riskLevel = 'LOW';
    let message = '';

    // Risk factors to consider
    // 1. Order size relative to wallet balance
    if (walletBalance && formData.orderType === 'BUY') {
      const percentOfBalance = (orderValue / walletBalance) * 100;

      if (percentOfBalance > 50) {
        riskScore += 3;
        message += 'This order uses more than 50% of your available balance. ';
      } else if (percentOfBalance > 25) {
        riskScore += 2;
        message += 'This order uses more than 25% of your available balance. ';
      } else if (percentOfBalance > 10) {
        riskScore += 1;
      }
    }

    // 2. Order size (number of shares)
    if (quantity > 100) {
      riskScore += 2;
      message += 'Large position size. ';
    } else if (quantity > 50) {
      riskScore += 1;
    }

    // 3. Advanced order types add complexity and risk
    if (formData.advancedOrderType !== 'REGULAR') {
      riskScore += 1;
      message += 'Advanced order type increases complexity. ';
    }

    // 4. Stop loss and take profit
    if (!formData.stopLoss && orderValue > 10000) {
      riskScore += 2;
      message += 'Consider adding a stop loss for protection. ';
    }

    // Set risk level based on score
    if (riskScore >= 5) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 3) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    setRiskAssessment({
      riskLevel,
      riskScore,
      message,
      visible: riskScore >= 2 // Only show if there's significant risk
    });
  }, [walletBalance, formData.orderType, formData.advancedOrderType, formData.stopLoss]);

  const calculatePortfolioImpact = useCallback((price, quantity) => {
    if (!symbol || !quantity || quantity <= 0 || !price) {
      setPortfolioImpact(prev => ({ ...prev, showImpact: false }));
      return;
    }

    // Use the normalized positions object
    const position = normalizedPositions[symbol];

    const isBuy = formData.orderType === 'BUY';

    let newHolding = 0;
    let newAveragePrice = 0;
    let profitLossChange = 0;
    let portfolioValueChange = 0;

    if (isBuy) {
      // Calculate new position after buying
      if (position) {
        // Adding to existing position
        newHolding = position.quantity + quantity;
        newAveragePrice = ((position.averagePrice * position.quantity) + (price * quantity)) / newHolding;
        portfolioValueChange = price * quantity;
        profitLossChange = 0; // No immediate P/L change on buy
      } else {
        // New position
        newHolding = quantity;
        newAveragePrice = price;
        portfolioValueChange = price * quantity;
        profitLossChange = 0;
      }
    } else {
      // Calculate new position after selling
      if (position && position.quantity >= quantity) {
        // Selling part or all of existing position
        newHolding = position.quantity - quantity;
        newAveragePrice = newHolding > 0 ? position.averagePrice : 0;

        // Calculate profit/loss from this sale
        profitLossChange = (price - position.averagePrice) * quantity;
        portfolioValueChange = -1 * (position.currentPrice * quantity);
      } else {
        // Error case - trying to sell more than owned
        setPortfolioImpact(prev => ({ ...prev, showImpact: false }));
        return;
      }
    }

    setPortfolioImpact({
      newHolding,
      newAveragePrice,
      profitLossChange,
      portfolioValueChange,
      showImpact: true
    });
  }, [symbol, normalizedPositions, formData.orderType]);

  // Function to fetch stock price directly if not found in redux store
  const fetchStockPrice = async (stockSymbol) => {
    try {
      const stockService = require('../../services/stockService').default;

      try {
        // Try NSE first
        const stockData = await stockService.getStockQuote(stockSymbol, 'NSE');
        if (stockData && stockData.price) {
          setCurrentPrice(stockData.price);
          setError('');
        } else {
          throw new Error('NSE data not available');
        }
      } catch (nseError) {
        try {
          // If NSE fails, try BSE
          const stockData = await stockService.getStockQuote(stockSymbol, 'BSE');
          if (stockData && stockData.price) {
            setCurrentPrice(stockData.price);
            setError('');
          } else {
            throw new Error('BSE data not available');
          }
        } catch (bseError) {
          // If both exchanges failed, use default price
          setCurrentPrice(100);
          setError('Using estimated price. Please verify before placing an order.');
        }
      }
    } catch (err) {
      setCurrentPrice(100);
      setError('Using estimated price. Please verify before placing an order.');
    }
  };

  // Get real-time price from redux store
  useEffect(() => {
    if (symbol) {
      // First check stockPrices for the most up-to-date price
      if (stockPrices && stockPrices[symbol] && stockPrices[symbol].price) {
        setCurrentPrice(stockPrices[symbol].price);
        return;
      }

      // Otherwise try to find the stock in NSE stocks
      let stock = (nseStocks || []).find(s => s.symbol === symbol);

      // If not found in NSE, try BSE stocks
      if (!stock) {
        stock = (bseStocks || []).find(s => s.symbol === symbol);
      }

      if (stock) {
        const validPrice = stock.price !== null && stock.price !== undefined ? stock.price : 100;
        setCurrentPrice(validPrice);
        setError('');
      } else {
        // If stock not found, try to fetch it directly
        fetchStockPrice(symbol);
      }
    }

    // Fetch wallet balance
    const fetchWalletBalance = async () => {
      setIsLoadingBalance(true);
      try {
        const balance = await walletService.getWalletBalance();
        setWalletBalance(balance.availableBalance || balance.balance || 0);
        setVirtualBalance(balance.virtualBalance || 0);
        setError('');
      } catch (err) {
        setError('Unable to fetch wallet balance. Please try again.');
        setWalletBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchWalletBalance();
  }, [symbol, nseStocks, bseStocks, stockPrices]);

  // Calculate total order value when quantity or price changes
  useEffect(() => {
    if (formData.quantity && currentPrice) {
      const quantity = parseFloat(formData.quantity);
      const price = type === 'LIMIT' && formData.limitPrice ? parseFloat(formData.limitPrice) : currentPrice;

      if (!isNaN(quantity) && !isNaN(price)) {
        const total = quantity * price;
        setTotalValue(total);

        // Also calculate risk assessment
        calculateRiskAssessment(quantity, price);
      }
    }
  }, [formData.quantity, formData.limitPrice, currentPrice, type, calculateRiskAssessment]);

  useEffect(() => {
    // Only show success notification if isSuccess is true AND a trade was just executed
    if (isSuccess && tradeExecuted) {
      console.log('Trade successful, showing notification from useEffect');
      // Show notification from useEffect as a backup mechanism
      setNotification({
        open: true,
        message: `Order ${formData.orderType === 'BUY' ? 'purchased' : 'sold'} successfully!`,
        severity: 'success',
      });
      // Clear any existing timeouts to prevent multiple notifications
      setTradeExecuted(false);
      dispatch(reset());
    }
  }, [isSuccess, dispatch, tradeExecuted, formData.orderType]);

  useEffect(() => {
    const orderType = type || 'MARKET';
    // Ensure we always have a valid price (never null or undefined)
    const price = orderType === 'MARKET' ?
      (currentPrice !== null && currentPrice !== undefined ? currentPrice : 100) :
      Number(formData.limitPrice) || 0;
    const quantity = Number(formData.quantity) || 0;

    // Calculate total value with proper precision
    const calculatedTotal = price * quantity;
    setTotalValue(calculatedTotal);

    // Calculate risk assessment
    calculateRiskAssessment(quantity, price);
  }, [formData.quantity, formData.limitPrice, currentPrice, type, calculateRiskAssessment]);

  // Risk assessment calculation has been moved above

  const validateForm = () => {
    // Check if symbol is selected
    if (!symbol) {
      setError('Please select a stock first');
      return false;
    }

    // Check if quantity is valid
    if (!formData.quantity || isNaN(formData.quantity) || parseInt(formData.quantity) <= 0) {
      setError('Please enter a valid quantity');
      return false;
    }

    // Calculate total order value
    const orderValue = parseInt(formData.quantity) * currentPrice;

    // Check against virtual balance for buys
    if (formData.orderType === 'BUY' && virtualBalance !== null && orderValue > virtualBalance) {
      setError(`Insufficient funds. Order value (₹${orderValue.toFixed(2)}) exceeds virtual balance (${virtualBalance.toFixed(2)} VC)`);
      return false;
    }

    // Check if limit price is valid for LIMIT orders
    if (type === 'LIMIT') {
      if (!formData.limitPrice || isNaN(formData.limitPrice) || parseFloat(formData.limitPrice) <= 0) {
        setError('Please enter a valid limit price');
        return false;
      }

      // Validate limit price against current price
      if (formData.orderType === 'BUY' && parseFloat(formData.limitPrice) > currentPrice * 1.2) {
        setError(`Limit price (₹${formData.limitPrice}) is more than 20% above current price (₹${currentPrice.toFixed(2)})`);
        return false;
      }

      if (formData.orderType === 'SELL' && parseFloat(formData.limitPrice) < currentPrice * 0.8) {
        setError(`Limit price (₹${formData.limitPrice}) is more than 20% below current price (₹${currentPrice.toFixed(2)})`);
        return false;
      }
    }

    // Validate stop loss if provided
    if (formData.stopLoss && !isNaN(formData.stopLoss) && parseFloat(formData.stopLoss) > 0) {
      // For buy, stop loss should be lower than entry price
      if (formData.orderType === 'BUY' && parseFloat(formData.stopLoss) >= currentPrice) {
        setError('For buy orders, stop loss should be below entry price');
        return false;
      }

      // For sell, stop loss should be higher than entry price
      if (formData.orderType === 'SELL' && parseFloat(formData.stopLoss) <= currentPrice) {
        setError('For sell orders, stop loss should be above entry price');
        return false;
      }
    }

    // Validate take profit if provided
    if (formData.takeProfit && !isNaN(formData.takeProfit) && parseFloat(formData.takeProfit) > 0) {
      // For buy, take profit should be higher than entry price
      if (formData.orderType === 'BUY' && parseFloat(formData.takeProfit) <= currentPrice) {
        setError('For buy orders, take profit should be above entry price');
        return false;
      }

      // For sell, take profit should be lower than entry price
      if (formData.orderType === 'SELL' && parseFloat(formData.takeProfit) >= currentPrice) {
        setError('For sell orders, take profit should be below entry price');
        return false;
      }
    }

    // Additional validation for sell orders - check portfolio
    if (formData.orderType === 'SELL') {
      const position = normalizedPositions[symbol];

      if (!position) {
        setError(`You don't have any ${symbol} shares to sell`);
        return false;
      }

      if (parseInt(formData.quantity) > position.quantity) {
        setError(`You can only sell up to ${position.quantity} shares of ${symbol}`);
        return false;
      }
    }

    setError('');
    return true;
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    // Handle checkbox case separately
    const newValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear error when user makes changes
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare trade data
    const tradeData = {
      symbol,
      quantity: Number(formData.quantity),
      type: formData.orderType,
      orderType: type,
      price: currentPrice,
      ...(type === 'LIMIT' && { limitPrice: Number(formData.limitPrice) }),
      // Always use virtual currency
      // Advanced options
      advancedOrderType: formData.advancedOrderType,
      orderValidity: formData.orderValidity,
      useMargin: formData.useMargin,
      tradingStrategy: formData.tradingStrategy,
      ...(formData.stopLoss && { stopLoss: Number(formData.stopLoss) }),
      ...(formData.takeProfit && { takeProfit: Number(formData.takeProfit) })
    };

    try {
      // Set trade in progress flag
      setTradeExecuted(true);

      dispatch(executeTrade(tradeData))
        .unwrap()
        .then((result) => {
          // Show success notification
          setNotification({
            open: true,
            message: `Order ${formData.orderType === 'BUY' ? 'purchased' : 'sold'} successfully!`,
            severity: 'success',
          });

          // Reset form
          setFormData({
            orderType: 'BUY',
            quantity: '',
            limitPrice: '',
            stopLoss: '',
            takeProfit: '',
            advancedOrderType: 'REGULAR',
            orderValidity: 'DAY',
            useMargin: false,
            tradingStrategy: 'NONE',

          });

          // Clear error and reset state
          setError('');
          setTradeExecuted(false);
          setRiskAssessment({...riskAssessment, visible: false});
          dispatch(reset());

          // Fetch updated wallet balance
          walletService.getWalletBalance().then(balance => {
            setWalletBalance(balance.availableBalance || balance.balance || 0);
            setVirtualBalance(balance.virtualBalance || 0);
          });
        })
        .catch((error) => {
          setNotification({
            open: true,
            message: error.message || 'Failed to execute trade. Please try again.',
            severity: 'error',
          });
          setError(error.message || 'Failed to execute trade');
          setTradeExecuted(false);
        });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError(error.message || 'An unexpected error occurred');
      setTradeExecuted(false);
      setNotification({
        open: true,
        message: error.message || 'An unexpected error occurred',
        severity: 'error',
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {(isError || error) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || message}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <RadioGroup
          row
          name="orderType"
          value={formData.orderType}
          onChange={handleChange}
        >
          <FormControlLabel value="BUY" control={<Radio />} label="Buy" />
          <FormControlLabel value="SELL" control={<Radio />} label="Sell" />
        </RadioGroup>
      </FormControl>

      {/* Balance Display */}
      <Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="body1" fontWeight="medium" color="primary">
          Virtual Balance: {virtualBalance?.toLocaleString() || 0} VC
        </Typography>
      </Box>

      {currentPrice !== null && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Current Price: ₹{currentPrice.toFixed(2)}
        </Typography>
      )}

      <TextField
        fullWidth
        label="Quantity"
        type="number"
        name="quantity"
        value={formData.quantity}
        onChange={handleChange}
        margin="normal"
        InputProps={{
          inputProps: { min: 1 },
        }}
      />

      {type === 'LIMIT' && (
        <TextField
          fullWidth
          label="Limit Price"
          type="number"
          name="limitPrice"
          value={formData.limitPrice}
          onChange={handleChange}
          margin="normal"
          InputProps={{
            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
            inputProps: { min: 0, step: 0.05 },
          }}
        />
      )}

      {/* Advanced Trading Features */}
      <Paper elevation={1} sx={{ p: 2, mt: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Advanced Options
        </Typography>

        <FormControl fullWidth margin="normal">
          <Typography variant="body2" gutterBottom>
            Order Type
          </Typography>
          <Select
            name="advancedOrderType"
            value={formData.advancedOrderType}
            onChange={handleChange}
            size="small"
          >
            <MenuItem value="REGULAR">Regular</MenuItem>
            <MenuItem value="STOP_LOSS">Stop Loss</MenuItem>
            <MenuItem value="STOP_LIMIT">Stop Limit</MenuItem>
            <MenuItem value="TRAILING_STOP">Trailing Stop</MenuItem>
          </Select>
        </FormControl>

        {(formData.advancedOrderType === 'STOP_LOSS' || formData.advancedOrderType === 'STOP_LIMIT' || formData.advancedOrderType === 'TRAILING_STOP') && (
          <TextField
            fullWidth
            label="Stop Loss Price"
            type="number"
            name="stopLoss"
            value={formData.stopLoss}
            onChange={handleChange}
            margin="normal"
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              inputProps: { min: 0, step: 0.05 },
            }}
          />
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            fullWidth
            label="Take Profit"
            type="number"
            name="takeProfit"
            value={formData.takeProfit}
            onChange={handleChange}
            margin="normal"
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              inputProps: { min: 0, step: 0.05 },
            }}
          />
        </Box>

        <FormControl fullWidth margin="normal">
          <Typography variant="body2" gutterBottom>
            Order Validity
          </Typography>
          <Select
            name="orderValidity"
            value={formData.orderValidity}
            onChange={handleChange}
            size="small"
          >
            <MenuItem value="DAY">Day Only</MenuItem>
            <MenuItem value="GTC">Good Till Cancelled</MenuItem>
            <MenuItem value="IOC">Immediate or Cancel</MenuItem>
            <MenuItem value="FOK">Fill or Kill</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.useMargin}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    useMargin: e.target.checked,
                  });
                }}
                name="useMargin"
              />
            }
            label={
              <Tooltip title="Trade with borrowed funds. Higher risk, higher potential returns.">
                <Typography variant="body2">Use Margin</Typography>
              </Tooltip>
            }
          />
        </Box>

        <FormControl fullWidth margin="normal">
          <Typography variant="body2" gutterBottom>
            Trading Strategy
          </Typography>
          <Select
            name="tradingStrategy"
            value={formData.tradingStrategy}
            onChange={handleChange}
            size="small"
          >
            <MenuItem value="NONE">None</MenuItem>
            <MenuItem value="MOMENTUM">Momentum</MenuItem>
            <MenuItem value="MEAN_REVERSION">Mean Reversion</MenuItem>
            <MenuItem value="BREAKOUT">Breakout</MenuItem>
            <MenuItem value="SCALPING">Scalping</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Risk Assessment */}
      {formData.quantity > 0 && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mt: 2,
            mb: 2,
            bgcolor: riskAssessment.riskLevel === 'HIGH'
              ? 'rgba(255, 0, 0, 0.05)'
              : riskAssessment.riskLevel === 'MEDIUM'
                ? 'rgba(255, 165, 0, 0.05)'
                : 'rgba(0, 128, 0, 0.05)'
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Risk Assessment
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              Risk Level:
            </Typography>
            <Typography
              variant="body1"
              fontWeight="bold"
              color={
                riskAssessment.riskLevel === 'HIGH'
                  ? 'error.main'
                  : riskAssessment.riskLevel === 'MEDIUM'
                    ? 'warning.main'
                    : 'success.main'
              }
            >
              {riskAssessment.riskLevel}
            </Typography>
          </Box>

          {riskAssessment.message && (
            <Typography variant="body2" color="text.secondary">
              {riskAssessment.message}
            </Typography>
          )}

          <Box sx={{ mt: 1, width: '100%', height: 8, bgcolor: 'grey.200', borderRadius: 4 }}>
            <Box
              sx={{
                height: '100%',
                width: `${Math.min(100, riskAssessment.riskScore)}%`,
                bgcolor: riskAssessment.riskLevel === 'HIGH'
                  ? 'error.main'
                  : riskAssessment.riskLevel === 'MEDIUM'
                    ? 'warning.main'
                    : 'success.main',
                borderRadius: 4
              }}
            />
          </Box>
        </Paper>
      )}

      <Typography variant="body2" sx={{ mb: 2 }}>
        Total Value: ₹{totalValue.toFixed(2)}
      </Typography>

      {/* Removed real wallet balance display as it's not relevant for trading */}

      {/* Portfolio Impact Preview */}
      {portfolioImpact.showImpact && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Estimated Portfolio Impact
            {currentPrice && (
              <Typography variant="caption" color="text.secondary">
                Market Price: ₹{currentPrice.toFixed(2)}
              </Typography>
            )}
          </Typography>
          <Grid container spacing={1}>
            {/* Current Position (if exists) */}
            {normalizedPositions[symbol] && (
              <>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Current Position:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    {normalizedPositions[symbol].quantity} shares @ ₹{normalizedPositions[symbol].averagePrice.toFixed(2)}
                  </Typography>
                </Grid>
              </>
            )}

            {/* New Position Details */}
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                New Holding:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="medium">
                {portfolioImpact.newHolding} shares
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                New Average Price:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="medium">
                ₹{portfolioImpact.newAveragePrice.toFixed(2)}
              </Typography>
            </Grid>

            {/* Trade Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                Trade Details
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Order Type:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="medium">
                {formData.orderType} ({type})
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Quantity:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="medium">
                {formData.quantity} shares
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Total Value:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="medium">
                ₹{totalValue.toFixed(2)}
              </Typography>
            </Grid>

            {formData.orderType === 'SELL' && (
              <>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Estimated P/L:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    color={portfolioImpact.profitLossChange >= 0 ? 'success.main' : 'error.main'}
                  >
                    {portfolioImpact.profitLossChange >= 0 ? '+' : ''}₹{portfolioImpact.profitLossChange.toFixed(2)}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      ({((portfolioImpact.profitLossChange / (normalizedPositions[symbol]?.averagePrice * formData.quantity || 1)) * 100).toFixed(2)}%)
                    </Typography>
                  </Typography>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Portfolio Impact:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography
                variant="body2"
                fontWeight="medium"
                color={formData.orderType === 'BUY' ? 'success.main' : 'error.main'}
              >
                {formData.orderType === 'BUY' ? '+' : ''}₹{portfolioImpact.portfolioValueChange.toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={isLoading || isLoadingBalance}
      >
        {isLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          `${formData.orderType === 'BUY' ? 'Buy' : 'Sell'} ${symbol || ''}`
        )}
      </Button>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          top: 80, // Increased top position to make it more visible
          zIndex: 10000, // Increased z-index to ensure it appears above all other elements
          position: 'fixed', // Ensure it's fixed positioned
          '& .MuiAlert-root': {
            minWidth: '350px', // Increased width for better visibility
          }
        }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{
            width: '100%',
            boxShadow: 8, // Increased shadow for better visibility
            fontWeight: 'bold', // Make text more visible
            fontSize: '1.1rem', // Larger text
            padding: '16px 20px', // More padding for better visibility
            border: '1px solid',
            borderColor: 'success.main', // Add border for more emphasis
          }}
          variant="filled" // Make alert more prominent
          elevation={8} // Add more elevation for better visibility
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrderForm;