const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const config = require("../config/config");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

// Register a new user
exports.register = async (req, res) => {
  const { username, email, password, role = "student" } = req.body;

  // Basic validation
  if (!username || !email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Please provide username, email and password",
    });
  }

  try {
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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Validate role (only admins can create instructors or admins)
    const validRoles = ["student"];
    if (!validRoles.includes(role) && req.user?.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to create this user role",
      });
    }

    // Create user
    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, role]
    );

    // Create user profile
    await pool.execute(
      "INSERT INTO user_profiles (user_id, full_name) VALUES (?, ?)",
      [result.insertId, username]
    );

    // Generate token
    const token = generateToken(result.insertId);

    res.status(201).json({
      status: "success",
      token,
      data: {
        id: result.insertId,
        username,
        email,
        role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      status: "error",
      message: "Error registering user",
    });
  }
};

// Login user
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Please provide email and password",
    });
  }

  try {
    // Get user from database
    const [users] = await pool.execute(
      "SELECT id, username, email, password_hash, role, is_active FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      status: "success",
      token,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      status: "error",
      message: "Error logging in",
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    // Get user profile
    const [profiles] = await pool.execute(
      "SELECT * FROM user_profiles WHERE user_id = ?",
      [req.user.id]
    );

    const profile = profiles.length > 0 ? profiles[0] : null;

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
        },
        profile,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      status: "error",
      message: "Error getting current user",
    });
  }
};

// Update password
exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      status: "error",
      message: "Please provide current password and new password",
    });
  }

  try {
    // Get user from database
    const [users] = await pool.execute(
      "SELECT password_hash FROM users WHERE id = ?",
      [req.user.id]
    );

    const user = users[0];

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        status: "error",
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in database
    await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
      hashedPassword,
      req.user.id,
    ]);

    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({
      status: "error",
      message: "Error updating password",
    });
  }
};
