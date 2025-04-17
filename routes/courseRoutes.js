const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

// Get all courses
router.get("/", courseController.getAllCourses);

// Get single course
router.get("/:id", courseController.getCourseById);

// Create a course (instructor only)
router.post(
  "/",
  auth,
  upload.single("thumbnail"),
  courseController.createCourse
);

// Update a course (instructor only)
router.put(
  "/:id",
  auth,
  upload.single("thumbnail"),
  courseController.updateCourse
);

// Delete a course (instructor only)
router.delete("/:id", auth, courseController.deleteCourse);

// Get course sections
router.get("/:id/sections", courseController.getCourseSections);

// Create a section
router.post("/:id/sections", auth, courseController.createSection);

// Enroll in a course
router.post("/:id/enroll", auth, courseController.enrollInCourse);

// Get course reviews
router.get("/:id/reviews", courseController.getCourseReviews);

// Add a review
router.post("/:id/reviews", auth, courseController.addReview);

module.exports = router;
