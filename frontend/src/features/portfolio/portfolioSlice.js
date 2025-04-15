import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/axiosConfig';

const initialState = {
  portfolio: null,
  holdings: [],
  performance: [],
  analytics: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

// Get portfolio
export const getPortfolio = createAsyncThunk(
  'portfolio/get',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/api/portfolio');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get portfolio performance history
export const getPortfolioHistory = createAsyncThunk(
  'portfolio/getHistory',
  async (period = '1m', thunkAPI) => {
    try {
      const response = await api.get(`/api/portfolio/history?period=${period}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get portfolio analytics
export const getPortfolioAnalytics = createAsyncThunk(
  'portfolio/getAnalytics',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/api/portfolio/analytics');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const portfolioSlice = createSlice({
  name: 'portfolio',
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
      // Get portfolio
      .addCase(getPortfolio.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPortfolio.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.portfolio = action.payload;
        state.holdings = action.payload.holdings;
      })
      .addCase(getPortfolio.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get portfolio history
      .addCase(getPortfolioHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPortfolioHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.performance = action.payload;
      })
      .addCase(getPortfolioHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get portfolio analytics
      .addCase(getPortfolioAnalytics.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPortfolioAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.analytics = action.payload;
      })
      .addCase(getPortfolioAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = portfolioSlice.actions;
export default portfolioSlice.reducer; 