const Enrollment = require("../models/Enrollment");

exports.enrollInCourse = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res
        .status(401)
        .json({ message: "You must be logged in to enroll" });
    }

    const { courseId } = req.params;
    const userId = req.session.user.id;

    // Check if already enrolled
    const isEnrolled = await Enrollment.isEnrolled(userId, courseId);
    if (isEnrolled) {
      return res
        .status(400)
        .json({ message: "Already enrolled in this course" });
    }

    const enrollmentId = await Enrollment.enroll(userId, courseId);

    if (!enrollmentId) {
      return res.status(400).json({ message: "Enrollment failed" });
    }

    res.status(201).json({ message: "Enrolled successfully" });
  } catch (error) {
    console.error("Enrollment error:", error);
    res.status(500).json({ message: "Server error during enrollment" });
  }
};

exports.getEnrolledCourses = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res
        .status(401)
        .json({ message: "You must be logged in to view enrolled courses" });
    }

    const userId = req.session.user.id;
    const courses = await Enrollment.getEnrolledCourses(userId);

    res.json({ courses });
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching enrolled courses" });
  }
};
