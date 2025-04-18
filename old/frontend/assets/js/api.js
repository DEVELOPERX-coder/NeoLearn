const API_URL = "http://localhost:5000/api";

const api = {
  /**
   * Make a GET request to the API
   * @param {string} endpoint - API endpoint
   * @param {object} queryParams - Query parameters
   * @returns {Promise<object>} - API response
   */
  async get(endpoint, queryParams = {}) {
    try {
      // Build query string
      const queryString =
        Object.keys(queryParams).length > 0
          ? "?" + new URLSearchParams(queryParams).toString()
          : "";

      // Get auth token
      const token = localStorage.getItem("token");

      // Set headers
      const headers = {
        "Content-Type": "application/json",
      };

      // Add auth token if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Make request
      const response = await fetch(`${API_URL}${endpoint}${queryString}`, {
        method: "GET",
        headers,
      });

      // Parse response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        throw new Error(data.message || "API request failed");
      }

      return data;
    } catch (error) {
      console.error(`API GET Error (${endpoint}):`, error);
      throw error;
    }
  },

  /**
   * Make a POST request to the API
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @returns {Promise<object>} - API response
   */
  async post(endpoint, body = {}) {
    try {
      // Get auth token
      const token = localStorage.getItem("token");

      // Set headers
      const headers = {
        "Content-Type": "application/json",
      };

      // Add auth token if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Make request
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      // Parse response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        throw new Error(data.message || "API request failed");
      }

      return data;
    } catch (error) {
      console.error(`API POST Error (${endpoint}):`, error);
      throw error;
    }
  },

  /**
   * Make a PATCH request to the API
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @returns {Promise<object>} - API response
   */
  async patch(endpoint, body = {}) {
    try {
      // Get auth token
      const token = localStorage.getItem("token");

      // Set headers
      const headers = {
        "Content-Type": "application/json",
      };

      // Add auth token if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Make request
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });

      // Parse response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        throw new Error(data.message || "API request failed");
      }

      return data;
    } catch (error) {
      console.error(`API PATCH Error (${endpoint}):`, error);
      throw error;
    }
  },

  /**
   * Make a DELETE request to the API
   * @param {string} endpoint - API endpoint
   * @returns {Promise<object>} - API response
   */
  async delete(endpoint) {
    try {
      // Get auth token
      const token = localStorage.getItem("token");

      // Set headers
      const headers = {
        "Content-Type": "application/json",
      };

      // Add auth token if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Make request
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "DELETE",
        headers,
      });

      // Parse response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        throw new Error(data.message || "API request failed");
      }

      return data;
    } catch (error) {
      console.error(`API DELETE Error (${endpoint}):`, error);
      throw error;
    }
  },

  /**
   * Upload a file to the API
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @returns {Promise<object>} - API response
   */
  async uploadFile(endpoint, formData) {
    try {
      // Get auth token
      const token = localStorage.getItem("token");

      // Set headers
      const headers = {};

      // Add auth token if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Make request
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: formData,
      });

      // Parse response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        throw new Error(data.message || "API request failed");
      }

      return data;
    } catch (error) {
      console.error(`API Upload Error (${endpoint}):`, error);
      throw error;
    }
  },
};
