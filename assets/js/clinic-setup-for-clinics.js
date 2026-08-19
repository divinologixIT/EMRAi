/* Used by: clinic-setup-tour.html */

(() => {
  const requestedPlan = (new URLSearchParams(window.location.search).get("plan") || "clinic").toLowerCase();
  const planKey = requestedPlan === "organization" ? "organization" : "clinic";
  const planLabel = planKey === "organization" ? "Organization Plan" : "Clinic Plan";
  document.title = `CliniFlow - ${planLabel} Setup`;
  document.querySelector(".profile-button small").textContent = planLabel;
  const headerClinicName = document.getElementById("headerClinicName");
  document.getElementById("nextStepLink").href = `SmartConfigurationForClinics.html?plan=${encodeURIComponent(planKey)}`;

  const clinics = [
    {
      name: "City Health Clinic",
      branch: "Main Branch",
      type: "OPD",
      specialization: "General Physician",
      email: "cityhealth@cliniflow.example",
      phoneCode: "+91",
      phone: "98765 43210",
      address: "12 Park Street",
      city: "Kolkata",
      state: "West Bengal",
      pincode: "700001",
      startTime: "09:00",
      endTime: "21:00",
      breakTime: "01:00 PM - 02:00 PM",
      open24Hours: false,
      status: "Active",
      services: ["OPD Services", "Online Appointments", "AI Assistant"]
    },
    {
      name: "Wellness Care Center",
      branch: "Branch 2",
      type: "Multi-Speciality",
      specialization: "Cardiology, Dermatology",
      email: "wellness@cliniflow.example",
      phoneCode: "+91",
      phone: "98765 43211",
      address: "18 Grand Trunk Road",
      city: "Howrah",
      state: "West Bengal",
      pincode: "711101",
      startTime: "08:00",
      endTime: "20:00",
      breakTime: "",
      open24Hours: false,
      status: "Active",
      services: ["OPD Services", "Online Appointments"]
    },
    {
      name: "LifePlus Clinic",
      branch: "Branch 3",
      type: "OPD",
      specialization: "Family Medicine",
      email: "lifeplus@cliniflow.example",
      phoneCode: "+91",
      phone: "98765 43212",
      address: "CF 24, Sector 1",
      city: "Salt Lake, Kolkata",
      state: "West Bengal",
      pincode: "700064",
      startTime: "10:00",
      endTime: "19:00",
      breakTime: "02:00 PM - 03:00 PM",
      open24Hours: false,
      status: "Inactive",
      services: ["OPD Services", "AI Assistant"]
    }
  ];

  const clinicRows = document.getElementById("clinicRows");
  const clinicCount = document.getElementById("clinicCount");
  const clinicForm = document.getElementById("clinicForm");
  const clinicFormCard = document.getElementById("clinicFormCard");
  const clinicFormTitle = document.getElementById("clinicFormTitle");
  const clinicSwitcher = document.getElementById("clinicSwitcher");
  const clinicSwitcherMenu = document.getElementById("clinicSwitcherMenu");
  const activeClinicName = document.getElementById("activeClinicName");
  const activeClinicCity = document.getElementById("activeClinicCity");
  const toast = document.getElementById("toast");
  let editingIndex = null;
  let activeClinicIndex = 0;
  let toastTimer;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);

  const icon = (paths) => `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>
  `;
  const clinicIcon = icon('<path d="M5 21V7l7-4 7 4v14"></path><path d="M9 21v-4h6v4"></path><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01"></path>');
  const locationIcon = icon('<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"></path><circle cx="12" cy="10" r="2.5"></circle>');
  const editIcon = icon('<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"></path>');
  const moreIcon = icon('<circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle>');
  const checkIcon = icon('<path d="m5 12 4 4L19 6"></path>');

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
  };

  const clinicLocation = (clinic) => `${clinic.city}, ${clinic.state} - ${clinic.pincode}`;

  const renderClinicRows = () => {
    clinicRows.innerHTML = clinics.map((clinic, index) => `
      <article class="clinic-row">
        <div class="clinic-main">
          <span class="clinic-symbol" aria-hidden="true">${clinicIcon}</span>
          <span>
            <span class="clinic-title-line">
              <strong>${escapeHtml(clinic.name)}</strong>
              <span class="branch-badge">${escapeHtml(clinic.branch)}</span>
            </span>
            <small class="clinic-location">${locationIcon}${escapeHtml(clinicLocation(clinic))}</small>
          </span>
        </div>
        <span class="type-badge">${escapeHtml(clinic.type)}</span>
        <span class="status${clinic.status === "Inactive" ? " inactive" : ""}">${escapeHtml(clinic.status)}</span>
        <span class="row-actions">
          <button class="icon-button" type="button" aria-label="Edit ${escapeHtml(clinic.name)}" data-edit-clinic="${index}">${editIcon}</button>
          <button class="icon-button" type="button" aria-label="More options for ${escapeHtml(clinic.name)}" data-more-clinic="${index}">${moreIcon}</button>
        </span>
      </article>
    `).join("");

    const last = clinics.length;
    clinicCount.textContent = last ? `Showing 1 to ${last} of ${last} clinics` : "No clinics added yet";
  };

  const renderClinicSwitcher = () => {
    clinicSwitcherMenu.innerHTML = `
      ${clinics.map((clinic, index) => `
        <button class="switcher-option" type="button" role="option" aria-selected="${index === activeClinicIndex}" data-switch-clinic="${index}">
          <span class="switcher-icon" aria-hidden="true">${clinicIcon}</span>
          <span><strong>${escapeHtml(clinic.name)}</strong><small>${escapeHtml(clinic.city)}, ${escapeHtml(clinic.state)}</small></span>
          <span class="option-check" aria-hidden="true">${index === activeClinicIndex ? checkIcon : ""}</span>
        </button>
      `).join("")}
      <button class="switcher-add" type="button" data-add-clinic><span aria-hidden="true">+</span> Add New Clinic</button>
    `;

    const activeClinic = clinics[activeClinicIndex];
    if (activeClinic) {
      activeClinicName.textContent = activeClinic.name;
      activeClinicCity.textContent = `${activeClinic.city}, ${activeClinic.state}`;
      headerClinicName.textContent = activeClinic.name;
    }
  };

  const renderClinics = () => {
    renderClinicRows();
    renderClinicSwitcher();
  };

  const updateServiceToggles = (services) => {
    document.querySelectorAll("[data-service]").forEach((toggle) => {
      const active = services.includes(toggle.dataset.service);
      toggle.classList.toggle("active", active);
      toggle.setAttribute("aria-pressed", String(active));
    });
  };

  const refreshFormControls = () => {
    window.CliniFlowFormControls?.refresh();
  };

  const resetClinicForm = () => {
    editingIndex = null;
    clinicForm.reset();
    clinicFormTitle.textContent = "Add New Clinic";
    ["startTime", "endTime", "breakTime"].forEach((id) => {
      document.getElementById(id).disabled = false;
    });
    updateServiceToggles(["OPD Services", "Online Appointments", "AI Assistant"]);
    window.setTimeout(refreshFormControls);
  };

  const focusClinicForm = () => {
    clinicFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("clinicName").focus(), 350);
  };

  const beginAddClinic = () => {
    resetClinicForm();
    clinicSwitcherMenu.hidden = true;
    clinicSwitcher.setAttribute("aria-expanded", "false");
    focusClinicForm();
  };

  const editClinic = (index) => {
    const clinic = clinics[index];
    if (!clinic) return;
    editingIndex = index;
    clinicFormTitle.textContent = `Edit ${clinic.name}`;
    document.getElementById("clinicName").value = clinic.name;
    document.getElementById("clinicType").value = clinic.type;
    document.getElementById("specialization").value = clinic.specialization;
    document.getElementById("clinicEmail").value = clinic.email;
    document.getElementById("phoneCode").value = clinic.phoneCode;
    document.getElementById("clinicPhone").value = clinic.phone;
    document.getElementById("clinicAddress").value = clinic.address;
    document.getElementById("clinicCity").value = clinic.city;
    document.getElementById("clinicState").value = clinic.state;
    document.getElementById("clinicPincode").value = clinic.pincode;
    document.getElementById("startTime").value = clinic.startTime;
    document.getElementById("endTime").value = clinic.endTime;
    document.getElementById("breakTime").value = clinic.breakTime;
    document.getElementById("open24Hours").checked = clinic.open24Hours;
    ["startTime", "endTime", "breakTime"].forEach((id) => {
      document.getElementById(id).disabled = clinic.open24Hours;
    });
    updateServiceToggles(clinic.services);
    refreshFormControls();
    focusClinicForm();
  };

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-clinic]");
    if (addButton) {
      beginAddClinic();
      return;
    }

    const editButton = event.target.closest("[data-edit-clinic]");
    if (editButton) {
      editClinic(Number(editButton.dataset.editClinic));
      return;
    }

    const moreButton = event.target.closest("[data-more-clinic]");
    if (moreButton) {
      const clinic = clinics[Number(moreButton.dataset.moreClinic)];
      showToast(`${clinic.name} options are ready to connect.`);
      return;
    }

    const switchButton = event.target.closest("[data-switch-clinic]");
    if (switchButton) {
      activeClinicIndex = Number(switchButton.dataset.switchClinic);
      renderClinicSwitcher();
      clinicSwitcherMenu.hidden = true;
      clinicSwitcher.setAttribute("aria-expanded", "false");
      showToast(`Switched to ${clinics[activeClinicIndex].name}.`);
      return;
    }

    if (!event.target.closest(".clinic-switcher")) {
      clinicSwitcherMenu.hidden = true;
      clinicSwitcher.setAttribute("aria-expanded", "false");
    }
  });

  clinicSwitcher.addEventListener("click", () => {
    const open = clinicSwitcherMenu.hidden;
    clinicSwitcherMenu.hidden = !open;
    clinicSwitcher.setAttribute("aria-expanded", String(open));
  });

  clinicSwitcher.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    clinicSwitcherMenu.hidden = false;
    clinicSwitcher.setAttribute("aria-expanded", "true");
    clinicSwitcherMenu.querySelector("[data-switch-clinic]")?.focus();
  });

  clinicSwitcherMenu.addEventListener("keydown", (event) => {
    const options = [...clinicSwitcherMenu.querySelectorAll("button")];
    const index = options.indexOf(document.activeElement);
    if (event.key === "Escape") {
      clinicSwitcherMenu.hidden = true;
      clinicSwitcher.setAttribute("aria-expanded", "false");
      clinicSwitcher.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (index + direction + options.length) % options.length;
    options[nextIndex]?.focus();
  });

  document.querySelectorAll("[data-service]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const active = toggle.classList.toggle("active");
      toggle.setAttribute("aria-pressed", String(active));
    });
  });

  document.getElementById("open24Hours").addEventListener("change", (event) => {
    const disabled = event.currentTarget.checked;
    ["startTime", "endTime", "breakTime"].forEach((id) => {
      document.getElementById(id).disabled = disabled;
    });
    refreshFormControls();
  });

  clinicForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!clinicForm.checkValidity()) {
      clinicForm.reportValidity();
      return;
    }

    const services = [...document.querySelectorAll("[data-service].active")].map((toggle) => toggle.dataset.service);
    const existingClinic = editingIndex === null ? null : clinics[editingIndex];
    const clinic = {
      name: document.getElementById("clinicName").value.trim(),
      branch: existingClinic?.branch || `Branch ${clinics.length + 1}`,
      type: document.getElementById("clinicType").value,
      specialization: document.getElementById("specialization").value.trim(),
      email: document.getElementById("clinicEmail").value.trim(),
      phoneCode: document.getElementById("phoneCode").value,
      phone: document.getElementById("clinicPhone").value.trim(),
      address: document.getElementById("clinicAddress").value.trim(),
      city: document.getElementById("clinicCity").value.trim(),
      state: document.getElementById("clinicState").value,
      pincode: document.getElementById("clinicPincode").value.trim(),
      startTime: document.getElementById("startTime").value,
      endTime: document.getElementById("endTime").value,
      breakTime: document.getElementById("breakTime").value,
      open24Hours: document.getElementById("open24Hours").checked,
      status: existingClinic?.status || "Active",
      services
    };

    if (editingIndex === null) {
      clinics.push(clinic);
      activeClinicIndex = clinics.length - 1;
      showToast(`${clinic.name} added successfully.`);
    } else {
      clinics[editingIndex] = clinic;
      activeClinicIndex = editingIndex;
      showToast(`${clinic.name} updated successfully.`);
    }

    renderClinics();
    resetClinicForm();
    clinicRows.scrollTop = clinicRows.scrollHeight;
  });

  document.getElementById("cancelClinic").addEventListener("click", () => {
    resetClinicForm();
    showToast("Clinic form cleared.");
  });

  document.getElementById("supportButton").addEventListener("click", () => {
    showToast("Support chat is ready to connect.");
  });

  document.querySelectorAll("[data-clinic-tour-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.clinicTourStep);
      if (step === 1) {
        window.location.href = `clinic-tour.html?plan=${encodeURIComponent(planKey)}`;
      } else if (step === 3) {
        window.location.href = `SmartConfigurationForClinics.html?plan=${encodeURIComponent(planKey)}`;
      } else if (step === 4) {
        window.location.href = `individual-clinic-setup.html?step=4&plan=${encodeURIComponent(planKey)}`;
      }
    });
  });

  renderClinics();
  updateServiceToggles(["OPD Services", "Online Appointments", "AI Assistant"]);
})();
