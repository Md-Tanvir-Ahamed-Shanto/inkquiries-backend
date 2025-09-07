import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendNotification } from '../services/notificationService.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const createClient = async (req, res) => {
  const { username, email, password, name, profilePhoto, location, socialLinks, socialLogin } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Please provide a username, email, and password.' });
  }
  try {
    const hashedPassword = await hashPassword(password);
    const newClient = await prisma.client.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name,
        profilePhoto,
        location,
        socialLinks,
        socialLogin,
      },
    });
    const { password: _, ...clientData } = newClient;
    
    // Send welcome notification to the new client
    try {
      await sendNotification({
        userId: newClient.id,
        userType: 'client',
        title: 'Welcome to Inkquiries',
        message: 'Thank you for registering! Start exploring tattoo artists and reviews.',
        type: 'system',
        actionLink: '/client/dashboard'
      });
    } catch (notificationError) {
      console.error('Error sending welcome notification:', notificationError);
      // Continue even if notification fails
    }
    
    res.status(201).json(clientData);
  } catch (error) {
    console.error('Error creating client:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A user with this username or email already exists.' });
    }
    res.status(500).json({ error: 'Could not create client.' });
  }
};

export const loginClient = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide an email and password.' });
  }
  try {
    const client = await prisma.client.findUnique({ where: { email } });
    if (!client) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ id: client.id }, JWT_SECRET, { expiresIn: '1h' });
    const { password: _, ...clientData } = client;
    
    // Send notification for successful login
    try {
      await sendNotification({
        userId: client.id,
        userType: 'client',
        title: 'Successful Login',
        message: `You have successfully logged in from a ${req.headers['user-agent'] ? req.headers['user-agent'].split('/')[0] : 'new'} device.`,
        type: 'system',
        actionLink: '/client/dashboard'
      });
    } catch (notificationError) {
      console.error('Error sending login notification:', notificationError);
      // Continue even if notification fails
    }
    
    res.status(200).json({ message: 'Login successful.', token, client: clientData });
  } catch (error) {
    console.error('Error during client login:', error);
    res.status(500).json({ error: 'Could not log in.' });
  }
};

export const logoutClient = (req, res) => {
  res.status(200).json({ message: 'Logout successful.' });
};

export const getClientById = async (req, res) => {
  const { id } = req.params;
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        profilePhoto: true,
        location: true,
        socialLinks: true,
        createdAt: true,
      },
    });
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }
    res.status(200).json(client);
  } catch (error) {
    console.error('Error fetching client by ID:', error);
    res.status(500).json({ error: 'Could not retrieve client.' });
  }
};

export const updateClient = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  try {
    const updatedClient = await prisma.client.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        profilePhoto: true,
        location: true,
        socialLinks: true,
        createdAt: true,
      },
    });
    res.status(200).json(updatedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Client not found.' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Username or email already in use.' });
    }
    res.status(500).json({ error: 'Could not update client.' });
  }
};

export const deleteClient = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.client.delete({ where: { id } });
    res.status(200).json({ message: 'Client deleted successfully.' });
  } catch (error) {
    console.error('Error deleting client:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Client not found.' });
    }
    res.status(500).json({ error: 'Could not delete client.' });
  }
};

export const uploadProfilePhoto = async (req, res) => {
  const { id } = req.params;
  // Use the ID from the URL parameters directly since we're not using auth middleware here

  if (!req.file) {
    return res.status(400).json({ error: 'No profile photo uploaded.' });
  }

  try {
    const photoUrl = `/uploads/profile_images/${req.file.filename}`;

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        profilePhoto: photoUrl,
      },
      select: {
        id: true,
        profilePhoto: true,
      },
    });

    res.status(200).json({
      message: 'Profile photo uploaded successfully.',
      profilePhoto: updatedClient.profilePhoto
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ error: 'Could not upload profile photo.' });
  }
};

export const deleteProfilePhoto = async (req, res) => {
  const { id } = req.params;
  // Use the ID from the URL parameters directly since we're not using auth middleware here

  try {
    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        profilePhoto: null,
      },
      select: {
        id: true,
      },
    });

    res.status(200).json({ message: 'Profile photo deleted successfully.' });
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    res.status(500).json({ error: 'Could not delete profile photo.' });
  }
};

export const getProfilePhoto = async (req, res) => {
  const { id } = req.params;

  try {
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        profilePhoto: true,
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    res.status(200).json({ profilePhoto: client.profilePhoto });
  } catch (error) {
    console.error('Error fetching profile photo:', error);
    res.status(500).json({ error: 'Could not retrieve profile photo.' });
  }
};



// --- Account Management ---

export const changeEmail = async (req, res) => {
  const { id } = req.params;
  const { newEmail, password } = req.body;

  if (!newEmail || !password) {
    return res.status(400).json({ error: 'Please provide new email and current password.' });
  }

  try {
    // Find the client
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    // Check if email is already in use
    const existingClient = await prisma.client.findUnique({ where: { email: newEmail } });
    if (existingClient && existingClient.id !== id) {
      return res.status(400).json({ error: 'Email already in use.' });
    }

    // Update email
    const updatedClient = await prisma.client.update({
      where: { id },
      data: { email: newEmail },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
      },
    });

    res.status(200).json({ message: 'Email updated successfully.', client: updatedClient });
  } catch (error) {
    console.error('Error changing email:', error);
    res.status(500).json({ error: 'Could not change email.' });
  }
};

export const changePassword = async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Please provide current password, new password, and confirm password.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New password and confirm password do not match.' });
  }

  try {
    // Find the client
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, client.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid current password.' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.client.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Could not change password.' });
  }
};

export const disableClient = async (req, res) => {
  const { id } = req.params;
  
  try {
    await prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
    res.status(200).json({ message: 'Client account disabled successfully.' });
  } catch (error) {
    console.error('Error disabling client account:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Client not found.' });
    }
    res.status(500).json({ error: 'Could not disable client account.' });
  }
};