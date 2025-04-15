import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import colors from 'colors';

// Load environment variables
dotenv.config();

// MongoDB URI from .env file
const uri = process.env.MONGO_URI;

console.log('MongoDB Atlas Real-time Monitoring');
console.log('----------------------------------');
console.log('Connection URI:', uri);

// Function to monitor collections for changes
async function monitorCollections() {
  console.log('\nSetting up change streams for real-time monitoring...');
  
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
    
    // Collections to monitor
    const collectionsToMonitor = [
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
    
    // Set up change streams for each collection
    const changeStreams = [];
    
    for (const collectionName of collectionsToMonitor) {
      try {
        const collection = db.collection(collectionName);
        
        // Create a change stream
        const changeStream = collection.watch();
        
        // Set up event handlers
        changeStream.on('change', (change) => {
          const timestamp = new Date().toISOString();
          console.log(colors.cyan(`[${timestamp}] Change in ${collectionName}:`), 
            colors.yellow(`Operation: ${change.operationType}`),
            colors.green(`Document ID: ${change.documentKey?._id}`));
          
          // Show more details based on operation type
          if (change.operationType === 'insert') {
            console.log(colors.green('  New document:'), JSON.stringify(change.fullDocument).substring(0, 150) + '...');
          } else if (change.operationType === 'update') {
            console.log(colors.yellow('  Updated fields:'), JSON.stringify(change.updateDescription?.updatedFields).substring(0, 150) + '...');
          } else if (change.operationType === 'delete') {
            console.log(colors.red('  Deleted document ID:'), change.documentKey?._id);
          }
        });
        
        // Handle errors
        changeStream.on('error', (error) => {
          console.error(colors.red(`Error in ${collectionName} change stream:`), error.message);
        });
        
        changeStreams.push(changeStream);
        console.log(colors.green(`✓ Monitoring ${collectionName} for changes`));
      } catch (streamError) {
        console.error(colors.red(`✗ Error setting up change stream for ${collectionName}:`), streamError.message);
      }
    }
    
    console.log(colors.green.bold('\n✓ All change streams set up successfully'));
    console.log(colors.cyan('Monitoring for real-time updates...'));
    console.log(colors.yellow('Press Ctrl+C to stop'));
    
    // Keep the process running
    process.stdin.resume();
    
    // Handle process termination
    process.on('SIGINT', async () => {
      console.log(colors.yellow('\nGracefully shutting down...'));
      
      // Close all change streams
      for (const stream of changeStreams) {
        await stream.close();
      }
      
      await client.close();
      console.log(colors.cyan('MongoDB connection closed'));
      process.exit(0);
    });
  } catch (error) {
    console.error(colors.red('\n✗ Error setting up monitoring:'), error.message);
    await client.close();
    process.exit(1);
  }
}

// Run the monitoring function
monitorCollections().catch(error => {
  console.error(colors.red.bold('Error in monitoring function:'), error);
  process.exit(1);
});
