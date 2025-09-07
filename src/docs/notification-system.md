# Notification System Documentation

## Overview

The notification system provides a comprehensive solution for sending and managing notifications to users in the Inkquiries Tattoo platform. It supports multiple notification types and delivery channels, with user-configurable preferences.

## Models

### Notification

Stores individual notifications sent to users:

- `id`: Unique identifier
- `userId`: ID of the recipient user
- `userType`: Type of user (client, artist, admin)
- `title`: Notification title
- `message`: Notification content
- `type`: Type of notification (review, comment, system, etc.)
- `read`: Boolean indicating if notification has been read
- `actionLink`: Optional URL for the notification action
- `metadata`: JSON field for additional context
- `createdAt`: Timestamp when notification was created
- `updatedAt`: Timestamp when notification was last updated

### NotificationPreference

Stores user preferences for receiving notifications:

- `id`: Unique identifier
- `userId`: ID of the user
- `userType`: Type of user (client, artist, admin)
- `email`: Boolean for email notifications
- `inApp`: Boolean for in-app notifications
- `push`: Boolean for push notifications
- `sms`: Boolean for SMS notifications
- `reviewNotifications`: Boolean for review-related notifications
- `commentNotifications`: Boolean for comment-related notifications
- `messageNotifications`: Boolean for message-related notifications
- `systemNotifications`: Boolean for system notifications
- `promotionNotifications`: Boolean for promotion notifications
- `healedPhotoReminders`: Boolean for healed photo reminders
- `createdAt`: Timestamp when preferences were created
- `updatedAt`: Timestamp when preferences were last updated

## API Endpoints

### Notifications

- `GET /api/notifications` - Get user's notifications (paginated)
- `POST /api/notifications` - Create a new notification (admin only)
- `PUT /api/notifications/:id/read` - Mark a notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete a notification
- `DELETE /api/notifications` - Delete all notifications for a user

### Notification Preferences

- `GET /api/notification-preferences` - Get user's notification preferences
- `PUT /api/notification-preferences` - Update user's notification preferences
- `PUT /api/notification-preferences/email` - Update email notification preferences
- `PUT /api/notification-preferences/types` - Update notification type preferences

## Notification Types

- `review`: Notifications about new reviews
- `comment`: Notifications about new comments
- `system`: System-wide notifications
- `promotion`: Marketing or promotional notifications
- `healedPhoto`: Reminders to upload healed tattoo photos

## Notification Triggers

The system automatically triggers notifications for the following events:

1. **New Review**: When a client creates a review for an artist
2. **Review Comment**: When someone comments on a review
3. **Portfolio Comment**: When someone comments on a portfolio image
4. **Healed Photo Reminder**: Reminders for clients to upload healed tattoo photos
5. **System Notifications**: Admin-initiated notifications to all users or specific user groups

## Implementation Details

### Notification Service

The `notificationService.js` handles the core notification logic:

- Checking user preferences before sending notifications
- Creating notifications in the database
- Supporting multiple notification channels (currently in-app, with placeholders for email, push, and SMS)

### Notification Triggers

The `notificationTriggers.js` utility provides functions to trigger notifications from various controllers:

- `triggerNewReviewNotification`: Called from reviewController when a new review is created
- `triggerReviewCommentNotification`: Called from commentController when a review comment is added
- `triggerPortfolioCommentNotification`: Called from commentController when a portfolio comment is added
- `triggerHealedPhotoReminder`: For sending reminders to upload healed photos
- `triggerSystemNotification`: For sending system-wide notifications

## Future Enhancements

1. **Email Integration**: Implement email delivery using a service like SendGrid or AWS SES
2. **Push Notifications**: Add support for mobile push notifications
3. **SMS Notifications**: Integrate with SMS delivery services
4. **Notification Templates**: Create customizable templates for different notification types
5. **Batch Processing**: Implement batch processing for high-volume notifications
6. **Read Receipts**: Track when notifications are viewed by users