const mongoose = require('mongoose');
const technicalIndicatorsService = require('./technicalIndicatorsService');
const marketDataService = require('./marketDataService');
const { logError, logInfo } = require('../utils/logger');

/**
 * Algorithmic Trading Service
 * Handles strategy creation, backtesting, and execution
 */
const algorithmicTradingService = {
  /**
   * Create a new trading strategy
   * @param {Object} strategy - Strategy configuration
   * @returns {Promise<Object>} Created strategy
   */
  createStrategy: async (strategy) => {
    try {
      const newStrategy = await Strategy.create(strategy);
      logInfo(`Created new trading strategy: ${newStrategy.name}`);
      return newStrategy;
    } catch (error) {
      logError('Error creating trading strategy:', error);
      throw error;
    }
  },

  /**
   * Backtest a strategy
   * @param {string} strategyId - Strategy ID
   * @param {Object} parameters - Backtesting parameters
   * @returns {Promise<Object>} Backtesting results
   */
  backtestStrategy: async (strategyId, parameters) => {
    try {
      const strategy = await Strategy.findById(strategyId);
      if (!strategy) {
        throw new Error('Strategy not found');
      }

      const { symbol, startDate, endDate, initialCapital } = parameters;
      
      // Get historical data
      const historicalData = await marketDataService.getHistoricalData(
        symbol,
        'daily',
        startDate,
        endDate
      );

      // Initialize backtest results
      let capital = initialCapital;
      let position = 0;
      let trades = [];
      let equity = [];

      // Run strategy on historical data
      for (let i = 0; i < historicalData.length; i++) {
        const currentData = historicalData[i];
        const signals = await algorithmicTradingService.generateSignals(
          strategy,
          historicalData.slice(0, i + 1)
        );

        // Execute trades based on signals
        if (signals.length > 0) {
          for (const signal of signals) {
            const trade = await algorithmicTradingService.executeSignal(
              signal,
              currentData,
              capital,
              position
            );
            
            if (trade) {
              trades.push(trade);
              capital = trade.newCapital;
              position = trade.newPosition;
            }
          }
        }

        // Record equity
        equity.push({
          date: currentData.date,
          value: capital + (position * currentData.close)
        });
      }

      // Calculate performance metrics
      const metrics = algorithmicTradingService.calculatePerformanceMetrics(
        trades,
        equity,
        initialCapital
      );

      return {
        strategyId,
        symbol,
        startDate,
        endDate,
        initialCapital,
        finalCapital: capital + (position * historicalData[historicalData.length - 1].close),
        trades,
        equity,
        metrics
      };
    } catch (error) {
      logError('Error backtesting strategy:', error);
      throw error;
    }
  },

  /**
   * Generate trading signals based on strategy rules
   * @param {Object} strategy - Strategy configuration
   * @param {Array} historicalData - Historical price data
   * @returns {Promise<Array>} Array of trading signals
   */
  generateSignals: async (strategy, historicalData) => {
    const signals = [];
    const prices = historicalData.map(d => d.close);
    const highs = historicalData.map(d => d.high);
    const lows = historicalData.map(d => d.low);

    // Calculate technical indicators based on strategy rules
    for (const rule of strategy.rules) {
      let indicatorValue;
      switch (rule.indicator) {
        case 'RSI':
          const rsi = technicalIndicatorsService.calculateRSI(prices, rule.period);
          indicatorValue = rsi[rsi.length - 1];
          break;
        case 'MACD':
          const macd = technicalIndicatorsService.calculateMACD(prices, {
            fastPeriod: rule.fastPeriod,
            slowPeriod: rule.slowPeriod,
            signalPeriod: rule.signalPeriod
          });
          indicatorValue = macd.histogram[macd.histogram.length - 1];
          break;
        case 'BB':
          const bb = technicalIndicatorsService.calculateBollingerBands(prices, {
            period: rule.period,
            stdDevMultiplier: rule.stdDev
          });
          indicatorValue = {
            upper: bb.upper[bb.upper.length - 1],
            middle: bb.middle[bb.middle.length - 1],
            lower: bb.lower[bb.lower.length - 1]
          };
          break;
        default:
          continue;
      }

      // Check if rule conditions are met
      if (algorithmicTradingService.evaluateRule(rule, indicatorValue)) {
        signals.push({
          type: rule.action,
          price: prices[prices.length - 1],
          timestamp: historicalData[historicalData.length - 1].date
        });
      }
    }

    return signals;
  },

  /**
   * Execute a trading signal
   * @param {Object} signal - Trading signal
   * @param {Object} currentData - Current market data
   * @param {number} capital - Current capital
   * @param {number} position - Current position
   * @returns {Object} Trade execution result
   */
  executeSignal: async (signal, currentData, capital, position) => {
    const price = currentData.close;
    const quantity = Math.floor(capital / price);

    if (signal.type === 'BUY' && position <= 0) {
      const cost = quantity * price;
      if (cost <= capital) {
        return {
          type: 'BUY',
          price,
          quantity,
          cost,
          newCapital: capital - cost,
          newPosition: position + quantity,
          timestamp: signal.timestamp
        };
      }
    } else if (signal.type === 'SELL' && position >= 0) {
      const revenue = position * price;
      return {
        type: 'SELL',
        price,
        quantity: position,
        revenue,
        newCapital: capital + revenue,
        newPosition: 0,
        timestamp: signal.timestamp
      };
    }

    return null;
  },

  /**
   * Calculate performance metrics for backtest results
   * @param {Array} trades - Array of executed trades
   * @param {Array} equity - Array of equity values
   * @param {number} initialCapital - Initial capital
   * @returns {Object} Performance metrics
   */
  calculatePerformanceMetrics: (trades, equity, initialCapital) => {
    const finalEquity = equity[equity.length - 1].value;
    const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;
    
    // Calculate daily returns
    const dailyReturns = [];
    for (let i = 1; i < equity.length; i++) {
      dailyReturns.push(
        ((equity[i].value - equity[i - 1].value) / equity[i - 1].value) * 100
      );
    }

    // Calculate metrics
    const metrics = {
      totalReturn,
      annualizedReturn: algorithmicTradingService.calculateAnnualizedReturn(
        totalReturn,
        equity.length
      ),
      sharpeRatio: algorithmicTradingService.calculateSharpeRatio(dailyReturns),
      maxDrawdown: algorithmicTradingService.calculateMaxDrawdown(equity),
      winRate: algorithmicTradingService.calculateWinRate(trades),
      profitFactor: algorithmicTradingService.calculateProfitFactor(trades)
    };

    return metrics;
  },

  /**
   * Calculate annualized return
   * @param {number} totalReturn - Total return percentage
   * @param {number} days - Number of days
   * @returns {number} Annualized return
   */
  calculateAnnualizedReturn: (totalReturn, days) => {
    return ((1 + totalReturn / 100) ** (365 / days) - 1) * 100;
  },

  /**
   * Calculate Sharpe ratio
   * @param {Array} returns - Array of daily returns
   * @returns {number} Sharpe ratio
   */
  calculateSharpeRatio: (returns) => {
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length
    );
    return (avgReturn / stdDev) * Math.sqrt(252); // Annualized
  },

  /**
   * Calculate maximum drawdown
   * @param {Array} equity - Array of equity values
   * @returns {number} Maximum drawdown percentage
   */
  calculateMaxDrawdown: (equity) => {
    let maxDrawdown = 0;
    let peak = equity[0].value;

    for (const point of equity) {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = (peak - point.value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown * 100;
  },

  /**
   * Calculate win rate
   * @param {Array} trades - Array of trades
   * @returns {number} Win rate percentage
   */
  calculateWinRate: (trades) => {
    const winningTrades = trades.filter(trade => {
      if (trade.type === 'BUY') {
        return trade.newPosition > trade.quantity;
      }
      return trade.revenue > trade.cost;
    });
    return (winningTrades.length / trades.length) * 100;
  },

  /**
   * Calculate profit factor
   * @param {Array} trades - Array of trades
   * @returns {number} Profit factor
   */
  calculateProfitFactor: (trades) => {
    const profits = trades.reduce((sum, trade) => {
      if (trade.type === 'SELL') {
        return sum + (trade.revenue - trade.cost);
      }
      return sum;
    }, 0);

    const losses = trades.reduce((sum, trade) => {
      if (trade.type === 'BUY') {
        return sum + (trade.cost - trade.revenue);
      }
      return sum;
    }, 0);

    return losses === 0 ? Infinity : profits / losses;
  }
};

module.exports = algorithmicTradingService; 