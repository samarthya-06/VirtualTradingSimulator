const { logError, logInfo } = require('../utils/logger');
const User = require('../models/userModel');
const Portfolio = require('../models/portfolioModel');
const Stock = require('../models/stockModel');

/**
 * Order Validation Service
 * Handles comprehensive validation of trading orders
 */
const orderValidationService = {
  /**
   * Validate a new order
   * @param {Object} order - Order to validate
   * @returns {Promise<Object>} Validation result
   */
  validateOrder: async (order) => {
    try {
      const validationResults = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Basic validation
      if (!order.user || !order.stock || !order.quantity || !order.type) {
        validationResults.isValid = false;
        validationResults.errors.push('Missing required order fields');
        return validationResults;
      }

      // Get user and portfolio
      const user = await User.findById(order.user);
      if (!user) {
        validationResults.isValid = false;
        validationResults.errors.push('User not found');
        return validationResults;
      }

      const portfolio = await Portfolio.findOne({ user: order.user });
      const stock = await Stock.findById(order.stock);

      if (!stock) {
        validationResults.isValid = false;
        validationResults.errors.push('Stock not found');
        return validationResults;
      }

      // Validate order type specific rules
      switch (order.orderType) {
        case 'MARKET':
          validationResults.isValid = await orderValidationService.validateMarketOrder(
            order, user, portfolio, stock, validationResults
          );
          break;
        case 'LIMIT':
          validationResults.isValid = await orderValidationService.validateLimitOrder(
            order, user, portfolio, stock, validationResults
          );
          break;
        case 'STOP':
          validationResults.isValid = await orderValidationService.validateStopOrder(
            order, user, portfolio, stock, validationResults
          );
          break;
        case 'STOP_LIMIT':
          validationResults.isValid = await orderValidationService.validateStopLimitOrder(
            order, user, portfolio, stock, validationResults
          );
          break;
        case 'TRAILING_STOP':
          validationResults.isValid = await orderValidationService.validateTrailingStopOrder(
            order, user, portfolio, stock, validationResults
          );
          break;
        default:
          validationResults.isValid = false;
          validationResults.errors.push('Invalid order type');
      }

      // Validate quantity
      if (order.quantity <= 0) {
        validationResults.isValid = false;
        validationResults.errors.push('Order quantity must be greater than 0');
      }

      // Validate price limits
      if (order.price && order.price <= 0) {
        validationResults.isValid = false;
        validationResults.errors.push('Order price must be greater than 0');
      }

      // Validate stop price for stop orders
      if ((order.orderType === 'STOP' || order.orderType === 'STOP_LIMIT') && 
          (!order.stopPrice || order.stopPrice <= 0)) {
        validationResults.isValid = false;
        validationResults.errors.push('Stop price must be greater than 0');
      }

      // Validate trailing stop percentage
      if (order.orderType === 'TRAILING_STOP' && 
          (!order.trailingPercent || order.trailingPercent <= 0 || order.trailingPercent >= 100)) {
        validationResults.isValid = false;
        validationResults.errors.push('Trailing stop percentage must be between 0 and 100');
      }

      // Validate order expiration
      if (order.expiresAt && new Date(order.expiresAt) <= new Date()) {
        validationResults.isValid = false;
        validationResults.errors.push('Order expiration time must be in the future');
      }

      return validationResults;
    } catch (error) {
      logError('Error validating order:', error);
      throw error;
    }
  },

  /**
   * Validate market order
   */
  validateMarketOrder: async (order, user, portfolio, stock, validationResults) => {
    const totalCost = order.quantity * stock.currentPrice;

    if (order.type === 'BUY') {
      if (user.walletBalance < totalCost) {
        validationResults.errors.push('Insufficient funds for market buy order');
        return false;
      }
    } else {
      if (!portfolio) {
        validationResults.errors.push('Portfolio not found');
        return false;
      }

      const holding = portfolio.holdings.find(h => 
        h.stock.toString() === order.stock.toString()
      );

      if (!holding || holding.quantity < order.quantity) {
        validationResults.errors.push('Insufficient shares for market sell order');
        return false;
      }
    }

    return true;
  },

  /**
   * Validate limit order
   */
  validateLimitOrder: async (order, user, portfolio, stock, validationResults) => {
    if (!order.limitPrice || order.limitPrice <= 0) {
      validationResults.errors.push('Invalid limit price');
      return false;
    }

    const totalCost = order.quantity * order.limitPrice;

    if (order.type === 'BUY') {
      if (user.walletBalance < totalCost) {
        validationResults.errors.push('Insufficient funds for limit buy order');
        return false;
      }
    } else {
      if (!portfolio) {
        validationResults.errors.push('Portfolio not found');
        return false;
      }

      const holding = portfolio.holdings.find(h => 
        h.stock.toString() === order.stock.toString()
      );

      if (!holding || holding.quantity < order.quantity) {
        validationResults.errors.push('Insufficient shares for limit sell order');
        return false;
      }
    }

    return true;
  },

  /**
   * Validate stop order
   */
  validateStopOrder: async (order, user, portfolio, stock, validationResults) => {
    if (!order.stopPrice || order.stopPrice <= 0) {
      validationResults.errors.push('Invalid stop price');
      return false;
    }

    const totalCost = order.quantity * order.stopPrice;

    if (order.type === 'BUY') {
      if (user.walletBalance < totalCost) {
        validationResults.errors.push('Insufficient funds for stop buy order');
        return false;
      }
    } else {
      if (!portfolio) {
        validationResults.errors.push('Portfolio not found');
        return false;
      }

      const holding = portfolio.holdings.find(h => 
        h.stock.toString() === order.stock.toString()
      );

      if (!holding || holding.quantity < order.quantity) {
        validationResults.errors.push('Insufficient shares for stop sell order');
        return false;
      }
    }

    return true;
  },

  /**
   * Validate stop limit order
   */
  validateStopLimitOrder: async (order, user, portfolio, stock, validationResults) => {
    if (!order.stopPrice || order.stopPrice <= 0 || !order.limitPrice || order.limitPrice <= 0) {
      validationResults.errors.push('Invalid stop price or limit price');
      return false;
    }

    if (order.type === 'BUY' && order.limitPrice < order.stopPrice) {
      validationResults.errors.push('Limit price must be greater than or equal to stop price for buy orders');
      return false;
    }

    if (order.type === 'SELL' && order.limitPrice > order.stopPrice) {
      validationResults.errors.push('Limit price must be less than or equal to stop price for sell orders');
      return false;
    }

    const totalCost = order.quantity * order.limitPrice;

    if (order.type === 'BUY') {
      if (user.walletBalance < totalCost) {
        validationResults.errors.push('Insufficient funds for stop limit buy order');
        return false;
      }
    } else {
      if (!portfolio) {
        validationResults.errors.push('Portfolio not found');
        return false;
      }

      const holding = portfolio.holdings.find(h => 
        h.stock.toString() === order.stock.toString()
      );

      if (!holding || holding.quantity < order.quantity) {
        validationResults.errors.push('Insufficient shares for stop limit sell order');
        return false;
      }
    }

    return true;
  },

  /**
   * Validate trailing stop order
   */
  validateTrailingStopOrder: async (order, user, portfolio, stock, validationResults) => {
    if (!order.trailingPercent || order.trailingPercent <= 0 || order.trailingPercent >= 100) {
      validationResults.errors.push('Invalid trailing stop percentage');
      return false;
    }

    const estimatedPrice = stock.currentPrice;
    const totalCost = order.quantity * estimatedPrice;

    if (order.type === 'BUY') {
      if (user.walletBalance < totalCost) {
        validationResults.errors.push('Insufficient funds for trailing stop buy order');
        return false;
      }
    } else {
      if (!portfolio) {
        validationResults.errors.push('Portfolio not found');
        return false;
      }

      const holding = portfolio.holdings.find(h => 
        h.stock.toString() === order.stock.toString()
      );

      if (!holding || holding.quantity < order.quantity) {
        validationResults.errors.push('Insufficient shares for trailing stop sell order');
        return false;
      }
    }

    return true;
  }
};

module.exports = orderValidationService; 