const express = require("express");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const adminController = require("../controllers/admin.controller");

const router = express.Router();

// Restrict all routes to admin only
router.use(protect, restrictTo("admin"));

// Dashboard routes
router.get("/dashboard", adminController.getDashboardStats);

// User management routes
router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUserById);
router.post("/users", adminController.createUser);
router.patch("/users/:id", adminController.updateUser);
router.post("/users/:id/reset-password", adminController.resetUserPassword);

// Course management routes
router.get("/courses", adminController.getAllCourses);
router.patch("/courses/:id/status", adminController.updateCourseStatus);

// Category management routes
router.get("/categories", adminController.getAllCategories);
router.post("/categories", adminController.createCategory);
router.patch("/categories/:id", adminController.updateCategory);
router.delete("/categories/:id", adminController.deleteCategory);

module.exports = router;
