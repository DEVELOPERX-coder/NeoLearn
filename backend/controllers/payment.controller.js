const { pool } = require("../config/db");

// Process payment for course enrollment
exports.processPayment = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    const { paymentMethod = "credit_card" } = req.body;

    // Check if course exists and is published
    const [courses] = await pool.execute(
      "SELECT id, title, price, status FROM courses WHERE id = ?",
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Course not found",
      });
    }

    const course = courses[0];

    if (course.status !== "published") {
      return res.status(400).json({
        status: "error",
        message: "This course is not currently available for purchase",
      });
    }

    // Check if user is already enrolled
    const [existingEnrollments] = await pool.execute(
      "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?",
      [userId, courseId]
    );

    if (existingEnrollments.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "You are already enrolled in this course",
      });
    }

    // Get user details for payment
    const [users] = await pool.execute("SELECT email FROM users WHERE id = ?", [
      userId,
    ]);

    const userEmail = users[0].email;

    // In a real application, you would integrate with a payment gateway like Stripe
    // This is a simulated payment process
    const paymentResult = simulatePaymentProcessing(
      course.price,
      paymentMethod,
      userEmail
    );

    if (!paymentResult.success) {
      return res.status(400).json({
        status: "error",
        message: paymentResult.message,
      });
    }

    // Start database transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Record payment
      const [paymentResult] = await connection.execute(
        `INSERT INTO payments (user_id, course_id, amount, payment_method, 
                              payment_status, transaction_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          courseId,
          course.price,
          paymentMethod,
          "completed",
          `sim-${Date.now()}`,
        ]
      );

      const paymentId = paymentResult.insertId;

      // Create enrollment
      const [enrollmentResult] = await connection.execute(
        "INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, ?)",
        [userId, courseId, "active"]
      );

      const enrollmentId = enrollmentResult.insertId;

      // Create empty progress records for all lessons
      const [lessons] = await connection.execute(
        `SELECT l.id FROM lessons l
         JOIN sections s ON l.section_id = s.id
         WHERE s.course_id = ?`,
        [courseId]
      );

      if (lessons.length > 0) {
        const progressValues = lessons.map((lesson) => [
          enrollmentId,
          lesson.id,
          0,
          0,
          null,
        ]);

        await connection.query(
          `INSERT INTO progress (enrollment_id, lesson_id, completed, last_watched_position, last_watched_at)
           VALUES ?`,
          [progressValues]
        );
      }

      // Commit transaction
      await connection.commit();

      res.status(200).json({
        status: "success",
        data: {
          payment_id: paymentId,
          enrollment_id: enrollmentId,
          course_id: parseInt(courseId),
          amount: course.price,
          status: "completed",
          transaction_id: `sim-${Date.now()}`,
        },
      });
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Process payment error:", error);
    res.status(500).json({
      status: "error",
      message: "Error processing payment",
    });
  }
};

// Get user payment history
exports.getUserPayments = async (req, res) => {
  try {
    // Get user ID from authenticated user or params (for admins)
    const userId = parseInt(req.params.userId) || req.user.id;

    // Only allow users to view their own payments (except admins)
    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to view these payments",
      });
    }

    // Get payments with course details
    const [payments] = await pool.execute(
      `SELECT p.id, p.amount, p.payment_method, p.payment_status, 
              p.transaction_id, p.payment_date,
              c.id as course_id, c.title as course_title, c.thumbnail
       FROM payments p
       JOIN courses c ON p.course_id = c.id
       WHERE p.user_id = ?
       ORDER BY p.payment_date DESC`,
      [userId]
    );

    res.status(200).json({
      status: "success",
      results: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Get user payments error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving payment history",
    });
  }
};

// Get payment details
exports.getPaymentById = async (req, res) => {
  try {
    const paymentId = req.params.id;

    // Get payment details
    const [payments] = await pool.execute(
      `SELECT p.*, u.username as user_name, u.email as user_email,
              c.title as course_title
       FROM payments p
       JOIN users u ON p.user_id = u.id
       JOIN courses c ON p.course_id = c.id
       WHERE p.id = ?`,
      [paymentId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Payment not found",
      });
    }

    const payment = payments[0];

    // Check if user is authorized to view this payment
    if (req.user.role !== "admin" && req.user.id !== payment.user_id) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to view this payment",
      });
    }

    res.status(200).json({
      status: "success",
      data: payment,
    });
  } catch (error) {
    console.error("Get payment by ID error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving payment",
    });
  }
};

// Simulate payment processing (in a real app, this would be a payment gateway integration)
function simulatePaymentProcessing(amount, paymentMethod, email) {
  // Simulate payment validation
  if (!amount || amount <= 0) {
    return {
      success: false,
      message: "Invalid payment amount",
    };
  }

  // Simulate payment processing
  const randomSuccess = Math.random() > 0.1; // 90% success rate

  if (randomSuccess) {
    return {
      success: true,
      transaction_id: `sim-${Date.now()}`,
      message: "Payment processed successfully",
    };
  } else {
    return {
      success: false,
      message: "Payment processing failed. Please try again.",
    };
  }
}

// Webhook handler for payment status updates (in a real app, this would handle callbacks from payment gateway)
exports.handlePaymentWebhook = async (req, res) => {
  try {
    const { transaction_id, status, event_type } = req.body;

    // Validate webhook data
    if (!transaction_id || !status || !event_type) {
      return res.status(400).json({
        status: "error",
        message: "Invalid webhook data",
      });
    }

    // Update payment status based on webhook event
    if (event_type === "payment_updated") {
      // Update payment status in database
      await pool.execute(
        "UPDATE payments SET payment_status = ? WHERE transaction_id = ?",
        [status, transaction_id]
      );

      // If payment failed, update enrollment status
      if (status === "failed" || status === "refunded") {
        const [payments] = await pool.execute(
          "SELECT id, user_id, course_id FROM payments WHERE transaction_id = ?",
          [transaction_id]
        );

        if (payments.length > 0) {
          const payment = payments[0];

          await pool.execute(
            `UPDATE enrollments SET status = ?
             WHERE user_id = ? AND course_id = ?`,
            [
              status === "refunded" ? "refunded" : "cancelled",
              payment.user_id,
              payment.course_id,
            ]
          );
        }
      }
    }

    res.status(200).json({
      status: "success",
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Payment webhook error:", error);
    res.status(500).json({
      status: "error",
      message: "Error processing webhook",
    });
  }
};
