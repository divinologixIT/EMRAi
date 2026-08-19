(function () {
  "use strict";

  const body = document.body;
  const sidebarToggle = document.getElementById("sidebarToggle");
  const profileButton = document.getElementById("profileMenuButton");
  const profileMenu = document.getElementById("profileMenu");
  const toast = document.getElementById("toast");
  let toastTimer;

  function isMobile() {
    return window.matchMedia("(max-width: 960px)").matches;
  }

  function setNavigationState() {
    if (!sidebarToggle) return;
    const isOpen = isMobile()
      ? body.classList.contains("mobile-nav-open")
      : !body.classList.contains("sidebar-collapsed");
    sidebarToggle.setAttribute("aria-expanded", String(isOpen));
  }

  function toggleNavigation() {
    if (isMobile()) {
      body.classList.toggle("mobile-nav-open");
    } else {
      body.classList.toggle("sidebar-collapsed");
      localStorage.setItem("cliniflow-sidebar", body.classList.contains("sidebar-collapsed") ? "collapsed" : "open");
    }
    setNavigationState();
    window.dispatchEvent(new Event("resize"));
  }

  function showToast(message) {
    if (!toast || !message) return;
    toast.querySelector("span").textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function setInputError(input, message, errorId) {
    input?.closest(".input-control")?.classList.toggle("invalid", Boolean(message));
    const error = document.getElementById(errorId || input?.getAttribute("aria-describedby"));
    if (error) error.textContent = message;
  }

  function bindPasswordToggle(button, input) {
    if (!button || !input) return;
    button.addEventListener("click", () => {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      button.innerHTML = `<i data-lucide="${showing ? "eye" : "eye-off"}"></i>`;
      window.lucide?.createIcons();
    });
  }

  function parseDateValue(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      || text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const isoFormat = match[1].length === 4;
    const year = Number(match[isoFormat ? 1 : 3]);
    const month = Number(match[2]) - 1;
    const day = Number(match[isoFormat ? 3 : 1]);
    const date = new Date(year, month, day);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
  }

  function formatDisplayDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()}`;
  }

  function calculateAge(value) {
    if (window.DivinexaDatePicker) return window.DivinexaDatePicker.calculateAge(value);
    const birthDate = parseDateValue(value);
    if (!birthDate) return Number.NaN;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const birthdayPending = today.getMonth() < birthDate.getMonth()
      || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
    if (birthdayPending) age -= 1;
    return age;
  }

  function bindDatePicker(input, options = {}) {
    const { minAge = 18, maxAge = 100 } = options;
    const sharedPicker = window.DivinexaDatePicker?.bind(input, { ...options, minAge, maxAge });
    if (sharedPicker) return sharedPicker;
    if (!input || input.dataset.authDatePickerBound === "true") return;
    const field = input.closest(".auth-date-field");
    const trigger = field?.querySelector("[data-auth-date-picker]");
    const calendar = field?.querySelector(".auth-date-calendar");
    if (!field || !trigger || !calendar) return;
    input.dataset.authDatePickerBound = "true";

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const latestBirthDate = new Date();
    latestBirthDate.setHours(0, 0, 0, 0);
    latestBirthDate.setFullYear(latestBirthDate.getFullYear() - minAge);
    const earliestBirthDate = new Date();
    earliestBirthDate.setHours(0, 0, 0, 0);
    earliestBirthDate.setFullYear(earliestBirthDate.getFullYear() - maxAge - 1);
    earliestBirthDate.setDate(earliestBirthDate.getDate() + 1);

    const initialDate = parseDateValue(input.value);
    const state = {
      month: (initialDate || latestBirthDate).getMonth(),
      selectedDate: initialDate,
      year: (initialDate || latestBirthDate).getFullYear()
    };

    const isAllowed = (date) => date >= earliestBirthDate && date <= latestBirthDate;
    const sameDate = (left, right) => left && right
      && left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate();

    const close = () => {
      field.classList.remove("is-open");
      calendar.hidden = true;
      input.setAttribute("aria-expanded", "false");
    };

    const closeOthers = () => {
      document.querySelectorAll(".auth-date-field.is-open").forEach((item) => {
        if (item === field) return;
        item.classList.remove("is-open");
        const panel = item.querySelector(".auth-date-calendar");
        const valueInput = item.querySelector("[aria-haspopup='dialog']");
        if (panel) panel.hidden = true;
        valueInput?.setAttribute("aria-expanded", "false");
      });
    };

    const render = () => {
      const firstDay = new Date(state.year, state.month, 1).getDay();
      const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
      const months = monthNames.map((month, index) => (
        `<option value="${index}"${index === state.month ? " selected" : ""}>${month}</option>`
      )).join("");
      const years = [];
      for (let year = earliestBirthDate.getFullYear(); year <= latestBirthDate.getFullYear(); year += 1) years.push(year);
      const yearOptions = years.map((year) => (
        `<option value="${year}"${year === state.year ? " selected" : ""}>${year}</option>`
      )).join("");
      let days = dayNames.map((day) => `<span class="auth-date-weekday">${day}</span>`).join("");
      days += "<span class=\"auth-date-empty\"></span>".repeat(firstDay);
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(state.year, state.month, day);
        const selected = sameDate(date, state.selectedDate);
        days += `<button type="button" class="auth-date-day${selected ? " is-selected" : ""}" data-date-day="${day}"${isAllowed(date) ? "" : " disabled"}>${day}</button>`;
      }
      const previousMonth = new Date(state.year, state.month - 1, 1);
      const nextMonth = new Date(state.year, state.month + 1, 1);
      const previousDisabled = previousMonth < new Date(earliestBirthDate.getFullYear(), earliestBirthDate.getMonth(), 1);
      const nextDisabled = nextMonth > new Date(latestBirthDate.getFullYear(), latestBirthDate.getMonth(), 1);

      calendar.innerHTML = `
        <div class="auth-date-head">
          <button type="button" class="auth-date-nav" data-date-prev aria-label="Previous month"${previousDisabled ? " disabled" : ""}><i data-lucide="chevron-left"></i></button>
          <div class="auth-date-jump">
            <select data-date-month aria-label="Month">${months}</select>
            <select data-date-year aria-label="Year">${yearOptions}</select>
          </div>
          <button type="button" class="auth-date-nav" data-date-next aria-label="Next month"${nextDisabled ? " disabled" : ""}><i data-lucide="chevron-right"></i></button>
        </div>
        <div class="auth-date-grid">${days}</div>`;
      window.lucide?.createIcons();
    };

    const moveMonth = (offset) => {
      const next = new Date(state.year, state.month + offset, 1);
      state.year = next.getFullYear();
      state.month = next.getMonth();
      render();
    };

    trigger.addEventListener("click", () => {
      closeOthers();
      const opening = !field.classList.contains("is-open");
      if (!opening) { close(); return; }
      field.classList.add("is-open");
      calendar.hidden = false;
      input.setAttribute("aria-expanded", "true");
      render();
    });

    calendar.addEventListener("change", (event) => {
      if (event.target.matches("[data-date-month]")) state.month = Number(event.target.value);
      if (event.target.matches("[data-date-year]")) state.year = Number(event.target.value);
      render();
    });

    calendar.addEventListener("click", (event) => {
      if (event.target.closest("[data-date-prev]")) moveMonth(-1);
      if (event.target.closest("[data-date-next]")) moveMonth(1);
      const dayButton = event.target.closest("[data-date-day]");
      if (!dayButton || dayButton.disabled) return;
      state.selectedDate = new Date(state.year, state.month, Number(dayButton.dataset.dateDay));
      input.value = formatDisplayDate(state.selectedDate);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      close();
    });

    document.addEventListener("click", (event) => {
      if (!field.contains(event.target)) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && field.classList.contains("is-open")) close();
    });
  }

  function drawSparkline(canvas, options = {}) {
    if (!canvas?.dataset.values) return;
    const values = canvas.dataset.values.split(",").map(Number);
    const color = options.color || canvas.dataset.color || "#0aa89b";
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(options.minWidth || 90, rect.width);
    const height = Math.max(options.minHeight || 28, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const points = values.map((value, index) => ({
      x: 3 + index * ((width - 6) / (values.length - 1)),
      y: height - 4 - ((value - min) / Math.max(1, max - min)) * (height - 8)
    }));
    context.beginPath();
    points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.strokeStyle = color;
    context.lineWidth = 1;
    context.stroke();
    points.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, 2, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = "#fff";
      context.lineWidth = 1;
      context.stroke();
    });
  }

  function setProfileMenu(open) {
    if (!profileButton || !profileMenu) return;
    profileMenu.classList.toggle("open", open);
    profileButton.setAttribute("aria-expanded", String(open));
  }

  if (localStorage.getItem("cliniflow-sidebar") === "collapsed" && !isMobile()) {
    body.classList.add("sidebar-collapsed");
  }

  sidebarToggle?.addEventListener("click", toggleNavigation);

  profileButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    setProfileMenu(!profileMenu.classList.contains("open"));
  });

  profileMenu?.addEventListener("click", (event) => event.stopPropagation());
  profileMenu?.querySelectorAll("[role='menuitem']").forEach((item) => {
    item.addEventListener("click", () => setProfileMenu(false));
  });

  document.addEventListener("click", () => setProfileMenu(false));

  document.querySelectorAll("[data-toast]").forEach((element) => {
    element.addEventListener("click", () => showToast(element.dataset.toast));
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
      if (isMobile()) body.classList.remove("mobile-nav-open");
      setNavigationState();
    });
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      document.getElementById("globalSearch")?.focus();
    }
    if (event.key === "Escape") {
      body.classList.remove("mobile-nav-open");
      if (profileMenu?.classList.contains("open")) {
        setProfileMenu(false);
        profileButton?.focus();
      }
      setNavigationState();
    }
  });

  window.addEventListener("resize", setNavigationState);
  window.CliniFlow = { bindDatePicker, bindPasswordToggle, calculateAge, drawSparkline, setInputError, showToast };

  if (window.lucide) window.lucide.createIcons();
  setNavigationState();
})();
