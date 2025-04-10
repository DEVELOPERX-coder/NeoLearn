-- NeoLearn Database Schema

-- USER MANAGEMENT

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    profile_picture VARCHAR(255) DEFAULT 'default-avatar.png',
    role ENUM('admin', 'instructor', 'student') NOT NULL,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_time TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- COURSE MANAGEMENT

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT NULL,
    thumbnail VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

CREATE TABLE courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    instructor_id INT NOT NULL,
    category_id INT NOT NULL,
    thumbnail VARCHAR(255) DEFAULT 'default-course.png',
    price DECIMAL(10,2) DEFAULT 0.00,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE course_sections (
    section_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE lecture_types (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE course_lectures (
    lecture_id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type_id INT NOT NULL,
    content TEXT,
    file_path VARCHAR(255),
    duration INT,  -- in seconds
    position INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES course_sections(section_id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES lecture_types(type_id)
);

-- ENROLLMENT MANAGEMENT

CREATE TABLE enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    completion_status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, course_id)
);

CREATE TABLE progress_tracking (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    lecture_id INT NOT NULL,
    status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_position INT DEFAULT 0,  -- For video content, in seconds
    last_accessed TIMESTAMP,
    completion_date TIMESTAMP NULL,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (lecture_id) REFERENCES course_lectures(lecture_id) ON DELETE CASCADE,
    UNIQUE KEY (enrollment_id, lecture_id)
);

-- DONATION MANAGEMENT

CREATE TABLE donation_tiers (
    tier_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    benefits TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE donations (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    tier_id INT,
    amount DECIMAL(10,2) NOT NULL,
    transaction_id VARCHAR(255),
    payment_method VARCHAR(50),
    donation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (tier_id) REFERENCES donation_tiers(tier_id) ON DELETE SET NULL
);

-- NOTIFICATION SYSTEM

CREATE TABLE notification_types (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES notification_types(type_id)
);

-- RATING AND REVIEW SYSTEM

CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON DELETE CASCADE
);

-- PLATFORM SETTINGS

CREATE TABLE platform_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ADVANCED DATABASE FEATURES: TRIGGERS

-- Trigger to update course completion status
DELIMITER //
CREATE TRIGGER update_enrollment_completion_status
AFTER UPDATE ON progress_tracking
FOR EACH ROW
BEGIN
    DECLARE total_lectures INT;
    DECLARE completed_lectures INT;
    DECLARE enrollment INT;
    
    SET enrollment = NEW.enrollment_id;
    
    -- Get the total number of lectures for this enrollment
    SELECT COUNT(l.lecture_id) INTO total_lectures
    FROM course_lectures l
    JOIN course_sections s ON l.section_id = s.section_id
    JOIN enrollments e ON s.course_id = e.course_id
    WHERE e.enrollment_id = enrollment;
    
    -- Get the number of completed lectures
    SELECT COUNT(p.progress_id) INTO completed_lectures
    FROM progress_tracking p
    WHERE p.enrollment_id = enrollment AND p.status = 'completed';
    
    -- Update the enrollment status
    IF completed_lectures = 0 THEN
        UPDATE enrollments SET completion_status = 'not_started' WHERE enrollment_id = enrollment;
    ELSEIF completed_lectures = total_lectures THEN
        UPDATE enrollments SET completion_status = 'completed' WHERE enrollment_id = enrollment;
    ELSE
        UPDATE enrollments SET completion_status = 'in_progress' WHERE enrollment_id = enrollment;
    END IF;
END //
DELIMITER ;

-- Trigger to automatically create progress tracking entries for new enrollments
DELIMITER //
CREATE TRIGGER create_progress_entries_after_enrollment
AFTER INSERT ON enrollments
FOR EACH ROW
BEGIN
    INSERT INTO progress_tracking (enrollment_id, lecture_id, status)
    SELECT NEW.enrollment_id, l.lecture_id, 'not_started'
    FROM course_lectures l
    JOIN course_sections s ON l.section_id = s.section_id
    WHERE s.course_id = NEW.course_id;
END //
DELIMITER ;

-- Trigger to send notification when course is published
DELIMITER //
CREATE TRIGGER notify_course_published
AFTER UPDATE ON courses
FOR EACH ROW
BEGIN
    IF NEW.is_published = 1 AND OLD.is_published = 0 THEN
        -- Get notification type ID for course publication
        DECLARE notification_type_id INT;
        SELECT type_id INTO notification_type_id FROM notification_types WHERE name = 'Course Published';
        
        -- Notify the instructor
        INSERT INTO notifications (user_id, type_id, title, message)
        VALUES (NEW.instructor_id, notification_type_id, 
                CONCAT('Course Published: ', NEW.title), 
                CONCAT('Your course "', NEW.title, '" has been published and is now available to students.'));
    END IF;
END //
DELIMITER ;

-- ADVANCED DATABASE FEATURES: STORED PROCEDURES

-- Procedure to enroll a student in a course
DELIMITER //
CREATE PROCEDURE enroll_student(IN p_user_id INT, IN p_course_id INT)
BEGIN
    DECLARE existing_enrollment INT;
    
    -- Check if enrollment already exists
    SELECT COUNT(*) INTO existing_enrollment 
    FROM enrollments 
    WHERE user_id = p_user_id AND course_id = p_course_id;
    
    -- If not enrolled, create a new enrollment
    IF existing_enrollment = 0 THEN
        INSERT INTO enrollments (user_id, course_id)
        VALUES (p_user_id, p_course_id);
        
        SELECT 'Enrollment successful' AS message;
    ELSE
        SELECT 'Already enrolled in this course' AS message;
    END IF;
END //
DELIMITER ;

-- Procedure to calculate overall course progress for a student
DELIMITER //
CREATE PROCEDURE calculate_course_progress(IN p_enrollment_id INT, OUT p_progress_percentage DECIMAL(5,2))
BEGIN
    DECLARE total_lectures INT;
    DECLARE completed_lectures INT;
    
    -- Get total number of lectures
    SELECT COUNT(l.lecture_id) INTO total_lectures
    FROM course_lectures l
    JOIN course_sections s ON l.section_id = s.section_id
    JOIN enrollments e ON s.course_id = e.course_id
    WHERE e.enrollment_id = p_enrollment_id;
    
    -- Get completed lectures
    SELECT COUNT(p.progress_id) INTO completed_lectures
    FROM progress_tracking p
    WHERE p.enrollment_id = p_enrollment_id AND p.status = 'completed';
    
    -- Calculate percentage
    IF total_lectures > 0 THEN
        SET p_progress_percentage = (completed_lectures / total_lectures) * 100;
    ELSE
        SET p_progress_percentage = 0;
    END IF;
END //
DELIMITER ;

-- ADVANCED DATABASE FEATURES: VIEWS

-- View for course analytics
CREATE VIEW course_analytics AS
SELECT 
    c.course_id,
    c.title,
    u.first_name AS instructor_first_name,
    u.last_name AS instructor_last_name,
    cat.name AS category,
    COUNT(DISTINCT e.enrollment_id) AS total_enrollments,
    AVG(r.rating) AS average_rating,
    COUNT(DISTINCT r.review_id) AS total_reviews,
    SUM(CASE WHEN e.completion_status = 'completed' THEN 1 ELSE 0 END) AS students_completed,
    (SUM(CASE WHEN e.completion_status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT e.enrollment_id), 0)) * 100 AS completion_rate
FROM 
    courses c
    LEFT JOIN users u ON c.instructor_id = u.user_id
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    LEFT JOIN enrollments e ON c.course_id = e.course_id
    LEFT JOIN reviews r ON e.enrollment_id = r.enrollment_id
GROUP BY 
    c.course_id, c.title, u.first_name, u.last_name, cat.name;

-- View for student progress
CREATE VIEW student_progress AS
SELECT 
    u.user_id,
    u.username,
    u.first_name,
    u.last_name,
    c.course_id,
    c.title AS course_title,
    e.enrollment_date,
    e.completion_status,
    COUNT(DISTINCT l.lecture_id) AS total_lectures,
    SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) AS completed_lectures,
    (SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT l.lecture_id), 0)) * 100 AS progress_percentage
FROM 
    users u
    JOIN enrollments e ON u.user_id = e.user_id
    JOIN courses c ON e.course_id = c.course_id
    JOIN course_sections cs ON c.course_id = cs.course_id
    JOIN course_lectures l ON cs.section_id = l.section_id
    LEFT JOIN progress_tracking pt ON e.enrollment_id = pt.enrollment_id AND l.lecture_id = pt.lecture_id
WHERE 
    u.role = 'student'
GROUP BY 
    u.user_id, u.username, u.first_name, u.last_name, c.course_id, c.title, e.enrollment_date, e.completion_status;

-- SAMPLE DATA INSERTION

-- Insert sample notification types
INSERT INTO notification_types (name, description) VALUES
('Course Published', 'Notification when a course is published'),
('New Enrollment', 'Notification when a student enrolls in a course'),
('Course Completed', 'Notification when a student completes a course'),
('Donation Received', 'Notification for donations');

-- Insert sample lecture types
INSERT INTO lecture_types (name, description) VALUES
('Video', 'Video lecture content'),
('Text', 'Text-based lecture content'),
('Quiz', 'Quiz or assessment'),
('Assignment', 'Assignment submission'),
('Resource', 'Downloadable resource file');

-- Insert sample donation tiers
INSERT INTO donation_tiers (name, description, amount, benefits) VALUES
('Supporter', 'Basic supporter tier', 5.00, 'Access to donor-only updates'),
('Patron', 'Dedicated patron tier', 20.00, 'Access to donor-only updates and exclusive content'),
('Benefactor', 'Premium benefactor tier', 50.00, 'All benefits plus early access to new courses');

-- Insert platform settings
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
('site_name', 'NeoLearn', 'The name of the platform'),
('site_description', 'An online learning platform for everyone', 'The site description for SEO'),
('theme', 'dark', 'The default theme for the platform'),
('maintenance_mode', 'false', 'Whether the site is in maintenance mode'),
('welcome_message', 'Welcome to NeoLearn, the future of learning!', 'Welcome message for new users');

-- EXAMPLE QUERIES WITH JOINS

-- Get all courses with their instructors and categories
SELECT 
    c.course_id,
    c.title,
    c.description,
    c.price,
    CONCAT(u.first_name, ' ', u.last_name) AS instructor_name,
    cat.name AS category_name
FROM 
    courses c
    INNER JOIN users u ON c.instructor_id = u.user_id
    INNER JOIN categories cat ON c.category_id = cat.category_id
WHERE 
    c.is_published = TRUE
ORDER BY 
    c.created_at DESC;

-- Get all enrolled courses for a specific student with progress information
SELECT 
    c.course_id,
    c.title,
    c.thumbnail,
    CONCAT(u.first_name, ' ', u.last_name) AS instructor_name,
    e.enrollment_date,
    e.completion_status,
    (
        SELECT COALESCE(AVG(progress_percentage), 0)
        FROM progress_tracking pt
        WHERE pt.enrollment_id = e.enrollment_id
    ) AS overall_progress
FROM 
    enrollments e
    JOIN courses c ON e.course_id = c.course_id
    JOIN users u ON c.instructor_id = u.user_id
WHERE 
    e.user_id = 1 -- Replace with actual student ID
ORDER BY 
    e.enrollment_date DESC;

-- Get the most popular courses based on enrollment count
SELECT 
    c.course_id,
    c.title,
    COUNT(e.enrollment_id) AS enrollment_count,
    AVG(r.rating) AS average_rating
FROM 
    courses c
    LEFT JOIN enrollments e ON c.course_id = e.course_id
    LEFT JOIN reviews r ON e.enrollment_id = r.enrollment_id
WHERE 
    c.is_published = TRUE
GROUP BY 
    c.course_id, c.title
ORDER BY 
    enrollment_count DESC, average_rating DESC
LIMIT 10;

-- Advanced query using subqueries, joins, and aggregation
SELECT 
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS student_name,
    COUNT(DISTINCT e.course_id) AS enrolled_courses,
    SUM(CASE WHEN e.completion_status = 'completed' THEN 1 ELSE 0 END) AS completed_courses,
    ROUND(AVG(
        SELECT AVG(progress_percentage)
        FROM progress_tracking pt
        WHERE pt.enrollment_id = e.enrollment_id
    ), 2) AS average_progress,
    (
        SELECT COUNT(d.donation_id)
        FROM donations d
        WHERE d.user_id = u.user_id
    ) AS donation_count
FROM 
    users u
    LEFT JOIN enrollments e ON u.user_id = e.user_id
WHERE 
    u.role = 'student'
GROUP BY 
    u.user_id, student_name
ORDER BY 
    enrolled_courses DESC, average_progress DESC;
