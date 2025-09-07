import { Router } from 'express';
import {
  createReviewReport,
  getReviewReports,
} from './reviewReport.controller.js';
import { protectArtist } from './middleware/auth.js';

const router = Router();

router.post('/', protectArtist, createReviewReport);
router.get('/', getReviewReports);

export default router;