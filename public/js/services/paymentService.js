import { apiService } from "./apiService.js";

export const paymentService = {
  async createCheckoutSession(courseId) {
    const response = await apiService.post(
      "/api/payments/create-checkout-session",
      { courseId }
    );
    return response;
  },

  async verifyPayment(sessionId) {
    return await apiService.get(`/api/payments/verify?session_id=${sessionId}`);
  },
};
