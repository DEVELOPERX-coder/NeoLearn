import { authService } from "./authService.js";

export const apiService = {
  async get(url) {
    return await this.request(url, "GET");
  },

  async post(url, data, isFormData = false) {
    return await this.request(url, "POST", data, isFormData);
  },

  async put(url, data, isFormData = false) {
    return await this.request(url, "PUT", data, isFormData);
  },

  async delete(url) {
    return await this.request(url, "DELETE");
  },

  async request(url, method, data = null, isFormData = false) {
    const headers = {};

    // Add auth token if available
    const token = authService.getToken();
    if (token) {
      headers["x-auth-token"] = token;
    }

    // Don't set Content-Type for FormData
    if (data && !isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const options = {
      method,
      headers,
      credentials: "same-origin",
    };

    if (data) {
      if (isFormData) {
        // If data is already FormData, use it directly
        options.body =
          data instanceof FormData ? data : this.createFormData(data);
      } else {
        options.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(url, options);

      // Handle API error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || "API request failed");
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      // Parse JSON response, or return null for 204 No Content
      return response.status !== 204 ? await response.json() : null;
    } catch (error) {
      // If unauthorized, clear auth data
      if (error.status === 401) {
        authService.logout();
      }
      throw error;
    }
  },

  createFormData(data) {
    const formData = new FormData();

    Object.keys(data).forEach((key) => {
      // Handle File objects
      if (data[key] instanceof File) {
        formData.append(key, data[key]);
      }
      // Handle arrays
      else if (Array.isArray(data[key])) {
        data[key].forEach((item) => {
          formData.append(`${key}[]`, item);
        });
      }
      // Handle everything else
      else if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });

    return formData;
  },
};
