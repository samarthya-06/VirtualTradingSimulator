import axios from 'axios';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api/market';
let socket;

// Initialize WebSocket connection
const initializeSocket = (token) => {
    if (socket) return socket;

    socket = io('http://localhost:5002', {
        path: '/socket.io',
        transports: ['websocket'],
        auth: {
            token
        }
    });

    socket.on('connect', () => {
        console.log('WebSocket connected');
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
    });

    return socket;
};

// Get market indices (NSE and BSE)
const getIndices = async () => {
    try {
        const token = localStorage.getItem('userToken');
        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
        const response = await axios.get(`${API_URL}/indices`, config);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || error.message;
    }
};

// Search stocks
const searchStocks = async (query) => {
    try {
        const token = localStorage.getItem('userToken');
        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
        const response = await axios.get(`${API_URL}/search?query=${query}`, config);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || error.message;
    }
};

// Get stock details
const getStockDetails = async (symbol) => {
    try {
        const token = localStorage.getItem('userToken');
        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
        const response = await axios.get(`${API_URL}/stock/${symbol}`, config);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || error.message;
    }
};

// Subscribe to real-time updates
const subscribeToUpdates = (symbols, callback) => {
    if (!socket?.connected) {
        const token = localStorage.getItem('userToken');
        initializeSocket(token);
    }
    socket.emit('subscribe', symbols);
    socket.on('stockUpdate', callback);
};

// Unsubscribe from real-time updates
const unsubscribeFromUpdates = (symbols) => {
    if (socket?.connected) {
        socket.emit('unsubscribe', symbols);
    }
};

// Get Indian market news
const getMarketNews = async (count = 10) => {
    try {
        const token = localStorage.getItem('userToken');
        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            },
            params: { count }
        };
        const response = await axios.get(`${API_URL}/market-news`, config);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || error.message;
    }
};

// Get news for a specific stock
const getStockNews = async (symbol, count = 5) => {
    try {
        const token = localStorage.getItem('userToken');
        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            },
            params: { count }
        };
        const response = await axios.get(`${API_URL}/news/${symbol}`, config);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || error.message;
    }
};

const marketService = {
    getIndices,
    searchStocks,
    getStockDetails,
    subscribeToUpdates,
    unsubscribeFromUpdates,
    initializeSocket,
    getMarketNews,
    getStockNews
};

export default marketService;