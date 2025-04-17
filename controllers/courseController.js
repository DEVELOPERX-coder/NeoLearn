const db = require("../config/db");

exports.getAllCourses = async (req, res) => {
  try {
    const { category, level, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar,
      AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN reviews r ON c.id = r.course_id
    `;

    const queryParams = [];
    const whereConditions = [];

    if (category) {
      whereConditions.push(
        `c.id IN (SELECT course_id FROM course_categories WHERE category_id = ?)`
      );
      queryParams.push(category);
    }

    if (level) {
      whereConditions.push(`c.level = ?`);
      queryParams.push(level);
    }

    if (search) {
      whereConditions.push(`(c.title LIKE ? OR c.description LIKE ?)`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(" AND ")}`;
    }

    query += ` GROUP BY c.id LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const [courses] = await db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM courses c`;

    if (whereConditions.length > 0) {
      countQuery += ` WHERE ${whereConditions.join(" AND ")}`;
    }

    const [totalCount] = await db.query(countQuery, queryParams.slice(0, -2));

    res.json({
      courses,
      total: totalCount[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount[0].total / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const [courses] = await db.query(
      `
      SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar, 
      AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN reviews r ON c.id = r.course_id
      WHERE c.id = ?
      GROUP BY c.id
    `,
      [req.params.id]
    );

    if (courses.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Get course categories
    const [categories] = await db.query(
      `
      SELECT c.id, c.name FROM categories c
      JOIN course_categories cc ON c.id = cc.category_id
      WHERE cc.course_id = ?
    `,
      [req.params.id]
    );

    const course = courses[0];
    course.categories = categories;

    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createCourse = async (req, res) => {
  try {
    // Check if user is an instructor
    if (req.user.role !== "instructor" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only instructors can create courses" });
    }

    const { title, description, price, level, categories } = req.body;

    // Thumbnail path if uploaded
    const thumbnail = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      "INSERT INTO courses (title, instructor_id, description, price, thumbnail, level) VALUES (?, ?, ?, ?, ?, ?)",
      [title, req.user.id, description, price, thumbnail, level || "all-levels"]
    );

    const courseId = result.insertId;

    // Add categories if provided
    if (categories && categories.length > 0) {
      const categoryValues = categories.split(",").map((categoryId) => {
        return [courseId, parseInt(categoryId.trim())];
      });

      await db.query(
        "INSERT INTO course_categories (course_id, category_id) VALUES ?",
        [categoryValues]
      );
    }

    res.status(201).json({
      message: "Course created successfully",
      courseId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Additional controller methods would continue here...
