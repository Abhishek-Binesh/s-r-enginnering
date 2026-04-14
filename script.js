document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuBtn = document.getElementById("mobile-menu");
  const navLinks = document.querySelector(".nav-links");

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("active");

      // Icon toggle
      const icon = mobileMenuBtn.querySelector("i");
      if (navLinks.classList.contains("active")) {
        icon.classList.remove("fa-bars");
        icon.classList.add("fa-times");
      } else {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }
    });
  }

  // Optional: Smooth scroll for anchor links if used
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute("href")).scrollIntoView({
        behavior: "smooth",
      });
    });
  });
});

// Intersection Observer for Scroll Animations
const revealElements = document.querySelectorAll(
  ".reveal, .reveal-left, .reveal-right",
);

const scrollObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        // Optional: Stop observing once revealed
        scrollObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15, // Trigger when 15% of the element is visible
    rootMargin: "0px 0px -50px 0px",
  },
);

revealElements.forEach((el) => scrollObserver.observe(el));

/* =========================================
   Chatbot Logic
   ========================================= */
const WORKER_URL = "YOUR_WORKER_URL_HERE"; // <--- Replace with your Cloudflare worker URL

const chatbotContainer = document.querySelector(".chatbot-container");
const chatbotToggler = document.getElementById("chatbot-toggler");
const closeChatBtn = document.getElementById("close-chat");
const chatBody = document.getElementById("chat-body");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

// Chat history holds conversation locally until tab is closed
let chatHistory = [];

// Toggle Chat Window
chatbotToggler.addEventListener("click", () => {
  chatbotContainer.classList.toggle("show-chat");
  if (chatbotContainer.classList.contains("show-chat")) {
    chatInput.focus();
  }
});

closeChatBtn.addEventListener("click", () => {
  chatbotContainer.classList.remove("show-chat");
});

// Create Message Bubble
const createChatBubble = (text, type) => {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", type);
  // Using innerHTML to allow basic bolding/formatting from markdown if needed,
  // but using textContent first for safety, then formatting.
  messageDiv.innerHTML = `<p>${text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>")}</p>`;
  return messageDiv;
};

// Show Typing Indicator
const showTypingIndicator = () => {
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("message", "bot", "typing");
  typingDiv.id = "typing-indicator";
  typingDiv.innerHTML = `
    <p>
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </p>`;
  chatBody.appendChild(typingDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
};

// Handle Form Submission
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userText = chatInput.value.trim();
  if (!userText) return;

  // Append user message to UI
  chatBody.appendChild(createChatBubble(userText, "user"));
  chatInput.value = "";
  chatBody.scrollTop = chatBody.scrollHeight;

  // Add user message to history
  chatHistory.push({ role: "user", parts: [{ text: userText }] });

  // Show typing indicator
  showTypingIndicator();

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: chatHistory }),
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    const botText = data.reply;

    // Remove typing indicator
    document.getElementById("typing-indicator").remove();

    // Append bot message to UI
    chatBody.appendChild(createChatBubble(botText, "bot"));
    chatBody.scrollTop = chatBody.scrollHeight;

    // Add bot response to history
    chatHistory.push({ role: "model", parts: [{ text: botText }] });
  } catch (error) {
    document.getElementById("typing-indicator").remove();
    chatBody.appendChild(
      createChatBubble(
        "Sorry, I'm having trouble connecting right now. Please try again later or contact us directly.",
        "bot",
      ),
    );
    chatBody.scrollTop = chatBody.scrollHeight;
  }
});

/* =========================================
   Contact Form Logic
   ========================================= */
const EMAIL_WORKER_URL = "YOUR_EMAIL_WORKER_URL_HERE"; // <--- Replace with your Cloudflare Email Worker URL

const contactForm = document.getElementById("contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("form-submit-btn");
    const btnText = submitBtn.querySelector("span");
    const spinner = submitBtn.querySelector(".fa-spinner");
    const statusDiv = document.getElementById("form-status");

    // Get input values
    const formData = {
      name: document.getElementById("form-name").value.trim(),
      email: document.getElementById("form-email").value.trim(),
      phone: document.getElementById("form-phone").value.trim(),
      message: document.getElementById("form-message").value.trim(),
    };

    // UI Loading state
    submitBtn.disabled = true;
    btnText.textContent = "Sending...";
    spinner.style.display = "inline-block";
    statusDiv.style.display = "none";
    statusDiv.className = "form-status";

    try {
      const response = await fetch(EMAIL_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Success UI
        statusDiv.textContent =
          "Thank you! Your enquiry has been sent successfully.";
        statusDiv.classList.add("success");
        statusDiv.style.display = "block";
        contactForm.reset(); // Clear the form
      } else {
        throw new Error(result.error || "Failed to send message.");
      }
    } catch (error) {
      // Error UI
      statusDiv.textContent =
        "Oops! Something went wrong. Please try emailing us directly.";
      statusDiv.classList.add("error");
      statusDiv.style.display = "block";
      console.error("Form Error:", error);
    } finally {
      // Reset Button State
      submitBtn.disabled = false;
      btnText.textContent = "Send Enquiry";
      spinner.style.display = "none";
    }
  });
}
