import express from 'express';
import passport from 'passport';
import {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    googleAuthCallback,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { userValidationRules, validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public routes
router.post('/', userValidationRules.register, validate, registerUser);
router.post('/login', userValidationRules.login, validate, loginUser);

// Google OAuth routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    googleAuthCallback
);

// Protected routes
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, userValidationRules.updateProfile, validate, updateUserProfile);

export default router;