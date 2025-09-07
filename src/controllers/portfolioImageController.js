import { PrismaClient } from "@prisma/client";
import { sendCommentNotification } from "../services/notificationService.js";

const prisma = new PrismaClient();
export const createPortfolioImage = async (req, res) => {
  // Multer places uploaded files on req.files (for .array) or req.file (for .single)
  const files = req.files;
  const { title, description, style, isPublic } = req.body;
  const artistId = req.artist; // Assuming this is set by your protectArtist middleware

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No images uploaded." });
  }

  try {
    // Map over the uploaded files to get their server paths
    const imageUrls = files.map((file) => {
      // This path must match your static file serving configuration
      return `/uploads/portfolio_images/${file.filename}`;
    });

    const newPortfolioImage = await prisma.portfolioImage.create({
      data: {
        artistId,
        imageUrls,
        title,
        description,
        style,
        isPublic,
      },
    });
    res.status(201).json(newPortfolioImage);
  } catch (error) {
    console.error("Error creating portfolio image:", error);
    res.status(500).json({ error: "Could not create portfolio image." });
  }
};

export const updatePortfolioImage = async (req, res) => {
  const { id } = req.params;
  const artistId = req.artist; // Check if files are part of the update request
  const files = req.files;
  const { imageUrls: newImageUrls, ...updateData } = req.body;
  try {
    const portfolioImage = await prisma.portfolioImage.findUnique({
      where: { id },
    });
    if (!portfolioImage) {
      return res.status(404).json({ error: "Portfolio image not found." });
    }
    if (portfolioImage.artistId !== artistId) {
      return res
        .status(403)
        .json({ error: "You are not authorized to update this portfolio." });
    }

    // If new files were uploaded, update the imageUrls
    if (files && files.length > 0) {
      const uploadedImageUrls = files.map(
        (file) => `/uploads/portfolio_images/${file.filename}`
      );
      updateData.imageUrls = uploadedImageUrls;
    }

    const updatedImage = await prisma.portfolioImage.update({
      where: { id },
      data: updateData,
    });
    res.status(200).json(updatedImage);
  } catch (error) {
    console.error("Error updating portfolio image:", error);
    res.status(500).json({ error: "Could not update portfolio image." });
  }
};

// You need to create this function
export const getPortfolioImages = async (req, res) => {
  const { artistId } = req.query;

  try {
    const images = await prisma.portfolioImage.findMany({
      where: { artistId },
    });
    res.status(200).json(images);
  } catch (error) {
    console.error("Error fetching portfolio images:", error);
    res.status(500).json({ error: "Could not retrieve portfolio images." });
  }
};

// You need to create this function
export const deletePortfolioImage = async (req, res) => {
  const { id } = req.params;
  const artistId = req.artist;

  try {
    const portfolioImage = await prisma.portfolioImage.findUnique({
      where: { id },
    });

    if (!portfolioImage) {
      return res.status(404).json({ error: "Portfolio image not found." });
    }
    if (portfolioImage.artistId !== artistId) {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this image." });
    }

    await prisma.portfolioImage.delete({ where: { id } });
    res.status(200).json({ message: "Portfolio image deleted successfully." });
  } catch (error) {
    console.error("Error deleting portfolio image:", error);
    res.status(500).json({ error: "Could not delete portfolio image." });
  }
};


export const createPortfolioComment = async (req, res) => {
  const { portfolioImageId } = req.params;
  const { content } = req.body;
  const clientId = req.client;

  if (!content) {
    return res.status(400).json({ error: 'Comment content is required.' });
  }

  try {
    const portfolioImage = await prisma.portfolioImage.findUnique({
      where: { id: portfolioImageId },
      include: { artist: { select: { id: true } } }
    });
    
    if (!portfolioImage) {
      return res.status(404).json({ error: 'Portfolio image not found.' });
    }

    const [newComment] = await prisma.$transaction([
      prisma.portfolioComment.create({
        data: {
          clientId,
          portfolioImageId,
          content,
        },
        include: {
          client: { select: { id: true, name: true, username: true, profilePhoto: true } },
        },
      }),
      prisma.portfolioImage.update({
        where: { id: portfolioImageId },
        data: {
          commentsCount: { increment: 1 },
        },
      }),
    ]);
    
    // Get client information for the notification
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, username: true }
    });
    
    // Send notification to the artist about the new comment
    try {
      await sendCommentNotification({
        comment: {
          id: newComment.id,
          type: 'portfolio',
          portfolioImageId
        },
        recipient: {
          id: portfolioImage.artist.id,
          role: 'artist'
        }
      });
    } catch (notificationError) {
      console.error('Error sending comment notification:', notificationError);
      // Continue even if notification fails
    }
    
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating portfolio comment:', error);
    res.status(500).json({ error: 'Could not create portfolio comment.' });
  }
};

export const getPortfolioComments = async (req, res) => {
  const { portfolioImageId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageSize;

  try {
    const comments = await prisma.portfolioComment.findMany({
      where: { portfolioImageId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'asc' },
      include: {
        client: { select: { id: true, name: true, username: true, profilePhoto: true } },
      },
    });

    const totalComments = await prisma.portfolioComment.count({ where: { portfolioImageId } });
    const totalPages = Math.ceil(totalComments / pageSize);

    res.status(200).json({
      comments,
      meta: {
        total: totalComments,
        page: pageNumber,
        limit: pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching portfolio comments:', error);
    res.status(500).json({ error: 'Could not retrieve comments.' });
  }
};

export const updatePortfolioComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const clientId = req.client;

  if (!content) {
    return res.status(400).json({ error: 'Comment content is required for update.' });
  }

  try {
    const comment = await prisma.portfolioComment.findUnique({ where: { id } });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    if (comment.clientId !== clientId) {
      return res.status(403).json({ error: 'You are not authorized to update this comment.' });
    }

    const updatedComment = await prisma.portfolioComment.update({
      where: { id },
      data: { content },
    });

    res.status(200).json(updatedComment);
  } catch (error) {
    console.error('Error updating portfolio comment:', error);
    res.status(500).json({ error: 'Could not update comment.' });
  }
};

export const deletePortfolioComment = async (req, res) => {
  const { id } = req.params;
  const clientId = req.client;

  try {
    const comment = await prisma.portfolioComment.findUnique({ where: { id } });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    if (comment.clientId !== clientId) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
    }

    const [deletedComment] = await prisma.$transaction([
        prisma.portfolioComment.delete({ where: { id } }),
        prisma.portfolioImage.update({
            where: { id: comment.portfolioImageId },
            data: {
                commentsCount: { decrement: 1 },
            },
        }),
    ]);

    res.status(200).json({ message: 'Comment deleted successfully.' });
  } catch (error) {
    console.error('Error deleting portfolio comment:', error);
    res.status(500).json({ error: 'Could not delete comment.' });
  }
};




export const likePortfolioImage = async (req, res) => {
  const { portfolioImageId } = req.params;
  const clientId = req.client; // Assuming auth middleware provides the client ID

  try {
    const portfolioImage = await prisma.portfolioImage.findUnique({
      where: { id: portfolioImageId },
      include: { artist: { select: { id: true } } }
    });
    
    if (!portfolioImage) {
      return res.status(404).json({ error: 'Portfolio image not found.' });
    }
    
    // Check if user already liked this portfolio image
    const existingLike = await prisma.portfolioLike.findUnique({
      where: {
        clientId_portfolioImageId: {
          clientId,
          portfolioImageId,
        },
      },
    });

    if (existingLike) {
      return res.status(400).json({ error: 'You have already liked this image.' });
    }

    // Create like and increment count in a transaction
    const [newLike, updatedImage] = await prisma.$transaction([
      prisma.portfolioLike.create({
        data: {
          clientId,
          portfolioImageId,
        },
      }),
      prisma.portfolioImage.update({
        where: { id: portfolioImageId },
        data: {
          likesCount: { increment: 1 },
        },
      }),
    ]);
    
    // Get client information for the notification
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, username: true }
    });
    
    // Send notification to the artist about the new like
    try {
      await sendCommentNotification({
        comment: {
          id: newLike.id,
          type: 'portfolio',
          portfolioImageId
        },
        recipient: {
          id: portfolioImage.artist.id,
          role: 'artist'
        }
      });
    } catch (notificationError) {
      console.error('Error sending like notification:', notificationError);
      // Continue even if notification fails
    }

    res.status(200).json({ message: 'Portfolio image liked successfully.', portfolioImage: updatedImage });
  } catch (error) {
    console.error('Error liking portfolio image:', error);
    res.status(500).json({ error: 'Could not like image.' });
  }
};

export const unlikePortfolioImage = async (req, res) => {
  const { portfolioImageId } = req.params;
  const clientId = req.client;

  try {
    const portfolioImage = await prisma.portfolioImage.findUnique({ where: { id: portfolioImageId } });
    if (!portfolioImage) {
      return res.status(404).json({ error: 'Portfolio image not found.' });
    }

    // Check if user has liked this portfolio image
    const existingLike = await prisma.portfolioLike.findUnique({
      where: {
        clientId_portfolioImageId: {
          clientId,
          portfolioImageId,
        },
      },
    });

    if (!existingLike) {
      return res.status(400).json({ error: 'You have not liked this image.' });
    }

    // Delete like and decrement count in a transaction
    const [deletedLike, updatedImage] = await prisma.$transaction([
      prisma.portfolioLike.delete({
        where: {
          clientId_portfolioImageId: {
            clientId,
            portfolioImageId,
          },
        },
      }),
      prisma.portfolioImage.update({
        where: { id: portfolioImageId },
        data: {
          likesCount: { decrement: 1 },
        },
      }),
    ]);

    res.status(200).json({ message: 'Portfolio image unliked successfully.', portfolioImage: updatedImage });
  } catch (error) {
    console.error('Error unliking portfolio image:', error);
    res.status(500).json({ error: 'Could not unlike image.' });
  }
};

// Check if user has liked a specific portfolio image
export const checkUserPortfolioLikeStatus = async (req, res) => {
  const { portfolioImageId } = req.params;
  const clientId = req.client;

  try {
    const portfolioImage = await prisma.portfolioImage.findUnique({ where: { id: portfolioImageId } });
    if (!portfolioImage) {
      return res.status(404).json({ error: 'Portfolio image not found.' });
    }

    const like = await prisma.portfolioLike.findUnique({
      where: {
        clientId_portfolioImageId: {
          clientId,
          portfolioImageId,
        },
      },
    });

    res.status(200).json({ isLiked: !!like });
  } catch (error) {
    console.error('Error checking portfolio like status:', error);
    res.status(500).json({ error: 'Could not check like status.' });
  }
};

// Check batch portfolio like status for multiple images
export const checkBatchPortfolioLikeStatus = async (req, res) => {
  const { portfolioImageIds } = req.body;
  const clientId = req.client;

  if (!Array.isArray(portfolioImageIds) || portfolioImageIds.length === 0) {
    return res.status(400).json({ error: 'portfolioImageIds must be a non-empty array.' });
  }

  try {
    const likes = await prisma.portfolioLike.findMany({
      where: {
        clientId,
        portfolioImageId: { in: portfolioImageIds },
      },
      select: { portfolioImageId: true },
    });

    const likedImageIds = likes.map(like => like.portfolioImageId);
    const likeStatus = portfolioImageIds.reduce((acc, imageId) => {
      acc[imageId] = likedImageIds.includes(imageId);
      return acc;
    }, {});

    res.status(200).json(likeStatus);
  } catch (error) {
    console.error('Error checking batch portfolio like status:', error);
    res.status(500).json({ error: 'Could not check batch like status.' });
  }
};