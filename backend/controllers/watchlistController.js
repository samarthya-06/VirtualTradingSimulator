import asyncHandler from 'express-async-handler';
import Watchlist from '../models/watchlistModel.js';
import Stock from '../models/stockModel.js';

// Helper function to update stock price
const updateStockPrice = async (stockId) => {
    try {
        const stock = await Stock.findById(stockId);
        if (!stock) return null;
        
        // Check if the price was updated recently (within the last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (stock.lastUpdated && stock.lastUpdated > fiveMinutesAgo) {
            return stock; // Return existing stock if recently updated
        }
        
        // Import the stock market service dynamically to avoid circular dependencies
        const stockMarketService = (await import('../services/stockMarketService.js')).default;
        
        // Fetch the latest stock data
        const stockData = await stockMarketService.getQuote(stock.symbol);
        
        if (stockData && stockData.price) {
            // Save the previous price before updating
            const previousClose = stock.currentPrice;
            
            // Update the stock with new price data
            stock.previousClose = previousClose;
            stock.currentPrice = stockData.price;
            stock.dayHigh = stockData.dayHigh || stock.dayHigh;
            stock.dayLow = stockData.dayLow || stock.dayLow;
            stock.volume = stockData.volume || stock.volume;
            stock.lastUpdated = new Date();
            
            // Save the updated stock
            await stock.save();
            console.log(`Updated price for ${stock.symbol}: ${stock.currentPrice} (prev: ${stock.previousClose})`);
        }
        
        return stock;
    } catch (error) {
        console.error(`Error updating stock price for ID ${stockId}:`, error);
        return null;
    }
};

// @desc    Get user's watchlists
// @route   GET /api/watchlist
// @access  Private
export const getWatchlists = asyncHandler(async (req, res) => {
    const watchlists = await Watchlist.find({ user: req.user.id })
        .populate('stocks.stock', 'symbol companyName currentPrice previousClose dayHigh dayLow volume lastUpdated');

    // Update stock prices for all stocks in all watchlists
    const updatePromises = [];
    
    for (const watchlist of watchlists) {
        for (const stockEntry of watchlist.stocks) {
            updatePromises.push(
                updateStockPrice(stockEntry.stock._id)
                    .catch(err => console.error(`Error updating stock ${stockEntry.stock.symbol}:`, err))
            );
        }
    }
    
    // Wait for all stock updates to complete
    await Promise.all(updatePromises);
    
    // Re-fetch watchlists with updated stock data
    const updatedWatchlists = await Watchlist.find({ user: req.user.id })
        .populate('stocks.stock', 'symbol companyName currentPrice previousClose dayHigh dayLow volume lastUpdated');

    res.json(updatedWatchlists);
});

// @desc    Create a new watchlist
// @route   POST /api/watchlist
// @access  Private
export const createWatchlist = asyncHandler(async (req, res) => {
    const { name = 'Default Watchlist', isDefault = false } = req.body;

    // Check if user already has a default watchlist
    if (isDefault) {
        const existingDefault = await Watchlist.findOne({
            user: req.user.id,
            isDefault: true
        });
        
        if (existingDefault) {
            existingDefault.isDefault = false;
            await existingDefault.save();
        }
    }

    // Check if watchlist with same name exists
    const watchlistExists = await Watchlist.findOne({
        user: req.user.id,
        name
    });

    if (watchlistExists) {
        // If it's the same name but we want to make it default
        if (isDefault && !watchlistExists.isDefault) {
            watchlistExists.isDefault = true;
            await watchlistExists.save();
            return res.json(watchlistExists);
        }
        res.status(400);
        throw new Error('Watchlist with this name already exists');
    }

    // Create new watchlist
    const watchlist = await Watchlist.create({
        user: req.user.id,
        name,
        stocks: [],
        isDefault
    });

    res.status(201).json(watchlist);
});

// @desc    Add stock to watchlist by symbol
// @route   POST /api/watchlist/:id/stocks
// @access  Private
export const addStockToWatchlist = asyncHandler(async (req, res) => {
    const { symbol, stockData } = req.body;
    
    if (!symbol) {
        res.status(400);
        throw new Error('Stock symbol is required');
    }

    if (!stockData) {
        res.status(400);
        throw new Error('Stock data is required');
    }

    const watchlist = await Watchlist.findOne({
        _id: req.params.id,
        user: req.user.id,
    }).populate('stocks.stock', 'symbol');

    if (!watchlist) {
        res.status(404);
        throw new Error('Watchlist not found');
    }

    // Clean the symbol by removing exchange suffixes
    const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');

    // Find or create the stock
    let stock = await Stock.findOne({ symbol: cleanSymbol });

    if (!stock) {
        try {
            stock = await Stock.create({
                symbol: cleanSymbol,
                companyName: stockData.companyName || cleanSymbol,
                currentPrice: parseFloat(stockData.currentPrice) || 0,
                previousClose: parseFloat(stockData.previousClose) || 0,
                volume: parseInt(stockData.volume) || 0,
                dayHigh: parseFloat(stockData.dayHigh) || 0,
                dayLow: parseFloat(stockData.dayLow) || 0,
                marketCap: parseFloat(stockData.marketCap) || 0,
                exchange: stockData.exchange || (symbol.endsWith('.NS') ? 'NSE' : 'BSE')
            });
        } catch (error) {
            console.error('Error creating stock:', error);
            res.status(500);
            throw new Error(`Failed to create stock: ${error.message}`);
        }
    } else {
        // Update existing stock with new data
        try {
            stock.companyName = stockData.companyName || stock.companyName;
            stock.currentPrice = parseFloat(stockData.currentPrice) || stock.currentPrice;
            stock.previousClose = parseFloat(stockData.previousClose) || stock.previousClose;
            stock.volume = parseInt(stockData.volume) || stock.volume;
            stock.dayHigh = parseFloat(stockData.dayHigh) || stock.dayHigh;
            stock.dayLow = parseFloat(stockData.dayLow) || stock.dayLow;
            stock.marketCap = parseFloat(stockData.marketCap) || stock.marketCap;
            stock.exchange = stockData.exchange || stock.exchange || (symbol.endsWith('.NS') ? 'NSE' : 'BSE');
            await stock.save();
        } catch (error) {
            console.error('Error updating stock:', error);
            res.status(500);
            throw new Error(`Failed to update stock: ${error.message}`);
        }
    }

    // Check if stock already exists in watchlist
    const stockExists = watchlist.stocks.some(s => 
        s.stock && s.stock.symbol === cleanSymbol
    );

    if (stockExists) {
        res.status(400);
        throw new Error('Stock already exists in watchlist');
    }

    // Add stock to watchlist
    watchlist.stocks.push({
        stock: stock._id,
        alerts: []
    });

    try {
        await watchlist.save();
        // Populate the stock details before sending response
        await watchlist.populate('stocks.stock', 'symbol companyName currentPrice dayHigh dayLow volume previousClose');
        res.json(watchlist);
    } catch (error) {
        console.error('Error saving watchlist:', error);
        res.status(500);
        throw new Error(`Failed to save watchlist: ${error.message}`);
    }
});

// @desc    Remove stock from watchlist
// @route   DELETE /api/watchlist/:id/stocks/:stockId
// @access  Private
export const removeStockFromWatchlist = asyncHandler(async (req, res) => {
    const watchlist = await Watchlist.findOne({
        _id: req.params.id,
        user: req.user.id,
    });

    if (!watchlist) {
        res.status(404);
        throw new Error('Watchlist not found');
    }

    const stockIndex = watchlist.stocks.findIndex(
        s => s.stock.toString() === req.params.stockId
    );

    if (stockIndex === -1) {
        res.status(404);
        throw new Error('Stock not found in watchlist');
    }

    watchlist.stocks.splice(stockIndex, 1);
    await watchlist.save();

    res.json(watchlist);
});

// @desc    Add alert to stock in watchlist
// @route   POST /api/watchlist/:id/stocks/:stockId/alerts
// @access  Private
export const addStockAlert = asyncHandler(async (req, res) => {
    const { type, value } = req.body;
    const watchlist = await Watchlist.findOne({
        _id: req.params.id,
        user: req.user.id,
    });

    if (!watchlist) {
        res.status(404);
        throw new Error('Watchlist not found');
    }

    const stockEntry = watchlist.stocks.find(
        s => s.stock.toString() === req.params.stockId
    );

    if (!stockEntry) {
        res.status(404);
        throw new Error('Stock not found in watchlist');
    }

    stockEntry.alerts.push({
        type,
        value,
        isActive: true,
    });

    await watchlist.save();

    res.json(watchlist);
});

// @desc    Remove alert from stock in watchlist
// @route   DELETE /api/watchlist/:id/stocks/:stockId/alerts/:alertId
// @access  Private
export const removeStockAlert = asyncHandler(async (req, res) => {
    const watchlist = await Watchlist.findOne({
        _id: req.params.id,
        user: req.user.id,
    });

    if (!watchlist) {
        res.status(404);
        throw new Error('Watchlist not found');
    }

    const stockEntry = watchlist.stocks.find(
        s => s.stock.toString() === req.params.stockId
    );

    if (!stockEntry) {
        res.status(404);
        throw new Error('Stock not found in watchlist');
    }

    const alertIndex = stockEntry.alerts.findIndex(
        a => a._id.toString() === req.params.alertId
    );

    if (alertIndex === -1) {
        res.status(404);
        throw new Error('Alert not found');
    }

    stockEntry.alerts.splice(alertIndex, 1);
    await watchlist.save();

    res.json(watchlist);
});

// Functions are exported using named exports