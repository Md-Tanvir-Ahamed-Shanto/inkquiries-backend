import { sendReviewNotification, sendCommentNotification, sendHealedPhotoReminder, sendSystemNotification } from '../services/notificationService.js';

/**
 * Utility functions to trigger notifications for various events in the application
 * These functions should be called from the respective controllers
 */

/**
 * Trigger notification when a new review is created
 * @param {Object} review - The newly created review object
 * @param {Object} client - The client who created the review
 * @param {Object} artist - The artist who received the review
 */
export const triggerNewReviewNotification = async (review, client, artist) => {
  try {
    await sendReviewNotification({
      artistId: artist.id,
      reviewId: review.id,
      clientName: client.name || client.username,
      rating: review.rating,
      title: 'New Review Received',
      message: `${client.name || client.username} left you a ${review.rating}-star review.`,
      actionLink: `https://inkquiries.org/reviews/${review.id}`
    });
  } catch (error) {
    console.error('Failed to trigger review notification:', error);
    // Non-blocking - we don't want to fail the main operation if notification fails
  }
};

/**
 * Trigger notification when a new comment is added to a review
 * @param {Object} comment - The newly created comment
 * @param {Object} review - The review that was commented on
 * @param {Object} commenter - The user who created the comment
 * @param {Object} recipient - The user who should receive the notification
 */
export const triggerReviewCommentNotification = async (comment, review, commenter, recipient) => {
  try {
    await sendCommentNotification({
      userId: recipient.id,
      userType: recipient.type, // 'client' or 'artist'
      commentId: comment.id,
      commenterName: commenter.name || commenter.username,
      title: 'New Comment on Your Review',
      message: `${commenter.name || commenter.username} commented on your review.`,
      actionLink: `https://inkquiries.org/reviews/${review.id}#comment-${comment.id}`
    });
  } catch (error) {
    console.error('Failed to trigger comment notification:', error);
  }
};

/**
 * Trigger notification when a new comment is added to a portfolio image
 * @param {Object} comment - The newly created comment
 * @param {Object} portfolioImage - The portfolio image that was commented on
 * @param {Object} commenter - The user who created the comment
 * @param {Object} artist - The artist who owns the portfolio image
 */
export const triggerPortfolioCommentNotification = async (comment, portfolioImage, commenter, artist) => {
  try {
    await sendCommentNotification({
      userId: artist.id,
      userType: 'artist',
      commentId: comment.id,
      commenterName: commenter.name || commenter.username,
      title: 'New Comment on Your Portfolio',
      message: `${commenter.name || commenter.username} commented on your portfolio image.`,
      actionLink: `https://inkquiries.org/portfolio/${portfolioImage.id}#comment-${comment.id}`
    });
  } catch (error) {
    console.error('Failed to trigger portfolio comment notification:', error);
  }
};

/**
 * Trigger reminder for client to upload healed photo
 * @param {Object} review - The review that needs a healed photo
 * @param {Object} client - The client who should upload the healed photo
 */
export const triggerHealedPhotoReminder = async (review, client) => {
  try {
    await sendHealedPhotoReminder({
      clientId: client.id,
      reviewId: review.id,
      title: 'Reminder: Upload Healed Photo',
      message: 'Please upload a photo of your healed tattoo to complete your review.',
      actionLink: `https://inkquiries.org/reviews/${review.id}/edit`
    });
  } catch (error) {
    console.error('Failed to trigger healed photo reminder:', error);
  }
};

/**
 * Trigger system notification for all users or specific user types
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.type - Notification type (e.g., 'system', 'promotion')
 * @param {string} [options.userType] - Optional user type filter ('client', 'artist', 'admin')
 * @param {string} [options.actionLink] - Optional action link
 */
export const triggerSystemNotification = async (options) => {
  try {
    await sendSystemNotification(options);
  } catch (error) {
    console.error('Failed to trigger system notification:', error);
  }
};