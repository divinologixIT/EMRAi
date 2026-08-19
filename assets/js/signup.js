(function () {
  "use strict";

  const form = document.getElementById("signupForm");
  const createButton = document.getElementById("createAccountButton");
  const fields = {
    fullName: document.getElementById("fullName"), email: document.getElementById("signupEmail"),
    phone: document.getElementById("phoneNumber"), dateOfBirth: document.getElementById("dateOfBirth"),
    password: document.getElementById("signupPassword"), confirmPassword: document.getElementById("confirmPassword"),
    role: document.getElementById("role"), terms: document.getElementById("termsAccepted")
  };

  function initRoleDropdown() {
    const select = fields.role;
    const control = select?.closest(".role-select-control");
    if (!select || !control) return;

    select.classList.add("native-role-select");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = "roleSelectTrigger";
    trigger.className = "role-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "roleSelectMenu");
    trigger.setAttribute("aria-labelledby", "roleLabel roleSelectValue");
    trigger.innerHTML = '<span id="roleSelectValue"></span><i data-lucide="chevron-down"></i>';

    const menu = document.createElement("div");
    menu.id = "roleSelectMenu";
    menu.className = "role-select-menu";
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-labelledby", "roleLabel");
    menu.hidden = true;

    Array.from(select.options).forEach((nativeOption, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.id = `roleSelectOption${index}`;
      option.className = "role-select-option";
      option.dataset.value = nativeOption.value;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.tabIndex = -1;
      option.textContent = nativeOption.textContent;
      menu.append(option);
    });

    control.classList.add("is-enhanced");
    control.append(trigger, menu);
    window.lucide?.createIcons();

    const valueLabel = trigger.querySelector("span");
    const options = Array.from(menu.querySelectorAll(".role-select-option"));

    function syncSelection() {
      const selectedOption = select.options[select.selectedIndex] || select.options[0];
      valueLabel.textContent = selectedOption.textContent;
      control.classList.toggle("has-value", Boolean(select.value));
      options.forEach((option) => {
        const selected = option.dataset.value === select.value;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-selected", String(selected));
      });
    }

    function closeDropdown(focusTrigger) {
      menu.hidden = true;
      control.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      if (focusTrigger) trigger.focus();
    }

    function openDropdown(focusIndex) {
      menu.hidden = false;
      control.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      const selectedIndex = Math.max(0, options.findIndex((option) => option.dataset.value === select.value));
      const targetIndex = Number.isInteger(focusIndex) ? focusIndex : selectedIndex;
      window.requestAnimationFrame(() => options[targetIndex]?.focus());
    }

    function chooseOption(option) {
      select.value = option.dataset.value;
      syncSelection();
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      closeDropdown(true);
    }

    trigger.addEventListener("click", () => {
      if (menu.hidden) openDropdown(); else closeDropdown(false);
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
          closeDropdown(false);
          return;
        }
        const keyTargets = {
          ArrowDown: Math.min(options.length - 1, index + 1),
          ArrowUp: Math.max(0, index - 1),
          End: options.length - 1,
          Home: 0
        };
        if (!(event.key in keyTargets)) return;
        event.preventDefault();
        options[keyTargets[event.key]]?.focus();
      });
    });

    select.addEventListener("change", syncSelection);
    document.getElementById("roleLabel")?.addEventListener("click", () => trigger.focus());
    document.addEventListener("click", (event) => {
      if (!control.contains(event.target)) closeDropdown(false);
    });
    syncSelection();
  }

  function validate() {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value.trim());
    const phoneValid = fields.phone.value.replace(/\D/g, "").length >= 7;
    const ageValue = window.CliniFlow.calculateAge(fields.dateOfBirth.value);
    const dateOfBirthValid = Number.isFinite(ageValue) && ageValue >= 0 && ageValue <= 100;
    const passwordValid = fields.password.value.length >= 8;
    const passwordMatches = fields.confirmPassword.value === fields.password.value && Boolean(fields.confirmPassword.value);
    window.CliniFlow.setInputError(fields.fullName, fields.fullName.value.trim().length >= 2 ? "" : "Enter your full name.");
    window.CliniFlow.setInputError(fields.email, emailValid ? "" : "Enter a valid email address.");
    window.CliniFlow.setInputError(fields.phone, phoneValid ? "" : "Enter a valid phone number.");
    window.CliniFlow.setInputError(fields.dateOfBirth, dateOfBirthValid ? "" : "Select a valid date of birth (up to 100 years old).");
    window.CliniFlow.setInputError(fields.password, passwordValid ? "" : "Use at least 8 characters.");
    window.CliniFlow.setInputError(fields.confirmPassword, passwordMatches ? "" : "Passwords do not match.");
    window.CliniFlow.setInputError(fields.role, fields.role.value ? "" : "Select your role.");
    document.getElementById("termsError").textContent = fields.terms.checked ? "" : "Accept the terms to continue.";
    return fields.fullName.value.trim().length >= 2 && emailValid && phoneValid && dateOfBirthValid && passwordValid && passwordMatches && Boolean(fields.role.value) && fields.terms.checked;
  }

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    window.CliniFlow?.bindPasswordToggle(button, document.getElementById(button.dataset.passwordToggle));
  });

  initRoleDropdown();
  window.CliniFlow?.bindDatePicker(fields.dateOfBirth, { minAge: 0, maxAge: 100 });

  Object.values(fields).forEach((input) => input?.addEventListener("input", () => {
    if (input === fields.terms) document.getElementById("termsError").textContent = ""; else window.CliniFlow.setInputError(input, "");
  }));

  form?.addEventListener("submit", (event) => {
    event.preventDefault(); if (!validate()) return;
    createButton.disabled = true; createButton.querySelector("span").textContent = "Creating Account...";
    localStorage.setItem("cliniflow-signup-email", fields.email.value.trim());
    window.CliniFlow?.showToast("Account created. Taking you to sign in...");
    setTimeout(() => { window.location.href = "login.html"; }, 750);
  });

  const charts = Array.from(document.querySelectorAll(".signup-metric canvas"));
  const drawSignupCharts = () => charts.forEach((canvas) => window.CliniFlow.drawSparkline(canvas, { minWidth: 86, minHeight: 25 }));
  if (document.fonts?.ready) document.fonts.ready.then(drawSignupCharts); else drawSignupCharts();
  window.addEventListener("resize", drawSignupCharts);
})();
