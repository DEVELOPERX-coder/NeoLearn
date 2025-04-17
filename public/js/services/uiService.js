export const uiService = {
  updateUserMenu(user) {
    const userMenu = document.getElementById("user-menu");

    if (user) {
      // User is logged in
      userMenu.innerHTML = `
          <a href="#" class="user-dropdown-toggle">
            <img src="${
              user.avatar || "/images/avatar-placeholder.png"
            }" alt="Avatar" class="user-avatar">
            <span>${user.name}</span>
          </a>
          <div class="dropdown-content">
            <a href="/dashboard">Dashboard</a>
            <a href="/profile">Profile</a>
            ${
              user.role === "instructor"
                ? '<a href="/create-course">Create Course</a>'
                : ""
            }
            <a href="#" id="logout-btn">Logout</a>
          </div>
        `;
    } else {
      // User is not logged in
      userMenu.innerHTML = `
          <a href="/login" class="btn btn-secondary">Login</a>
          <a href="/register" class="btn btn-primary">Sign Up</a>
        `;
    }
  },

  populateCategoriesDropdown(categories = []) {
    const dropdown = document.getElementById("categories-dropdown");

    if (!dropdown || !categories.length) return;

    dropdown.innerHTML = categories
      .map(
        (category) => `
        <a href="/courses?category=${category.id}">${category.name}</a>
      `
      )
      .join("");
  },

  showToast(message, type = "info") {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Add to container
    toastContainer.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.add("toast-fade-out");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  },
};
