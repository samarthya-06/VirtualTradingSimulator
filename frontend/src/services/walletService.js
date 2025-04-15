import api from '../utils/axiosConfig';

const getWalletBalance = async () => {
  try {
    const response = await api.get('/api/wallet/balance');
    return {
      balance: response.data.balance,
      heldBalance: response.data.heldBalance || 0,
      availableBalance: response.data.balance - (response.data.heldBalance || 0),
      virtualBalance: response.data.virtualBalance || 0
    };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch wallet balance');
  }
};

const addFunds = async (amount) => {
  try {
    const response = await api.post('/api/wallet/add', { amount });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to add funds');
  }
};

const getTransactions = async () => {
  try {
    const response = await api.get('/api/wallet/transactions');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch transactions');
  }
};

const walletService = {
  getWalletBalance,
  addFunds,
  getTransactions,
};

export default walletService;