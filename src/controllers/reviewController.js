import { PrismaClient } from '@prisma/client';
import path from 'path';
import { uploadsBaseDir } from '../config/multerConfig.js';
import { sendReviewNotification, sendCommentNotification } from '../services/notificationService.js';

const prisma = new PrismaClient();


export const createReview = async (req, res) => {
  try {
    const { 
      artistId, 
      tattooDate, 
      bedsideManner, 
      accommodation, 
      price, 
      heavyHandedness, 
      artworkQuality, 
      tattooQuality, 
      overallExperience, 
      content,
      tattooStyle,
      location,
      artDate,
    } = req.body;
    const clientId = req.client;
    const files = req.files;

    // Check for required fields, including all ratings
    if (
      !artistId || !tattooDate || !bedsideManner || !accommodation ||
      !price || !heavyHandedness || !artworkQuality || !tattooQuality || 
      !overallExperience || !tattooStyle || !location || !artDate
    ) {
      return res.status(400).json({ error: 'Missing one or more required fields for the review.' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one photo is required.' });
    }

    // Convert string ratings to integers as required by the schema
    const parsedRatings = {
      bedsideManner: parseInt(bedsideManner),
      accommodation: parseInt(accommodation),
      price: parseInt(price),
      heavyHandedness: parseInt(heavyHandedness),
      artworkQuality: parseInt(artworkQuality),
      tattooQuality: parseInt(tattooQuality),
      overallExperience: parseInt(overallExperience),
    };

    // Extract the relative paths of the uploaded files
    const photoUrls = files.map(file => {
      // Create a relative path from the root uploads directory
      const relativePath = path.relative(uploadsBaseDir, file.path);
      // Prepend the base URL for the frontend to access the images
      return `/uploads/${relativePath.replace(/\\/g, '/')}`; // Normalize path for URLs
    });

    // Create the review in the database
    const newReview = await prisma.review.create({
      data: {
        clientId,
        artistId,
        tattooDate: new Date(tattooDate),
        tattooStyle,
        location,
        artDate: new Date(artDate),
        content,
        photoUrls,
        ...parsedRatings,
      },
      include: {
        client: { select: { id: true, name: true, username: true, profilePhoto: true } },
        artist: { select: { id: true, name: true, username: true, profilePhoto: true } },
      },
    });

    // Send notification to the artist
    try {
      await sendReviewNotification({
        review: newReview,
        artist: newReview.artist
      });
    } catch (notificationError) {
      console.error('Error sending review notification:', notificationError);
      // Continue even if notification fails
    }

    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Could not create review.' });
  }
};

export const getReviews = async (req, res) => {
  const { artistId, clientId, page = 1, limit = 10, tattooStyle, location, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const where = {};
  if (artistId) where.artistId = artistId;
  if (clientId) where.clientId = clientId;
  if (tattooStyle) where.tattooStyle = tattooStyle;
  if (location) where.location = location;

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageSize;

  // Handle dynamic sorting
  const validSortFields = ['createdAt', 'overallExperience', 'overallRating'];
  const validSortOrders = ['asc', 'desc'];
  
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';
  
  // Map overallRating to overallExperience for database field
  const dbSortField = sortField === 'overallRating' ? 'overallExperience' : sortField;

  try {
    // 1. Fetch the paginated reviews
    const reviews = await prisma.review.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [dbSortField]: sortDirection,
      },
      include: {
        client: { select: { id: true, name: true, username: true, profilePhoto: true } },
        artist: { select: { id: true, name: true, username: true, profilePhoto: true } },
      },
    });

    // 2. Count the total number of reviews matching the filter
    const totalReviews = await prisma.review.count({
      where,
    });

    // 3. Calculate total pages
    const totalPages = Math.ceil(totalReviews / pageSize);

    // 4. Send the paginated data along with metadata
    res.status(200).json({
      reviews,
      meta: {
        total: totalReviews,
        page: pageNumber,
        limit: pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Could not retrieve reviews.' });
  }
};

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
            location: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePhoto: true,
          },
        },
        likes: true,
        comments: {
          include: {
            client: {
              select: {
                name: true,
                profilePhoto: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        reports: {
          include: {
            // FIX: Change 'reporter' to 'artist' based on your Prisma schema
            artist: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
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

export const updateReview = async (req, res) => {
  const { id } = req.params;
  const clientId = req.client;
  const updateData = req.body;

  try {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    if (review.clientId !== clientId) {
      return res.status(403).json({ error: 'You are not authorized to update this review.' });
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: updateData,
    });
    res.status(200).json(updatedReview);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Could not update review.' });
  }
};

export const deleteReview = async (req, res) => {
  const { id } = req.params;
  const clientId = req.client;

  try {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    await prisma.review.delete({ where: { id } });
    res.status(200).json({ message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Could not delete review.' });
  }
};


export const createComment = async (req, res) => {
  const { reviewId } = req.params;
  const { content } = req.body;
  const clientId = req.client; // Assuming this is set by an auth middleware

  if (!content) {
    return res.status(400).json({ error: 'Comment content is required.' });
  }

  try {
    // Check if the review exists
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    // Use a transaction to create the comment and update the review's comment count atomically
    const [newComment] = await prisma.$transaction([
      prisma.reviewComment.create({
        data: {
          clientId,
          reviewId,
          content,
        },
        include: {
          client: { select: { id: true, name: true, username: true, profilePhoto: true } },
        },
      }),
      prisma.review.update({
        where: { id: reviewId },
        data: {
          commentsCount: {
            increment: 1,
          },
        },
      }),
    ]);
    
    // Determine who should receive the notification
    // If the client commenting is the review owner, notify the artist
    // If the client commenting is not the review owner, notify the review owner (client)
    try {
      if (review.clientId === clientId) {
        // Comment is from the review owner, notify the artist
        await sendCommentNotification({
          comment: {
            id: newComment.id,
            type: 'review',
            reviewId
          },
          recipient: {
            id: review.artistId,
            role: 'artist'
          }
        });
      } else {
        // Comment is from another client, notify the review owner
        await sendCommentNotification({
          comment: {
            id: newComment.id,
            type: 'review',
            reviewId
          },
          recipient: {
            id: review.clientId,
            role: 'client'
          }
        });
      }
    } catch (notificationError) {
      console.error('Error sending comment notification:', notificationError);
      // Continue even if notification fails
    }
    
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Could not create comment.' });
  }
};

export const getCommentsForReview = async (req, res) => {
  const { reviewId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageSize;

  try {
    const comments = await prisma.reviewComment.findMany({
      where: { reviewId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'asc' },
      include: {
        client: { select: { id: true, name: true, username: true, profilePhoto: true } },
      },
    });

    const totalComments = await prisma.reviewComment.count({ where: { reviewId } });
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
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Could not retrieve comments.' });
  }
};

export const updateComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const clientId = req.client;

  if (!content) {
    return res.status(400).json({ error: 'Comment content is required for update.' });
  }

  try {
    const comment = await prisma.reviewComment.findUnique({ where: { id } });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    // Authorization check: ensure the client owns the comment
    if (comment.clientId !== clientId) {
      return res.status(403).json({ error: 'You are not authorized to update this comment.' });
    }

    const updatedComment = await prisma.reviewComment.update({
      where: { id },
      data: { content },
    });

    res.status(200).json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Could not update comment.' });
  }
};

export const deleteComment = async (req, res) => {
  const { id } = req.params;
  const clientId = req.client;

  try {
    const comment = await prisma.reviewComment.findUnique({ where: { id } });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    // Authorization check: ensure the client owns the comment
    if (comment.clientId !== clientId) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
    }
    
    // Use a transaction to delete the comment and decrement the review's comment count
    const [deletedComment] = await prisma.$transaction([
        prisma.reviewComment.delete({ where: { id } }),
        prisma.review.update({
            where: { id: comment.reviewId },
            data: {
                commentsCount: {
                    decrement: 1,
                },
            },
        }),
    ]);

    res.status(200).json({ message: 'Comment deleted successfully.' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Could not delete comment.' });
  }
};

export const likeReview = async (req, res) => {
  const { reviewId } = req.params;
  const clientId = req.client; // Assuming auth middleware provides the client ID

  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    // Prevents a client from liking their own review
    // if (review.clientId === clientId) {
    //   return res.status(403).json({ error: 'You cannot like your own review.' });
    // }

    // Check if user has already liked this review
    const existingLike = await prisma.reviewLike.findUnique({
      where: {
        clientId_reviewId: {
          clientId,
          reviewId,
        },
      },
    });

    if (existingLike) {
      return res.status(400).json({ error: 'You have already liked this review.' });
    }

    // Create like record and increment count in a transaction
    const [newLike, updatedReview] = await prisma.$transaction([
      prisma.reviewLike.create({
        data: {
          clientId,
          reviewId,
        },
      }),
      prisma.review.update({
        where: { id: reviewId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      }),
    ]);

    res.status(200).json({ ...updatedReview, isLiked: true });
  } catch (error) {
    console.error('Error liking review:', error);
    res.status(500).json({ error: 'Could not like review.' });
  }
};

// Function to decrement the like count for a review
export const unlikeReview = async (req, res) => {
  const { reviewId } = req.params;
  const clientId = req.client; // Assuming auth middleware provides the client ID

  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    // Prevents a client from unliking their own review (optional check)
    if (review.clientId === clientId) {
      return res.status(403).json({ error: 'You cannot unlike your own review.' });
    }

    // Check if user has actually liked this review
    const existingLike = await prisma.reviewLike.findUnique({
      where: {
        clientId_reviewId: {
          clientId,
          reviewId,
        },
      },
    });

    if (!existingLike) {
      return res.status(400).json({ error: 'You have not liked this review.' });
    }

    // Delete like record and decrement count in a transaction
    const [deletedLike, updatedReview] = await prisma.$transaction([
      prisma.reviewLike.delete({
        where: {
          clientId_reviewId: {
            clientId,
            reviewId,
          },
        },
      }),
      prisma.review.update({
        where: { id: reviewId },
        data: {
          likesCount: {
            decrement: 1,
          },
        },
      }),
    ]);

    res.status(200).json({ ...updatedReview, isLiked: false });
  } catch (error) {
    console.error('Error unliking review:', error);
    res.status(500).json({ error: 'Could not unlike review.' });
  }
};

// Function to check if a user has liked a review
export const checkUserLikeStatus = async (req, res) => {
  const { reviewId } = req.params;
  const clientId = req.client;

  try {
    const existingLike = await prisma.reviewLike.findUnique({
      where: {
        clientId_reviewId: {
          clientId,
          reviewId,
        },
      },
    });

    res.status(200).json({ isLiked: !!existingLike });
   } catch (error) {
     console.error('Error checking like status:', error);
     res.status(500).json({ error: 'Could not check like status.' });
   }
 };

// Function to check like status for multiple reviews in batch
export const checkBatchUserLikeStatus = async (req, res) => {
  const { reviewIds } = req.body; // Array of review IDs
  const clientId = req.client;

  // Input validation
  if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
    return res.status(400).json({ error: 'reviewIds array is required and cannot be empty.' });
  }

  // Limit batch size to prevent performance issues
  if (reviewIds.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 reviewIds allowed per batch request.' });
  }

  // Validate reviewIds format (should be strings)
  const invalidIds = reviewIds.filter(id => typeof id !== 'string' || !id.trim());
  if (invalidIds.length > 0) {
    return res.status(400).json({ error: 'All reviewIds must be valid non-empty strings.' });
  }

  try {
    // Single optimized query using indexes
    const existingLikes = await prisma.reviewLike.findMany({
      where: {
        clientId,
        reviewId: {
          in: reviewIds,
        },
      },
      select: {
        reviewId: true,
      },
    });

    // Create a map of reviewId -> isLiked using Set for O(1) lookup
    const likeStatusMap = {};
    const likedReviewIds = new Set(existingLikes.map(like => like.reviewId));
    
    // Build response map efficiently
    reviewIds.forEach(reviewId => {
      likeStatusMap[reviewId] = likedReviewIds.has(reviewId);
    });

    res.status(200).json({ likeStatus: likeStatusMap });
  } catch (error) {
    console.error('Error checking batch like status:', error);
    res.status(500).json({ error: 'Could not check batch like status.' });
  }
};


export const reportReview = async (req, res) => {
  const { reviewId } = req.params;
  const { reason , type } = req.body;
  const artistId = req.artist; // This assumes an artist ID is passed from auth middleware

  if (!artistId) {
    return res.status(401).json({ error: 'Authentication required to report a review.' });
  }

  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    
    // Check if this artist has already reported this review
    const existingReport = await prisma.reviewReport.findFirst({
      where: {
        artistId,
        reviewId
      }
    });
    
    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this review.', alreadyReported: true });
    }

    // Create the report
    await prisma.reviewReport.create({
      data: {
        artistId,
        reviewId,
        reason,
        type,
      },
    });

    // Update the review status separately after the report is created
    await prisma.review.update({
        where: { id: reviewId },
        data: {
            isReported: true,
            status: 'reported'
        }
    });

    res.status(200).json({ message: 'Review reported successfully.' });
  } catch (error) {
    console.error('Error reporting review:', error);
    res.status(500).json({ error: 'Could not report review.' });
  }
}

// This new function handles the resolution of a report by deleting it.
// It deletes the reported review and all associated reports.
// This would typically be an administrative function.
export const acceptReviewReport = async (req, res) => {
  const { reportId } = req.params; // Get the reportId from the URL

  try {
    // 1. Find the report to get the associated reviewId
    const report = await prisma.reviewReport.findUnique({
      where: { id: reportId },
      select: { reviewId: true }, // Only select the reviewId to make the query more efficient
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const { reviewId } = report;

    // 2. Now, use the found reviewId to find and delete the review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    // 3. Delete all reports related to this review first
    await prisma.reviewReport.deleteMany({
      where: { reviewId: reviewId },
    });

    // 4. Then, delete the review itself
    await prisma.review.delete({
      where: { id: reviewId },
    });

    res.status(200).json({ message: 'Review and all associated reports have been deleted.' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Could not delete review.' });
  }
};

// This new function handles the rejection of a report.
// It deletes the specific report and, if no other reports exist for the review,
// it reverts the review's status to "active."
export const rejectReviewReport = async (req, res) => {
  const { reportId } = req.params;

  try {
    // Find the report to get the reviewId
    const report = await prisma.reviewReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const { reviewId } = report;

    // Delete the specific report entry
    await prisma.reviewReport.delete({
      where: { id: reportId },
    });

    // Check if there are any other reports for the same review
    const remainingReports = await prisma.reviewReport.count({
      where: { reviewId: reviewId },
    });

    // If no other reports exist, revert the review status to "active"
    if (remainingReports === 0) {
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          isReported: false,
          status: 'active',
        },
      });
    }

    res.status(200).json({ message: 'Review report rejected successfully.' });
  } catch (error) {
    console.error('Error rejecting review report:', error);
    res.status(500).json({ error: 'Could not reject review report.' });
  }
};

export const getAllReportsReview = async (req, res) => {
  try {
    const reports = await prisma.reviewReport.findMany({
      include: {
        artist: true,
      },
    });
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching review reports:', error);
    res.status(500).json({ error: 'Could not fetch review reports.' });
  }
};

export const getReviewReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await prisma.reviewReport.findUnique({
      where: { id: reportId },
      include: {
        review: true,
        artist: true,
      },
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Review report not found.' });
    }
    
    res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching review report:', error);
    res.status(500).json({ error: 'Could not fetch review report.' });
  }
};


export const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    await prisma.review.update({
      where: { id },
      data: { status },
    });

    res.status(200).json({ message: 'Review status updated successfully.' });
  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({ error: 'Could not update review status.' });
  }
};