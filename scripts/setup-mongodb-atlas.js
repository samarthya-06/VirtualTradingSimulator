import mongoose from 'mongoose';
import dotenv from 'dotenv';
import colors from 'colors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models
import '../backend/models/userModel.js';
import '../backend/models/stockModel.js';
import '../backend/models/portfolioModel.js';
import '../backend/models/tradeModel.js';
import '../backend/models/orderModel.js';
import '../backend/models/transactionModel.js';
import '../backend/models/walletModel.js';
import '../backend/models/watchlistModel.js';
import '../backend/models/membershipModel.js';

// Connect to MongoDB Atlas
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(colors.green.bold('Connected to MongoDB Atlas'));
    return true;
  } catch (error) {
    console.error(colors.red.bold('MongoDB Atlas connection error:'), error.message);
    return false;
  }
}

// Verify collections exist
async function verifyCollections() {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log(colors.cyan('Existing collections:'), collectionNames.join(', '));
    
    // List of required collections
    const requiredCollections = [
      'users',
      'memberships',
      'stocks',
      'portfolios',
      'trades',
      'orders',
      'transactions',
      'wallets',
      'watchlists'
    ];
    
    // Check which collections are missing
    const missingCollections = requiredCollections.filter(
      name => !collectionNames.includes(name)
    );
    
    if (missingCollections.length === 0) {
      console.log(colors.green('All required collections exist in the database.'));
    } else {
      console.log(colors.yellow('Missing collections:'), missingCollections.join(', '));
      console.log(colors.yellow('These collections will be created when you start using the models.'));
    }
    
    return {
      existing: collectionNames,
      missing: missingCollections
    };
  } catch (error) {
    console.error(colors.red('Error verifying collections:'), error.message);
    return {
      existing: [],
      missing: []
    };
  }
}

// Create indexes for real-time updates
async function createIndexes() {
  try {
    const db = mongoose.connection.db;
    
    // Create indexes for each collection to optimize real-time updates
    const indexOperations = [
      {
        collection: 'stocks',
        index: { symbol: 1 },
        options: { unique: true }
      },
      {
        collection: 'portfolios',
        index: { user: 1 },
        options: { unique: true }
      },
      {
        collection: 'trades',
        index: { createdAt: -1 }
      },
      {
        collection: 'trades',
        index: { user: 1, stock: 1 }
      },
      {
        collection: 'orders',
        index: { status: 1, user: 1 }
      },
      {
        collection: 'transactions',
        index: { user: 1, createdAt: -1 }
      },
      {
        collection: 'watchlists',
        index: { user: 1 }
      }
    ];
    
    for (const op of indexOperations) {
      try {
        await db.collection(op.collection).createIndex(op.index, op.options);
        console.log(colors.green(`Created index on ${op.collection}: ${JSON.stringify(op.index)}`));
      } catch (indexError) {
        // If index already exists, this is fine
        if (!indexError.message.includes('already exists')) {
          console.error(colors.yellow(`Error creating index on ${op.collection}:`), indexError.message);
        } else {
          console.log(colors.cyan(`Index on ${op.collection} already exists: ${JSON.stringify(op.index)}`));
        }
      }
    }
    
    console.log(colors.green('Indexes created successfully'));
    return true;
  } catch (error) {
    console.error(colors.red('Error creating indexes:'), error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log(colors.cyan.bold('Setting up MongoDB Atlas for Virtual Trading Simulator'));
  
  // Connect to MongoDB Atlas
  const connected = await connectToMongoDB();
  if (!connected) {
    console.error(colors.red.bold('Failed to connect to MongoDB Atlas. Exiting...'));
    process.exit(1);
  }
  
  // Verify collections
  const collections = await verifyCollections();
  
  // Create indexes
  await createIndexes();
  
  console.log(colors.green.bold('MongoDB Atlas setup completed successfully'));
  
  // Close the connection
  await mongoose.connection.close();
  console.log(colors.cyan('MongoDB connection closed'));
}

// Run the main function
main().catch(error => {
  console.error(colors.red.bold('Error in main function:'), error);
  process.exit(1);
});
