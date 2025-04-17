exports.createLesson = async (req, res) => {
  try {
    const sectionId = req.params.sectionId;
    const {
      title,
      description,
      contentType = "video",
      duration,
      isFree = false,
    } = req.body;

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
        message: "You do not have permission to update this course",
      });
    }

    // Get the maximum order_index for the section
    const [maxOrder] = await pool.execute(
      "SELECT MAX(order_index) as max_order FROM lessons WHERE section_id = ?",
      [sectionId]
    );

    const orderIndex = maxOrder[0].max_order ? maxOrder[0].max_order + 1 : 1;

    // Create lesson
    const [result] = await pool.execute(
      `INSERT INTO lessons (section_id, title, description, content_type, duration, is_free, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sectionId,
        title,
        description || "",
        contentType,
        duration || null,
        isFree ? 1 : 0,
        orderIndex,
      ]
    );

    res.status(201).json({
      status: "success",
      data: {
        id: result.insertId,
        section_id: parseInt(sectionId),
        title,
        description: description || "",
        content_type: contentType,
        duration: duration || null,
        is_free: isFree ? 1 : 0,
        order_index: orderIndex,
      },
    });
  } catch (error) {
    console.error("Create lesson error:", error);
    res.status(500).json({
      status: "error",
      message: "Error creating lesson",
    });
  }
};

// Update a lesson
exports.updateLesson = async (req, res) => {
  try {
    const lessonId = req.params.id;
    const {
      title,
      description,
      contentType,
      duration,
      isFree,
      orderIndex,
      contentText,
    } = req.body;

    // Check if lesson exists and user has permission
    const [lessons] = await pool.execute(
      `SELECT l.*, c.instructor_id
       FROM lessons l
       JOIN sections s ON l.section_id = s.id
       JOIN courses c ON s.course_id = c.id
       WHERE l.id = ?`,
      [lessonId]
    );

    if (lessons.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Lesson not found",
      });
    }

    // Check if user is the course instructor or admin
    if (req.user.role !== "admin" && req.user.id !== lessons[0].instructor_id) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to update this lesson",
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

    if (contentType !== undefined) {
      updates.push("content_type = ?");
      queryParams.push(contentType);
    }

    if (duration !== undefined) {
      updates.push("duration = ?");
      queryParams.push(duration);
    }

    if (isFree !== undefined) {
      updates.push("is_free = ?");
      queryParams.push(isFree ? 1 : 0);
    }

    if (orderIndex !== undefined) {
      updates.push("order_index = ?");
      queryParams.push(parseInt(orderIndex));
    }

    if (contentText !== undefined) {
      updates.push("content_text = ?");
      queryParams.push(contentText);
    }

    // If no updates, return early
    if (updates.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No fields to update",
      });
    }

    // Update lesson
    queryParams.push(lessonId);
    await pool.execute(
      `UPDATE lessons SET ${updates.join(", ")} WHERE id = ?`,
      queryParams
    );

    res.status(200).json({
      status: "success",
      message: "Lesson updated successfully",
    });
  } catch (error) {
    console.error("Update lesson error:", error);
    res.status(500).json({
      status: "error",
      message: "Error updating lesson",
    });
  }
};

// Get lesson details
exports.getLessonById = async (req, res) => {
  try {
    const lessonId = req.params.id;

    // Get lesson details
    const [lessons] = await pool.execute(
      `SELECT l.*, s.title as section_title, c.id as course_id, c.title as course_title,
              c.instructor_id, u.username as instructor_name
       FROM lessons l
       JOIN sections s ON l.section_id = s.id
       JOIN courses c ON s.course_id = c.id
       JOIN users u ON c.instructor_id = u.id
       WHERE l.id = ?`,
      [lessonId]
    );

    if (lessons.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Lesson not found",
      });
    }

    const lesson = lessons[0];
    const courseId = lesson.course_id;

    // Check if user is enrolled or is the instructor/admin
    let isEnrolled = false;
    let isInstructor = false;

    if (req.user) {
      // Check if instructor
      isInstructor =
        req.user.id === lesson.instructor_id || req.user.role === "admin";

      // If not instructor, check if enrolled
      if (!isInstructor) {
        const [enrollments] = await pool.execute(
          "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?",
          [req.user.id, courseId]
        );
        isEnrolled = enrollments.length > 0;
      }
    }

    // Check if user can access this lesson
    if (!isInstructor && !isEnrolled && !lesson.is_free) {
      return res.status(403).json({
        status: "error",
        message: "You need to be enrolled in this course to access this lesson",
      });
    }

    // Get progress if user is enrolled
    let progress = null;
    if (isEnrolled) {
      const [enrollments] = await pool.execute(
        "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?",
        [req.user.id, courseId]
      );

      if (enrollments.length > 0) {
        const enrollmentId = enrollments[0].id;
        const [progressResults] = await pool.execute(
          "SELECT * FROM progress WHERE enrollment_id = ? AND lesson_id = ?",
          [enrollmentId, lessonId]
        );

        progress = progressResults.length > 0 ? progressResults[0] : null;
      }
    }

    res.status(200).json({
      status: "success",
      data: {
        ...lesson,
        isEnrolled,
        isInstructor,
        progress,
      },
    });
  } catch (error) {
    console.error("Get lesson error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving lesson",
    });
  }
};

// Delete a lesson
exports.deleteLesson = async (req, res) => {
  try {
    const lessonId = req.params.id;

    // Check if lesson exists and user has permission
    const [lessons] = await pool.execute(
      `SELECT l.*, c.instructor_id
       FROM lessons l
       JOIN sections s ON l.section_id = s.id
       JOIN courses c ON s.course_id = c.id
       WHERE l.id = ?`,
      [lessonId]
    );

    if (lessons.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Lesson not found",
      });
    }

    // Check if user is the course instructor or admin
    if (req.user.role !== "admin" && req.user.id !== lessons[0].instructor_id) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to delete this lesson",
      });
    }

    // Delete lesson from database
    await pool.execute("DELETE FROM lessons WHERE id = ?", [lessonId]);

    // Delete video file if exists
    if (lessons[0].content_url && lessons[0].content_type === "video") {
      const contentPath = path.join(__dirname, "..", lessons[0].content_url);
      if (fs.existsSync(contentPath)) {
        fs.unlinkSync(contentPath);
      }
    }

    res.status(200).json({
      status: "success",
      message: "Lesson deleted successfully",
    });
  } catch (error) {
    console.error("Delete lesson error:", error);
    res.status(500).json({
      status: "error",
      message: "Error deleting lesson",
    });
  }
};

// Upload lesson video
exports.uploadLessonVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No file uploaded",
      });
    }

    const lessonId = req.params.id;

    // Check if lesson exists and user has permission
    const [lessons] = await pool.execute(
      `SELECT l.*, c.instructor_id
       FROM lessons l
       JOIN sections s ON l.section_id = s.id
       JOIN courses c ON s.course_id = c.id
       WHERE l.id = ?`,
      [lessonId]
    );

    if (lessons.length === 0) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);

      return res.status(404).json({
        status: "error",
        message: "Lesson not found",
      });
    }

    // Check if user is the course instructor or admin
    if (req.user.role !== "admin" && req.user.id !== lessons[0].instructor_id) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);

      return res.status(403).json({
        status: "error",
        message: "You do not have permission to update this lesson",
      });
    }

    // Remove previous video if exists
    const previousVideo = lessons[0].content_url;
    if (previousVideo) {
      const videoPath = path.join(__dirname, "..", previousVideo);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    // Update lesson with new video path
    const videoPath = "/uploads/videos/" + req.file.filename;
    await pool.execute(
      "UPDATE lessons SET content_url = ?, content_type = ? WHERE id = ?",
      [videoPath, "video", lessonId]
    );

    res.status(200).json({
      status: "success",
      data: {
        content_url: videoPath,
      },
    });
  } catch (error) {
    console.error("Upload video error:", error);

    // Delete uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      status: "error",
      message: "Error uploading video",
    });
  }
};
