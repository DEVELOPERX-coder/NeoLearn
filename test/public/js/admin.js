document.addEventListener("DOMContentLoaded", function () {
  const addCourseForm = document.getElementById("add-course-form");
  const courseMessage = document.getElementById("course-message");

  // Check if user is admin
  async function checkAdmin() {
    try {
      const response = await fetch("/api/auth/current-user");
      const data = await response.json();

      if (!data.user || !data.user.is_admin) {
        // Redirect to home if not admin
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Auth check error:", error);
      window.location.href = "/";
    }
  }

  // Handle add course form submission
  if (addCourseForm) {
    addCourseForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const title = document.getElementById("title").value;
      const instructor = document.getElementById("instructor").value;
      const description = document.getElementById("description").value;
      const imageUrl = document.getElementById("image_url").value;
      const price = document.getElementById("price").value;

      try {
        const response = await fetch("/api/courses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            instructor,
            description,
            image_url: imageUrl,
            price,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          courseMessage.textContent = data.message;
          courseMessage.className = "form-message success";

          // Reset form
          addCourseForm.reset();

          // Redirect to home after successful course creation
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        } else {
          courseMessage.textContent = data.message;
          courseMessage.className = "form-message";
        }
      } catch (error) {
        console.error("Course creation error:", error);
        courseMessage.textContent =
          "An error occurred while creating the course. Please try again.";
        courseMessage.className = "form-message";
      }
    });
  }

  checkAdmin();
});
