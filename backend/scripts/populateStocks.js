import mongoose from 'mongoose';
import dotenv from 'dotenv';
import colors from 'colors';
import yahooFinance from 'yahoo-finance2';
import Stock from '../models/stockModel.js';
import connectDB from '../config/db.js';

dotenv.config();

// Connect to database
connectDB();

// List of popular NSE stocks
const nseStocks = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
    'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'KOTAKBANK.NS',
    'LT.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'ASIANPAINT.NS', 'MARUTI.NS',
    'TITAN.NS', 'SUNPHARMA.NS', 'WIPRO.NS', 'HCLTECH.NS', 'ULTRACEMCO.NS',
    'TATAMOTORS.NS', 'ADANIENT.NS', 'NTPC.NS', 'POWERGRID.NS', 'TATASTEEL.NS',
    'ONGC.NS', 'JSWSTEEL.NS', 'ADANIPORTS.NS', 'BAJAJFINSV.NS', 'NESTLEIND.NS',
    'INDUSINDBK.NS', 'APOLLOHOSP.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'DRREDDY.NS',
    'EICHERMOT.NS', 'GRASIM.NS', 'HEROMOTOCO.NS', 'HINDALCO.NS', 'BRITANNIA.NS',
    'COALINDIA.NS', 'HDFCLIFE.NS', 'SBILIFE.NS', 'TATACONSUM.NS', 'TECHM.NS',
    'UPL.NS', 'BPCL.NS', 'BAJAJ-AUTO.NS', 'M&M.NS', 'SHREECEM.NS'
];

// List of popular BSE stocks
const bseStocks = [
    'RELIANCE.BO', 'TCS.BO', 'HDFCBANK.BO', 'INFY.BO', 'ICICIBANK.BO',
    'HINDUNILVR.BO', 'SBIN.BO', 'BHARTIARTL.BO', 'ITC.BO', 'KOTAKBANK.BO',
    'LT.BO', 'AXISBANK.BO', 'BAJFINANCE.BO', 'ASIANPAINT.BO', 'MARUTI.BO',
    'TITAN.BO', 'SUNPHARMA.BO', 'WIPRO.BO', 'HCLTECH.BO', 'ULTRACEMCO.BO',
    'TATAMOTORS.BO', 'ADANIENT.BO', 'NTPC.BO', 'POWERGRID.BO', 'TATASTEEL.BO',
    'ONGC.BO', 'JSWSTEEL.BO', 'ADANIPORTS.BO', 'BAJAJFINSV.BO', 'NESTLEIND.BO',
    'INDUSINDBK.BO', 'APOLLOHOSP.BO', 'CIPLA.BO', 'DIVISLAB.BO', 'DRREDDY.BO',
    'EICHERMOT.BO', 'GRASIM.BO', 'HEROMOTOCO.BO', 'HINDALCO.BO', 'BRITANNIA.BO',
    'COALINDIA.BO', 'HDFCLIFE.BO', 'SBILIFE.BO', 'TATACONSUM.BO', 'TECHM.BO',
    'UPL.BO', 'BPCL.BO', 'BAJAJ-AUTO.BO', 'M&M.BO', 'SHREECEM.BO'
];

const populateStocks = async () => {
    try {
        console.log('Starting stock database population...'.yellow.bold);
        
        // Process NSE stocks
        console.log('Processing NSE stocks...'.cyan);
        await processStocks(nseStocks, 'NSE');
        
        // Process BSE stocks
        console.log('Processing BSE stocks...'.cyan);
        await processStocks(bseStocks, 'BSE');
        
        console.log('Stock database population completed successfully!'.green.bold);
        process.exit(0);
    } catch (error) {
        console.error(`Error: ${error.message}`.red.bold);
        process.exit(1);
    }
};

const processStocks = async (symbols, exchange) => {
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
        batches.push(symbols.slice(i, i + batchSize));
    }
    
    let processedCount = 0;
    
    for (const [batchIndex, batch] of batches.entries()) {
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} for ${exchange}...`.yellow);
        
        await Promise.all(batch.map(async (symbol) => {
            try {
                // Clean symbol (remove exchange suffix)
                const cleanSymbol = symbol.replace(`.${exchange === 'NSE' ? 'NS' : 'BO'}`, '');
                
                // Check if stock already exists
                const existingStock = await Stock.findOne({ symbol: cleanSymbol, exchange });
                
                if (existingStock) {
                    console.log(`${cleanSymbol} already exists in ${exchange}, updating...`.blue);
                    
                    // Fetch latest data
                    const quote = await yahooFinance.quote(symbol);
                    
                    if (quote) {
                        // Update existing stock
                        existingStock.companyName = quote.shortName || quote.longName || cleanSymbol;
                        existingStock.currentPrice = quote.regularMarketPrice || 0;
                        existingStock.dayHigh = quote.regularMarketDayHigh || quote.regularMarketPrice || 0;
                        existingStock.dayLow = quote.regularMarketDayLow || quote.regularMarketPrice || 0;
                        existingStock.volume = quote.regularMarketVolume || 0;
                        existingStock.marketCap = quote.marketCap || 0;
                        existingStock.previousClose = quote.regularMarketPreviousClose || quote.regularMarketPrice || 0;
                        existingStock.lastUpdated = new Date();
                        
                        await existingStock.save();
                        console.log(`Updated ${cleanSymbol} in ${exchange}`.green);
                    }
                } else {
                    console.log(`Adding new stock ${cleanSymbol} to ${exchange}...`.blue);
                    
                    // Fetch data
                    const quote = await yahooFinance.quote(symbol);
                    
                    if (quote) {
                        // Create new stock
                        const newStock = new Stock({
                            symbol: cleanSymbol,
                            companyName: quote.shortName || quote.longName || cleanSymbol,
                            exchange,
                            currentPrice: quote.regularMarketPrice || 0,
                            dayHigh: quote.regularMarketDayHigh || quote.regularMarketPrice || 0,
                            dayLow: quote.regularMarketDayLow || quote.regularMarketPrice || 0,
                            volume: quote.regularMarketVolume || 0,
                            marketCap: quote.marketCap || 0,
                            previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice || 0,
                            sector: quote.sector || 'Unknown',
                            lastUpdated: new Date()
                        });
                        
                        await newStock.save();
                        console.log(`Added ${cleanSymbol} to ${exchange}`.green);
                    }
                }
                
                processedCount++;
            } catch (error) {
                console.error(`Error processing ${symbol}: ${error.message}`.red);
            }
        }));
        
        // Add delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
            console.log('Waiting 2 seconds before next batch...'.gray);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log(`Processed ${processedCount} ${exchange} stocks`.green.bold);
};

// Run the population script
populateStocks();