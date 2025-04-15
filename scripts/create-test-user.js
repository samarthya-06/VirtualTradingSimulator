// Script to create a test user with a specific _id in MongoDB
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../backend/models/userModel.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const userId = new mongoose.Types.ObjectId('67fd5328fd7a806bbf3491cb');
    const email = 'testuser@example.com';
    const password = 'Test@1234';

    // Check if user already exists
    let user = await User.findById(userId);
    if (user) {
      console.log('User already exists:', user.email);
    } else {
      user = await User.create({
        _id: userId,
        name: 'Test User',
        email,
        password,
        isAdmin: false,
        isEmailVerified: true,
        virtualBalance: 5000,
        walletBalance: 0,
        heldBalance: 0,
        membership: 'free',
        profile: {
          avatar: '',
          phone: '',
          address: '',
          bio: 'Test user for development.'
        }
      });
      console.log('User created:', user.email);
    }
  } catch (err) {
    console.error('Error creating user:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

run();
