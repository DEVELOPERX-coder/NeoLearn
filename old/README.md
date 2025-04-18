# Installation and Setup Guide

This guide will walk you through the process of setting up and running the online learning platform. The platform consists of a backend API built with Node.js and Express, and a frontend built with HTML, CSS, and vanilla JavaScript.

## Prerequisites

Before getting started, ensure you have the following installed:

1. **Node.js** (v14 or higher)
2. **npm** (v6 or higher)
3. **MySQL** (v5.7 or higher)
4. **Git** (for cloning the repository)

## Project Structure

The project is organized into two main directories:

```
learning-platform/
├── backend/                  # Server-side code
│   ├── config/               # Configuration files
│   ├── controllers/          # API controllers
│   ├── middleware/           # Custom middleware
│   ├── models/               # Database models
│   ├── routes/               # API routes
│   ├── utils/                # Utility functions
│   ├── uploads/              # Uploaded files directory
│   ├── app.js                # Express application
│   ├── server.js             # Entry point
│   └── package.json          # Dependencies
└── frontend/                 # Client-side code
    ├── assets/               # Static assets
    │   ├── css/              # Stylesheets
    │   ├── js/               # JavaScript files
    │   └── images/           # Static images
    ├── pages/                # HTML pages
    └── index.html            # Entry point
```

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/learning-platform.git
cd learning-platform
```

## Step 2: Set Up the Database

1. Create a new MySQL database:

```sql
CREATE DATABASE learning_platform;
```

2. Import the database schema:

```bash
mysql -u your_username -p learning_platform < database-schema.sql
```

Alternatively, you can use a database management tool like MySQL Workbench or phpMyAdmin to run the SQL commands found in the `database-schema.sql` file.

## Step 3: Set Up Environment Variables

Create a `.env` file in the `backend` directory with the following content:

```
# Server configuration
PORT=5000
NODE_ENV=development

# Database configuration
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=learning_platform
DB_PORT=3306

# JWT configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Upload directory
UPLOAD_DIR=uploads
MAX_FILE_SIZE=50000000
```

Make sure to replace the placeholder values with your actual MySQL credentials and choose a secure JWT secret key.

## Step 4: Install Backend Dependencies

```bash
cd backend
npm install
```

This will install all the required Node.js packages for the backend.

## Step 5: Install Frontend Dependencies

If you're using any build tools or package managers for the frontend, you would set them up here. However, since our frontend is using vanilla JavaScript without any build step, no installation is needed.

## Step 6: Set Up File Upload Directories

Create the necessary directories for file uploads:

```bash
mkdir -p backend/uploads/courses
mkdir -p backend/uploads/videos
mkdir -p backend/uploads/profiles
```

Ensure these directories have the proper permissions:

```bash
chmod -R 755 backend/uploads
```

## Step 7: Start the Backend Server

```bash
cd backend
npm start
```

If you want to run the server in development mode with automatic restart on file changes:

```bash
npm run dev
```

The server should now be running on http://localhost:5000.

## Step 8: Serve the Frontend

You have several options for serving the frontend:

### Option 1: Using a simple HTTP server

You can use the `http-server` package to serve the frontend files:

```bash
npm install -g http-server
cd frontend
http-server -p 8000
```

The frontend should now be available at http://localhost:8000.

### Option 2: Using Visual Studio Code Live Server extension

If you're using VS Code, you can install the "Live Server" extension and start a server by right-clicking on `index.html` and selecting "Open with Live Server".

### Option 3: Using the backend server to serve frontend files

Alternatively, you can configure the backend to serve the frontend files:

1. Add this code to your `app.js` file:

```javascript
// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, "../frontend")));

// Catch-all route for serving the frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});
```

2. Then you only need to run the backend server, and the frontend will be served automatically.

## Step 9: Accessing the Platform

Once both the backend and frontend are running:

1. Open your browser and navigate to the frontend URL (e.g., http://localhost:8000)
2. You should see the home page of the learning platform
3. Register a new account or log in with an existing one

### Default Admin Account

If you want to create a default admin account, you can run the following SQL command:

```sql
INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
VALUES ('admin', 'admin@example.com', '$2a$10$XK.FT/kCVQQqJ4RKvOTRzuaUvQKkxQA4NOhM/L9wmzxEVLjNZQXAq', 'admin', 1, NOW(), NOW());

INSERT INTO user_profiles (user_id, full_name, created_at, updated_at)
VALUES (1, 'System Administrator', NOW(), NOW());
```

This creates an admin user with:

- Username: admin
- Email: admin@example.com
- Password: admin123 (already hashed in the SQL command)

## Step 10: Testing the API

You can test the API using tools like Postman or curl:

```bash
# Test the API is working
curl http://localhost:5000/api

# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'
```

## Common Issues and Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify your MySQL service is running
2. Check your database credentials in the `.env` file
3. Ensure the database user has appropriate permissions

### CORS Issues

If you encounter CORS issues when making API requests from the frontend:

1. Check that the CORS middleware is correctly configured in `app.js`
2. Verify that the frontend is making requests to the correct API URL

### File Upload Issues

If file uploads are not working:

1. Ensure the upload directories exist and have proper permissions
2. Check that the `multer` middleware is correctly configured
3. Verify the maximum file size limits in your configuration

## Customizing the Platform

### Changing the Logo and Branding

1. Replace the logo image in `frontend/assets/images/logo.png`
2. Update the colors and styling in `frontend/assets/css/style.css`

### Modifying Email Templates

Email templates are located in `backend/utils/emailTemplates.js`. You can modify them to match your branding.

### Adding New Features

To add new features:

1. Backend:

   - Create new controller functions in the appropriate controller file
   - Add new routes in the corresponding route file
   - Update or create new models as needed

2. Frontend:
   - Create new HTML pages in the `frontend/pages` directory
   - Add CSS styles in the appropriate CSS file
   - Implement JavaScript functionality in the `frontend/assets/js` directory

## Deployment

### Backend Deployment

For deploying the backend to a production environment:

1. Set up a production server (VPS, AWS EC2, etc.)
2. Install Node.js, npm, and MySQL on the server
3. Clone the repository and follow the setup steps above
4. Use a process manager like PM2 to keep the server running:

```bash
npm install -g pm2
cd backend
pm2 start server.js --name learning-platform-api
```

5. Set up Nginx or Apache as a reverse proxy to your Node.js application

### Frontend Deployment

For deploying the frontend:

1. You can use any static file hosting service (Netlify, GitHub Pages, Vercel, etc.)
2. Alternatively, serve the frontend from the same server as your backend using Nginx or Apache

### Environment Variables for Production

Make sure to update your environment variables for production:

```
NODE_ENV=production
JWT_SECRET=a_very_secure_random_string
# Other secure production values
```

## Scaling the Application

As your platform grows, you might need to scale the application:

1. **Database**: Consider using connection pooling, read replicas, or sharding
2. **File Storage**: Move file storage to a service like Amazon S3 or Google Cloud Storage
3. **Caching**: Implement Redis for caching frequently accessed data
4. **Load Balancing**: Set up load balancing for your API servers
5. **CDN**: Use a CDN for serving static assets and video content

## Maintenance

Regular maintenance tasks:

1. **Backups**: Set up regular database backups
2. **Updates**: Keep dependencies up to date
3. **Monitoring**: Implement monitoring for server health and performance
4. **Security**: Regularly check for security vulnerabilities and apply patches

## Resources

- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express Documentation](https://expressjs.com/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [JWT.io](https://jwt.io/)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
