(function () {
  "use strict";

  const instances = new WeakMap();
  let activePicker = null;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  function normalizeDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const date = new Date(value);
      date.setHours(0, 0, 0, 0);
      return date;
    }
    const text = String(value || "").trim();
    const displayMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const match = displayMatch || isoMatch;
    if (!match) return null;
    const year = Number(displayMatch ? match[3] : match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(displayMatch ? match[1] : match[3]);
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
      ? date
      : null;
  }

  function formatDate(date) {
    return [
      String(date.getDate()).padStart(2, "0"),
      String(date.getMonth() + 1).padStart(2, "0"),
      date.getFullYear()
    ].join("/");
  }

  function formatIsoDate(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function sameDate(left, right) {
    return Boolean(left && right)
      && left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate();
  }

  function resolveRange(options) {
    const today = normalizeDate(new Date());
    if (Number.isFinite(options.minAge) || Number.isFinite(options.maxAge)) {
      const minAge = Number.isFinite(options.minAge) ? options.minAge : 18;
      const maxAge = Number.isFinite(options.maxAge) ? options.maxAge : 100;
      const maximum = new Date(today);
      maximum.setFullYear(maximum.getFullYear() - minAge);
      const minimum = new Date(today);
      minimum.setFullYear(minimum.getFullYear() - maxAge - 1);
      minimum.setDate(minimum.getDate() + 1);
      return { minimum, maximum };
    }

    const minimum = normalizeDate(options.minDate) || today;
    let maximum = normalizeDate(options.maxDate);
    if (!maximum) {
      maximum = new Date(minimum);
      maximum.setFullYear(maximum.getFullYear() + (Number(options.maxYears) || 2));
    }
    return minimum <= maximum ? { minimum, maximum } : { minimum: maximum, maximum: minimum };
  }

  function bind(input, options = {}) {
    if (!input) return null;
    if (instances.has(input)) return instances.get(input);

    const field = options.field || input.closest(".auth-date-field, [data-common-date-field]");
    const trigger = options.trigger || field?.querySelector("[data-auth-date-picker], [data-common-date-trigger]");
    const calendar = options.calendar || field?.querySelector(".auth-date-calendar, [data-common-date-calendar]");
    if (!field || !trigger || !calendar) return null;

    const classPrefix = options.classPrefix
      || calendar.dataset.classPrefix
      || (calendar.classList.contains("auth-date-calendar") ? "auth-date" : "common-date");
    const openClass = options.openClass || "is-open";
    const fixed = options.fixed === true;
    const { minimum, maximum } = resolveRange(options);
    const initialDate = normalizeDate(input.dataset.iso || input.value);
    const initialView = initialDate && initialDate >= minimum && initialDate <= maximum
      ? initialDate
      : maximum;
    const state = {
      month: initialView.getMonth(),
      selectedDate: initialDate,
      year: initialView.getFullYear()
    };

    const isAllowed = (date) => date >= minimum && date <= maximum;

    function close() {
      field.classList.remove(openClass);
      calendar.hidden = true;
      input.setAttribute("aria-expanded", "false");
      if (activePicker === api) activePicker = null;
    }

    function position() {
      if (!fixed || calendar.hidden) return;
      const rect = trigger.getBoundingClientRect();
      const viewportGap = 12;
      const anchorGap = 7;
      const preferredWidth = Number(options.width) || Math.max(320, rect.width);
      const width = Math.min(preferredWidth, window.innerWidth - (viewportGap * 2));
      calendar.style.position = "fixed";
      calendar.style.width = `${width}px`;
      calendar.style.maxWidth = `${window.innerWidth - (viewportGap * 2)}px`;
      const height = calendar.offsetHeight;
      const roomBelow = window.innerHeight - rect.bottom - anchorGap - viewportGap;
      const placeAbove = roomBelow < height && rect.top > height + anchorGap + viewportGap;
      const preferredTop = placeAbove ? rect.top - height - anchorGap : rect.bottom + anchorGap;
      const top = Math.max(viewportGap, Math.min(preferredTop, window.innerHeight - height - viewportGap));
      const left = Math.max(viewportGap, Math.min(rect.left, window.innerWidth - width - viewportGap));
      calendar.style.top = `${top}px`;
      calendar.style.left = `${left}px`;
      calendar.style.right = "auto";
    }

    function render() {
      const firstDay = new Date(state.year, state.month, 1).getDay();
      const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
      const months = monthNames.map((month, index) => (
        `<option value="${index}"${index === state.month ? " selected" : ""}>${month}</option>`
      )).join("");
      const years = [];
      for (let year = minimum.getFullYear(); year <= maximum.getFullYear(); year += 1) years.push(year);
      const yearOptions = years.map((year) => (
        `<option value="${year}"${year === state.year ? " selected" : ""}>${year}</option>`
      )).join("");
      let days = dayNames.map((day) => `<span class="${classPrefix}-weekday">${day}</span>`).join("");
      days += `<span class="${classPrefix}-empty"></span>`.repeat(firstDay);
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(state.year, state.month, day);
        const selected = sameDate(date, state.selectedDate);
        const today = sameDate(date, new Date());
        days += `<button type="button" class="${classPrefix}-day${selected ? " is-selected" : ""}${today ? " is-today" : ""}" data-common-date-day="${day}"${isAllowed(date) ? "" : " disabled"}>${day}</button>`;
      }
      const previous = new Date(state.year, state.month - 1, 1);
      const next = new Date(state.year, state.month + 1, 1);
      const previousDisabled = previous < new Date(minimum.getFullYear(), minimum.getMonth(), 1);
      const nextDisabled = next > new Date(maximum.getFullYear(), maximum.getMonth(), 1);
      calendar.innerHTML = `
        <div class="${classPrefix}-head">
          <button type="button" class="${classPrefix}-nav" data-common-date-prev aria-label="Previous month"${previousDisabled ? " disabled" : ""}><i data-lucide="chevron-left"></i></button>
          <div class="${classPrefix}-jump">
            <select data-common-date-month aria-label="Month">${months}</select>
            <select data-common-date-year aria-label="Year">${yearOptions}</select>
          </div>
          <button type="button" class="${classPrefix}-nav" data-common-date-next aria-label="Next month"${nextDisabled ? " disabled" : ""}><i data-lucide="chevron-right"></i></button>
        </div>
        <div class="${classPrefix}-grid">${days}</div>`;
      window.lucide?.createIcons();
    }

    function open() {
      if (activePicker && activePicker !== api) activePicker.close();
      render();
      field.classList.add(openClass);
      calendar.hidden = false;
      input.setAttribute("aria-expanded", "true");
      activePicker = api;
      window.requestAnimationFrame(position);
    }

    function toggle() {
      if (calendar.hidden) open();
      else close();
    }

    function moveMonth(offset) {
      const next = new Date(state.year, state.month + offset, 1);
      state.year = next.getFullYear();
      state.month = next.getMonth();
      render();
      window.requestAnimationFrame(position);
    }

    function select(date, emit = true) {
      const normalized = normalizeDate(date);
      if (!normalized || !isAllowed(normalized)) return false;
      state.selectedDate = normalized;
      state.year = normalized.getFullYear();
      state.month = normalized.getMonth();
      input.value = formatDate(normalized);
      input.dataset.iso = formatIsoDate(normalized);
      if (emit) {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      options.onSelect?.(new Date(normalized), api);
      close();
      return true;
    }

    function clear(emit = true) {
      state.selectedDate = null;
      input.value = "";
      delete input.dataset.iso;
      if (emit) {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      options.onClear?.(api);
      close();
    }

    const api = { clear, close, input, open, position, render, select, state, toggle };
    instances.set(input, api);
    input.dataset.commonDatePickerBound = "true";

    trigger.addEventListener("click", (event) => {
      if (options.ignoreSelector && event.target.closest(options.ignoreSelector)) return;
      if (event.target.closest(`[data-common-date-calendar], .${classPrefix}-calendar`)) return;
      toggle();
    });

    calendar.addEventListener("change", (event) => {
      if (event.target.matches("[data-common-date-month]")) state.month = Number(event.target.value);
      if (event.target.matches("[data-common-date-year]")) state.year = Number(event.target.value);
      render();
      window.requestAnimationFrame(position);
    });

    calendar.addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.target.closest("[data-common-date-prev]")) {
        moveMonth(-1);
        return;
      }
      if (event.target.closest("[data-common-date-next]")) {
        moveMonth(1);
        return;
      }
      const dayButton = event.target.closest("[data-common-date-day]");
      if (!dayButton || dayButton.disabled) return;
      select(new Date(state.year, state.month, Number(dayButton.dataset.commonDateDay)));
    });

    document.addEventListener("click", (event) => {
      if (!event.composedPath().includes(field)) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !calendar.hidden) {
        close();
        input.focus();
      }
    });
    if (fixed) {
      window.addEventListener("scroll", position, true);
      window.addEventListener("resize", position);
    }

    return api;
  }

  function calculateAge(value) {
    const birthDate = normalizeDate(value);
    if (!birthDate) return Number.NaN;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    if (today.getMonth() < birthDate.getMonth()
      || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  }

  window.DivinexaDatePicker = { bind, calculateAge, formatDate, normalizeDate };
})();
