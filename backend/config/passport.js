import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userModel.js';
import { generateToken } from '../utils/generateToken.js';

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Configure Google Strategy
const configurePassport = () => {
    // Debug environment variables
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Defined' : 'Undefined');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Defined' : 'Undefined');

    // Check if Google credentials are available
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('Google OAuth credentials are missing in environment variables');
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: 'http://localhost:5002/api/users/auth/google/callback',
                scope: ['profile', 'email'],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Check if user already exists
                    let user = await User.findOne({ googleId: profile.id });

                    if (user) {
                        // User exists, return the user
                        return done(null, user);
                    }

                    // Check if user exists with the same email
                    const existingUser = await User.findOne({ email: profile.emails[0].value });

                    if (existingUser) {
                        // Link Google account to existing user
                        existingUser.googleId = profile.id;
                        existingUser.googleProfile = profile;
                        await existingUser.save();
                        return done(null, existingUser);
                    }

                    // Create new user
                    user = await User.create({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        googleId: profile.id,
                        googleProfile: profile,
                        isEmailVerified: true, // Google accounts are already verified
                    });

                    return done(null, user);
                } catch (error) {
                    return done(error, null);
                }
            }
        )
    );
};

export { configurePassport };
