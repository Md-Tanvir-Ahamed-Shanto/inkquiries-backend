import { PrismaClient } from '@prisma/client';
import { triggerReviewCommentNotification, triggerPortfolioCommentNotification } from '../utils/notificationTriggers.js';

const prisma = new PrismaClient();

// Review Comments
export const createReviewComment = async (req, res) => {
  const { reviewId, content } = req.body;
  const clientId = req.client;

  if (!reviewId || !content) {
    return res.status(400).json({ error: 'Review ID and content are required.' });
  }

  try {
    const newComment = await prisma.reviewComment.create({
      data: {
        reviewId,
        content,
        clientId,
      },
      include: {
        client: { select: { id: true, name: true, username: true, profilePhoto: true } },
        review: { 
          include: {
            client: { select: { id: true, name: true, username: true, profilePhoto: true } },
            artist: { select: { id: true, name: true, username: true, profilePhoto: true } }
          }
        }
      }
    });
    
    // Send notification to the review owner (could be artist or client)
    const reviewOwner = newComment.review.clientId === clientId 
      ? newComment.review.artist 
      : newComment.review.client;
      
    await triggerReviewCommentNotification(
      newComment, 
      newComment.review, 
      newComment.client, 
      { ...reviewOwner, type: reviewOwner.id === newComment.review.artistId ? 'artist' : 'client' }
    );
    
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating review comment:', error);
    res.status(500).json({ error: 'Could not create review comment.' });
  }
};

export const getReviewComments = async (req, res) => {
  const { reviewId } = req.query;

  try {
    const comments = await prisma.reviewComment.findMany({
      where: { reviewId },
      include: {
        client: { select: { id: true, name: true, username: true, profilePhoto: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching review comments:', error);
    res.status(500).json({ error: 'Could not retrieve review comments.' });
  }
};

export const updateReviewComment = async (req, res) => {
  const { id } = req.params;
  const clientId = req.client;
  const { content } = req.body;

  try {
    const comment = await prisma.reviewComment.findUnique({ where: { id } });
    if (!comment) {
      return res.status(404).json({ error: 'Review comment not found.' });
    }
    if (comment.clientId !== clientId) {
      return res.status(403).json({ error: 'You are not authorized to update this comment.' });
    }

    const updatedComment = await prisma.reviewComment.update({
      where: { id },
      data: { content },
    });
    res.status(200).json(updatedComment);
  } catch (error) {
    console.error('Error updating review comment:', error);
    res.status(500).json({ error: 'Could not update review comment.' });
  }
};

export const deleteReviewComment = async (req, res) => {
  const { id } = req.params;
  const clientId = req.client;

  try {
    const comment = await prisma.reviewComment.findUnique({ where: { id } });
    if (!comment) {
      return res.status(404).json({ error: 'Review comment not found.' });
    }
    if (comment.clientId !== clientId) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
    }

    await prisma.reviewComment.delete({ where: { id } });
    res.status(200).json({ message: 'Review comment deleted successfully.' });
  } catch (error) {
    console.error('Error deleting review comment:', error);
    res.status(500).json({ error: 'Could not delete review comment.' });
  }
};

// Portfolio Comments
export const createPortfolioComment = async (req, res) => {
  const { portfolioImageId, content } = req.body;
  const clientId = req.client;

  if (!portfolioImageId || !content) {
    return res.status(400).json({ error: 'Portfolio image ID and content are required.' });
  }

  try {
    const newComment = await prisma.portfolioComment.create({
      data: {
        portfolioImageId,
        content,
        clientId,
      },
      include: {
        client: { select: { id: true, name: true, username: true, profilePhoto: true } },
        portfolioImage: { 
          include: {
            artist: { select: { id: true, name: true, username: true, profilePhoto: true } }
          }
        }
      }
    });
    
    // Send notification to the artist who owns the portfolio image
    await triggerPortfolioCommentNotification(
      newComment, 
      newComment.portfolioImage, 
      newComment.client, 
      newComment.portfolioImage.artist
    );
    
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating portfolio comment:', error);
    res.status(500).json({ error: 'Could not create portfolio comment.' });
  }
};

export const getPortfolioComments = async (req, res) => {
  const { portfolioImageId } = req.query;

  try {
    const comments = await prisma.portfolioComment.findMany({
      where: { portfolioImageId },
      include: {
        client: { select: { id: true, name: true, username: true, profilePhoto: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching portfolio comments:', error);
    res.status(500).json({ error: 'Could not retrieve portfolio comments.' });
  }
};

export const updatePortfolioComment = async (req, res) => {
  const { id } = req.params;
  const clientId = req.client;
  const { content } = req.body;

  try {
    const comment = await prisma.portfolioComment.findUnique({ where: { id } });
    if (!comment) {
      return res.status(404).json({ error: 'Portfolio comment not found.' });
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
    res.status(500).json({ error: 'Could not update portfolio comment.' });
  }
};

export const deletePortfolioComment = async (req, res) => {
  const { id } = req.params;
  const clientId = req.client;

  try {
    const comment = await prisma.portfolioComment.findUnique({ where: { id } });
    if (!comment) {
      return res.status(404).json({ error: 'Portfolio comment not found.' });
    }
    if (comment.clientId !== clientId) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
    }

    await prisma.portfolioComment.delete({ where: { id } });
    res.status(200).json({ message: 'Portfolio comment deleted successfully.' });
  } catch (error) {
    console.error('Error deleting portfolio comment:', error);
    res.status(500).json({ error: 'Could not delete portfolio comment.' });
  }
};