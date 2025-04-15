import Stock from '../models/stockModel.js';
import stockMarketService from '../services/stockMarketService.js';
import * as technicalIndicatorsService from '../services/technicalIndicatorsService.js';
import cacheService from '../services/cacheService.js';

/**
 * Stock Screener Controller
 * Provides endpoints for filtering stocks based on various criteria
 */

const CACHE_TTL = 60 * 5; // 5 minutes

/**
 * Get stocks that match filter criteria
 * @param {Object} req - Request object with filter parameters
 * @param {Object} res - Response object
 * @returns {Object} JSON response with matching stocks
 */
export const getStocksByFilter = async (req, res) => {
  try {
    const {
      sector,
      minPrice,
      maxPrice,
      marketCap,
      technicalIndicator,
      minPE,
      maxPE,
      minDividendYield,
      limit = 50,
      page = 1
    } = req.query;

    // Build cache key from query parameters
    const cacheKey = `stockScreener:${JSON.stringify(req.query)}`;
    
    // Try to get results from cache
    const cachedResults = await cacheService.get(cacheKey);
    if (cachedResults) {
      return res.status(200).json({
        success: true,
        fromCache: true,
        data: cachedResults
      });
    }

    // Build filter query
    const filter = {};
    const projection = {};
    const sort = { name: 1 }; // Default sort by name ascending

    // Apply filters based on provided parameters
    if (sector && sector !== 'All Sectors') {
      filter.sector = sector;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.currentPrice = {};
      if (minPrice !== undefined) {
        filter.currentPrice.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined) {
        filter.currentPrice.$lte = Number(maxPrice);
      }
    }

    if (marketCap) {
      switch (marketCap) {
        case 'small':
          filter.marketCap = { $lt: 50000000000 }; // < 5,000 Cr
          break;
        case 'mid':
          filter.marketCap = { $gte: 50000000000, $lte: 200000000000 }; // 5,000 - 20,000 Cr
          break;
        case 'large':
          filter.marketCap = { $gt: 200000000000 }; // > 20,000 Cr
          break;
      }
    }

    if (minPE !== undefined || maxPE !== undefined) {
      filter.peRatio = {};
      if (minPE !== undefined) {
        filter.peRatio.$gte = Number(minPE);
      }
      if (maxPE !== undefined) {
        filter.peRatio.$lte = Number(maxPE);
      }
    }

    if (minDividendYield !== undefined) {
      filter.dividendYield = { $gte: Number(minDividendYield) };
    }

    // Handle technical indicators
    let technicalFilteredSymbols = null;
    if (technicalIndicator) {
      const allStocks = await Stock.find({}, { symbol: 1, _id: 0 });
      const symbols = allStocks.map(stock => stock.symbol);
      
      technicalFilteredSymbols = await filterStocksByTechnicalIndicator(
        symbols,
        technicalIndicator
      );
      
      if (technicalFilteredSymbols && technicalFilteredSymbols.length > 0) {
        filter.symbol = { $in: technicalFilteredSymbols };
      } else {
        // If no stocks match the technical indicator, return empty result
        return res.status(200).json({
          success: true,
          count: 0,
          data: []
        });
      }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Get total count for pagination
    const total = await Stock.countDocuments(filter);
    
    // Get filtered stocks
    const stocks = await Stock.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .select('symbol name currentPrice change changePercent sector industry marketCap peRatio dividendYield volume lastUpdated');

    // Map response data
    const mappedStocks = stocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.currentPrice,
      change: stock.changePercent || 0,
      sector: stock.sector || 'N/A',
      industry: stock.industry || 'N/A',
      marketCap: formatMarketCap(stock.marketCap),
      pe: stock.peRatio || 0,
      dividendYield: stock.dividendYield || 0,
      volume: stock.volume || 0,
      lastUpdated: stock.lastUpdated
    }));

    // Cache results
    await cacheService.set(cacheKey, {
      stocks: mappedStocks,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    }, CACHE_TTL);

    return res.status(200).json({
      success: true,
      count: mappedStocks.length,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      },
      data: mappedStocks
    });
  } catch (error) {
    console.error('Stock screener error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

/**
 * Filter stocks by technical indicator
 * @param {Array} symbols - Array of stock symbols
 * @param {String} indicator - Technical indicator to filter by
 * @returns {Array} Filtered stock symbols
 */
const filterStocksByTechnicalIndicator = async (symbols, indicator) => {
  try {
    const filteredSymbols = [];
    
    // Process in batches to avoid overloading
    const batchSize = 20;
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(async (symbol) => {
        try {
          // Get historical prices for the stock
          const history = await stockMarketService.getHistoricalData(symbol, '6m');
          if (!history || !history.prices || history.prices.length < 30) {
            return null; // Skip stocks with insufficient data
          }
          
          const prices = history.prices.map(p => p.close);
          
          // Apply technical indicator filter
          switch (indicator) {
            case 'rsi_oversold':
              const rsi = technicalIndicatorsService.calculateRSI(prices);
              const latestRSI = rsi[rsi.length - 1];
              return latestRSI < 30 ? symbol : null;
              
            case 'rsi_overbought':
              const rsiHigh = technicalIndicatorsService.calculateRSI(prices);
              const latestRSIHigh = rsiHigh[rsiHigh.length - 1];
              return latestRSIHigh > 70 ? symbol : null;
              
            case 'macd_bullish':
              const macdBull = technicalIndicatorsService.calculateMACD(prices);
              const signalBull = macdBull.histogram;
              // Check for bullish crossover (histogram turns positive)
              return signalBull.length > 2 && 
                     signalBull[signalBull.length - 2] <= 0 && 
                     signalBull[signalBull.length - 1] > 0 ? symbol : null;
              
            case 'macd_bearish':
              const macdBear = technicalIndicatorsService.calculateMACD(prices);
              const signalBear = macdBear.histogram;
              // Check for bearish crossover (histogram turns negative)
              return signalBear.length > 2 && 
                     signalBear[signalBear.length - 2] >= 0 && 
                     signalBear[signalBear.length - 1] < 0 ? symbol : null;
              
            case 'above_200_ma':
              const ma200Above = technicalIndicatorsService.calculateSMA(prices, 200);
              const latestMA200Above = ma200Above[ma200Above.length - 1];
              const latestPriceAbove = prices[prices.length - 1];
              return latestPriceAbove > latestMA200Above ? symbol : null;
              
            case 'below_200_ma':
              const ma200Below = technicalIndicatorsService.calculateSMA(prices, 200);
              const latestMA200Below = ma200Below[ma200Below.length - 1];
              const latestPriceBelow = prices[prices.length - 1];
              return latestPriceBelow < latestMA200Below ? symbol : null;
              
            default:
              return null;
          }
        } catch (error) {
          console.error(`Error filtering by technical indicator for ${symbol}:`, error);
          return null;
        }
      });
      
      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          filteredSymbols.push(result.value);
        }
      });
    }
    
    return filteredSymbols;
  } catch (error) {
    console.error('Error filtering by technical indicator:', error);
    return [];
  }
};

/**
 * Format market cap value for display
 * @param {Number} value - Market cap value
 * @returns {String} Formatted market cap
 */
const formatMarketCap = (value) => {
  if (!value) return 'N/A';
  
  // Convert to crores
  const crores = value / 10000000;
  
  if (crores >= 100000) {
    return `${(crores / 100000).toFixed(2)} Lakh Cr`;
  } else {
    return `${crores.toFixed(2)} Cr`;
  }
};

/**
 * Get available sectors for dropdown
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON response with sectors
 */
export const getSectors = async (req, res) => {
  try {
    // Try to get sectors from cache
    const cacheKey = 'stockScreener:sectors';
    const cachedSectors = await cacheService.get(cacheKey);
    
    if (cachedSectors) {
      return res.status(200).json({
        success: true,
        fromCache: true,
        data: cachedSectors
      });
    }
    
    // Get distinct sectors from database
    const sectors = await Stock.distinct('sector');
    
    // Filter out null or empty sectors
    const filteredSectors = sectors
      .filter(sector => sector && sector.trim() !== '')
      .sort();
    
    // Add 'All Sectors' at the beginning
    const formattedSectors = ['All Sectors', ...filteredSectors];
    
    // Cache the result
    await cacheService.set(cacheKey, formattedSectors, 24 * 60 * 60); // 24 hours cache
    
    return res.status(200).json({
      success: true,
      count: formattedSectors.length,
      data: formattedSectors
    });
  } catch (error) {
    console.error('Error fetching sectors:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

export default {
  getStocksByFilter,
  getSectors
}; 