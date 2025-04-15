import jwt from 'jsonwebtoken';

// Generate JWT
export const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured in environment variables');
    }

    // Use JWT_SECRET directly without trimming
    const jwtSecret = process.env.JWT_SECRET;

    // Log for debugging
    console.log(`Generating token with JWT secret: length=${jwtSecret.length}, prefix=${jwtSecret.substring(0, 5)}...`);
    
    const token = jwt.sign({ id }, jwtSecret, {
        expiresIn: '30d',
        algorithm: 'HS256'
    });
    
    // Verify the token we just created to ensure it's valid
    try {
        const decoded = jwt.verify(token, jwtSecret, {
            algorithms: ['HS256']
        });
        console.log(`Verified token for user: ${decoded.id}, expires: ${new Date(decoded.exp * 1000).toISOString()}`);
    } catch (error) {
        console.error('Error verifying generated token:', error.message);
    }
    
    return token;
};
