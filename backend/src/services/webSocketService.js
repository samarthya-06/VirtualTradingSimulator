import { Server } from 'socket.io';
import axios from 'axios';

class WebSocketService {
  constructor() {
    this.io = null;
    this.updateInterval = null;
    this.connectedClients = new Set();
    this.stockCache = new Map();
    this.lastFetchTime = new Map();
    this.rateLimitDelay = 5000; // Increased from 2000 to 5000 (5 seconds between API calls)
    this.pendingRequests = new Map(); // Track pending requests to avoid duplicate calls
    this.globalLastFetchTime = Date.now(); // Track last API call across all symbols
    this.globalRateLimitDelay = 1000; // 1 second between any API calls
  }

  initialize(server) {
    if (this.io) {
      console.log('WebSocket server already initialized');
      return;
    }

    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'development' 
          ? ['http://localhost:3000']
          : [process.env.FRONTEND_URL],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
      },
      path: '/socket.io',
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['polling', 'websocket'],
      allowEIO3: true,
      connectTimeout: 45000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e8,
      allowUpgrades: true,
      perMessageDeflate: {
        threshold: 2048
      },
      httpCompression: {
        threshold: 2048
      },
      cookie: {
        name: 'io',
        path: '/',
        httpOnly: true,
        sameSite: 'lax'
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      this.connectedClients.add(socket.id);

      // Send initial market data on connection
      this.sendInitialMarketData(socket);

      socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, 'Reason:', reason);
        this.connectedClients.delete(socket.id);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        socket.emit('error', { message: 'Socket error occurred' });
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        socket.emit('error', { message: 'Connection error occurred' });
      });

      socket.on('subscribe', (symbols) => {
        console.log('Client subscribed to:', symbols);
        if (Array.isArray(symbols)) {
          symbols.forEach(symbol => {
            socket.join(symbol);
            this.startStockUpdates(symbol);
          });
        }
      });

      socket.on('unsubscribe', (symbols) => {
        console.log('Client unsubscribed from:', symbols);
        if (Array.isArray(symbols)) {
          symbols.forEach(symbol => socket.leave(symbol));
        }
      });
    });

    // Error handling for the io server
    this.io.engine.on('connection_error', (err) => {
      console.error('Server connection error:', err);
    });

    this.io.engine.on('initial_headers', (headers, req) => {
      headers['Access-Control-Allow-Origin'] = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : process.env.FRONTEND_URL;
    });

    // Start periodic market data updates
    this.startMarketUpdates();
  }

  async fetchStockData(symbol) {
    try {
      // Check if there's already a pending request for this symbol
      if (this.pendingRequests.has(symbol)) {
        return this.stockCache.get(symbol);
      }

      // Check symbol-specific rate limiting
      const now = Date.now();
      const lastFetch = this.lastFetchTime.get(symbol);
      if (lastFetch && now - lastFetch < this.rateLimitDelay) {
        return this.stockCache.get(symbol);
      }

      // Check global rate limiting
      const globalTimeSinceLastFetch = now - this.globalLastFetchTime;
      if (globalTimeSinceLastFetch < this.globalRateLimitDelay) {
        // If we're hitting too fast globally, wait a bit
        await new Promise(resolve => setTimeout(resolve, this.globalRateLimitDelay - globalTimeSinceLastFetch));
      }

      // Mark this request as pending
      this.pendingRequests.set(symbol, true);

      // Update global last fetch time
      this.globalLastFetchTime = Date.now();

      const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/quote`, {
        params: {
          symbols: symbol,
          region: 'IN',
          lang: 'en'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      // Clear pending status
      this.pendingRequests.delete(symbol);

      const stockData = response.data?.quoteResponse?.result?.[0];
      if (!stockData) {
        throw new Error('No data received for symbol: ' + symbol);
      }

      const processedData = {
        symbol: stockData.symbol,
        price: stockData.regularMarketPrice,
        change: stockData.regularMarketChangePercent,
        volume: stockData.regularMarketVolume,
        high: stockData.regularMarketDayHigh,
        low: stockData.regularMarketDayLow,
        open: stockData.regularMarketOpen,
        previousClose: stockData.regularMarketPreviousClose,
        timestamp: stockData.regularMarketTime * 1000
      };

      // Update cache and last fetch time
      this.stockCache.set(symbol, processedData);
      this.lastFetchTime.set(symbol, Date.now());

      return processedData;
    } catch (error) {
      // Clear pending status on error
      this.pendingRequests.delete(symbol);
      
      console.error(`Error fetching stock data for ${symbol}:`, error.message);
      return this.stockCache.get(symbol) || null;
    }
  }

  async fetchNSEData() {
    try {
      const symbols = ['NIFTY50.NS', 'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS'];
      const stocksData = await Promise.all(
        symbols.map(symbol => this.fetchStockData(symbol))
      );
      return stocksData.filter(data => data !== null);
    } catch (error) {
      console.error('Error fetching NSE data:', error);
      return [];
    }
  }

  async fetchBSEData() {
    try {
      const symbols = ['SENSEX.BO', 'TATASTEEL.BO', 'WIPRO.BO', 'ITC.BO', 'MARUTI.BO'];
      const stocksData = await Promise.all(
        symbols.map(symbol => this.fetchStockData(symbol))
      );
      return stocksData.filter(data => data !== null);
    } catch (error) {
      console.error('Error fetching BSE data:', error);
      return [];
    }
  }

  async fetchIndicesData() {
    try {
      const indices = ['^NSEI', '^BSESN', '^NSEBANK', '^CNXIT'];
      const indicesData = await Promise.all(
        indices.map(symbol => this.fetchStockData(symbol))
      );
      return indicesData.filter(data => data !== null);
    } catch (error) {
      console.error('Error fetching indices data:', error);
      return [];
    }
  }

  async sendInitialMarketData(socket) {
    try {
      const [nseData, bseData, indicesData] = await Promise.all([
        this.fetchNSEData(),
        this.fetchBSEData(),
        this.fetchIndicesData()
      ]);

      socket.emit('initial_market_data', {
        nseStocks: nseData,
        bseStocks: bseData,
        indices: indicesData
      });
    } catch (error) {
      console.error('Error sending initial market data:', error);
      socket.emit('error', { message: 'Failed to fetch market data' });
    }
  }

  async startMarketUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      try {
        // Update indices every 10 seconds (increased from 5)
        const indicesData = await this.fetchIndicesData();
        this.broadcastIndicesUpdate(indicesData);

        // Update subscribed stocks with staggered requests
        const subscribedRooms = await this.io.sockets.adapter.rooms;
        const stockSymbols = [];
        
        for (const [room] of subscribedRooms) {
          if (room.includes('.NS') || room.includes('.BO')) {
            stockSymbols.push(room);
          }
        }
        
        // Process symbols in batches to avoid overwhelming the API
        const batchSize = 3;
        for (let i = 0; i < stockSymbols.length; i += batchSize) {
          const batch = stockSymbols.slice(i, i + batchSize);
          
          // Process each batch sequentially
          for (const symbol of batch) {
            const stockData = await this.fetchStockData(symbol);
            if (stockData) {
              this.broadcastStockUpdate(symbol, stockData);
            }
            
            // Add a small delay between each symbol in the batch
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // Add a delay between batches
          if (i + batchSize < stockSymbols.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        console.error('Error updating market data:', error);
      }
    }, 10000); // Increased from 5000 to 10000 (10 seconds)
  }

  async startStockUpdates(symbol) {
    try {
      const stockData = await this.fetchStockData(symbol);
      if (stockData) {
        this.broadcastStockUpdate(symbol, stockData);
      }
    } catch (error) {
      console.error(`Error updating stock ${symbol}:`, error);
    }
  }

  getConnectedClients() {
    return this.connectedClients.size;
  }

  broadcastStockUpdate(symbol, data) {
    if (this.io) {
      this.io.to(symbol).emit('stock_update', { symbol, ...data });
    }
  }

  broadcastIndicesUpdate(data) {
    if (this.io) {
      this.io.emit('indices_update', data);
    }
  }
}

export default new WebSocketService();