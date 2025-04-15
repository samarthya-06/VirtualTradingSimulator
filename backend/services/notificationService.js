/**
 * Notification Service
 * 
 * Manages in-app notifications and delivers them in real-time
 */
import Notification from '../models/Notification.js';
import { logError, logInfo } from '../utils/logger.js';

/**
 * Create a new notification for a user
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} link - Optional link to navigate to
 * @param {Object} data - Optional additional data
 * @returns {Promise<Object>} - Created notification
 */
export const createNotification = async (userId, type, title, message, link = '', data = {}) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      link,
      data
    });

    const savedNotification = await notification.save();
    
    // Emit the notification via WebSocket if available
    if (global.io) {
      global.io.to(`user:${userId}`).emit('notification', savedNotification);
    }
    
    logInfo(`Created notification for user ${userId}`, { type, title });
    return savedNotification;
  } catch (error) {
    logError('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get all notifications for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - User notifications
 */
export const getUserNotifications = async (userId, options = {}) => {
  try {
    const { 
      limit = 50, 
      page = 1, 
      isRead, 
      type, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = options;
    
    const query = { userId };
    
    // Add filters if provided
    if (isRead !== undefined) {
      query.isRead = isRead;
    }
    
    if (type) {
      query.type = type;
    }
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const notifications = await Notification.find(query)
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const totalCount = await Notification.countDocuments(query);
    
    return {
      notifications,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        page: Number(page),
        limit: Number(limit)
      }
    };
  } catch (error) {
    logError('Error fetching user notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for security)
 * @returns {Promise<Object>} - Updated notification
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found or access denied');
    }
    
    return notification;
  } catch (error) {
    logError('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Update result
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
    
    return result;
  } catch (error) {
    logError('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for security)
 * @returns {Promise<boolean>} - Success status
 */
export const deleteNotification = async (notificationId, userId) => {
  try {
    const result = await Notification.findOneAndDelete({ _id: notificationId, userId });
    
    if (!result) {
      throw new Error('Notification not found or access denied');
    }
    
    return true;
  } catch (error) {
    logError('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Delete all notifications for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Delete result
 */
export const deleteAllNotifications = async (userId) => {
  try {
    const result = await Notification.deleteMany({ userId });
    return result;
  } catch (error) {
    logError('Error deleting all notifications:', error);
    throw error;
  }
};

export default {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications
}; 