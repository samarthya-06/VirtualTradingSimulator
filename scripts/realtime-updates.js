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

// Set up change streams for real-time updates
async function setupChangeStreams() {
  try {
    const db = mongoose.connection.db;
    
    // Collections to monitor for real-time updates
    const collectionsToMonitor = [
      'stocks',
      'portfolios',
      'trades',
      'orders',
      'transactions',
      'wallets',
      'watchlists',
      'users',
      'memberships'
    ];
    
    // Set up change streams for each collection
    for (const collectionName of collectionsToMonitor) {
      try {
        const collection = db.collection(collectionName);
        
        // Create a change stream
        const changeStream = collection.watch();
        
        // Set up event handlers
        changeStream.on('change', (change) => {
          console.log(colors.cyan(`Change detected in ${collectionName}:`), 
            colors.yellow(`Operation: ${change.operationType}`),
            colors.green(`Document ID: ${change.documentKey?._id}`));
          
          // Here you would typically emit this change to connected clients
          // via WebSockets or another real-time communication channel
        });
        
        console.log(colors.green(`Change stream set up for ${collectionName}`));
      } catch (streamError) {
        console.error(colors.red(`Error setting up change stream for ${collectionName}:`), streamError.message);
      }
    }
    
    console.log(colors.green.bold('All change streams set up successfully'));
    console.log(colors.cyan('Monitoring for real-time updates...'));
    console.log(colors.yellow('Press Ctrl+C to stop'));
    
    // Keep the process running
    process.stdin.resume();
    
    // Handle process termination
    process.on('SIGINT', async () => {
      console.log(colors.yellow('\nGracefully shutting down...'));
      await mongoose.connection.close();
      console.log(colors.cyan('MongoDB connection closed'));
      process.exit(0);
    });
    
    return true;
  } catch (error) {
    console.error(colors.red('Error setting up change streams:'), error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log(colors.cyan.bold('Setting up real-time updates for Virtual Trading Simulator'));
  
  // Connect to MongoDB Atlas
  const connected = await connectToMongoDB();
  if (!connected) {
    console.error(colors.red.bold('Failed to connect to MongoDB Atlas. Exiting...'));
    process.exit(1);
  }
  
  // Set up change streams
  await setupChangeStreams();
}

// Run the main function
main().catch(error => {
  console.error(colors.red.bold('Error in main function:'), error);
  process.exit(1);
});
