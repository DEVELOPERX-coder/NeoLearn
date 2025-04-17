const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const auth = require("../middleware/auth");

// Create a checkout session
router.post(
  "/create-checkout-session",
  auth,
  paymentController.createCheckoutSession
);

// Webhook for Stripe events
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook
);

module.exports = router;
