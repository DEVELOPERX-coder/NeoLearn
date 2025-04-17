const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");

// User Management
// ---------------

// Get all users with pagination and filters
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get filter parameters
    const { search, role, status } = req.query;

    // Base query
    let query = `
      SELECT u.id, u.username, u.email, u.role, u.created_at, u.is_active,
             up.full_name, up.profile_picture,
             (SELECT COUNT(*) FROM courses WHERE instructor_id = u.id) as course_count,
             (SELECT COUNT(*) FROM enrollments WHERE user_id = u.id) as enrollment_count
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE 1=1
    `;

    const queryParams = [];

    // Add search filter
    if (search) {
      query += ` AND (u.username LIKE ? OR u.email LIKE ? OR up.full_name LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Add role filter
    if (role) {
      query += ` AND u.role = ?`;
      queryParams.push(role);
    }

    // Add status filter
    if (status) {
      const isActive = status === "active" ? 1 : 0;
      query += ` AND u.is_active = ?`;
      queryParams.push(isActive);
    }

    // Add pagination
    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    // Execute query
    const [users] = await pool.execute(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total FROM users u
      WHERE 1=1
    `;

    const countParams = [];

    // Add search filter to count query
    if (search) {
      countQuery += ` AND (u.username LIKE ? OR u.email LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    // Add role filter to count query
    if (role) {
      countQuery += ` AND u.role = ?`;
      countParams.push(role);
    }

    // Add status filter to count query
    if (status) {
      const isActive = status === "active" ? 1 : 0;
      countQuery += ` AND u.is_active = ?`;
      countParams.push(isActive);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.status(200).json({
      status: "success",
      results: users.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving users",
    });
  }
};

// Get user details
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Get user details with profile
    const [users] = await pool.execute(
      `SELECT u.id, u.username, u.email, u.role, u.created_at, u.is_active,
              up.*
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const user = users[0];

    // Get user statistics
    const [courseStats] = await pool.execute(
      `SELECT COUNT(*) as course_count,
              (SELECT COUNT(*) FROM enrollments WHERE user_id = ?) as enrollment_count,
              (SELECT COUNT(*) FROM reviews WHERE user_id = ?) as review_count,
              (SELECT COUNT(*) FROM payments WHERE user_id = ?) as payment_count
       FROM courses
       WHERE instructor_id = ?`,
      [userId, userId, userId, userId]
    );

    res.status(200).json({
      status: "success",
      data: {
        ...user,
        stats: courseStats[0],
      },
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving user",
    });
  }
};

// Create a new user (admin only)
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role, fullName } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Please provide username, email and password",
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "User with this email or username already exists",
      });
    }

    // Validate role
    const validRoles = ["student", "instructor", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid role. Must be student, instructor, or admin",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create user
      const [result] = await connection.execute(
        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
        [username, email, hashedPassword, role]
      );

      const userId = result.insertId;

      // Create user profile
      await connection.execute(
        "INSERT INTO user_profiles (user_id, full_name) VALUES (?, ?)",
        [userId, fullName || username]
      );

      // Commit transaction
      await connection.commit();

      res.status(201).json({
        status: "success",
        data: {
          id: userId,
          username,
          email,
          role,
          full_name: fullName || username,
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
    console.error("Create user error:", error);
    res.status(500).json({
      status: "error",
      message: "Error creating user",
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, role, isActive, fullName, bio } = req.body;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE id = ?",
      [userId]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update user table
      if (username || email || role !== undefined || isActive !== undefined) {
        const updates = [];
        const queryParams = [];

        if (username) {
          updates.push("username = ?");
          queryParams.push(username);
        }

        if (email) {
          updates.push("email = ?");
          queryParams.push(email);
        }

        if (role !== undefined) {
          const validRoles = ["student", "instructor", "admin"];
          if (!validRoles.includes(role)) {
            return res.status(400).json({
              status: "error",
              message: "Invalid role. Must be student, instructor, or admin",
            });
          }
          updates.push("role = ?");
          queryParams.push(role);
        }

        if (isActive !== undefined) {
          updates.push("is_active = ?");
          queryParams.push(isActive ? 1 : 0);
        }

        if (updates.length > 0) {
          queryParams.push(userId);
          await connection.execute(
            `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
            queryParams
          );
        }
      }

      // Update user profile
      if (fullName || bio !== undefined) {
        const profileUpdates = [];
        const profileParams = [];

        if (fullName) {
          profileUpdates.push("full_name = ?");
          profileParams.push(fullName);
        }

        if (bio !== undefined) {
          profileUpdates.push("bio = ?");
          profileParams.push(bio);
        }

        if (profileUpdates.length > 0) {
          profileParams.push(userId);

          // Check if profile exists
          const [profiles] = await connection.execute(
            "SELECT id FROM user_profiles WHERE user_id = ?",
            [userId]
          );

          if (profiles.length > 0) {
            // Update existing profile
            await connection.execute(
              `UPDATE user_profiles SET ${profileUpdates.join(
                ", "
              )} WHERE user_id = ?`,
              profileParams
            );
          } else {
            // Create new profile
            const insertParams = [userId];
            const insertFields = ["user_id"];

            if (fullName) {
              insertFields.push("full_name");
              insertParams.push(fullName);
            }

            if (bio !== undefined) {
              insertFields.push("bio");
              insertParams.push(bio);
            }

            await connection.execute(
              `INSERT INTO user_profiles (${insertFields.join(
                ", "
              )}) VALUES (${insertFields.map(() => "?").join(", ")})`,
              insertParams
            );
          }
        }
      }

      // Commit transaction
      await connection.commit();

      res.status(200).json({
        status: "success",
        message: "User updated successfully",
      });
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      status: "error",
      message: "Error updating user",
    });
  }
};

// Reset user password
exports.resetUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        status: "error",
        message: "New password is required",
      });
    }

    // Check if user exists
    const [users] = await pool.execute("SELECT id FROM users WHERE id = ?", [
      userId,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
      hashedPassword,
      userId,
    ]);

    res.status(200).json({
      status: "success",
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      status: "error",
      message: "Error resetting password",
    });
  }
};

// Course Management
// ----------------

// Get all courses for admin (includes draft and unpublished)
exports.getAllCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get filter parameters
    const { search, status, instructor } = req.query;

    // Base query
    let query = `
      SELECT c.id, c.title, c.subtitle, c.thumbnail, c.price, c.level,
             c.status, c.created_at, c.instructor_id, u.username as instructor_name,
             AVG(r.rating) as average_rating, COUNT(DISTINCT r.id) as review_count,
             COUNT(DISTINCT e.id) as student_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN reviews r ON c.id = r.course_id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE 1=1
    `;

    const queryParams = [];

    // Add search filter
    if (search) {
      query += ` AND (c.title LIKE ? OR c.description LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Add status filter
    if (status) {
      query += ` AND c.status = ?`;
      queryParams.push(status);
    }

    // Add instructor filter
    if (instructor) {
      query += ` AND c.instructor_id = ?`;
      queryParams.push(instructor);
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
    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as total FROM courses c
      WHERE 1=1
    `;

    const countParams = [];

    // Add search filter to count query
    if (search) {
      countQuery += ` AND (c.title LIKE ? OR c.description LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    // Add status filter to count query
    if (status) {
      countQuery += ` AND c.status = ?`;
      countParams.push(status);
    }

    // Add instructor filter to count query
    if (instructor) {
      countQuery += ` AND c.instructor_id = ?`;
      countParams.push(instructor);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
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
    console.error("Admin get all courses error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving courses",
    });
  }
};

// Approve or reject a course
exports.updateCourseStatus = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { status, rejectionReason } = req.body;

    // Validate status
    if (
      !status ||
      !["published", "draft", "archived", "rejected"].includes(status)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status value",
      });
    }

    // Check if course exists
    const [courses] = await pool.execute(
      "SELECT id, instructor_id, title FROM courses WHERE id = ?",
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Course not found",
      });
    }

    // Update course status
    await pool.execute("UPDATE courses SET status = ? WHERE id = ?", [
      status,
      courseId,
    ]);

    // If rejected, create notification for instructor
    if (status === "rejected" && rejectionReason) {
      const course = courses[0];
      await pool.execute(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          course.instructor_id,
          "Course Rejected",
          `Your course "${course.title}" was rejected: ${rejectionReason}`,
          "course_rejection",
          courseId,
        ]
      );
    }

    res.status(200).json({
      status: "success",
      message: `Course status updated to ${status}`,
    });
  } catch (error) {
    console.error("Update course status error:", error);
    res.status(500).json({
      status: "error",
      message: "Error updating course status",
    });
  }
};

// Category Management
// ------------------

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    // Get categories with course counts
    const [categories] = await pool.execute(
      `SELECT c.id, c.name, c.description, c.created_at,
              COUNT(DISTINCT cc.course_id) as course_count
       FROM categories c
       LEFT JOIN course_categories cc ON c.id = cc.category_id
       GROUP BY c.id
       ORDER BY c.name`
    );

    res.status(200).json({
      status: "success",
      results: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("Get all categories error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving categories",
    });
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Category name is required",
      });
    }

    // Check if category already exists
    const [existingCategories] = await pool.execute(
      "SELECT id FROM categories WHERE name = ?",
      [name]
    );

    if (existingCategories.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Category with this name already exists",
      });
    }

    // Create category
    const [result] = await pool.execute(
      "INSERT INTO categories (name, description) VALUES (?, ?)",
      [name, description || ""]
    );

    res.status(201).json({
      status: "success",
      data: {
        id: result.insertId,
        name,
        description: description || "",
        created_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({
      status: "error",
      message: "Error creating category",
    });
  }
};

// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description } = req.body;

    // Check if category exists
    const [categories] = await pool.execute(
      "SELECT id FROM categories WHERE id = ?",
      [categoryId]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Category not found",
      });
    }

    // Check if name exists on another category
    if (name) {
      const [existingCategories] = await pool.execute(
        "SELECT id FROM categories WHERE name = ? AND id != ?",
        [name, categoryId]
      );

      if (existingCategories.length > 0) {
        return res.status(400).json({
          status: "error",
          message: "Category with this name already exists",
        });
      }
    }

    // Build update query
    const updates = [];
    const queryParams = [];

    if (name) {
      updates.push("name = ?");
      queryParams.push(name);
    }

    if (description !== undefined) {
      updates.push("description = ?");
      queryParams.push(description);
    }

    // If no updates, return early
    if (updates.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No fields to update",
      });
    }

    // Update category
    queryParams.push(categoryId);
    await pool.execute(
      `UPDATE categories SET ${updates.join(", ")} WHERE id = ?`,
      queryParams
    );

    res.status(200).json({
      status: "success",
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({
      status: "error",
      message: "Error updating category",
    });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if category is being used by any courses
    const [courseCounts] = await pool.execute(
      "SELECT COUNT(*) as count FROM course_categories WHERE category_id = ?",
      [categoryId]
    );

    if (courseCounts[0].count > 0) {
      return res.status(400).json({
        status: "error",
        message: "Cannot delete category that is being used by courses",
      });
    }

    // Delete category
    await pool.execute("DELETE FROM categories WHERE id = ?", [categoryId]);

    res.status(200).json({
      status: "success",
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      status: "error",
      message: "Error deleting category",
    });
  }
};

// Dashboard Statistics
// -------------------

// Get admin dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get user stats
    const [userStats] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as student_count,
        (SELECT COUNT(*) FROM users WHERE role = 'instructor') as instructor_count,
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as new_users_last_30_days
    `);

    // Get course stats
    const [courseStats] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM courses) as total_courses,
        (SELECT COUNT(*) FROM courses WHERE status = 'published') as published_courses,
        (SELECT COUNT(*) FROM courses WHERE status = 'draft') as draft_courses,
        (SELECT COUNT(*) FROM courses WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as new_courses_last_30_days
    `);

    // Get enrollment stats
    const [enrollmentStats] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM enrollments) as total_enrollments,
        (SELECT COUNT(*) FROM enrollments WHERE enrolled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as new_enrollments_last_30_days,
        (SELECT COUNT(*) FROM enrollments WHERE status = 'completed') as completed_enrollments
    `);

    // Get revenue stats
    const [revenueStats] = await pool.execute(`
      SELECT 
        IFNULL(SUM(amount), 0) as total_revenue,
        IFNULL((SELECT SUM(amount) FROM payments WHERE payment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)), 0) as revenue_last_30_days,
        IFNULL((SELECT SUM(amount) FROM payments WHERE payment_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)), 0) as revenue_last_7_days,
        (SELECT COUNT(*) FROM payments) as total_transactions
    FROM payments
    `);

    // Get top courses
    const [topCourses] = await pool.execute(`
      SELECT c.id, c.title, c.price, u.username as instructor_name,
             COUNT(e.id) as enrollment_count,
             AVG(r.rating) as average_rating,
             COUNT(r.id) as review_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN reviews r ON c.id = r.course_id
      WHERE c.status = 'published'
      GROUP BY c.id
      ORDER BY enrollment_count DESC
      LIMIT 5
    `);

    // Get top instructors
    const [topInstructors] = await pool.execute(`
      SELECT u.id, u.username, up.full_name, up.profile_picture,
             COUNT(DISTINCT c.id) as course_count,
             COUNT(DISTINCT e.id) as total_students,
             AVG(r.rating) as average_rating
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      JOIN courses c ON u.id = c.instructor_id
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN reviews r ON c.id = r.course_id
      WHERE u.role = 'instructor'
      GROUP BY u.id
      ORDER BY total_students DESC
      LIMIT 5
    `);

    res.status(200).json({
      status: "success",
      data: {
        users: userStats[0],
        courses: courseStats[0],
        enrollments: enrollmentStats[0],
        revenue: revenueStats[0],
        top_courses: topCourses,
        top_instructors: topInstructors,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving dashboard statistics",
    });
  }
};
