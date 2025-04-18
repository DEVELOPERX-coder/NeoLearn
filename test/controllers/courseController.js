const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.getAll();
    res.json({ courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Server error while fetching courses" });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.getById(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    let isEnrolled = false;
    if (req.session.user) {
      isEnrolled = await Enrollment.isEnrolled(req.session.user.id, id);
    }

    res.json({ course, isEnrolled });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ message: "Server error while fetching course" });
  }
};

exports.createCourse = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.session.user || !req.session.user.is_admin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { title, description, instructor, image_url, price } = req.body;

    // Validate input
    if (!title || !description || !instructor) {
      return res
        .status(400)
        .json({ message: "Title, description, and instructor are required" });
    }

    const courseId = await Course.create({
      title,
      description,
      instructor,
      image_url: image_url || "https://via.placeholder.com/300x200?text=Course",
      price: price || 0,
    });

    res.status(201).json({ message: "Course created successfully", courseId });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ message: "Server error while creating course" });
  }
};
