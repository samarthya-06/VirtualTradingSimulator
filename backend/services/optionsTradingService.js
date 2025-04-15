const mongoose = require('mongoose');
const marketDataService = require('./marketDataService');
const { logError, logInfo } = require('../utils/logger');

/**
 * Options Trading Service
 * Handles options chain data, pricing models, and Greeks calculations
 */
const optionsTradingService = {
  /**
   * Get options chain for a symbol
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} Options chain data
   */
  getOptionsChain: async (symbol) => {
    try {
      // Get current stock price
      const stockData = await marketDataService.getCurrentPrice(symbol);
      const currentPrice = stockData.price;

      // Get options data from market data provider
      const optionsData = await marketDataService.getOptionsData(symbol);

      // Process and format options chain
      const optionsChain = {
        symbol,
        currentPrice,
        timestamp: new Date(),
        calls: [],
        puts: []
      };

      // Process call options
      for (const option of optionsData.calls) {
        optionsChain.calls.push({
          strike: option.strike,
          expiry: option.expiry,
          lastPrice: option.lastPrice,
          bid: option.bid,
          ask: option.ask,
          volume: option.volume,
          openInterest: option.openInterest,
          impliedVolatility: option.impliedVolatility,
          delta: option.delta,
          gamma: option.gamma,
          theta: option.theta,
          vega: option.vega,
          rho: option.rho
        });
      }

      // Process put options
      for (const option of optionsData.puts) {
        optionsChain.puts.push({
          strike: option.strike,
          expiry: option.expiry,
          lastPrice: option.lastPrice,
          bid: option.bid,
          ask: option.ask,
          volume: option.volume,
          openInterest: option.openInterest,
          impliedVolatility: option.impliedVolatility,
          delta: option.delta,
          gamma: option.gamma,
          theta: option.theta,
          vega: option.vega,
          rho: option.rho
        });
      }

      return optionsChain;
    } catch (error) {
      logError('Error fetching options chain:', error);
      throw error;
    }
  },

  /**
   * Calculate option price using Black-Scholes model
   * @param {Object} params - Option parameters
   * @returns {number} Calculated option price
   */
  calculateOptionPrice: (params) => {
    const {
      strike,
      currentPrice,
      timeToExpiry,
      volatility,
      riskFreeRate,
      isCall
    } = params;

    // Calculate d1 and d2
    const d1 = (Math.log(currentPrice / strike) + (riskFreeRate + volatility * volatility / 2) * timeToExpiry) / (volatility * Math.sqrt(timeToExpiry));
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);

    // Calculate option price
    const price = isCall
      ? currentPrice * optionsTradingService.normalCDF(d1) - strike * Math.exp(-riskFreeRate * timeToExpiry) * optionsTradingService.normalCDF(d2)
      : strike * Math.exp(-riskFreeRate * timeToExpiry) * optionsTradingService.normalCDF(-d2) - currentPrice * optionsTradingService.normalCDF(-d1);

    return price;
  },

  /**
   * Calculate option Greeks
   * @param {Object} params - Option parameters
   * @returns {Object} Greeks values
   */
  calculateGreeks: (params) => {
    const {
      strike,
      currentPrice,
      timeToExpiry,
      volatility,
      riskFreeRate,
      isCall
    } = params;

    // Calculate d1 and d2
    const d1 = (Math.log(currentPrice / strike) + (riskFreeRate + volatility * volatility / 2) * timeToExpiry) / (volatility * Math.sqrt(timeToExpiry));
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);

    // Calculate Greeks
    const delta = isCall
      ? optionsTradingService.normalCDF(d1)
      : optionsTradingService.normalCDF(d1) - 1;

    const gamma = optionsTradingService.normalPDF(d1) / (currentPrice * volatility * Math.sqrt(timeToExpiry));

    const theta = (-currentPrice * optionsTradingService.normalPDF(d1) * volatility) / (2 * Math.sqrt(timeToExpiry)) -
      riskFreeRate * strike * Math.exp(-riskFreeRate * timeToExpiry) * optionsTradingService.normalCDF(isCall ? d2 : -d2);

    const vega = currentPrice * Math.sqrt(timeToExpiry) * optionsTradingService.normalPDF(d1) / 100;

    const rho = strike * timeToExpiry * Math.exp(-riskFreeRate * timeToExpiry) * optionsTradingService.normalCDF(isCall ? d2 : -d2) / 100;

    return {
      delta,
      gamma,
      theta,
      vega,
      rho
    };
  },

  /**
   * Calculate implied volatility
   * @param {Object} params - Option parameters
   * @returns {number} Implied volatility
   */
  calculateImpliedVolatility: (params) => {
    const {
      strike,
      currentPrice,
      timeToExpiry,
      optionPrice,
      riskFreeRate,
      isCall
    } = params;

    // Use Newton-Raphson method to find implied volatility
    let volatility = 0.5; // Initial guess
    const tolerance = 0.0001;
    const maxIterations = 100;
    let iteration = 0;

    while (iteration < maxIterations) {
      const price = optionsTradingService.calculateOptionPrice({
        strike,
        currentPrice,
        timeToExpiry,
        volatility,
        riskFreeRate,
        isCall
      });

      const diff = price - optionPrice;
      if (Math.abs(diff) < tolerance) {
        return volatility;
      }

      const vega = optionsTradingService.calculateGreeks({
        strike,
        currentPrice,
        timeToExpiry,
        volatility,
        riskFreeRate,
        isCall
      }).vega;

      volatility = volatility - diff / vega;
      iteration++;
    }

    throw new Error('Implied volatility calculation did not converge');
  },

  /**
   * Create an options strategy
   * @param {Object} strategy - Strategy configuration
   * @returns {Promise<Object>} Created strategy
   */
  createOptionsStrategy: async (strategy) => {
    try {
      const newStrategy = await OptionsStrategy.create(strategy);
      logInfo(`Created new options strategy: ${newStrategy.name}`);
      return newStrategy;
    } catch (error) {
      logError('Error creating options strategy:', error);
      throw error;
    }
  },

  /**
   * Calculate strategy payoff
   * @param {Object} strategy - Strategy configuration
   * @param {number} stockPrice - Stock price at expiry
   * @returns {number} Strategy payoff
   */
  calculateStrategyPayoff: (strategy, stockPrice) => {
    let payoff = 0;

    for (const leg of strategy.legs) {
      const optionPayoff = leg.isCall
        ? Math.max(stockPrice - leg.strike, 0)
        : Math.max(leg.strike - stockPrice, 0);

      payoff += leg.quantity * (leg.isLong ? optionPayoff : -optionPayoff);
    }

    return payoff;
  },

  /**
   * Calculate strategy Greeks
   * @param {Object} strategy - Strategy configuration
   * @returns {Object} Strategy Greeks
   */
  calculateStrategyGreeks: (strategy) => {
    const greeks = {
      delta: 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0
    };

    for (const leg of strategy.legs) {
      const legGreeks = optionsTradingService.calculateGreeks({
        strike: leg.strike,
        currentPrice: leg.currentPrice,
        timeToExpiry: leg.timeToExpiry,
        volatility: leg.volatility,
        riskFreeRate: leg.riskFreeRate,
        isCall: leg.isCall
      });

      Object.keys(greeks).forEach(greek => {
        greeks[greek] += leg.quantity * (leg.isLong ? legGreeks[greek] : -legGreeks[greek]);
      });
    }

    return greeks;
  },

  /**
   * Helper function: Normal cumulative distribution function
   * @param {number} x - Input value
   * @returns {number} CDF value
   */
  normalCDF: (x) => {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  },

  /**
   * Helper function: Normal probability density function
   * @param {number} x - Input value
   * @returns {number} PDF value
   */
  normalPDF: (x) => {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-(x * x) / 2);
  }
};

module.exports = optionsTradingService; 