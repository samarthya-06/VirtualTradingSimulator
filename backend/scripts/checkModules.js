import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define a simple schema for Module (just for querying)
const moduleSchema = new mongoose.Schema({}, { strict: false });

// Create the Module model
const Module = mongoose.model('Module', moduleSchema);

// Function to check modules in the database
async function checkModules() {
  try {
    // Find all modules
    const modules = await Module.find();
    
    console.log(`Found ${modules.length} modules in the database:`);
    
    if (modules.length > 0) {
      modules.forEach(module => {
        console.log(`- ${module.title} (${module._id})`);
        console.log(`  Category: ${module.category}, Difficulty: ${module.difficulty}`);
        console.log(`  Published: ${module.isPublished}`);
        console.log('-----------------------------------');
      });
    } else {
      console.log('No modules found in the database.');
    }

    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error checking modules:', error);
    mongoose.disconnect();
  }
}

// Run the check function
checkModules();