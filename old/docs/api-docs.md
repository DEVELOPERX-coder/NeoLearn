# API Documentation

This document provides a comprehensive reference for all the API endpoints available in the online learning platform.

## Base URL

All API endpoints are prefixed with:

```
http://localhost:5000/api
```

For production, this would be your domain name:

```
https://yourdomain.com/api
```

## Authentication

Most endpoints require authentication. Authentication is handled using JSON Web Tokens (JWT).

To authenticate requests, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token

To obtain a token, use the login endpoint:

```
POST /auth/login
```

## Response Format

All API responses follow a standard format:

```json
{
  "status": "success" | "error",
  "data": { ... } | null,
  "message": "Error message" | null
}
```

For paginated results, the response includes pagination info:

```json
{
  "status": "success",
  "results": 10,
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 10,
    "limit": 10
  },
  "data": [...]
}
```

## Error Codes

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Endpoints

### Authentication Endpoints

#### Register a new user

```
POST /auth/register
```

Request body:

```json
{
  "username": "john_doe",
  "email": "john.doe@example.com",
  "password": "securepassword",
  "role": "student" // Optional, defaults to "student"
}
```

Response:

```json
{
  "status": "success",
  "token": "jwt_token",
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john.doe@example.com",
    "role": "student"
  }
}
```

#### Login

```
POST /auth/login
```

Request body:

```json
{
  "email": "john.doe@example.com",
  "password": "securepassword"
}
```

Response:

```json
{
  "status": "success",
  "token": "jwt_token",
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john.doe@example.com",
    "role": "student"
  }
}
```

#### Get current user

```
GET /auth/me
```

Response:

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john.doe@example.com",
      "role": "student"
    },
    "profile": {
      "id": 1,
      "user_id": 1,
      "full_name": "John Doe",
      "bio": "A passionate learner",
      "profile_picture": "/uploads/profiles/user-1.jpg"
    }
  }
}
```

#### Update password

```
PATCH /auth/update-password
```

Request body:

```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

Response:

```json
{
  "status": "success",
  "message": "Password updated successfully"
}
```

### User Endpoints

#### Get all users (admin only)

```
GET /users
```

Query parameters:

- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10)
- `search` - Search term for username or email
- `role` - Filter by role
- `status` - Filter by active status

Response:

```json
{
  "status": "success",
  "results": 10,
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 10,
    "limit": 10
  },
  "data": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "john.doe@example.com",
      "role": "student",
      "is_active": true,
      "created_at": "2023-01-01T00:00:00Z",
      "full_name": "John Doe",
      "profile_picture": "/uploads/profiles/user-1.jpg",
      "course_count": 0,
      "enrollment_count": 5
    }
    // ...more users
  ]
}
```

#### Get user by ID (admin only)

```
GET /users/:id
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john.doe@example.com",
    "role": "student",
    "is_active": true,
    "created_at": "2023-01-01T00:00:00Z",
    "profile": {
      "full_name": "John Doe",
      "bio": "A passionate learner",
      "profile_picture": "/uploads/profiles/user-1.jpg"
    },
    "stats": {
      "course_count": 0,
      "enrollment_count": 5,
      "review_count": 3,
      "payment_count": 5
    }
  }
}
```

#### Create user (admin only)

```
POST /users
```

Request body:

```json
{
  "username": "jane_doe",
  "email": "jane.doe@example.com",
  "password": "securepassword",
  "role": "instructor",
  "fullName": "Jane Doe",
  "bio": "Experienced instructor"
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 2,
    "username": "jane_doe",
    "email": "jane.doe@example.com",
    "role": "instructor",
    "full_name": "Jane Doe"
  }
}
```

#### Update user (admin only)

```
PATCH /users/:id
```

Request body:

```json
{
  "username": "jane_doe_updated",
  "email": "jane.updated@example.com",
  "role": "instructor",
  "isActive": true,
  "fullName": "Jane Doe Updated",
  "bio": "Updated instructor bio"
}
```

Response:

```json
{
  "status": "success",
  "message": "User updated successfully"
}
```

#### Reset user password (admin only)

```
POST /users/:id/reset-password
```

Request body:

```json
{
  "newPassword": "newpassword"
}
```

Response:

```json
{
  "status": "success",
  "message": "Password reset successfully"
}
```

### Course Endpoints

#### Get all published courses

```
GET /courses
```

Query parameters:

- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10)
- `search` - Search term for title or description
- `category` - Filter by category name
- `level` - Filter by level (beginner, intermediate, advanced, all-levels)
- `priceMin` - Minimum price
- `priceMax` - Maximum price

Response:

```json
{
  "status": "success",
  "results": 10,
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 10,
    "limit": 10
  },
  "data": [
    {
      "id": 1,
      "title": "JavaScript Fundamentals",
      "subtitle": "Learn JavaScript from scratch",
      "description": "A comprehensive course on JavaScript fundamentals",
      "thumbnail": "/uploads/courses/course-1.jpg",
      "price": 49.99,
      "level": "beginner",
      "created_at": "2023-01-01T00:00:00Z",
      "status": "published",
      "instructor_id": 2,
      "instructor_name": "Jane Doe",
      "average_rating": 4.5,
      "review_count": 10,
      "student_count": 50
    }
    // ...more courses
  ]
}
```

#### Get instructor courses

```
GET /courses/instructor/:instructorId?
```

Response:

```json
{
  "status": "success",
  "results": 5,
  "data": [
    {
      "id": 1,
      "title": "JavaScript Fundamentals",
      "subtitle": "Learn JavaScript from scratch",
      "description": "A comprehensive course on JavaScript fundamentals",
      "thumbnail": "/uploads/courses/course-1.jpg",
      "price": 49.99,
      "level": "beginner",
      "created_at": "2023-01-01T00:00:00Z",
      "status": "published",
      "instructor_id": 2,
      "student_count": 50,
      "average_rating": 4.5,
      "review_count": 10
    }
    // ...more courses
  ]
}
```

#### Get course by ID

```
GET /courses/:id
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "title": "JavaScript Fundamentals",
    "subtitle": "Learn JavaScript from scratch",
    "description": "A comprehensive course on JavaScript fundamentals",
    "thumbnail": "/uploads/courses/course-1.jpg",
    "price": 49.99,
    "level": "beginner",
    "created_at": "2023-01-01T00:00:00Z",
    "status": "published",
    "instructor_id": 2,
    "instructor_name": "Jane Doe",
    "average_rating": 4.5,
    "review_count": 10,
    "student_count": 50,
    "sections": [
      {
        "id": 1,
        "title": "Introduction to JavaScript",
        "description": "Getting started with JavaScript",
        "order_index": 1,
        "lessons": [
          {
            "id": 1,
            "title": "What is JavaScript?",
            "description": "Introduction to JavaScript",
            "content_type": "video",
            "duration": 600,
            "is_free": true,
            "order_index": 1
          }
          // ...more lessons
        ]
      }
      // ...more sections
    ],
    "categories": [
      {
        "id": 1,
        "name": "Web Development"
      }
    ],
    "isEnrolled": false,
    "isInstructor": false
  }
}
```

#### Create a course

```
POST /courses
```

Request body:

```json
{
  "title": "React Fundamentals",
  "subtitle": "Learn React.js from scratch",
  "description": "A comprehensive course on React.js fundamentals",
  "price": 59.99,
  "level": "intermediate",
  "categoryIds": [1, 2]
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 2,
    "title": "React Fundamentals",
    "subtitle": "Learn React.js from scratch",
    "description": "A comprehensive course on React.js fundamentals",
    "price": 59.99,
    "level": "intermediate",
    "status": "draft",
    "instructor_id": 2
  }
}
```

#### Update a course

```
PATCH /courses/:id
```

Request body:

```json
{
  "title": "React Fundamentals Updated",
  "subtitle": "Learn React.js from scratch - Updated",
  "description": "Updated course description",
  "price": 69.99,
  "level": "intermediate",
  "status": "published",
  "categoryIds": [1, 3]
}
```

Response:

```json
{
  "status": "success",
  "message": "Course updated successfully"
}
```

#### Delete a course

```
DELETE /courses/:id
```

Response:

```json
{
  "status": "success",
  "message": "Course deleted successfully"
}
```

#### Upload course thumbnail

```
POST /courses/:id/thumbnail
```

Request body:

- `thumbnail` - Image file (form-data)

Response:

```json
{
  "status": "success",
  "data": {
    "thumbnail": "/uploads/courses/course-2.jpg"
  }
}
```

### Section and Lesson Endpoints

#### Create a section

```
POST /courses/:courseId/sections
```

Request body:

```json
{
  "title": "Getting Started with React",
  "description": "The basics of React.js"
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 2,
    "course_id": 2,
    "title": "Getting Started with React",
    "description": "The basics of React.js",
    "order_index": 1
  }
}
```

#### Update a section

```
PATCH /courses/sections/:id
```

Request body:

```json
{
  "title": "Updated Section Title",
  "description": "Updated section description",
  "orderIndex": 2
}
```

Response:

```json
{
  "status": "success",
  "message": "Section updated successfully"
}
```

#### Delete a section

```
DELETE /courses/sections/:id
```

Response:

```json
{
  "status": "success",
  "message": "Section deleted successfully"
}
```

#### Create a lesson

```
POST /courses/sections/:sectionId/lessons
```

Request body:

```json
{
  "title": "Introduction to React Hooks",
  "description": "Learn about React hooks",
  "contentType": "video",
  "duration": 1200,
  "isFree": false
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 2,
    "section_id": 2,
    "title": "Introduction to React Hooks",
    "description": "Learn about React hooks",
    "content_type": "video",
    "duration": 1200,
    "is_free": false,
    "order_index": 1
  }
}
```

#### Get lesson by ID

```
GET /courses/lessons/:id
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 2,
    "title": "Introduction to React Hooks",
    "description": "Learn about React hooks",
    "content_type": "video",
    "content_url": "/uploads/videos/lesson-2.mp4",
    "duration": 1200,
    "is_free": false,
    "order_index": 1,
    "section_title": "Getting Started with React",
    "course_id": 2,
    "course_title": "React Fundamentals",
    "instructor_id": 2,
    "instructor_name": "Jane Doe",
    "isEnrolled": true,
    "isInstructor": false,
    "progress": {
      "completed": false,
      "last_watched_position": 300,
      "last_watched_at": "2023-01-15T00:00:00Z"
    }
  }
}
```

#### Update a lesson

```
PATCH /courses/lessons/:id
```

Request body:

```json
{
  "title": "Updated Lesson Title",
  "description": "Updated lesson description",
  "contentType": "video",
  "duration": 1500,
  "isFree": true,
  "orderIndex": 2
}
```

Response:

```json
{
  "status": "success",
  "message": "Lesson updated successfully"
}
```

#### Delete a lesson

```
DELETE /courses/lessons/:id
```

Response:

```json
{
  "status": "success",
  "message": "Lesson deleted successfully"
}
```

#### Upload lesson video

```
POST /courses/lessons/:id/video
```

Request body:

- `video` - Video file (form-data)

Response:

```json
{
  "status": "success",
  "data": {
    "content_url": "/uploads/videos/lesson-2.mp4"
  }
}
```

### Enrollment Endpoints

#### Get user enrollments

```
GET /enrollments/users/:userId?
```

Response:

```json
{
  "status": "success",
  "results": 5,
  "data": [
    {
      "id": 1,
      "status": "active",
      "enrolled_at": "2023-01-10T00:00:00Z",
      "completed_at": null,
      "course_id": 1,
      "title": "JavaScript Fundamentals",
      "subtitle": "Learn JavaScript from scratch",
      "thumbnail": "/uploads/courses/course-1.jpg",
      "level": "beginner",
      "instructor_name": "Jane Doe",
      "total_lessons": 20,
      "completed_lessons": 5,
      "progress_percentage": 25
    }
    // ...more enrollments
  ]
}
```

#### Get enrollment by ID

```
GET /enrollments/:id
```

Response:

```json
{
  "status": "success",
  "data": {
    "enrollment": {
      "id": 1,
      "user_id": 1,
      "course_id": 1,
      "status": "active",
      "enrolled_at": "2023-01-10T00:00:00Z",
      "completed_at": null,
      "course_title": "JavaScript Fundamentals",
      "student_name": "John Doe"
    },
    "course": {
      "id": 1,
      "title": "JavaScript Fundamentals",
      "subtitle": "Learn JavaScript from scratch",
      "thumbnail": "/uploads/courses/course-1.jpg",
      "instructor_name": "Jane Doe"
    },
    "sections": [
      {
        "id": 1,
        "title": "Introduction to JavaScript",
        "description": "Getting started with JavaScript",
        "order_index": 1,
        "lessons": [
          {
            "id": 1,
            "title": "What is JavaScript?",
            "description": "Introduction to JavaScript",
            "content_type": "video",
            "duration": 600,
            "is_free": true,
            "order_index": 1,
            "completed": true,
            "last_watched_position": 600,
            "last_watched_at": "2023-01-15T00:00:00Z"
          }
          // ...more lessons
        ]
      }
      // ...more sections
    ],
    "progress": {
      "completed_lessons": 5,
      "total_lessons": 20,
      "percentage": 25
    }
  }
}
```

#### Enroll in a course

```
POST /enrollments/courses/:courseId
```

Response:

```json
{
  "status": "success",
  "data": {
    "enrollment_id": 2,
    "course_id": 2,
    "user_id": 1,
    "status": "active",
    "enrolled_at": "2023-01-20T00:00:00Z"
  }
}
```

#### Update lesson progress

```
POST /enrollments/lessons/:lessonId/progress
```

Request body:

```json
{
  "completed": true,
  "lastWatchedPosition": 600
}
```

Response:

```json
{
  "status": "success",
  "message": "Progress updated successfully"
}
```

### Reviews Endpoints

#### Get course reviews

```
GET /enrollments/courses/:courseId/reviews
```

Query parameters:

- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10)

Response:

```json
{
  "status": "success",
  "results": 10,
  "pagination": {
    "total": 50,
    "page": 1,
    "pages": 5,
    "limit": 10
  },
  "rating_summary": {
    "average_rating": 4.5,
    "total_reviews": 50,
    "five_star": 30,
    "four_star": 15,
    "three_star": 3,
    "two_star": 1,
    "one_star": 1
  },
  "data": [
    {
      "id": 1,
      "rating": 5,
      "review_text": "Excellent course! Learned a lot.",
      "created_at": "2023-01-15T00:00:00Z",
      "updated_at": "2023-01-15T00:00:00Z",
      "user_id": 1,
      "username": "john_doe",
      "profile_picture": "/uploads/profiles/user-1.jpg"
    }
    // ...more reviews
  ]
}
```

#### Create or update a review

```
POST /enrollments/courses/:courseId/reviews
```

Request body:

```json
{
  "rating": 5,
  "reviewText": "Excellent course! Learned a lot."
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "course_id": 1,
    "rating": 5,
    "review_text": "Excellent course! Learned a lot."
  }
}
```

#### Delete a review

```
DELETE /enrollments/reviews/:id
```

Response:

```json
{
  "status": "success",
  "message": "Review deleted successfully"
}
```

### Payment Endpoints

#### Process payment for course enrollment

```
POST /payments/courses/:courseId
```

Request body:

```json
{
  "paymentMethod": "credit_card"
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "payment_id": 1,
    "enrollment_id": 2,
    "course_id": 2,
    "amount": 59.99,
    "status": "completed",
    "transaction_id": "sim-1642345678901"
  }
}
```

#### Get user payment history

```
GET /payments/users/:userId?
```

Response:

```json
{
  "status": "success",
  "results": 5,
  "data": [
    {
      "id": 1,
      "amount": 49.99,
      "payment_method": "credit_card",
      "payment_status": "completed",
      "transaction_id": "sim-1642345678901",
      "payment_date": "2023-01-10T00:00:00Z",
      "course_id": 1,
      "course_title": "JavaScript Fundamentals",
      "thumbnail": "/uploads/courses/course-1.jpg"
    }
    // ...more payments
  ]
}
```

#### Get payment details

```
GET /payments/:id
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "course_id": 1,
    "amount": 49.99,
    "payment_method": "credit_card",
    "payment_status": "completed",
    "transaction_id": "sim-1642345678901",
    "payment_date": "2023-01-10T00:00:00Z",
    "user_name": "John Doe",
    "user_email": "john.doe@example.com",
    "course_title": "JavaScript Fundamentals"
  }
}
```

#### Payment webhook handler

```
POST /payments/webhook
```

Request body:

```json
{
  "transaction_id": "sim-1642345678901",
  "status": "completed",
  "event_type": "payment_updated"
}
```

Response:

```json
{
  "status": "success",
  "message": "Webhook processed successfully"
}
```

### Admin Endpoints

#### Get dashboard statistics

```
GET /admin/dashboard
```

Response:

```json
{
  "status": "success",
  "data": {
    "users": {
      "total_users": 1000,
      "student_count": 900,
      "instructor_count": 99,
      "new_users_last_30_days": 50
    },
    "courses": {
      "total_courses": 200,
      "published_courses": 150,
      "draft_courses": 50,
      "new_courses_last_30_days": 10
    },
    "enrollments": {
      "total_enrollments": 5000,
      "new_enrollments_last_30_days": 300,
      "completed_enrollments": 2000
    },
    "revenue": {
      "total_revenue": 250000.0,
      "revenue_last_30_days": 15000.0,
      "revenue_last_7_days": 3000.0,
      "total_transactions": 5000
    },
    "top_courses": [
      {
        "id": 1,
        "title": "JavaScript Fundamentals",
        "price": 49.99,
        "instructor_name": "Jane Doe",
        "enrollment_count": 500,
        "average_rating": 4.8,
        "review_count": 300
      }
      // ...more courses
    ],
    "top_instructors": [
      {
        "id": 2,
        "username": "jane_doe",
        "full_name": "Jane Doe",
        "profile_picture": "/uploads/profiles/user-2.jpg",
        "course_count": 10,
        "total_students": 1500,
        "average_rating": 4.7
      }
      // ...more instructors
    ]
  }
}
```

#### Get all courses (admin)

```
GET /admin/courses
```

Query parameters:

- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10)
- `search` - Search term for title or description
- `status` - Filter by status (published, draft, archived)
- `instructor` - Filter by instructor ID

Response:

```json
{
  "status": "success",
  "results": 10,
  "pagination": {
    "total": 200,
    "page": 1,
    "pages": 20,
    "limit": 10
  },
  "data": [
    {
      "id": 1,
      "title": "JavaScript Fundamentals",
      "subtitle": "Learn JavaScript from scratch",
      "thumbnail": "/uploads/courses/course-1.jpg",
      "price": 49.99,
      "level": "beginner",
      "status": "published",
      "created_at": "2023-01-01T00:00:00Z",
      "instructor_id": 2,
      "instructor_name": "Jane Doe",
      "average_rating": 4.8,
      "review_count": 300,
      "student_count": 500
    }
    // ...more courses
  ]
}
```

#### Update course status

```
PATCH /admin/courses/:id/status
```

Request body:

```json
{
  "status": "published",
  "rejectionReason": null
}
```

Response:

```json
{
  "status": "success",
  "message": "Course status updated to published"
}
```

#### Get all categories

```
GET /admin/categories
```

Response:

```json
{
  "status": "success",
  "results": 10,
  "data": [
    {
      "id": 1,
      "name": "Web Development",
      "description": "Web development courses",
      "created_at": "2023-01-01T00:00:00Z",
      "course_count": 50
    }
    // ...more categories
  ]
}
```

#### Create a category

```
POST /admin/categories
```

Request body:

```json
{
  "name": "Mobile Development",
  "description": "Mobile app development courses"
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 3,
    "name": "Mobile Development",
    "description": "Mobile app development courses",
    "created_at": "2023-01-20T00:00:00Z"
  }
}
```

#### Update a category

```
PATCH /admin/categories/:id
```

Request body:

```json
{
  "name": "Mobile App Development",
  "description": "Updated description for mobile app development courses"
}
```

Response:

```json
{
  "status": "success",
  "message": "Category updated successfully"
}
```

#### Delete a category

```
DELETE /admin/categories/:id
```

Response:

```json
{
  "status": "success",
  "message": "Category deleted successfully"
}
```

## File Upload Endpoints

### Upload File Format

For file uploads, use multipart/form-data:

```
Content-Type: multipart/form-data
```

### File Size Limits

- Profile Pictures: 5MB max
- Course Thumbnails: 5MB max
- Video Files: 50MB max (configurable via MAX_FILE_SIZE in .env)

### Supported File Types

- Images: JPEG, JPG, PNG, GIF
- Videos: MP4, WebM, OGG

## Rate Limiting

API requests are rate-limited to prevent abuse. The limits are:

- 100 requests per minute for authenticated users
- 30 requests per minute for unauthenticated users

When the rate limit is exceeded, the API returns a 429 Too Many Requests response.

## CORS Configuration

The API supports Cross-Origin Resource Sharing (CORS) for frontend applications. By default, all origins are allowed in development mode, but this should be restricted in production.

## Versioning

This documentation covers v1 of the API. Future versions will be accessed via a different URL prefix (e.g., `/api/v2/`).
