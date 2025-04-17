// Main application file
import { router } from "./router.js";
import { authService } from "./services/authService.js";
import { uiService } from "./services/uiService.js";

// Initialize application
const app = {
  init() {
    // Initialize router
    router.init();

    // Check if user is logged in
    this.checkAuth();

    // Setup event listeners
    this.setupEventListeners();
  },

  async checkAuth() {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        uiService.updateUserMenu(user);
      } else {
        uiService.updateUserMenu(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      uiService.updateUserMenu(null);
    }
  },

  setupEventListeners() {
    // Search form submission
    document.getElementById("search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const searchTerm = document.getElementById("search-input").value.trim();
      if (searchTerm) {
        router.navigate(`/courses?search=${encodeURIComponent(searchTerm)}`);
      }
    });

    // Logout button
    document.addEventListener("click", (e) => {
      if (e.target.matches("#logout-btn")) {
        e.preventDefault();
        authService.logout();
        router.navigate("/");
        this.checkAuth();
      }
    });
  },
};

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});

// Export app for potential use in other modules
export default app;
