const db = require("../config/database");

class Enrollment {
  static async enroll(userId, courseId) {
    try {
      const [result] = await db.execute(
        "INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)",
        [userId, courseId]
      );
      return result.insertId;
    } catch (error) {
      // If enrollment already exists, return null
      if (error.code === "ER_DUP_ENTRY") {
        return null;
      }
      throw error;
    }
  }

  static async getEnrolledCourses(userId) {
    const [rows] = await db.execute(
      `SELECT c.* FROM courses c
       JOIN enrollments e ON c.id = e.course_id
       WHERE e.user_id = ?`,
      [userId]
    );
    return rows;
  }

  static async isEnrolled(userId, courseId) {
    const [rows] = await db.execute(
      "SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?",
      [userId, courseId]
    );
    return rows.length > 0;
  }
}

module.exports = Enrollment;
