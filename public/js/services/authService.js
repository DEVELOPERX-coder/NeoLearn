import { apiService } from "./apiService.js";

export const authService = {
  async login(email, password) {
    const response = await apiService.post("/api/auth/login", {
      email,
      password,
    });
    if (response.token) {
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
    }
    return response;
  },

  async register(userData) {
    const response = await apiService.post("/api/auth/register", userData);
    if (response.token) {
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
    }
    return response;
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  async getCurrentUser() {
    const token = localStorage.getItem("token");
    const cachedUser = localStorage.getItem("user");

    if (!token) {
      return null;
    }

    try {
      // Try to get fresh user data
      const user = await apiService.get("/api/auth/me");
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    } catch (error) {
      // If API call fails but we have cached user, return that
      if (cachedUser) {
        return JSON.parse(cachedUser);
      }

      // If no cached user or API call failed, clear storage and return null
      this.logout();
      return null;
    }
  },

  getToken() {
    return localStorage.getItem("token");
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  getCachedUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  hasRole(role) {
    const user = this.getCachedUser();
    return user && user.role === role;
  },
};
