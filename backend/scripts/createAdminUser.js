import mongoose from 'mongoose';
import dotenv from 'dotenv';
import colors from 'colors';
import User from '../models/userModel.js';
import { connectDB } from '../config/db.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const createAdminUser = async () => {
  try {
    // Check if admin user already exists
    const adminExists = await User.findOne({ email: 'admin@example.com' });

    if (adminExists) {
      console.log('Admin user already exists'.yellow.bold);
      process.exit();
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      isAdmin: true,
      isEmailVerified: true,
      walletBalance: 10000000, // 1 crore
      virtualBalance: 10000000,
      membership: 'premium'
    });

    console.log(`Admin user created: ${admin.name}`.green.inverse);
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

createAdminUser(); 