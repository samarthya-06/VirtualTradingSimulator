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

// Define the Module schema
const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    category: {
      type: String,
      enum: ['basics', 'technical-analysis', 'fundamental-analysis', 'strategies', 'risk-management', 'advanced'],
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    thumbnail: {
      type: String,
      default: '/assets/images/module-default.jpg',
    },
    totalLessons: {
      type: Number,
      default: 0,
    },
    totalDuration: {
      type: Number, // in minutes
      default: 0,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create the Module model
const Module = mongoose.model('Module', moduleSchema);

// Sample learning modules data
const sampleModules = [
  {
    title: 'Introduction to Stock Trading',
    description: 'Learn the basics of stock trading, market terminology, and how stock exchanges work. This module covers the fundamentals every beginner needs to know.',
    category: 'basics',
    order: 1,
    thumbnail: '/assets/images/module-default.jpg',
    totalLessons: 5,
    totalDuration: 60,
    difficulty: 'beginner',
    isPublished: true
  },
  {
    title: 'Technical Analysis Fundamentals',
    description: 'Master chart patterns, technical indicators, and price action analysis. Learn how to read candlestick patterns and identify market trends.',
    category: 'technical-analysis',
    order: 2,
    thumbnail: '/assets/images/module-default.jpg',
    totalLessons: 7,
    totalDuration: 90,
    difficulty: 'intermediate',
    isPublished: true
  },
  {
    title: 'Fundamental Analysis',
    description: 'Learn how to analyze company financials, valuations, and business models to make informed investment decisions based on intrinsic value.',
    category: 'fundamental-analysis',
    order: 3,
    thumbnail: '/assets/images/module-default.jpg',
    totalLessons: 6,
    totalDuration: 75,
    difficulty: 'intermediate',
    isPublished: true
  },
  {
    title: 'Risk Management Strategies',
    description: 'Discover essential risk management techniques to protect your capital, including position sizing, stop-loss strategies, and portfolio diversification.',
    category: 'risk-management',
    order: 4,
    thumbnail: '/assets/images/module-default.jpg',
    totalLessons: 4,
    totalDuration: 50,
    difficulty: 'beginner',
    isPublished: true
  },
  {
    title: 'Advanced Trading Strategies',
    description: 'Explore sophisticated trading strategies including swing trading, momentum trading, and mean reversion techniques for experienced traders.',
    category: 'advanced',
    order: 5,
    thumbnail: '/assets/images/module-default.jpg',
    totalLessons: 8,
    totalDuration: 120,
    difficulty: 'advanced',
    isPublished: true
  }
];

// Function to seed the database with sample modules
async function seedModules() {
  try {
    // Delete existing modules
    await Module.deleteMany({});
    console.log('Deleted existing modules');

    // Insert sample modules
    const createdModules = await Module.insertMany(sampleModules);
    console.log(`Created ${createdModules.length} sample modules:`);
    createdModules.forEach(module => {
      console.log(`- ${module.title} (${module.category}, ${module.difficulty})`);
    });

    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error seeding modules:', error);
    mongoose.disconnect();
  }
}

// Run the seed function
seedModules();