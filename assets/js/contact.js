/* ============================================================
   contact.js — EmailJS-powered contact form with inline
   validation and an animated success state.

   SETUP REQUIRED (all currently placeholders):
   1. Create a free account at https://www.emailjs.com
   2. Replace EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID and
      EMAILJS_TEMPLATE_ID below with your real values.
   3. Make sure your EmailJS template has fields matching:
      {{from_name}}, {{from_email}}, {{subject}}, {{message}}
============================================================ */
(function () {
  "use strict";

  const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";
  const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
  const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";

  const form = document.getElementById("contact-form");
  const success = document.getElementById("form-success");
  const submitBtn = document.getElementById("submit-btn");
  if (!form) return;

  if (window.emailjs && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  const rules = {
    name: (v) => v.trim().length > 1 || "Please enter your name",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email address",
    subject: (v) => v.trim().length > 2 || "Please add a subject",
    message: (v) => v.trim().length > 9 || "Message should be at least 10 characters",
  };

  function validateField(input) {
    const field = input.closest(".field");
    const errorEl = field.querySelector(".field-error");
    const rule = rules[input.name];
    if (!rule) return true;
    const result = rule(input.value);
    if (result === true) {
      field.classList.remove("invalid");
      return true;
    }
    field.classList.add("invalid");
    if (errorEl) errorEl.textContent = result;
    return false;
  }

  form.querySelectorAll("input, textarea").forEach((input) => {
    input.addEventListener("blur", () => validateField(input));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let allValid = true;
    form.querySelectorAll("input, textarea").forEach((input) => {
      if (!validateField(input)) allValid = false;
    });
    if (!allValid) return;

    submitBtn.disabled = true;
    submitBtn.querySelector("span").textContent = "Sending...";

    const params = {
      from_name: form.name.value.trim(),
      from_email: form.email.value.trim(),
      subject: form.subject.value.trim(),
      message: form.message.value.trim(),
    };

    const showSuccess = () => {
      form.style.display = "none";
      if (success) success.classList.add("show");
      form.reset();
      submitBtn.disabled = false;
      submitBtn.querySelector("span").textContent = "Send Message";
      setTimeout(() => {
        if (success) success.classList.remove("show");
        form.style.display = "";
      }, 4500);
    };

    const showError = () => {
      submitBtn.disabled = false;
      submitBtn.querySelector("span").textContent = "Send Message";
      submitBtn.classList.add("invalid-shake");
      setTimeout(() => submitBtn.classList.remove("invalid-shake"), 500);
      alert("Message couldn't be sent — EmailJS isn't configured yet. See the setup note at the top of contact.js.");
    };

    if (window.emailjs && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params).then(showSuccess).catch(showError);
    } else {
      // EmailJS not configured yet — simulate the flow so the UI is demoable.
      setTimeout(showSuccess, 900);
    }
  });
})();