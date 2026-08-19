(() => {
  "use strict";

  const patients = [
    {
      token: "A-015",
      name: "Arjun Sen",
      meta: "32 Y · Male",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=96&h=96&q=80",
      complaint: "Fever, Headache",
      visit: "First Visit",
      arrived: "6:27 PM",
      arrivalMeta: "18 min ago",
      wait: "16 min",
      priority: "Medium",
      status: "Ready",
      tab: "live"
    },
    {
      token: "A-016",
      name: "Neha Patel",
      meta: "28 Y · Female",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80",
      complaint: "Cough, Cold",
      visit: "Follow-up",
      arrived: "6:28 PM",
      arrivalMeta: "17 min ago",
      wait: "15 min",
      priority: "Low",
      status: "Ready",
      tab: "live"
    },
    {
      token: "A-017",
      name: "Ramesh Kumar",
      meta: "65 Y · Male",
      avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=96&h=96&q=80",
      complaint: "Diabetes Checkup",
      visit: "Follow-up",
      arrived: "6:25 PM",
      arrivalMeta: "20 min ago",
      wait: "20 min",
      priority: "High",
      status: "Delayed",
      tab: "live"
    },
    {
      token: "A-018",
      name: "Sandeep Roy",
      meta: "45 Y · Male",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&h=96&q=80",
      complaint: "Breathing Difficulty",
      visit: "First Visit",
      arrived: "6:30 PM",
      arrivalMeta: "15 min ago",
      wait: "13 min",
      priority: "High",
      status: "Urgent",
      tab: "live"
    },
    {
      token: "A-012",
      name: "Pooja Singh",
      meta: "26 Y · Female",
      avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=96&h=96&q=80",
      complaint: "Skin Allergy",
      visit: "First Visit",
      arrived: "—",
      arrivalMeta: "Not Arrived",
      wait: "—",
      priority: "Low",
      status: "Not Arrived",
      tab: "live"
    },
    {
      token: "A-019",
      name: "Vikram Joshi",
      meta: "50 Y · Male",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=96&h=96&q=80",
      complaint: "Back Pain",
      visit: "Follow-up",
      arrived: "6:32 PM",
      arrivalMeta: "13 min ago",
      wait: "11 min",
      priority: "Medium",
      status: "Ready",
      tab: "live"
    },
    {
      token: "A-020",
      name: "Meera Kapoor",
      meta: "38 Y · Female",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&h=96&q=80",
      complaint: "Migraine Review",
      visit: "Follow-up",
      arrived: "7:00 PM",
      arrivalMeta: "Scheduled",
      wait: "—",
      priority: "Medium",
      status: "Scheduled",
      tab: "scheduled"
    },
    {
      token: "A-021",
      name: "Rahul Das",
      meta: "42 Y · Male",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=96&h=96&q=80",
      complaint: "Blood Pressure",
      visit: "First Visit",
      arrived: "7:15 PM",
      arrivalMeta: "Scheduled",
      wait: "—",
      priority: "Low",
      status: "Scheduled",
      tab: "scheduled"
    },
    {
      token: "A-014",
      name: "Priya Sharma",
      meta: "29 Y · Female",
      avatar: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=96&h=96&q=80",
      complaint: "Follow-up Visit",
      visit: "Completed",
      arrived: "6:20 PM",
      arrivalMeta: "18 min visit",
      wait: "0 min",
      priority: "Low",
      status: "Completed",
      tab: "completed"
    },
    {
      token: "A-011",
      name: "Aman Verma",
      meta: "34 Y · Male",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=96&h=96&q=80",
      complaint: "General Checkup",
      visit: "No-show",
      arrived: "—",
      arrivalMeta: "Skipped",
      wait: "—",
      priority: "Low",
      status: "Not Arrived",
      tab: "skipped"
    }
  ];

  const state = {
    tab: "live",
    filter: "all",
    search: "",
    paused: false,
    reordered: false
  };

  const tableBody = document.getElementById("queueTableBody");
  const queueEmpty = document.getElementById("queueEmpty");
  const queueSearch = document.getElementById("queueSearch");
  const globalSearch = document.getElementById("globalSearch");
  const tabs = [...document.querySelectorAll(".queue-tab")];
  const filterChips = [...document.querySelectorAll(".filter-chip")];
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  let toastTimer = null;

  const iconForPriority = (priority) => {
    if (priority === "High") return "diamond-alert";
    if (priority === "Medium") return "circle-dot";
    return "thumbs-up";
  };

  const slug = (value) => value.toLowerCase().replace(/\s+/g, "-");

  const getVisiblePatients = () => {
    const search = state.search.trim().toLowerCase();
    return patients.filter((patient) => {
      const matchesTab = patient.tab === state.tab;
      const matchesFilter =
        state.filter === "all" ||
        patient.status.toLowerCase() === state.filter ||
        (state.filter === "follow-up" && patient.visit.toLowerCase() === "follow-up");
      const haystack = `${patient.token} ${patient.name} ${patient.complaint} ${patient.visit} ${patient.status}`.toLowerCase();
      return matchesTab && matchesFilter && (!search || haystack.includes(search));
    });
  };

  const patientRow = (patient) => {
    const statusSlug = slug(patient.status);
    const prioritySlug = slug(patient.priority);
    const waitClass = patient.wait === "—" ? "" : Number.parseInt(patient.wait, 10) >= 18 ? "danger" : Number.parseInt(patient.wait, 10) >= 13 ? "warning" : "";
    const rowClass = patient.status === "Urgent" ? "is-urgent" : patient.status === "Delayed" ? "is-delayed" : patient.status === "Not Arrived" ? "is-not-arrived" : "";
    const tokenClass = patient.status === "Urgent" ? "token-red" : patient.status === "Not Arrived" ? "token-gray" : "";

    return `
      <tr class="queue-row ${rowClass}" data-token="${patient.token}">
        <td><span class="token ${tokenClass}">${patient.token}</span></td>
        <td>
          <a class="patient-cell patient-link" href="doctor-prescription.html" aria-label="Open prescription for ${patient.name}">
            <img src="${patient.avatar}" alt="">
            <span class="patient-copy"><strong>${patient.name}</strong><small>${patient.meta}</small></span>
          </a>
        </td>
        <td><span class="visit-copy"><strong>${patient.complaint}</strong><small>${patient.visit}</small></span></td>
        <td><span class="time-copy"><strong>${patient.arrived}</strong><small>${patient.arrivalMeta}</small></span></td>
        <td><span class="wait-time ${waitClass}">${patient.wait}</span></td>
        <td><span class="priority-pill priority-${prioritySlug}"><i data-lucide="${iconForPriority(patient.priority)}"></i>${patient.priority}</span></td>
        <td><span class="status-pill status-${statusSlug}">${patient.status}</span></td>
        <td>
          <span class="row-actions">
            <button type="button" aria-label="Call ${patient.name}" data-row-message="Calling ${patient.name}"><i data-lucide="phone"></i></button>
            <button type="button" aria-label="Show ${patient.name}'s appointment" data-open-patient="${patient.token}"><i data-lucide="square-arrow-out-up-right"></i></button>
            <button type="button" aria-label="More actions for ${patient.name}" data-row-message="More actions opened for ${patient.name}"><i data-lucide="ellipsis-vertical"></i></button>
          </span>
        </td>
      </tr>`;
  };

  const render = () => {
    let visible = getVisiblePatients();

    if (state.reordered && state.tab === "live") {
      visible = [...visible].sort((a, b) => {
        const rank = { Urgent: 0, Delayed: 1, Ready: 2, "Not Arrived": 3 };
        return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
      });
    }

    tableBody.innerHTML = visible.map(patientRow).join("");
    queueEmpty.hidden = visible.length > 0;
    document.querySelector(".queue-table").hidden = visible.length === 0;
    window.lucide?.createIcons();
  };

  const showToast = (message) => {
    toastMessage.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
  };

  const setFilter = (filter = "all", clearSearch = false) => {
    state.filter = filter;
    if (clearSearch) {
      state.search = "";
      queueSearch.value = "";
    }
    filterChips.forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === filter));
    render();
  };

  const selectCurrentPatient = (patient) => {
    if (!patient) return;
    document.getElementById("activeConsultationBanner").dataset.token = patient.token;
    document.getElementById("activePatientTime").textContent = patient.arrived.replace(/^(\d):/, "0$1:");
    document.getElementById("activePatientName").textContent = patient.name;
    document.getElementById("activePatientMeta").textContent = `${patient.meta} · ID: ${patient.token}`;
    document.getElementById("activePatientAvatar").src = patient.avatar;
    document.getElementById("activePatientAvatar").alt = patient.name;
    document.getElementById("activeVisitType").textContent = patient.visit;
    document.getElementById("activePrescriptionLink").setAttribute("aria-label", `Open prescription for ${patient.name}`);

    window.lucide?.createIcons();
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.tab = tab.dataset.tab;
      state.filter = "all";
      state.search = "";
      queueSearch.value = "";
      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      filterChips.forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === "all"));
      render();
    });
  });

  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => setFilter(chip.dataset.filter));
  });

  queueSearch.addEventListener("input", () => {
    state.search = queueSearch.value;
    render();
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    setFilter("all", true);
    showToast("Queue filters cleared");
  });

  document.getElementById("clearEmptyState").addEventListener("click", () => setFilter("all", true));

  tableBody.addEventListener("click", (event) => {
    const patientButton = event.target.closest("[data-open-patient]");
    if (patientButton) {
      const patient = patients.find((item) => item.token === patientButton.dataset.openPatient);
      selectCurrentPatient(patient);
      showToast(`${patient.name} selected as the current patient`);
      return;
    }
    const button = event.target.closest("[data-row-message]");
    if (button) showToast(button.dataset.rowMessage);
  });

  document.getElementById("applySuggestion").addEventListener("click", () => {
    state.tab = "live";
    state.filter = "all";
    state.search = "";
    state.reordered = true;
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === "live";
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    filterChips.forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === "all"));
    queueSearch.value = "";
    render();
    window.setTimeout(() => document.querySelector('[data-token="A-018"]')?.classList.add("ai-promoted"), 0);
    showToast("AI suggestion applied: A-018 moved to the top");
  });

  document.getElementById("suggestedPatient").addEventListener("click", () => {
    state.tab = "live";
    state.filter = "urgent";
    state.search = "";
    queueSearch.value = "";
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === "live";
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    filterChips.forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === "urgent"));
    render();
  });

  document.getElementById("reviewQueue").addEventListener("click", () => {
    state.tab = "live";
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === "live";
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    setFilter("urgent", true);
    showToast("Showing patients who need urgent review");
  });

  document.getElementById("pauseQueue").addEventListener("click", () => {
    state.paused = !state.paused;
    const statePill = document.getElementById("queueState");
    const button = document.getElementById("pauseQueue");
    statePill.classList.toggle("paused", state.paused);
    statePill.innerHTML = `<i></i> ${state.paused ? "Queue Paused" : "Queue Running"}`;
    button.innerHTML = `<i data-lucide="${state.paused ? "play" : "pause"}"></i><span>${state.paused ? "Resume Queue" : "Pause Queue"}</span>`;
    window.lucide?.createIcons();
    showToast(state.paused ? "Clinic queue paused" : "Clinic queue resumed");
  });

  document.getElementById("returnToQueue").addEventListener("click", () => {
    const recent = patients.find((patient) => patient.token === "A-014");
    recent.tab = "live";
    recent.status = "Ready";
    recent.visit = "Follow-up";
    recent.wait = "0 min";
    recent.arrived = "Now";
    recent.arrivalMeta = "Returned";
    document.getElementById("recentPatient").remove();
    state.tab = "live";
    state.filter = "all";
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === "live";
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    filterChips.forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === "all"));
    render();
    document.getElementById("liveCount").textContent = String(patients.filter((patient) => patient.tab === "live").length);
    document.getElementById("sidebarQueueCount").textContent = "15";
    showToast("Priya Sharma returned to the live queue");
  });

  document.querySelectorAll("[data-message]").forEach((button) => {
    button.addEventListener("click", () => showToast(button.dataset.message));
  });

  document.getElementById("closeToast").addEventListener("click", () => toast.classList.remove("show"));

  const profile = document.getElementById("doctorProfile");
  const profileButton = document.getElementById("doctorProfileButton");
  profileButton.addEventListener("click", () => {
    const open = profile.classList.toggle("open");
    profileButton.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (event) => {
    if (!profile.contains(event.target)) {
      profile.classList.remove("open");
      profileButton.setAttribute("aria-expanded", "false");
    }
  });

  const sidebarToggle = document.getElementById("sidebarToggle");
  const mobileOverlay = document.getElementById("mobileOverlay");
  const setMobileSidebar = (open) => {
    document.body.classList.toggle("sidebar-open", open);
    sidebarToggle.setAttribute("aria-expanded", String(open));
  };

  sidebarToggle.addEventListener("click", () => {
    if (window.innerWidth <= 900) {
      setMobileSidebar(!document.body.classList.contains("sidebar-open"));
    } else {
      document.body.classList.toggle("sidebar-collapsed");
      sidebarToggle.setAttribute("aria-expanded", String(!document.body.classList.contains("sidebar-collapsed")));
    }
  });

  mobileOverlay.addEventListener("click", () => setMobileSidebar(false));

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      globalSearch.focus();
    }
    if (event.key === "Escape") {
      globalSearch.blur();
      queueSearch.blur();
      profile.classList.remove("open");
      setMobileSidebar(false);
    }
  });

  globalSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && globalSearch.value.trim()) {
      queueSearch.value = globalSearch.value;
      state.search = globalSearch.value;
      state.tab = "live";
      render();
      queueSearch.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  let refreshSeconds = 30;
  window.setInterval(() => {
    refreshSeconds -= 1;
    if (refreshSeconds <= 0) {
      refreshSeconds = 30;
      render();
    }
    document.getElementById("refreshCountdown").textContent = String(refreshSeconds);
  }, 1000);

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) setMobileSidebar(false);
  });

  render();
  selectCurrentPatient(patients.find((patient) => patient.token === "A-016"));
  window.lucide?.createIcons();
})();
