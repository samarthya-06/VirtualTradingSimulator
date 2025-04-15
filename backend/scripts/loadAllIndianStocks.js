import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import yahooFinance from 'yahoo-finance2';
import mongoose from 'mongoose';
import Stock from '../models/stockModel.js';
import { configureYahooFinance } from '../utils/yahooFinanceConfig.js';
import { logInfo, logError } from '../utils/logger.js';

// Get current file path (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configure Yahoo Finance for Indian markets
configureYahooFinance();

// NSE and BSE indices symbols
const nseIndices = [
  '^NSEI',    // Nifty 50
  '^NSEBANK', // Nifty Bank
  '^CNXIT',   // Nifty IT
  '^CNXAUTO', // Nifty Auto
  '^CNXFMCG', // Nifty FMCG
  '^CNXPHARMA', // Nifty Pharma
  '^CNXMETAL', // Nifty Metal
  '^CNXREALTY', // Nifty Realty
  '^CNENERGY', // Nifty Energy
  '^CNXFINANCE' // Nifty Finance
];

const bseIndices = [
  '^BSESN',   // Sensex
  '^BSETECH', // BSE Technology
  '^BSEFMC',  // BSE FMCG
  '^BSEHC',   // BSE Healthcare
  '^BSETELE', // BSE Telecom
  '^BSEBANK', // BSE Bankex
  '^BSEMET',  // BSE Metal
  '^BSEREAL', // BSE Realty
  '^BSEOIL',  // BSE Oil & Gas
  '^BSECONSU' // BSE Consumer Durables
];

// Top companies by market cap for each exchange
const nseTopCompanies = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS', 'ITC.NS',
  'LT.NS', 'AXISBANK.NS', 'WIPRO.NS', 'BAJFINANCE.NS', 'HCLTECH.NS',
  'ASIANPAINT.NS', 'MARUTI.NS', 'ULTRACEMCO.NS', 'SUNPHARMA.NS', 'TITAN.NS'
];

const bseTopCompanies = [
  'RELIANCE.BO', 'TCS.BO', 'HDFCBANK.BO', 'INFY.BO', 'ICICIBANK.BO',
  'HINDUNILVR.BO', 'SBIN.BO', 'BHARTIARTL.BO', 'KOTAKBANK.BO', 'ITC.BO',
  'LT.BO', 'AXISBANK.BO', 'WIPRO.BO', 'BAJFINANCE.BO', 'HCLTECH.BO',
  'ASIANPAINT.BO', 'MARUTI.BO', 'ULTRACEMCO.BO', 'SUNPHARMA.BO', 'TITAN.BO'
];

// Base lists used for search queries to discover stocks
const searchIndustries = [
  'technology', 'finance', 'banking', 'pharma', 'pharmaceutical', 
  'automobile', 'auto', 'energy', 'oil', 'gas', 'telecom', 
  'consumer', 'fmcg', 'retail', 'manufacturing', 'steel', 'cement',
  'infrastructure', 'realty', 'metal', 'mining', 'chemicals',
  'textile', 'healthcare', 'insurance', 'media', 'entertainment'
];

// Connect to MongoDB
async function connectDB() {
  try {
    // Use local MongoDB URI for development and testing
    const dbUri = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI;
    await mongoose.connect(dbUri);
    logInfo(`MongoDB Connected to ${dbUri}`);
  } catch (error) {
    logError('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Delay helper function to avoid rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch and process all stocks from an index
async function fetchStocksFromIndex(indexSymbol) {
  try {
    logInfo(`Fetching constituents for ${indexSymbol}...`);
    
    // Try to get constituents, but Yahoo doesn't consistently provide this
    // This is a best-effort approach
    const index = await yahooFinance.quote(indexSymbol);
    
    // If we can't get the constituent list directly, we'll use the top companies as a starting point
    return indexSymbol.includes('NSE') ? nseTopCompanies : bseTopCompanies;
  } catch (error) {
    logError(`Error fetching index ${indexSymbol}:`, error);
    return [];
  }
}

// Fetch all available stocks for a specific search term
async function fetchStocksBySearch(searchTerm) {
  try {
    logInfo(`Searching for ${searchTerm}...`);
    
    const results = await yahooFinance.search(searchTerm, {
      quotesCount: 100,
      newsCount: 0,
      enableFuzzyQuery: true,
      enableEnhancedTrivialQuery: true,
      enableNavLinks: false,
      enableCb: false,
      enableNavLinks: false,
      region: 'IN',
      lang: 'en-IN'
    });
    
    if (!results?.quotes) return [];
    
    return results.quotes
      .filter(quote => 
        quote.quoteType === 'EQUITY' && 
        (quote.exchange === 'NSE' || 
         quote.exchange === 'BSE' || 
         quote.symbol.endsWith('.NS') || 
         quote.symbol.endsWith('.BO'))
      )
      .map(quote => quote.symbol);
  } catch (error) {
    logError(`Error searching for ${searchTerm}:`, error);
    return [];
  }
}

// Fetch stock details from Yahoo Finance
async function fetchStockDetails(symbol) {
  try {
    logInfo(`Fetching details for ${symbol}...`);
    
    const quote = await yahooFinance.quote(symbol);
    
    // Format the response for our database
    return {
      symbol: symbol.replace('.NS', '').replace('.BO', ''),
      exchange: symbol.endsWith('.NS') ? 'NSE' : 'BSE',
      companyName: quote.shortName || quote.longName || symbol,
      currentPrice: quote.regularMarketPrice || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      dayHigh: quote.regularMarketDayHigh || 0,
      dayLow: quote.regularMarketDayLow || 0,
      volume: quote.regularMarketVolume || 0,
      marketCap: quote.marketCap || 0,
      averageDailyVolume: quote.averageDailyVolume10Day || 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
      pe: quote.trailingPE || 0,
      industry: quote.industry || null,
      sector: quote.sector || null,
      lastUpdated: new Date()
    };
  } catch (error) {
    logError(`Error fetching details for ${symbol}:`, error);
    return null;
  }
}

// Save stock to database
async function saveStock(stockData) {
  if (!stockData) return null;
  
  try {
    // Make sure all required fields have default values
    const processedData = {
      ...stockData,
      companyName: stockData.companyName || stockData.symbol || 'Unknown',
      currentPrice: stockData.currentPrice || 0,
      exchange: stockData.exchange || 'NSE',
    };
    
    // Update if exists, or create new
    const stock = await Stock.findOneAndUpdate(
      { symbol: processedData.symbol },
      processedData,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    
    logInfo(`Saved ${processedData.symbol} to database`);
    return stock;
  } catch (error) {
    logError(`Error saving ${stockData.symbol} to database:`, error);
    return null;
  }
}

// Main function to load all stocks
async function loadAllIndianStocks() {
  try {
    await connectDB();
    
    // Create a set to track unique symbols
    const uniqueSymbols = new Set();
    
    // Fetch stocks from indices
    logInfo('Fetching stocks from indices...');
    for (const index of [...nseIndices, ...bseIndices]) {
      const indexStocks = await fetchStocksFromIndex(index);
      indexStocks.forEach(symbol => uniqueSymbols.add(symbol));
      
      // Delay to avoid rate limiting
      await delay(1000);
    }
    
    // Fetch stocks by industry/sector search
    logInfo('Fetching stocks by industry/sector search...');
    for (const industry of searchIndustries) {
      const searchResults = await fetchStocksBySearch(industry);
      searchResults.forEach(symbol => uniqueSymbols.add(symbol));
      
      // Delay to avoid rate limiting
      await delay(1000);
    }
    
    // Also search for major company names
    const commonIndianCompanies = [
      'Reliance', 'Tata', 'Infosys', 'Wipro', 'HDFC', 'ICICI',
      'Bharti', 'Mahindra', 'Bajaj', 'Adani', 'Airtel', 'SBI',
      'LIC', 'Sun Pharma', 'Maruti', 'Asian Paints', 'ITC'
    ];
    
    for (const company of commonIndianCompanies) {
      const searchResults = await fetchStocksBySearch(company);
      searchResults.forEach(symbol => uniqueSymbols.add(symbol));
      
      // Delay to avoid rate limiting
      await delay(1000);
    }
    
    // Specific searches for NSE and BSE
    const nseResults = await fetchStocksBySearch('NSE India');
    nseResults.forEach(symbol => uniqueSymbols.add(symbol));
    
    await delay(1000);
    
    const bseResults = await fetchStocksBySearch('BSE India');
    bseResults.forEach(symbol => uniqueSymbols.add(symbol));
    
    // Write symbols to a file for future reference
    logInfo(`Found ${uniqueSymbols.size} unique Indian stock symbols`);
    fs.writeFileSync(
      path.resolve(__dirname, '../data/indian_stocks.json'), 
      JSON.stringify(Array.from(uniqueSymbols), null, 2)
    );
    
    // Fetch details for each stock and save to database
    let processedCount = 0;
    for (const symbol of uniqueSymbols) {
      const stockDetails = await fetchStockDetails(symbol);
      if (stockDetails) {
        await saveStock(stockDetails);
        processedCount++;
        
        if (processedCount % 10 === 0) {
          logInfo(`Processed ${processedCount}/${uniqueSymbols.size} stocks`);
        }
      }
      
      // Delay between API calls to avoid rate limiting
      await delay(500);
    }
    
    logInfo(`Successfully loaded ${processedCount} stocks to database`);
  } catch (error) {
    logError('Error loading Indian stocks:', error);
  } finally {
    // Disconnect from database
    mongoose.disconnect();
    logInfo('Database disconnected');
  }
}

// Run the script
loadAllIndianStocks(); 