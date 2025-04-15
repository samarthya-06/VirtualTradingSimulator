/**
 * Technical Indicators Service
 * 
 * This service provides functions to calculate various technical indicators
 * for stock market analysis.
 */

/**
 * Calculate Relative Strength Index (RSI)
 * 
 * RSI = 100 - (100 / (1 + RS))
 * where RS = Average Gain / Average Loss
 * 
 * @param {Array} prices - Array of closing prices
 * @param {Number} period - Period for RSI calculation, default is 14
 * @returns {Array} - Array of RSI values
 */
const calculateRSI = (prices, period = 14) => {
  if (!prices || prices.length < period + 1) {
    return [];
  }

  // Calculate price changes
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Separate gains and losses
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);

  // Calculate average gain and loss for initial period
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  // Calculate RSI values
  const rsiValues = [];
  rsiValues.push(100 - (100 / (1 + avgGain / (avgLoss || 0.0001))));

  // Calculate remaining RSI values
  for (let i = period; i < changes.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    rsiValues.push(100 - (100 / (1 + avgGain / (avgLoss || 0.0001))));
  }

  return rsiValues;
};

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 * 
 * MACD Line = 12-period EMA - 26-period EMA
 * Signal Line = 9-period EMA of MACD Line
 * Histogram = MACD Line - Signal Line
 * 
 * @param {Array} prices - Array of closing prices
 * @param {Object} options - Configuration options
 * @returns {Object} - Object containing MACD line, signal line, and histogram
 */
const calculateMACD = (prices, options = {}) => {
  const { fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = options;

  if (!prices || prices.length < slowPeriod + signalPeriod) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  // Calculate EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // Calculate MACD line (fastEMA - slowEMA)
  const macdLine = [];
  for (let i = 0; i < slowEMA.length; i++) {
    // Adjust the index for fastEMA due to different periods
    const fastIndex = i + (slowPeriod - fastPeriod);
    macdLine.push(fastEMA[fastIndex] - slowEMA[i]);
  }

  // Calculate signal line (9-period EMA of MACD line)
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Calculate histogram (MACD line - signal line)
  const histogram = [];
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + (macdLine.length - signalLine.length)] - signalLine[i]);
  }

  return {
    macdLine,
    signalLine,
    histogram,
  };
};

/**
 * Calculate Bollinger Bands
 * 
 * Upper Band = SMA + (Standard Deviation * multiplier)
 * Middle Band = SMA
 * Lower Band = SMA - (Standard Deviation * multiplier)
 * 
 * @param {Array} prices - Array of closing prices
 * @param {Object} options - Configuration options
 * @returns {Object} - Object containing upper, middle, and lower bands
 */
const calculateBollingerBands = (prices, options = {}) => {
  const { period = 20, stdDevMultiplier = 2 } = options;

  if (!prices || prices.length < period) {
    return { upper: [], middle: [], lower: [] };
  }

  const middle = calculateSMA(prices, period);
  const upper = [];
  const lower = [];

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - (period - 1), i + 1);
    const stdDev = calculateStandardDeviation(slice);
    const sma = middle[i - (period - 1)];
    
    upper.push(sma + (stdDev * stdDevMultiplier));
    lower.push(sma - (stdDev * stdDevMultiplier));
  }

  return {
    upper,
    middle,
    lower,
  };
};

/**
 * Calculate Simple Moving Average (SMA)
 * 
 * @param {Array} prices - Array of prices
 * @param {Number} period - Period for SMA calculation
 * @returns {Array} - Array of SMA values
 */
const calculateSMA = (prices, period) => {
  if (!prices || prices.length < period) {
    return [];
  }

  const smaValues = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - (period - 1), i + 1).reduce((total, price) => total + price, 0);
    smaValues.push(sum / period);
  }

  return smaValues;
};

/**
 * Calculate Exponential Moving Average (EMA)
 * 
 * @param {Array} prices - Array of prices
 * @param {Number} period - Period for EMA calculation
 * @returns {Array} - Array of EMA values
 */
const calculateEMA = (prices, period) => {
  if (!prices || prices.length < period) {
    return [];
  }

  const k = 2 / (period + 1);
  const emaValues = [];
  
  // Initialize EMA with SMA
  const sma = prices.slice(0, period).reduce((total, price) => total + price, 0) / period;
  emaValues.push(sma);
  
  // Calculate remaining EMAs
  for (let i = period; i < prices.length; i++) {
    emaValues.push(prices[i] * k + emaValues[emaValues.length - 1] * (1 - k));
  }
  
  return emaValues;
};

/**
 * Calculate Average True Range (ATR)
 * 
 * @param {Array} highs - Array of high prices
 * @param {Array} lows - Array of low prices
 * @param {Array} closes - Array of closing prices
 * @param {Number} period - Period for ATR calculation, default is 14
 * @returns {Array} - Array of ATR values
 */
const calculateATR = (highs, lows, closes, period = 14) => {
  if (!highs || !lows || !closes || highs.length !== lows.length || lows.length !== closes.length || highs.length < period + 1) {
    return [];
  }

  // Calculate True Range
  const trueRanges = [];
  for (let i = 1; i < highs.length; i++) {
    const prevClose = closes[i - 1];
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - prevClose);
    const tr3 = Math.abs(lows[i] - prevClose);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }

  // First ATR is simple average of first 'period' true ranges
  const atrValues = [];
  const firstATR = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
  atrValues.push(firstATR);

  // Calculate remaining ATRs using smoothing formula: ATR = ((previousATR * (period - 1)) + currentTR) / period
  for (let i = period; i < trueRanges.length; i++) {
    const atr = ((atrValues[atrValues.length - 1] * (period - 1)) + trueRanges[i]) / period;
    atrValues.push(atr);
  }

  return atrValues;
};

/**
 * Calculate Stochastic Oscillator
 * 
 * %K = (Current Close - Lowest Low) / (Highest High - Lowest Low) * 100
 * %D = 3-day SMA of %K
 * 
 * @param {Array} highs - Array of high prices
 * @param {Array} lows - Array of low prices
 * @param {Array} closes - Array of closing prices
 * @param {Object} options - Configuration options
 * @returns {Object} - Object containing %K and %D values
 */
const calculateStochastic = (highs, lows, closes, options = {}) => {
  const { kPeriod = 14, dPeriod = 3, slowing = 3 } = options;

  if (!highs || !lows || !closes || highs.length !== lows.length || lows.length !== closes.length || closes.length < kPeriod) {
    return { k: [], d: [] };
  }

  const kValues = [];
  
  // Calculate %K values
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const currentClose = closes[i];
    const highestHigh = Math.max(...highs.slice(i - (kPeriod - 1), i + 1));
    const lowestLow = Math.min(...lows.slice(i - (kPeriod - 1), i + 1));
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);
  }

  // Apply slowing period (if specified)
  const kSlowed = slowing > 1 
    ? calculateSMA(kValues, slowing) 
    : kValues;

  // Calculate %D values (3-day SMA of %K)
  const dValues = calculateSMA(kSlowed, dPeriod);

  return {
    k: kSlowed,
    d: dValues,
  };
};

/**
 * Calculate standard deviation of an array
 * 
 * @param {Array} values - Array of values
 * @returns {Number} - Standard deviation
 */
const calculateStandardDeviation = (values) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

export {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateSMA,
  calculateEMA,
  calculateATR,
  calculateStochastic,
}; 