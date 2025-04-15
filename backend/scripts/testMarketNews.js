import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL = 'http://localhost:5002';

const testMarketNews = async () => {
  try {
    console.log('Testing market news API with force refresh...');
    
    // First, get the news without force refresh
    console.log('\nFetching market news without force refresh:');
    const normalResponse = await axios.get(`${API_URL}/api/market/market-news?count=5`);
    console.log(`Status: ${normalResponse.status}`);
    console.log(`Number of news items: ${normalResponse.data.length}`);
    console.log('First news item:');
    console.log(normalResponse.data[0]);
    
    // Wait a bit
    console.log('\nWaiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now get the news with force refresh
    console.log('\nFetching market news WITH force refresh:');
    const refreshResponse = await axios.get(`${API_URL}/api/market/market-news?count=5&refresh=true`);
    console.log(`Status: ${refreshResponse.status}`);
    console.log(`Number of news items: ${refreshResponse.data.length}`);
    console.log('First news item:');
    console.log(refreshResponse.data[0]);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing market news API:', error.response?.data || error.message);
  }
};

testMarketNews();
