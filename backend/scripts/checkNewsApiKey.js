import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Checking NEWS_API_KEY:');
console.log('---------------------------');
console.log('NEWS_API_KEY:', process.env.NEWS_API_KEY ? 
  `Set (length: ${process.env.NEWS_API_KEY.length}, value: ${process.env.NEWS_API_KEY})` : 
  'Not set');
console.log('---------------------------');
