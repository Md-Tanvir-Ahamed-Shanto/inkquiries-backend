import { Router } from "express";
import {
  createPortfolioImage,
  getPortfolioImages,
  updatePortfolioImage,
  deletePortfolioImage,
  createPortfolioComment,
  getPortfolioComments,
  updatePortfolioComment,
  deletePortfolioComment,
  likePortfolioImage,
  unlikePortfolioImage,
  checkUserPortfolioLikeStatus,
  checkBatchPortfolioLikeStatus,
} from "../controllers/portfolioImageController.js";
import { protectArtist, protectClient } from "../middleware/auth.js";
import { uploadPortfolioImage } from "../config/multerConfig.js";

const router = Router();

router
  .route("/")
  .post(
    protectArtist,
    uploadPortfolioImage.array("portfolioImages", 3), // Use .array() for multiple files
    createPortfolioImage
  )
  .get(getPortfolioImages); // This should be a public route to view portfolios

router
  .route("/:id")
  .put(
    protectArtist,
    uploadPortfolioImage.array("portfolioImages", 3), // Allow updating images
    updatePortfolioImage
  )
  .delete(protectArtist, deletePortfolioImage);


  // Portfolio Comment Routes
router.post('/:portfolioImageId/comments', protectClient, createPortfolioComment);
router.get('/:portfolioImageId/comments', getPortfolioComments);
router.patch('/comments/:id', protectClient, updatePortfolioComment);
router.delete('/comments/:id', protectClient, deletePortfolioComment);

// Portfolio Like Routes
router.post('/:portfolioImageId/like', protectClient, likePortfolioImage);
router.post('/:portfolioImageId/unlike', protectClient, unlikePortfolioImage);
router.get('/:portfolioImageId/like-status', protectClient, checkUserPortfolioLikeStatus);
router.post('/batch-like-status', protectClient, checkBatchPortfolioLikeStatus);

export default router;
