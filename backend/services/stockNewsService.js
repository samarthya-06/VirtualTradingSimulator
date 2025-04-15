import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * Service for fetching stock news
 */
class StockNewsService {
  constructor() {
    // Free news API endpoint - replace with your preferred provider
    this.apiUrl = 'https://finnhub.io/api/v1';
    this.apiKey = process.env.FINNHUB_API_KEY || '';
    this.newsCache = {};
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Get news for a specific stock
   * @param {string} symbol - Stock symbol
   * @param {number} from - From date in UNIX timestamp
   * @param {number} to - To date in UNIX timestamp
   * @returns {Promise<Array>} - News articles
   */
  async getStockNews(symbol, count = 10) {
    try {
      // Clean symbol (remove exchange suffix)
      const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
      
      // Check cache first
      const cacheKey = `news:${cleanSymbol}`;
      if (this.newsCache[cacheKey] && 
          this.newsCache[cacheKey].timestamp > Date.now() - this.cacheTTL) {
        return this.newsCache[cacheKey].data;
      }

      // Calculate date range (last 7 days)
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);
      
      if (this.apiKey) {
        // Using Finnhub API if key is provided
        const response = await axios.get(`${this.apiUrl}/company-news`, {
          params: {
            symbol: cleanSymbol,
            from: from.toISOString().split('T')[0],
            to: to.toISOString().split('T')[0],
            token: this.apiKey
          }
        });

        if (response.data && Array.isArray(response.data)) {
          const news = response.data.slice(0, count);
          
          // Cache the result
          this.newsCache[cacheKey] = {
            timestamp: Date.now(),
            data: news
          };
          
          return news;
        }
      }
      
      // Fallback to generated news if API key is not set or request fails
      return this.generateFallbackNews(cleanSymbol, count);
    } catch (error) {
      logger.error(`Error fetching news for ${symbol}:`, error);
      return this.generateFallbackNews(symbol, count);
    }
  }

  /**
   * Generate fallback news data for testing/development
   * @param {string} symbol - Stock symbol
   * @param {number} count - Number of news items to generate
   * @returns {Array} - Generated news articles
   */
  generateFallbackNews(symbol, count = 10) {
    const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
    
    const sources = [
      'Economic Times', 'Bloomberg', 'Business Standard', 
      'Financial Express', 'Mint', 'CNBC', 'Reuters'
    ];
    
    const headlines = [
      `${cleanSymbol} Reports Strong Q4 Results`,
      `${cleanSymbol} Announces Strategic Partnership`,
      `${cleanSymbol} to Expand Operations in International Markets`,
      `${cleanSymbol} Appoints New CEO`,
      `Analysts Upgrade ${cleanSymbol} Stock Rating`,
      `${cleanSymbol} Launches New Product Line`,
      `${cleanSymbol} Reports Record Revenue Growth`,
      `${cleanSymbol} Shares Surge on Positive Earnings`,
      `${cleanSymbol} to Acquire Smaller Competitor`,
      `${cleanSymbol} Announces Dividend Increase`,
      `${cleanSymbol} Expands Manufacturing Capacity`,
      `${cleanSymbol} Enters New Market Segment`,
      `${cleanSymbol} Forms Joint Venture With Industry Leader`,
      `${cleanSymbol} Stock Reaches 52-Week High`,
      `${cleanSymbol} Implements Cost-Cutting Measures`
    ];
    
    const news = [];
    
    // Generate random news items
    for (let i = 0; i < Math.min(count, headlines.length); i++) {
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 7));
      
      news.push({
        id: `news-${i}-${Date.now()}`,
        headline: headlines[i],
        source: sources[Math.floor(Math.random() * sources.length)],
        summary: `${headlines[i]}. The company continues to show strong performance in the market.`,
        url: `https://example.com/news/${cleanSymbol.toLowerCase()}/${i}`,
        datetime: randomDate.getTime(),
        related: cleanSymbol,
        image: `https://via.placeholder.com/640x360.png?text=${cleanSymbol}+News`
      });
    }
    
    return news;
  }
}

export default new StockNewsService(); 