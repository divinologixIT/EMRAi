(() => {
  "use strict";

  const toast = document.getElementById("toast");
  const toastMessage = toast?.querySelector("span");
  let toastTimer = null;

  const renderIcons = () => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  const showToast = (message) => {
    if (!toast || !toastMessage) return;
    window.clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3400);
  };

  const setError = (input, message) => {
    const error = document.querySelector(`[data-error-for="${input.id}"]`);
    const inputWrap = input.closest(".input-wrap");
    if (error) error.textContent = message;
    inputWrap?.classList.toggle("invalid", Boolean(message));
    input.setAttribute("aria-invalid", String(Boolean(message)));
  };

  const clearErrorOnInput = (input) => {
    input.addEventListener(input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input", () => {
      setError(input, "");
    });
  };

  document.querySelectorAll("input, select").forEach(clearErrorOnInput);

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      button.innerHTML = `<i data-lucide="${show ? "eye" : "eye-off"}"></i>`;
      renderIcons();
    });
  });

  document.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => showToast(button.dataset.toast));
  });

  const bindPatientSelect = (select, labelId) => {
    const control = select?.closest(".patient-select-control");
    if (!select || !control) return;

    const menuId = `${select.id}SelectMenu`;
    const valueId = `${select.id}SelectValue`;
    select.classList.add("native-patient-select");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "patient-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", menuId);
    trigger.setAttribute("aria-labelledby", `${labelId} ${valueId}`);
    trigger.innerHTML = `<span id="${valueId}"></span><i data-lucide="chevron-down"></i>`;

    const menu = document.createElement("div");
    menu.id = menuId;
    menu.className = "patient-select-menu";
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-labelledby", labelId);
    menu.hidden = true;

    Array.from(select.options).forEach((nativeOption, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.id = `${select.id}SelectOption${index}`;
      option.className = "patient-select-option";
      option.dataset.value = nativeOption.value;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.tabIndex = -1;
      option.textContent = nativeOption.textContent;
      menu.append(option);
    });

    control.classList.add("is-enhanced");
    control.append(trigger, menu);
    renderIcons();

    const valueLabel = trigger.querySelector("span");
    const options = Array.from(menu.querySelectorAll(".patient-select-option"));

    const syncSelection = () => {
      const selectedOption = select.options[select.selectedIndex] || select.options[0];
      valueLabel.textContent = selectedOption.textContent;
      control.classList.toggle("has-value", Boolean(select.value));
      options.forEach((option) => {
        const selected = option.dataset.value === select.value;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-selected", String(selected));
      });
    };

    const closeDropdown = (focusTrigger = false) => {
      menu.hidden = true;
      control.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      if (focusTrigger) trigger.focus();
    };

    const openDropdown = (focusIndex) => {
      menu.hidden = false;
      control.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      const selectedIndex = Math.max(0, options.findIndex((option) => option.dataset.value === select.value));
      const targetIndex = Number.isInteger(focusIndex) ? focusIndex : selectedIndex;
      window.requestAnimationFrame(() => options[targetIndex]?.focus());
    };

    const chooseOption = (option) => {
      select.value = option.dataset.value;
      syncSelection();
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      closeDropdown(true);
    };

    trigger.addEventListener("click", () => {
      if (menu.hidden) openDropdown();
      else closeDropdown();
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      openDropdown(event.key === "ArrowDown" ? 0 : options.length - 1);
    });

    options.forEach((option, index) => {
      option.addEventListener("click", () => chooseOption(option));
      option.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          closeDropdown(true);
          return;
        }
        if (event.key === "Tab") {
          closeDropdown();
          return;
        }
        const keyTargets = {
          ArrowDown: Math.min(options.length - 1, index + 1),
          ArrowUp: Math.max(0, index - 1),
          End: options.length - 1,
          Home: 0,
        };
        if (!(event.key in keyTargets)) return;
        event.preventDefault();
        options[keyTargets[event.key]]?.focus();
      });
    });

    select.addEventListener("change", syncSelection);
    document.getElementById(labelId)?.addEventListener("click", () => trigger.focus());
    document.addEventListener("click", (event) => {
      if (!control.contains(event.target)) closeDropdown();
    });
    syncSelection();
  };

  bindPatientSelect(document.getElementById("gender"), "genderLabel");

  const dateOfBirthInput = document.getElementById("dateOfBirth");
  if (window.CliniFlow?.bindDatePicker && dateOfBirthInput) {
    window.CliniFlow.bindDatePicker(dateOfBirthInput, {
      minAge: 0,
      maxAge: 100,
    });
  }

  const loginForm = document.getElementById("patientLoginForm");
  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const identity = document.getElementById("loginIdentity");
    const password = document.getElementById("loginPassword");
    let valid = true;

    if (identity.value.trim().length < 5) {
      setError(identity, "Enter a valid email address or mobile number.");
      valid = false;
    } else {
      setError(identity, "");
    }

    if (password.value.length < 6) {
      setError(password, "Password must contain at least 6 characters.");
      valid = false;
    } else {
      setError(password, "");
    }

    if (valid) {
      showToast("Login details verified. Connecting to your patient account...");
    }
  });

  const registrationForm = document.getElementById("patientRegistrationForm");
  registrationForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const fullName = document.getElementById("fullName");
    const mobile = document.getElementById("mobileNumber");
    const email = document.getElementById("emailAddress");
    const dateOfBirth = document.getElementById("dateOfBirth");
    const gender = document.getElementById("gender");
    const password = document.getElementById("registrationPassword");
    const confirmPassword = document.getElementById("confirmPassword");
    const terms = document.getElementById("acceptTerms");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileDigits = mobile.value.replace(/\D/g, "");
    let valid = true;

    const checks = [
      [fullName, fullName.value.trim().length >= 3, "Enter your full name."],
      [mobile, mobileDigits.length >= 10, "Enter a valid mobile number."],
      [email, emailPattern.test(email.value.trim()), "Enter a valid email address."],
      [dateOfBirth, Boolean(dateOfBirth.value), "Select your date of birth."],
      [gender, Boolean(gender.value), "Select your gender."],
      [password, password.value.length >= 8, "Use at least 8 characters for your password."],
      [confirmPassword, confirmPassword.value && confirmPassword.value === password.value, "Passwords do not match."],
      [terms, terms.checked, "Please accept the Terms & Conditions."],
    ];

    checks.forEach(([input, passed, message]) => {
      setError(input, passed ? "" : message);
      if (!passed) valid = false;
    });

    if (valid) {
      showToast("Your patient registration is ready to submit.");
    }
  });

  renderIcons();
})();
