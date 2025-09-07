import { Router } from "express";
import {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
  getCommentsForReview,
  createComment,
  updateComment,
  deleteComment,
  likeReview,
  unlikeReview,
  checkUserLikeStatus,
  checkBatchUserLikeStatus,
  getReviewById,
  reportReview,
  getAllReportsReview,
  getReviewReportById,
  rejectReviewReport,
  acceptReviewReport,
  changeStatus,
} from "../controllers/reviewController.js";
import { protectArtist, protectClient } from "../middleware/auth.js";
import { uploadReviewPhotos } from "../config/multerConfig.js";
const router = Router();

router
  .route("/")
  .post(protectClient, uploadReviewPhotos.array("photos", 3), createReview)
  .get(getReviews);

router
  .route("/:id")
  .get(getReviewById)
  .put(protectClient, updateReview)
  .delete(protectClient, deleteReview);

  router.put("/:id/status", changeStatus);
// Get all comments for a specific review
router.get("/:reviewId/comments", getCommentsForReview);

// Create a new comment on a review (requires authentication)
router.post("/:reviewId/comments", protectClient, createComment);

// Update a specific comment (requires authentication and ownership)
router.patch("/comments/:id", protectClient, updateComment);

// Delete a specific comment (requires authentication and ownership)
router.delete("/comments/:id", protectClient, deleteComment);

// Endpoint to like a review
router.post("/:reviewId/like", protectClient, likeReview);

// Endpoint to unlike a review
router.post("/:reviewId/unlike", protectClient, unlikeReview);

// Endpoint to check user's like status for a review
router.get("/:reviewId/like-status", protectClient, checkUserLikeStatus);

// Endpoint to check user's like status for multiple reviews in batch
router.post("/batch/like-status", protectClient, checkBatchUserLikeStatus);

router.post('/:reviewId/report', protectArtist, reportReview);
router.get('/reports/all', getAllReportsReview);
router.get('/reports/:reportId', getReviewReportById);
router.post('/reports/:reportId/reject', protectArtist, rejectReviewReport);
router.delete('/reports/:reportId/accept', protectArtist, acceptReviewReport);

export default router;
