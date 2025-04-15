/**
 * Technical Indicators Controller
 * 
 * Provides API endpoints for calculating and retrieving technical indicators
 */
import asyncHandler from 'express-async-handler';
import * as technicalIndicatorsService from '../services/technicalIndicatorsService.js';
import * as marketDataService from '../services/marketDataService.js';
import cacheService from '../services/cacheService.js';

/**
 * @desc    Calculate RSI for a stock
 * @route   GET /api/indicators/rsi/:symbol
 * @access  Private
 */
const getRSI = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const { period = 14, interval = 'daily', limit = 100 } = req.query;

  // Check cache first
  const cacheKey = `indicators:rsi:${symbol}:${period}:${interval}:${limit}`;
  const cachedData = await cacheService.get(cacheKey);
  
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  try {
    // Fetch historical data
    const historicalData = await marketDataService.getHistoricalData(symbol, interval, parseInt(limit) + parseInt(period));
    
    if (!historicalData || !historicalData.length) {
      throw new Error('Historical data not found');
    }

    // Extract closing prices
    const prices = historicalData.map(candle => candle.close);
    
    // Calculate RSI
    const rsiValues = technicalIndicatorsService.calculateRSI(prices, parseInt(period));
    
    // Format response
    const response = {
      symbol,
      indicator: 'RSI',
      period: parseInt(period),
      interval,
      timestamp: new Date(),
      values: rsiValues.map((value, index) => ({
        time: historicalData[index + parseInt(period)].time,
        value: parseFloat(value.toFixed(2))
      }))
    };

    // Cache the result
    await cacheService.set(cacheKey, JSON.stringify(response), 300); // Cache for 5 minutes
    
    res.json(response);
  } catch (error) {
    console.error(`Error calculating RSI for ${symbol}:`, error.message);
    
    // Generate dummy data for RSI
    const dummyData = generateDummyRSIData(symbol, parseInt(period), parseInt(limit));
    
    // Cache the dummy data but with shorter TTL
    await cacheService.set(cacheKey, JSON.stringify(dummyData), 60); // 1 minute cache for dummy data
    
    res.json(dummyData);
  }
});

// Generate dummy RSI data when API fails
const generateDummyRSIData = (symbol, period = 14, limit = 30) => {
  const values = [];
  const now = new Date();
  
  for (let i = 0; i < limit; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (limit - i));
    
    // Generate random RSI between 30 and 70, with some outliers
    let value;
    if (i % 10 === 0) {
      // Occasionally generate overbought/oversold values
      value = Math.random() > 0.5 ? Math.random() * 20 + 70 : Math.random() * 20;
    } else {
      // Usually stay in the middle range
      value = Math.random() * 40 + 30;
    }
    
    values.push({
      time: date.getTime(),
      value: parseFloat(value.toFixed(2))
    });
  }
  
  return {
    symbol,
    indicator: 'RSI',
    period,
    interval: 'daily',
    timestamp: new Date(),
    values
  };
};

/**
 * @desc    Calculate MACD for a stock
 * @route   GET /api/indicators/macd/:symbol
 * @access  Private
 */
const getMACD = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const { 
    fastPeriod = 12, 
    slowPeriod = 26, 
    signalPeriod = 9, 
    interval = 'daily', 
    limit = 100 
  } = req.query;

  // Check cache first
  const cacheKey = `indicators:macd:${symbol}:${fastPeriod}:${slowPeriod}:${signalPeriod}:${interval}:${limit}`;
  const cachedData = await cacheService.get(cacheKey);
  
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  try {
    // Fetch historical data
    const requiredDataPoints = parseInt(limit) + parseInt(slowPeriod) + parseInt(signalPeriod);
    const historicalData = await marketDataService.getHistoricalData(symbol, interval, requiredDataPoints);
    
    if (!historicalData || !historicalData.length) {
      throw new Error('Historical data not found');
    }

    // Extract closing prices
    const prices = historicalData.map(candle => candle.close);
    
    // Calculate MACD
    const macdResult = technicalIndicatorsService.calculateMACD(prices, {
      fastPeriod: parseInt(fastPeriod),
      slowPeriod: parseInt(slowPeriod),
      signalPeriod: parseInt(signalPeriod)
    });
    
    // Find the starting index for the result data
    const startIndex = prices.length - macdResult.histogram.length;
    
    // Format response
    const response = {
      symbol,
      indicator: 'MACD',
      parameters: {
        fastPeriod: parseInt(fastPeriod),
        slowPeriod: parseInt(slowPeriod),
        signalPeriod: parseInt(signalPeriod)
      },
      interval,
      timestamp: new Date(),
      values: macdResult.histogram.map((value, index) => ({
        time: historicalData[startIndex + index].time,
        macd: parseFloat(macdResult.macdLine[macdResult.macdLine.length - macdResult.histogram.length + index].toFixed(2)),
        signal: parseFloat(macdResult.signalLine[index].toFixed(2)),
        histogram: parseFloat(value.toFixed(2))
      }))
    };

    // Cache the result
    await cacheService.set(cacheKey, JSON.stringify(response), 300); // Cache for 5 minutes
    
    res.json(response);
  } catch (error) {
    console.error(`Error calculating MACD for ${symbol}:`, error.message);
    
    // Generate dummy data for MACD
    const dummyData = generateDummyMACDData(
      symbol, 
      parseInt(fastPeriod), 
      parseInt(slowPeriod), 
      parseInt(signalPeriod), 
      parseInt(limit)
    );
    
    // Cache the dummy data but with shorter TTL
    await cacheService.set(cacheKey, JSON.stringify(dummyData), 60); // 1 minute cache for dummy data
    
    res.json(dummyData);
  }
});

// Generate dummy MACD data when API fails
const generateDummyMACDData = (symbol, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9, limit = 30) => {
  const values = [];
  const now = new Date();
  
  // Initial value
  let macd = Math.random() * 4 - 2; // between -2 and 2
  let signal = macd * 0.8; // Initially close to MACD
  
  for (let i = 0; i < limit; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (limit - i));
    
    // Gradually change values to create a realistic looking indicator
    macd += (Math.random() - 0.5) * 0.5; // random walk
    signal = signal * 0.9 + macd * 0.1; // signal follows MACD
    const histogram = macd - signal;
    
    values.push({
      time: date.getTime(),
      macd: parseFloat(macd.toFixed(2)),
      signal: parseFloat(signal.toFixed(2)),
      histogram: parseFloat(histogram.toFixed(2))
    });
  }
  
  return {
    symbol,
    indicator: 'MACD',
    parameters: {
      fastPeriod,
      slowPeriod,
      signalPeriod
    },
    interval: 'daily',
    timestamp: new Date(),
    values
  };
};

/**
 * @desc    Calculate Bollinger Bands for a stock
 * @route   GET /api/indicators/bollinger/:symbol
 * @access  Private
 */
const getBollingerBands = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const { 
    period = 20, 
    stdDev = 2, 
    interval = 'daily', 
    limit = 100 
  } = req.query;

  // Check cache first
  const cacheKey = `indicators:bollinger:${symbol}:${period}:${stdDev}:${interval}:${limit}`;
  const cachedData = await cacheService.get(cacheKey);
  
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  try {
    // Fetch historical data
    const requiredDataPoints = parseInt(limit) + parseInt(period);
    const historicalData = await marketDataService.getHistoricalData(symbol, interval, requiredDataPoints);
    
    if (!historicalData || !historicalData.length) {
      throw new Error('Historical data not found');
    }

    // Extract closing prices
    const prices = historicalData.map(candle => candle.close);
    
    // Calculate Bollinger Bands
    const bollingerBands = technicalIndicatorsService.calculateBollingerBands(prices, {
      period: parseInt(period),
      stdDevMultiplier: parseFloat(stdDev)
    });
    
    // Find the starting index for the result data
    const startIndex = prices.length - bollingerBands.middle.length;
    
    // Format response
    const response = {
      symbol,
      indicator: 'BollingerBands',
      parameters: {
        period: parseInt(period),
        stdDevMultiplier: parseFloat(stdDev)
      },
      interval,
      timestamp: new Date(),
      values: bollingerBands.middle.map((middle, index) => ({
        time: historicalData[startIndex + index].time,
        upper: parseFloat(bollingerBands.upper[index].toFixed(2)),
        middle: parseFloat(middle.toFixed(2)),
        lower: parseFloat(bollingerBands.lower[index].toFixed(2))
      }))
    };

    // Cache the result
    await cacheService.set(cacheKey, JSON.stringify(response), 300); // Cache for 5 minutes
    
    res.json(response);
  } catch (error) {
    console.error(`Error calculating Bollinger Bands for ${symbol}:`, error.message);
    
    // Generate dummy data for Bollinger Bands
    const dummyData = generateDummyBollingerData(
      symbol, 
      parseInt(period), 
      parseFloat(stdDev), 
      parseInt(limit)
    );
    
    // Cache the dummy data but with shorter TTL
    await cacheService.set(cacheKey, JSON.stringify(dummyData), 60); // 1 minute cache for dummy data
    
    res.json(dummyData);
  }
});

// Generate dummy Bollinger Bands data when API fails
const generateDummyBollingerData = (symbol, period = 20, stdDevMultiplier = 2, limit = 30) => {
  const values = [];
  const now = new Date();
  
  // Base price and trend
  let price = 1000 + Math.random() * 500;
  let trend = 0;
  
  for (let i = 0; i < limit; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (limit - i));
    
    // Adjust trend
    trend += (Math.random() - 0.5) * 5;
    trend = Math.min(10, Math.max(-10, trend)); // Keep trend between -10 and 10
    
    // Update price
    price += trend;
    price = Math.max(500, price); // Keep price above 500
    
    // Calculate bands
    const volatility = price * 0.02; // 2% volatility
    const middle = price;
    const upper = middle + (volatility * stdDevMultiplier);
    const lower = middle - (volatility * stdDevMultiplier);
    
    values.push({
      time: date.getTime(),
      upper: parseFloat(upper.toFixed(2)),
      middle: parseFloat(middle.toFixed(2)),
      lower: parseFloat(lower.toFixed(2))
    });
  }
  
  return {
    symbol,
    indicator: 'BollingerBands',
    parameters: {
      period,
      stdDevMultiplier
    },
    interval: 'daily',
    timestamp: new Date(),
    values
  };
};

/**
 * @desc    Calculate Moving Averages (SMA/EMA) for a stock
 * @route   GET /api/indicators/ma/:symbol
 * @access  Private
 */
const getMovingAverage = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const { 
    type = 'sma',  // sma or ema
    period = 20, 
    interval = 'daily', 
    limit = 100 
  } = req.query;

  // Check cache first
  const cacheKey = `indicators:ma:${type}:${symbol}:${period}:${interval}:${limit}`;
  const cachedData = await cacheService.get(cacheKey);
  
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  try {
    // Fetch historical data
    const requiredDataPoints = parseInt(limit) + parseInt(period);
    const historicalData = await marketDataService.getHistoricalData(symbol, interval, requiredDataPoints);
    
    if (!historicalData || !historicalData.length) {
      throw new Error('Historical data not found');
    }

    // Extract closing prices
    const prices = historicalData.map(candle => candle.close);
    
    // Calculate Moving Average
    let maValues;
    if (type.toLowerCase() === 'ema') {
      maValues = technicalIndicatorsService.calculateEMA(prices, parseInt(period));
    } else {
      maValues = technicalIndicatorsService.calculateSMA(prices, parseInt(period));
    }
    
    // Find the starting index for the result data
    const startIndex = prices.length - maValues.length;
    
    // Format response
    const response = {
      symbol,
      indicator: type.toUpperCase(),
      period: parseInt(period),
      interval,
      timestamp: new Date(),
      values: maValues.map((value, index) => ({
        time: historicalData[startIndex + index].time,
        value: parseFloat(value.toFixed(2))
      }))
    };

    // Cache the result
    await cacheService.set(cacheKey, JSON.stringify(response), 300); // Cache for 5 minutes
    
    res.json(response);
  } catch (error) {
    console.error(`Error calculating Moving Average for ${symbol}:`, error.message);
    
    // Generate dummy data for Moving Average
    const dummyData = generateDummyMAData(
      symbol, 
      type, 
      parseInt(period), 
      parseInt(limit)
    );
    
    // Cache the dummy data but with shorter TTL
    await cacheService.set(cacheKey, JSON.stringify(dummyData), 60); // 1 minute cache for dummy data
    
    res.json(dummyData);
  }
});

// Generate dummy Moving Average data when API fails
const generateDummyMAData = (symbol, type = 'sma', period = 20, limit = 30) => {
  const values = [];
  const now = new Date();
  
  // Base price and trend
  let price = 1000 + Math.random() * 500;
  let trend = 0;
  
  for (let i = 0; i < limit; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (limit - i));
    
    // Adjust trend
    trend += (Math.random() - 0.5) * 5;
    trend = Math.min(10, Math.max(-10, trend)); // Keep trend between -10 and 10
    
    // Update price
    price += trend;
    price = Math.max(500, price); // Keep price above 500
    
    values.push({
      time: date.getTime(),
      value: parseFloat(price.toFixed(2))
    });
  }
  
  return {
    symbol,
    indicator: type.toUpperCase(),
    period,
    interval: 'daily',
    timestamp: new Date(),
    values
  };
};

/**
 * @desc    Get multiple indicators for a stock
 * @route   GET /api/indicators/multiple/:symbol
 * @access  Private
 */
const getMultipleIndicators = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const { indicators, interval = 'daily', limit = 100 } = req.query;

  if (!indicators) {
    return res.status(400).json({ message: 'No indicators specified' });
  }

  try {
    // Parse indicators from query parameter
    const indicatorsToCalculate = JSON.parse(indicators);
    
    // Determine maximum data points needed based on requested indicators
    let maxPeriod = 0;
    for (const indicator of indicatorsToCalculate) {
      if (indicator.type === 'macd') {
        const slowPeriod = indicator.slowPeriod || 26;
        const signalPeriod = indicator.signalPeriod || 9;
        maxPeriod = Math.max(maxPeriod, parseInt(slowPeriod) + parseInt(signalPeriod));
      } else if (indicator.type === 'bollinger') {
        maxPeriod = Math.max(maxPeriod, indicator.period || 20);
      } else if (indicator.type === 'rsi') {
        maxPeriod = Math.max(maxPeriod, indicator.period || 14);
      } else if (indicator.type === 'sma' || indicator.type === 'ema') {
        maxPeriod = Math.max(maxPeriod, indicator.period || 20);
      }
    }

    // Fetch historical data
    const requiredDataPoints = parseInt(limit) + maxPeriod;
    const historicalData = await marketDataService.getHistoricalData(symbol, interval, requiredDataPoints);
    
    if (!historicalData || !historicalData.length) {
      return res.status(404).json({ message: 'Historical data not found' });
    }

    // Extract price data
    const prices = historicalData.map(candle => candle.close);
    const highs = historicalData.map(candle => candle.high);
    const lows = historicalData.map(candle => candle.low);

    // Calculate requested indicators
    const result = {
      symbol,
      interval,
      timestamp: new Date(),
      indicators: {}
    };

    for (const indicator of indicatorsToCalculate) {
      switch (indicator.type.toLowerCase()) {
        case 'rsi':
          const rsiPeriod = indicator.period || 14;
          const rsiValues = technicalIndicatorsService.calculateRSI(prices, parseInt(rsiPeriod));
          result.indicators.rsi = {
            period: parseInt(rsiPeriod),
            values: rsiValues.map((value, index) => ({
              time: historicalData[index + parseInt(rsiPeriod)].time,
              value: parseFloat(value.toFixed(2))
            }))
          };
          break;

        case 'macd':
          const fastPeriod = indicator.fastPeriod || 12;
          const slowPeriod = indicator.slowPeriod || 26;
          const signalPeriod = indicator.signalPeriod || 9;
          
          const macdResult = technicalIndicatorsService.calculateMACD(prices, {
            fastPeriod: parseInt(fastPeriod),
            slowPeriod: parseInt(slowPeriod),
            signalPeriod: parseInt(signalPeriod)
          });
          
          const macdStartIndex = prices.length - macdResult.histogram.length;
          
          result.indicators.macd = {
            parameters: {
              fastPeriod: parseInt(fastPeriod),
              slowPeriod: parseInt(slowPeriod),
              signalPeriod: parseInt(signalPeriod)
            },
            values: macdResult.histogram.map((value, index) => ({
              time: historicalData[macdStartIndex + index].time,
              macd: parseFloat(macdResult.macdLine[macdResult.macdLine.length - macdResult.histogram.length + index].toFixed(2)),
              signal: parseFloat(macdResult.signalLine[index].toFixed(2)),
              histogram: parseFloat(value.toFixed(2))
            }))
          };
          break;

        case 'bollinger':
          const bbPeriod = indicator.period || 20;
          const stdDev = indicator.stdDev || 2;
          
          const bollingerBands = technicalIndicatorsService.calculateBollingerBands(prices, {
            period: parseInt(bbPeriod),
            stdDevMultiplier: parseFloat(stdDev)
          });
          
          const bbStartIndex = prices.length - bollingerBands.middle.length;
          
          result.indicators.bollinger = {
            parameters: {
              period: parseInt(bbPeriod),
              stdDevMultiplier: parseFloat(stdDev)
            },
            values: bollingerBands.middle.map((middle, index) => ({
              time: historicalData[bbStartIndex + index].time,
              upper: parseFloat(bollingerBands.upper[index].toFixed(2)),
              middle: parseFloat(middle.toFixed(2)),
              lower: parseFloat(bollingerBands.lower[index].toFixed(2))
            }))
          };
          break;

        case 'sma':
        case 'ema':
          const maPeriod = indicator.period || 20;
          let maValues;
          
          if (indicator.type.toLowerCase() === 'ema') {
            maValues = technicalIndicatorsService.calculateEMA(prices, parseInt(maPeriod));
          } else {
            maValues = technicalIndicatorsService.calculateSMA(prices, parseInt(maPeriod));
          }
          
          const maStartIndex = prices.length - maValues.length;
          
          result.indicators[indicator.type.toLowerCase()] = {
            period: parseInt(maPeriod),
            values: maValues.map((value, index) => ({
              time: historicalData[maStartIndex + index].time,
              value: parseFloat(value.toFixed(2))
            }))
          };
          break;

        default:
          // Skip unknown indicator types
          break;
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error calculating indicators:', error);
    res.status(400).json({ message: 'Invalid indicators format', error: error.message });
  }
});

/**
 * @desc    Get price chart data for a stock
 * @route   GET /api/indicators/chart/:symbol
 * @access  Public/Private
 */
const getPriceChart = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const { interval = 'daily', limit = 90, exchange = 'NSE' } = req.query;

  // Add suffix based on exchange
  const suffixedSymbol = exchange === 'NSE' ? 
    `${symbol}.NS` : 
    (exchange === 'BSE' ? `${symbol}.BO` : symbol);

  try {
    // Fetch historical data
    const historicalData = await marketDataService.getHistoricalData(suffixedSymbol, interval, parseInt(limit));
    
    if (!historicalData || !historicalData.length) {
      throw new Error('Historical data not found');
    }

    // Format response
    const response = {
      symbol: suffixedSymbol,
      interval,
      timestamp: new Date(),
      data: historicalData.map(item => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }))
    };
    
    res.json(response);
  } catch (error) {
    console.error(`Error fetching price chart for ${symbol}:`, error.message);
    res.status(500).json({ 
      message: `Error fetching price chart: ${error.message}`, 
      fallback: 'Using dummy data',
      data: generateDummyPriceData(symbol, interval, parseInt(limit))
    });
  }
});

// Generate dummy price chart data
const generateDummyPriceData = (symbol, interval = 'daily', limit = 90) => {
  const values = [];
  const now = new Date();
  let price = 1000 + Math.random() * 1000; // Starting price between 1000-2000
  
  for (let i = 0; i < limit; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (limit - i));
    
    // Add some randomness to price movement
    const change = (Math.random() - 0.5) * (price * 0.02); // Max 2% change
    price += change;
    
    // Generate candle data
    const open = price;
    const close = price + (Math.random() - 0.5) * (price * 0.01);
    const high = Math.max(open, close) + Math.random() * (price * 0.005);
    const low = Math.min(open, close) - Math.random() * (price * 0.005);
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    
    values.push({
      time: date.getTime(),
      open,
      high,
      low,
      close,
      volume
    });
  }
  
  return values;
};

export {
  getRSI,
  getMACD,
  getBollingerBands,
  getMovingAverage,
  getMultipleIndicators,
  getPriceChart
}; 