import { PrismaClient } from '@prisma/client';
import * as notificationService from '../services/notificationService.js';
const prisma = new PrismaClient();

/**
 * @desc Get all notifications for the authenticated user
 * @route GET /api/notifications
 * @access Private
 */
export const getUserNotifications = async (req, res) => {
  try {
    const { id: userId, role: userType } = req.user;
    
    // Convert userId to string if it's a number
    const userIdStr = userId.toString();

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log('Fetching notifications for:', { userId: userIdStr, userType });

    // Get total count for pagination
    const totalCount = await prisma.notification.count({
      where: {
        userId: userIdStr,
        userType,
      },
    });

    // Get notifications with pagination
    const notifications = await prisma.notification.findMany({
      where: {
        userId: userIdStr,
        userType,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

/**
 * @desc Create a notification
 * @route POST /api/notifications
 * @access Private (Admin only)
 */
export const createNotification = async (req, res) => {
  try {
    const { role } = req.user;
    
    // Check if user is admin
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create notifications directly',
      });
    }

    const { 
      userId, 
      userType, 
      title, 
      message, 
      type, 
      actionLink, 
      metadata,
      sendToAll,
      sendToUserType 
    } = req.body;

    // If sendToAll is true, send system notification to all users
    if (sendToAll) {
      const result = await notificationService.sendSystemNotification({
        title,
        message,
        actionLink,
        userType: sendToUserType // Optional, if specified will send only to that user type
      });

      return res.status(200).json({
        success: true,
        message: `Notification sent to ${result.totalSent} users`,
        data: result
      });
    }
    
    // Otherwise, send to specific user
    if (!userId || !userType || !title || !message || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required notification fields',
      });
    }

    const notification = await notificationService.sendNotification({
      userId,
      userType,
      title,
      message,
      type,
      actionLink,
      metadata
    });

    return res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully',
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message,
    });
  }
};

/**
 * @desc Mark a notification as read
 * @route PUT /api/notifications/:id
 * @access Private
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role: userType } = req.user;
    
    // Convert userId to string if it's a number
    const userIdStr = userId.toString();
    
    console.log('Marking notification as read:', { id, userId: userIdStr, userType });

    // Find the notification
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: userIdStr,
        userType,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Update the notification
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return res.status(200).json({
      success: true,
      data: updatedNotification,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
};

/**
 * @desc Mark all notifications as read for the authenticated user
 * @route PUT /api/notifications/mark-all-read
 * @access Private
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { id: userId, role: userType } = req.user;
    
    // Convert userId to string if it's a number
    const userIdStr = userId.toString();
    console.log("user id for notification",userIdStr)
    console.log('Marking all notifications as read:', { userId: userIdStr, userType });

    // Update all unread notifications for the user
    const { count } = await prisma.notification.updateMany({
      where: {
        userId: userIdStr,
        userType,
        read: false,
      },
      data: { read: true },
    });

    return res.status(200).json({
      success: true,
      message: `${count} notifications marked as read`,
      count,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
};

/**
 * @desc Delete a notification
 * @route DELETE /api/notifications/:id
 * @access Private
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role: userType } = req.user;
    
    // Convert userId to string if it's a number
    const userIdStr = userId.toString();
    
    console.log('Deleting notification:', { id, userId: userIdStr, userType });

    // Find the notification
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: userIdStr,
        userType,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Delete the notification
    await prisma.notification.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
};

/**
 * @desc Get user's notification preferences
 * @route GET /api/notification-preferences
 * @access Private
 */
export const getNotificationPreferences = async (req, res) => {
  try {
    const { id: userId, role: userType } = req.user;
    
    // Convert userId to string if it's a number
    const userIdStr = userId.toString();
    
    console.log('Getting notification preferences:', { userId: userIdStr, userType });

    // Find user preferences or create default ones
    let preferences = await prisma.notificationPreference.findFirst({
      where: {
        userId: userIdStr,
        userType,
      },
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: userIdStr,
          userType,
          // Default values will be applied from schema
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences',
      error: error.message,
    });
  }
};

/**
 * @desc Update user's notification preferences
 * @route PUT /api/notification-preferences
 * @access Private
 */
export const updateNotificationPreferences = async (req, res) => {
  try {
    const { id: userId, role: userType } = req.user;
    const updates = req.body;
    
    // Convert userId to string if it's a number
    const userIdStr = userId.toString();
    
    console.log('Updating notification preferences:', { userId: userIdStr, userType, updates });

    // Find user preferences
    let preferences = await prisma.notificationPreference.findFirst({
      where: {
        userId: userIdStr,
        userType,
      },
    });

    // If no preferences exist, create them
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: userIdStr,
          userType,
          ...updates,
        },
      });
    } else {
      // Update existing preferences
      preferences = await prisma.notificationPreference.update({
        where: { id: preferences.id },
        data: updates,
      });
    }

    return res.status(200).json({
      success: true,
      data: preferences,
      message: 'Notification preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message,
    });
  }
};