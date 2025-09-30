import { Router } from 'express';
import passport from 'passport';
import { 
  login, 
  socialLoginCallback, 
  initiateFacebookAuth, 
  handleFacebookCallback, 
  getInstagramMedia,
  forgotPassword, 
  resetPassword, 
  verifyResetToken 
} from '../controllers/authController.js';

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

// Instagram integration through Facebook (modern approach)
// Use: /auth/facebook?includeInstagram=true&role=client
router.get('/instagram', (req, res) => {
  // Redirect to Facebook OAuth with Instagram scope
  const role = req.query.role || 'client';
  res.redirect(`/auth/facebook?includeInstagram=true&role=${role}`);
});

// Instagram callback (same as Facebook since Instagram goes through Facebook)
router.get('/instagram/callback', handleFacebookCallback);

// Get Instagram media for authenticated users
router.get('/instagram/media', getInstagramMedia);

// Legacy Passport.js routes (for backward compatibility if needed)
// These can be removed once frontend is updated
router.get('/facebook-legacy', (req, res, next) => {
  // Store the role in session if provided
  if (req.query.role) {
    req.session.socialLoginRole = req.query.role;
  }
  passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
});
router.get('/facebook-legacy/callback', passport.authenticate('facebook', { session: false, failureRedirect: '/login' }), socialLoginCallback);

export default router;