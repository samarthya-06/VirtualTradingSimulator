import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/axiosConfig';

// Async thunks
export const executeTrade = createAsyncThunk(
  'trading/execute',
  async (tradeData, thunkAPI) => {
    try {
      // Validate trade data
      if (!tradeData.symbol || !tradeData.quantity || !tradeData.type || !tradeData.orderType || !tradeData.price) {
        throw new Error('Invalid trade data');
      }

      // Format trade data - keep the case as is, backend will handle normalization
      const formattedTradeData = {
        symbol: tradeData.symbol,
        quantity: Number(tradeData.quantity),
        type: tradeData.type, // Keep as is (BUY or SELL)
        orderType: tradeData.orderType, // Keep as is (MARKET or LIMIT)
        price: Number(tradeData.price),
        ...(tradeData.orderType === 'LIMIT' && { limitPrice: Number(tradeData.limitPrice) })
      };

      console.log('Executing trade with formatted data:', formattedTradeData);

      // Add request timeout and retry logic
      try {
        const response = await api.post(
          `/api/trades`,
          formattedTradeData,
          {
            timeout: 15000,  // 15 second timeout
          }
        );

        console.log('Trade executed successfully:', response.data);

        // Refresh portfolio after successful trade with cache busting
        const timestamp = new Date().getTime();
        console.log('Refreshing portfolio after trade with timestamp:', timestamp);
        await thunkAPI.dispatch(getPortfolio({ forceRefresh: true, timestamp }));

        // Refresh trade history
        await thunkAPI.dispatch(getTradeHistory());

        // Add a small delay and refresh portfolio again to ensure it's updated
        setTimeout(async () => {
          console.log('Performing second portfolio refresh after trade');
          await thunkAPI.dispatch(getPortfolio({ forceRefresh: true, timestamp: new Date().getTime() }));
        }, 1000);

        return response.data;
      } catch (apiError) {
        console.error('API error during trade execution:', apiError);

        // Check for insufficient balance error and format a user-friendly message
        if (apiError.message && apiError.message.includes('Insufficient balance')) {
          // Extract the details from the error message if available
          const errorMsg = apiError.message.includes('Required:')
            ? apiError.message
            : 'Insufficient funds. Please add more funds to your wallet to complete this trade.';

          throw new Error(errorMsg);
        }

        throw apiError; // Re-throw to be caught by the outer try-catch
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      return thunkAPI.rejectWithValue({
        message: error.response?.data?.message || error.message || 'Failed to execute trade'
      });
    }
  }
);

// Handle stock selection
export const selectStock = createAsyncThunk(
  'trading/selectStock',
  async (stockData) => {
    return stockData; // Return the stock data directly
  }
);

export const getPortfolio = createAsyncThunk(
  'trading/getPortfolio',
  async (options = {}, thunkAPI) => {
    try {
      console.log('Fetching portfolio data...', options);

      // Add cache-busting parameter if forceRefresh is true
      const url = options.forceRefresh
        ? `/api/portfolio?t=${options.timestamp || new Date().getTime()}`
        : '/api/portfolio';

      const response = await api.get(url);
      console.log('Portfolio data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Portfolio fetch error:', error);
      return thunkAPI.rejectWithValue(
        error.response?.data || { message: error.message || 'Failed to fetch portfolio' }
      );
    }
  }
);

export const getTradeHistory = createAsyncThunk(
  'trading/getHistory',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/api/trades');
      return response.data.trades;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || { message: 'Failed to fetch history' });
    }
  }
);

const initialState = {
  portfolio: null,
  tradeHistory: [],
  selectedStock: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
};

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    clearSelectedStock: (state) => {
      state.selectedStock = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(executeTrade.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(executeTrade.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
      })
      .addCase(executeTrade.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Trade execution failed';
      })
      .addCase(selectStock.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(selectStock.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.selectedStock = action.payload;
      })
      .addCase(selectStock.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getPortfolio.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(getPortfolio.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.portfolio = action.payload;
      })
      .addCase(getPortfolio.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to fetch portfolio';
      })
      .addCase(getTradeHistory.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(getTradeHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.tradeHistory = action.payload;
      })
      .addCase(getTradeHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to fetch trade history';
      });
  },
});

export const { reset, clearSelectedStock } = tradingSlice.actions;
export default tradingSlice.reducer;