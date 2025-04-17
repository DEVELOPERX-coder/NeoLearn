const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../config/db");

exports.createCheckoutSession = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;

    // Check if user is already enrolled
    const [enrollments] = await db.query(
      "SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?",
      [userId, courseId]
    );

    if (enrollments.length > 0) {
      return res
        .status(400)
        .json({ message: "Already enrolled in this course" });
    }

    // Get course details
    const [courses] = await db.query("SELECT * FROM courses WHERE id = ?", [
      courseId,
    ]);

    if (courses.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = courses[0];

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.title,
              description: course.description?.substring(0, 100) || "",
            },
            unit_amount: Math.round(course.price * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/courses/${courseId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/courses/${courseId}`,
      metadata: {
        courseId,
        userId,
      },
    });

    // Insert pending payment record
    await db.query(
      "INSERT INTO payments (user_id, course_id, amount, transaction_id, status) VALUES (?, ?, ?, ?, ?)",
      [userId, courseId, course.price, session.id, "pending"]
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ message: "Payment processing error" });
  }
};

exports.handleWebhook = async (req, res) => {
  const payload = req.body;
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      // Update payment status
      await db.query(
        "UPDATE payments SET status = ? WHERE transaction_id = ?",
        ["completed", session.id]
      );

      // Create enrollment
      await db.query(
        "INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)",
        [session.metadata.userId, session.metadata.courseId]
      );

      console.log(`Payment completed for course ${session.metadata.courseId}`);
    } catch (error) {
      console.error("Webhook processing error:", error);
    }
  }

  res.status(200).end();
};
