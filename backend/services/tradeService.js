import Trade from '../models/tradeModel.js';
import User from '../models/userModel.js';
import Stock from '../models/stockModel.js';
import Portfolio from '../models/portfolioModel.js';
import marketDataCacheService from './marketDataCacheService.js';
import yahooFinance from 'yahoo-finance2';
import Order from '../models/orderModel.js';
import { logError, logInfo } from '../utils/logger.js';
import emailService from './emailService.js';
import cacheService from './cacheService.js';

/**
 * Trade service for handling order execution
 */
const tradeService = {
  /**
   * Process pending orders
   * This function should be called periodically to check and execute pending orders
   */
  processPendingOrders: async () => {
    try {
      // Get all pending orders
      const pendingOrders = await Trade.find({
        status: 'PENDING',
        $or: [
          { orderType: 'LIMIT' },
          { orderType: 'STOP' },
          { orderType: 'STOP_LIMIT' },
          { orderType: 'TRAILING_STOP' }
        ]
      }).populate('stock');

      if (pendingOrders.length === 0) {
        return { processed: 0, success: 0, failed: 0 };
      }

      console.log(`Processing ${pendingOrders.length} pending orders`);

      let processed = 0;
      let success = 0;
      let failed = 0;

      // Process each order
      for (const order of pendingOrders) {
        try {
          processed++;

          // Check if order has expired
          if (order.expiresAt && new Date() > new Date(order.expiresAt)) {
            order.status = 'EXPIRED';
            await order.save();

            // Release held funds if it's a buy order
            if (order.type === 'BUY') {
              const user = await User.findById(order.user);
              if (user) {
                user.heldBalance -= order.totalAmount;
                if (user.heldBalance < 0) user.heldBalance = 0;
                await user.save();
              }
            }

            continue;
          }

          // Get current stock price
          const stockSymbol = order.stock.symbol;
          let currentPrice = null;

          // Try to get price from cache first
          const cachedQuote = await marketDataCacheService.getQuote(stockSymbol);
          if (cachedQuote && cachedQuote.price) {
            currentPrice = cachedQuote.price;
          } else {
            // If not in cache, fetch from Yahoo Finance
            try {
              const suffixes = ['.NS', '.BO'];
              for (const suffix of suffixes) {
                try {
                  const quote = await yahooFinance.quote(stockSymbol + suffix);
                  if (quote && quote.regularMarketPrice) {
                    currentPrice = quote.regularMarketPrice;
                    break;
                  }
                } catch (error) {
                  console.error(`Error fetching quote for ${stockSymbol}${suffix}:`, error);
                  // Try next suffix
                }
              }
            } catch (error) {
              console.error(`Error fetching price for ${stockSymbol}:`, error);
            }
          }

          if (!currentPrice) {
            console.error(`Could not get current price for ${stockSymbol}, skipping order ${order._id}`);
            continue;
          }

          // Update stock price in database
          await Stock.findByIdAndUpdate(order.stock._id, {
            currentPrice,
            lastUpdated: new Date()
          });

          // Process order based on type
          let shouldExecute = false;

          switch (order.orderType) {
            case 'LIMIT':
              // For buy orders, execute if price <= limit price
              // For sell orders, execute if price >= limit price
              if (order.type === 'BUY') {
                shouldExecute = currentPrice <= order.limitPrice;
              } else {
                shouldExecute = currentPrice >= order.limitPrice;
              }
              break;

            case 'STOP':
              // For buy orders, execute if price >= stop price (buy stop)
              // For sell orders, execute if price <= stop price (sell stop)
              if (order.type === 'BUY') {
                shouldExecute = currentPrice >= order.stopPrice;
              } else {
                shouldExecute = currentPrice <= order.stopPrice;
              }
              break;

            case 'STOP_LIMIT':
              // First check if stop price is reached
              let stopTriggered = false;
              if (order.type === 'BUY') {
                stopTriggered = currentPrice >= order.stopPrice;
              } else {
                stopTriggered = currentPrice <= order.stopPrice;
              }

              // If stop is triggered, check limit condition
              if (stopTriggered) {
                if (order.type === 'BUY') {
                  shouldExecute = currentPrice <= order.limitPrice;
                } else {
                  shouldExecute = currentPrice >= order.limitPrice;
                }
              }
              break;

            case 'TRAILING_STOP':
              // Initialize trailing stop price if not set
              if (!order.trailingStopPrice) {
                if (order.type === 'BUY') {
                  // For buy trailing stop, set initial stop price below current price
                  order.trailingStopPrice = currentPrice * (1 - order.trailingPercent / 100);
                  order.highestPrice = currentPrice;
                } else {
                  // For sell trailing stop, set initial stop price above current price
                  order.trailingStopPrice = currentPrice * (1 + order.trailingPercent / 100);
                  order.lowestPrice = currentPrice;
                }
                await order.save();
              } else {
                if (order.type === 'BUY') {
                  // For buy trailing stop, check if price has fallen below trailing stop
                  shouldExecute = currentPrice <= order.trailingStopPrice;

                  // If price is higher than previous highest, adjust trailing stop
                  if (currentPrice > order.highestPrice) {
                    order.highestPrice = currentPrice;
                    order.trailingStopPrice = currentPrice * (1 - order.trailingPercent / 100);
                    await order.save();
                  }
                } else {
                  // For sell trailing stop, check if price has risen above trailing stop
                  shouldExecute = currentPrice >= order.trailingStopPrice;

                  // If price is lower than previous lowest, adjust trailing stop
                  if (currentPrice < order.lowestPrice) {
                    order.lowestPrice = currentPrice;
                    order.trailingStopPrice = currentPrice * (1 + order.trailingPercent / 100);
                    await order.save();
                  }
                }
              }
              break;
          }

          // Execute order if conditions are met
          if (shouldExecute) {
            await tradeService.executeOrder(order, currentPrice);
            success++;
          }
        } catch (error) {
          console.error(`Error processing order ${order._id}:`, error);
          failed++;
        }
      }

      return { processed, success, failed };
    } catch (error) {
      console.error('Error processing pending orders:', error);
      return { processed: 0, success: 0, failed: 0, error: error.message };
    }
  },

  /**
   * Execute an order
   *
   * @param {Object} order - The order to execute
   * @param {number} currentPrice - Current stock price
   */
  executeOrder: async (order, currentPrice) => {
    try {
      // Get user
      const user = await User.findById(order.user);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if order can be executed
      if (order.status !== 'PENDING') {
        throw new Error(`Order is ${order.status}, cannot execute`);
      }

      // Get the stock details for notification
      const stock = await Stock.findById(order.stock);
      const stockName = stock ? (stock.companyName || stock.name) : order.symbol;

      // For buy orders, check if user has enough balance
      if (order.type === 'BUY') {
        const totalCost = order.quantity * currentPrice;

        // All trades use virtual currency
        // Check if user has enough virtual balance
        if (user.virtualBalance < totalCost) {
          order.status = 'REJECTED';
          order.lastUpdated = new Date();
          await order.save();

          // Send rejection notification
          if (user.email && user.settings?.emailNotifications?.orderUpdates) {
            try {
              await emailService.sendEmail(
                user.email,
                'Order Rejected - Insufficient Virtual Currency',
                `<h1>Order Rejected - Insufficient Virtual Currency</h1>
                <p>Your ${order.advancedOrderType} order to buy ${order.quantity} shares of ${stockName} at ${currentPrice.toFixed(2)} was rejected due to insufficient virtual currency.</p>
                <p>Required: ${totalCost.toLocaleString()} VC, Available: ${user.virtualBalance.toLocaleString()} VC</p>
                <p><a href="${process.env.CLIENT_URL}/dashboard/orders">View Your Orders</a></p>`
              );
              logInfo(`Sent order rejection email to ${user.email}`);
            } catch (emailError) {
              logError('Failed to send order rejection email', emailError);
            }
          }

          throw new Error(`Insufficient virtual currency. Required: ${totalCost.toLocaleString()} VC, Available: ${user.virtualBalance.toLocaleString()} VC`);
        }

        // Deduct from virtual balance
        user.virtualBalance -= totalCost;

        // Update order with actual execution price
        order.price = currentPrice;
        order.totalAmount = totalCost;
      } else {
        // For sell orders, check if user has enough stocks
        const portfolio = await Portfolio.findOne({ user: order.user });
        if (!portfolio) {
          throw new Error('Portfolio not found');
        }

        const holding = portfolio.holdings.find(h =>
          h.stock.toString() === order.stock._id.toString()
        );

        if (!holding || holding.quantity < order.quantity) {
          order.status = 'REJECTED';
          order.lastUpdated = new Date();
          await order.save();

          // Send rejection notification
          if (user.email && user.settings?.emailNotifications?.orderUpdates) {
            try {
              await emailService.sendEmail(
                user.email,
                'Order Rejected - Insufficient Shares',
                `<h1>Order Rejected - Insufficient Shares</h1>
                <p>Your ${order.advancedOrderType} order to sell ${order.quantity} shares of ${stockName} at ${currentPrice.toFixed(2)} was rejected because you don't have enough shares.</p>
                <p><a href="${process.env.CLIENT_URL}/dashboard/portfolio">View Your Portfolio</a></p>`
              );
              logInfo(`Sent order rejection email to ${user.email}`);
            } catch (emailError) {
              logError('Failed to send order rejection email', emailError);
            }
          }

          throw new Error('Insufficient stocks');
        }

        // Credit user with sale proceeds
        const saleProceeds = order.quantity * currentPrice;

        // All trades use virtual currency
        user.virtualBalance += saleProceeds;

        // Update order with actual execution price
        order.price = currentPrice;
        order.totalAmount = saleProceeds;
      }

      // Update order status
      order.status = 'COMPLETED';
      order.executedAt = new Date();
      order.filledQuantity = order.quantity;
      order.remainingQuantity = 0;
      order.lastUpdated = new Date();

      // Save user and order
      await user.save();
      await order.save();

      // Update portfolio
      await tradeService.updatePortfolio(order);

      // Send order execution notification
      if (user.email && user.settings?.emailNotifications?.orderUpdates) {
        try {
          const actionText = order.type === 'BUY' ? 'bought' : 'sold';
          const orderDetails = order.advancedOrderType === 'TRAILING_STOP'
            ? `${order.advancedOrderType} (${order.trailingPercent}% trailing)`
            : order.advancedOrderType;

          await emailService.sendEmail(
            user.email,
            `Order Executed - ${stockName}`,
            `<h1>Order Executed - ${stockName}</h1>
            <p>Your ${orderDetails} order to ${actionText} ${order.quantity} shares of ${stockName} has been executed at price ₹${currentPrice.toFixed(2)} for a total of ₹${order.totalAmount.toFixed(2)}.</p>
            <p><a href="${process.env.CLIENT_URL}/dashboard/orders">View Your Orders</a></p>`
          );
          logInfo(`Sent order execution email to ${user.email}`);
        } catch (emailError) {
          logError('Failed to send order execution email', emailError);
        }
      }

      return order;
    } catch (error) {
      logError(`Error executing order ${order._id}:`, error);
      throw error;
    }
  },

  /**
   * Update portfolio after order execution
   *
   * @param {Object} order - The executed order
   */
  updatePortfolio: async (order) => {
    try {
      let portfolio = await Portfolio.findOne({ user: order.user });
      if (!portfolio) {
        portfolio = await Portfolio.create({
          user: order.user,
          holdings: [],
        });
      }

      const holdingIndex = portfolio.holdings.findIndex(
        h => h.stock.toString() === order.stock._id.toString()
      );

      if (order.type === 'BUY') {
        if (holdingIndex === -1) {
          // Add new holding
          portfolio.holdings.push({
            stock: order.stock._id,
            quantity: order.quantity,
            averageBuyPrice: order.price,
            currentValue: order.totalAmount,
            profitLoss: 0,
          });
        } else {
          // Update existing holding
          const holding = portfolio.holdings[holdingIndex];
          const newQuantity = holding.quantity + order.quantity;
          const newAverageBuyPrice =
            ((holding.averageBuyPrice * holding.quantity) + order.totalAmount) / newQuantity;

          holding.quantity = newQuantity;
          holding.averageBuyPrice = newAverageBuyPrice;
          holding.currentValue = newQuantity * order.price;
          holding.profitLoss = holding.currentValue - (newQuantity * newAverageBuyPrice);
        }
      } else {
        // Sell order
        const holding = portfolio.holdings[holdingIndex];
        holding.quantity -= order.quantity;
        holding.currentValue = holding.quantity * order.price;
        holding.profitLoss = holding.currentValue - (holding.quantity * holding.averageBuyPrice);

        if (holding.quantity === 0) {
          portfolio.holdings.splice(holdingIndex, 1);
        }
      }

      // Update portfolio statistics
      if (typeof portfolio.updateStatistics === 'function') {
        await portfolio.updateStatistics();
      } else {
        // Calculate total value and profit/loss
        let totalValue = 0;
        let totalProfitLoss = 0;

        for (const holding of portfolio.holdings) {
          totalValue += holding.currentValue;
          totalProfitLoss += holding.profitLoss;
        }

        portfolio.totalValue = totalValue;
        portfolio.totalProfitLoss = totalProfitLoss;
      }

      await portfolio.save();

      // Invalidate portfolio cache to ensure fresh data on next fetch
      const portfolioCacheKey = `portfolio:${order.user}`;
      await cacheService.del(portfolioCacheKey);
      logInfo(`Invalidated portfolio cache for user ${order.user} after portfolio update`);

      return portfolio;
    } catch (error) {
      logError(`Error updating portfolio for order ${order._id}:`, error);
      throw error;
    }
  },

  /**
   * Process partial fills for orders
   *
   * @param {Object} order - The order to partially fill
   * @param {number} fillQuantity - Quantity to fill
   * @param {number} fillPrice - Price at which to fill
   */
  processPartialFill: async (order, fillQuantity, fillPrice) => {
    try {
      // Check if order allows partial fills
      if (!order.isPartialFillAllowed) {
        throw new Error('Order does not allow partial fills');
      }

      // Check if fill quantity is valid
      if (fillQuantity <= 0 || fillQuantity > order.remainingQuantity) {
        throw new Error('Invalid fill quantity');
      }

      // Get user
      const user = await User.findById(order.user);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate fill amount
      const fillAmount = fillQuantity * fillPrice;

      // Process based on order type
      if (order.type === 'BUY') {
        // For buy orders, check if user has enough held balance
        if (user.heldBalance < fillAmount) {
          throw new Error('Insufficient held balance for partial fill');
        }

        // Release proportional held funds and deduct actual cost
        const proportionalHeld = (fillQuantity / order.quantity) * order.totalAmount;
        user.heldBalance -= proportionalHeld;
        user.walletBalance -= fillAmount;
      } else {
        // For sell orders, check if user has enough stocks
        const portfolio = await Portfolio.findOne({ user: order.user });
        if (!portfolio) {
          throw new Error('Portfolio not found');
        }

        const holding = portfolio.holdings.find(h =>
          h.stock.toString() === order.stock._id.toString()
        );

        if (!holding || holding.quantity < fillQuantity) {
          throw new Error('Insufficient stocks for partial fill');
        }

        // Credit user's wallet with sale proceeds
        user.walletBalance += fillAmount;
      }

      // Update order
      order.filledQuantity += fillQuantity;
      order.remainingQuantity -= fillQuantity;
      order.lastUpdated = new Date();

      // If fully filled, mark as completed
      if (order.remainingQuantity === 0) {
        order.status = 'COMPLETED';
        order.executedAt = new Date();
      } else {
        order.status = 'PARTIALLY_FILLED';
      }

      // Save user and order
      await user.save();
      await order.save();

      // Create a new trade record for the partial fill
      const partialFillTrade = new Trade({
        user: order.user,
        stock: order.stock,
        type: order.type,
        quantity: fillQuantity,
        price: fillPrice,
        totalAmount: fillAmount,
        orderType: 'MARKET', // Partial fills are executed at market
        status: 'COMPLETED',
        executedAt: new Date(),
        filledQuantity: fillQuantity,
        remainingQuantity: 0,
        parentOrderId: order._id, // Reference to the original order
      });

      await partialFillTrade.save();

      // Update portfolio for the partial fill
      await tradeService.updatePortfolio(partialFillTrade);

      return { order, partialFillTrade };
    } catch (error) {
      console.error(`Error processing partial fill for order ${order._id}:`, error);
      throw error;
    }
  },

  async executeOrder(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const user = await User.findById(order.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const stock = await Stock.findOne({ symbol: order.symbol });
      if (!stock) {
        throw new Error('Stock not found');
      }

      // Validate order
      await this.validateOrder(order, user, stock);

      // Execute order
      const portfolio = await Portfolio.findOne({ userId: user._id });
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Update portfolio based on order type
      if (order.type === 'BUY') {
        await this.executeBuyOrder(order, portfolio, stock);
      } else if (order.type === 'SELL') {
        await this.executeSellOrder(order, portfolio, stock);
      }

      // Update order status
      order.status = 'EXECUTED';
      order.executedAt = new Date();
      await order.save();

      // Send confirmation email
      await emailService.sendOrderConfirmation(user, order);

      logInfo('Order executed successfully', { orderId });
      return order;
    } catch (error) {
      logError('Error executing order', error);
      throw error;
    }
  },

  async validateOrder(order, user, stock) {
    // Check if user has enough balance for buy orders
    if (order.type === 'BUY') {
      const totalCost = order.quantity * order.price;
      if (user.balance < totalCost) {
        throw new Error('Insufficient balance');
      }
    }

    // Check if user has enough shares for sell orders
    if (order.type === 'SELL') {
      const portfolio = await Portfolio.findOne({ userId: user._id });
      const stockHolding = portfolio.holdings.find(h => h.symbol === order.symbol);
      if (!stockHolding || stockHolding.quantity < order.quantity) {
        throw new Error('Insufficient shares');
      }
    }

    // Validate order price against current market price
    const priceDifference = Math.abs(order.price - stock.currentPrice);
    const maxAllowedDifference = stock.currentPrice * 0.05; // 5% difference allowed
    if (priceDifference > maxAllowedDifference) {
      throw new Error('Order price too far from current market price');
    }
  },

  async executeBuyOrder(order, portfolio, stock) {
    const totalCost = order.quantity * order.price;

    // Update user balance
    const user = await User.findById(order.userId);
    user.balance -= totalCost;
    await user.save();

    // Update portfolio holdings
    const stockHolding = portfolio.holdings.find(h => h.symbol === order.symbol);
    if (stockHolding) {
      stockHolding.quantity += order.quantity;
      stockHolding.averagePrice = (stockHolding.averagePrice * (stockHolding.quantity - order.quantity) +
                                 order.price * order.quantity) / stockHolding.quantity;
    } else {
      portfolio.holdings.push({
        symbol: order.symbol,
        quantity: order.quantity,
        averagePrice: order.price
      });
    }
    await portfolio.save();
  },

  async executeSellOrder(order, portfolio, stock) {
    const totalValue = order.quantity * order.price;

    // Update user balance
    const user = await User.findById(order.userId);
    user.balance += totalValue;
    await user.save();

    // Update portfolio holdings
    const stockHolding = portfolio.holdings.find(h => h.symbol === order.symbol);
    if (stockHolding) {
      stockHolding.quantity -= order.quantity;
      if (stockHolding.quantity === 0) {
        portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== order.symbol);
      }
      await portfolio.save();
    }
  },

  async cancelOrder(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'PENDING') {
        throw new Error('Order cannot be cancelled');
      }

      order.status = 'CANCELLED';
      order.cancelledAt = new Date();
      await order.save();

      logInfo('Order cancelled successfully', { orderId });
      return order;
    } catch (error) {
      logError('Error cancelling order', error);
      throw error;
    }
  },

  async getOrderHistory(userId, filters = {}) {
    try {
      const query = { userId };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.symbol) {
        query.symbol = filters.symbol;
      }

      if (filters.type) {
        query.type = filters.type;
      }

      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      return orders;
    } catch (error) {
      logError('Error fetching order history', error);
      throw error;
    }
  }
};

export default tradeService;