import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Create a simple Express app
const app = express();

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running without leaderboard feature' });
});

// Start the server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
