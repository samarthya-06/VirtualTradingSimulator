import axios from 'axios';

// Create an instance of axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5002',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 10000 // 10 seconds timeout
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Get user from localStorage
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        if (user && user.token) {
          // Add the token to the auth header
          config.headers.Authorization = `Bearer ${user.token}`;
          console.log('Added token to request headers');
        }
      }
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle request cancellation or timeout
    if (axios.isCancel(error)) {
      console.error('Request was cancelled:', error.message);
      return Promise.reject(new Error('Request was cancelled'));
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out:', error.message);
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      const errorMsg = error.response?.data?.message || '';
      console.error('Authentication error:', errorMsg);
      
      // Check if it's a token related error
      if (
        errorMsg.includes('Invalid token') || 
        errorMsg.includes('Token has expired') || 
        errorMsg.includes('Authorization token is required')
      ) {
        console.log('Token error detected. User will be redirected to login');
        localStorage.removeItem('user');
        // Delay redirect to avoid disrupting current error handling
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
    }
    
    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
      const errorDetails = error.response?.data?.message || error.response?.data?.error || JSON.stringify(error.response?.data);
      
      // Preserve specific error messages
      if (errorDetails.includes('Insufficient balance') || 
          errorDetails.includes('wallet') || 
          errorDetails.includes('funds')) {
        return Promise.reject(new Error(errorDetails));
      }
      
      return Promise.reject(new Error(`Server error: ${errorDetails}. Please try again later.`));
    }
    
    // For other response errors, return more specific error info from the server
    if (error.response) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Request failed';
      console.error(`Request error (${error.response.status}):`, errorMessage);
      return Promise.reject(new Error(errorMessage));
    }
    
    return Promise.reject(error);
  }
);

export default api;