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
import { protectArtist, protectClient, protectUser } from "../middleware/auth.js";
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

// Create a new comment on a review (requires authentication - either client or artist)
router.post("/:reviewId/comments", protectUser, createComment);

// Update a specific comment (requires authentication and ownership - either client or artist)
router.patch("/comments/:id", protectUser, updateComment);

// Delete a specific comment (requires authentication and ownership - either client or artist)
router.delete("/comments/:id", protectUser, deleteComment);

// Endpoint to like a review (either client or artist)
router.post("/:reviewId/like", protectUser, likeReview);

// Endpoint to unlike a review (either client or artist)
router.post("/:reviewId/unlike", protectUser, unlikeReview);

// Endpoint to check user's like status for a review (either client or artist)
router.get("/:reviewId/like-status", protectUser, checkUserLikeStatus);

// Endpoint to check user's like status for multiple reviews in batch (either client or artist)
router.post("/batch/like-status", protectUser, checkBatchUserLikeStatus);

router.post('/:reviewId/report', protectArtist, reportReview);
router.get('/reports/all', getAllReportsReview);
router.get('/reports/:reportId', getReviewReportById);
router.post('/reports/:reportId/reject', protectArtist, rejectReviewReport);
router.delete('/reports/:reportId/accept', protectArtist, acceptReviewReport);

export default router;
