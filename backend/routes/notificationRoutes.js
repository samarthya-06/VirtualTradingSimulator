import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  createTestNotification,
  getPriceAlerts,
  createPriceAlert,
  deletePriceAlert
} from '../controllers/notificationController.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// @route   GET /api/notifications
// @desc    Get all notifications for a user
// @access  Private
router.get('/', getNotifications);

// @route   PUT /api/notifications/:id
// @desc    Mark notification as read
// @access  Private
router.put('/:id', markNotificationAsRead);

// @route   PUT /api/notifications
// @desc    Mark all notifications as read
// @access  Private
router.put('/', markAllNotificationsAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', deleteNotification);

// @route   DELETE /api/notifications
// @desc    Delete all notifications
// @access  Private
router.delete('/', deleteAllNotifications);

// @route   POST /api/notifications/test
// @desc    Create a test notification
// @access  Private
router.post('/test', createTestNotification);

// Price Alert Routes
// @route   GET /api/notifications/price-alerts
// @desc    Get all price alerts for a stock
// @access  Private
router.get('/price-alerts', getPriceAlerts);

// @route   POST /api/notifications/price-alerts
// @desc    Create a new price alert
// @access  Private
router.post('/price-alerts', createPriceAlert);

// @route   DELETE /api/notifications/price-alerts/:id
// @desc    Delete a price alert
// @access  Private
router.delete('/price-alerts/:id', deletePriceAlert);

export default router; 