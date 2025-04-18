const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const enrollmentController = require("../controllers/enrollment.controller");
const reviewController = require("../controllers/review.controller");

const router = express.Router();

// Enrollment routes
router.get("/users/:userId?", protect, enrollmentController.getUserEnrollments);
router.get("/:id", protect, enrollmentController.getEnrollmentById);
router.post("/courses/:courseId", protect, enrollmentController.enrollInCourse);
router.post(
  "/lessons/:lessonId/progress",
  protect,
  enrollmentController.updateProgress
);

// Review routes
router.get("/courses/:courseId/reviews", reviewController.getCourseReviews);
router.post(
  "/courses/:courseId/reviews",
  protect,
  reviewController.createOrUpdateReview
);
router.delete("/reviews/:id", protect, reviewController.deleteReview);

module.exports = router;
