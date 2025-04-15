import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'http://localhost:5002/api';
const WS_URL = process.env.REACT_APP_WS_URL ? process.env.REACT_APP_WS_URL : 'http://localhost:5002';

const axiosInstance = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  timeout: 10000,
  retries: 3,
  retryDelay: 1000
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = JSON.parse(localStorage.getItem('user'))?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for retry logic
axiosInstance.interceptors.response.use(null, async (error) => {
  const { config } = error;
  if (!config || !config.retries) return Promise.reject(error);
  
  config.retryCount = config.retryCount || 0;
  if (config.retryCount >= config.retries) {
    return Promise.reject(error);
  }
  
  config.retryCount += 1;
  const delayTime = config.retryDelay * Math.pow(2, config.retryCount - 1);
  await new Promise(resolve => setTimeout(resolve, delayTime));
  return axiosInstance(config);
});

class StockService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.setupWebSocket();
  }

  setupWebSocket() {
    try {
      if (this.ws) {
        this.ws.disconnect();
      }

      const token = JSON.parse(localStorage.getItem('user'))?.token;
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      this.ws = io(WS_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
        autoConnect: true,
        forceNew: true,
        path: '/socket.io',
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 30000,
        rejectUnauthorized: false,
        reconnectionDelayMax: 5000,
        pingTimeout: 30000,
        pingInterval: 25000,
        auth: {
          token: `Bearer ${token}`
        }
      });

      this.ws.connect();

      this.ws.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.ws.emit('get_initial_data');
        if (this.subscribers.size > 0) {
          const symbols = Array.from(this.subscribers.keys());
          this.subscribeToStocks(symbols);
        }
      });

      this.ws.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.handleReconnect();
      });

      this.ws.on('initial_market_data', (data) => {
        this.handleInitialData(data);
      });

      this.ws.on('stock_update', (updates) => {
        if (Array.isArray(updates)) {
          updates.forEach(data => {
            const callbacks = this.subscribers.get(data.symbol);
            if (callbacks) {
              callbacks.forEach(callback => callback(data));
            }
          });
        } else if (updates && updates.symbol) {
          const callbacks = this.subscribers.get(updates.symbol);
          if (callbacks) {
            callbacks.forEach(callback => callback(updates));
          }
        }
      });

      this.ws.on('indices_update', (data) => {
        this.handleIndicesUpdate(data);
      });

      this.ws.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        if (reason === 'io server disconnect') {
          this.handleReconnect();
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleReconnect();
      });
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      this.handleReconnect();
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      setTimeout(() => this.setupWebSocket(), delay);
    }
  }

  handleInitialData(data) {
    const { indices, nseStocks, bseStocks } = data;
    // Notify subscribers about initial market data
    this.notifySubscribers('MARKET_DATA', { indices, nseStocks, bseStocks });
  }

  handleIndicesUpdate(indices) {
    // Notify subscribers about indices updates
    this.notifySubscribers('INDICES', indices);
  }

  notifySubscribers(type, data) {
    const callbacks = this.subscribers.get(type);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  subscribeToStocks(symbols) {
    if (this.ws?.connected) {
      this.ws.emit('subscribe', symbols);
    } else {
      console.warn('Socket not connected, attempting to reconnect...');
      this.setupWebSocket();
    }
  }

  subscribeToStock(symbol, callback) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
      this.subscribeToStocks([symbol]);
    }
    this.subscribers.get(symbol).add(callback);
  }

  unsubscribeFromStock(symbol, callback) {
    const callbacks = this.subscribers.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(symbol);
        if (this.ws?.connected) {
          this.ws.emit('unsubscribe', [symbol]);
        }
      }
    }
  }

  subscribeToMarketData(callback) {
    if (!this.subscribers.has('MARKET_DATA')) {
      this.subscribers.set('MARKET_DATA', new Set());
    }
    this.subscribers.get('MARKET_DATA').add(callback);
  }

  subscribeToIndices(callback) {
    if (!this.subscribers.has('INDICES')) {
      this.subscribers.set('INDICES', new Set());
    }
    this.subscribers.get('INDICES').add(callback);
  }

  async searchStocks(query) {
    try {
      const response = await axiosInstance.get(`${API_URL}/market/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching stocks:', error);
      throw new Error('Failed to search stocks');
    }
  }

  async getStockQuote(symbol, exchange = 'NSE') {
    try {
      const response = await axiosInstance.get(`${API_URL}/market/quote/${symbol}?exchange=${exchange}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      throw new Error('Failed to fetch stock quote');
    }
  }

  async getStockHistory(symbol, exchange = 'NSE', interval = '1d', range = '1y') {
    try {
      const response = await axiosInstance.get(
        `${API_URL}/market/history/${symbol}?exchange=${exchange}&interval=${interval}&range=${range}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching history for ${symbol}:`, error);
      throw new Error('Failed to fetch stock history');
    }
  }

  async getBSEStocks() {
    try {
      const response = await axiosInstance.get(`${API_URL}/market/bse`);
      return response.data;
    } catch (error) {
      console.error('Error fetching BSE stocks:', error);
      throw new Error('Failed to fetch BSE stocks');
    }
  }

  async getNSEStocks() {
    try {
      const response = await axiosInstance.get(`${API_URL}/market/nse`);
      return response.data;
    } catch (error) {
      console.error('Error fetching NSE stocks:', error);
      throw new Error('Failed to fetch NSE stocks');
    }
  }

  async getMarketIndices() {
    try {
      const response = await axiosInstance.get(`${API_URL}/market/indices`);
      return response.data;
    } catch (error) {
      console.error('Error fetching market indices:', error);
      throw new Error('Failed to fetch market indices');
    }
  }
}

export default new StockService();