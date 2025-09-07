import { Router } from 'express';
import {
  createArtist,
  loginArtist,
  logoutArtist,
  getArtistById,
  getAllArtists,
  updateArtist,
  deleteArtist,
  uploadGalleryImages,
  deleteGalleryImage,
  getArtistGallery,
  uploadProfilePhoto,
  deleteProfilePhoto,
  getProfilePhoto,
  changeEmail,
  changePassword,
  disableArtist,
  searchArtists,
  getTopRankedArtists,
  createArtistByClient,
} from '../controllers/artistController.js';
import { uploadGalleryImage, uploadPortfolioImage, uploadProfileImage } from '../config/multerConfig.js';

const router = Router();

router.post('/logout', logoutArtist);

router.route('/')
  .post(createArtist)
  .get(getAllArtists);

// Route for clients to create artist profiles
router.post('/create-by-client', createArtistByClient);

router.route('/:id')
  .get(getArtistById)
  .put(updateArtist)
  .delete(deleteArtist);

// Account management routes
router.post('/:id/change-email', changeEmail);
router.post('/:id/change-password', changePassword);
router.post('/:id/disable', disableArtist);

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

  router.post(
    '/gallery/:id/upload',
    uploadGalleryImage.array('gallaryImages', 10),
    uploadGalleryImages
);

router.get(
    '/gallery/:id',
    getArtistGallery
);

router.delete(
    '/gallery/:imageId',
    deleteGalleryImage
);

// Search artists
router.get('/find/artist',  searchArtists);
router.get('/find/top-ranked', getTopRankedArtists)


export default router;