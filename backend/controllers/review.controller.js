exports.createOrUpdateReview = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    const { rating, reviewText } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: "error",
        message: "Rating must be between 1 and 5",
      });
    }

    // Check if user is enrolled in the course
    const [enrollments] = await pool.execute(
      "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?",
      [userId, courseId]
    );

    if (enrollments.length === 0) {
      return res.status(403).json({
        status: "error",
        message: "You must be enrolled in the course to review it",
      });
    }

    // Check if review already exists
    const [existingReviews] = await pool.execute(
      "SELECT id FROM reviews WHERE user_id = ? AND course_id = ?",
      [userId, courseId]
    );

    let reviewId;

    if (existingReviews.length > 0) {
      // Update existing review
      reviewId = existingReviews[0].id;
      await pool.execute(
        "UPDATE reviews SET rating = ?, review_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [rating, reviewText || "", reviewId]
      );
    } else {
      // Create new review
      const [result] = await pool.execute(
        "INSERT INTO reviews (user_id, course_id, rating, review_text) VALUES (?, ?, ?, ?)",
        [userId, courseId, rating, reviewText || ""]
      );
      reviewId = result.insertId;
    }

    res.status(200).json({
      status: "success",
      data: {
        id: reviewId,
        user_id: userId,
        course_id: parseInt(courseId),
        rating,
        review_text: reviewText || "",
      },
    });
  } catch (error) {
    console.error("Create/update review error:", error);
    res.status(500).json({
      status: "error",
      message: "Error creating/updating review",
    });
  }
};

// Get course reviews
exports.getCourseReviews = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get reviews with user info
    const [reviews] = await pool.execute(
      `SELECT r.id, r.rating, r.review_text, r.created_at, r.updated_at,
                r.user_id, u.username, up.profile_picture
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE r.course_id = ?
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
      [courseId, limit, offset]
    );

    // Get total count for pagination
    const [countResult] = await pool.execute(
      "SELECT COUNT(*) as total FROM reviews WHERE course_id = ?",
      [courseId]
    );

    // Get rating summary
    const [ratingSummary] = await pool.execute(
      `SELECT 
           AVG(rating) as average_rating,
           COUNT(*) as total_reviews,
           SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
           SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
           SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
           SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
           SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
         FROM reviews
         WHERE course_id = ?`,
      [courseId]
    );

    const total = countResult[0].total;

    res.status(200).json({
      status: "success",
      results: reviews.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      rating_summary: ratingSummary[0],
      data: reviews,
    });
  } catch (error) {
    console.error("Get course reviews error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving reviews",
    });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;

    // Get review details to check ownership
    const [reviews] = await pool.execute(
      "SELECT user_id FROM reviews WHERE id = ?",
      [reviewId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    // Check if user is the review owner or admin
    if (req.user.role !== "admin" && req.user.id !== reviews[0].user_id) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to delete this review",
      });
    }

    // Delete review
    await pool.execute("DELETE FROM reviews WHERE id = ?", [reviewId]);

    res.status(200).json({
      status: "success",
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({
      status: "error",
      message: "Error deleting review",
    });
  }
};
