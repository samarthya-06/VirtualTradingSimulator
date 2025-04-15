import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// Load environment variables
dotenv.config();

// MongoDB URI from .env file
const uri = process.env.MONGO_URI;

async function testMongoDBConnection() {
  console.log('Testing MongoDB Atlas connection...');
  console.log('URI:', uri);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas using the MongoDB driver');
    
    // List databases
    const dbs = await client.db().admin().listDatabases();
    console.log('Available databases:', dbs.databases.map(db => db.name).join(', '));
    
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
    
    // Verify collections after creation
    const updatedCollections = await db.listCollections().toArray();
    console.log('Updated collections:', updatedCollections.map(c => c.name).join(', '));
    
    // Create indexes for real-time updates
    console.log('Creating indexes for real-time updates...');
    
    // Create indexes for each collection
    await db.collection('stocks').createIndex({ symbol: 1 }, { unique: true });
    await db.collection('portfolios').createIndex({ user: 1 }, { unique: true });
    await db.collection('trades').createIndex({ createdAt: -1 });
    await db.collection('trades').createIndex({ user: 1, stock: 1 });
    await db.collection('orders').createIndex({ status: 1, user: 1 });
    await db.collection('transactions').createIndex({ user: 1, createdAt: -1 });
    await db.collection('watchlists').createIndex({ user: 1 });
    
    console.log('Indexes created successfully');
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the test
testMongoDBConnection().catch(console.error);
