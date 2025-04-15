import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB URI
const uri = 'mongodb+srv://samarthya:sam664@cluster0.yia8d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function testMongoDBConnection() {
  console.log('Testing direct MongoDB driver connection...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB using the MongoDB driver');
    const dbs = await client.db().admin().listDatabases();
    console.log('Databases:', dbs.databases.map(db => db.name).join(', '));
  } catch (error) {
    console.error('MongoDB driver connection error:', error);
  } finally {
    await client.close();
  }
}

async function testMongooseConnection() {
  console.log('Testing Mongoose connection...');
  
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB using Mongoose');
    console.log('MongoDB server version:', mongoose.connection.version);
  } catch (error) {
    console.error('Mongoose connection error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run tests
(async () => {
  try {
    await testMongoDBConnection();
    await testMongooseConnection();
  } catch (error) {
    console.error('Test failed:', error);
  }
})(); 