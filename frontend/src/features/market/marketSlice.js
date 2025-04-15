import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';
const API_ENDPOINT = `${API_URL}/api`;
let socket;

// Helper function to get auth config
const getAuthConfig = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !user.token) {
    window.location.href = '/login';
    throw new Error('Authentication required. Please log in.');
  }
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`
    },
    withCredentials: true
  };
};

// Async thunks
export const searchStocks = createAsyncThunk(
  'market/searchStocks',
  async (query, thunkAPI) => {
    try {
      const config = getAuthConfig();
      const response = await axios.get(`${API_ENDPOINT}/market/search`, {
        ...config,
        params: { query }
      });

      if (!response.data) {
        throw new Error('No data received from server');
      }

      return response.data;
    } catch (error) {
      console.error('Search error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.error ||
        error.message ||
        'Failed to search stocks'
      );
    }
  }
);

export const fetchStockHistory = createAsyncThunk(
  'market/fetchStockHistory',
  async ({ symbol, range = '1mo', interval = '1d' }, thunkAPI) => {
    try {
      const config = getAuthConfig();

      // Add retry logic for stock history
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;

      while (attempts < maxAttempts) {
        try {
          // Increment attempt counter
          attempts++;

          const response = await axios.get(`${API_ENDPOINT}/market/history/${symbol}`, {
            ...config,
            params: { range, interval },
            timeout: 15000 // 15 second timeout
          });

          if (!response.data) {
            throw new Error('No data received from server');
          }

          // Validate the data structure and content
          if (!response.data.history || !Array.isArray(response.data.history)) {
            throw new Error('Invalid history data format');
          }

          // Additional data validation
          if (response.data.history.length === 0) {
            console.warn(`No history data points available for ${symbol} with range ${range}`);

            // For 5Y range, generate synthetic data instead of failing
            if (range === '5y') {
              // Create synthetic data for 5Y view
              const syntheticData = generateSyntheticHistoryData(symbol, range, interval);
              return {
                symbol,
                data: {
                  history: syntheticData,
                  synthetic: true
                }
              };
            }

            throw new Error('No history data points available');
          }

          // Add timestamps to each data point if needed
          const processedHistory = response.data.history.map(point => {
            if (!point.timestamp && point.date) {
              return {
                ...point,
                timestamp: new Date(point.date).getTime()
              };
            }
            return point;
          });

          // Sort by date to ensure chronological order
          processedHistory.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date();
            const dateB = b.date ? new Date(b.date) : new Date();
            return dateA - dateB;
          });

          return {
            symbol,
            data: {
              ...response.data,
              history: processedHistory
            }
          };
        } catch (error) {
          lastError = error;

          if (attempts >= maxAttempts) {
            throw error; // Give up after max attempts
          }

          // Wait before retry (exponential backoff)
          const delayTime = 1000 * attempts;
          await new Promise(resolve => setTimeout(resolve, delayTime));
        }
      }

      throw lastError || new Error('Failed to fetch stock history after retries');
    } catch (error) {
      console.error('Stock history error:', error);
      return thunkAPI.rejectWithValue({
        error: error.response?.data?.error || error.message || 'Failed to fetch stock history',
        symbol // Include symbol in rejection so we know which stock failed
      });
    }
  }
);

export const fetchMarketIndices = createAsyncThunk(
  'market/fetchIndices',
  async (_, thunkAPI) => {
    try {
      const config = getAuthConfig();
      const response = await axios.get(`${API_ENDPOINT}/market/indices`, config);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || 'Failed to fetch market indices');
    }
  }
);

export const fetchNSEStocks = createAsyncThunk(
  'market/fetchNSEStocks',
  async (_, thunkAPI) => {
    try {
      const config = getAuthConfig();
      const response = await axios.get(`${API_ENDPOINT}/market/nse`, config);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || 'Failed to fetch NSE stocks');
    }
  }
);

export const fetchBSEStocks = createAsyncThunk(
  'market/fetchBSEStocks',
  async (_, thunkAPI) => {
    try {
      const config = getAuthConfig();
      const response = await axios.get(`${API_ENDPOINT}/market/bse`, config);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || 'Failed to fetch BSE stocks');
    }
  }
);

// Helper function to generate synthetic history data when API fails
const generateSyntheticHistoryData = (symbol, range, interval) => {
  console.log(`Generating synthetic data for ${symbol} with range ${range} and interval ${interval}`);

  const now = new Date();
  const data = [];
  let numPoints = 0;
  let startPrice = 1000; // Default starting price

  // Determine number of points and time increment based on range and interval
  if (range === '1d') {
    numPoints = 78; // 6.5 hours of trading in 5-minute intervals
    startPrice = 1000;
  } else if (range === '5d') {
    numPoints = 39; // 5 days with hourly data
    startPrice = 950;
  } else if (range === '1mo') {
    numPoints = 22; // ~22 trading days in a month
    startPrice = 900;
  } else if (range === '3mo') {
    numPoints = 66; // ~66 trading days in 3 months
    startPrice = 850;
  } else if (range === '6mo') {
    numPoints = 126; // ~126 trading days in 6 months
    startPrice = 800;
  } else if (range === '1y') {
    numPoints = 252; // ~252 trading days in a year
    startPrice = 700;
  } else if (range === '5y') {
    numPoints = 60; // Monthly data for 5 years
    startPrice = 500;
  }

  // Generate data points with a reasonable trend
  let currentPrice = startPrice;
  for (let i = 0; i < numPoints; i++) {
    const date = new Date(now);

    // Adjust date based on range and position
    if (range === '1d') {
      // For 1d, start at 9:30 AM and add 5 minutes per point
      date.setHours(9, 30, 0, 0);
      date.setMinutes(date.getMinutes() + (i * 5));
    } else if (range === '5d') {
      // For 5d, go back 5 days and add hours
      date.setDate(date.getDate() - 5);
      date.setHours(9, 30, 0, 0);
      date.setHours(date.getHours() + i);
    } else if (range === '1mo') {
      // For 1mo, go back 1 month and add trading days
      date.setMonth(date.getMonth() - 1);
      date.setDate(date.getDate() + i);
    } else if (range === '3mo') {
      // For 3mo, go back 3 months and add trading days
      date.setMonth(date.getMonth() - 3);
      date.setDate(date.getDate() + i);
    } else if (range === '6mo') {
      // For 6mo, go back 6 months and add trading days
      date.setMonth(date.getMonth() - 6);
      date.setDate(date.getDate() + i);
    } else if (range === '1y') {
      // For 1y, go back 1 year and add trading days
      date.setFullYear(date.getFullYear() - 1);
      date.setDate(date.getDate() + i);
    } else if (range === '5y') {
      // For 5y, go back 5 years and add months
      date.setFullYear(date.getFullYear() - 5);
      date.setMonth(date.getMonth() + i);
    }

    // Add some randomness to price movement with a slight upward bias
    const changePercent = (Math.random() - 0.45) * 2; // Slightly biased toward positive
    currentPrice = currentPrice * (1 + (changePercent / 100));

    // Add some mean reversion for more realistic price movement
    if (currentPrice > startPrice * 2) {
      currentPrice = currentPrice * 0.99; // Pull back if too high
    } else if (currentPrice < startPrice * 0.5) {
      currentPrice = currentPrice * 1.01; // Pull up if too low
    }

    // Ensure we end near a reasonable current price
    if (i > numPoints - 5) {
      // For the last few points, converge toward a target price
      const targetPrice = startPrice * 1.2; // 20% gain over period
      currentPrice = currentPrice * 0.8 + targetPrice * 0.2;
    }

    // Generate OHLC data with some variation
    const open = currentPrice * (1 + (Math.random() - 0.5) / 100);
    const close = currentPrice;
    const high = Math.max(open, close) * (1 + Math.random() / 100);
    const low = Math.min(open, close) * (1 - Math.random() / 100);
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      open,
      high,
      low,
      close,
      adjclose: close,
      volume
    });
  }

  return data;
};

export const fetchStockInfo = createAsyncThunk(
  'market/fetchStockInfo',
  async (symbol, thunkAPI) => {
    try {
      const config = getAuthConfig();
      const response = await axios.get(`${API_ENDPOINT}/market/info/${symbol}`, config);

      if (!response.data) {
        throw new Error('No company data received from server');
      }

      return {
        symbol,
        data: response.data
      };
    } catch (error) {
      console.error('Stock info error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch company information'
      );
    }
  }
);

// Initialize WebSocket connection for real-time updates
export const initializeWebSocket = () => async (dispatch, getState) => {
  if (socket) {
    // Already connected
    return;
  }

  try {
    socket = io(API_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    socket.on('connect', () => {
      console.log('WebSocket connected successfully');
      dispatch(setSocketConnected(true));

      // Auth with socket
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user.token) {
        socket.emit('authenticate', { token: user.token });
      }

      // Get state of currently subscribed stocks
      const { subscribedStocks } = getState().market;

      // Resubscribe to all previously subscribed stocks
      if (subscribedStocks.length > 0) {
        console.log('Resubscribing to stocks:', subscribedStocks);
        socket.emit('subscribeStocks', { symbols: subscribedStocks });
      }

      // Request initial market data
      socket.emit('getInitialData');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      dispatch(setSocketConnected(false));
    });

    socket.on('stockUpdate', (data) => {
      if (data && data.symbol) {
        console.log(`Received stock update for ${data.symbol}:`, data);
        dispatch(updateStockPrice(data));
      }
    });

    socket.on('marketIndices', (data) => {
      if (Array.isArray(data)) {
        dispatch(updateIndices(data));
      }
    });

    socket.on('initialData', (data) => {
      if (data) {
        console.log('Received initial market data:', data);
        dispatch(setInitialMarketData(data));
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

  } catch (error) {
    console.error('Failed to initialize WebSocket', error);
  }
};

// Subscribe to real-time updates for stocks
export const subscribeToStocks = (symbols) => (dispatch, getState) => {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return;
  }

  // Normalize symbols - remove .NS or .BO suffixes
  const normalizedSymbols = symbols.map(symbol =>
    symbol.replace('.NS', '').replace('.BO', '')
  );

  if (!socket || !socket.connected) {
    console.log('Socket not connected, initializing...');
    dispatch(initializeWebSocket());

    // Also add to pending subscriptions
    normalizedSymbols.forEach(symbol => {
      dispatch({
        type: 'market/addSubscribedStock',
        payload: symbol
      });
    });
    return;
  }

  try {
    // Add to subscribed stocks in state
    normalizedSymbols.forEach(symbol => {
      if (!getState().market.subscribedStocks.includes(symbol)) {
        dispatch({
          type: 'market/addSubscribedStock',
          payload: symbol
        });
      }
    });

    // Subscribe via WebSocket
    socket.emit('subscribeStocks', { symbols: normalizedSymbols });

    // Also fetch current price data for immediate update
    normalizedSymbols.forEach(symbol => {
      dispatch(fetchCurrentPrice(symbol));
    });
  } catch (error) {
    console.error('Failed to subscribe to stocks:', error);
  }
};

// Fetch market news with optional refresh parameter
export const fetchMarketNews = createAsyncThunk(
  'market/fetchMarketNews',
  async ({ count = 10, refresh = false } = {}, thunkAPI) => {
    try {
      const config = getAuthConfig();
      const response = await axios.get(`${API_ENDPOINT}/market/market-news`, {
        ...config,
        params: { count, refresh: refresh.toString() }
      });

      if (!response.data) {
        throw new Error('No news data received from server');
      }

      // Add a small delay to ensure UI shows loading state
      await new Promise(resolve => setTimeout(resolve, 300));

      // Process the news data to ensure all required fields are present
      const processedNews = response.data.map(news => ({
        ...news,
        id: news.id || news.url || `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        headline: news.headline || 'Latest Market Update',
        source: news.source || 'Financial News',
        summary: news.summary || 'Latest updates from the Indian stock market.',
        datetime: news.datetime || Date.now(),
        url: news.url || 'https://economictimes.indiatimes.com/markets',
        image: news.image || `https://via.placeholder.com/640x360.png?text=Market+News`
      }));

      return processedNews;
    } catch (error) {
      console.error('Failed to fetch market news:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch market news'
      );
    }
  }
);

export const fetchCurrentPrice = createAsyncThunk(
  'market/fetchCurrentPrice',
  async (symbol, thunkAPI) => {
    try {
      if (!symbol) {
        throw new Error('Symbol is required');
      }

      const config = getAuthConfig();
      const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');

      const response = await axios.get(`${API_ENDPOINT}/market/quote/${cleanSymbol}`, config);

      if (!response.data) {
        throw new Error('No data received for stock price');
      }

      return {
        symbol: cleanSymbol,
        data: response.data
      };
    } catch (error) {
      console.error(`Failed to fetch current price for ${symbol}:`, error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.error ||
        error.message ||
        `Failed to fetch current price for ${symbol}`
      );
    }
  }
);

// Unsubscribe from real-time updates
export const unsubscribeFromStocks = (symbols) => (dispatch, getState) => {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return;
  }

  try {
    // Normalize symbols
    const normalizedSymbols = symbols.map(symbol =>
      symbol.replace('.NS', '').replace('.BO', '')
    );

    // Remove from state
    normalizedSymbols.forEach(symbol => {
      dispatch({
        type: 'market/removeSubscribedStock',
        payload: symbol
      });
    });

    // Only attempt to unsubscribe if socket is connected
    if (socket && socket.connected) {
      socket.emit('unsubscribeStocks', { symbols: normalizedSymbols });
    }
  } catch (error) {
    console.error('Failed to unsubscribe from stocks:', error);
  }
};

const initialState = {
  indices: [],
  nseStocks: [],
  bseStocks: [],
  stockHistory: {},
  stockInfo: {},
  stockPrices: {}, // For storing real-time price data
  searchResults: [],
  subscribedStocks: [], // Track subscribed stocks
  pendingSubscriptions: [],
  marketNews: [],
  isLoading: false,
  isLoadingNews: false,
  error: null,
  socketConnected: false,
  lastUpdated: null
};

const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    updateStockPrice: (state, action) => {
      const { symbol, price, change, changePercent, dayHigh, dayLow, volume, previousClose, timestamp } = action.payload;

      // Update in stockPrices object
      state.stockPrices[symbol] = {
        ...state.stockPrices[symbol],
        price,
        change,
        changePercent,
        dayHigh,
        dayLow,
        volume,
        previousClose,
        lastUpdated: timestamp || new Date().toISOString()
      };

      // Also update in NSE and BSE stock lists if present
      const updateStock = (stockList) => {
        const index = stockList.findIndex((stock) => stock.symbol === symbol);
        if (index !== -1) {
          // Only update if the price or data has actually changed to prevent unnecessary renders
          const existingStock = stockList[index];
          const priceChanged = existingStock.price !== price;
          const changeChanged = existingStock.change !== change;

          if (priceChanged || changeChanged) {
            stockList[index] = {
              ...stockList[index],
              price,
              change,
              changePercent: changePercent,
              dayHigh,
              dayLow,
              volume,
              previousClose,
              lastUpdated: timestamp || new Date().toISOString()
            };
            return true; // Data was updated
          }
        }
        return false; // No update needed
      };

      // Only update lastUpdated if actual data changes occurred
      const nseUpdated = updateStock(state.nseStocks);
      const bseUpdated = updateStock(state.bseStocks);

      // Only update the last updated timestamp if something actually changed
      if (nseUpdated || bseUpdated) {
        state.lastUpdated = new Date().toISOString();
      }
    },
    updateIndices: (state, action) => {
      if (!Array.isArray(action.payload) || action.payload.length === 0) {
        return;
      }

      // Check if indices actually changed to avoid unnecessary updates
      let hasUpdates = false;

      const updatedIndices = action.payload.map(newIndex => {
        const existingIndex = state.indices.find(index => index.symbol === newIndex.symbol);

        // Check if price has changed
        if (!existingIndex || existingIndex.price !== newIndex.price) {
          hasUpdates = true;
          return {
            ...newIndex,
            lastUpdated: new Date().toISOString()
          };
        }

        // No change, return existing data
        return existingIndex;
      });

      if (hasUpdates) {
        state.indices = updatedIndices;
        state.lastUpdated = new Date().toISOString();
      }
    },
    setSocketConnected: (state, action) => {
      state.socketConnected = action.payload;
    },
    setInitialMarketData: (state, action) => {
      const { indices, nseStocks, bseStocks } = action.payload;

      if (indices) {
        state.indices = indices.map(index => ({
          ...index,
          lastUpdated: new Date().toISOString()
        }));
      }

      if (nseStocks) {
        state.nseStocks = nseStocks.map(stock => ({
          ...stock,
          lastUpdated: new Date().toISOString()
        }));

        // Also update stockPrices object
        nseStocks.forEach(stock => {
          if (stock.symbol) {
            state.stockPrices[stock.symbol] = {
              price: stock.price,
              change: stock.change,
              changePercent: stock.changePercent,
              previousClose: stock.previousClose,
              dayHigh: stock.dayHigh,
              dayLow: stock.dayLow,
              volume: stock.volume,
              lastUpdated: new Date().toISOString()
            };
          }
        });
      }

      if (bseStocks) {
        state.bseStocks = bseStocks.map(stock => ({
          ...stock,
          lastUpdated: new Date().toISOString()
        }));

        // Also update stockPrices object for BSE stocks
        bseStocks.forEach(stock => {
          if (stock.symbol && !state.stockPrices[stock.symbol]) {
            state.stockPrices[stock.symbol] = {
              price: stock.price,
              change: stock.change,
              changePercent: stock.changePercent,
              previousClose: stock.previousClose,
              dayHigh: stock.dayHigh,
              dayLow: stock.dayLow,
              volume: stock.volume,
              lastUpdated: new Date().toISOString()
            };
          }
        });
      }

      state.lastUpdated = new Date().toISOString();
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    batchUpdateStocks: (state, action) => {
      if (!Array.isArray(action.payload) || action.payload.length === 0) {
        return;
      }

      // Track if any actual updates were made
      let hasUpdates = false;

      // Process each stock in the batch
      action.payload.forEach(stockData => {
        const { symbol, price, change, changePercent, dayHigh, dayLow, volume, previousClose, timestamp } = stockData;

        if (!symbol) return;

        // Update stockPrices map
        const existingPrice = state.stockPrices[symbol]?.price;
        const priceChanged = existingPrice !== price;

        if (priceChanged) {
          state.stockPrices[symbol] = {
            ...state.stockPrices[symbol],
            price,
            change,
            changePercent,
            dayHigh,
            dayLow,
            volume,
            previousClose,
            lastUpdated: timestamp || new Date().toISOString()
          };
          hasUpdates = true;
        }

        // Update in stock lists
        const updateStockList = (stockList) => {
          const index = stockList.findIndex((stock) => stock.symbol === symbol);
          if (index !== -1) {
            // Only update if the price has actually changed
            if (stockList[index].price !== price) {
              stockList[index] = {
                ...stockList[index],
                price,
                change,
                changePercent,
                dayHigh,
                dayLow,
                volume,
                previousClose,
                lastUpdated: timestamp || new Date().toISOString()
              };
              hasUpdates = true;
            }
          }
        };

        updateStockList(state.nseStocks);
        updateStockList(state.bseStocks);
      });

      // Only update lastUpdated if data actually changed
      if (hasUpdates) {
        state.lastUpdated = new Date().toISOString();
      }
    },
    addSubscribedStock: (state, action) => {
      if (!state.subscribedStocks.includes(action.payload)) {
        state.subscribedStocks.push(action.payload);
      }
    },
    removeSubscribedStock: (state, action) => {
      state.subscribedStocks = state.subscribedStocks.filter(
        symbol => symbol !== action.payload
      );
    },
    pendingSubscription: (state, action) => {
      state.pendingSubscriptions = [
        ...state.pendingSubscriptions,
        ...action.payload.filter(symbol => !state.pendingSubscriptions.includes(symbol))
      ];
    },
    clearPendingSubscriptions: (state) => {
      state.pendingSubscriptions = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Search Stocks
      .addCase(searchStocks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchStocks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload;
        state.error = null;
      })
      .addCase(searchStocks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.searchResults = [];
      })
      // Stock History
      .addCase(fetchStockHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStockHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stockHistory = {
          ...state.stockHistory,
          [action.payload.symbol]: action.payload.data
        };
        state.error = null;
      })
      .addCase(fetchStockHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        // Initialize empty array for failed stock history
        if (action.meta?.arg?.symbol) {
          state.stockHistory[action.meta.arg.symbol] = [];
        }
      })
      // Market Indices
      .addCase(fetchMarketIndices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMarketIndices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.indices = action.payload;
        state.error = null;
      })
      .addCase(fetchMarketIndices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // NSE Stocks
      .addCase(fetchNSEStocks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNSEStocks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nseStocks = action.payload;
        state.error = null;
      })
      .addCase(fetchNSEStocks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // BSE Stocks
      .addCase(fetchBSEStocks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBSEStocks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bseStocks = action.payload;
        state.error = null;
      })
      .addCase(fetchBSEStocks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Stock Info
      .addCase(fetchStockInfo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStockInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stockInfo = {
          ...state.stockInfo,
          [action.payload.symbol]: action.payload.data || {}
        };
        state.error = null;
      })
      .addCase(fetchStockInfo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        // Initialize empty object for failed stock info
        if (action.meta?.arg) {
          state.stockInfo[action.meta.arg] = {};
        }
      })
      // Handle fetchCurrentPrice actions
      .addCase(fetchCurrentPrice.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentPrice.fulfilled, (state, action) => {
        const { symbol, data } = action.payload;

        // Update the stockPrices object
        state.stockPrices[symbol] = {
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          previousClose: data.previousClose,
          dayHigh: data.dayHigh,
          dayLow: data.dayLow,
          volume: data.volume,
          lastUpdated: new Date().toISOString()
        };

        state.isLoading = false;
      })
      .addCase(fetchCurrentPrice.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch current price';
      })
      // Market News
      .addCase(fetchMarketNews.pending, (state) => {
        state.isLoadingNews = true;
        state.error = null;
      })
      .addCase(fetchMarketNews.fulfilled, (state, action) => {
        state.isLoadingNews = false;
        state.marketNews = action.payload;
        state.error = null;
      })
      .addCase(fetchMarketNews.rejected, (state, action) => {
        state.isLoadingNews = false;
        state.error = action.payload;
      });
  },
});

export const {
  updateStockPrice,
  updateIndices,
  setSocketConnected,
  setInitialMarketData,
  clearSearchResults,
  clearError,
  batchUpdateStocks,
  addSubscribedStock,
  removeSubscribedStock,
  pendingSubscription,
  clearPendingSubscriptions
} = marketSlice.actions;

export default marketSlice.reducer;