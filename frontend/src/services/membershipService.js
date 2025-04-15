import api from '../utils/axiosConfig';

// Use the proxy configuration from package.json
const API_URL = '/api/membership';

// Get current membership
const getCurrentMembership = async (token) => {
  const response = await api.get(API_URL);
  return response.data;
};

// Create membership order
const createMembershipOrder = async (membershipData, token) => {
  const response = await api.post(`${API_URL}/create-order`, membershipData);
  return response.data;
};

// Verify membership payment
const verifyMembershipPayment = async (paymentData, token) => {
  const response = await api.post(`${API_URL}/verify`, paymentData);
  return response.data;
};

// Cancel membership
const cancelMembership = async (token) => {
  const response = await api.post(`${API_URL}/cancel`, {});
  return response.data;
};

const membershipService = {
  getCurrentMembership,
  createMembershipOrder,
  verifyMembershipPayment,
  cancelMembership,
};

export default membershipService; 