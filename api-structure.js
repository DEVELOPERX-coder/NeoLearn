/**
 * NeoLearn Platform Backend API Structure
 * 
 * This file outlines the backend API endpoints, authentication, and
 * security implementations for the NeoLearn online learning platform.
 */

// ====================== SERVER SETUP ======================

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ====================== MIDDLEWARE ======================

// Basic middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

app.use('/api/', apiLimiter);

// ====================== DATABASE CONNECTION ======================

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'neolearn',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// ====================== FILE UPLOAD CONFIGURATION ======================

// Configure storage for course content
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB file size limit
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const fileTypes = /jpeg|jpg|png|gif|mp4|webm|pdf|zip|doc|docx|ppt|pptx|xls|xlsx/;
    const mimetype = fileTypes.test(file.mimetype);
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb('Error: Only the following file formats are allowed: ' + fileTypes);
  }
});

// ====================== AUTHENTICATION MIDDLEWARE ======================

// JWT verification middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, process.env.JWT_SECRET || 'neolearn_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  
  return (req, res, next) => {
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    next();
  };
};

// ====================== USER AUTHENTICATION ROUTES ======================

// User registration
app.post('/api/auth/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').notEmpty().trim().escape(),
  body('lastName').notEmpty().trim().escape(),
  body('role').isIn(['student', 'instructor']),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { username, email, password, firstName, lastName, role } = req.body;
    
    // Check if username or email already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert the new user
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, firstName, lastName, role]
    );
    
    // Create session and generate token
    const userId = result.insertId;
    const token = jwt.sign(
      { id: userId, username, role },
      process.env.JWT_SECRET || 'neolearn_secret_key',
      { expiresIn: '24h' }
    );
    
    // Insert session info
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 24);
    
    await pool.query(
      'INSERT INTO user_sessions (session_id, user_id, expiry_time, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [token, userId, expiryTime, req.ip, req.headers['user-agent']]
    );
    
    // Return user info and token
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        username,
        email,
        firstName,
        lastName,
        role
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// User login
app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { email, password } = req.body;
    
    // Get user by email
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Authentication failed' });
    }
    
    const user = users[0];
    
    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Authentication failed' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'neolearn_secret_key',
      { expiresIn: '24h' }
    );
    
    // Insert session info
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 24);
    
    await pool.query(
      'INSERT INTO user_sessions (session_id, user_id, expiry_time, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [token, user.user_id, expiryTime, req.ip, req.headers['user-agent']]
    );
    
    // Return user info and token
    res.status(200).json({
      message: 'Authentication successful',
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        profilePicture: user.profile_picture
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// User logout
app.post('/api/auth/logout', authenticateJWT, async (req, res) => {
  try {
    // Remove session from database
    await pool.query(
      'DELETE FROM user_sessions WHERE session_id = ?',
      [req.headers.authorization.split(' ')[1]]
    );
    
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// Get user profile
app.get('/api/users/profile', authenticateJWT, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT user_id, username, email, first_name, last_name, profile_picture, role, bio, created_at FROM users WHERE user_id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ user: users[0] });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
app.put('/api/users/profile', authenticateJWT, [
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape(),
  body('bio').optional().trim(),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { firstName, lastName, bio } = req.body;
    
    await pool.query(
      'UPDATE users SET first_name = ?, last_name = ?, bio = ? WHERE user_id = ?',
      [firstName, lastName, bio, req.user.id]
    );
    
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ====================== COURSE MANAGEMENT ROUTES ======================

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM categories');
    res.status(200).json({ categories });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new course (instructor only)
app.post('/api/courses', authenticateJWT, authorize('instructor'), [
  body('title').isLength({ min: 3 }).trim(),
  body('description').isLength({ min: 10 }).trim(),
  body('categoryId').isInt(),
  body('price').isFloat({ min: 0 }),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { title, description, categoryId, price, isPublished = false } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO courses (title, description, instructor_id, category_id, price, is_published) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, req.user.id, categoryId, price, isPublished]
    );
    
    res.status(201).json({
      message: 'Course created successfully',
      courseId: result.insertId
    });
  } catch (error) {
    console.error('Course creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all courses (with optional filtering)
app.get('/api/courses', async (req, res) => {
  try {
    const { category, search, instructor, priceMin, priceMax, sort } = req.query;
    
    let query = `
      SELECT c.*, u.first_name, u.last_name, cat.name AS category_name,
      (SELECT COUNT(*) FROM enrollments WHERE course_id = c.course_id) AS enrollment_count,
      (SELECT AVG(rating) FROM reviews r JOIN enrollments e ON r.enrollment_id = e.enrollment_id WHERE e.course_id = c.course_id) AS average_rating
      FROM courses c
      JOIN users u ON c.instructor_id = u.user_id
      JOIN categories cat ON c.category_id = cat.category_id
      WHERE c.is_published = TRUE
    `;
    
    const queryParams = [];
    
    // Apply filters
    if (category) {
      query += ' AND c.category_id = ?';
      queryParams.push(category);
    }
    
    if (search) {
      query += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (instructor) {
      query += ' AND c.instructor_id = ?';
      queryParams.push(instructor);
    }
    
    if (priceMin) {
      query += ' AND c.price >= ?';
      queryParams.push(priceMin);
    }
    
    if (priceMax) {
      query += ' AND c.price <= ?';
      queryParams.push(priceMax);
    }
    
    // Apply sorting
    if (sort) {
      switch (sort) {
        case 'newest':
          query += ' ORDER BY c.created_at DESC';
          break;
        case 'price_asc':
          query += ' ORDER BY c.price ASC';
          break;
        case 'price_desc':
          query += ' ORDER BY c.price DESC';
          break;
        case 'popular':
          query += ' ORDER BY enrollment_count DESC';
          break;
        case 'rating':
          query += ' ORDER BY average_rating DESC';
          break;
        default:
          query += ' ORDER BY c.created_at DESC';
      }
    } else {
      query += ' ORDER BY c.created_at DESC';
    }
    
    const [courses] = await pool.query(query, queryParams);
    
    res.status(200).json({ courses });
  } catch (error) {
    console.error('Courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course by ID with details
app.get('/api/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Get course details
    const [courses] = await pool.query(
      `SELECT c.*, u.first_name, u.last_name, u.profile_picture, u.bio, cat.name AS category_name,
      (SELECT COUNT(*) FROM enrollments WHERE course_id = c.course_id) AS enrollment_count,
      (SELECT AVG(rating) FROM reviews r JOIN enrollments e ON r.enrollment_id = e.enrollment_id WHERE e.course_id = c.course_id) AS average_rating,
      (SELECT COUNT(*) FROM reviews r JOIN enrollments e ON r.enrollment_id = e.enrollment_id WHERE e.course_id = c.course_id) AS review_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.user_id
      JOIN categories cat ON c.category_id = cat.category_id
      WHERE c.course_id = ?`,
      [courseId]
    );
    
    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const course = courses[0];
    
    // Get course sections and lectures if course is published or if requestor is the instructor
    let sections = [];
    if (course.is_published || (req.user && req.user.id === course.instructor_id)) {
      const [sectionsData] = await pool.query(
        `SELECT s.*, 
         (SELECT COUNT(*) FROM course_lectures WHERE section_id = s.section_id) AS lecture_count
         FROM course_sections s 
         WHERE s.course_id = ? 
         ORDER BY s.position`,
        [courseId]
      );
      
      // Get lectures for each section
      for (const section of sectionsData) {
        const [lecturesData] = await pool.query(
          `SELECT l.*, lt.name AS lecture_type_name
           FROM course_lectures l
           JOIN lecture_types lt ON l.type_id = lt.type_id
           WHERE l.section_id = ?
           ORDER BY l.position`,
          [section.section_id]
        );
        
        section.lectures = lecturesData;
      }
      
      sections = sectionsData;
    }
    
    // Get reviews
    const [reviews] = await pool.query(
      `SELECT r.*, u.username, u.first_name, u.last_name, u.profile_picture
       FROM reviews r
       JOIN enrollments e ON r.enrollment_id = e.enrollment_id
       JOIN users u ON e.user_id = u.user_id
       WHERE e.course_id = ?
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [courseId]
    );
    
    res.status(200).json({
      course,
      sections,
      reviews
    });
  } catch (error) {
    console.error('Course details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update course (instructor only)
app.put('/api/courses/:id', authenticateJWT, authorize('instructor'), [
  body('title').optional().isLength({ min: 3 }).trim(),
  body('description').optional().isLength({ min: 10 }).trim(),
  body('categoryId').optional().isInt(),
  body('price').optional().isFloat({ min: 0 }),
  body('isPublished').optional().isBoolean(),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const courseId = req.params.id;
    
    // Check if the course exists and belongs to the instructor
    const [courses] = await pool.query(
      'SELECT * FROM courses WHERE course_id = ? AND instructor_id = ?',
      [courseId, req.user.id]
    );
    
    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found or access denied' });
    }
    
    const { title, description, categoryId, price, isPublished } = req.body;
    
    // Build update query dynamically
    let updateQuery = 'UPDATE courses SET ';
    const queryParams = [];
    
    if (title) {
      updateQuery += 'title = ?, ';
      queryParams.push(title);
    }
    
    if (description) {
      updateQuery += 'description = ?, ';
      queryParams.push(description);
    }
    
    if (categoryId) {
      updateQuery += 'category_id = ?, ';
      queryParams.push(categoryId);
    }
    
    if (price !== undefined) {
      updateQuery += 'price = ?, ';
      queryParams.push(price);
    }
    
    if (isPublished !== undefined) {
      updateQuery += 'is_published = ?, ';
      queryParams.push(isPublished);
    }
    
    // Remove trailing comma and space
    updateQuery = updateQuery.slice(0, -2);
    
    updateQuery += ' WHERE course_id = ?';
    queryParams.push(courseId);
    
    await pool.query(updateQuery, queryParams);
    
    res.status(200).json({ message: 'Course updated successfully' });
  } catch (error) {
    console.error('Course update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add section to course (instructor only)
app.post('/api/courses/:id/sections', authenticateJWT, authorize('instructor'), [
  body('title').isLength({ min: 3 }).trim(),
  body('description').optional().trim(),
  body('position').isInt(),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const courseId = req.params.id;
    
    // Check if the course exists and belongs to the instructor
    const [courses] = await pool.query(
      'SELECT * FROM courses WHERE course_id = ? AND instructor_id = ?',
      [courseId, req.user.id]
    );
    
    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found or access denied' });
    }
    
    const { title, description, position } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO course_sections (course_id, title, description, position) VALUES (?, ?, ?, ?)',
      [courseId, title, description, position]
    );
    
    res.status(201).json({
      message: 'Section created successfully',
      sectionId: result.insertId
    });
  } catch (error) {
    console.error('Section creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add lecture to section (instructor only)
app.post('/api/sections/:id/lectures', authenticateJWT, authorize('instructor'), upload.single('file'), [
  body('title').isLength({ min: 3 }).trim(),
  body('description').optional().trim(),
  body('typeId').isInt(),
  body('content').optional(),
  body('position').isInt(),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const sectionId = req.params.id;
    
    // Check if the section exists and belongs to the instructor's course
    const [sections] = await pool.query(
      `SELECT s.* FROM course_sections s
       JOIN courses c ON s.course_id = c.course_id
       WHERE s.section_id = ? AND c.instructor_id = ?`,
      [sectionId, req.user.id]
    );
    
    if (sections.length === 0) {
      return res.status(404).json({ message: 'Section not found or access denied' });
    }
    
    const { title, description, typeId, content, position } = req.body;
    let filePath = null;
    
    // If file was uploaded
    if (req.file) {
      filePath = req.file.path;
    }
    
    const [result] = await pool.query(
      'INSERT INTO course_lectures (section_id, title, description, type_id, content, file_path, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sectionId, title, description, typeId, content, filePath, position]
    );
    
    res.status(201).json({
      message: 'Lecture created successfully',
      lectureId: result.insertId
    });
  } catch (error) {
    console.error('Lecture creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ====================== ENROLLMENT ROUTES ======================

// Enroll in a course
app.post('/api/courses/:id/enroll', authenticateJWT, async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;
    
    // Check if the course exists and is published
    const [courses] = await pool.query(
      'SELECT * FROM courses WHERE course_id = ? AND is_published = TRUE',
      [courseId]
    );
    
    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found or not available' });
    }
    
    // Check if already enrolled
    const [enrollments] = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    
    if (enrollments.length > 0) {
      return res.status(409).json({ message: 'Already enrolled in this course' });
    }
    
    // Create enrollment
    const [result] = await pool.query(
      'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );
    
    // Call procedure to create progress tracking entries
    await pool.query('CALL enroll_student(?, ?)', [userId, courseId]);
    
    res.status(201).json({
      message: 'Enrolled successfully',
      enrollmentId: result.insertId
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's enrolled courses
app.get('/api/enrollments', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [enrollments] = await pool.query(
      `SELECT e.*, c.title, c.description, c.thumbnail, c.category_id,
       u.first_name AS instructor_first_name, u.last_name AS instructor_last_name,
       cat.name AS category_name,
       (
           SELECT COALESCE(COUNT(completed.lecture_id) / NULLIF(COUNT(total.lecture_id), 0) * 100, 0)
           FROM course_lectures total
           JOIN course_sections cs ON total.section_id = cs.section_id
           LEFT JOIN (
               SELECT pt.lecture_id
               FROM progress_tracking pt
               WHERE pt.enrollment_id = e.enrollment_id AND pt.status = 'completed'
           ) completed ON total.lecture_id = completed.lecture_id
           WHERE cs.course_id = c.course_id
       ) AS progress_percentage
       FROM enrollments e
       JOIN courses c ON e.course_id = c.course_id
       JOIN users u ON c.instructor_id = u.user_id
       JOIN categories cat ON c.category_id = cat.category_id
       WHERE e.user_id = ?
       ORDER BY e.enrollment_date DESC`,
      [userId]
    );
    
    res.status(200).json({ enrollments });
  } catch (error) {
    console.error('Enrollments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update lecture progress
app.put('/api/progress/:enrollmentId/:lectureId', authenticateJWT, [
  body('status').isIn(['not_started', 'in_progress', 'completed']),
  body('progressPercentage').optional().isFloat({ min: 0, max: 100 }),
  body('lastPosition').optional().isInt({ min: 0 }),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { enrollmentId, lectureId } = req.params;
    const { status, progressPercentage, lastPosition } = req.body;
    
    // Check if the enrollment belongs to the user
    const [enrollments] = await pool.query(
      'SELECT * FROM enrollments WHERE enrollment_id = ? AND user_id = ?',
      [enrollmentId, req.user.id]
    );
    
    if (enrollments.length === 0) {
      return res.status(404).json({ message: 'Enrollment not found or access denied' });
    }
    
    // Update progress
    let query = 'UPDATE progress_tracking SET status = ?';
    const queryParams = [status];
    
    if (progressPercentage !== undefined) {
      query += ', progress_percentage = ?';
      queryParams.push(progressPercentage);
    }
    
    if (lastPosition !== undefined) {
      query += ', last_position = ?';
      queryParams.push(lastPosition);
    }
    
    query += ', last_accessed = NOW()';
    
    if (status === 'completed') {
      query += ', completion_date = NOW()';
    }
    
    query += ' WHERE enrollment_id = ? AND lecture_id = ?';
    queryParams.push(enrollmentId, lectureId);
    
    await pool.query(query, queryParams);
    
    // Get overall course progress
    let overallProgress;
    await pool.query('CALL calculate_course_progress(?, @progress)', [enrollmentId]);
    const [progressResult] = await pool.query('SELECT @progress AS progress');
    overallProgress = progressResult[0].progress;
    
    res.status(200).json({
      message: 'Progress updated successfully',
      overallProgress
    });
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ====================== REVIEW SYSTEM ROUTES ======================

// Submit a review for a course
app.post('/api/courses/:id/review', authenticateJWT, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('reviewText').optional().trim(),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const courseId = req.params.id;
    const userId = req.user.id;
    const { rating, reviewText } = req.body;
    
    // Check if enrolled in the course
    const [enrollments] = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    
    if (enrollments.length === 0) {
      return res.status(403).json({ message: 'You must be enrolled in the course to leave a review' });
    }
    
    const enrollmentId = enrollments[0].enrollment_id;
    
    // Check if already reviewed
    const [existingReviews] = await pool.query(
      'SELECT * FROM reviews WHERE enrollment_id = ?',
      [enrollmentId]
    );
    
    if (existingReviews.length > 0) {
      // Update existing review
      await pool.query(
        'UPDATE reviews SET rating = ?, review_text = ? WHERE enrollment_id = ?',
        [rating, reviewText, enrollmentId]
      );
      
      res.status(200).json({ message: 'Review updated successfully' });
    } else {
      // Create new review
      await pool.query(
        'INSERT INTO reviews (enrollment_id, rating, review_text) VALUES (?, ?, ?)',
        [enrollmentId, rating, reviewText]
      );
      
      res.status(201).json({ message: 'Review submitted successfully' });
    }
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ====================== DONATION ROUTES ======================

// Get donation tiers
app.get('/api/donation/tiers', async (req, res) => {
  try {
    const [tiers] = await pool.query('SELECT * FROM donation_tiers ORDER BY amount');
    res.status(200).json({ tiers });
  } catch (error) {
    console.error('Donation tiers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Make a donation
app.post('/api/donation', authenticateJWT, [
  body('tierId').optional().isInt(),
  body('amount').isFloat({ min: 1 }),
  body('paymentMethod').isString(),
  body('message').optional().trim(),
  body('isAnonymous').optional().isBoolean(),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const userId = req.user.id;
    const { tierId, amount, paymentMethod, message, isAnonymous = false } = req.body;
    
    // In a real application, you would process the payment here
    const transactionId = 'TX' + Date.now();
    
    await pool.query(
      'INSERT INTO donations (user_id, tier_id, amount, transaction_id, payment_method, message, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, tierId, amount, transactionId, paymentMethod, message, isAnonymous]
    );
    
    // Create notification
    const [notificationTypes] = await pool.query(
      'SELECT type_id FROM notification_types WHERE name = ?',
      ['Donation Received']
    );
    
    if (notificationTypes.length > 0) {
      const typeId = notificationTypes[0].type_id;
      
      await pool.query(
        'INSERT INTO notifications (user_id, type_id, title, message) VALUES (?, ?, ?, ?)',
        [userId, typeId, 'Thank you for your donation!', `Your donation of $${amount} has been received. We appreciate your support!`]
      );
    }
    
    res.status(201).json({
      message: 'Donation processed successfully',
      transactionId
    });
  } catch (error) {
    console.error('Donation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ====================== NOTIFICATION ROUTES ======================

// Get user notifications
app.get('/api/notifications', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [notifications] = await pool.query(
      `SELECT n.*, nt.name AS notification_type 
       FROM notifications n
       JOIN notification_types nt ON n.type_id = nt.type_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId]
    );
    
    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateJWT, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Notification update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ====================== ANALYTICS ROUTES (ADMIN/INSTRUCTOR) ======================

// Get instructor analytics
app.get('/api/analytics/instructor', authenticateJWT, authorize('instructor'), async (req, res) => {
  try {
    const instructorId = req.user.id;
    const { period = 'month' } = req.query;
    
    let dateFilter;
    switch (period) {
      case 'week':
        dateFilter = 'AND e.enrollment_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case 'month':
        dateFilter = 'AND e.enrollment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case 'year':
        dateFilter = 'AND e.enrollment_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        break;
      default:
        dateFilter = '';
    }
    
    // Get course statistics
    const [coursesStats] = await pool.query(
      `SELECT 
         c.course_id, 
         c.title,
         COUNT(DISTINCT e.enrollment_id) AS enrollment_count,
         AVG(r.rating) AS average_rating,
         COUNT(DISTINCT r.review_id) AS review_count,
         SUM(CASE WHEN e.completion_status = 'completed' THEN 1 ELSE 0 END) AS completion_count
       FROM courses c
       LEFT JOIN enrollments e ON c.course_id = e.course_id ${dateFilter}
       LEFT JOIN reviews r ON e.enrollment_id = r.enrollment_id
       WHERE c.instructor_id = ?
       GROUP BY c.course_id, c.title`,
      [instructorId]
    );
    
    // Get revenue statistics
    const [revenueStats] = await pool.query(
      `SELECT 
         SUM(c.price) AS total_revenue,
         COUNT(DISTINCT e.enrollment_id) AS total_enrollments,
         AVG(c.price) AS average_course_price
       FROM courses c
       JOIN enrollments e ON c.course_id = e.course_id ${dateFilter}
       WHERE c.instructor_id = ?`,
      [instructorId]
    );
    
    // Get student demographics
    const [studentStats] = await pool.query(
      `SELECT 
         COUNT(DISTINCT u.user_id) AS total_students,
         AVG(DATEDIFF(NOW(), e.enrollment_date)) AS average_enrollment_age
       FROM users u
       JOIN enrollments e ON u.user_id = e.user_id ${dateFilter}
       JOIN courses c ON e.course_id = c.course_id
       WHERE c.instructor_id = ?`,
      [instructorId]
    );
    
    res.status(200).json({
      courses: coursesStats,
      revenue: revenueStats[0],
      students: studentStats[0]
    });
  } catch (error) {
    console.error('Instructor analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get admin analytics
app.get('/api/analytics/admin', authenticateJWT, authorize('admin'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter;
    switch (period) {
      case 'week':
        dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case 'month':
        dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case 'year':
        dateFilter = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        break;
      default:
        dateFilter = '';
    }
    
    // Get platform statistics
    const [userStats] = await pool.query(
      `SELECT 
         COUNT(*) AS total_users,
         COUNT(CASE WHEN role = 'student' THEN 1 END) AS student_count,
         COUNT(CASE WHEN role = 'instructor' THEN 1 END) AS instructor_count
       FROM users
       ${dateFilter}`
    );
    
    const [courseStats] = await pool.query(
      `SELECT 
         COUNT(*) AS total_courses,
         COUNT(CASE WHEN is_published = TRUE THEN 1 END) AS published_courses,
         AVG(price) AS average_price
       FROM courses
       ${dateFilter}`
    );
    
    const [enrollmentStats] = await pool.query(
      `SELECT 
         COUNT(*) AS total_enrollments,
         COUNT(CASE WHEN completion_status = 'completed' THEN 1 END) AS completed_enrollments,
         (COUNT(CASE WHEN completion_status = 'completed' THEN 1 END) / COUNT(*)) * 100 AS completion_rate
       FROM enrollments
       ${dateFilter.replace('created_at', 'enrollment_date')}`
    );
    
    const [donationStats] = await pool.query(
      `SELECT 
         COUNT(*) AS total_donations,
         SUM(amount) AS total_amount,
         AVG(amount) AS average_amount,
         MAX(amount) AS largest_donation
       FROM donations
       ${dateFilter.replace('created_at', 'donation_date')}`
    );
    
    res.status(200).json({
      users: userStats[0],
      courses: courseStats[0],
      enrollments: enrollmentStats[0],
      donations: donationStats[0]
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ====================== SERVER START ======================

app.listen(PORT, () => {
  console.log(`NeoLearn API server running on port ${PORT}`);
});
