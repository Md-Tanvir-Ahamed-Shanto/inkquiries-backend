import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * @desc Create a notification
 * @param {Object} notificationData - The notification data
 * @returns {Promise<Object>} The created notification
 */
export const createNotification = async (notificationData) => {
  try {
    const { userId, userType, title, message, type, actionLink, metadata } = notificationData;

    // Validate required fields
    if (!userId || !userType || !title || !message || !type) {
      throw new Error('Missing required notification fields');
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        userType,
        title,
        message,
        type,
        actionLink,
        metadata,
      },
    });

    return notification;
  } catch (error) {
    console.error('Error in notification service:', error);
    throw error;
  }
};

/**
 * @desc Check user notification preferences
 * @param {String} userId - The user ID
 * @param {String} userType - The user type (client, artist, admin)
 * @param {String} notificationType - The type of notification
 * @returns {Promise<Object>} The user's notification preferences
 */
export const checkNotificationPreferences = async (userId, userType, notificationType) => {
  try {
    // Find user preferences or create default ones
    let preferences = await prisma.notificationPreference.findFirst({
      where: {
        userId,
        userType,
      },
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          userType,
          // Default values will be applied from schema
        },
      });
    }

    return preferences;
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    throw error;
  }
};

/**
 * @desc Send a notification based on user preferences
 * @param {Object} notificationData - The notification data
 * @returns {Promise<Object>} The result of the notification sending
 */
export const sendNotification = async (notificationData) => {
  try {
    const { userId, userType, title, message, type, actionLink, metadata } = notificationData;

    // Check user preferences
    const preferences = await checkNotificationPreferences(userId, userType, type);

    // Determine which notification types to send based on preferences and notification type
    let shouldSendNotification = false;

    switch (type) {
      case 'review':
        shouldSendNotification = preferences.reviewNotifications;
        break;
      case 'comment':
        shouldSendNotification = preferences.commentNotifications;
        break;
      case 'message':
        shouldSendNotification = preferences.messageNotifications;
        break;
      case 'system':
        shouldSendNotification = preferences.systemNotifications;
        break;
      case 'promotion':
        shouldSendNotification = preferences.promotionNotifications;
        break;
      case 'healed_photo':
        shouldSendNotification = preferences.healedPhotoReminders;
        break;
      default:
        shouldSendNotification = true; // Default to sending if type not specified
    }

    if (!shouldSendNotification) {
      return { sent: false, reason: 'User has disabled this notification type' };
    }

    // Create in-app notification if enabled
    let inAppNotification = null;
    if (preferences.inApp) {
      inAppNotification = await createNotification({
        userId,
        userType,
        title,
        message,
        type,
        actionLink,
        metadata,
      });
    }

    // Send email notification if enabled
    let emailSent = false;
    if (preferences.email) {
      try {
        // Import email service
        const { sendNotificationEmail } = await import('./emailService.js');
        
        // Get user email based on userType
        let userEmail = null;
        if (userType === 'client') {
          const client = await prisma.client.findUnique({
            where: { id: userId },
            select: { email: true }
          });
          userEmail = client?.email;
        } else if (userType === 'artist') {
          const artist = await prisma.artist.findUnique({
            where: { id: userId },
            select: { email: true }
          });
          userEmail = artist?.email;
        } else if (userType === 'admin') {
          const admin = await prisma.admin.findUnique({
            where: { id: userId },
            select: { email: true }
          });
          userEmail = admin?.email;
        }
        
        if (userEmail) {
          await sendNotificationEmail({
            to: userEmail,
            subject: title,
            message: message,
            actionLink: actionLink || ''
          });
          emailSent = true;
        }
      } catch (error) {
        console.error('Error sending email notification:', error);
        // Continue with other notification channels even if email fails
      }
    }

    // TODO: Implement push notifications if preferences.push is true
    // TODO: Implement SMS notifications if preferences.sms is true

    return {
      sent: true,
      channels: {
        inApp: preferences.inApp ? true : false,
        email: emailSent,
        push: false, // Not implemented yet
        sms: false, // Not implemented yet
      },
      notification: inAppNotification,
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * @desc Send a review notification
 * @param {Object} data - The review data
 * @returns {Promise<Object>} The result of the notification sending
 */
export const sendReviewNotification = async (data) => {
  const { review, artist } = data;

  // Notify the artist about the new review
  return await sendNotification({
    userId: artist.id,
    userType: 'artist',
    title: 'New Review',
    message: `You received a new review with an overall rating of ${review.overallExperience}/10.`,
    type: 'review',
    actionLink: `/artist/dashboard/review/${review.id}`,
    metadata: {
      reviewId: review.id,
      rating: review.overallExperience,
    },
  });
};

/**
 * @desc Send a comment notification
 * @param {Object} data - The comment data
 * @returns {Promise<Object>} The result of the notification sending
 */
export const sendCommentNotification = async (data) => {
  const { comment, recipient } = data;

  return await sendNotification({
    userId: recipient.id,
    userType: recipient.role,
    title: 'New Comment',
    message: `Someone commented on your ${comment.type === 'review' ? 'review' : 'portfolio image'}.`,
    type: 'comment',
    actionLink: comment.type === 'review' 
      ? `/review/${comment.reviewId}` 
      : `/artist/dashboard?tab=portfolio`,
    metadata: {
      commentId: comment.id,
      commentType: comment.type,
    },
  });
};

/**
 * @desc Send a healed photo reminder notification
 * @param {Object} data - The reminder data
 * @returns {Promise<Object>} The result of the notification sending
 */
export const sendHealedPhotoReminder = async (data) => {
  const { review, client, timeframe } = data;

  return await sendNotification({
    userId: client.id,
    userType: 'client',
    title: 'Healed Tattoo Photo Reminder',
    message: `It's been ${timeframe} since your tattoo. Time to upload a healed photo!`,
    type: 'healed_photo',
    actionLink: `/review/${review.id}/upload-healed`,
    metadata: {
      reviewId: review.id,
      timeframe,
    },
  });
};

/**
 * @desc Send a system notification to all users or specific user types
 * @param {Object} data - The system notification data
 * @returns {Promise<Object>} The result of the notification sending
 */
export const sendSystemNotification = async (data) => {
  const { title, message, userType, actionLink } = data;

  // If userType is specified, get all users of that type
  let users = [];
  
  if (userType === 'client') {
    users = await prisma.client.findMany({
      select: { id: true },
    });
    users = users.map(user => ({ id: user.id, type: 'client' }));
  } else if (userType === 'artist') {
    users = await prisma.artist.findMany({
      select: { id: true },
    });
    users = users.map(user => ({ id: user.id, type: 'artist' }));
  } else if (userType === 'admin') {
    users = await prisma.admin.findMany({
      select: { id: true },
    });
    users = users.map(user => ({ id: user.id, type: 'admin' }));
  } else {
    // Get all users of all types
    const clients = await prisma.client.findMany({ select: { id: true } });
    const artists = await prisma.artist.findMany({ select: { id: true } });
    const admins = await prisma.admin.findMany({ select: { id: true } });
    
    users = [
      ...clients.map(user => ({ id: user.id, type: 'client' })),
      ...artists.map(user => ({ id: user.id, type: 'artist' })),
      ...admins.map(user => ({ id: user.id, type: 'admin' })),
    ];
  }

  // Send notification to each user
  const results = [];
  for (const user of users) {
    try {
      const result = await sendNotification({
        userId: user.id,
        userType: user.type,
        title,
        message,
        type: 'system',
        actionLink,
      });
      results.push(result);
    } catch (error) {
      console.error(`Error sending system notification to ${user.type} ${user.id}:`, error);
      // Continue with other users even if one fails
    }
  }

  return {
    sent: results.length > 0,
    totalSent: results.filter(r => r.sent).length,
    totalFailed: results.length - results.filter(r => r.sent).length,
  };
};