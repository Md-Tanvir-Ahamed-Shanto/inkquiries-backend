import { Router } from 'express';
import {
  createClient,
  loginClient,
  logoutClient,
  getClientById,
  updateClient,
  deleteClient,
  changeEmail,
  changePassword,
  disableClient,
  uploadProfilePhoto,
  deleteProfilePhoto,
  getProfilePhoto,
} from '../controllers/clientController.js';
import { protectClient } from '../middleware/auth.js';
import { uploadProfileImage } from '../config/multerConfig.js';

const router = Router();

router.post('/logout', logoutClient);

router.route('/')
  .post(createClient);

router.route('/:id')
  .get(getClientById)
  .put(protectClient, updateClient)
  .delete(protectClient, deleteClient);

  
// Account management routes
router.post('/:id/change-email', changeEmail);
router.post('/:id/change-password', changePassword);
router.post('/:id/disable', disableClient);

// Profile photo routes
router.post(
  '/:id/profilePhoto',
  uploadProfileImage.single('profilePhoto'),
  uploadProfilePhoto
);

router.delete(
  '/:id/profilePhoto',
  deleteProfilePhoto
);

router.get(
  '/:id/profilePhoto',
  getProfilePhoto
);


export default router;