import { Router } from 'express';
import passport from 'passport';
import { login, socialLoginCallback } from '../controllers/authController.js';

const router = Router();

// Single login endpoint, no role needed in the URL
router.post('/login', login);

// Facebook OAuth routes
router.get('/facebook', (req, res, next) => {
  // Store the role in session if provided
  if (req.query.role) {
    req.session.socialLoginRole = req.query.role;
  }
  passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
});
router.get('/facebook/callback', passport.authenticate('facebook', { session: false, failureRedirect: '/login' }), socialLoginCallback);

// Instagram OAuth routes
router.get('/instagram', (req, res, next) => {
  // Store the role in session if provided
  if (req.query.role) {
    req.session.socialLoginRole = req.query.role;
  }
  passport.authenticate('instagram')(req, res, next);
});
router.get('/instagram/callback', passport.authenticate('instagram', { session: false, failureRedirect: '/login' }), socialLoginCallback);

export default router;