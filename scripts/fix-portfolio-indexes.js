// Script to fix portfolio indexes
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import colors from 'colors';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/virtual-trading')
  .then(async () => {
    console.log(colors.green.bold('MongoDB Connected'));
    
    try {
      // Get the portfolios collection
      const db = mongoose.connection.db;
      const portfoliosCollection = db.collection('portfolios');
      
      // Check existing indexes
      const indexes = await portfoliosCollection.indexes();
      console.log('Current indexes:', indexes);
      
      // Drop the userId index if it exists
      const userIdIndex = indexes.find(index => index.name === 'userId_1');
      if (userIdIndex) {
        console.log(colors.yellow('Dropping userId_1 index...'));
        await portfoliosCollection.dropIndex('userId_1');
        console.log(colors.green('Successfully dropped userId_1 index'));
      } else {
        console.log(colors.blue('No userId_1 index found'));
      }
      
      // Check if there's a unique index on user field
      const userIndex = indexes.find(index => index.name === 'user_1' || index.name === 'user_unique');
      if (!userIndex) {
        console.log(colors.yellow('Creating unique index on user field...'));
        await portfoliosCollection.createIndex({ user: 1 }, { unique: true, name: 'user_unique' });
        console.log(colors.green('Successfully created unique index on user field'));
      } else {
        console.log(colors.blue(`User index already exists: ${userIndex.name}`));
        
        // If the user index exists but is not unique, recreate it
        if (!userIndex.unique) {
          console.log(colors.yellow('User index is not unique, recreating...'));
          await portfoliosCollection.dropIndex(userIndex.name);
          await portfoliosCollection.createIndex({ user: 1 }, { unique: true, name: 'user_unique' });
          console.log(colors.green('Successfully recreated unique index on user field'));
        }
      }
      
      // Check for any documents with userId field
      const docsWithUserId = await portfoliosCollection.countDocuments({ userId: { $exists: true } });
      if (docsWithUserId > 0) {
        console.log(colors.yellow(`Found ${docsWithUserId} documents with userId field`));
        
        // Find documents with userId field
        const docs = await portfoliosCollection.find({ userId: { $exists: true } }).toArray();
        
        // Update each document to remove userId field
        for (const doc of docs) {
          console.log(colors.yellow(`Updating document ${doc._id}...`));
          await portfoliosCollection.updateOne(
            { _id: doc._id },
            { $unset: { userId: "" } }
          );
        }
        
        console.log(colors.green(`Successfully updated ${docsWithUserId} documents`));
      } else {
        console.log(colors.blue('No documents with userId field found'));
      }
      
      // Check for any documents with null user field
      const docsWithNullUser = await portfoliosCollection.countDocuments({ user: null });
      if (docsWithNullUser > 0) {
        console.log(colors.yellow(`Found ${docsWithNullUser} documents with null user field`));
        
        // Delete documents with null user field
        await portfoliosCollection.deleteMany({ user: null });
        console.log(colors.green(`Successfully deleted ${docsWithNullUser} documents with null user field`));
      } else {
        console.log(colors.blue('No documents with null user field found'));
      }
      
      // Verify indexes after changes
      const updatedIndexes = await portfoliosCollection.indexes();
      console.log('Updated indexes:', updatedIndexes);
      
      console.log(colors.green.bold('Database fix completed successfully'));
    } catch (error) {
      console.error(colors.red('Error fixing database:'), error);
    } finally {
      // Close the connection
      await mongoose.connection.close();
      console.log(colors.yellow('MongoDB connection closed'));
      process.exit(0);
    }
  })
  .catch(err => {
    console.error(colors.red('Error connecting to MongoDB:'), err);
    process.exit(1);
  });
