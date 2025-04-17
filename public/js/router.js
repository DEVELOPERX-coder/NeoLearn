// public/js/router.js
import { homeController } from "../../controllers/homeController.js";

// Create router first without controller references
export const router = {
  routes: [],

  init() {
    // Initialize routes here after import
    this.initRoutes();

    // Handle initial load
    this.handleUrlChange();

    // Handle browser navigation buttons
    window.addEventListener("popstate", () => this.handleUrlChange());

    // Intercept link clicks for SPA navigation
    document.addEventListener("click", (e) => {
      if (
        e.target.matches("a") &&
        e.target.href.startsWith(window.location.origin)
      ) {
        e.preventDefault();
        this.navigate(e.target.getAttribute("href"));
      }
    });
  },

  // Initialize routes after imports are complete
  initRoutes() {
    // Import controller dynamically to avoid circular dependency
    import("../../controllers/authController.js").then((module) => {
      const authController = module.authController;

      this.routes = [
        { path: "/", handler: () => homeController.showHomePage() },
        { path: "/login", handler: () => authController.showLoginPage() },
        { path: "/register", handler: () => authController.showRegisterPage() },
      ];

      // Handle the initial URL after routes are set up
      this.handleUrlChange();
    });
  },

  navigate(url) {
    window.history.pushState(null, null, url);
    this.handleUrlChange();
  },

  handleUrlChange() {
    const path = window.location.pathname;

    // If routes aren't loaded yet, return
    if (this.routes.length === 0) return;

    // Find matching route - simple exact path matching
    let match = false;

    for (const route of this.routes) {
      if (path === route.path) {
        match = true;
        route.handler();
        break;
      }
    }

    // If no route matches, show homepage
    if (!match) {
      this.routes[0].handler();
    }

    // Scroll to top when changing pages
    window.scrollTo(0, 0);
  },
};
