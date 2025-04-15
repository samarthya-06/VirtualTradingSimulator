const mongoose = require('mongoose');
const marketDataService = require('./marketDataService');
const { logError, logInfo } = require('../utils/logger');

/**
 * Portfolio Optimization Service
 * Implements Modern Portfolio Theory and portfolio optimization techniques
 */
const portfolioOptimizationService = {
  /**
   * Calculate optimal portfolio weights using Modern Portfolio Theory
   * @param {Array} symbols - Array of stock symbols
   * @param {Object} constraints - Portfolio constraints
   * @returns {Promise<Object>} Optimal portfolio weights and metrics
   */
  calculateOptimalWeights: async (symbols, constraints = {}) => {
    try {
      // Get historical data for all symbols
      const historicalData = await Promise.all(
        symbols.map(symbol => marketDataService.getHistoricalData(symbol, 'daily', '1y'))
      );

      // Calculate returns and covariance matrix
      const returns = historicalData.map(data => {
        const prices = data.map(d => d.close);
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
          returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        return returns;
      });

      const meanReturns = returns.map(r => r.reduce((a, b) => a + b, 0) / r.length);
      const covarianceMatrix = portfolioOptimizationService.calculateCovarianceMatrix(returns);

      // Calculate optimal weights using mean-variance optimization
      const weights = portfolioOptimizationService.meanVarianceOptimization(
        meanReturns,
        covarianceMatrix,
        constraints
      );

      // Calculate portfolio metrics
      const metrics = portfolioOptimizationService.calculatePortfolioMetrics(
        weights,
        meanReturns,
        covarianceMatrix
      );

      return {
        weights: symbols.map((symbol, i) => ({
          symbol,
          weight: weights[i]
        })),
        metrics
      };
    } catch (error) {
      logError('Error calculating optimal weights:', error);
      throw error;
    }
  },

  /**
   * Calculate covariance matrix from returns
   * @param {Array} returns - Array of return series
   * @returns {Array} Covariance matrix
   */
  calculateCovarianceMatrix: (returns) => {
    const n = returns.length;
    const matrix = Array(n).fill().map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const covariance = portfolioOptimizationService.calculateCovariance(
          returns[i],
          returns[j]
        );
        matrix[i][j] = covariance;
        matrix[j][i] = covariance;
      }
    }

    return matrix;
  },

  /**
   * Calculate covariance between two return series
   * @param {Array} returns1 - First return series
   * @param {Array} returns2 - Second return series
   * @returns {number} Covariance
   */
  calculateCovariance: (returns1, returns2) => {
    const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
    const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;

    let covariance = 0;
    for (let i = 0; i < returns1.length; i++) {
      covariance += (returns1[i] - mean1) * (returns2[i] - mean2);
    }

    return covariance / returns1.length;
  },

  /**
   * Perform mean-variance optimization
   * @param {Array} returns - Array of mean returns
   * @param {Array} covariance - Covariance matrix
   * @param {Object} constraints - Portfolio constraints
   * @returns {Array} Optimal weights
   */
  meanVarianceOptimization: (returns, covariance, constraints) => {
    const n = returns.length;
    const weights = Array(n).fill(1 / n); // Initial equal weights

    // Implement optimization algorithm (e.g., gradient descent)
    const learningRate = 0.01;
    const maxIterations = 1000;
    let iteration = 0;

    while (iteration < maxIterations) {
      // Calculate gradient
      const gradient = portfolioOptimizationService.calculateGradient(
        weights,
        returns,
        covariance
      );

      // Update weights
      for (let i = 0; i < n; i++) {
        weights[i] += learningRate * gradient[i];
      }

      // Apply constraints
      portfolioOptimizationService.applyConstraints(weights, constraints);

      // Normalize weights
      const sum = weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < n; i++) {
        weights[i] /= sum;
      }

      iteration++;
    }

    return weights;
  },

  /**
   * Calculate gradient for optimization
   * @param {Array} weights - Current weights
   * @param {Array} returns - Mean returns
   * @param {Array} covariance - Covariance matrix
   * @returns {Array} Gradient
   */
  calculateGradient: (weights, returns, covariance) => {
    const n = weights.length;
    const gradient = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      gradient[i] = returns[i];
      for (let j = 0; j < n; j++) {
        gradient[i] -= 2 * covariance[i][j] * weights[j];
      }
    }

    return gradient;
  },

  /**
   * Apply portfolio constraints
   * @param {Array} weights - Portfolio weights
   * @param {Object} constraints - Portfolio constraints
   */
  applyConstraints: (weights, constraints) => {
    const { minWeight, maxWeight, sectorLimits } = constraints;

    // Apply minimum and maximum weight constraints
    if (minWeight !== undefined) {
      weights.forEach((w, i) => {
        weights[i] = Math.max(w, minWeight);
      });
    }

    if (maxWeight !== undefined) {
      weights.forEach((w, i) => {
        weights[i] = Math.min(w, maxWeight);
      });
    }

    // Apply sector limits if provided
    if (sectorLimits) {
      Object.entries(sectorLimits).forEach(([sector, limit]) => {
        const sectorWeight = weights.reduce((sum, w, i) => {
          return sum + (sector === stocks[i].sector ? w : 0);
        }, 0);

        if (sectorWeight > limit) {
          const factor = limit / sectorWeight;
          weights.forEach((w, i) => {
            if (sector === stocks[i].sector) {
              weights[i] *= factor;
            }
          });
        }
      });
    }
  },

  /**
   * Calculate portfolio metrics
   * @param {Array} weights - Portfolio weights
   * @param {Array} returns - Mean returns
   * @param {Array} covariance - Covariance matrix
   * @returns {Object} Portfolio metrics
   */
  calculatePortfolioMetrics: (weights, returns, covariance) => {
    // Calculate expected return
    const expectedReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0);

    // Calculate portfolio variance
    let variance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        variance += weights[i] * weights[j] * covariance[i][j];
      }
    }

    // Calculate standard deviation
    const standardDeviation = Math.sqrt(variance);

    // Calculate Sharpe ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02;
    const sharpeRatio = (expectedReturn - riskFreeRate) / standardDeviation;

    // Calculate beta (assuming market return of 8%)
    const marketReturn = 0.08;
    const beta = covariance[0][0] / variance;

    // Calculate alpha
    const alpha = expectedReturn - (riskFreeRate + beta * (marketReturn - riskFreeRate));

    return {
      expectedReturn,
      standardDeviation,
      sharpeRatio,
      beta,
      alpha,
      variance
    };
  },

  /**
   * Generate portfolio rebalancing recommendations
   * @param {Object} currentPortfolio - Current portfolio holdings
   * @param {Object} targetPortfolio - Target portfolio weights
   * @returns {Array} Rebalancing recommendations
   */
  generateRebalancingRecommendations: (currentPortfolio, targetPortfolio) => {
    const recommendations = [];

    // Calculate current weights
    const totalValue = currentPortfolio.reduce((sum, holding) => sum + holding.value, 0);
    const currentWeights = currentPortfolio.map(holding => ({
      symbol: holding.symbol,
      weight: holding.value / totalValue
    }));

    // Compare with target weights and generate recommendations
    currentWeights.forEach((current, i) => {
      const target = targetPortfolio.weights.find(w => w.symbol === current.symbol);
      if (target) {
        const difference = target.weight - current.weight;
        if (Math.abs(difference) > 0.01) { // 1% threshold
          recommendations.push({
            symbol: current.symbol,
            action: difference > 0 ? 'BUY' : 'SELL',
            weightChange: Math.abs(difference),
            valueChange: Math.abs(difference * totalValue)
          });
        }
      }
    });

    return recommendations;
  },

  /**
   * Calculate tax-loss harvesting opportunities
   * @param {Array} holdings - Portfolio holdings
   * @param {Object} marketData - Current market data
   * @returns {Array} Tax-loss harvesting recommendations
   */
  calculateTaxLossHarvesting: (holdings, marketData) => {
    const recommendations = [];

    holdings.forEach(holding => {
      const currentPrice = marketData[holding.symbol].price;
      const costBasis = holding.averageCost;
      const unrealizedLoss = (currentPrice - costBasis) / costBasis;

      if (unrealizedLoss < -0.03) { // 3% loss threshold
        recommendations.push({
          symbol: holding.symbol,
          currentPrice,
          costBasis,
          unrealizedLoss,
          potentialTaxSavings: Math.abs(unrealizedLoss * holding.quantity * costBasis * 0.2) // Assuming 20% tax rate
        });
      }
    });

    return recommendations;
  }
};

module.exports = portfolioOptimizationService; 