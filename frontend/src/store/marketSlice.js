import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Async thunks
export const fetchMarketIndices = createAsyncThunk(
    'market/fetchIndices',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/market/indices');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch market indices');
        }
    }
);

export const fetchNSEStocks = createAsyncThunk(
    'market/fetchNSEStocks',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/market/nse');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch NSE stocks');
        }
    }
);

export const fetchBSEStocks = createAsyncThunk(
    'market/fetchBSEStocks',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/market/bse');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch BSE stocks');
        }
    }
);

export const searchStocks = createAsyncThunk(
    'market/searchStocks',
    async (query, { rejectWithValue }) => {
        try {
            const response = await api.get(`/market/search?query=${query}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to search stocks');
        }
    }
);

const marketSlice = createSlice({
    name: 'market',
    initialState: {
        indices: [],
        nseStocks: [],
        bseStocks: [],
        searchResults: [],
        loading: false,
        error: null
    },
    reducers: {
        clearSearchResults: (state) => {
            state.searchResults = [];
        },
        updateStockPrice: (state, action) => {
            const { symbol, price, change, changePercent } = action.payload;
            // Update NSE stocks
            const nseStock = state.nseStocks.find(stock => stock.symbol === symbol);
            if (nseStock) {
                nseStock.price = price;
                nseStock.change = change;
                nseStock.changePercent = changePercent;
            }
            // Update BSE stocks
            const bseStock = state.bseStocks.find(stock => stock.symbol === symbol);
            if (bseStock) {
                bseStock.price = price;
                bseStock.change = change;
                bseStock.changePercent = changePercent;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMarketIndices.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMarketIndices.fulfilled, (state, action) => {
                state.loading = false;
                state.indices = action.payload;
            })
            .addCase(fetchMarketIndices.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchNSEStocks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchNSEStocks.fulfilled, (state, action) => {
                state.loading = false;
                state.nseStocks = action.payload;
            })
            .addCase(fetchNSEStocks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchBSEStocks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBSEStocks.fulfilled, (state, action) => {
                state.loading = false;
                state.bseStocks = action.payload;
            })
            .addCase(fetchBSEStocks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(searchStocks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(searchStocks.fulfilled, (state, action) => {
                state.loading = false;
                state.searchResults = action.payload;
            })
            .addCase(searchStocks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { clearSearchResults, updateStockPrice } = marketSlice.actions;
export default marketSlice.reducer;