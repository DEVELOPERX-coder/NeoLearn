/**
 * Register a new user
 * @param {object} userData - User registration data
 * @returns {Promise<object>} - API response
 */
async function register(userData) {
  try {
    const response = await api.post("/auth/register", userData);

    // Store token and user data
    if (response.token && response.data) {
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.data));
    }

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

/**
 * Login a user
 * @param {object} credentials - User login credentials
 * @returns {Promise<object>} - API response
 */
async function login(credentials) {
  try {
    const response = await api.post("/auth/login", credentials);

    // Store token and user data
    if (response.token && response.data) {
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.data));
    }

    return response;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

/**
 * Logout the current user
 */
function logout() {
  // Clear local storage
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Redirect to homepage
  window.location.href = "/index.html";
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user is authenticated
 */
function isAuthenticated() {
  const token = localStorage.getItem("token");
  return !!token;
}

/**
 * Get user data from local storage
 * @returns {object|null} - User data or null if not logged in
 */
function getUserFromLocalStorage() {
  const userJson = localStorage.getItem("user");
  if (userJson) {
    try {
      return JSON.parse(userJson);
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  }
  return null;
}

/**
 * Check user role
 * @param {string} role - Role to check
 * @returns {boolean} - True if user has the specified role
 */
function hasRole(role) {
  const user = getUserFromLocalStorage();
  return user && user.role === role;
}

/**
 * Fetch current user profile from API
 * @returns {Promise<object>} - User profile data
 */
async function getCurrentUser() {
  try {
    const response = await api.get("/auth/me");

    // Update stored user data
    if (response.data && response.data.user) {
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error) {
    console.error("Get current user error:", error);

    // If unauthorized, logout
    if (error.message.includes("Not authorized")) {
      logout();
    }

    throw error;
  }
}

/**
 * Check authentication status and update UI accordingly
 */
function checkAuthStatus() {
  const user = getUserFromLocalStorage();
  const loggedOutMenu = document.getElementById("loggedOutMenu");
  const loggedInMenu = document.getElementById("loggedInMenu");

  if (user) {
    // User is logged in
    if (loggedOutMenu) loggedOutMenu.style.display = "none";
    if (loggedInMenu) {
      loggedInMenu.style.display = "flex";

      // Update user name
      const userNameElement = document.getElementById("userName");
      if (userNameElement) {
        userNameElement.textContent = user.username;
      }

      // Update dashboard link based on role
      const dashboardLink = document.getElementById("dashboardLink");
      if (dashboardLink) {
        if (user.role === "instructor" || user.role === "admin") {
          dashboardLink.href = "../dashboard/instructor.html";
        } else {
          dashboardLink.href = "../dashboard/student.html";
        }
      }

      // Show admin link if admin
      if (user.role === "admin") {
        const dropdownMenu = loggedInMenu.querySelector(".dropdown-menu");
        if (dropdownMenu) {
          // Check if admin link already exists
          const adminLinkExists = Array.from(
            dropdownMenu.querySelectorAll("a")
          ).some((link) => link.href.includes("admin/dashboard.html"));

          if (!adminLinkExists) {
            const adminLi = document.createElement("li");
            adminLi.innerHTML =
              '<a href="../admin/dashboard.html">Admin Dashboard</a>';

            // Insert before logout
            const logoutLi = dropdownMenu.querySelector("li:last-child");
            dropdownMenu.insertBefore(adminLi, logoutLi);
          }
        }
      }
    }
  } else {
    // User is logged out
    if (loggedOutMenu) loggedOutMenu.style.display = "flex";
    if (loggedInMenu) loggedInMenu.style.display = "none";
  }
}
