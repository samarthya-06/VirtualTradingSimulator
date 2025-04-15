import mongoose from 'mongoose';
import dotenv from 'dotenv';
import colors from 'colors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// MongoDB URI from .env file
const uri = process.env.MONGO_URI;

console.log('Fixing Database Connection for Index Optimization');
console.log('-----------------------------------------------');
console.log('Connection URI:', uri);

// Function to fix the database connection issue
async function fixDatabaseConnection() {
  try {
    console.log('\nAttempting to connect to MongoDB Atlas...');
    
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connect with timeout options and wait for connection to be fully established
    await mongoose.connect(uri, {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
    });
    
    console.log(colors.green('✓ Connected to MongoDB Atlas'));
    
    // Wait for the connection to be fully established
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check connection state
    if (mongoose.connection.readyState !== 1) {
      console.error(colors.red('✗ MongoDB connection not fully established'));
      return false;
    }
    
    console.log(colors.green('✓ MongoDB connection fully established'));
    
    // Fix the optimizePerformance.js file
    await fixOptimizePerformanceFile();
    
    return true;
  } catch (error) {
    console.error(colors.red('✗ MongoDB connection error:'), error.message);
    return false;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('MongoDB connection closed');
    }
  }
}

// Function to fix the optimizePerformance.js file
async function fixOptimizePerformanceFile() {
  try {
    const filePath = path.join(__dirname, '..', 'backend', 'scripts', 'optimizePerformance.js');
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(colors.red(`✗ File not found: ${filePath}`));
      return false;
    }
    
    console.log(`Fixing file: ${filePath}`);
    
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add a delay before optimizing indexes to ensure connection is fully established
    const indexOptimizationCode = `
// Optimize database indexes
async function optimizeIndexes() {
  try {
    // Check if database connection is fully established
    if (mongoose.connection.readyState !== 1) {
      console.log('Database connection not fully established. Waiting...');
      // Wait for connection to be fully established
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check again
      if (mongoose.connection.readyState !== 1) {
        console.error('Database connection still not fully established after waiting');
        return false;
      }
    }
    
    console.log('Optimizing database indexes...');
    
    // Create indexes with error handling for conflicts
    try {
      // User model indexes
      await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
      await mongoose.connection.collection('users').createIndex({ 'profile.phone': 1 });
      
      // Stock model indexes
      await mongoose.connection.collection('stocks').createIndex({ symbol: 1 }, { unique: true });
      await mongoose.connection.collection('stocks').createIndex({ exchange: 1, sector: 1 });
      
      // Portfolio model indexes
      await mongoose.connection.collection('portfolios').createIndex({ user: 1 }, { unique: true });
      await mongoose.connection.collection('portfolios').createIndex({ 'holdings.stock': 1 });
      
      // Trade model indexes
      await mongoose.connection.collection('trades').createIndex({ user: 1, createdAt: -1 });
      await mongoose.connection.collection('trades').createIndex({ stock: 1, createdAt: -1 });
      
      // Order model indexes
      await mongoose.connection.collection('orders').createIndex({ user: 1, status: 1 });
      await mongoose.connection.collection('orders').createIndex({ stock: 1, status: 1 });
      
      // Transaction model indexes
      await mongoose.connection.collection('transactions').createIndex({ user: 1, createdAt: -1 });
      
      // Watchlist model indexes
      await mongoose.connection.collection('watchlists').createIndex({ user: 1 });
      await mongoose.connection.collection('watchlists').createIndex({ 'stocks.stock': 1 });
      
      console.log('Database indexes optimized successfully');
      return true;
    } catch (error) {
      // If the error is about index conflicts, we can ignore it
      if (error.code === 85 || error.message.includes('already exists')) {
        console.log('Index already exists, skipping...');
        return true;
      }
      
      console.error('Error optimizing database indexes', error);
      return false;
    }
  } catch (error) {
    console.error('Error optimizing database indexes', error);
    return false;
  }
}`;
    
    // Replace the existing optimizeIndexes function
    const regex = /async function optimizeIndexes\(\) \{[\s\S]*?\}/g;
    content = content.replace(regex, indexOptimizationCode);
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(colors.green('✓ Successfully updated optimizePerformance.js'));
    
    return true;
  } catch (error) {
    console.error(colors.red('✗ Error fixing optimizePerformance.js:'), error.message);
    return false;
  }
}

// Main function
async function main() {
  const success = await fixDatabaseConnection();
  
  if (success) {
    console.log(colors.green.bold('\n✓ Database connection fix completed successfully'));
    console.log(colors.cyan('The index optimization should now work properly'));
  } else {
    console.error(colors.red.bold('\n✗ Failed to fix database connection'));
  }
}

// Run the main function
main().catch(error => {
  console.error(colors.red.bold('Error in main function:'), error);
  process.exit(1);
});
