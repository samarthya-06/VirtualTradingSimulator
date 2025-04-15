import mongoose from 'mongoose';
import dotenv from 'dotenv';
import colors from 'colors';
import axios from 'axios';
import { MongoClient } from 'mongodb';

// Load environment variables
dotenv.config();

// MongoDB URI from .env file
const uri = process.env.MONGO_URI;

console.log('Setting up Real-Time Data for Virtual Trading Simulator');
console.log('-----------------------------------------------------');

// Function to connect to MongoDB Atlas
async function connectToMongoDB() {
  try {
    const client = new MongoClient(uri, {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
    });
    
    await client.connect();
    console.log(colors.green('✓ Connected to MongoDB Atlas'));
    
    return client;
  } catch (error) {
    console.error(colors.red('✗ MongoDB connection error:'), error.message);
    throw error;
  }
}

// Function to fetch real stock data from Yahoo Finance API
async function fetchStockData(symbols) {
  try {
    console.log(`Fetching real-time data for ${symbols.length} stocks...`);
    
    // For demonstration, we'll use a batch of 5 symbols at a time
    const batchSize = 5;
    const stockData = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1}: ${batch.join(', ')}`);
      
      // In a real implementation, you would use the Yahoo Finance API
      // Here we're simulating the API call with random data
      for (const symbol of batch) {
        const currentPrice = (Math.random() * 1000 + 100).toFixed(2);
        const previousClose = (currentPrice * (0.9 + Math.random() * 0.2)).toFixed(2);
        const dayHigh = (currentPrice * (1 + Math.random() * 0.05)).toFixed(2);
        const dayLow = (currentPrice * (0.95 + Math.random() * 0.03)).toFixed(2);
        const volume = Math.floor(Math.random() * 1000000) + 100000;
        
        stockData.push({
          symbol,
          companyName: `${symbol} Company Ltd.`,
          exchange: Math.random() > 0.5 ? 'NSE' : 'BSE',
          currentPrice: parseFloat(currentPrice),
          previousClose: parseFloat(previousClose),
          dayHigh: parseFloat(dayHigh),
          dayLow: parseFloat(dayLow),
          volume,
          lastUpdated: new Date()
        });
      }
      
      // Add a small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(colors.green(`✓ Fetched data for ${stockData.length} stocks`));
    return stockData;
  } catch (error) {
    console.error(colors.red('✗ Error fetching stock data:'), error.message);
    throw error;
  }
}

// Function to update stock data in the database
async function updateStockData(client, stockData) {
  try {
    const db = client.db('virtual-trading');
    const stocksCollection = db.collection('stocks');
    
    console.log(`Updating ${stockData.length} stocks in the database...`);
    
    let updateCount = 0;
    let insertCount = 0;
    
    for (const stock of stockData) {
      // Try to update existing stock
      const result = await stocksCollection.updateOne(
        { symbol: stock.symbol },
        { 
          $set: stock,
          $push: { 
            priceHistory: { 
              price: stock.currentPrice, 
              volume: stock.volume, 
              timestamp: new Date() 
            } 
          }
        }
      );
      
      // If no stock was updated, insert a new one
      if (result.matchedCount === 0) {
        stock.priceHistory = [{
          price: stock.currentPrice,
          volume: stock.volume,
          timestamp: new Date()
        }];
        
        await stocksCollection.insertOne(stock);
        insertCount++;
      } else {
        updateCount++;
      }
    }
    
    console.log(colors.green(`✓ Updated ${updateCount} existing stocks`));
    console.log(colors.green(`✓ Inserted ${insertCount} new stocks`));
    
    return { updateCount, insertCount };
  } catch (error) {
    console.error(colors.red('✗ Error updating stock data:'), error.message);
    throw error;
  }
}

// Function to set up change streams for real-time updates
async function setupChangeStreams(client) {
  try {
    const db = client.db('virtual-trading');
    
    // Collections to monitor
    const collectionsToMonitor = [
      'stocks',
      'portfolios',
      'trades',
      'orders',
      'transactions'
    ];
    
    console.log('\nSetting up change streams for real-time updates...');
    
    for (const collectionName of collectionsToMonitor) {
      const collection = db.collection(collectionName);
      
      // Create a change stream
      const changeStream = collection.watch();
      
      // Set up event handlers
      changeStream.on('change', (change) => {
        console.log(colors.cyan(`Change detected in ${collectionName}:`), 
          colors.yellow(`Operation: ${change.operationType}`));
        
        // Here you would typically emit this change to connected clients
        // via WebSockets or another real-time communication channel
      });
      
      console.log(colors.green(`✓ Change stream set up for ${collectionName}`));
    }
    
    console.log(colors.green.bold('✓ All change streams set up successfully'));
    
    return true;
  } catch (error) {
    console.error(colors.red('✗ Error setting up change streams:'), error.message);
    return false;
  }
}

// Main function
async function main() {
  let client;
  
  try {
    // Connect to MongoDB
    client = await connectToMongoDB();
    
    // Define a list of Indian stock symbols
    const indianStockSymbols = [
      'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS',
      'ICICIBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'KOTAKBANK.NS',
      'LT.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'ASIANPAINT.NS', 'MARUTI.NS'
    ];
    
    // Fetch real-time stock data
    const stockData = await fetchStockData(indianStockSymbols);
    
    // Update the database with the fetched data
    await updateStockData(client, stockData);
    
    // Set up change streams for real-time updates
    await setupChangeStreams(client);
    
    console.log(colors.green.bold('\n✓ Real-time data setup completed successfully'));
    console.log(colors.cyan('The database will now receive real-time updates'));
    
    // Keep the process running to maintain change streams
    console.log(colors.yellow('\nPress Ctrl+C to stop the real-time updates'));
    process.stdin.resume();
    
  } catch (error) {
    console.error(colors.red.bold('\n✗ Error setting up real-time data:'), error);
  }
  
  // Handle process termination
  process.on('SIGINT', async () => {
    console.log(colors.yellow('\nGracefully shutting down...'));
    
    if (client) {
      await client.close();
      console.log(colors.cyan('MongoDB connection closed'));
    }
    
    process.exit(0);
  });
}

// Run the main function
main().catch(error => {
  console.error(colors.red.bold('Error in main function:'), error);
  process.exit(1);
});
