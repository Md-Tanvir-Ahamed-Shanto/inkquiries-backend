import { Router } from 'express';
import { 
  login, 
  initiateFacebookAuth, 
  handleFacebookCallback, 
  initiateInstagramAuth,
  handleInstagramCallback,
  getInstagramMedia,
  forgotPassword, 
  resetPassword, 
  verifyResetToken 
} from '../controllers/authController.js';
import { protectUser } from '../middleware/auth.js';

const router = Router();

// Single login endpoint, no role needed in the URL
router.post('/login', login);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-reset-token/:token/:userType', verifyResetToken);

// Modern OAuth routes (replaces Passport.js)
// Facebook OAuth with optional Instagram integration
router.get('/facebook', initiateFacebookAuth);
router.get('/facebook/callback', handleFacebookCallback);

// Instagram OAuth (direct Instagram Business Login)
router.get('/instagram', initiateInstagramAuth);
router.get('/instagram/callback', handleInstagramCallback);

// Get Instagram media for authenticated users
router.get('/instagram/media', protectUser, getInstagramMedia);

// Legacy Passport.js routes removed - using modern OAuth service only

export default router;