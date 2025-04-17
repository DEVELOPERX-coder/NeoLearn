const express = require("express");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const {
  uploadCourseThumbnail,
  uploadVideo,
} = require("../middleware/upload.middleware");
const courseController = require("../controllers/course.controller");
const sectionController = require("../controllers/section.controller");
const lessonController = require("../controllers/lesson.controller");

const router = express.Router();

// Course routes
router.get("/", courseController.getAllCourses);
router.get(
  "/instructor/:instructorId?",
  protect,
  courseController.getInstructorCourses
);
router.get("/:id", courseController.getCourseById);
router.post(
  "/",
  protect,
  restrictTo("instructor", "admin"),
  courseController.createCourse
);
router.patch("/:id", protect, courseController.updateCourse);
router.delete("/:id", protect, courseController.deleteCourse);
router.post(
  "/:id/thumbnail",
  protect,
  uploadCourseThumbnail,
  courseController.uploadCourseThumbnail
);

// Section routes
router.post("/:courseId/sections", protect, sectionController.createSection);
router.patch("/sections/:id", protect, sectionController.updateSection);
router.delete("/sections/:id", protect, sectionController.deleteSection);

// Lesson routes
router.post(
  "/sections/:sectionId/lessons",
  protect,
  lessonController.createLesson
);
router.get("/lessons/:id", lessonController.getLessonById);
router.patch("/lessons/:id", protect, lessonController.updateLesson);
router.delete("/lessons/:id", protect, lessonController.deleteLesson);
router.post(
  "/lessons/:id/video",
  protect,
  uploadVideo,
  lessonController.uploadLessonVideo
);

module.exports = router;
