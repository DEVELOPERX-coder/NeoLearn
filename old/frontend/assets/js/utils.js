/**
 * Format date to a human-readable string
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Format price to display as currency
 * @param {number} price - Price value
 * @returns {string} - Formatted price
 */
function formatPrice(price) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

/**
 * Generate stars HTML based on rating
 * @param {number} rating - Rating value
 * @returns {string} - HTML for star display
 */
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  let starsHtml = "";

  // Full stars
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<i class="fas fa-star"></i>';
  }

  // Half star
  if (halfStar) {
    starsHtml += '<i class="fas fa-star-half-alt"></i>';
  }

  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<i class="far fa-star"></i>';
  }

  return starsHtml;
}

/**
 * Get URL query parameters
 * @returns {object} - Object with query parameters
 */
function getQueryParams() {
  const params = {};
  const queryString = window.location.search;

  if (queryString) {
    const urlParams = new URLSearchParams(queryString);
    urlParams.forEach((value, key) => {
      params[key] = value;
    });
  }

  return params;
}

/**
 * Show a notification toast
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, info)
 */
function showNotification(message, type = "info") {
  // Check if notification container exists
  let container = document.querySelector(".notification-container");

  // Create container if it doesn't exist
  if (!container) {
    container = document.createElement("div");
    container.className = "notification-container";
    document.body.appendChild(container);
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  // Add icon based on type
  let icon = "info-circle";
  if (type === "success") icon = "check-circle";
  if (type === "error") icon = "exclamation-circle";

  notification.innerHTML = `
      <i class="fas fa-${icon}"></i>
      <span>${message}</span>
      <button class="close-btn"><i class="fas fa-times"></i></button>
  `;

  // Add to container
  container.appendChild(notification);

  // Add event listener to close button
  notification.querySelector(".close-btn").addEventListener("click", () => {
    notification.classList.add("fade-out");
    setTimeout(() => {
      notification.remove();
    }, 300);
  });

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.classList.add("fade-out");
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  }, 5000);
}

/**
 * Convert seconds to a human-readable duration format
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration
 */
function formatDuration(seconds) {
  if (!seconds) return "0min";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else {
    return `${minutes}min`;
  }
}

/**
 * Truncate text to a specific length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;

  return text.substr(0, maxLength) + "...";
}

/**
 * Calculate progress percentage
 * @param {number} completed - Number of completed items
 * @param {number} total - Total number of items
 * @returns {number} - Progress percentage
 */
function calculateProgress(completed, total) {
  if (!total || total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Create pagination controls
 * @param {object} pagination - Pagination data
 * @param {string} baseUrl - Base URL for pagination links
 * @returns {HTMLElement} - Pagination element
 */
function createPagination(pagination, baseUrl) {
  const { total, page, pages, limit } = pagination;

  // Create pagination element
  const paginationElement = document.createElement("div");
  paginationElement.className = "pagination";

  // If no pages, return empty element
  if (pages <= 1) return paginationElement;

  // Create pagination inner HTML
  let paginationHtml = "";

  // Previous page button
  if (page > 1) {
    paginationHtml += `<a href="${baseUrl}&page=${
      page - 1
    }" class="pagination-prev">Previous</a>`;
  } else {
    paginationHtml += `<span class="pagination-prev disabled">Previous</span>`;
  }

  // Page numbers
  paginationHtml += `<div class="pagination-numbers">`;

  // First page
  if (page > 2) {
    paginationHtml += `<a href="${baseUrl}&page=1">1</a>`;
  }

  // Ellipsis if needed
  if (page > 3) {
    paginationHtml += `<span class="ellipsis">...</span>`;
  }

  // Page numbers around current page
  for (let i = Math.max(1, page - 1); i <= Math.min(pages, page + 1); i++) {
    if (i === page) {
      paginationHtml += `<span class="current">${i}</span>`;
    } else {
      paginationHtml += `<a href="${baseUrl}&page=${i}">${i}</a>`;
    }
  }

  // Ellipsis if needed
  if (page < pages - 2) {
    paginationHtml += `<span class="ellipsis">...</span>`;
  }

  // Last page
  if (page < pages - 1) {
    paginationHtml += `<a href="${baseUrl}&page=${pages}">${pages}</a>`;
  }

  paginationHtml += `</div>`;

  // Next page button
  if (page < pages) {
    paginationHtml += `<a href="${baseUrl}&page=${
      page + 1
    }" class="pagination-next">Next</a>`;
  } else {
    paginationHtml += `<span class="pagination-next disabled">Next</span>`;
  }

  // Set inner HTML
  paginationElement.innerHTML = paginationHtml;

  return paginationElement;
}

// Add CSS for utility functions
document.addEventListener("DOMContentLoaded", () => {
  // Create style element
  const style = document.createElement("style");

  // Add utility styles
  style.textContent = `
      /* Notification Styles */
      .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
      }
      
      .notification {
          background-color: #fff;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 15px;
          display: flex;
          align-items: center;
          width: 300px;
          animation: slide-in 0.3s ease forwards;
      }
      
      .notification.fade-out {
          animation: fade-out 0.3s ease forwards;
      }
      
      .notification i {
          margin-right: 10px;
          font-size: 18px;
      }
      
      .notification span {
          flex: 1;
      }
      
      .notification.success {
          border-left: 4px solid #52c41a;
      }
      
      .notification.success i {
          color: #52c41a;
      }
      
      .notification.error {
          border-left: 4px solid #f5222d;
      }
      
      .notification.error i {
          color: #f5222d;
      }
      
      .notification.info {
          border-left: 4px solid #1890ff;
      }
      
      .notification.info i {
          color: #1890ff;
      }
      
      .notification .close-btn {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 14px;
      }
      
      .notification .close-btn:hover {
          color: #333;
      }
      
      @keyframes slide-in {
          from {
              transform: translateX(100%);
              opacity: 0;
          }
          to {
              transform: translateX(0);
              opacity: 1;
          }
      }
      
      @keyframes fade-out {
          from {
              transform: translateX(0);
              opacity: 1;
          }
          to {
              transform: translateX(100%);
              opacity: 0;
          }
      }
      
      /* Pagination Styles */
      .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 40px 0;
          gap: 10px;
      }
      
      .pagination-numbers {
          display: flex;
          gap: 5px;
      }
      
      .pagination a, .pagination span {
          padding: 8px 12px;
          border-radius: 4px;
          text-align: center;
      }
      
      .pagination a {
          background-color: #f5f3ff;
          color: #5624d0;
          text-decoration: none;
      }
      
      .pagination a:hover {
          background-color: #e6deff;
      }
      
      .pagination span.current {
          background-color: #5624d0;
          color: #fff;
      }
      
      .pagination span.disabled {
          color: #aaa;
          cursor: not-allowed;
      }
      
      .pagination span.ellipsis {
          background: none;
          border: none;
      }
      
      .pagination-prev, .pagination-next {
          font-weight: 600;
      }
  `;

  // Add to document
  document.head.appendChild(style);
});
