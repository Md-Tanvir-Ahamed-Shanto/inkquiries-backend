import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendSystemNotification, sendNotification } from '../services/notificationService.js';

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const prisma = new PrismaClient();

// Dashboard overview data controller
export const getDashboardOverview = async (req, res) => {
  try {
    // Get counts of various entities
    const clientsCount = await prisma.client.count();
    const artistsCount = await prisma.artist.count();
    const reviewsCount = await prisma.review.count();
    const adminsCount = await prisma.admin.count();
    
    // Get recent activities (from admin logs)
    const recentActivities = await prisma.adminLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { admin: true }
    });
    
    // Get review statistics
    const reviews = await prisma.review.findMany({
      select: {
        overallExperience: true,
        createdAt: true
      }
    });
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.overallExperience, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    // Calculate growth rates (comparing current month to previous month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const currentMonthReviews = reviews.filter(r => new Date(r.createdAt) >= currentMonthStart).length;
    const previousMonthReviews = reviews.filter(r => 
      new Date(r.createdAt) >= previousMonthStart && 
      new Date(r.createdAt) < currentMonthStart
    ).length;
    
    const reviewGrowthRate = previousMonthReviews > 0 
      ? ((currentMonthReviews - previousMonthReviews) / previousMonthReviews) * 100 
      : 0;
    
    res.status(200).json({
      stats: {
        clientsCount,
        artistsCount,
        reviewsCount,
        adminsCount,
        averageRating,
        reviewGrowthRate: reviewGrowthRate.toFixed(1) + '%'
      },
      recentActivities
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Could not retrieve dashboard data.' });
  }
};


const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const createAdmin = async (req, res) => {
  const { email, password, name, profilePhoto, isSuper } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide an email and password.' });
  }

  try {
    const hashedPassword = await hashPassword(password);
    const newAdmin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        profilePhoto,
        isSuper: isSuper || false,
      },
    });
    const { password: _, ...adminData } = newAdmin;
    
    // Send welcome notification to the new admin
    try {
      await sendNotification({
        userId: newAdmin.id,
        userType: 'admin',
        title: 'Welcome to Inkquiries Admin',
        message: 'Your admin account has been created successfully. You can now manage the platform.',
        type: 'system',
        actionLink: '/admin'
      });
    } catch (notificationError) {
      console.error('Error sending welcome notification:', notificationError);
      // Continue even if notification fails
    }
    
    res.status(201).json(adminData);
  } catch (error) {
    console.error('Error creating admin:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'An admin with this email already exists.' });
    }
    res.status(500).json({ error: 'Could not create admin.' });
  }
};

export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide an email and password.' });
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ id: admin.id, role: 'admin' }, JWT_SECRET, {
      expiresIn: '1h',
    });

    const { password: _, ...adminData } = admin;
    
    // Send notification for successful login
    try {
      await sendNotification({
        userId: admin.id,
        userType: 'admin',
        title: 'Successful Login',
        message: `You have successfully logged in from a ${req.headers['user-agent'] ? req.headers['user-agent'].split('/')[0] : 'new'} device.`,
        type: 'system',
        actionLink: '/admin'
      });
    } catch (notificationError) {
      console.error('Error sending login notification:', notificationError);
      // Continue even if notification fails
    }
    
    res.status(200).json({ message: 'Login successful.', token, admin: adminData });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ error: 'Could not log in.' });
  }
};

export const logoutAdmin = (req, res) => {
  res.status(200).json({ message: 'Logout successful.' });
};

export const getAllAdmins = async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        profilePhoto: true,
        isSuper: true,
        createdAt: true,
      },
    });
    res.status(200).json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Could not retrieve admins.' });
  }
};

export const getAdminById = async (req, res) => {
  const { id } = req.params;
  try {
    const admin = await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        profilePhoto: true,
        isSuper: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    res.status(200).json(admin);
  } catch (error) {
    console.error('Error fetching admin by ID:', error);
    res.status(500).json({ error: 'Could not retrieve admin.' });
  }
};

export const updateAdmin = async (req, res) => {
  const { id } = req.params;
  const { name, profilePhoto, isSuper } = req.body;

  try {
    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data: { name, profilePhoto, isSuper },
      select: {
        id: true,
        email: true,
        name: true,
        profilePhoto: true,
        isSuper: true,
        createdAt: true,
      },
    });

    res.status(200).json(updatedAdmin);
  } catch (error) {
    console.error('Error updating admin:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Admin not found.' });
    }
    res.status(500).json({ error: 'Could not update admin.' });
  }
};

export const deleteAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.admin.delete({
      where: { id },
    });
    res.status(200).json({ message: 'Admin deleted successfully.' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Admin not found.' });
    }
    res.status(500).json({ error: 'Could not delete admin.' });
  }
};

// Review Management Controllers

// Get all reviews with pagination and filtering
export const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, artistId, clientId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (page - 1) * parseInt(limit);
    
    // Build filter conditions
    const where = {};
    if (status) where.status = status;
    if (artistId) where.artistId = artistId;
    if (clientId) where.clientId = clientId;
    
    // Get reviews with pagination
    const reviews = await prisma.review.findMany({
      skip,
      take: parseInt(limit),
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePhoto: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePhoto: true
          }
        },
        likes: true,
        comments: true
      }
    });
    
    // Get total count for pagination
    const totalReviews = await prisma.review.count({ where });
    
    res.status(200).json({
      reviews,
      pagination: {
        total: totalReviews,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalReviews / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Could not retrieve reviews.' });
  }
};

// Get a single review by ID
export const getReviewById = async (req, res) => {
  const { id } = req.params;
  try {
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePhoto: true,
            location: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePhoto: true
          }
        },
        likes: true,
        comments: {
          include: {
            client: {
              select: {
                name: true,
                profilePhoto: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        reports: {
          include: {
            reporter: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        }
      }
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    
    res.status(200).json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Could not retrieve review.' });
  }
};

// Update review status (restrict/unrestrict)
export const updateReviewStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const adminId = req.user.id; // Assuming middleware sets req.user
  
  try {
    // Update the review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: { status }
    });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: status === 'RESTRICTED' ? 'RESTRICT_REVIEW' : 'UNRESTRICT_REVIEW',
        targetType: 'REVIEW',
        targetId: id,
        details: { reason }
      }
    });
    
    res.status(200).json({
      message: `Review ${status === 'RESTRICTED' ? 'restricted' : 'unrestricted'} successfully.`,
      review: updatedReview
    });
  } catch (error) {
    console.error('Error updating review status:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Review not found.' });
    }
    res.status(500).json({ error: 'Could not update review status.' });
  }
};

// Delete a review
export const deleteReview = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id; // Assuming middleware sets req.user
  
  try {
    // Get review details before deletion for logging
    const review = await prisma.review.findUnique({
      where: { id },
      select: { artistId: true, clientId: true }
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    
    // Delete the review
    await prisma.review.delete({
      where: { id }
    });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_REVIEW',
        targetType: 'REVIEW',
        targetId: id,
        details: {
          artistId: review.artistId,
          clientId: review.clientId
        }
      }
    });
    
    res.status(200).json({ message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('Error deleting review:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Review not found.' });
    }
    res.status(500).json({ error: 'Could not delete review.' });
  }
};

// Promotion Management Controllers

// Get all promotions with pagination and filtering
export const getAllPromotions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, artistId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (page - 1) * parseInt(limit);
    
    // Build filter conditions
    const where = {};
    if (status) where.isActive = status === 'Active';
    if (artistId) where.artistId = artistId;
    
    // Get promotions with pagination
    const promotions = await prisma.promotion.findMany({
      skip,
      take: parseInt(limit),
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePhoto: true
          }
        }
      }
    });
    
    // Get total count for pagination
    const totalPromotions = await prisma.promotion.count({ where });
    
    res.status(200).json({
      promotions,
      pagination: {
        total: totalPromotions,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalPromotions / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: 'Could not retrieve promotions.' });
  }
};

// Get a single promotion by ID
export const getPromotionById = async (req, res) => {
  const { id } = req.params;
  try {
    const promotion = await prisma.promotion.findUnique({
      where: { id },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePhoto: true,
            location: true
          }
        }
      }
    });
    
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found.' });
    }
    
    res.status(200).json(promotion);
  } catch (error) {
    console.error('Error fetching promotion:', error);
    res.status(500).json({ error: 'Could not retrieve promotion.' });
  }
};

// Create a new promotion
export const createPromotion = async (req, res) => {
  const { artistId, title, description, price, isActive } = req.body;
  const adminId = req.user.id; // Assuming middleware sets req.user
  
  try {
    // Check if artist exists
    const artist = await prisma.artist.findUnique({
      where: { id: artistId }
    });
    
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found.' });
    }
    
    // Create the promotion
    const newPromotion = await prisma.promotion.create({
      data: {
        artistId,
        title,
        description,
        price: price ? parseFloat(price) : null,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'CREATE_PROMOTION',
        targetType: 'PROMOTION',
        targetId: newPromotion.id,
        details: { artistId }
      }
    });
    
    res.status(201).json({
      message: 'Promotion created successfully.',
      promotion: newPromotion
    });
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ error: 'Could not create promotion.' });
  }
};

// Update a promotion
export const updatePromotion = async (req, res) => {
  const { id } = req.params;
  const { title, description, price, isActive } = req.body;
  const adminId = req.user.id; // Assuming middleware sets req.user
  
  try {
    // Update the promotion
    const updatedPromotion = await prisma.promotion.update({
      where: { id },
      data: {
        title,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        isActive
      }
    });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_PROMOTION',
        targetType: 'PROMOTION',
        targetId: id,
        details: { artistId: updatedPromotion.artistId }
      }
    });
    
    res.status(200).json({
      message: 'Promotion updated successfully.',
      promotion: updatedPromotion
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Promotion not found.' });
    }
    res.status(500).json({ error: 'Could not update promotion.' });
  }
};

// Delete a promotion
export const deletePromotion = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id; // Assuming middleware sets req.user
  
  try {
    // Get promotion details before deletion for logging
    const promotion = await prisma.promotion.findUnique({
      where: { id },
      select: { artistId: true }
    });
    
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found.' });
    }
    
    // Delete the promotion
    await prisma.promotion.delete({
      where: { id }
    });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_PROMOTION',
        targetType: 'PROMOTION',
        targetId: id,
        details: { artistId: promotion.artistId }
      }
    });
    
    res.status(200).json({ message: 'Promotion deleted successfully.' });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Promotion not found.' });
    }
    res.status(500).json({ error: 'Could not delete promotion.' });
  }
};

// Admin Settings Controllers

// Get admin profile
export const getAdminProfile = async (req, res) => {
  const adminId = req.user.id; // Assuming middleware sets req.user
  
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        profilePhoto: true,
        isSuper: true,
        createdAt: true
      }
    });
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }
    
    res.status(200).json(admin);
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ error: 'Could not retrieve admin profile.' });
  }
};

// Update admin profile
export const updateAdminProfile = async (req, res) => {
  const adminId = req.user.id; // Assuming middleware sets req.user
  const { name, email, profilePhoto } = req.body;
  
  try {
    // Check if email is already taken by another admin
    if (email) {
      const existingAdmin = await prisma.admin.findUnique({
        where: { email }
      });
      
      if (existingAdmin && existingAdmin.id !== adminId) {
        return res.status(400).json({ error: 'Email is already in use.' });
      }
    }
    
    // Update admin profile
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: { name, email, profilePhoto },
      select: {
        id: true,
        email: true,
        name: true,
        profilePhoto: true,
        isSuper: true,
        createdAt: true
      }
    });
    
    res.status(200).json({
      message: 'Profile updated successfully.',
      admin: updatedAdmin
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Admin not found.' });
    }
    res.status(500).json({ error: 'Could not update admin profile.' });
  }
};

// Change admin password
export const changeAdminPassword = async (req, res) => {
  const adminId = req.user.id; // Assuming middleware sets req.user
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  
  try {
    // Get admin with password
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedPassword }
    });
    
    // Log the password change
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'CHANGE_PASSWORD',
        targetType: 'ADMIN',
        targetId: adminId,
        details: { timestamp: new Date() }
      }
    });
    
    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Error changing admin password:', error);
    res.status(500).json({ error: 'Could not change password.' });
  }
};

// Upload admin profile photo
export const uploadAdminProfilePhoto = async (req, res) => {
  const adminId = req.user.id; // Assuming middleware sets req.user
  
  // Assuming file upload middleware has processed the file and added it to req.file
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  
  try {
    // Get file path or URL from upload middleware
    const profilePhoto = `/uploads/profile_images/${req.file.filename}`;
    
    // Update admin profile with new photo URL
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: { profilePhoto },
      select: {
        id: true,
        profilePhoto: true
      }
    });
    
    res.status(200).json({
      message: 'Profile photo uploaded successfully.',
      profilePhoto: updatedAdmin.profilePhoto
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ error: 'Could not upload profile photo.' });
  }
};

// Delete admin profile photo
export const deleteAdminProfilePhoto = async (req, res) => {
  const adminId = req.user.id; // Assuming middleware sets req.user
  
  try {
    // Update admin profile to remove photo
    await prisma.admin.update({
      where: { id: adminId },
      data: { profilePhoto: null }
    });
    
    res.status(200).json({ message: 'Profile photo deleted successfully.' });
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    res.status(500).json({ error: 'Could not delete profile photo.' });
  }
};

// Subscription Plan Management

// Get all subscription plans
export const getAllSubscriptionPlans = async (req, res) => {
  try {
    const subscriptionPlans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' }
    });
    
    res.status(200).json({ plans: subscriptionPlans });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ error: 'Could not retrieve subscription plans.' });
  }
};

// Get subscription plan by ID
export const getSubscriptionPlanById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const subscriptionPlan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });
    
    if (!subscriptionPlan) {
      return res.status(404).json({ error: 'Subscription plan not found.' });
    }
    
    res.status(200).json(subscriptionPlan);
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    res.status(500).json({ error: 'Could not retrieve subscription plan.' });
  }
};

// Create subscription plan
export const createSubscriptionPlan = async (req, res) => {
  const { name, description, price, duration, features, isActive } = req.body;
  const adminId = req.user.id; // Assuming middleware sets req.user
  
  try {
    // Create the subscription plan
    const subscriptionPlan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        duration: parseInt(duration),
        features,
        isActive: isActive ?? true
      }
    });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'CREATE_SUBSCRIPTION_PLAN',
        targetType: 'SUBSCRIPTION_PLAN',
        targetId: subscriptionPlan.id,
        details: { name, price }
      }
    });
    
    res.status(201).json({
      message: 'Subscription plan created successfully.',
      subscriptionPlan
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({ error: 'Could not create subscription plan.' });
  }
};

// Update subscription plan
export const updateSubscriptionPlan = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, duration, features, isActive } = req.body;
  const adminId = req.user.id; // Assuming middleware sets req.user
  
  try {
    // Check if plan exists
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });
    
    if (!existingPlan) {
      return res.status(404).json({ error: 'Subscription plan not found.' });
    }
    
    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (duration !== undefined) updateData.duration = parseInt(duration);
    if (features !== undefined) updateData.features = features;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Update the subscription plan
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData
    });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_SUBSCRIPTION_PLAN',
        targetType: 'SUBSCRIPTION_PLAN',
        targetId: id,
        details: { previousName: existingPlan.name, newName: name || existingPlan.name }
      }
    });
    
    res.status(200).json({
      message: 'Subscription plan updated successfully.',
      subscriptionPlan: updatedPlan
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Subscription plan not found.' });
    }
    res.status(500).json({ error: 'Could not update subscription plan.' });
  }
};

// Delete subscription plan
export const deleteSubscriptionPlan = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id; // Assuming middleware sets req.user
  
  try {
    // Get plan details before deletion for logging
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      select: { name: true }
    });
    
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found.' });
    }
    
    // Check if plan is in use by any artists
    const subscriptionsUsingPlan = await prisma.artistSubscription.count({
      where: { planId: id }
    });
    
    if (subscriptionsUsingPlan > 0) {
      return res.status(400).json({
        error: 'Cannot delete plan that is currently in use by artists.',
        subscriptionsCount: subscriptionsUsingPlan
      });
    }
    
    // Delete the subscription plan
    await prisma.subscriptionPlan.delete({
      where: { id }
    });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_SUBSCRIPTION_PLAN',
        targetType: 'SUBSCRIPTION_PLAN',
        targetId: id,
        details: { name: plan.name }
      }
    });
    
    res.status(200).json({ message: 'Subscription plan deleted successfully.' });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Subscription plan not found.' });
    }
    res.status(500).json({ error: 'Could not delete subscription plan.' });
  }
};

// Client Management Functions

// Get all clients with optional filtering
export const getAllClients = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (page - 1) * parseInt(limit);
    
    // Build filter conditions
    const where = {};
    if (status) where.isActive = status === 'Active';
    
    // Get clients with pagination
    const clients = await prisma.client.findMany({
      skip,
      take: parseInt(limit),
      where,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        profilePhoto: true,
        location: true,
        isActive: true,
        lastLogin: true,
        socialLinks: true,
        socialLogin: true,
        createdAt: true,
      }
    });
    
    // Get total count for pagination
    const totalClients = await prisma.client.count({ where });
    
    
    res.status(200).json({
      clients,
      pagination: {
        total: totalClients,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalClients / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching all clients:', error);
    res.status(500).json({ error: 'Could not retrieve clients.' });
  }
};

// Client Management Functions

// Update client status (activate/deactivate)
export const updateClientStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['active', 'restricted'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be "active" or "restricted".' });
  }
  
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      select: { name: true }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }
    
    const isActive = status === 'active';
    
    const updatedClient = await prisma.client.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });
    
    // Send notification to the client about their account status change
    try {
      await sendSystemNotification({
        title: `Account ${status === 'active' ? 'Activated' : 'Restricted'}`,
        message: `Your account has been ${status === 'active' ? 'activated' : 'restricted'} by an administrator.`,
        userType: 'client',
        actionLink: '/client/profile'
      });
    } catch (notificationError) {
      console.error('Error sending system notification:', notificationError);
      // Continue even if notification fails
    }
    
    return res.status(200).json({
      message: `Client ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      client: updatedClient
    });
  } catch (error) {
    console.error('Error updating client status:', error);
    return res.status(500).json({ error: 'Could not update client status.' });
  }
};

// Delete a client
export const deleteClient = async (req, res) => {
  const { id } = req.params;
  
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      select: { name: true, email: true }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }
    
    await prisma.client.delete({
      where: { id }
    });
    
    return res.status(200).json({
      message: 'Client deleted successfully',
      client: {
        id,
        name: client.name,
        email: client.email
      }
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return res.status(500).json({ error: 'Could not delete client.' });
  }
};

// Artist Management Functions

// Get all artists with optional filtering
export const getAllArtists = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter conditions
    const where = {};
    if (status) where.isActive = status === 'Active';

    const artists = await prisma.artist.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        profilePhoto: true,
        location: true,
        socialLinks: true,
        socialLogin: true,
        socialVerified: true,
        specialties: true,
        socialHandle: true,
        isVerified: true,
        isClaimed: true,
        isActive: true,
        about: true,
        personalVibe: true,
        createdAt: true,
      },
      skip,
      take: parseInt(limit),
      orderBy: {
        [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc'
      }
    });

    // Get total count for pagination
    const totalArtists = await prisma.artist.count({ where });

    res.status(200).json({
      artists,
      pagination: {
        total: totalArtists,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalArtists / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching all artists:', error);
    res.status(500).json({ error: 'Could not retrieve artists.' });
  }
};


// Get artist by ID
export const getArtistById = async (req, res) => {
  const { id } = req.params;
  try {
    const artist = await prisma.artist.findUnique({
      where: { id },
      include: {
        reviews: true,
        portfolioImages: true,
        gallaryImages: true,
        promotions: true,
      },
    });
    
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found.' });
    }
    
    // Remove the password field from the returned object for security
    const { password, ...artistData } = artist;
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: 'VIEW_ARTIST',
        targetType: 'ARTIST',
        targetId: id,
        details: { artistName: artist.name }
      }
    });
    
    res.status(200).json(artistData);
  } catch (error) {
    console.error('Error fetching artist by ID:', error);
    res.status(500).json({ error: 'Could not retrieve artist.' });
  }
};

// Update artist status (activate/restrict)
export const updateArtistStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['active', 'restricted'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be "active" or "restricted".' });
  }
  
  try {
    const artist = await prisma.artist.findUnique({
      where: { id },
      select: { name: true }
    });
    
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found.' });
    }
    
    const isActive = status === 'active';
    
    const updatedArtist = await prisma.artist.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: isActive ? 'ACTIVATE_ARTIST' : 'RESTRICT_ARTIST',
        targetType: 'ARTIST',
        targetId: id,
        details: { artistName: artist.name, newStatus: status }
      }
    });
    
    res.status(200).json({
      message: `Artist ${isActive ? 'activated' : 'restricted'} successfully.`,
      artist: updatedArtist
    });
  } catch (error) {
    console.error('Error updating artist status:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Artist not found.' });
    }
    res.status(500).json({ error: 'Could not update artist status.' });
  }
};

// Delete an artist
export const deleteArtist = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;
  
  try {
    // Get artist details before deletion for logging
    const artist = await prisma.artist.findUnique({
      where: { id },
      select: { name: true, email: true }
    });
    
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found.' });
    }
    
    // Delete the artist
    await prisma.artist.delete({ where: { id } });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_ARTIST',
        targetType: 'ARTIST',
        targetId: id,
        details: { artistName: artist.name, artistEmail: artist.email }
      }
    });
    
    res.status(200).json({ message: 'Artist deleted successfully.' });
  } catch (error) {
    console.error('Error deleting artist:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Artist not found.' });
    }
    res.status(500).json({ error: 'Could not delete artist.' });
  }
};

// Get artist subscription history
export const getArtistSubscriptions = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if artist exists
    const artist = await prisma.artist.findUnique({
      where: { id },
      select: { name: true }
    });
    
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found.' });
    }
    
    // Get artist subscriptions
    const subscriptions = await prisma.artistSubscription.findMany({
      where: { artistId: id },
      include: {
        plan: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: 'VIEW_ARTIST_SUBSCRIPTIONS',
        targetType: 'ARTIST',
        targetId: id,
        details: { artistName: artist.name, subscriptionsCount: subscriptions.length }
      }
    });
    
    res.status(200).json(subscriptions);
  } catch (error) {
    console.error('Error fetching artist subscriptions:', error);
    res.status(500).json({ error: 'Could not retrieve artist subscriptions.' });
  }
};

// Report Management Functions

// Get all reports with optional filtering
export const getAllReports = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  
  try {
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;
    
    // Build filter conditions
    const where = {};
    if (status) {
      where.status = status;
    }
    
    // Get reports with pagination
    const [reports, totalReports] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              profilePhoto: true
            }
          },
          reportedItem: true
        }
      }),
      prisma.report.count({ where })
    ]);
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: 'VIEW_ALL_REPORTS',
        targetType: 'REPORT',
        details: { count: reports.length, filters: { status } }
      }
    });
    
    res.status(200).json({
      data: reports,
      meta: {
        total: totalReports,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(totalReports / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Could not retrieve reports.' });
  }
};

// Get report by ID
export const getReportById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            profilePhoto: true
          }
        },
        reportedItem: true,
        adminNotes: {
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePhoto: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: 'VIEW_REPORT',
        targetType: 'REPORT',
        targetId: id,
        details: { reportType: report.type, reportStatus: report.status }
      }
    });
    
    res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching report by ID:', error);
    res.status(500).json({ error: 'Could not retrieve report.' });
  }
};

// Update report status
export const updateReportStatus = async (req, res) => {
  const { id } = req.params;
  const { status, adminNote } = req.body;
  const adminId = req.user.id;
  
  if (!status || !['PENDING', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be one of: PENDING, IN_REVIEW, RESOLVED, DISMISSED.' });
  }
  
  try {
    // Check if report exists
    const report = await prisma.report.findUnique({
      where: { id },
      select: { type: true, status: true }
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    
    // Update the report status
    const updatedReport = await prisma.report.update({
      where: { id },
      data: { status }
    });
    
    // Add admin note if provided
    if (adminNote) {
      await prisma.adminNote.create({
        data: {
          reportId: id,
          adminId,
          content: adminNote
        }
      });
    }
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_REPORT_STATUS',
        targetType: 'REPORT',
        targetId: id,
        details: { previousStatus: report.status, newStatus: status }
      }
    });
    
    res.status(200).json({
      message: `Report status updated to ${status} successfully.`,
      report: updatedReport
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Report not found.' });
    }
    res.status(500).json({ error: 'Could not update report status.' });
  }
};

// Delete a report
export const deleteReport = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;
  
  try {
    // Get report details before deletion for logging
    const report = await prisma.report.findUnique({
      where: { id },
      select: { type: true, reason: true }
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    
    // Delete the report
    await prisma.report.delete({ where: { id } });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_REPORT',
        targetType: 'REPORT',
        targetId: id,
        details: { reportType: report.type, reportReason: report.reason }
      }
    });
    
    res.status(200).json({ message: 'Report deleted successfully.' });
  } catch (error) {
    console.error('Error deleting report:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Report not found.' });
    }
    res.status(500).json({ error: 'Could not delete report.' });
  }
};

// Support Ticket Management Functions

// Get all support tickets with optional filtering
export const getAllSupportTickets = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  
  try {
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;
    
    // Build filter conditions
    const where = {};
    if (status) {
      where.status = status;
    }
    
    // Get support tickets with pagination
    const [supportTickets, totalTickets] = await prisma.$transaction([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              profilePhoto: true
            }
          },
          responses: {
            include: {
              admin: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profilePhoto: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      }),
      prisma.supportTicket.count({ where })
    ]);
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: 'VIEW_ALL_SUPPORT_TICKETS',
        targetType: 'SUPPORT_TICKET',
        details: { count: supportTickets.length, filters: { status } }
      }
    });
    
    res.status(200).json({
      data: supportTickets,
      meta: {
        total: totalTickets,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(totalTickets / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ error: 'Could not retrieve support tickets.' });
  }
};

// Get support ticket by ID
export const getSupportTicketById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const supportTicket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            profilePhoto: true
          }
        },
        responses: {
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePhoto: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!supportTicket) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: 'VIEW_SUPPORT_TICKET',
        targetType: 'SUPPORT_TICKET',
        targetId: id,
        details: { ticketSubject: supportTicket.subject, ticketStatus: supportTicket.status }
      }
    });
    
    res.status(200).json(supportTicket);
  } catch (error) {
    console.error('Error fetching support ticket by ID:', error);
    res.status(500).json({ error: 'Could not retrieve support ticket.' });
  }
};

// Update support ticket status
export const updateSupportTicketStatus = async (req, res) => {
  const { id } = req.params;
  const { status, response } = req.body;
  const adminId = req.user.id;
  
  if (!status || !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED.' });
  }
  
  try {
    // Check if support ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { subject: true, status: true }
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }
    
    // Update the support ticket status
    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: { status }
    });
    
    // Add admin response if provided
    if (response) {
      await prisma.supportTicketResponse.create({
        data: {
          ticketId: id,
          adminId,
          content: response
        }
      });
    }
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_SUPPORT_TICKET_STATUS',
        targetType: 'SUPPORT_TICKET',
        targetId: id,
        details: { previousStatus: ticket.status, newStatus: status }
      }
    });
    
    res.status(200).json({
      message: `Support ticket status updated to ${status} successfully.`,
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error updating support ticket status:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }
    res.status(500).json({ error: 'Could not update support ticket status.' });
  }
};

// Delete a support ticket
export const deleteSupportTicket = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;
  
  try {
    // Get ticket details before deletion for logging
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { subject: true, message: true }
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }
    
    // Delete the support ticket
    await prisma.supportTicket.delete({ where: { id } });
    
    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'DELETE_SUPPORT_TICKET',
        targetType: 'SUPPORT_TICKET',
        targetId: id,
        details: { ticketSubject: ticket.subject }
      }
    });
    
    res.status(200).json({ message: 'Support ticket deleted successfully.' });
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }
    res.status(500).json({ error: 'Could not delete support ticket.' });
  }
};