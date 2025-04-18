document.addEventListener("DOMContentLoaded", function () {
  // Login form handling
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const loginMessage = document.getElementById("login-message");
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          loginMessage.textContent = data.message;
          loginMessage.className = "form-message success";

          // Redirect to dashboard after successful login
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1000);
        } else {
          loginMessage.textContent = data.message;
          loginMessage.className = "form-message";
        }
      } catch (error) {
        console.error("Login error:", error);
        loginMessage.textContent =
          "An error occurred during login. Please try again.";
        loginMessage.className = "form-message";
      }
    });
  }

  // Register form handling
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const registerMessage = document.getElementById("register-message");
      const username = document.getElementById("username").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      // Check if passwords match
      if (password !== confirmPassword) {
        registerMessage.textContent = "Passwords do not match";
        registerMessage.className = "form-message";
        return;
      }

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
            password,
            confirm_password: confirmPassword,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          registerMessage.textContent = data.message;
          registerMessage.className = "form-message success";

          // Redirect to dashboard after successful registration
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1000);
        } else {
          registerMessage.textContent = data.message;
          registerMessage.className = "form-message";
        }
      } catch (error) {
        console.error("Registration error:", error);
        registerMessage.textContent =
          "An error occurred during registration. Please try again.";
        registerMessage.className = "form-message";
      }
    });
  }
});
