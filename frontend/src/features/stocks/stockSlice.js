import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/axiosConfig';

const initialState = {
  stocks: [],
  activeStock: null,
  marketTrends: [],
  watchlist: [],
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

// Get all stocks
export const getStocks = createAsyncThunk(
  'stocks/getAll',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/api/stocks');
      return response.data.stocks || [];
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get stock by symbol
export const getStockBySymbol = createAsyncThunk(
  'stocks/getBySymbol',
  async (symbol, thunkAPI) => {
    try {
      const response = await api.get(`/api/stocks/${symbol}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get market trends
export const getMarketTrends = createAsyncThunk(
  'stocks/getMarketTrends',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/api/stocks');
      return response.data.stocks || [];
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get stock history
export const getStockHistory = createAsyncThunk(
  'stocks/getHistory',
  async ({ symbol, period = '1d', interval = '5m' }, thunkAPI) => {
    try {
      const response = await api.get(
        `/api/stocks/${symbol}/history?period=${period}&interval=${interval}`
      );
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add to watchlist
export const addToWatchlist = createAsyncThunk(
  'stocks/addToWatchlist',
  async (stockId, thunkAPI) => {
    try {
      const response = await api.post('/api/watchlist', { stockId });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Remove from watchlist
export const removeFromWatchlist = createAsyncThunk(
  'stocks/removeFromWatchlist',
  async (stockId, thunkAPI) => {
    try {
      const response = await api.delete(`/api/watchlist/${stockId}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const stockSlice = createSlice({
  name: 'stocks',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all stocks
      .addCase(getStocks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getStocks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.stocks = action.payload;
      })
      .addCase(getStocks.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get stock by symbol
      .addCase(getStockBySymbol.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getStockBySymbol.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.activeStock = action.payload;
      })
      .addCase(getStockBySymbol.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get market trends
      .addCase(getMarketTrends.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getMarketTrends.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.marketTrends = action.payload;
      })
      .addCase(getMarketTrends.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Add to watchlist
      .addCase(addToWatchlist.fulfilled, (state, action) => {
        state.watchlist.push(action.payload);
      })
      // Remove from watchlist
      .addCase(removeFromWatchlist.fulfilled, (state, action) => {
        state.watchlist = state.watchlist.filter(
          (stock) => stock._id !== action.payload._id
        );
      });
  },
});

export const { reset } = stockSlice.actions;
export default stockSlice.reducer; 