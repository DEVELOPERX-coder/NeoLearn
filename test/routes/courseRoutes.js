const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { isAdmin } = require("../middleware/auth");

router.get("/", courseController.getAllCourses);
router.get("/:id", courseController.getCourseById);
router.post("/", isAdmin, courseController.createCourse);

module.exports = router;
