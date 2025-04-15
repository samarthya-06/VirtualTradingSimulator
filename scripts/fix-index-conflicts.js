import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import colors from 'colors';

// Load environment variables
dotenv.config();

// MongoDB URI from .env file
const uri = process.env.MONGO_URI;

console.log('MongoDB Atlas Index Conflict Resolution');
console.log('--------------------------------------');
console.log('Connection URI:', uri);

async function fixIndexConflicts() {
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
    
    // Collections to check for index conflicts
    const collectionsToCheck = [
      'users',
      'memberships',
      'portfolios',
      'trades',
      'orders',
      'transactions',
      'wallets',
      'watchlists'
    ];
    
    // Process each collection
    for (const collectionName of collectionsToCheck) {
      console.log(`\nChecking indexes for collection: ${collectionName}`);
      
      try {
        const collection = db.collection(collectionName);
        
        // Get existing indexes
        const indexes = await collection.indexes();
        console.log(`Found ${indexes.length} indexes in ${collectionName}`);
        
        // Check for conflicts
        const indexKeys = {};
        const conflictingIndexes = [];
        
        for (const index of indexes) {
          // Skip _id_ index
          if (index.name === '_id_') continue;
          
          // Create a string representation of the key
          const keyString = JSON.stringify(index.key);
          
          if (indexKeys[keyString]) {
            // We have a conflict - same keys, different names
            conflictingIndexes.push({
              existing: indexKeys[keyString],
              conflicting: index
            });
          } else {
            indexKeys[keyString] = index;
          }
        }
        
        // Handle conflicts
        if (conflictingIndexes.length > 0) {
          console.log(colors.yellow(`Found ${conflictingIndexes.length} conflicting indexes in ${collectionName}`));
          
          for (const conflict of conflictingIndexes) {
            console.log(colors.yellow(`Conflict: ${JSON.stringify(conflict.existing.key)} has multiple index names:`));
            console.log(`  - ${conflict.existing.name}`);
            console.log(`  - ${conflict.conflicting.name}`);
            
            // Drop the conflicting index
            console.log(colors.yellow(`Dropping index: ${conflict.conflicting.name}`));
            await collection.dropIndex(conflict.conflicting.name);
            console.log(colors.green(`✓ Dropped conflicting index: ${conflict.conflicting.name}`));
          }
        } else {
          console.log(colors.green('✓ No conflicting indexes found'));
        }
        
        // Check for user_1 index specifically (mentioned in your error)
        const userIndex = indexes.find(idx => idx.name === 'user_1');
        if (userIndex) {
          console.log(colors.cyan(`Found user_1 index: ${JSON.stringify(userIndex)}`));
          
          // If it's not unique and should be, we need to recreate it
          if (collectionName === 'memberships' && !userIndex.unique) {
            console.log(colors.yellow('The user_1 index in memberships should be unique but is not.'));
            console.log(colors.yellow('Dropping and recreating with unique constraint...'));
            
            // Drop the existing index
            await collection.dropIndex('user_1');
            console.log(colors.green('✓ Dropped non-unique user_1 index'));
            
            // Create a new unique index
            await collection.createIndex({ user: 1 }, { 
              unique: true,
              name: 'user_1_unique'  // Use a different name to avoid conflicts
            });
            console.log(colors.green('✓ Created new unique user_1_unique index'));
          }
        }
      } catch (error) {
        console.error(colors.red(`Error processing ${collectionName}:`), error.message);
      }
    }
    
    console.log(colors.green.bold('\n✓ Index conflict resolution completed'));
    
  } catch (error) {
    console.error(colors.red('\n✗ Error connecting to MongoDB:'), error.message);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
fixIndexConflicts().catch(error => {
  console.error(colors.red.bold('Error in main function:'), error);
  process.exit(1);
});
