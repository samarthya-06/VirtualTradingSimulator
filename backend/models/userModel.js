import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email',
            ],
        },
        password: {
            type: String,
            required: function() {
                // Password is required only if googleId is not provided
                return !this.googleId;
            },
            minlength: 6,
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true, // This allows null values and only enforces uniqueness for non-null values
        },
        googleProfile: {
            type: Object,
            default: null,
        },
        isAdmin: {
            type: Boolean,
            required: true,
            default: false,
        },
        virtualBalance: {
            type: Number,
            required: true,
            default: 5000, // Default 5,000 virtual coins for free plan
        },
        walletBalance: {
            type: Number,
            required: true,
            default: 0,
        },
        heldBalance: {
            type: Number,
            required: true,
            default: 0,
            description: 'Amount of wallet balance that is held for pending orders'
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        profile: {
            avatar: String,
            phone: String,
            address: String,
            bio: String,
        },
        watchlist: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Stock'
        }],
        transactions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transaction'
        }],
        achievements: [{
            type: String,
            badge: String,
            dateEarned: Date,
        }],
        membership: {
            type: String,
            enum: ['free', 'pro'],
            default: 'free',
        },
        membershipDetails: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Membership',
        },
        resetPasswordToken: String,
        resetPasswordExpire: Date,
        emailVerificationToken: String,
        emailVerificationExpire: Date,
    },
    {
        timestamps: true,
    }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
    // Skip password hashing if password is not modified or if using OAuth (no password)
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Add indexes for faster user lookups
userSchema.index({ isAdmin: 1 }); // For filtering admin users
userSchema.index({ 'profile.phone': 1 }); // For phone number lookups
userSchema.index({ createdAt: -1 }); // For sorting by registration date
userSchema.index({ membership: 1 }); // For filtering by membership type

export default mongoose.model('User', userSchema);