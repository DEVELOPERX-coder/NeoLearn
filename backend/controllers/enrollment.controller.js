const { pool } = require("../config/db");

// Get user enrollments
exports.getUserEnrollments = async (req, res) => {
  try {
    // Get user ID from authenticated user or params
    const userId = parseInt(req.params.userId) || req.user.id;

    // Only allow users to view their own enrollments (except admins)
    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to view these enrollments",
      });
    }

    // Get enrollments with course details
    const [enrollments] = await pool.execute(
      `SELECT e.id, e.status, e.enrolled_at, e.completed_at,
              c.id as course_id, c.title, c.subtitle, c.thumbnail, c.level,
              u.username as instructor_name,
              (SELECT COUNT(*) FROM lessons l JOIN sections s ON l.section_id = s.id 
               WHERE s.course_id = c.id) as total_lessons,
              (SELECT COUNT(*) FROM progress p 
               JOIN lessons l ON p.lesson_id = l.id 
               JOIN sections s ON l.section_id = s.id 
               WHERE p.enrollment_id = e.id AND s.course_id = c.id AND p.completed = 1) as completed_lessons
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN users u ON c.instructor_id = u.id
       WHERE e.user_id = ?
       ORDER BY e.enrolled_at DESC`,
      [userId]
    );

    // Calculate progress percentage for each enrollment
    const enrollmentsWithProgress = enrollments.map((enrollment) => {
      const progressPercentage =
        enrollment.total_lessons > 0
          ? Math.round(
              (enrollment.completed_lessons / enrollment.total_lessons) * 100
            )
          : 0;

      return {
        ...enrollment,
        progress_percentage: progressPercentage,
      };
    });

    res.status(200).json({
      status: "success",
      results: enrollmentsWithProgress.length,
      data: enrollmentsWithProgress,
    });
  } catch (error) {
    console.error("Get user enrollments error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving enrollments",
    });
  }
};

// Get enrollment details
exports.getEnrollmentById = async (req, res) => {
  try {
    const enrollmentId = req.params.id;

    // Get enrollment details
    const [enrollments] = await pool.execute(
      `SELECT e.*, c.title as course_title, u.username as student_name
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN users u ON e.user_id = u.id
       WHERE e.id = ?`,
      [enrollmentId]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Enrollment not found",
      });
    }

    const enrollment = enrollments[0];

    // Check if user is authorized to view this enrollment
    if (req.user.role !== "admin" && req.user.id !== enrollment.user_id) {
      // Check if user is the course instructor
      const [instructorCheck] = await pool.execute(
        "SELECT instructor_id FROM courses WHERE id = ?",
        [enrollment.course_id]
      );

      if (
        instructorCheck.length === 0 ||
        req.user.id !== instructorCheck[0].instructor_id
      ) {
        return res.status(403).json({
          status: "error",
          message: "You are not authorized to view this enrollment",
        });
      }
    }

    // Get course details with sections and lessons
    const [courses] = await pool.execute(
      `SELECT c.*, u.username as instructor_name
       FROM courses c
       JOIN users u ON c.instructor_id = u.id
       WHERE c.id = ?`,
      [enrollment.course_id]
    );

    const course = courses[0];

    // Get sections
    const [sections] = await pool.execute(
      `SELECT s.id, s.title, s.description, s.order_index
       FROM sections s
       WHERE s.course_id = ?
       ORDER BY s.order_index`,
      [enrollment.course_id]
    );

    // Get lessons and progress for each section
    for (const section of sections) {
      const [lessons] = await pool.execute(
        `SELECT l.id, l.title, l.description, l.content_type, l.duration, l.is_free, l.order_index,
                p.completed, p.last_watched_position, p.last_watched_at
         FROM lessons l
         LEFT JOIN progress p ON l.id = p.lesson_id AND p.enrollment_id = ?
         WHERE l.section_id = ?
         ORDER BY l.order_index`,
        [enrollmentId, section.id]
      );

      section.lessons = lessons;
    }

    // Get overall progress stats
    const [progressStats] = await pool.execute(
      `SELECT COUNT(DISTINCT l.id) as total_lessons,
              COUNT(DISTINCT CASE WHEN p.completed = 1 THEN p.id END) as completed_lessons
       FROM lessons l
       JOIN sections s ON l.section_id = s.id
       LEFT JOIN progress p ON l.id = p.lesson_id AND p.enrollment_id = ?
       WHERE s.course_id = ?`,
      [enrollmentId, enrollment.course_id]
    );

    const stats = progressStats[0];
    const progressPercentage =
      stats.total_lessons > 0
        ? Math.round((stats.completed_lessons / stats.total_lessons) * 100)
        : 0;

    res.status(200).json({
      status: "success",
      data: {
        enrollment,
        course,
        sections,
        progress: {
          completed_lessons: stats.completed_lessons,
          total_lessons: stats.total_lessons,
          percentage: progressPercentage,
        },
      },
    });
  } catch (error) {
    console.error("Get enrollment by ID error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving enrollment",
    });
  }
};

// Enroll in a course
exports.enrollInCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user.id;

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
        message: "This course is not currently available for enrollment",
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

    // For now, we'll simulate a successful payment process
    // In a real application, you would integrate with payment gateways like Stripe
    const paymentSuccessful = true;

    if (!paymentSuccessful && course.price > 0) {
      return res.status(400).json({
        status: "error",
        message: "Payment processing failed",
      });
    }

    // Create enrollment
    const [result] = await pool.execute(
      "INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, ?)",
      [userId, courseId, "active"]
    );

    const enrollmentId = result.insertId;

    // Create empty progress records for all lessons
    const [lessons] = await pool.execute(
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

      await pool.query(
        `INSERT INTO progress (enrollment_id, lesson_id, completed, last_watched_position, last_watched_at)
         VALUES ?`,
        [progressValues]
      );
    }

    // Record payment if course is not free
    if (course.price > 0) {
      await pool.execute(
        `INSERT INTO payments (user_id, course_id, amount, payment_status, transaction_id)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, courseId, course.price, "completed", `sim-${Date.now()}`]
      );
    }

    res.status(201).json({
      status: "success",
      data: {
        enrollment_id: enrollmentId,
        course_id: parseInt(courseId),
        user_id: userId,
        status: "active",
        enrolled_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Enroll in course error:", error);
    res.status(500).json({
      status: "error",
      message: "Error enrolling in course",
    });
  }
};

// Update lesson progress
exports.updateProgress = async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const { completed, lastWatchedPosition } = req.body;

    // Get enrollment for this user and lesson
    const [enrollments] = await pool.execute(
      `SELECT e.id FROM enrollments e
       JOIN sections s ON e.course_id = s.course_id
       JOIN lessons l ON s.id = l.section_id
       WHERE e.user_id = ? AND l.id = ?`,
      [req.user.id, lessonId]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "You are not enrolled in this course",
      });
    }

    const enrollmentId = enrollments[0].id;

    // Check if progress record exists
    const [existingProgress] = await pool.execute(
      "SELECT id FROM progress WHERE enrollment_id = ? AND lesson_id = ?",
      [enrollmentId, lessonId]
    );

    // Build update data
    const updateData = {};
    if (completed !== undefined) updateData.completed = completed ? 1 : 0;
    if (lastWatchedPosition !== undefined)
      updateData.last_watched_position = lastWatchedPosition;
    updateData.last_watched_at = new Date();

    // Insert or update progress
    if (existingProgress.length > 0) {
      const progressId = existingProgress[0].id;

      // Build update query
      const updates = [];
      const queryParams = [];

      Object.entries(updateData).forEach(([key, value]) => {
        updates.push(`${key.replace(/([A-Z])/g, "_$1").toLowerCase()} = ?`);
        queryParams.push(value);
      });

      queryParams.push(progressId);

      await pool.execute(
        `UPDATE progress SET ${updates.join(", ")} WHERE id = ?`,
        queryParams
      );
    } else {
      // Insert new progress record
      await pool.execute(
        `INSERT INTO progress (enrollment_id, lesson_id, completed, last_watched_position, last_watched_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          enrollmentId,
          lessonId,
          updateData.completed || 0,
          updateData.last_watched_position || 0,
          updateData.last_watched_at,
        ]
      );
    }

    // Check if all lessons are completed to update enrollment status
    if (completed) {
      const [courseProgress] = await pool.execute(
        `SELECT
          (SELECT COUNT(*) FROM lessons l JOIN sections s ON l.section_id = s.id 
           WHERE s.course_id = (SELECT course_id FROM enrollments WHERE id = ?)) as total_lessons,
          (SELECT COUNT(*) FROM progress p WHERE p.enrollment_id = ? AND p.completed = 1) as completed_lessons`,
        [enrollmentId, enrollmentId]
      );

      if (
        courseProgress[0].total_lessons === courseProgress[0].completed_lessons
      ) {
        await pool.execute(
          "UPDATE enrollments SET status = ?, completed_at = ? WHERE id = ?",
          ["completed", new Date(), enrollmentId]
        );
      }
    }

    res.status(200).json({
      status: "success",
      message: "Progress updated successfully",
    });
  } catch (error) {
    console.error("Update progress error:", error);
    res.status(500).json({
      status: "error",
      message: "Error updating progress",
    });
  }
};
