document.addEventListener('DOMContentLoaded', function() {
  const coursesContainer = document.getElementById('courses-container');
  
  // Fetch all courses
  async function fetchCourses() {
    try {
      const response = await fetch('/api/courses');
      const data = await response.json();
      
      if (data.courses && data.courses.length > 0) {
        const coursesHTML = data.courses.map(course => `
          <div class="course-card">
            <div class="course-image">
              <img src="${course.image_url || 'https://via.placeholder.com/300x200?text=Course'}" alt="${course.title}">
            </div>
            <div class="course-info">
              <h3>${course.title}</h3>
              <p class="instructor">Instructor: ${course.instructor}</p>
              <p>${course.description.substring(0, 100)}${course.description.length > 100 ? '...' : ''}</p>
              <div class="course-price">$${parseFloat(course.price).toFixed(2)}</div>
              <a href="/course/${course.id}" class="btn">View Course</a>
            </div>
          </div>
        `).join('');
        
        coursesContainer.innerHTML = coursesHTML;
      } else {
        coursesContainer.innerHTML = '<p>No courses available at the moment.</p>';
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      coursesContainer.innerHTML = '<p>Failed to load courses. Please try again later.</p>';
    }
  }
  
  fetchCourses();
});