import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendNotification } from '../services/notificationService.js';
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