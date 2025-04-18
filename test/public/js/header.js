document.addEventListener("DOMContentLoaded", function () {
  const header = document.getElementById("header");

  // Function to check if user is logged in
  async function checkAuth() {
    try {
      const response = await fetch("/api/auth/current-user");
      const data = await response.json();

      let navItems = `
          <li><a href="/">Home</a></li>
        `;

      if (data.user) {
        navItems += `
            <li><a href="/dashboard">My Dashboard</a></li>
          `;

        if (data.user.is_admin) {
          navItems += `
              <li><a href="/admin/add-course">Add Course</a></li>
            `;
        }

        navItems += `
            <li><a href="#" id="logout-link">Logout</a></li>
          `;
      } else {
        navItems += `
            <li><a href="/login">Login</a></li>
            <li><a href="/register">Register</a></li>
          `;
      }

      header.innerHTML = `
          <div class="container">
            <div class="header-content">
              <div class="logo">
                <a href="/">LearnHub</a>
              </div>
              <nav>
                <ul>
                  ${navItems}
                </ul>
              </nav>
            </div>
          </div>
        `;

      // Add logout event listener if logged in
      if (data.user) {
        document
          .getElementById("logout-link")
          .addEventListener("click", async function (e) {
            e.preventDefault();

            try {
              const response = await fetch("/api/auth/logout", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              });

              if (response.ok) {
                window.location.href = "/";
              }
            } catch (error) {
              console.error("Logout error:", error);
            }
          });
      }
    } catch (error) {
      console.error("Auth check error:", error);
    }
  }

  checkAuth();
});
