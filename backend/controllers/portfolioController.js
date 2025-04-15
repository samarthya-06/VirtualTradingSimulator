import asyncHandler from 'express-async-handler';
import Portfolio from '../models/portfolioModel.js';
import Stock from '../models/stockModel.js';
import portfolioAnalyticsService from '../services/portfolioAnalyticsService.js';
import cacheService from '../services/cacheService.js';
import { executeWithTimeout, optimizedAggregation, applyLean } from '../utils/queryOptimizer.js';
import { logError } from '../utils/logger.js';
import mongoose from 'mongoose';
import User from '../models/userModel.js';

// Cache TTL values in seconds
const CACHE_TTL = {
  PORTFOLIO: 300,             // 5 minutes for portfolio data
  PORTFOLIO_HISTORY: 1800,    // 30 minutes for portfolio history
  PORTFOLIO_PERFORMANCE: 900, // 15 minutes for portfolio performance
  SECTOR_BREAKDOWN: 3600,     // 1 hour for sector breakdown
  RISK_ASSESSMENT: 3600,      // 1 hour for risk assessment
};

// Helper function to update stock price with caching
const updateStockPrice = async (stockId) => {
    try {
        // Check cache first
        const cacheKey = `stock_price:${stockId}`;
        const cachedStock = await cacheService.get(cacheKey);

        if (cachedStock) {
            return cachedStock;
        }

        const stock = await Stock.findById(stockId).lean();
        if (!stock) return null;

        // Check if the price was updated recently (within the last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (stock.lastUpdated && new Date(stock.lastUpdated) > fiveMinutesAgo) {
            // Cache and return existing stock if recently updated
            await cacheService.set(cacheKey, stock, 300); // Cache for 5 minutes
            return stock;
        }

        // Import the stock market service dynamically to avoid circular dependencies
        const stockMarketService = (await import('../services/stockMarketService.js')).default;

        // Fetch the latest stock data
        const stockData = await stockMarketService.getQuote(stock.symbol);

        if (stockData && stockData.price) {
            // Update the stock with new price data
            const updatedStock = {
                ...stock,
                currentPrice: stockData.price,
                dayHigh: stockData.dayHigh || stock.dayHigh,
                dayLow: stockData.dayLow || stock.dayLow,
                volume: stockData.volume || stock.volume,
                lastUpdated: new Date()
            };

            // Update the database using findOneAndUpdate for atomicity
            await Stock.findOneAndUpdate(
                { _id: stockId },
                {
                    $set: {
                        currentPrice: updatedStock.currentPrice,
                        dayHigh: updatedStock.dayHigh,
                        dayLow: updatedStock.dayLow,
                        volume: updatedStock.volume,
                        lastUpdated: updatedStock.lastUpdated
                    }
                },
                { new: true, runValidators: true }
            );

            // Cache the updated stock
            await cacheService.set(cacheKey, updatedStock, 300);

            return updatedStock;
        }

        // If no price update was available, cache and return the existing stock
        await cacheService.set(cacheKey, stock, 60); // Shorter cache time if no update
        return stock;
    } catch (error) {
        logError(`Error updating stock price for ID ${stockId}:`, error);
        return null;
    }
};

// Batch update stock prices to reduce API calls
const batchUpdateStockPrices = async (holdings) => {
    // Map to store stock symbols by ID for faster lookups
    const stocksById = {};
    const stockSymbols = [];

    // Collect all stock IDs and symbols
    for (const holding of holdings) {
        if (holding.stock && holding.stock._id) {
            stocksById[holding.stock._id.toString()] = holding.stock;
            stockSymbols.push(holding.stock.symbol);
        }
    }

    // If no stocks to update, return
    if (stockSymbols.length === 0) return {};

    try {
        // Import the stock market service dynamically
        const stockMarketService = (await import('../services/stockMarketService.js')).default;

        // Batch fetch stock quotes for all symbols
        const batchQuotes = await stockMarketService.getBatchQuotes(stockSymbols);

        // Cache and update each stock
        const updatePromises = [];
        for (const [symbol, quoteData] of Object.entries(batchQuotes)) {
            // Find the corresponding stock
            const stock = Object.values(stocksById).find(s => s.symbol === symbol);
            if (!stock || !quoteData.price) continue;

            const stockId = stock._id.toString();
            const cacheKey = `stock_price:${stockId}`;

            // Update stock data
            const updatedStock = {
                ...stock,
                currentPrice: quoteData.price,
                dayHigh: quoteData.dayHigh || stock.dayHigh,
                dayLow: quoteData.dayLow || stock.dayLow,
                volume: quoteData.volume || stock.volume,
                lastUpdated: new Date()
            };

            // Cache the updated stock
            await cacheService.set(cacheKey, updatedStock, 300);

            // Queue database update
            updatePromises.push(
                Stock.updateOne(
                    { _id: stockId },
                    {
                        $set: {
                            currentPrice: updatedStock.currentPrice,
                            dayHigh: updatedStock.dayHigh,
                            dayLow: updatedStock.dayLow,
                            volume: updatedStock.volume,
                            lastUpdated: updatedStock.lastUpdated
                        }
                    }
                )
            );

            // Update the stock in our map
            stocksById[stockId] = updatedStock;
        }

        // Execute all database updates in parallel
        if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
        }

        return stocksById;
    } catch (error) {
        logError('Error in batch updating stock prices:', error);
        return stocksById; // Return original stock data on error
    }
};

// @desc    Get user's portfolio
// @route   GET /api/portfolio
// @access  Private
const getPortfolio = asyncHandler(async (req, res) => {
    // Ensure req.user exists and has a valid _id property
    if (!req.user || !req.user._id) {
        res.status(401);
        throw new Error('User not authenticated or invalid user ID');
    }

    const userId = req.user._id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        logError(`Invalid user ID format: ${userId}`);
        res.status(400);
        throw new Error('Invalid user ID format');
    }

    // Log for debugging
    console.log(`Getting portfolio for user ID: ${userId}`);

    // Check if we should bypass cache (t parameter is present)
    const bypassCache = req.query.t !== undefined;
    console.log(`Bypass cache: ${bypassCache}, Query params:`, req.query);

    const cacheKey = `portfolio:${userId}`;

    // Try to get from cache first if not bypassing cache
    if (!bypassCache) {
        const cachedPortfolio = await cacheService.get(cacheKey);
        if (cachedPortfolio) {
            console.log('Returning cached portfolio data');
            return res.json(cachedPortfolio);
        }
    } else {
        console.log('Bypassing cache and fetching fresh portfolio data');
        // Invalidate the cache if bypassing
        await cacheService.del(cacheKey);
    }

    // Find portfolio with lean query for better performance
    let portfolio = await Portfolio.findOne({ user: userId })
        .populate('holdings.stock', 'symbol companyName currentPrice dayHigh dayLow volume lastUpdated')
        .lean();

    if (!portfolio) {
        // Create a new portfolio if it doesn't exist
        try {
            // Check if user exists in database
            const userExists = await User.findById(userId);
            if (!userExists) {
                logError(`User not found for ID: ${userId}`);
                res.status(404);
                throw new Error('User not found');
            }

            console.log(`Creating new portfolio for user: ${userId}`);

            // Create a portfolio document with explicit field names
            const portfolioData = {
                user: userId, // This is the correct field name as per the model
                holdings: [],
                totalInvestment: 0,
                currentValue: 0,
                overallProfitLoss: 0,
                profitLossPercentage: 0,
            };

            // Ensure we're not accidentally adding a userId field
            if ('userId' in portfolioData) {
                delete portfolioData.userId;
            }

            // Log the data we're about to save
            console.log(`Creating portfolio with data:`, JSON.stringify(portfolioData));

            const newPortfolio = await Portfolio.create(portfolioData);

            // Verify the portfolio was created with the correct user ID
            if (!newPortfolio.user || !newPortfolio.user.equals(userId)) {
                logError(`Portfolio created with incorrect user ID. Expected: ${userId}, Got: ${newPortfolio.user}`);
                res.status(500);
                throw new Error('Error creating portfolio with correct user ID');
            }

            // Log success
            console.log(`Successfully created portfolio with ID: ${newPortfolio._id} for user: ${userId}`);

            portfolio = newPortfolio.toObject();
        } catch (error) {
            logError(`Error creating portfolio for user ${userId}:`, error);
            res.status(500);
            throw new Error('Failed to create portfolio. Please try again.');
        }
    }

    if (portfolio.holdings.length > 0) {
        // Batch update all stock prices
        const updatedStocksById = await batchUpdateStockPrices(portfolio.holdings);

        // Update the holdings with latest prices and calculations
        for (const holding of portfolio.holdings) {
            const stockId = holding.stock._id.toString();
            const updatedStock = updatedStocksById[stockId] || holding.stock;

            // Update stock reference
            holding.stock = updatedStock;

            // Recalculate values with the latest price
            holding.currentValue = holding.quantity * updatedStock.currentPrice;
            holding.profitLoss = holding.currentValue - (holding.quantity * holding.averageBuyPrice);
            holding.profitLossPercentage = ((holding.currentValue / (holding.quantity * holding.averageBuyPrice)) - 1) * 100;
        }

        // Calculate portfolio statistics
        const totalInvestment = portfolio.holdings.reduce((sum, h) => sum + (h.quantity * h.averageBuyPrice), 0);
        const totalCurrentValue = portfolio.holdings.reduce((sum, h) => sum + h.currentValue, 0);
        const totalProfitLoss = portfolio.holdings.reduce((sum, h) => sum + h.profitLoss, 0);

        portfolio.statistics = {
            totalInvestment,
            totalCurrentValue,
            totalProfitLoss,
            profitLossPercentage: totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0,
            lastUpdated: new Date()
        };
    }

    // Cache the portfolio
    await cacheService.set(cacheKey, portfolio, CACHE_TTL.PORTFOLIO);

    res.json(portfolio);
});

// @desc    Get portfolio performance history
// @route   GET /api/portfolio/history
// @access  Private
const getPortfolioHistory = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { period = '1m' } = req.query;
        const cacheKey = `portfolio_history:${userId}:${period}`;

        // Try to get from cache first
        const cachedHistory = await cacheService.get(cacheKey);
        if (cachedHistory) {
            return res.json(cachedHistory);
        }

        // Check if portfolio exists
        const portfolioExists = await Portfolio.exists({ user: userId });
        if (!portfolioExists) {
            return res.status(404).json({ message: 'Portfolio not found' });
        }

        // Calculate start date based on period
        const startDate = new Date();
        switch (period) {
            case '1w':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '1m':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case '3m':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            case '6m':
                startDate.setMonth(startDate.getMonth() - 6);
                break;
            case '1y':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setMonth(startDate.getMonth() - 1); // Default to 1 month
        }

        // Get portfolio value history using optimized aggregation
        const pipeline = [
            { $match: { user: userId } },
            { $unwind: '$holdings' },
            {
                $lookup: {
                    from: 'stocks',
                    localField: 'holdings.stock',
                    foreignField: '_id',
                    as: 'stockData'
                }
            },
            { $unwind: '$stockData' },
            {
                $group: {
                    _id: '$_id',
                    totalValue: { $sum: { $multiply: ['$holdings.quantity', '$stockData.currentPrice'] } },
                    date: { $first: '$updatedAt' }
                }
            },
            { $sort: { date: 1 } }
        ];

        const history = await optimizedAggregation(Portfolio, pipeline, { timeout: 15000 });

        // Cache the result
        await cacheService.set(cacheKey, history, CACHE_TTL.PORTFOLIO_HISTORY);

        res.json(history);
    } catch (error) {
        logError('Portfolio history error:', error);
        res.status(500).json({ message: 'Error fetching portfolio history', error: error.message });
    }
});

// @desc    Get detailed portfolio performance metrics
// @route   GET /api/portfolio/performance
// @access  Private
const getPortfolioPerformance = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { t } = req.query; // t is for cache busting
        const cacheKey = `portfolio_performance:${userId}`;

        // Check if we should bypass cache
        const bypassCache = t !== undefined;
        console.log(`Performance metrics request - Bypass cache: ${bypassCache}`);

        // Try to get from cache first if not bypassing
        if (!bypassCache) {
            const cachedPerformance = await cacheService.get(cacheKey);
            if (cachedPerformance) {
                console.log('Returning cached performance metrics');
                return res.json(cachedPerformance);
            }
        } else {
            // Invalidate cache if bypassing
            console.log('Invalidating performance metrics cache');
            await cacheService.del(cacheKey);
        }

        console.log(`Fetching fresh performance metrics for user ${userId}`);
        const performanceMetrics = await portfolioAnalyticsService.getDetailedPerformanceMetrics(userId);

        if (!performanceMetrics) {
            return res.status(404).json({ message: 'Portfolio not found' });
        }

        // Add last updated timestamp
        performanceMetrics.lastUpdated = new Date();

        // Cache the result
        await cacheService.set(cacheKey, performanceMetrics, CACHE_TTL.PORTFOLIO_PERFORMANCE);

        console.log('Returning fresh performance metrics');
        res.json(performanceMetrics);
    } catch (error) {
        logError('Error fetching portfolio performance:', error);
        res.status(500).json({ message: 'Error fetching portfolio performance', error: error.message });
    }
});

// @desc    Get historical portfolio performance data
// @route   GET /api/portfolio/historical
// @access  Private
const getHistoricalPerformance = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { period = '1m', t } = req.query; // t is for cache busting
        const cacheKey = `portfolio_historical:${userId}:${period}`;

        // Check if we should bypass cache
        const bypassCache = t !== undefined;
        console.log(`Historical data request - Bypass cache: ${bypassCache}, Period: ${period}`);

        // Try to get from cache first if not bypassing
        if (!bypassCache) {
            const cachedHistorical = await cacheService.get(cacheKey);
            if (cachedHistorical) {
                console.log('Returning cached historical data');
                return res.json(cachedHistorical);
            }
        } else {
            // Invalidate cache if bypassing
            console.log('Invalidating historical data cache');
            await cacheService.del(cacheKey);
        }

        console.log(`Fetching fresh historical data for user ${userId} with period ${period}`);
        const historicalData = await portfolioAnalyticsService.getHistoricalPerformance(userId, period);

        // Ensure dates are properly formatted
        const formattedData = historicalData.map(point => ({
            date: point.date instanceof Date ? point.date.toISOString() : new Date(point.date).toISOString(),
            value: typeof point.value === 'number' ? point.value : parseFloat(point.value || 0)
        }));

        // Cache the result
        await cacheService.set(cacheKey, formattedData, CACHE_TTL.PORTFOLIO_PERFORMANCE);

        console.log(`Returning ${formattedData.length} historical data points`);
        res.json(formattedData);
    } catch (error) {
        logError('Error fetching historical performance:', error);
        res.status(500).json({ message: 'Error fetching historical performance', error: error.message });
    }
});

// @desc    Get sector-wise portfolio breakdown
// @route   GET /api/portfolio/sectors
// @access  Private
const getSectorBreakdown = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const cacheKey = `portfolio_sectors:${userId}`;

        // Try to get from cache first
        const cachedSectors = await cacheService.get(cacheKey);
        if (cachedSectors) {
            return res.json(cachedSectors);
        }

        const sectorData = await portfolioAnalyticsService.getSectorBreakdown(userId);

        // Cache the result
        await cacheService.set(cacheKey, sectorData, CACHE_TTL.SECTOR_BREAKDOWN);

        res.json(sectorData);
    } catch (error) {
        logError('Error fetching sector breakdown:', error);
        res.status(500).json({ message: 'Error fetching sector breakdown', error: error.message });
    }
});

// @desc    Get portfolio risk assessment
// @route   GET /api/portfolio/risk
// @access  Private
const getRiskAssessment = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { t } = req.query; // t is for cache busting
        const cacheKey = `portfolio_risk:${userId}`;

        // Check if we should bypass cache
        const bypassCache = t !== undefined;
        console.log(`Risk assessment request - Bypass cache: ${bypassCache}`);

        // Try to get from cache first if not bypassing
        if (!bypassCache) {
            const cachedRisk = await cacheService.get(cacheKey);
            if (cachedRisk) {
                console.log('Returning cached risk assessment');
                return res.json(cachedRisk);
            }
        } else {
            // Invalidate cache if bypassing
            console.log('Invalidating risk assessment cache');
            await cacheService.del(cacheKey);
        }

        console.log(`Fetching fresh risk assessment for user ${userId}`);
        const riskData = await portfolioAnalyticsService.getRiskAssessment(userId);

        if (!riskData) {
            return res.status(404).json({ message: 'Portfolio not found or empty' });
        }

        // Add last updated timestamp
        riskData.lastUpdated = new Date();

        // Cache the result
        await cacheService.set(cacheKey, riskData, CACHE_TTL.RISK_ASSESSMENT);

        console.log('Returning fresh risk assessment');
        res.json(riskData);
    } catch (error) {
        logError('Error fetching risk assessment:', error);
        res.status(500).json({ message: 'Error fetching risk assessment', error: error.message });
    }
});

// @desc    Invalidate all portfolio-related caches for a user
// @route   POST /api/portfolio/cache/invalidate
// @access  Private
const invalidatePortfolioCache = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const pattern = `portfolio*:${userId}*`;

        const count = await cacheService.delByPattern(pattern);

        res.json({
            success: true,
            message: `Invalidated ${count} cache entries for portfolio data`
        });
    } catch (error) {
        logError('Error invalidating portfolio cache:', error);
        res.status(500).json({ message: 'Error invalidating cache', error: error.message });
    }
});

// @desc    Create a new portfolio
// @route   POST /api/portfolio
// @access  Private
const createPortfolio = asyncHandler(async (req, res) => {
    // Ensure req.user exists and has a valid _id property
    if (!req.user || !req.user._id) {
        res.status(401);
        throw new Error('User not authenticated or invalid user ID');
    }

    const userId = req.user._id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        logError(`Invalid user ID format: ${userId}`);
        res.status(400);
        throw new Error('Invalid user ID format');
    }

    // Check if user exists in database
    const userExists = await User.findById(userId);
    if (!userExists) {
        logError(`User not found for ID: ${userId}`);
        res.status(404);
        throw new Error('User not found');
    }

    // Check if portfolio already exists for this user
    const existingPortfolio = await Portfolio.findOne({ user: userId });

    if (existingPortfolio) {
        return res.status(400).json({ message: 'Portfolio already exists for this user' });
    }

    try {
        // Create a portfolio document with explicit field names
        const portfolioData = {
            user: userId, // This is the correct field name as per the model
            holdings: [],
            totalInvestment: 0,
            currentValue: 0,
            overallProfitLoss: 0,
            profitLossPercentage: 0,
        };

        // Ensure we're not accidentally adding a userId field
        if ('userId' in portfolioData) {
            delete portfolioData.userId;
        }

        // Log the data we're about to save
        console.log(`Creating portfolio with data:`, JSON.stringify(portfolioData));

        const portfolio = await Portfolio.create(portfolioData);

        // Verify the portfolio was created with the correct user ID
        if (!portfolio.user || !portfolio.user.equals(userId)) {
            logError(`Portfolio created with incorrect user ID. Expected: ${userId}, Got: ${portfolio.user}`);
            res.status(500);
            throw new Error('Error creating portfolio with correct user ID');
        }

        // Log success
        console.log(`Successfully created portfolio with ID: ${portfolio._id} for user: ${userId}`);

        res.status(201).json(portfolio);
    } catch (error) {
        logError(`Error creating portfolio for user ${userId}:`, error);
        res.status(500);
        throw new Error('Failed to create portfolio. Please try again.');
    }
});

export {
    getPortfolio,
    getPortfolioHistory,
    getPortfolioPerformance,
    getHistoricalPerformance,
    getSectorBreakdown,
    getRiskAssessment,
    invalidatePortfolioCache,
    createPortfolio
};