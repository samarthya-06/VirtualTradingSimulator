import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/axiosConfig';

// Get wallet balance
export const getWalletBalance = createAsyncThunk(
  'wallet/getBalance',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/api/wallet/balance');
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || { message: 'Failed to get balance' });
    }
  }
);

// Add funds to wallet
export const addFunds = createAsyncThunk(
  'wallet/addFunds',
  async (amount, thunkAPI) => {
    try {
      // Create Razorpay order
      const orderResponse = await api.post(
        '/api/wallet/create-order',
        { amount }
      );

      // Load Razorpay script
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
          const options = {
            key: process.env.REACT_APP_RAZORPAY_KEY_ID,
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            name: 'Virtual Trading Simulator',
            description: 'Add funds to wallet',
            order_id: orderResponse.data.id,
            handler: async (response) => {
              try {
                // Verify payment
                const verifyResponse = await api.post(
                  '/api/wallet/verify-payment',
                  {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                  }
                );
                resolve(verifyResponse.data);
              } catch (error) {
                reject(error.response?.data || { message: 'Payment verification failed' });
              }
            },
            prefill: {
              name: thunkAPI.getState().auth.user.name,
              email: thunkAPI.getState().auth.user.email,
            },
            theme: {
              color: '#1976d2',
            },
          };

          const razorpay = new window.Razorpay(options);
          razorpay.open();
        };
        script.onerror = () => {
          reject({ message: 'Failed to load Razorpay SDK' });
        };
        document.body.appendChild(script);
      });
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || { message: 'Failed to add funds' });
    }
  }
);

// Get transaction history
export const getTransactions = createAsyncThunk(
  'wallet/getTransactions',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/api/wallet/transactions');
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || { message: 'Failed to get transactions' });
    }
  }
);

const initialState = {
  balance: 0,
  virtualBalance: 0,
  heldBalance: 0,
  availableBalance: 0,
  transactions: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
  alert: {
    show: false,
    type: 'info',
    message: ''
  }
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    setAlert: (state, action) => {
      state.alert = {
        show: true,
        type: action.payload.type || 'info',
        message: action.payload.message
      };
    },
    clearAlert: (state) => {
      state.alert = {
        show: false,
        type: 'info',
        message: ''
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getWalletBalance.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(getWalletBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.balance = action.payload.balance;
        state.virtualBalance = action.payload.virtualBalance;
        state.heldBalance = action.payload.heldBalance || 0;
        state.availableBalance = action.payload.availableBalance || 0;
      })
      .addCase(getWalletBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to get balance';
      })
      .addCase(addFunds.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(addFunds.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Update balance if payment was successful
        if (action.payload?.balance !== undefined) {
          state.balance = Number(action.payload.balance);
          state.virtualBalance = Number(action.payload.virtualBalance || 0);
          state.message = 'Funds added successfully';
        }
      })
      .addCase(addFunds.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to add funds';
      })
      .addCase(getTransactions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.transactions = action.payload;
      })
      .addCase(getTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to get transactions';
      });
  },
});

export const { reset, setAlert, clearAlert } = walletSlice.actions;
export default walletSlice.reducer;