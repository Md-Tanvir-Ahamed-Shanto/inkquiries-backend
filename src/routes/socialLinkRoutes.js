import { Router } from 'express';
import {
  getSocialLinks,
  updateSocialLinks
} from '../controllers/socialLinkController.js';
import { protectAdmin } from '../middleware/auth.js';

const router = Router();

// Get social links (public route)
router.get('/', getSocialLinks);

// Update social links (admin only)
router.post('/', protectAdmin, updateSocialLinks);

export default router;