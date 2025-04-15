import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Check if JWT_SECRET is set
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined in .env file');
    process.exit(1);
}

// Ensure JWT_SECRET is properly trimmed
const jwtSecret = process.env.JWT_SECRET.trim();
console.log(`Original JWT_SECRET length: ${process.env.JWT_SECRET.length}`);
console.log(`Trimmed JWT_SECRET length: ${jwtSecret.length}`);
console.log(`First 5 chars: ${jwtSecret.substring(0, 5)}...`);

// Generate a test token
const testUserId = '123456789012';

try {
    // Generate token
    const token = jwt.sign({ id: testUserId }, jwtSecret, {
        expiresIn: '30d',
        algorithm: 'HS256'
    });
    console.log('Generated token:', token);

    // Verify token
    const decoded = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256']
    });
    console.log('Decoded token:', decoded);
    console.log('Token verification successful!');

    // Compare verification with root .env file
    try {
        // Load root .env file
        dotenv.config({ path: path.resolve(__dirname, '../../.env') });
        console.log('Loaded root .env file');
        console.log(`Root JWT_SECRET length: ${process.env.JWT_SECRET.length}`);
        
        // Try to verify with potentially different secret
        const rootSecret = process.env.JWT_SECRET.trim();
        const verifiedWithRoot = jwt.verify(token, rootSecret, {
            algorithms: ['HS256']
        });
        console.log('Verification with root .env successful:', !!verifiedWithRoot);
    } catch (rootError) {
        console.error('Error verifying with root .env:', rootError.message);
    }
} catch (error) {
    console.error('JWT Error:', error.message);
    console.error('Error details:', error);
} 