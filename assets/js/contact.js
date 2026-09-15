/* ============================================================
   contact.js — EmailJS-powered contact form with inline
   validation, a real loading state, and honest success/error
   states (it no longer pretends a message was sent when EmailJS
   isn't configured — see the "not configured" branch below).

   SETUP REQUIRED to actually receive messages:
   1. Create a free account at https://www.emailjs.com
   2. Add an Email Service (e.g. your Gmail) → gives you a
      SERVICE ID.
   3. Create an Email Template with these variables in the body:
      {{from_name}}, {{from_email}}, {{subject}}, {{message}}
      → gives you a TEMPLATE ID.
   4. Account → General → copy your PUBLIC KEY.
   5. Paste all three into the constants below.

   NOTE ON SECURITY: EmailJS's "public key" is designed to be used
   in frontend code — it is not a secret (this is the standard,
   supported way to send email from a static site with no backend).
   For extra protection you can restrict it to your domain in the
   EmailJS dashboard under Account → Security.
============================================================ */
(function () {
  "use strict";

  const EMAILJS_PUBLIC_KEY = "Citi743EimF2BLeuI";
  const EMAILJS_SERVICE_ID = "service_08cfcjd";
  const EMAILJS_TEMPLATE_ID = "template_0vaspg6";

  const IS_CONFIGURED =
    EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY" &&
    EMAILJS_SERVICE_ID !== "YOUR_SERVICE_ID" &&
    EMAILJS_TEMPLATE_ID !== "YOUR_TEMPLATE_ID";

  const form = document.getElementById("contact-form");
  const success = document.getElementById("form-success");
  const submitBtn = document.getElementById("submit-btn");
  if (!form || !submitBtn) return;

  if (window.emailjs && IS_CONFIGURED) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  // ---------------- inline error banner (created once, reused) ----------------
  let errorBox = document.getElementById("form-error");
  if (!errorBox) {
    errorBox = document.createElement("div");
    errorBox.id = "form-error";
    errorBox.className = "form-error";
    errorBox.setAttribute("role", "alert");
    form.insertAdjacentElement("beforebegin", errorBox);
  }
  function showFormError(message) {
    errorBox.textContent = message;
    errorBox.classList.add("show");
  }
  function hideFormError() {
    errorBox.classList.remove("show");
  }

  // ---------------- field validation ----------------
  const rules = {
    name: (v) => v.trim().length > 1 || "Please enter your name",
    email: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email address",
    subject: (v) => v.trim().length > 2 || "Please add a subject",
    message: (v) =>
      v.trim().length > 9 || "Message should be at least 10 characters",
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
    input.addEventListener("input", () => {
      if (input.closest(".field").classList.contains("invalid"))
        validateField(input);
      hideFormError();
    });
  });

  // ---------------- submit handling ----------------
  let isSubmitting = false; // extra guard against double-submits, on top of the disabled button

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    hideFormError();
    let allValid = true;
    form.querySelectorAll("input, textarea").forEach((input) => {
      if (!validateField(input)) allValid = false;
    });
    if (!allValid) return;

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.querySelector("span").textContent = "Sending...";

    const params = {
      from_name: form.name.value.trim(),
      from_email: form.email.value.trim(),
      subject: form.subject.value.trim(),
      message: form.message.value.trim(),
    };

    function resetButton() {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.querySelector("span").textContent = "Send Message";
    }

    function onSuccess() {
      resetButton();
      hideFormError();
      form.style.display = "none";
      if (success) success.classList.add("show");
      form.reset();
      setTimeout(() => {
        if (success) success.classList.remove("show");
        form.style.display = "";
      }, 4500);
    }

    function onFailure(reason) {
      resetButton();
      submitBtn.classList.add("invalid-shake");
      setTimeout(() => submitBtn.classList.remove("invalid-shake"), 500);
      showFormError(reason);
      // form is deliberately NOT reset here — the visitor's message is
      // preserved so they don't have to retype it before retrying.
    }

    if (!window.emailjs) {
      // the EmailJS library itself failed to load (network/CDN issue)
      onFailure(
        "Couldn't connect to the mail service. Please email me directly at shafey8124@gmail.com instead.",
      );
      return;
    }

    if (!IS_CONFIGURED) {
      // Honest failure state — this used to fake a "Message sent" success
      // even when nothing was actually configured. Never do that: a
      // visitor would believe their message reached me when it didn't.
      onFailure(
        "This form isn't fully set up yet — please email me directly at shafey8124@gmail.com instead.",
      );
      return;
    }

    emailjs
      .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
      .then(onSuccess)
      .catch((err) => {
        console.warn("[contact.js] EmailJS send failed:", err);
        onFailure(
          "Something went wrong sending that — please try again, or email me directly at shafey8124@gmail.com.",
        );
      });
  });
})();
