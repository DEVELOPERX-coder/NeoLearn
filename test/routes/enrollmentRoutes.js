const express = require("express");
const router = express.Router();
const enrollmentController = require("../controllers/enrollmentController");
const { isAuthenticated } = require("../middleware/auth");

router.post(
  "/courses/:courseId/enroll",
  isAuthenticated,
  enrollmentController.enrollInCourse
);
router.get(
  "/my-courses",
  isAuthenticated,
  enrollmentController.getEnrolledCourses
);

module.exports = router;
