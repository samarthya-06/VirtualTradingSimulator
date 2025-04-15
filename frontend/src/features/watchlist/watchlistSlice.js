import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

const initialState = {
  watchlist: [],
  isLoading: false,
  isError: false,
  message: '',
};

// Get user's watchlist
export const getWatchlist = createAsyncThunk(
  'watchlist/getWatchlist',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true
      };
      
      console.log('Fetching watchlist data...');
      const response = await axios.get(`${API_URL}/api/watchlist`, config);
      
      // Initialize an empty array for watchlist stocks
      let watchlistStocks = [];
      
      // Handle the response data structure
      if (response.data && Array.isArray(response.data)) {
        // Find the default watchlist
        const defaultWatchlist = response.data.find(w => w.isDefault) || response.data[0];
        
        if (defaultWatchlist && Array.isArray(defaultWatchlist.stocks)) {
          watchlistStocks = defaultWatchlist.stocks.map(item => {
            // Calculate change percentage properly
            const currentPrice = item.stock.currentPrice || 0;
            const previousClose = item.stock.previousClose || currentPrice;
            let changePercent = 0;
            
            // Only calculate if we have valid numbers and previousClose is not zero
            if (currentPrice && previousClose && previousClose !== 0) {
              changePercent = ((currentPrice - previousClose) / previousClose) * 100;
            }
            
            return {
              id: item.stock._id,
              symbol: item.stock.symbol,
              name: item.stock.companyName || item.stock.symbol,
              price: currentPrice,
              previousClose: previousClose,
              change: changePercent,
              volume: item.stock.volume || 0,
              dayHigh: item.stock.dayHigh || 0,
              dayLow: item.stock.dayLow || 0,
              addedAt: item.addedAt
            };
          });
        }
      }
      
      console.log('Watchlist data received:', watchlistStocks);
      return watchlistStocks;
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch watchlist');
    }
  }
);

// Add stock to watchlist
export const addToWatchlist = createAsyncThunk(
  'watchlist/addToWatchlist',
  async (symbol, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true
      };
      
      // First get or create default watchlist
      let defaultWatchlist;
      const watchlistResponse = await axios.get(`${API_URL}/api/watchlist`, config);
      
      if (watchlistResponse.data && Array.isArray(watchlistResponse.data)) {
        defaultWatchlist = watchlistResponse.data.find(w => w.isDefault);
      }
      
      if (!defaultWatchlist) {
        // Create default watchlist
        const createResponse = await axios.post(
          `${API_URL}/api/watchlist`,
          {
            name: 'Default Watchlist',
            isDefault: true
          },
          config
        );
        if (!createResponse.data) {
          throw new Error('Failed to create watchlist');
        }
        defaultWatchlist = createResponse.data;
      }

      // Get current stock data
      try {
        const quoteResponse = await axios.get(`${API_URL}/api/market/quote/${symbol}`, config);
        if (!quoteResponse.data) {
          throw new Error('Failed to fetch stock data');
        }
        const stockData = quoteResponse.data;

        // Add stock to watchlist with properly formatted data
        const response = await axios.post(
          `${API_URL}/api/watchlist/${defaultWatchlist._id}/stocks`,
          { 
            symbol: stockData.symbol,
            stockData: {
              companyName: stockData.name || stockData.symbol,
              currentPrice: parseFloat(stockData.price) || 0,
              previousClose: parseFloat(stockData.previousClose) || 0,
              volume: parseInt(stockData.volume) || 0,
              dayHigh: parseFloat(stockData.dayHigh) || 0,
              dayLow: parseFloat(stockData.dayLow) || 0,
              marketCap: parseFloat(stockData.marketCap) || 0,
              exchange: stockData.exchange || (symbol.endsWith('.NS') ? 'NSE' : 'BSE')
            }
          },
          config
        );

        if (!response.data || !response.data.stocks) {
          throw new Error('Invalid response from server');
        }

        const addedStock = response.data.stocks[response.data.stocks.length - 1];
        if (!addedStock || !addedStock.stock) {
          throw new Error('Stock was not added to watchlist');
        }

        return {
          id: addedStock.stock._id,
          symbol: addedStock.stock.symbol,
          name: addedStock.stock.companyName || stockData.symbol,
          price: parseFloat(addedStock.stock.currentPrice) || 0,
          change: parseFloat(stockData.change) || 0,
          volume: parseInt(addedStock.stock.volume) || 0,
          addedAt: addedStock.addedAt
        };
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error('This stock is not available for trading. Please try a different stock.');
        }
        throw new Error(error.response?.data?.message || 'Failed to fetch stock data');
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return thunkAPI.rejectWithValue(
        error.message || 'Failed to add to watchlist'
      );
    }
  }
);

// Remove stock from watchlist
export const removeFromWatchlist = createAsyncThunk(
  'watchlist/removeFromWatchlist',
  async (symbol, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true
      };
      
      // First find the default watchlist
      const watchlistResponse = await axios.get(`${API_URL}/api/watchlist`, config);
      let defaultWatchlist = null;
      
      if (watchlistResponse.data && Array.isArray(watchlistResponse.data)) {
        defaultWatchlist = watchlistResponse.data.find(w => w.isDefault) || watchlistResponse.data[0];
      }
      
      if (!defaultWatchlist) {
        throw new Error('No watchlist found');
      }
      
      // Find the stock in the watchlist
      const stockToRemove = defaultWatchlist.stocks.find(s => s.stock.symbol === symbol);
      if (!stockToRemove) {
        throw new Error('Stock not found in watchlist');
      }
      
      // Remove the stock from the watchlist
      await axios.delete(
        `${API_URL}/api/watchlist/${defaultWatchlist._id}/stocks/${stockToRemove.stock._id}`,
        config
      );
      
      return symbol; // Return the symbol to remove it from the state
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to remove from watchlist');
    }
  }
);

export const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState,
  reducers: {
    reset: (state) => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(getWatchlist.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(getWatchlist.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.watchlist = action.payload;
      })
      .addCase(getWatchlist.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(addToWatchlist.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(addToWatchlist.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.watchlist.push(action.payload);
      })
      .addCase(addToWatchlist.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(removeFromWatchlist.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(removeFromWatchlist.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.watchlist = state.watchlist.filter(stock => stock.symbol !== action.payload);
      })
      .addCase(removeFromWatchlist.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = watchlistSlice.actions;
export default watchlistSlice.reducer; 