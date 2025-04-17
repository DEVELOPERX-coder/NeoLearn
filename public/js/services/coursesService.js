import { apiService } from "./apiService.js";

export const coursesService = {
  async getAllCourses(params = {}) {
    const queryParams = new URLSearchParams();

    // Add query parameters
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        queryParams.append(key, params[key]);
      }
    });

    const queryString = queryParams.toString()
      ? `?${queryParams.toString()}`
      : "";
    return await apiService.get(`/api/courses${queryString}`);
  },

  async getCourseById(id) {
    return await apiService.get(`/api/courses/${id}`);
  },

  async getCourseSections(courseId) {
    return await apiService.get(`/api/courses/${courseId}/sections`);
  },

  async createCourse(courseData) {
    return await apiService.post("/api/courses", courseData, true); // true for FormData
  },

  async updateCourse(courseId, courseData) {
    return await apiService.put(`/api/courses/${courseId}`, courseData, true);
  },

  async deleteCourse(courseId) {
    return await apiService.delete(`/api/courses/${courseId}`);
  },

  async getCategories() {
    return await apiService.get("/api/categories");
  },

  async enrollInCourse(courseId) {
    return await apiService.post(`/api/courses/${courseId}/enroll`);
  },

  async getCourseReviews(courseId) {
    return await apiService.get(`/api/courses/${courseId}/reviews`);
  },

  async addReview(courseId, reviewData) {
    return await apiService.post(
      `/api/courses/${courseId}/reviews`,
      reviewData
    );
  },
};
