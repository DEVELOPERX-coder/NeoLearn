const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");
const config = require("../config/config");

// Get all published courses with pagination and filters
exports.getAllCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get filter parameters
    const { category, search, level, priceMin, priceMax } = req.query;

    // Base query
    let query = `
      SELECT c.id, c.title, c.subtitle, c.description, c.thumbnail, c.price, c.level,
             c.created_at, c.status, c.instructor_id, u.username as instructor_name,
             AVG(r.rating) as average_rating, COUNT(DISTINCT r.id) as review_count,
             COUNT(DISTINCT e.id) as student_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN reviews r ON c.id = r.course_id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.status = 'published'
    `;

    const queryParams = [];

    // Add category filter
    if (category) {
      query += `
        AND c.id IN (
          SELECT cc.course_id FROM course_categories cc
          JOIN categories cat ON cc.category_id = cat.id
          WHERE cat.name = ?
        )
      `;
      queryParams.push(category);
    }

    // Add search filter
    if (search) {
      query += ` AND (c.title LIKE ? OR c.description LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Add level filter
    if (level) {
      query += ` AND c.level = ?`;
      queryParams.push(level);
    }

    // Add price filters
    if (priceMin !== undefined) {
      query += ` AND c.price >= ?`;
      queryParams.push(parseFloat(priceMin));
    }

    if (priceMax !== undefined) {
      query += ` AND c.price <= ?`;
      queryParams.push(parseFloat(priceMax));
    }

    // Group by course and add pagination
    query += `
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);

    // Execute query
    const [courses] = await pool.execute(query, queryParams);

    // Get total count for pagination
    const [countResult] = await pool.execute(
      `SELECT COUNT(DISTINCT c.id) as total FROM courses c
       WHERE c.status = 'published'`,
      []
    );

    const total = countResult[0].total;

    res.status(200).json({
      status: "success",
      results: courses.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: courses,
    });
  } catch (error) {
    console.error("Get all courses error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving courses",
    });
  }
};

// Get courses by instructor
exports.getInstructorCourses = async (req, res) => {
  try {
    // Ensure user is requesting their own courses
    const instructorId = parseInt(req.params.instructorId) || req.user.id;

    if (req.user.role !== "admin" && req.user.id !== instructorId) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to view these courses",
      });
    }

    const [courses] = await pool.execute(
      `SELECT c.*, COUNT(DISTINCT e.id) as student_count,
              AVG(r.rating) as average_rating, COUNT(DISTINCT r.id) as review_count
       FROM courses c
       LEFT JOIN enrollments e ON c.id = e.course_id
       LEFT JOIN reviews r ON c.id = r.course_id
       WHERE c.instructor_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [instructorId]
    );

    res.status(200).json({
      status: "success",
      results: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error("Get instructor courses error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving instructor courses",
    });
  }
};

// Get single course details
exports.getCourseById = async (req, res) => {
  try {
    const courseId = req.params.id;

    // Get course details
    const [courses] = await pool.execute(
      `SELECT c.*, u.username as instructor_name, 
              AVG(r.rating) as average_rating, COUNT(DISTINCT r.id) as review_count,
              COUNT(DISTINCT e.id) as student_count
       FROM courses c
       JOIN users u ON c.instructor_id = u.id
       LEFT JOIN reviews r ON c.id = r.course_id
       LEFT JOIN enrollments e ON c.id = e.course_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Course not found",
      });
    }

    const course = courses[0];

    // Get course sections and lessons
    const [sections] = await pool.execute(
      `SELECT s.id, s.title, s.description, s.order_index
       FROM sections s
       WHERE s.course_id = ?
       ORDER BY s.order_index`,
      [courseId]
    );

    for (const section of sections) {
      const [lessons] = await pool.execute(
        `SELECT l.id, l.title, l.description, l.content_type, 
                l.duration, l.is_free, l.order_index
         FROM lessons l
         WHERE l.section_id = ?
         ORDER BY l.order_index`,
        [section.id]
      );

      section.lessons = lessons;
    }

    // Get course categories
    const [categories] = await pool.execute(
      `SELECT c.id, c.name
       FROM categories c
       JOIN course_categories cc ON c.id = cc.category_id
       WHERE cc.course_id = ?`,
      [courseId]
    );

    // Check if user is enrolled
    let isEnrolled = false;
    if (req.user) {
      const [enrollments] = await pool.execute(
        `SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`,
        [req.user.id, courseId]
      );
      isEnrolled = enrollments.length > 0;
    }

    // Check if user is the instructor
    const isInstructor = req.user && req.user.id === course.instructor_id;

    res.status(200).json({
      status: "success",
      data: {
        ...course,
        sections,
        categories,
        isEnrolled,
        isInstructor,
      },
    });
  } catch (error) {
    console.error("Get course by ID error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving course",
    });
  }
};

// Create a new course
exports.createCourse = async (req, res) => {
  try {
    // Only instructors and admins can create courses
    if (req.user.role !== "instructor" && req.user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to create courses",
      });
    }

    const { title, subtitle, description, price, level, categoryIds } =
      req.body;

    // Basic validation
    if (!title) {
      return res.status(400).json({
        status: "error",
        message: "Course title is required",
      });
    }

    // Start database transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create course
      const [result] = await connection.execute(
        `INSERT INTO courses (instructor_id, title, subtitle, description, price, level, status)
         VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
        [
          req.user.id,
          title,
          subtitle || "",
          description || "",
          price || 0,
          level || "all-levels",
        ]
      );

      const courseId = result.insertId;

      // Add categories if provided
      if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
        const values = categoryIds.map((categoryId) => [courseId, categoryId]);
        await connection.query(
          "INSERT INTO course_categories (course_id, category_id) VALUES ?",
          [values]
        );
      }

      // Create initial section
      await connection.execute(
        `INSERT INTO sections (course_id, title, order_index)
         VALUES (?, 'Introduction', 1)`,
        [courseId]
      );

      // Commit transaction
      await connection.commit();

      res.status(201).json({
        status: "success",
        data: {
          id: courseId,
          title,
          subtitle,
          description,
          price,
          level,
          status: "draft",
          instructor_id: req.user.id,
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
    console.error("Create course error:", error);
    res.status(500).json({
      status: "error",
      message: "Error creating course",
    });
  }
};

// Update a course
exports.updateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;

    // Get current course to check permissions
    const [courses] = await pool.execute(
      "SELECT instructor_id FROM courses WHERE id = ?",
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Course not found",
      });
    }

    // Check if user is the course instructor or admin
    if (req.user.role !== "admin" && req.user.id !== courses[0].instructor_id) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to update this course",
      });
    }

    const { title, subtitle, description, price, level, status, categoryIds } =
      req.body;

    // Build update query dynamically
    const updates = [];
    const queryParams = [];

    if (title !== undefined) {
      updates.push("title = ?");
      queryParams.push(title);
    }

    if (subtitle !== undefined) {
      updates.push("subtitle = ?");
      queryParams.push(subtitle);
    }

    if (description !== undefined) {
      updates.push("description = ?");
      queryParams.push(description);
    }

    if (price !== undefined) {
      updates.push("price = ?");
      queryParams.push(parseFloat(price));
    }

    if (level !== undefined) {
      updates.push("level = ?");
      queryParams.push(level);
    }

    // Only allow status change if values are valid
    if (
      status !== undefined &&
      ["draft", "published", "archived"].includes(status)
    ) {
      updates.push("status = ?");
      queryParams.push(status);
    }

    // If no updates, return early
    if (updates.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No fields to update",
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update course
      queryParams.push(courseId);
      await connection.execute(
        `UPDATE courses SET ${updates.join(", ")} WHERE id = ?`,
        queryParams
      );

      // Update categories if provided
      if (categoryIds && Array.isArray(categoryIds)) {
        // Remove existing categories
        await connection.execute(
          "DELETE FROM course_categories WHERE course_id = ?",
          [courseId]
        );

        // Add new categories
        if (categoryIds.length > 0) {
          const values = categoryIds.map((categoryId) => [
            courseId,
            categoryId,
          ]);
          await connection.query(
            "INSERT INTO course_categories (course_id, category_id) VALUES ?",
            [values]
          );
        }
      }

      // Commit transaction
      await connection.commit();

      res.status(200).json({
        status: "success",
        message: "Course updated successfully",
      });
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({
      status: "error",
      message: "Error updating course",
    });
  }
};

// Delete a course
exports.deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;

    // Get current course to check permissions
    const [courses] = await pool.execute(
      "SELECT instructor_id, thumbnail FROM courses WHERE id = ?",
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Course not found",
      });
    }

    // Check if user is the course instructor or admin
    if (req.user.role !== "admin" && req.user.id !== courses[0].instructor_id) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to delete this course",
      });
    }

    // Get all lesson content paths for deletion
    const [sections] = await pool.execute(
      "SELECT id FROM sections WHERE course_id = ?",
      [courseId]
    );

    const sectionIds = sections.map((section) => section.id);

    if (sectionIds.length > 0) {
      const [lessons] = await pool.execute(
        `SELECT content_url FROM lessons WHERE section_id IN (${sectionIds.join(
          ","
        )})
         AND content_type = 'video'`
      );

      // Delete course from database first
      await pool.execute("DELETE FROM courses WHERE id = ?", [courseId]);

      // Then delete associated files
      const thumbnail = courses[0].thumbnail;
      if (thumbnail) {
        const thumbnailPath = path.join(__dirname, "..", thumbnail);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }

      // Delete lesson videos
      for (const lesson of lessons) {
        if (lesson.content_url) {
          const contentPath = path.join(__dirname, "..", lesson.content_url);
          if (fs.existsSync(contentPath)) {
            fs.unlinkSync(contentPath);
          }
        }
      }
    } else {
      // If no sections, just delete the course
      await pool.execute("DELETE FROM courses WHERE id = ?", [courseId]);
    }

    res.status(200).json({
      status: "success",
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({
      status: "error",
      message: "Error deleting course",
    });
  }
};

// Upload course thumbnail
exports.uploadCourseThumbnail = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No file uploaded",
      });
    }

    const courseId = req.params.id;

    // Check if course exists and user has permission
    const [courses] = await pool.execute(
      "SELECT instructor_id, thumbnail FROM courses WHERE id = ?",
      [courseId]
    );

    if (courses.length === 0) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);

      return res.status(404).json({
        status: "error",
        message: "Course not found",
      });
    }

    // Check if user is the course instructor or admin
    if (req.user.role !== "admin" && req.user.id !== courses[0].instructor_id) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);

      return res.status(403).json({
        status: "error",
        message: "You do not have permission to update this course",
      });
    }

    // Remove previous thumbnail if exists
    const previousThumbnail = courses[0].thumbnail;
    if (previousThumbnail) {
      const thumbnailPath = path.join(__dirname, "..", previousThumbnail);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    // Update course with new thumbnail path
    const thumbnailPath = "/uploads/courses/" + req.file.filename;
    await pool.execute("UPDATE courses SET thumbnail = ? WHERE id = ?", [
      thumbnailPath,
      courseId,
    ]);

    res.status(200).json({
      status: "success",
      data: {
        thumbnail: thumbnailPath,
      },
    });
  } catch (error) {
    console.error("Upload thumbnail error:", error);

    // Delete uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      status: "error",
      message: "Error uploading thumbnail",
    });
  }
};
