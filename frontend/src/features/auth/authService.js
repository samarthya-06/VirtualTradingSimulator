import axios from '../../utils/axiosConfig';

// Register user
const register = async (userData) => {
  const response = await axios.post('/api/users', userData);

  if (response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));

    // Try to initialize the user's portfolio
    try {
      const token = response.data.token;
      // Use the token for portfolio creation
      await axios.post('/api/portfolio', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error initializing portfolio:', error);
      // We'll continue even if portfolio initialization fails
      // The portfolio will be created on first access
    }
  }

  return response.data;
};

// Login user
const login = async (userData) => {
  const response = await axios.post('/api/users/login', userData);

  if (response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }

  return response.data;
};

// Logout user
const logout = () => {
  localStorage.removeItem('user');
  window.location.href = '/';
};

// Update profile
const updateProfile = async (userData, token) => {
  const response = await axios.put('/api/users/profile', userData);

  if (response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }

  return response.data;
};

// Initiate Google OAuth login
const googleLogin = () => {
  // Get the backend URL from environment or use default
  const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002';
  window.location.href = `${backendUrl}/api/users/auth/google`;
};

const authService = {
  register,
  login,
  logout,
  updateProfile,
  googleLogin,
};

export default authService;