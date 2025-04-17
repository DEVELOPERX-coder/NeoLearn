const express = require("express");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const paymentController = require("../controllers/payment.controller");

const router = express.Router();

// Payment routes
router.post("/courses/:courseId", protect, paymentController.processPayment);
router.get("/users/:userId?", protect, paymentController.getUserPayments);
router.get("/:id", protect, paymentController.getPaymentById);

// Webhook route (no authentication required as it's called by payment gateway)
router.post("/webhook", paymentController.handlePaymentWebhook);

module.exports = router;
