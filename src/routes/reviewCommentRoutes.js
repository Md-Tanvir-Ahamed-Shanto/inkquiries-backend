import { Router } from 'express';
import {
  createReviewComment,
  getReviewComments,
  updateReviewComment,
  deleteReviewComment,
} from '../controllers/commentController.js';
import { protectClient } from '../middleware/auth.js';

const router = Router();

router.route('/')
  .post(protectClient, createReviewComment)
  .get(getReviewComments);

router.route('/:id')
  .put(protectClient, updateReviewComment)
  .delete(protectClient, deleteReviewComment);

export default router;
