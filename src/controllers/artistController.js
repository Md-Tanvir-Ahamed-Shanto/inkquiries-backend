import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendNotification } from '../services/notificationService.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const createArtist = async (req, res) => {
  const {
    email,
    password,
    name,
    username,
    profilePhoto,
    location,
    socialLinks,
    socialLogin,
    socialVerified,
    specialties,
    socialHandle,
    isVerified,
    isClaimed,
    about,
    personalVibe,
  } = req.body;
  if (!email || !password || !username) {
    return res
      .status(400)
      .json({ error: "Please provide a username, email, and password." });
  }
  try {
    const hashedPassword = await hashPassword(password);
    const newArtist = await prisma.artist.create({
      data: {
        email,
        password: hashedPassword,
        name,
        username,
        profilePhoto,
        location,
        socialLinks,
        socialLogin,
        socialVerified,
        specialties,
        socialHandle,
        isVerified,
        isClaimed,
        about,
        personalVibe,
      },
    });
    const { password: _, ...artistData } = newArtist;
    
    // Send welcome notification to the new artist
    try {
      await sendNotification({
        userId: newArtist.id,
        userType: 'artist',
        title: 'Welcome to Inkquiries',
        message: 'Thank you for registering! Start showcasing your tattoo portfolio and connect with clients.',
        type: 'system',
        actionLink: '/artist/dashboard'
      });
    } catch (notificationError) {
      console.error('Error sending welcome notification:', notificationError);
      // Continue even if notification fails
    }
    
    res.status(201).json(artistData);
  } catch (error) {
    console.error("Error creating artist:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({
          error:
            "An artist with this username, email, or social handle already exists.",
        });
    }
    res.status(500).json({ error: "Could not create artist." });
  }
};

export const loginArtist = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Please provide an email and password." });
  }
  try {
    const artist = await prisma.artist.findUnique({ where: { email } });
    if (!artist) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const isMatch = await bcrypt.compare(password, artist.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const token = jwt.sign({ id: artist.id, role: "artist" }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const { password: _, ...artistData } = artist;
    
    // Send notification for successful login
    try {
      await sendNotification({
        userId: artist.id,
        userType: 'artist',
        title: 'Successful Login',
        message: `You have successfully logged in from a ${req.headers['user-agent'] ? req.headers['user-agent'].split('/')[0] : 'new'} device.`,
        type: 'system',
        actionLink: '/artist/dashboard'
      });
    } catch (notificationError) {
      console.error('Error sending login notification:', notificationError);
      // Continue even if notification fails
    }
    
    res
      .status(200)
      .json({ message: "Login successful.", token, artist: artistData });
  } catch (error) {
    console.error("Error during artist login:", error);
    res.status(500).json({ error: "Could not log in." });
  }
};

export const logoutArtist = (req, res) => {
  res.status(200).json({ message: "Logout successful." });
};

// New endpoint for clients to create artist profiles
export const createArtistByClient = async (req, res) => {
  const {
    name,
    username,
    socialHandle,
    profilePhoto,
    location,
  } = req.body;

  // Validate required fields
  if (!name || !username || !socialHandle) {
    return res
      .status(400)
      .json({ error: "Please provide a name, username, and social handle." });
  }

  try {
    // Create artist with minimal information
    // No password required as this is a placeholder account
    const newArtist = await prisma.artist.create({
      data: {
        name,
        username,
        socialHandle,
        profilePhoto,
        location,
        createdByClient: true, // Mark as created by client
        isClaimed: false, // Not claimed by the actual artist yet
      },
    });

    // Return the created artist data
    res.status(201).json(newArtist);
  } catch (error) {
    console.error("Error creating artist by client:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({
          error:
            "An artist with this username or social handle already exists.",
        });
    }
    res.status(500).json({ error: "Could not create artist profile." });
  }
};

export const getArtistById = async (req, res) => {
  const { id } = req.params;
  try {
    const artist = await prisma.artist.findUnique({
      where: { id },
      include: {
        reviews: true,
        portfolioImages: true,
        gallaryImages: true, // Include gallery images
        promotions: true,
      },
    });
    if (!artist) {
      return res.status(404).json({ error: "Artist not found." });
    }
    
    // Calculate average rating from reviews if they exist
    let averageRating = 0;
    if (artist.reviews && artist.reviews.length > 0) {
      let totalRating = 0;
      let ratingCount = 0;
      
      artist.reviews.forEach(review => {
        // Calculate average of all rating fields for this review
        const reviewRatings = [
          review.bedsideManner,
          review.accommodation,
          review.price,
          review.heavyHandedness,
          review.artworkQuality,
          review.tattooQuality
        ];
        
        const validRatings = reviewRatings.filter(r => typeof r === 'number' && !isNaN(r));
        if (validRatings.length > 0) {
          const reviewAvg = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
          totalRating += reviewAvg;
          ratingCount++;
        }
      });
      
      if (ratingCount > 0) {
        averageRating = totalRating / ratingCount;
      }
    }
    
    // Remove the password field from the returned object for security
    const { password, ...artistData } = artist;
    
    // Add the calculated average rating
    const artistWithRating = {
      ...artistData,
      averageRating
    };
    
    res.status(200).json(artistWithRating);
  } catch (error) {
    console.error("Error fetching artist by ID:", error);
    res.status(500).json({ error: "Could not retrieve artist." });
  }
};

export const getAllArtists = async (req, res) => {
  try {
    const artists = await prisma.artist.findMany({
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
        about: true,
        personalVibe: true,
        createdAt: true,
      },
    });
    res.status(200).json(artists);
  } catch (error) {
    console.error("Error fetching all artists:", error);
    res.status(500).json({ error: "Could not retrieve artists." });
  }
};

export const updateArtist = async (req, res) => {
  const { id } = req.params;
  const { password, ...updateData } = req.body; // Prevent password from being updated here
  // Remove authorization check since we're not using auth middleware
  try {
    const updatedArtist = await prisma.artist.update({
      where: { id },
      data: updateData,
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
        about: true,
        personalVibe: true,
        createdAt: true,
      },
    });
    res.status(200).json(updatedArtist);
  } catch (error) {
    console.error("Error updating artist:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Artist not found." });
    }
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "Email, username, or social handle already in use." });
    }
    res.status(500).json({ error: "Could not update artist." });
  }
};

export const deleteArtist = async (req, res) => {
  const { id } = req.params;
  // Remove authorization check since we're not using auth middleware
  try {
    await prisma.artist.delete({ where: { id } });
    res.status(200).json({ message: "Artist deleted successfully." });
  } catch (error) {
    console.error("Error deleting artist:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Artist not found." });
    }
    res.status(500).json({ error: "Could not delete artist." });
  }
};

export const searchArtists = async (req, res) => {
  const { q, location, style } = req.query;
  
  // Check if at least one search parameter is provided
  if (!q && !location && !style) {
    return res.status(400).json({ error: "At least one search parameter is required." });
  }

  try {
    // Build search conditions
    const searchConditions = [];
    
    // Add name/username search if q parameter is provided
    if (q) {
      searchConditions.push({
        OR: [
          {
            username: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            name: {
              contains: q,
              mode: "insensitive",
            },
          },
        ],
      });
    }
    
    // Add location search if location parameter is provided
    if (location && location !== "None") {
      searchConditions.push({
        location: {
          contains: location,
          mode: "insensitive",
        },
      });
    }
    
    // Add style/specialty search if style parameter is provided
    if (style && style !== "None") {
      searchConditions.push({
        specialties: {
          has: style,
        },
      });
    }
    
    // Find artists matching the search criteria
    const artists = await prisma.artist.findMany({
      where: {
        AND: searchConditions,
      },
      select: {
        id: true,
        name: true,
        profilePhoto: true,
        location: true,
        username: true,
        specialties: true,
        reviews: {
          select: {
            bedsideManner: true,
            accommodation: true,
            price: true,
            heavyHandedness: true,
            artworkQuality: true,
            tattooQuality: true,
          },
        },
      },
      take: 10,
    });

    // Calculate average rating for each artist
    const artistsWithRatings = artists.map(artist => {
      // Calculate average rating from reviews if they exist
      let averageRating = 0;
      if (artist.reviews && artist.reviews.length > 0) {
        let totalRating = 0;
        let ratingCount = 0;
        
        artist.reviews.forEach(review => {
          // Calculate average of all rating fields for this review
          const reviewRatings = [
            review.bedsideManner,
            review.accommodation,
            review.price,
            review.heavyHandedness,
            review.artworkQuality,
            review.tattooQuality
          ];
          
          const validRatings = reviewRatings.filter(r => typeof r === 'number' && !isNaN(r));
          if (validRatings.length > 0) {
            const reviewAvg = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
            totalRating += reviewAvg;
            ratingCount++;
          }
        });
        
        if (ratingCount > 0) {
          averageRating = totalRating / ratingCount;
        }
      }
      
      // Remove reviews from the response to keep it clean
      const { reviews, ...artistData } = artist;
      
      return {
        ...artistData,
        averageRating
      };
    });

    res.status(200).json(artistsWithRatings);
  } catch (error) {
    console.error("Error searching artists:", error);
    res.status(500).json({ error: "Failed to search artists." });
  }
};

// --- Account Management ---

export const changeEmail = async (req, res) => {
  const { id } = req.params;
  const { newEmail, password } = req.body;

  if (!newEmail || !password) {
    return res
      .status(400)
      .json({ error: "Please provide new email and current password." });
  }

  try {
    // Find the artist
    const artist = await prisma.artist.findUnique({ where: { id } });
    if (!artist) {
      return res.status(404).json({ error: "Artist not found." });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, artist.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password." });
    }

    // Check if email is already in use
    const existingArtist = await prisma.artist.findUnique({
      where: { email: newEmail },
    });
    if (existingArtist && existingArtist.id !== id) {
      return res.status(400).json({ error: "Email already in use." });
    }

    // Update email
    const updatedArtist = await prisma.artist.update({
      where: { id },
      data: { email: newEmail },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
      },
    });

    res
      .status(200)
      .json({ message: "Email updated successfully.", artist: updatedArtist });
  } catch (error) {
    console.error("Error changing email:", error);
    res.status(500).json({ error: "Could not change email." });
  }
};

export const changePassword = async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({
        error:
          "Please provide current password, new password, and confirm password.",
      });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ error: "New password and confirm password do not match." });
  }

  try {
    // Find the artist
    const artist = await prisma.artist.findUnique({ where: { id } });
    if (!artist) {
      return res.status(404).json({ error: "Artist not found." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, artist.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid current password." });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.artist.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Could not change password." });
  }
};

export const disableArtist = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.artist.update({
      where: { id },
      data: { isActive: false },
    });
    res.status(200).json({ message: "Artist account disabled successfully." });
  } catch (error) {
    console.error("Error disabling artist account:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Artist not found." });
    }
    res.status(500).json({ error: "Could not disable artist account." });
  }
};

// --- Gallery Image Management ---

export const uploadGalleryImages = async (req, res) => {
  // req.files is provided by Multer when uploading multiple files
  const files = req.files;
  const { id } = req.params; // Get artist ID from URL parameters
  const artistId = id; // Use the ID from the URL parameters directly

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No images uploaded." });
  }

  try {
    const imageUrls = files.map((file) => {
      // Construct the public URL for the uploaded image
      // This path should match your static file serving configuration
      return `/uploads/gallery_images/${file.filename}`;
    });

    const newGalleryEntry = await prisma.gallaryImage.create({
      data: {
        artistId,
        imageUrls,
      },
    });

    res.status(201).json({
      message: "Images uploaded successfully.",
      data: newGalleryEntry,
    });
  } catch (error) {
    console.error("Error uploading gallery images:", error);
    res.status(500).json({ error: "Could not upload gallery images." });
  }
};

export const getArtistGallery = async (req, res) => {
  const { id } = req.params;

  try {
    const gallery = await prisma.gallaryImage.findMany({
      where: { artistId: id },
      orderBy: { uploadedAt: "desc" },
    });
    res.status(200).json(gallery);
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    res.status(500).json({ error: "Could not retrieve gallery images." });
  }
};

export const deleteGalleryImage = async (req, res) => {
  const { imageId } = req.params;
  // Use the image ID directly without checking against artist ID

  try {
    const galleryImage = await prisma.gallaryImage.findUnique({
      where: { id: imageId },
    });

    if (!galleryImage) {
      return res.status(404).json({ error: "Image not found." });
    }

    // No authorization check needed since we're not using authentication middleware

    await prisma.gallaryImage.delete({
      where: { id: imageId },
    });
    res.status(200).json({ message: "Gallery image deleted successfully." });
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Gallery image not found." });
    }
    res.status(500).json({ error: "Could not delete gallery image." });
  }
};

// --- Profile Photo Management ---

export const uploadProfilePhoto = async (req, res) => {
  const { id } = req.params;
  // Use the ID from the URL parameters directly since we're not using auth middleware here

  if (!req.file) {
    return res.status(400).json({ error: "No profile photo uploaded." });
  }

  try {
    const photoUrl = `/uploads/profile_images/${req.file.filename}`;

    const updatedArtist = await prisma.artist.update({
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
      message: "Profile photo uploaded successfully.",
      profilePhoto: updatedArtist.profilePhoto,
    });
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    res.status(500).json({ error: "Could not upload profile photo." });
  }
};

export const deleteProfilePhoto = async (req, res) => {
  const { id } = req.params;
  // Use the ID from the URL parameters directly since we're not using auth middleware here

  try {
    const updatedArtist = await prisma.artist.update({
      where: { id },
      data: {
        profilePhoto: null,
      },
      select: {
        id: true,
      },
    });

    res.status(200).json({ message: "Profile photo deleted successfully." });
  } catch (error) {
    console.error("Error deleting profile photo:", error);
    res.status(500).json({ error: "Could not delete profile photo." });
  }
};

export const getProfilePhoto = async (req, res) => {
  const { id } = req.params;

  try {
    const artist = await prisma.artist.findUnique({
      where: { id },
      select: {
        profilePhoto: true,
      },
    });

    if (!artist) {
      return res.status(404).json({ error: "Artist not found." });
    }

    res.status(200).json({ profilePhoto: artist.profilePhoto });
  } catch (error) {
    console.error("Error fetching profile photo:", error);
    res.status(500).json({ error: "Could not retrieve profile photo." });
  }
};

export const getTopRankedArtists = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get artists with their reviews for rating calculation
    const artists = await prisma.artist.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        profilePhoto: true,
        location: true,
        isVerified: true,
        specialties: true,
        about: true,
        reviews: {
          select: {
            bedsideManner: true,
            accommodation: true,
            price: true,
            heavyHandedness: true,
            artworkQuality: true,
            tattooQuality: true,
          },
        },
      },
      take: parseInt(limit),
    });

    // Calculate average rating for each artist
    const rankedArtists = artists.map(artist => {
      // Calculate average rating from reviews if they exist
      let averageRating = 0;
      if (artist.reviews && artist.reviews.length > 0) {
        let totalRating = 0;
        let ratingCount = 0;
        
        artist.reviews.forEach(review => {
          // Calculate average of all rating fields for this review
          const reviewRatings = [
            review.bedsideManner,
            review.accommodation,
            review.price,
            review.heavyHandedness,
            review.artworkQuality,
            review.tattooQuality
          ];
          
          const validRatings = reviewRatings.filter(r => typeof r === 'number' && !isNaN(r));
          if (validRatings.length > 0) {
            const reviewAvg = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
            totalRating += reviewAvg;
            ratingCount++;
          }
        });
        
        if (ratingCount > 0) {
          averageRating = totalRating / ratingCount;
        }
      }
      
      // Remove reviews from the response to keep it clean
      const { reviews, ...artistData } = artist;
      
      return {
        ...artistData,
        averageRating
      };
    });

    // Sort artists by rating in descending order
    rankedArtists.sort((a, b) => b.averageRating - a.averageRating);

    res.status(200).json({
      success: true,
      data: rankedArtists,
    });
  } catch (error) {
    console.error("Error fetching top ranked artists:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
