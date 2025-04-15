import { io } from 'socket.io-client';
import { store } from '../store/store';
import { updateIndices, batchUpdateStocks } from '../features/market/marketSlice';

// Use REACT_APP prefix for environment variables in React
const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30000;
const SOCKET_TIMEOUT = 20000; // Reduced from 120000 to detect connection issues faster

// For throttling UI updates (we don't need to update UI on every WebSocket message)
let pendingStockUpdates = {};
let updateTimeout = null;
const UI_UPDATE_INTERVAL = 1000;
let pendingSubscriptions = new Set();

// Add new connection state tracking
let connectionAttemptInProgress = false;

// Process batched updates to reduce rendering overhead
const processPendingUpdates = () => {
  if (Object.keys(pendingStockUpdates).length > 0) {
    const updates = Object.values(pendingStockUpdates);
    store.dispatch(batchUpdateStocks(updates));
    pendingStockUpdates = {};
  }
  updateTimeout = null;
};

export const initializeWebSocket = () => {
  // Don't initialize multiple times simultaneously
  if (connectionAttemptInProgress) {
    console.log('WebSocket connection attempt already in progress, skipping');
    return socket;
  }

  if (socket && socket.connected) {
    console.log('WebSocket already connected, reusing existing connection');
    return socket;
  }

  // Only clean up if we already have a socket that's not connected
  if (socket && !socket.connected) {
    console.log('Cleaning up existing disconnected socket connection');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // Clear any existing update timeout
  if (updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }

  console.log('Initializing WebSocket connection to:', SOCKET_URL);
  connectionAttemptInProgress = true;

  try {
    // Get auth token from local storage
    const userStr = localStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr)?.token : null;
    
    // Don't attempt connection if no auth token
    if (!token) {
      console.warn('No authentication token found, skipping WebSocket initialization');
      connectionAttemptInProgress = false;
      return null;
    }

    // Initialize socket with optimized options
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Prefer WebSocket for better performance
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: INITIAL_RECONNECT_DELAY,
      reconnectionDelayMax: MAX_RECONNECT_DELAY,
      timeout: SOCKET_TIMEOUT,
      path: '/socket.io',
      forceNew: true, // Use new connection to avoid reusing problematic connections
      rejectUnauthorized: false,
      // Performance optimizations for high-frequency updates
      perMessageDeflate: {
        threshold: 1024 // Only compress messages larger than 1KB
      },
      auth: {
        token: token
      },
      query: {
        timestamp: Date.now()
      }
    });

    socket.on('connect', () => {
      console.log('WebSocket connected successfully:', socket.id);
      reconnectAttempts = 0;
      connectionAttemptInProgress = false;
      store.dispatch({ type: 'SOCKET_CONNECTED' });
      
      // Request initial market data with delay to allow server to properly initialize the connection
      setTimeout(() => {
        if (socket && socket.connected) {
          socket.emit('get_initial_data');
          
          // Resubscribe to any pending subscriptions
          if (pendingSubscriptions.size > 0) {
            console.log(`Resubscribing to ${pendingSubscriptions.size} symbols`);
            pendingSubscriptions.forEach(symbol => {
              socket.emit('subscribe_symbol', symbol);
            });
          }
        }
      }, 1000);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      connectionAttemptInProgress = false;
      reconnectAttempts++;
      
      if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts), MAX_RECONNECT_DELAY);
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(() => {
          if (socket) {
            console.log('Attempting reconnection...');
            socket.connect();
          }
        }, delay);
      } else {
        console.error('Maximum reconnection attempts reached');
        store.dispatch({ type: 'SOCKET_CONNECTION_FAILED' });
        
        // Wait longer before trying again
        setTimeout(() => {
          reconnectAttempts = 0;
          if (socket) {
            console.log('Retrying connection after cool-down period');
            socket.connect();
          }
        }, MAX_RECONNECT_DELAY * 2);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      connectionAttemptInProgress = false;
      store.dispatch({ type: 'SOCKET_DISCONNECTED', payload: reason });
      
      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Server initiated disconnect, try to reconnect after a delay
        setTimeout(() => {
          if (socket) {
            socket.connect();
          }
        }, INITIAL_RECONNECT_DELAY);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      store.dispatch({ type: 'SOCKET_ERROR', payload: error });
    });

    // Add a connection timeout handler
    setTimeout(() => {
      if (socket && !socket.connected) {
        console.warn('Connection timed out after', SOCKET_TIMEOUT, 'ms');
        socket.disconnect();
        
        // Try to reconnect once after timeout
        setTimeout(() => {
          initializeWebSocket();
        }, INITIAL_RECONNECT_DELAY);
      }
    }, SOCKET_TIMEOUT);

    socket.on('stock_update', (data) => {
      // Batch updates to reduce rendering overhead for 1-second real-time updates
      if (Array.isArray(data)) {
        // Handle batch updates from server
        data.forEach(stock => {
          if (stock && stock.symbol) {
            pendingStockUpdates[stock.symbol] = stock;
          }
        });
      } else if (data && data.symbol) {
        // Handle single stock update
        pendingStockUpdates[data.symbol] = data;
      }
      
      // Schedule update if not already scheduled
      if (!updateTimeout) {
        updateTimeout = setTimeout(processPendingUpdates, UI_UPDATE_INTERVAL);
      }
    });

    socket.on('indices_update', (data) => {
      // Index updates are less frequent, so we can dispatch immediately
      store.dispatch(updateIndices(data));
    });

    socket.on('initial_market_data', (data) => {
      console.log('Received initial market data');
      if (data.topStocks && Array.isArray(data.topStocks)) {
        store.dispatch(batchUpdateStocks(data.topStocks));
      }
      if (data.nseStocks) store.dispatch(batchUpdateStocks(data.nseStocks));
      if (data.bseStocks) store.dispatch(batchUpdateStocks(data.bseStocks));
      if (data.indices) store.dispatch(updateIndices(data.indices));
    });

    // Listen for priority stock updates
    socket.on('priority_stocks_update', (data) => {
      if (Array.isArray(data) && data.length > 0) {
        store.dispatch(batchUpdateStocks(data));
      }
    });
    
    return socket;
  } catch (error) {
    console.error('Error initializing WebSocket:', error);
    connectionAttemptInProgress = false;
    return null;
  }
};

export const subscribeToStock = (symbol) => {
  if (!symbol) return;
  
  // Add to pending subscriptions regardless of socket state
  pendingSubscriptions.add(symbol);
  
  if (!socket) {
    console.warn('Socket not initialized, initializing now...');
    socket = initializeWebSocket();
    return;
  }

  if (socket?.connected) {
    console.log('Subscribing to stock:', symbol);
    socket.emit('subscribe_symbol', symbol);
  } else {
    console.warn('Socket not connected, queuing subscription for:', symbol);
    // Will be handled when connection is established
  }
};

export const unsubscribeFromStock = (symbol) => {
  if (!symbol) return;
  
  // Remove from pending subscriptions
  pendingSubscriptions.delete(symbol);
  
  if (socket?.connected) {
    console.log('Unsubscribing from stock:', symbol);
    socket.emit('unsubscribe_symbol', symbol);
  }
};

// Force an immediate refresh of all subscribed stocks
export const refreshStocks = () => {
  if (socket?.connected) {
    socket.emit('refresh_stocks');
  }
};

// Modified to be safer when navigating between pages
export const disconnect = () => {
  // Only disconnect if we're sure we're shutting down the application
  // Don't disconnect when just navigating between pages
  if (!socket) return;
  
  console.log('Attempting socket disconnection...');
  
  // Clear any pending timeouts
  if (updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }
  
  // Reset pending updates
  pendingStockUpdates = {};
  
  // Only completely disconnect if we're actually shutting down the app
  // This should typically only be called when logging out or closing the application
  if (window.isAppShuttingDown) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    console.log('WebSocket disconnected and cleaned up');
  } else {
    console.log('Preserving socket connection during navigation');
  }
};

const websocketService = {
  initializeWebSocket,
  subscribeToStock,
  unsubscribeFromStock,
  refreshStocks,
  disconnect
};

export default websocketService;