/**
 * Market Data Service
 * 
 * Provides functions for fetching and processing market data
 */
import axios from 'axios';
import { logError } from '../utils/logger.js';
import cacheService from './cacheService.js';
import yahooFinance from 'yahoo-finance2';
import { exchangeSuffixes } from '../utils/yahooFinanceConfig.js';

const CACHE_TTL = 60 * 5; // 5 minutes cache

/**
 * Fetch historical data for a symbol - Main function used by indicators
 * @param {string} symbol - Stock symbol
 * @param {string} interval - Time interval (daily, weekly, etc.)
 * @param {number} limit - Number of data points to fetch
 * @returns {Promise<Array>} - Array of price data
 */
export const getHistoricalData = async (symbol, interval = 'daily', limit = 100) => {
  const data = await getHistoricalPriceData(symbol, interval, limit);
  
  // Transform data to the format expected by technical indicators
  return data.map(item => ({
    time: new Date(item.date).getTime(),
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume
  }));
};

/**
 * Fetch historical price data for a symbol
 * @param {string} symbol - Stock symbol
 * @param {string} interval - Time interval (daily, weekly, etc.)
 * @param {number} limit - Number of data points to fetch
 * @returns {Promise<Array>} - Array of price data
 */
export const getHistoricalPriceData = async (symbol, interval = 'daily', limit = 100) => {
  const cacheKey = `historical_data:${symbol}:${interval}:${limit}`;
  
  // Check cache first
  const cachedData = await cacheService.get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  try {
    // Add exchange suffix if not present
    let yahooSymbol = symbol;
    if (!symbol.includes('.NS') && !symbol.includes('.BO')) {
      // Default to NSE if no exchange suffix
      yahooSymbol = `${symbol}${exchangeSuffixes.NSE}`;
    }
    
    console.log(`Fetching history for ${yahooSymbol}: {
      period1: ${new Date(Date.now() - (limit * 24 * 60 * 60 * 1000))},
      period2: ${new Date()},
      interval: '${interval === 'daily' ? '1d' : (interval === 'weekly' ? '1wk' : '1d')}',
      events: 'history',
      includeAdjustedClose: true
    }`);
    
    // Map our interval to Yahoo Finance interval
    const yahooInterval = interval === 'daily' ? '1d' : 
                         interval === 'weekly' ? '1wk' :
                         interval === 'monthly' ? '1mo' : '1d';
    
    // Calculate start date based on limit
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (limit * (interval === 'daily' ? 1 : (interval === 'weekly' ? 7 : 30))));
    
    const options = {
      period1: startDate,
      period2: endDate,
      interval: yahooInterval,
      events: 'history',
      includeAdjustedClose: true
    };
    
    const result = await yahooFinance.historical(yahooSymbol, options);
    
    if (!result || result.length === 0) {
      throw new Error(`No data returned for ${yahooSymbol}`);
    }
    
    // Transform Yahoo Finance data to our format
    const data = result.map(item => ({
      date: item.date.toISOString().split('T')[0],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume
    }));
    
    // Cache the result
    await cacheService.set(cacheKey, JSON.stringify(data), CACHE_TTL);
    
    return data;
  } catch (error) {
    logError(`Error fetching historical data for ${symbol}:`, error);
    
    // Return dummy data for testing purposes
    const dummyData = generateDummyData(symbol, interval, limit);
    
    // Cache the dummy data but with shorter TTL
    await cacheService.set(cacheKey, JSON.stringify(dummyData), 60); // 1 minute cache for dummy data
    
    return dummyData;
  }
};

/**
 * Generate dummy price data for testing
 * @param {string} symbol - Stock symbol
 * @param {string} interval - Time interval
 * @param {number} limit - Number of data points
 * @returns {Array} - Array of dummy price data
 */
const generateDummyData = (symbol, interval, limit) => {
  const data = [];
  const basePrice = Math.random() * 1000 + 100; // Random base price between 100 and 1100
  
  const now = new Date();
  let currentDate = new Date(now);
  
  // Adjust interval step
  let step = 1;
  if (interval === 'daily') step = 1;
  else if (interval === 'weekly') step = 7;
  else if (interval === 'monthly') step = 30;
  else if (interval === 'hourly') step = 1/24;
  
  for (let i = 0; i < limit; i++) {
    // Move back in time
    if (interval === 'hourly') {
      currentDate = new Date(currentDate.getTime() - (step * 24 * 60 * 60 * 1000));
    } else {
      currentDate.setDate(currentDate.getDate() - step);
    }
    
    const change = (Math.random() - 0.5) * 10;
    const price = basePrice + change * (i/10);
    
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      open: price - Math.random() * 5,
      high: price + Math.random() * 5,
      low: price - Math.random() * 5,
      close: price,
      volume: volume
    });
  }
  
  return data.reverse();
};

/**
 * Get real-time market data for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} - Real-time market data
 */
export const getRealTimeMarketData = async (symbol) => {
  const cacheKey = `realtime_data:${symbol}`;
  
  // Check cache first - but with very short TTL for real-time data
  const cachedData = await cacheService.get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  try {
    const apiUrl = `${process.env.MARKET_API_BASE_URL}/realtime/${symbol}`;
    const response = await axios.get(apiUrl, {
      headers: {
        'X-API-KEY': process.env.MARKET_API_KEY
      }
    });

    const data = response.data || {
      symbol,
      price: Math.random() * 1000 + 100,
      change: (Math.random() - 0.5) * 10,
      percentChange: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 1000000) + 100000,
      timestamp: new Date().toISOString()
    };
    
    // Cache real-time data for only 30 seconds
    await cacheService.set(cacheKey, JSON.stringify(data), 30);
    
    return data;
  } catch (error) {
    logError(`Error fetching real-time data for ${symbol}:`, error);
    
    // Generate dummy data for testing
    const dummyData = {
      symbol,
      price: Math.random() * 1000 + 100,
      change: (Math.random() - 0.5) * 10,
      percentChange: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 1000000) + 100000,
      timestamp: new Date().toISOString()
    };
    
    // Cache dummy data for 15 seconds
    await cacheService.set(cacheKey, JSON.stringify(dummyData), 15);
    
    return dummyData;
  }
}; 