/**
 * Indian Stock Market Utilities
 * 
 * Provides helper functions and data structures for Indian stock markets (NSE/BSE)
 */

// Common NSE indices
export const NSE_INDICES = {
  NIFTY50: '^NSEI',
  BANKNIFTY: '^NSEBANK',
  NIFTYIT: '^CNXIT',
  NIFTYMIDCAP: '^CNXMIDCAP',
  NIFTY100: '^CNX100',
  NIFTY200: '^CNX200',
  NIFTYPHARMA: '^CNXPHARMA',
  NIFTYAUTO: '^CNXAUTO',
  NIFTYFMCG: '^CNXFMCG'
};

// Common BSE indices
export const BSE_INDICES = {
  SENSEX: '^BSESN',
  BSE100: '^BSE100',
  BSE200: '^BSE200',
  BSEHEALTH: '^BSEHC',
  BSEIT: '^BSEIT'
};

// Map index symbols to their names
export const INDEX_NAMES = {
  '^NSEI': 'NIFTY 50',
  '^BSESN': 'SENSEX 30',
  '^NSEBANK': 'NIFTY BANK',
  '^CNXIT': 'NIFTY IT',
  '^CNXMIDCAP': 'NIFTY MIDCAP 100',
  '^CNX100': 'NIFTY 100',
  '^CNX200': 'NIFTY 200',
  '^CNXPHARMA': 'NIFTY PHARMA',
  '^CNXAUTO': 'NIFTY AUTO',
  '^CNXFMCG': 'NIFTY FMCG',
  '^BSE100': 'BSE 100',
  '^BSE200': 'BSE 200',
  '^BSEHC': 'BSE HEALTHCARE',
  '^BSEIT': 'BSE IT'
};

// Top NSE stocks by market cap
export const TOP_NSE_STOCKS = [
  'RELIANCE.NS',  // Reliance Industries
  'TCS.NS',       // Tata Consultancy Services
  'HDFCBANK.NS',  // HDFC Bank
  'INFY.NS',      // Infosys
  'ICICIBANK.NS', // ICICI Bank
  'HINDUNILVR.NS', // Hindustan Unilever
  'SBIN.NS',      // State Bank of India
  'BHARTIARTL.NS', // Bharti Airtel
  'KOTAKBANK.NS', // Kotak Mahindra Bank
  'ITC.NS',       // ITC Limited
  'LT.NS',        // Larsen & Toubro
  'AXISBANK.NS',  // Axis Bank
  'WIPRO.NS',     // Wipro
  'BAJFINANCE.NS', // Bajaj Finance
  'HCLTECH.NS'    // HCL Technologies
];

// Top BSE stocks by market cap
export const TOP_BSE_STOCKS = [
  'RELIANCE.BO',  // Reliance Industries
  'TCS.BO',       // Tata Consultancy Services
  'HDFCBANK.BO',  // HDFC Bank
  'INFY.BO',      // Infosys
  'ICICIBANK.BO', // ICICI Bank
  'HINDUNILVR.BO', // Hindustan Unilever
  'SBIN.BO',      // State Bank of India
  'BHARTIARTL.BO', // Bharti Airtel
  'KOTAKBANK.BO', // Kotak Mahindra Bank
  'ITC.BO'        // ITC Limited
];

// Indices with approximate baseline values (as of early 2024)
export const INDEX_BASELINE_VALUES = {
  '^NSEI': 22000,      // NIFTY 50
  '^BSESN': 72000,     // SENSEX
  '^NSEBANK': 47000,   // NIFTY BANK
  '^CNXIT': 35000,     // NIFTY IT
  '^CNXMIDCAP': 11000, // NIFTY MIDCAP
  '^CNX100': 18000,    // NIFTY 100
  '^CNX200': 12000,    // NIFTY 200
  '^BSE100': 30000,    // BSE 100
  '^BSE200': 20000     // BSE 200
};

// Trading hours for Indian markets (IST time zone)
export const TRADING_HOURS = {
  start: {
    hour: 9,
    minute: 15
  },
  end: {
    hour: 15,
    minute: 30
  },
  timeZone: 'Asia/Kolkata'
};

// Map of numeric IDs to common stock symbols - centralized here for consistency
export const NUMERIC_TO_SYMBOL_MAP = {
  '0': 'RELIANCE',
  '1': 'TCS',
  '2': 'HDFCBANK',
  '3': 'INFY',
  '4': 'ICICIBANK',
  '5': 'HINDUNILVR',
  '6': 'SBIN',
  '7': 'BHARTIARTL',
  '8': 'KOTAKBANK',
  '9': 'ITC',
  '10': 'LT',
  '11': 'AXISBANK',
  '12': 'WIPRO',
  '13': 'BAJFINANCE',
  '14': 'HCLTECH'
};

/**
 * Check if the Indian market is currently open
 * @returns {boolean} True if the market is open
 */
export function isMarketOpen() {
  // Get current date/time in IST
  const now = new Date();
  const istOptions = { timeZone: TRADING_HOURS.timeZone };
  const istTime = new Intl.DateTimeFormat('en-US', {
    ...istOptions,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).format(now);
  
  // Parse hour and minute
  const [hour, minute] = istTime.split(':').map(part => parseInt(part, 10));
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = new Intl.DateTimeFormat('en-US', {
    ...istOptions,
    weekday: 'numeric'
  }).format(now);
  const dayNum = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    .indexOf(dayOfWeek);
  
  // Markets are closed on weekends
  if (dayNum === 0 || dayNum === 6) {
    return false;
  }
  
  // Check if current time is within trading hours
  const startTime = TRADING_HOURS.start.hour * 60 + TRADING_HOURS.start.minute;
  const endTime = TRADING_HOURS.end.hour * 60 + TRADING_HOURS.end.minute;
  const currentTime = hour * 60 + minute;
  
  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Generate fallback data for an Indian stock or index when APIs fail
 * @param {string} symbol - The stock or index symbol
 * @param {boolean} isIndex - Whether this is an index or a stock
 * @returns {Object} Fallback data
 */
export function generateFallbackData(symbol, isIndex = false) {
  // First make sure we're working with the base symbol
  const baseSymbol = getBaseSymbol(symbol);
  
  let baseValue;
  
  if (isIndex) {
    // Use baseline values for indices
    baseValue = INDEX_BASELINE_VALUES[symbol] || 20000;
  } else {
    // Generate reasonable baseline for stocks
    // Most Indian stocks trade between ₹100 and ₹5000
    baseValue = baseSymbol.includes('RELIANCE') ? 2500 :
      baseSymbol.includes('TCS') ? 3800 :
      baseSymbol.includes('INFY') ? 1500 :
      baseSymbol.includes('HDFC') ? 1600 :
      Math.floor(Math.random() * 4000) + 500; // Random between ₹500 and ₹4500
  }
  
  // Generate random changes
  const changePercent = (Math.random() * 2 - 1) * (isIndex ? 0.5 : 1.5); // More volatile for stocks
  const change = baseValue * (changePercent / 100);
  
  return {
    symbol: baseSymbol,
    price: baseValue,
    change: change,
    changePercent: changePercent,
    volume: Math.floor(Math.random() * (isIndex ? 1000000000 : 10000000)) + 1000000,
    high: baseValue * (1 + Math.random() * (isIndex ? 0.01 : 0.03)),
    low: baseValue * (1 - Math.random() * (isIndex ? 0.01 : 0.03)),
    open: baseValue * (1 + (Math.random() * 0.02 - 0.01)),
    previousClose: baseValue - change,
    timestamp: new Date().getTime(),
    isFallbackData: true
  };
}

/**
 * Standardize stock symbol format
 * @param {string} symbol - The symbol to standardize (can be with or without exchange suffix)
 * @param {string} preferredExchange - The preferred exchange ('NSE' or 'BSE') when not specified
 * @returns {string} The standardized symbol with exchange suffix
 */
export function standardizeSymbol(symbol, preferredExchange = 'NSE') {
  if (!symbol) return null;
  
  // Handle numeric ID mapping first
  if (!isNaN(symbol)) {
    const mappedSymbol = NUMERIC_TO_SYMBOL_MAP[symbol] || 'RELIANCE';
    // Return with preferred exchange
    return preferredExchange === 'BSE' ? `${mappedSymbol}.BO` : `${mappedSymbol}.NS`;
  }
  
  // Convert to uppercase
  let processedSymbol = symbol.toUpperCase();
  
  // Handle index symbols
  if (processedSymbol.startsWith('^')) {
    return processedSymbol; // Already in correct format
  }
  
  // Remove exchange suffix if present to get the base symbol
  const baseSymbol = getBaseSymbol(processedSymbol);
  
  // Determine which exchange to use
  let targetExchange = preferredExchange;
  
  // If original had exchange info, preserve it
  if (processedSymbol.endsWith('.NS') || processedSymbol.includes('NSE')) {
    targetExchange = 'NSE';
  } else if (processedSymbol.endsWith('.BO') || processedSymbol.includes('BSE')) {
    targetExchange = 'BSE';
  }
  
  // Add the appropriate suffix
  return targetExchange === 'BSE' ? `${baseSymbol}.BO` : `${baseSymbol}.NS`;
}

/**
 * Extract base symbol without exchange suffix
 * @param {string} symbol - Symbol with possible exchange suffix
 * @returns {string} Base symbol without exchange suffix
 */
export function getBaseSymbol(symbol) {
    if (!symbol) return '';
    
    // Convert to uppercase
    const upperSymbol = symbol.toUpperCase();
    
    // Handle index symbols
    if (upperSymbol.startsWith('^')) {
        return upperSymbol;
    }
    
    // Remove exchange suffixes
    return upperSymbol
        .replace(/\.NS$/, '')
        .replace(/\.BO$/, '')
        .replace(/\.BSE$/, '')
        .replace(/\.NSE$/, '')
        .replace(/\-N$/, '')
        .replace(/\-B$/, '');
}

/**
 * Adjust stock price based on Indian market specifics for better accuracy
 * @param {number} price - The price from Yahoo Finance
 * @param {string} symbol - Stock symbol
 * @param {number} previousPrice - Previous known price (optional)
 * @param {boolean} isNSE - Whether the stock is from NSE exchange
 * @returns {number} - Adjusted price
 */
export function adjustIndianStockPrice(price, symbol, previousPrice = null, isNSE = true) {
    if (!price || price <= 0) return price;
    
    // Get base symbol
    const baseSymbol = getBaseSymbol(symbol);
    
    // Some common issues with Yahoo Finance data for Indian markets:
    // 1. Incorrect decimal places (especially for low-priced stocks)
    // 2. Delayed pricing compared to actual exchange
    // 3. Occasional price jumps due to misreported data
    
    // Adjustment factors based on price ranges (common in Indian markets)
    let adjustedPrice = price;
    
    // If we have a previous price, apply continuity check
    if (previousPrice && previousPrice > 0) {
        const changePercent = Math.abs((price - previousPrice) / previousPrice) * 100;
        
        // Handle suspiciously large changes
        if (changePercent > 10) {
            // For extreme changes, favor previous price more heavily
            if (changePercent > 20) {
                // 80% previous, 20% new for very large changes
                adjustedPrice = (previousPrice * 0.8) + (price * 0.2);
            } else {
                // 60% previous, 40% new for moderate changes
                adjustedPrice = (previousPrice * 0.6) + (price * 0.4);
            }
        }
    }
    
    // Special cases for known data issues with specific exchange or stocks
    if (isNSE) {
        // NSE-specific adjustments
        if (price < 1) {
            // For penny stocks, round to 2 decimal places
            adjustedPrice = Math.round(adjustedPrice * 100) / 100;
        } else if (price < 100) {
            // For low-priced stocks, round to 1 decimal place
            adjustedPrice = Math.round(adjustedPrice * 10) / 10;
        } else {
            // For higher-priced stocks, round to nearest whole number
            adjustedPrice = Math.round(adjustedPrice);
        }
    } else {
        // BSE-specific adjustments (generally more accurate)
        if (price < 1) {
            // For penny stocks, round to 2 decimal places
            adjustedPrice = Math.round(adjustedPrice * 100) / 100;
        } else if (price < 100) {
            // For low-priced stocks, round to 1 decimal place
            adjustedPrice = Math.round(adjustedPrice * 10) / 10;
        } else {
            // For higher-priced stocks, round to nearest 0.05
            adjustedPrice = Math.round(adjustedPrice * 20) / 20;
        }
    }
    
    // Apply specific adjustments for known problematic stocks
    if (baseSymbol === 'RELIANCE') {
        // Reliance prices on Yahoo are sometimes off by a small factor
        adjustedPrice = Math.round(adjustedPrice * 1.002);
    } else if (baseSymbol === 'TCS') {
        // TCS prices tend to be understated slightly
        adjustedPrice = Math.round(adjustedPrice * 1.001);
    }
    
    return adjustedPrice;
}

export default {
  NSE_INDICES,
  BSE_INDICES,
  INDEX_NAMES,
  TOP_NSE_STOCKS,
  TOP_BSE_STOCKS,
  INDEX_BASELINE_VALUES,
  TRADING_HOURS,
  NUMERIC_TO_SYMBOL_MAP,
  isMarketOpen,
  generateFallbackData,
  standardizeSymbol,
  getBaseSymbol,
  adjustIndianStockPrice
}; 