const express = require("express");
const {
  register,
  login,
  getCurrentUser,
  updatePassword,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getCurrentUser);
router.patch("/update-password", protect, updatePassword);

module.exports = router;
