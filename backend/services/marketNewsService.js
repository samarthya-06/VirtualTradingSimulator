import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * Service for fetching market news using NewsAPI
 */
class MarketNewsService {
  constructor() {
    this.apiUrl = 'https://newsapi.org/v2';
    this.apiKey = process.env.NEWS_API_KEY || '';
    this.newsCache = {};
    this.cacheTTL = 30 * 60 * 1000; // 30 minutes

    // Log the API key status for debugging
    if (this.apiKey) {
      console.log(`MarketNewsService initialized with API key (length: ${this.apiKey.length})`);
    } else {
      console.log('MarketNewsService initialized WITHOUT API key');
    }
  }

  /**
   * Get latest Indian stock market news
   * @param {number} count - Number of news items to return
   * @returns {Promise<Array>} - News articles
   */
  async getIndianMarketNews(count = 10, forceRefresh = false) {
    try {
      // Check cache first (unless force refresh is requested)
      const cacheKey = 'indian_market_news';
      if (!forceRefresh && this.newsCache[cacheKey] &&
          this.newsCache[cacheKey].timestamp > Date.now() - this.cacheTTL) {
        console.log('Returning cached market news data');
        return this.newsCache[cacheKey].data;
      }

      // Clear cache if force refresh
      if (forceRefresh) {
        console.log('Force refreshing market news data');
        delete this.newsCache[cacheKey];
      }

      if (!this.apiKey) {
        logger.warn('NEWS_API_KEY not set, using fallback news data');
        return this.generateFallbackNews(count);
      }

      // Fetch news from NewsAPI
      const response = await axios.get(`${this.apiUrl}/everything`, {
        params: {
          q: '(indian OR india) AND (stock OR market OR nifty OR sensex OR bse OR nse)',
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: count,
          apiKey: this.apiKey,
          domains: 'economictimes.indiatimes.com,moneycontrol.com,livemint.com,financialexpress.com,business-standard.com,ndtv.com/business'
        }
      });

      if (response.data && response.data.articles && Array.isArray(response.data.articles)) {
        const news = response.data.articles.map(article => ({
          id: article.url,
          headline: article.title,
          source: article.source.name,
          summary: article.description,
          url: article.url,
          datetime: new Date(article.publishedAt).getTime(),
          image: article.urlToImage || `https://via.placeholder.com/640x360.png?text=Indian+Market+News`
        }));

        // Cache the result
        this.newsCache[cacheKey] = {
          timestamp: Date.now(),
          data: news
        };

        return news;
      }

      // Fallback to generated news if API request fails
      return this.generateFallbackNews(count);
    } catch (error) {
      logger.error('Error fetching Indian market news:', error);
      return this.generateFallbackNews(count);
    }
  }

  /**
   * Generate fallback news data for testing/development
   * @param {number} count - Number of news items to generate
   * @returns {Array} - Generated news articles
   */
  generateFallbackNews(count = 10) {
    const sources = [
      'Economic Times', 'Bloomberg', 'Business Standard',
      'Financial Express', 'Mint', 'CNBC', 'Reuters', 'Moneycontrol'
    ];

    const headlines = [
      'Sensex, Nifty hit record highs as global markets rally',
      'RBI keeps repo rate unchanged, maintains accommodative stance',
      'IT stocks lead gains as rupee weakens against dollar',
      'Banking stocks surge on positive quarterly results',
      'FIIs turn net buyers in Indian equities after three months',
      'Auto stocks rally on strong monthly sales data',
      'Pharma stocks gain on FDA approvals for Indian companies',
      'Metal stocks decline as global commodity prices fall',
      'Oil & Gas stocks rise as crude prices stabilize',
      'Small and mid-cap stocks outperform broader market',
      'SEBI introduces new regulations for mutual funds',
      'IPO market heats up with several new listings planned',
      'Investors cautious ahead of quarterly earnings season',
      'Infrastructure stocks gain on government spending plans',
      'Dividend announcements boost investor sentiment in blue-chips'
    ];

    const news = [];

    // Generate random news items
    for (let i = 0; i < Math.min(count, headlines.length); i++) {
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 3)); // Last 3 days

      news.push({
        id: `news-${i}-${Date.now()}`,
        headline: headlines[i],
        source: sources[Math.floor(Math.random() * sources.length)],
        summary: `${headlines[i]}. The Indian stock market continues to show resilience amid global economic challenges.`,
        url: `https://example.com/news/indian-market/${i}`,
        datetime: randomDate.getTime(),
        image: `https://via.placeholder.com/640x360.png?text=Indian+Market+News`
      });
    }

    return news;
  }
}

export default new MarketNewsService();
