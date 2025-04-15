import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import colors from 'colors';

// Load environment variables
dotenv.config();

// MongoDB URI from .env file
const uri = process.env.MONGO_URI;

console.log('MongoDB Atlas Connection Script');
console.log('-------------------------------');
console.log('Connection URI:', uri);

// Function to test connection with MongoDB driver
async function testDirectConnection() {
  console.log('\nTesting direct MongoDB connection...');
  const client = new MongoClient(uri, {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 30000,
  });
  
  try {
    await client.connect();
    console.log(colors.green('✓ Connected to MongoDB Atlas using the MongoDB driver'));
    
    // List databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('Available databases:', dbs.databases.map(db => db.name).join(', '));
    
    return true;
  } catch (error) {
    console.error(colors.red('✗ MongoDB driver connection error:'), error.message);
    return false;
  } finally {
    await client.close();
    console.log('MongoDB driver connection closed');
  }
}

// Function to test connection with Mongoose
async function testMongooseConnection() {
  console.log('\nTesting Mongoose connection...');
  
  try {
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connect with timeout options
    await mongoose.connect(uri, {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
    });
    
    console.log(colors.green('✓ Connected to MongoDB Atlas using Mongoose'));
    console.log('MongoDB server version:', mongoose.connection.version);
    
    return true;
  } catch (error) {
    console.error(colors.red('✗ Mongoose connection error:'), error.message);
    return false;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Mongoose connection closed');
    }
  }
}

// Function to create collections and indexes
async function setupCollections() {
  console.log('\nSetting up collections and indexes...');
  
  const client = new MongoClient(uri, {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 30000,
  });
  
  try {
    await client.connect();
    console.log(colors.green('✓ Connected to MongoDB Atlas'));
    
    // Use the virtual-trading database
    const db = client.db('virtual-trading');
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('Existing collections:', collections.map(c => c.name).join(', '));
    
    // Create the required collections if they don't exist
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
    
    for (const collectionName of requiredCollections) {
      if (!collections.some(c => c.name === collectionName)) {
        console.log(`Creating collection: ${collectionName}`);
        await db.createCollection(collectionName);
      } else {
        console.log(`Collection already exists: ${collectionName}`);
      }
    }
    
    // Create indexes for real-time updates
    console.log('\nCreating indexes for real-time updates...');
    
    // Define indexes for each collection
    const indexes = [
      { collection: 'users', index: { email: 1 }, options: { unique: true } },
      { collection: 'stocks', index: { symbol: 1 }, options: { unique: true } },
      { collection: 'portfolios', index: { user: 1 }, options: { unique: true } },
      { collection: 'trades', index: { createdAt: -1 }, options: {} },
      { collection: 'trades', index: { user: 1, stock: 1 }, options: {} },
      { collection: 'orders', index: { status: 1, user: 1 }, options: {} },
      { collection: 'transactions', index: { user: 1, createdAt: -1 }, options: {} },
      { collection: 'watchlists', index: { user: 1 }, options: {} },
      { collection: 'memberships', index: { user: 1 }, options: { unique: true } }
    ];
    
    // Create each index
    for (const { collection, index, options } of indexes) {
      try {
        await db.collection(collection).createIndex(index, options);
        console.log(colors.green(`✓ Created index on ${collection}: ${JSON.stringify(index)}`));
      } catch (indexError) {
        // If index already exists, this is fine
        if (!indexError.message.includes('already exists')) {
          console.error(colors.yellow(`✗ Error creating index on ${collection}:`), indexError.message);
        } else {
          console.log(colors.cyan(`Index on ${collection} already exists: ${JSON.stringify(index)}`));
        }
      }
    }
    
    // Verify collections after creation
    const updatedCollections = await db.listCollections().toArray();
    console.log('\nUpdated collections:', updatedCollections.map(c => c.name).join(', '));
    
    console.log(colors.green('\n✓ Collections and indexes set up successfully'));
    return true;
  } catch (error) {
    console.error(colors.red('\n✗ Error setting up collections:'), error.message);
    return false;
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Main function
async function main() {
  console.log(colors.cyan.bold('\nMongoDB Atlas Setup for Virtual Trading Simulator'));
  console.log(colors.cyan('=============================================='));
  
  // Test direct connection
  const directConnected = await testDirectConnection();
  
  // Test mongoose connection
  const mongooseConnected = await testMongooseConnection();
  
  // If both connections work, set up collections
  if (directConnected && mongooseConnected) {
    await setupCollections();
    console.log(colors.green.bold('\n✓ MongoDB Atlas setup completed successfully'));
  } else {
    console.error(colors.red.bold('\n✗ MongoDB Atlas setup failed due to connection issues'));
    console.log(colors.yellow('Please check your connection string and network connectivity'));
  }
}

// Run the main function
main().catch(error => {
  console.error(colors.red.bold('Error in main function:'), error);
  process.exit(1);
});
