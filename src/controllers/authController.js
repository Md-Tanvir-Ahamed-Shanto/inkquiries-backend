import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendNotification } from '../services/notificationService.js';
import { sendEmail } from '../services/emailService.js';
import dotenv from 'dotenv';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

/**
 * Generates a JWT token for a given user ID and role.
 * @param {string} id - The user's ID.
 * @param {string} role - The user's role (e.g., 'admin', 'client', 'artist').
 * @returns {string} The signed JWT token.
 */
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: '1d',
  });
};

/**
 * Handles the unified login by checking all user tables for a match.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
/**
 * Handles the callback from social login providers (Facebook, Instagram).
 * @param {object} req - The request object with authenticated user from Passport.
 * @param {object} res - The response object.
 */
export const socialLoginCallback = async (req, res) => {
  try {
    // The user object is attached by Passport after successful authentication
    const { user } = req;
    
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=Authentication failed`);
    }
    
    // User object should already have token and role attached by the Passport strategy
    const { token, role } = user;
    
    // Set cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    const { password: _, ...userData } = user;
    res.cookie('user', JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    // Send notification for successful login
    try {
      await sendNotification({
        userId: user.id,
        userType: role,
        title: 'Successful Social Login',
        message: `You have successfully logged in with ${user.socialLogin?.provider || 'social media'}.`,
        type: 'system',
        actionLink: `/${role}/dashboard`
      });
    } catch (notificationError) {
      console.error('Error sending social login notification:', notificationError);
      // Continue even if notification fails
    }
    
    // Redirect to the appropriate dashboard based on role
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/${role}/dashboard`);
  } catch (error) {
    console.error('Error during social login callback:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=Server error`);
  }
};

/**
 * Request a password reset email
 * @param {object} req - The request object
 * @param {object} res - The response object
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Please provide an email address.' });
    }
    
    // Check which user type the email belongs to
    let user;
    let userType;
    
    // Check Admin table first
    user = await prisma.admin.findUnique({ where: { email } });
    if (user) {
      userType = 'admin';
    } else {
      // If not Admin, check Client table
      user = await prisma.client.findUnique({ where: { email } });
      if (user) {
        userType = 'client';
      } else {
        // If not Client, check Artist table
        user = await prisma.artist.findUnique({ where: { email } });
        if (user) {
          userType = 'artist';
        }
      }
    }
    
    if (!user) {
      // Don't reveal that the email doesn't exist for security reasons
      return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link.' });
    }
    
    // Generate a random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token for security
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Set token expiry (1 hour from now)
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    
    // Update the user record with the reset token
    if (userType === 'admin') {
      await prisma.admin.update({
        where: { id: user.id },
        data: {
          resetPasswordToken,
          resetTokenExpiry
        }
      });
    } else if (userType === 'client') {
      await prisma.client.update({
        where: { id: user.id },
        data: {
          resetPasswordToken,
          resetTokenExpiry
        }
      });
    } else if (userType === 'artist') {
      await prisma.artist.update({
        where: { id: user.id },
        data: {
          resetPasswordToken,
          resetTokenExpiry
        }
      });
    }
    
    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}?type=${userType}`;
    
    // Send email with reset link
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });
    
    // Send notification
    try {
      await sendNotification({
        userId: user.id,
        userType,
        title: 'Password Reset Requested',
        message: 'You have requested a password reset. Check your email for instructions.',
        type: 'system'
      });
    } catch (notificationError) {
      console.error('Error sending password reset notification:', notificationError);
      // Continue even if notification fails
    }
    
    res.status(200).json({ message: 'If your email is registered, you will receive a password reset link.' });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
};

/**
 * Reset password with token
 * @param {object} req - The request object
 * @param {object} res - The response object
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, password, userType } = req.body;
    
    if (!token || !password || !userType) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    
    // Hash the token from the URL
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    let user;
    
    // Find user with the token and check if token is still valid
    if (userType === 'admin') {
      user = await prisma.admin.findFirst({
        where: {
          resetPasswordToken,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      });
    } else if (userType === 'client') {
      user = await prisma.client.findFirst({
        where: {
          resetPasswordToken,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      });
    } else if (userType === 'artist') {
      user = await prisma.artist.findFirst({
        where: {
          resetPasswordToken,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      });
    } else {
      return res.status(400).json({ error: 'Invalid user type.' });
    }
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Update user with new password and clear reset token fields
    if (userType === 'admin') {
      await prisma.admin.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetTokenExpiry: null
        }
      });
    } else if (userType === 'client') {
      await prisma.client.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetTokenExpiry: null
        }
      });
    } else if (userType === 'artist') {
      await prisma.artist.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetTokenExpiry: null
        }
      });
    }
    
    // Send notification about successful password reset
    try {
      await sendNotification({
        userId: user.id,
        userType,
        title: 'Password Reset Successful',
        message: 'Your password has been successfully reset.',
        type: 'system'
      });
    } catch (notificationError) {
      console.error('Error sending password reset success notification:', notificationError);
      // Continue even if notification fails
    }
    
    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Successful',
      html: `
        <h1>Password Reset Successful</h1>
        <p>Your password has been successfully reset.</p>
        <p>If you did not perform this action, please contact support immediately.</p>
      `
    });
    
    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ error: 'An error occurred while resetting your password.' });
  }
};

/**
 * Verify reset token validity
 * @param {object} req - The request object
 * @param {object} res - The response object
 */
export const verifyResetToken = async (req, res) => {
  try {
    const { token, userType } = req.params;
    
    if (!token || !userType) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }
    
    // Hash the token from the URL
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    let user;
    
    // Find user with the token and check if token is still valid
    if (userType === 'admin') {
      user = await prisma.admin.findFirst({
        where: {
          resetPasswordToken,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      });
    } else if (userType === 'client') {
      user = await prisma.client.findFirst({
        where: {
          resetPasswordToken,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      });
    } else if (userType === 'artist') {
      user = await prisma.artist.findFirst({
        where: {
          resetPasswordToken,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      });
    } else {
      return res.status(400).json({ error: 'Invalid user type.' });
    }
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }
    
    res.status(200).json({ message: 'Token is valid.', email: user.email });
  } catch (error) {
    console.error('Error in verifyResetToken:', error);
    res.status(500).json({ error: 'An error occurred while verifying the token.' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide an email and password.' });
  }

  try {
    let user;
    let role;

    // Check Admin table first
    user = await prisma.admin.findUnique({ where: { email } });
    if (user) {
      role = 'admin';
    } else {
      // If not Admin, check Client table
      user = await prisma.client.findUnique({ where: { email } });
      if (user) {
        role = 'client';
      } else {
        // If not Client, check Artist table
        user = await prisma.artist.findUnique({ where: { email } });
        if (user) {
          role = 'artist';
        }
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if(!user.isActive){
      return res.status(401).json({ message: 'Your Account is not active Contact in support' });
    }

    const token = generateToken(user.id, role);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.cookie('user', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    const { password: _, ...userData } = user; // Destructure to remove password

    // Send notification for successful login
    try {
      await sendNotification({
        userId: user.id,
        userType: role,
        title: 'Successful Login',
        message: `You have successfully logged in from a ${req.headers['user-agent'] ? req.headers['user-agent'].split('/')[0] : 'new'} device.`,
        type: 'system',
        actionLink: `/${role}/dashboard`
      });
    } catch (notificationError) {
      console.error('Error sending login notification:', notificationError);
      // Continue even if notification fails
    }

    res.status(200).json({ message: 'Login successful.', token, user: userData, role });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Could not log in.' });
  }
};