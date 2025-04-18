const db = require("../config/database");

class Course {
  static async getAll() {
    const [rows] = await db.execute(
      "SELECT * FROM courses ORDER BY created_at DESC"
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.execute("SELECT * FROM courses WHERE id = ?", [id]);
    return rows[0];
  }

  static async create(courseData) {
    const { title, description, instructor, image_url, price } = courseData;
    const [result] = await db.execute(
      "INSERT INTO courses (title, description, instructor, image_url, price) VALUES (?, ?, ?, ?, ?)",
      [title, description, instructor, image_url, price]
    );
    return result.insertId;
  }
}

module.exports = Course;
