import { Router } from 'express';
import {
  createPortfolioComment,
  getPortfolioComments,
  updatePortfolioComment,
  deletePortfolioComment,
} from '../controllers/commentController.js';
import { protectClient } from '../middleware/auth.js';

const router = Router();

router.route('/')
  .post(protectClient, createPortfolioComment)
  .get(getPortfolioComments);

router.route('/:id')
  .put(protectClient, updatePortfolioComment)
  .delete(protectClient, deletePortfolioComment);

export default router;