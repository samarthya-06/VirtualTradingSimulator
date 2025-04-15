// Script to fix database issues
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

      // Step 1: Delete any documents with null userId field
      const nullUserIdDocs = await portfoliosCollection.find({ userId: null }).toArray();
      if (nullUserIdDocs.length > 0) {
        console.log(colors.yellow(`Found ${nullUserIdDocs.length} documents with null userId field. Deleting...`));
        await portfoliosCollection.deleteMany({ userId: null });
        console.log(colors.green(`Deleted ${nullUserIdDocs.length} documents with null userId field`));
      } else {
        console.log(colors.blue('No documents with null userId field found'));
      }

      // Step 2: Delete any documents with null user field
      const nullUserDocs = await portfoliosCollection.find({ user: null }).toArray();
      if (nullUserDocs.length > 0) {
        console.log(colors.yellow(`Found ${nullUserDocs.length} documents with null user field. Deleting...`));
        await portfoliosCollection.deleteMany({ user: null });
        console.log(colors.green(`Deleted ${nullUserDocs.length} documents with null user field`));
      } else {
        console.log(colors.blue('No documents with null user field found'));
      }

      // Step 3: Drop the userId index if it exists
      const userIdIndex = indexes.find(index => index.name === 'userId_1');
      if (userIdIndex) {
        console.log(colors.yellow('Dropping userId_1 index...'));
        await portfoliosCollection.dropIndex('userId_1');
        console.log(colors.green('Successfully dropped userId_1 index'));
      } else {
        console.log(colors.blue('No userId_1 index found'));
      }

      // Step 4: Check if there's a unique index on user field
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

      // Step 5: Check for any documents with userId field and migrate them
      const docsWithUserId = await portfoliosCollection.find({ userId: { $exists: true } }).toArray();
      if (docsWithUserId.length > 0) {
        console.log(colors.yellow(`Found ${docsWithUserId.length} documents with userId field. Migrating...`));

        for (const doc of docsWithUserId) {
          console.log(colors.yellow(`Migrating document ${doc._id}...`));

          // If userId exists but user doesn't, copy userId to user
          if (doc.userId && !doc.user) {
            await portfoliosCollection.updateOne(
              { _id: doc._id },
              {
                $set: { user: doc.userId },
                $unset: { userId: "" }
              }
            );
          } else {
            // Otherwise just remove the userId field
            await portfoliosCollection.updateOne(
              { _id: doc._id },
              { $unset: { userId: "" } }
            );
          }
        }

        console.log(colors.green(`Successfully migrated ${docsWithUserId.length} documents`));
      } else {
        console.log(colors.blue('No documents with userId field found'));
      }

      // Step 6: Check for any scripts or models that might be recreating the index
      console.log(colors.yellow('Checking for any scripts that might be recreating the index...'));

      // Check if there's an optimizePerformance.js script that might be creating indexes
      try {
        const optimizePerformanceScript = await mongoose.connection.db.collection('system.js').findOne({ _id: 'optimizePerformance' });
        if (optimizePerformanceScript) {
          console.log(colors.yellow('Found optimizePerformance script. This might be recreating the index.'));
        }
      } catch (error) {
        console.log(colors.blue('No optimizePerformance script found.'));
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
