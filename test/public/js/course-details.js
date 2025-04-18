document.addEventListener("DOMContentLoaded", function () {
  const courseContainer = document.getElementById("course-container");

  // Extract course ID from URL
  const courseId = window.location.pathname.split("/").pop();

  // Fetch course details
  async function fetchCourseDetails() {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      const data = await response.json();

      if (data.course) {
        const course = data.course;
        const isEnrolled = data.isEnrolled;

        let enrollButton1 = "";
        if (!isEnrolled) {
          enrollButton1 = `<button id="enroll-button" class="btn">Enroll Now</button>`;
        } else {
          enrollButton1 = `<p class="enrolled-status">You are already enrolled in this course</p>`;
        }

        courseContainer.innerHTML = `
            <div class="course-header">
              <div class="course-header-image">
                <img src="${
                  course.image_url ||
                  "https://via.placeholder.com/300x200?text=Course"
                }" alt="${course.title}">
              </div>
              <div class="course-header-info">
                <h1>${course.title}</h1>
                <p class="instructor">Instructor: ${course.instructor}</p>
                <div class="course-price-large">$${parseFloat(
                  course.price
                ).toFixed(2)}</div>
                ${enrollButton1}
              </div>
            </div>
            <div class="course-description">
              <h2>About This Course</h2>
              <p>${course.description}</p>
            </div>
          `;

        // Add event listener to enroll button if it exists
        const enrollButton = document.getElementById("enroll-button");
        if (enrollButton) {
          enrollButton.addEventListener("click", enrollInCourse);
        }
      } else {
        courseContainer.innerHTML = "<p>Course not found.</p>";
      }
    } catch (error) {
      console.error("Error fetching course details:", error);
      courseContainer.innerHTML =
        "<p>Failed to load course details. Please try again later.</p>";
    }
  }

  // Function to handle course enrollment
  async function enrollInCourse() {
    try {
      const response = await fetch(
        `/api/enrollments/courses/${courseId}/enroll`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Replace the enroll button with enrolled status
        document.getElementById(
          "enroll-button"
        ).outerHTML = `<p class="enrolled-status">Enrolled Successfully! <a href="/dashboard">View in Dashboard</a></p>`;
      } else {
        if (response.status === 401) {
          // Redirect to login if not authenticated
          window.location.href = "/login";
        } else {
          alert(data.message || "Failed to enroll in course.");
        }
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      alert("An error occurred during enrollment. Please try again.");
    }
  }

  fetchCourseDetails();
});
