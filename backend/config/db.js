import mongoose from 'mongoose';
import { logInfo, logError } from '../utils/logger.js';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);

        logInfo(`MongoDB Connected: ${conn.connection.host}`);

        // Wait until the connection is fully established
        if (mongoose.connection.readyState !== 1) {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('MongoDB connection timeout')), 15000);
                mongoose.connection.once('connected', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                mongoose.connection.once('error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
        }

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logError('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logInfo('MongoDB disconnected');
        });

        // Handle process termination
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                logInfo('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                logError('Error closing MongoDB connection:', err);
                process.exit(1);
            }
        });

    } catch (error) {
        logError('Error connecting to MongoDB:', error);
        throw error; // Allow server.js to handle this error
    }
};

export { connectDB };