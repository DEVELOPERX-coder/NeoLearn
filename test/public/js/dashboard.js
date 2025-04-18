document.addEventListener("DOMContentLoaded", function () {
  const userInfoContainer = document.getElementById("user-info");
  const enrolledCoursesContainer = document.getElementById(
    "enrolled-courses-container"
  );

  // Fetch user info and enrolled courses
  async function fetchUserData() {
    try {
      // Fetch current user
      const userResponse = await fetch("/api/auth/current-user");
      const userData = await userResponse.json();

      if (!userData.user) {
        // Redirect to login if not authenticated
        window.location.href = "/login";
        return;
      }

      // Display user info
      userInfoContainer.innerHTML = `
          <div class="user-info">
            <h2>Welcome, ${userData.user.username}!</h2>
            <p>Email: ${userData.user.email}</p>
          </div>
        `;

      // Fetch enrolled courses
      const coursesResponse = await fetch("/api/enrollments/my-courses");
      const coursesData = await coursesResponse.json();

      if (coursesData.courses && coursesData.courses.length > 0) {
        const coursesHTML = coursesData.courses
          .map(
            (course) => `
            <div class="course-card">
              <div class="course-image">
                <img src="${
                  course.image_url ||
                  "https://via.placeholder.com/300x200?text=Course"
                }" alt="${course.title}">
              </div>
              <div class="course-info">
                <h3>${course.title}</h3>
                <p class="instructor">Instructor: ${course.instructor}</p>
                <p>${course.description.substring(0, 100)}${
              course.description.length > 100 ? "..." : ""
            }</p>
                <a href="/course/${course.id}" class="btn">View Course</a>
              </div>
            </div>
          `
          )
          .join("");

        enrolledCoursesContainer.innerHTML = coursesHTML;
      } else {
        enrolledCoursesContainer.innerHTML = `
            <p>You are not enrolled in any courses yet.</p>
            <p><a href="/" class="btn">Browse Courses</a></p>
          `;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      enrolledCoursesContainer.innerHTML =
        "<p>Failed to load your courses. Please try again later.</p>";
    }
  }

  fetchUserData();
});
