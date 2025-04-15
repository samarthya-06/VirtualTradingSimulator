import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Validate JWT_SECRET
            if (!process.env.JWT_SECRET) {
                console.error('JWT_SECRET is not configured in environment variables');
                res.status(500);
                throw new Error('Server configuration error');
            }

            // Use JWT_SECRET directly without trimming
            const jwtSecret = process.env.JWT_SECRET;
            
            // Log for debugging
            console.log(`JWT Secret in middleware: length=${jwtSecret.length}, prefix=${jwtSecret.substring(0, 5)}...`);
            
            // Also log token details for debugging
            try {
                const decodedForDebug = jwt.decode(token);
                if (!decodedForDebug || !decodedForDebug.id) {
                    console.error('Token has invalid format or missing id');
                    res.status(401);
                    throw new Error('Invalid token format');
                }
                console.log(`Token debug - User ID: ${decodedForDebug?.id}, Expiry: ${decodedForDebug?.exp ? new Date(decodedForDebug.exp * 1000).toISOString() : 'unknown'}`);
            } catch (debugError) {
                console.error('Error decoding token for debug:', debugError.message);
            }
            
            // Verify token with explicit algorithm and options
            const decoded = jwt.verify(token, jwtSecret, {
                algorithms: ['HS256'],
                ignoreExpiration: false
            });

            // Make sure the decoded ID is valid
            if (!decoded || !decoded.id) {
                console.error('Verified token missing user ID');
                res.status(401);
                throw new Error('Invalid token payload');
            }

            // Validate the ObjectId format
            if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
                console.error(`Invalid user ID format in token: ${decoded.id}`);
                res.status(401);
                throw new Error('Invalid user ID format in token');
            }

            // Log successful verification
            console.log(`Token verified successfully for user: ${decoded.id}`);

            // Get user from token
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                console.error(`User not found for ID: ${decoded.id}`);
                res.status(401);
                throw new Error('User not found or deactivated');
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Authentication error:', error);
            
            if (error.name === 'JsonWebTokenError') {
                res.status(401);
                throw new Error('Invalid token: ' + error.message);
            } else if (error.name === 'TokenExpiredError') {
                res.status(401);
                throw new Error('Token has expired');
            } else {
                res.status(401);
                throw new Error(error.message || 'Authentication failed');
            }
        }
    } else {
        res.status(401);
        throw new Error('Authorization token is required');
    }
});

// Optional auth middleware that will set req.user if token exists
// but won't fail if no token is provided
const optionalAuth = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            if (!process.env.JWT_SECRET) {
                console.warn('JWT_SECRET not configured, skipping authentication');
                return next();
            }
            
            const jwtSecret = process.env.JWT_SECRET;
            
            const decoded = jwt.verify(token, jwtSecret, {
                algorithms: ['HS256'],
                ignoreExpiration: false
            });
            
            const user = await User.findById(decoded.id).select('-password');
            
            if (user) {
                req.user = user;
            }
            
            next();
        } catch (error) {
            // Don't throw error for optional auth, just log and continue
            console.warn('Optional auth failed:', error.message);
            next();
        }
    } else {
        // No token provided, but that's okay for optional auth
        next();
    }
});

const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as admin');
    }
};

export { protect, optionalAuth, admin };