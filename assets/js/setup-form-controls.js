/* Shared custom dropdown and clock picker controls used by setup pages. */

(() => {
  const chevronIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m7 10 5 5 5-5"></path>
    </svg>`;
  const checkIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6"></path>
    </svg>`;
  const clockIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M12 7v5l3 2"></path>
    </svg>`;

  const selectControls = [];
  const multiSelectControls = [];
  const timeControls = [];
  let activeSelect = null;

  const closeSelect = (control, restoreFocus = false) => {
    if (!control) return;
    control.wrapper.classList.remove("open", "drop-up");
    control.trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) control.trigger.focus();
    if (activeSelect === control) activeSelect = null;
  };

  const closeAllSelects = (except = null) => {
    [...selectControls, ...multiSelectControls].forEach((control) => {
      if (control !== except) closeSelect(control);
    });
  };

  const buildSelectOptions = (control) => {
    const { source, menu, triggerLabel } = control;
    menu.replaceChildren();
    [...source.options].forEach((nativeOption) => {
      const option = document.createElement("button");
      option.className = `shared-select-option${nativeOption.selected ? " selected" : ""}`;
      option.type = "button";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(nativeOption.selected));
      option.dataset.value = nativeOption.value;
      option.innerHTML = `<span></span>${checkIcon}`;
      option.querySelector("span").textContent = nativeOption.textContent;
      option.addEventListener("click", () => {
        source.value = option.dataset.value;
        source.dispatchEvent(new Event("input", { bubbles: true }));
        source.dispatchEvent(new Event("change", { bubbles: true }));
        refreshSelect(control);
        closeSelect(control, true);
      });
      menu.append(option);
    });

    const selected = source.selectedOptions[0];
    triggerLabel.textContent = selected?.textContent || "Select";
  };

  const refreshSelect = (control) => {
    const { source, trigger, triggerLabel, menu } = control;
    const selected = source.selectedOptions[0];
    triggerLabel.textContent = selected?.textContent || "Select";
    trigger.classList.toggle("is-placeholder", !source.value);
    trigger.classList.remove("is-invalid");
    trigger.disabled = source.disabled;
    trigger.setAttribute("aria-label", `${source.getAttribute("aria-label") || source.closest(".field")?.querySelector(":scope > span")?.textContent || "Select option"}: ${triggerLabel.textContent}`);
    [...menu.querySelectorAll(".shared-select-option")].forEach((option) => {
      const isSelected = option.dataset.value === source.value;
      option.classList.toggle("selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });
  };

  const openSelect = (control) => {
    if (control.source.disabled) return;
    closeAllSelects(control);
    const availableBelow = window.innerHeight - control.trigger.getBoundingClientRect().bottom;
    control.wrapper.classList.toggle("drop-up", availableBelow < Math.min(230, control.menu.scrollHeight + 14));
    control.wrapper.classList.add("open");
    control.trigger.setAttribute("aria-expanded", "true");
    activeSelect = control;
  };

  const enhanceSelect = (source) => {
    if (source.dataset.sharedSelectReady) return;
    source.dataset.sharedSelectReady = "true";
    source.classList.add("shared-native-control");

    const wrapper = document.createElement("div");
    wrapper.className = "shared-ui-select";
    const trigger = document.createElement("button");
    trigger.className = "shared-select-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    const triggerLabel = document.createElement("span");
    trigger.append(triggerLabel);
    trigger.insertAdjacentHTML("beforeend", chevronIcon);
    const menu = document.createElement("div");
    menu.className = "shared-select-menu";
    menu.setAttribute("role", "listbox");

    source.parentNode.insertBefore(wrapper, source);
    wrapper.append(trigger, menu, source);
    const control = { source, wrapper, trigger, triggerLabel, menu };
    selectControls.push(control);
    buildSelectOptions(control);
    refreshSelect(control);

    trigger.addEventListener("click", () => {
      if (wrapper.classList.contains("open")) closeSelect(control);
      else openSelect(control);
    });
    trigger.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      openSelect(control);
      const options = [...menu.querySelectorAll(".shared-select-option")];
      const selected = options.find((option) => option.classList.contains("selected"));
      (selected || options[0])?.focus();
    });
    menu.addEventListener("keydown", (event) => {
      const options = [...menu.querySelectorAll(".shared-select-option")];
      const current = options.indexOf(document.activeElement);
      let next = current;
      if (event.key === "ArrowDown") next = (current + 1) % options.length;
      else if (event.key === "ArrowUp") next = (current - 1 + options.length) % options.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = options.length - 1;
      else if (event.key === "Escape") {
        event.preventDefault();
        closeSelect(control, true);
        return;
      } else return;
      event.preventDefault();
      options[next]?.focus();
    });
    source.addEventListener("change", () => refreshSelect(control));
    source.addEventListener("invalid", () => {
      trigger.classList.add("is-invalid");
      trigger.focus();
    });
    new MutationObserver(() => refreshSelect(control)).observe(source, { attributes: true, attributeFilter: ["disabled"] });
  };

  const refreshMultiSelect = (control) => {
    const { source, trigger, triggerLabel, menu } = control;
    const selectedOptions = [...source.selectedOptions];
    const placeholder = source.dataset.placeholder || "Select options";
    triggerLabel.textContent = selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
        ? selectedOptions[0].textContent
        : `${selectedOptions[0].textContent} +${selectedOptions.length - 1}`;
    trigger.classList.toggle("is-placeholder", selectedOptions.length === 0);
    trigger.classList.remove("is-invalid");
    trigger.disabled = source.disabled;
    trigger.setAttribute("aria-label", `${source.closest(".field")?.querySelector(":scope > span")?.textContent || "Select options"}: ${triggerLabel.textContent}`);
    [...menu.querySelectorAll(".shared-select-option")].forEach((option) => {
      const nativeOption = [...source.options].find((item) => item.value === option.dataset.value);
      const selected = Boolean(nativeOption?.selected);
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-selected", String(selected));
    });
  };

  const enhanceMultiSelect = (source) => {
    if (source.dataset.sharedMultiSelectReady) return;
    source.dataset.sharedMultiSelectReady = "true";
    source.classList.add("shared-native-control");

    const wrapper = document.createElement("div");
    wrapper.className = "shared-ui-select shared-ui-multiselect";
    const trigger = document.createElement("button");
    trigger.className = "shared-select-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    const triggerLabel = document.createElement("span");
    trigger.append(triggerLabel);
    trigger.insertAdjacentHTML("beforeend", chevronIcon);
    const menu = document.createElement("div");
    menu.className = "shared-select-menu";
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-multiselectable", "true");

    source.parentNode.insertBefore(wrapper, source);
    wrapper.append(trigger, menu, source);
    const control = { source, wrapper, trigger, triggerLabel, menu };
    multiSelectControls.push(control);

    [...source.options].forEach((nativeOption) => {
      const option = document.createElement("button");
      option.className = `shared-select-option${nativeOption.selected ? " selected" : ""}`;
      option.type = "button";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(nativeOption.selected));
      option.dataset.value = nativeOption.value;
      option.innerHTML = `<span></span>${checkIcon}`;
      option.querySelector("span").textContent = nativeOption.textContent;
      option.addEventListener("click", () => {
        nativeOption.selected = !nativeOption.selected;
        source.dispatchEvent(new Event("input", { bubbles: true }));
        source.dispatchEvent(new Event("change", { bubbles: true }));
        refreshMultiSelect(control);
      });
      menu.append(option);
    });

    refreshMultiSelect(control);
    trigger.addEventListener("click", () => {
      if (wrapper.classList.contains("open")) closeSelect(control);
      else openSelect(control);
    });
    trigger.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      openSelect(control);
      const options = [...menu.querySelectorAll(".shared-select-option")];
      (options.find((option) => option.classList.contains("selected")) || options[0])?.focus();
    });
    menu.addEventListener("keydown", (event) => {
      const options = [...menu.querySelectorAll(".shared-select-option")];
      const current = options.indexOf(document.activeElement);
      let next = current;
      if (event.key === "ArrowDown") next = (current + 1) % options.length;
      else if (event.key === "ArrowUp") next = (current - 1 + options.length) % options.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = options.length - 1;
      else if (event.key === "Escape") {
        event.preventDefault();
        closeSelect(control, true);
        return;
      } else return;
      event.preventDefault();
      options[next]?.focus();
    });
    source.addEventListener("change", () => refreshMultiSelect(control));
    source.addEventListener("invalid", () => {
      trigger.classList.add("is-invalid");
      trigger.focus();
    });
    new MutationObserver(() => refreshMultiSelect(control)).observe(source, { attributes: true, attributeFilter: ["disabled"] });
  };

  const modal = document.createElement("div");
  modal.className = "clock-picker-backdrop";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="clock-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="sharedClockPickerTitle" tabindex="-1">
      <div class="clock-picker-header">
        <span class="clock-picker-kicker" id="sharedClockPickerTitle">SELECT TIME</span>
        <div class="clock-picker-time">
          <button class="clock-picker-value active" data-clock-header="hour" type="button">09</button>
          <span>:</span>
          <button class="clock-picker-value" data-clock-header="minute" type="button">00</button>
        </div>
        <div class="clock-picker-periods" aria-label="Choose AM or PM">
          <button class="clock-picker-period active" data-clock-period="AM" type="button">AM</button>
          <button class="clock-picker-period" data-clock-period="PM" type="button">PM</button>
        </div>
      </div>
      <div class="clock-picker-body">
        <p class="clock-picker-prompt">Choose hour</p>
        <div class="clock-face"><span class="clock-hand"></span></div>
      </div>
      <div class="clock-picker-actions">
        <button class="clock-picker-action" data-clock-cancel type="button">CANCEL</button>
        <button class="clock-picker-action" data-clock-ok type="button">OK</button>
      </div>
    </div>`;
  document.body.append(modal);

  const dialog = modal.querySelector(".clock-picker-dialog");
  const face = modal.querySelector(".clock-face");
  const hand = modal.querySelector(".clock-hand");
  const prompt = modal.querySelector(".clock-picker-prompt");
  const hourButton = modal.querySelector('[data-clock-header="hour"]');
  const minuteButton = modal.querySelector('[data-clock-header="minute"]');
  const periodButtons = [...modal.querySelectorAll("[data-clock-period]")];
  let activeTime = null;
  let phase = "hour";
  let hour = 9;
  let minute = 0;
  let period = "AM";

  const from24Hour = (value) => {
    const match = String(value || "09:00").match(/^(\d{1,2}):(\d{2})$/);
    const hour24 = match ? Math.min(23, Math.max(0, Number(match[1]))) : 9;
    minute = match ? Math.min(55, Math.max(0, Math.round(Number(match[2]) / 5) * 5)) : 0;
    period = hour24 >= 12 ? "PM" : "AM";
    hour = hour24 % 12 || 12;
  };

  const to24Hour = () => {
    const hour24 = (hour % 12) + (period === "PM" ? 12 : 0);
    return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  const formatTime = (value) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "Select time";
    const hour24 = Number(match[1]);
    return `${String(hour24 % 12 || 12).padStart(2, "0")}:${match[2]} ${hour24 >= 12 ? "PM" : "AM"}`;
  };

  const updateClockHeader = () => {
    hourButton.textContent = String(hour).padStart(2, "0");
    minuteButton.textContent = String(minute).padStart(2, "0");
    hourButton.classList.toggle("active", phase === "hour");
    minuteButton.classList.toggle("active", phase === "minute");
    prompt.textContent = phase === "hour" ? "Choose hour" : "Choose minutes";
    periodButtons.forEach((button) => button.classList.toggle("active", button.dataset.clockPeriod === period));
  };

  const renderClock = () => {
    face.querySelectorAll(".clock-number").forEach((number) => number.remove());
    const values = phase === "hour"
      ? Array.from({ length: 12 }, (_, index) => index + 1)
      : Array.from({ length: 12 }, (_, index) => index * 5);
    const selected = phase === "hour" ? hour : minute;
    const startAngle = phase === "hour" ? -60 : -90;
    values.forEach((value, index) => {
      const angle = (index * 30 + startAngle) * Math.PI / 180;
      const number = document.createElement("button");
      number.className = `clock-number${value === selected ? " active" : ""}`;
      number.type = "button";
      number.textContent = phase === "minute" ? String(value).padStart(2, "0") : String(value);
      number.style.left = `${50 + Math.cos(angle) * 39}%`;
      number.style.top = `${50 + Math.sin(angle) * 39}%`;
      number.addEventListener("click", () => {
        if (phase === "hour") {
          hour = value;
          phase = "minute";
        } else {
          minute = value;
        }
        updateClockHeader();
        renderClock();
      });
      face.append(number);
    });
    const selectedIndex = phase === "hour" ? hour - 1 : Math.round(minute / 5) % 12;
    hand.style.transform = `rotate(${selectedIndex * 30 + startAngle}deg)`;
  };

  const refreshTime = (control) => {
    control.label.textContent = formatTime(control.source.value);
    control.trigger.disabled = control.source.disabled;
    control.trigger.setAttribute("aria-label", `${control.source.closest(".field")?.querySelector(":scope > span")?.textContent || "Choose time"}: ${control.label.textContent}`);
  };

  const closeClock = () => {
    modal.classList.remove("open");
    activeTime?.wrapper.classList.remove("picker-open");
    const returnFocus = activeTime?.trigger;
    window.setTimeout(() => {
      modal.hidden = true;
      returnFocus?.focus();
      activeTime = null;
    }, 160);
  };

  const openClock = (control) => {
    if (control.source.disabled) return;
    closeAllSelects();
    activeTime = control;
    control.wrapper.classList.add("picker-open");
    from24Hour(control.source.value);
    phase = "hour";
    updateClockHeader();
    renderClock();
    modal.hidden = false;
    requestAnimationFrame(() => {
      modal.classList.add("open");
      dialog.focus();
    });
  };

  const enhanceTime = (source) => {
    if (source.dataset.sharedTimeReady) return;
    source.dataset.sharedTimeReady = "true";
    source.classList.add("shared-native-control");
    const wrapper = document.createElement("div");
    wrapper.className = "shared-time-picker";
    const trigger = document.createElement("button");
    trigger.className = "shared-time-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "dialog");
    const label = document.createElement("span");
    trigger.append(label);
    trigger.insertAdjacentHTML("beforeend", clockIcon);
    source.parentNode.insertBefore(wrapper, source);
    wrapper.append(trigger, source);
    const control = { source, wrapper, trigger, label };
    timeControls.push(control);
    refreshTime(control);
    trigger.addEventListener("click", () => openClock(control));
    source.addEventListener("input", () => refreshTime(control));
    source.addEventListener("change", () => refreshTime(control));
    new MutationObserver(() => refreshTime(control)).observe(source, { attributes: true, attributeFilter: ["disabled"] });
  };

  hourButton.addEventListener("click", () => {
    phase = "hour";
    updateClockHeader();
    renderClock();
  });
  minuteButton.addEventListener("click", () => {
    phase = "minute";
    updateClockHeader();
    renderClock();
  });
  periodButtons.forEach((button) => button.addEventListener("click", () => {
    period = button.dataset.clockPeriod;
    updateClockHeader();
  }));
  modal.querySelector("[data-clock-cancel]").addEventListener("click", closeClock);
  modal.querySelector("[data-clock-ok]").addEventListener("click", () => {
    if (!activeTime) return;
    activeTime.source.value = to24Hour();
    activeTime.source.dispatchEvent(new Event("input", { bubbles: true }));
    activeTime.source.dispatchEvent(new Event("change", { bubbles: true }));
    closeClock();
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeClock();
  });

  document.querySelectorAll("select[data-custom-select]").forEach(enhanceSelect);
  document.querySelectorAll("select[data-custom-multiselect]").forEach(enhanceMultiSelect);
  document.querySelectorAll('input[type="time"][data-clock-picker]').forEach(enhanceTime);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".shared-ui-select")) closeAllSelects();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!modal.hidden) closeClock();
    else if (activeSelect) closeSelect(activeSelect, true);
  });
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("reset", () => window.setTimeout(() => {
      selectControls.forEach(refreshSelect);
      multiSelectControls.forEach(refreshMultiSelect);
      timeControls.forEach(refreshTime);
    }));
  });

  window.CliniFlowFormControls = {
    refresh() {
      selectControls.forEach(refreshSelect);
      multiSelectControls.forEach(refreshMultiSelect);
      timeControls.forEach(refreshTime);
    }
  };
})();
