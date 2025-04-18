exports.createSection = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { title, description } = req.body;

    // Check if course exists and user has permission
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

    // Get the maximum order_index for the course
    const [maxOrder] = await pool.execute(
      "SELECT MAX(order_index) as max_order FROM sections WHERE course_id = ?",
      [courseId]
    );

    const orderIndex = maxOrder[0].max_order ? maxOrder[0].max_order + 1 : 1;

    // Create section
    const [result] = await pool.execute(
      `INSERT INTO sections (course_id, title, description, order_index)
         VALUES (?, ?, ?, ?)`,
      [courseId, title, description || "", orderIndex]
    );

    res.status(201).json({
      status: "success",
      data: {
        id: result.insertId,
        course_id: parseInt(courseId),
        title,
        description: description || "",
        order_index: orderIndex,
      },
    });
  } catch (error) {
    console.error("Create section error:", error);
    res.status(500).json({
      status: "error",
      message: "Error creating section",
    });
  }
};

// Update a section
exports.updateSection = async (req, res) => {
  try {
    const sectionId = req.params.id;
    const { title, description, orderIndex } = req.body;

    // Check if section exists and user has permission
    const [sections] = await pool.execute(
      `SELECT s.*, c.instructor_id
         FROM sections s
         JOIN courses c ON s.course_id = c.id
         WHERE s.id = ?`,
      [sectionId]
    );

    if (sections.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Section not found",
      });
    }

    // Check if user is the course instructor or admin
    if (
      req.user.role !== "admin" &&
      req.user.id !== sections[0].instructor_id
    ) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to update this section",
      });
    }

    // Build update query dynamically
    const updates = [];
    const queryParams = [];

    if (title !== undefined) {
      updates.push("title = ?");
      queryParams.push(title);
    }

    if (description !== undefined) {
      updates.push("description = ?");
      queryParams.push(description);
    }

    if (orderIndex !== undefined) {
      updates.push("order_index = ?");
      queryParams.push(parseInt(orderIndex));
    }

    // If no updates, return early
    if (updates.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No fields to update",
      });
    }

    // Update section
    queryParams.push(sectionId);
    await pool.execute(
      `UPDATE sections SET ${updates.join(", ")} WHERE id = ?`,
      queryParams
    );

    res.status(200).json({
      status: "success",
      message: "Section updated successfully",
    });
  } catch (error) {
    console.error("Update section error:", error);
    res.status(500).json({
      status: "error",
      message: "Error updating section",
    });
  }
};

// Delete a section
exports.deleteSection = async (req, res) => {
  try {
    const sectionId = req.params.id;

    // Check if section exists and user has permission
    const [sections] = await pool.execute(
      `SELECT s.*, c.instructor_id
         FROM sections s
         JOIN courses c ON s.course_id = c.id
         WHERE s.id = ?`,
      [sectionId]
    );

    if (sections.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Section not found",
      });
    }

    // Check if user is the course instructor or admin
    if (
      req.user.role !== "admin" &&
      req.user.id !== sections[0].instructor_id
    ) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to delete this section",
      });
    }

    // Get all lesson content paths for deletion
    const [lessons] = await pool.execute(
      `SELECT content_url FROM lessons WHERE section_id = ? AND content_type = 'video'`,
      [sectionId]
    );

    // Delete section from database
    await pool.execute("DELETE FROM sections WHERE id = ?", [sectionId]);

    // Delete associated video files
    for (const lesson of lessons) {
      if (lesson.content_url) {
        const contentPath = path.join(__dirname, "..", lesson.content_url);
        if (fs.existsSync(contentPath)) {
          fs.unlinkSync(contentPath);
        }
      }
    }

    res.status(200).json({
      status: "success",
      message: "Section deleted successfully",
    });
  } catch (error) {
    console.error("Delete section error:", error);
    res.status(500).json({
      status: "error",
      message: "Error deleting section",
    });
  }
};
