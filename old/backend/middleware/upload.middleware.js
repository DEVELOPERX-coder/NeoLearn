const multer = require("multer");
const path = require("path");
const fs = require("fs");
const config = require("../config/config");

// Create storage directories if they don't exist
const createStorageDirectories = () => {
  const directories = [
    path.join(__dirname, "..", "uploads"),
    path.join(__dirname, "..", "uploads", "courses"),
    path.join(__dirname, "..", "uploads", "videos"),
    path.join(__dirname, "..", "uploads", "profiles"),
  ];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Call function to create directories
createStorageDirectories();

// Storage configuration for course thumbnails
const courseThumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "courses"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "course-" + req.params.id + "-" + uniqueSuffix + ext);
  },
});

// Storage configuration for video uploads
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "videos"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "lesson-" + req.params.id + "-" + uniqueSuffix + ext);
  },
});

// Storage configuration for profile pictures
const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "profiles"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "user-" + req.user.id + "-" + uniqueSuffix + ext);
  },
});

// File filter to allow only image files for thumbnails and profiles
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// File filter to allow only video files
const videoFileFilter = (req, file, cb) => {
  const allowedTypes = ["video/mp4", "video/webm", "video/ogg"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed"), false);
  }
};

// Create multer upload objects
const uploadCourseThumbnail = multer({
  storage: courseThumbnailStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single("thumbnail");

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
}).single("video");

const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single("profilePicture");

// Wrapper middleware for error handling
exports.uploadCourseThumbnail = (req, res, next) => {
  uploadCourseThumbnail(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        status: "error",
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        status: "error",
        message: err.message,
      });
    }
    next();
  });
};

exports.uploadVideo = (req, res, next) => {
  uploadVideo(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        status: "error",
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        status: "error",
        message: err.message,
      });
    }
    next();
  });
};

exports.uploadProfilePicture = (req, res, next) => {
  uploadProfilePicture(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        status: "error",
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        status: "error",
        message: err.message,
      });
    }
    next();
  });
};
