export const homeController = {
  showHomePage() {
    const mainContent = document.getElementById("main-content");
    const template = document.getElementById("homepage-template");

    if (template) {
      mainContent.innerHTML = "";
      mainContent.appendChild(template.content.cloneNode(true));

      // Here you would fetch featured courses and categories
      // For now, we'll just show the static template
    } else {
      mainContent.innerHTML =
        '<div class="container"><h1>Welcome to EduPlatform</h1></div>';
    }
  },
};
