const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".primary-navigation");
const currentYear = document.querySelector("#current-year");
const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");

if (menuToggle && navigation) {
  const menuLabel = menuToggle.querySelector(".sr-only");

  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    navigation.classList.toggle("is-open", !isExpanded);
    if (menuLabel) {
      menuLabel.textContent = isExpanded ? "Menu openen" : "Menu sluiten";
    }
  });

  navigation.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      menuToggle.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
      if (menuLabel) {
        menuLabel.textContent = "Menu openen";
      }
    }
  });
}

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

if (contactForm && formStatus) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent.trim();
    const formData = new FormData(contactForm);
    const values = Object.fromEntries(formData.entries());

    submitButton.disabled = true;
    submitButton.textContent = "Bericht wordt verzonden...";
    formStatus.textContent = "";
    formStatus.classList.remove("is-error");

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Je bericht kon niet worden verzonden.");
      }

      formStatus.textContent = result.message;
      contactForm.reset();
    } catch (error) {
      formStatus.textContent = error.message || "Er is iets misgegaan. Probeer het later opnieuw.";
      formStatus.classList.add("is-error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });
}
