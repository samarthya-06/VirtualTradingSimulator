/**
 * Notification Controller
 * 
 * Provides API endpoints for managing user notifications
 */
import asyncHandler from 'express-async-handler';
import * as notificationService from '../services/notificationService.js';
import PriceAlert from '../models/priceAlertModel.js';
import Stock from '../models/stockModel.js';

/**
 * Get all notifications for a user
 * @route GET /api/notifications
 * @access Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    isRead, 
    type, 
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
    type,
    sortBy,
    sortOrder
  };

  const result = await notificationService.getUserNotifications(req.user.id, options);
  
  res.json({
    success: true,
    ...result
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user._id;
  
  const updatedNotification = await notificationService.markNotificationAsRead(notificationId, userId);
  
  res.json(updatedNotification);
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const result = await notificationService.markAllNotificationsAsRead(userId);
  
  res.json({
    success: true,
    modified: result.modifiedCount
  });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user._id;
  
  await notificationService.deleteNotification(notificationId, userId);
  
  res.json({ success: true });
});

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/notifications
 * @access  Private
 */
const deleteAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const result = await notificationService.deleteAllNotifications(userId);
  
  res.json({
    success: true,
    deleted: result.deletedCount
  });
});

/**
 * @desc    Create test notification (development only)
 * @route   POST /api/notifications/test
 * @access  Private
 */
const createTestNotification = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404);
    throw new Error('Endpoint not available in production');
  }
  
  const userId = req.user._id;
  const { type = 'SYSTEM', title = 'Test Notification', message = 'This is a test notification', link = '' } = req.body;
  
  const notification = await notificationService.createNotification(
    userId,
    type,
    title,
    message,
    link
  );
  
  res.status(201).json(notification);
});

/**
 * Get price alerts for a stock
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON response with alerts
 */
const getPriceAlerts = async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Stock symbol is required'
      });
    }
    
    const alerts = await PriceAlert.find({
      user: req.user.id,
      symbol: symbol.toUpperCase()
    }).sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    console.error('Error getting price alerts:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

/**
 * Create a new price alert
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON response with created alert
 */
const createPriceAlert = async (req, res) => {
  try {
    const { symbol, type, targetPrice } = req.body;
    
    if (!symbol || !type || !targetPrice) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }
    
    if (type !== 'above' && type !== 'below') {
      return res.status(400).json({
        success: false,
        error: 'Type must be either "above" or "below"'
      });
    }
    
    // Get current stock price
    const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
    if (!stock) {
      return res.status(404).json({
        success: false,
        error: 'Stock not found'
      });
    }
    
    // Create price alert
    const alert = new PriceAlert({
      user: req.user.id,
      symbol: symbol.toUpperCase(),
      type,
      targetPrice,
      currentPrice: stock.currentPrice
    });
    
    const savedAlert = await alert.save();
    
    return res.status(201).json({
      success: true,
      data: savedAlert
    });
  } catch (error) {
    console.error('Error creating price alert:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

/**
 * Delete a price alert
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON response with success status
 */
const deletePriceAlert = async (req, res) => {
  try {
    const alert = await PriceAlert.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Price alert not found'
      });
    }
    
    await alert.remove();
    
    return res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting price alert:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

export {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  createTestNotification,
  getPriceAlerts,
  createPriceAlert,
  deletePriceAlert
}; 