import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import marketReducer from '../features/market/marketSlice';
import tradingReducer from '../features/trading/tradingSlice';
import portfolioReducer from '../features/portfolio/portfolioSlice';
import watchlistReducer from '../features/watchlist/watchlistSlice';
import walletReducer from '../features/wallet/walletSlice';
import loadingReducer from '../features/loading/loadingSlice';
import learnReducer from '../features/learn/learnSlice';
// Leaderboard reducer removed
import transactionsReducer from '../features/transactions/transactionsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    market: marketReducer,
    trading: tradingReducer,
    portfolio: portfolioReducer,
    watchlist: watchlistReducer,
    wallet: walletReducer,
    loading: loadingReducer,
    learn: learnReducer,
    // Leaderboard reducer removed
    transactions: transactionsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: true,
      immutableCheck: true,
      serializableCheck: {
        ignoredActions: [
          'socket/connect',
          'socket/disconnect',
          'market/initializeWebSocket',
          'market/subscribeToStocks',
          'market/unsubscribeFromStocks',
          'market/updateStockPrice',
          'market/updateIndices',
          'market/setInitialMarketData',
          'market/setSocketConnected',
          'market/clearError',
          'trading/selectStock',
          'trading/executeTrade',
          'watchlist/addToWatchlist',
          'watchlist/removeFromWatchlist'
        ],
        ignoredActionPaths: [
          'payload.socket',
          'meta.arg.socket',
          'payload.error',
          'meta.arg',
          'payload.data.price',
          'payload.data.change',
          'payload.data.volume',
          'payload.timestamp',
          'payload.dayHigh',
          'payload.dayLow',
          'payload.previousClose'
        ],
        ignoredPaths: [
          'market.socket',
          'market.stockHistory',
          'market.searchResults',
          'market.nseStocks',
          'market.bseStocks',
          'market.indices',
          'market.socketConnected',
          'market.lastUpdated',
          'trading.selectedStock',
          'watchlist.watchlist'
        ],
      },
    }).concat([
      // Custom middleware for WebSocket connection management
      (store) => (next) => (action) => {
        if (action.type === 'market/initializeWebSocket') {
          // Ensure cleanup of previous WebSocket connection
          if (store.getState().market.socketConnected) {
            store.dispatch({ type: 'socket/disconnect' });
          }
        }
        return next(action);
      }
    ]),
});

export default store;