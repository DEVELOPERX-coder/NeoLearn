const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { pool } = require("../config/db");

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Not authorized to access this route",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Check if user still exists
    const [rows] = await pool.execute(
      "SELECT id, username, email, role FROM users WHERE id = ? AND is_active = TRUE",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "The user belonging to this token no longer exists",
      });
    }

    // Add user to request object
    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Not authorized to access this route",
    });
  }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};
