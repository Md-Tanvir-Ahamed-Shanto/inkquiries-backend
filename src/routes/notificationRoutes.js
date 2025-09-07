import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  createNotification
} from '../controllers/notificationController.js';
import { protectArtist, protectClient, protectAdmin } from '../middleware/auth.js';

const router = express.Router();

// Create a middleware to handle multiple user types
import jwt from 'jsonwebtoken';

const protectUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  
  try {
    // Use the same JWT_SECRET as in auth.js
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
    
    // Decode token directly to determine user type
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Handle tokens with different structures
    if (decoded.id) {
      // Set user based on role in token or infer from context
      const role = decoded.role || (decoded.isAdmin ? 'admin' : decoded.isArtist ? 'artist' : 'client');
      
      req.user = { id: decoded.id, role };
      
      // Also set specific role properties for compatibility
      if (role === 'artist') {
        req.artist = decoded.id;
      } else if (role === 'client') {
        req.client = decoded.id;
      } else if (role === 'admin') {
        req.admin = decoded.id;
      }
      
      next();
    } else {
      // If no ID in token
      return res.status(401).json({ message: 'Not authorized, invalid token format' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Notification routes
router.post('/', protectUser, createNotification); // Create notification endpoint
router.get('/', protectUser, getUserNotifications);
router.put('/:id', protectUser, markNotificationAsRead);
router.put('/mark-all-read', protectUser, markAllNotificationsAsRead);
router.delete('/:id', protectUser, deleteNotification);

// Notification preferences routes
router.get('/preferences', protectUser, getNotificationPreferences);
router.put('/preferences', protectUser, updateNotificationPreferences);

export default router;