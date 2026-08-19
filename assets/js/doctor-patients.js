(() => {
  "use strict";

  window.lucide?.createIcons();

  const body = document.body;
  const sidebarToggle = document.getElementById("sidebarToggle");
  const mobileOverlay = document.getElementById("mobileOverlay");
  const profile = document.getElementById("doctorProfile");
  const profileButton = document.getElementById("doctorProfileButton");
  const globalSearch = document.getElementById("globalSearch");
  const patientSearch = document.getElementById("patientSearch");
  const visitFilter = document.getElementById("visitFilter");
  const ageFilter = document.getElementById("ageFilter");
  const genderFilter = document.getElementById("genderFilter");
  const patientRows = [...document.querySelectorAll("#patientTableBody tr")];
  const patientTabs = [...document.querySelectorAll(".patient-tabs [data-status]")];
  const emptyPatients = document.getElementById("emptyPatients");
  const patientCount = document.getElementById("patientCount");
  const toast = document.getElementById("patientsToast");
  const toastMessage = document.getElementById("patientsToastMessage");
  const modal = document.getElementById("patientModal");
  const newPatientButton = document.getElementById("newPatientButton");
  const closePatientModal = document.getElementById("closePatientModal");
  const cancelPatientModal = document.getElementById("cancelPatientModal");
  const newPatientForm = document.getElementById("newPatientForm");
  const moreFiltersButton = document.getElementById("moreFiltersButton");
  const moreFiltersMenu = document.getElementById("moreFiltersMenu");
  const closeMoreFilters = document.getElementById("closeMoreFilters");
  const resetMoreFilters = document.getElementById("resetMoreFilters");
  const applyMoreFilters = document.getElementById("applyMoreFilters");
  let activeStatus = "all";
  let activeRisks = new Set(["Low", "Medium", "High"]);
  let activeMoreStatuses = new Set(["Waiting", "In Consultation", "Completed"]);
  let activeLastVisit = "all";
  let toastTimer;

  const renderMetricSparklines = () => {
    const dataElement = document.getElementById("patientMetricChartData");
    if (!dataElement) return;

    let chartData = {};
    try {
      chartData = JSON.parse(dataElement.textContent);
    } catch {
      return;
    }

    document.querySelectorAll("svg[data-sparkline]").forEach((chart) => {
      const values = chartData[chart.dataset.sparkline];
      if (!Array.isArray(values) || values.length < 2) return;

      const width = 64;
      const height = 24;
      const inset = 2;
      const baseline = height - inset;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = Math.max(1, max - min);
      const points = values.map((value, index) => {
        const x = inset + (index * (width - inset * 2)) / (values.length - 1);
        const y = baseline - ((value - min) / range) * (height - inset * 3);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");

      chart.innerHTML = `<polygon class="spark-area" points="${inset},${baseline} ${points} ${width - inset},${baseline}"></polygon><polyline class="spark-line" pathLength="1" points="${points}"></polyline>`;
    });
  };

  renderMetricSparklines();

  const animateMetricCounts = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll(".patient-metric strong").forEach((counter, index) => {
      const finalText = counter.textContent.trim();
      const target = Number(finalText.replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(target)) return;

      const formatter = new Intl.NumberFormat("en-IN");
      const formatValue = (value) => finalText.includes(",") ? formatter.format(value) : String(value);
      counter.setAttribute("aria-label", finalText);

      if (reduceMotion) {
        counter.textContent = finalText;
        return;
      }

      counter.textContent = "0";
      const delay = 80 + index * 85;
      const duration = 880;
      const startAt = performance.now() + delay;

      const updateCount = (now) => {
        if (now < startAt) {
          window.requestAnimationFrame(updateCount);
          return;
        }
        const progress = Math.min(1, (now - startAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = formatValue(Math.round(target * eased));
        if (progress < 1) window.requestAnimationFrame(updateCount);
      };

      window.requestAnimationFrame(updateCount);
    });
  };

  animateMetricCounts();

  const showToast = (message) => {
    if (!toast || !toastMessage) return;
    window.clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2300);
  };

  const setMobileSidebar = (open) => {
    body.classList.toggle("sidebar-open", open);
    sidebarToggle?.setAttribute("aria-expanded", String(open));
  };

  sidebarToggle?.addEventListener("click", () => {
    if (window.innerWidth <= 900) {
      setMobileSidebar(!body.classList.contains("sidebar-open"));
      return;
    }
    body.classList.toggle("sidebar-collapsed");
    sidebarToggle.setAttribute("aria-expanded", String(!body.classList.contains("sidebar-collapsed")));
  });

  mobileOverlay?.addEventListener("click", () => setMobileSidebar(false));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) setMobileSidebar(false);
  });

  profileButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = !profile?.classList.contains("open");
    profile?.classList.toggle("open", open);
    profileButton.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (event) => {
    if (profile && !profile.contains(event.target)) {
      profile.classList.remove("open");
      profileButton?.setAttribute("aria-expanded", "false");
    }
  });

  const applyFilters = () => {
    const query = patientSearch?.value.trim().toLowerCase() || "";
    const visit = visitFilter?.value || "all";
    const ageGroup = ageFilter?.value || "all";
    const gender = genderFilter?.value || "all";
    let visibleCount = 0;

    patientRows.forEach((row) => {
      const age = Number(row.dataset.age || 0);
      const lastVisitText = row.children[5]?.textContent.trim().toLowerCase() || "";
      const lastVisitBucket = lastVisitText === "–" || lastVisitText === "-"
        ? "none"
        : (lastVisitText.includes("yesterday") || lastVisitText.includes("week ago") ? "week"
          : (lastVisitText.includes("2 weeks") ? "month" : "older"));
      const matchesQuery = !query || (row.dataset.name || "").toLowerCase().includes(query);
      const matchesVisit = visit === "all" || row.dataset.visit === visit;
      const matchesGender = gender === "all" || row.dataset.gender === gender;
      const matchesRisk = activeRisks.has(row.dataset.risk || "");
      const matchesMoreStatus = activeMoreStatuses.has(row.dataset.status || "");
      const matchesLastVisit = activeLastVisit === "all"
        || activeLastVisit === lastVisitBucket
        || (activeLastVisit === "month" && lastVisitBucket === "week");
      const matchesAge = ageGroup === "all"
        || (ageGroup === "child" && age < 18)
        || (ageGroup === "adult" && age >= 18 && age < 60)
        || (ageGroup === "senior" && age >= 60);
      const matchesStatus = activeStatus === "all"
        || (activeStatus === "Follow-up" ? row.dataset.visit === "Follow-up" : row.dataset.status === activeStatus);
      const visible = matchesQuery && matchesVisit && matchesGender && matchesAge && matchesStatus && matchesRisk && matchesMoreStatus && matchesLastVisit;
      row.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    emptyPatients?.classList.toggle("show", visibleCount === 0);
    if (patientCount) {
      patientCount.textContent = visibleCount
        ? `Showing 1 to ${visibleCount} of ${activeStatus === "all" ? "245" : visibleCount} patients`
        : "No matching patients";
    }
  };

  [patientSearch, visitFilter, ageFilter, genderFilter].forEach((control) => {
    control?.addEventListener(control.tagName === "INPUT" ? "input" : "change", applyFilters);
  });

  const commonSelects = [];

  const closeCommonSelects = (except = null) => {
    commonSelects.forEach((control) => {
      if (control.root === except) return;
      control.root.classList.remove("open");
      control.trigger.setAttribute("aria-expanded", "false");
    });
  };

  const enhanceCommonSelect = (select) => {
    if (!select || select.dataset.commonEnhanced === "true") return;
    select.dataset.commonEnhanced = "true";
    select.classList.add("common-select-native");

    const root = document.createElement("div");
    root.className = "common-select";
    root.innerHTML = `<button class="common-select-trigger" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false"><span></span><i data-lucide="chevron-down"></i></button><div class="common-select-menu" role="listbox"></div>`;
    select.insertAdjacentElement("afterend", root);

    const trigger = root.querySelector(".common-select-trigger");
    const valueLabel = trigger.querySelector("span");
    const menu = root.querySelector(".common-select-menu");

    const refresh = () => {
      const selected = select.options[select.selectedIndex] || select.options[0];
      valueLabel.textContent = selected?.textContent || "";
      menu.replaceChildren();
      [...select.options].forEach((nativeOption) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = `common-select-option${nativeOption.selected ? " selected" : ""}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(nativeOption.selected));
        option.dataset.value = nativeOption.value;
        const label = document.createElement("span");
        label.textContent = nativeOption.textContent;
        const check = document.createElement("i");
        check.setAttribute("data-lucide", "check");
        option.append(label, check);
        menu.append(option);
      });
      window.lucide?.createIcons();
    };

    const setOpen = (open) => {
      closeCommonSelects(open ? root : null);
      root.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
      if (open) window.requestAnimationFrame(() => menu.querySelector(".selected")?.focus());
    };

    trigger.addEventListener("click", () => setOpen(!root.classList.contains("open")));
    trigger.addEventListener("keydown", (event) => {
      if (["ArrowDown", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    });

    menu.addEventListener("click", (event) => {
      const option = event.target.closest(".common-select-option");
      if (!option) return;
      select.value = option.dataset.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      refresh();
      setOpen(false);
      trigger.focus();
    });

    menu.addEventListener("keydown", (event) => {
      const options = [...menu.querySelectorAll(".common-select-option")];
      const current = options.indexOf(document.activeElement);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        options[(current + 1) % options.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        options[(current - 1 + options.length) % options.length]?.focus();
      } else if (event.key === "Escape") {
        setOpen(false);
        trigger.focus();
      }
    });

    commonSelects.push({ root, trigger });
    refresh();
  };

  [visitFilter, ageFilter, genderFilter].forEach(enhanceCommonSelect);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".common-select")) closeCommonSelects();
  });

  const setMoreFiltersOpen = (open) => {
    if (!moreFiltersMenu || !moreFiltersButton) return;
    moreFiltersMenu.hidden = !open;
    moreFiltersButton.setAttribute("aria-expanded", String(open));
  };

  moreFiltersButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeCommonSelects();
    setMoreFiltersOpen(moreFiltersMenu?.hidden ?? true);
  });

  closeMoreFilters?.addEventListener("click", () => setMoreFiltersOpen(false));

  applyMoreFilters?.addEventListener("click", () => {
    const checkedRisks = [...moreFiltersMenu.querySelectorAll('input[name="risk"]:checked')].map((input) => input.value);
    const checkedStatuses = [...moreFiltersMenu.querySelectorAll('input[name="moreStatus"]:checked')].map((input) => input.value);
    const selectedLastVisit = moreFiltersMenu.querySelector('input[name="lastVisit"]:checked');
    activeRisks = new Set(checkedRisks);
    activeMoreStatuses = new Set(checkedStatuses);
    activeLastVisit = selectedLastVisit?.value || "all";
    applyFilters();
    setMoreFiltersOpen(false);
    showToast("Additional patient filters applied.");
  });

  resetMoreFilters?.addEventListener("click", () => {
    moreFiltersMenu.querySelectorAll('input[type="checkbox"]').forEach((input) => { input.checked = true; });
    const allLastVisits = moreFiltersMenu.querySelector('input[name="lastVisit"][value="all"]');
    if (allLastVisits) allLastVisits.checked = true;
    activeRisks = new Set(["Low", "Medium", "High"]);
    activeMoreStatuses = new Set(["Waiting", "In Consultation", "Completed"]);
    activeLastVisit = "all";
    applyFilters();
    showToast("Additional filters reset.");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".more-filter-control")) setMoreFiltersOpen(false);
  });

  globalSearch?.addEventListener("input", () => {
    if (!patientSearch) return;
    patientSearch.value = globalSearch.value;
    applyFilters();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      globalSearch?.focus();
    }
    if (event.key === "Escape") {
      profile?.classList.remove("open");
      profileButton?.setAttribute("aria-expanded", "false");
      if (modal && !modal.hidden) closeModal();
    }
  });

  patientTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeStatus = tab.dataset.status || "all";
      patientTabs.forEach((item) => item.classList.toggle("active", item === tab));
      applyFilters();
    });
  });

  const openModal = () => {
    if (!modal) return;
    modal.hidden = false;
    body.style.overflow = "hidden";
    window.setTimeout(() => modal.querySelector("input")?.focus(), 0);
  };

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    body.style.overflow = "";
  }

  newPatientButton?.addEventListener("click", openModal);
  closePatientModal?.addEventListener("click", closeModal);
  cancelPatientModal?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  newPatientForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const patientName = new FormData(newPatientForm).get("name") || "Patient";
    closeModal();
    newPatientForm.reset();
    showToast(`${patientName} added to the patient list.`);
  });

  document.querySelectorAll("[data-message]").forEach((control) => {
    control.addEventListener("click", () => showToast(control.dataset.message));
  });

  document.querySelectorAll(".patient-pagination nav button:not(.active)").forEach((button) => {
    button.addEventListener("click", () => showToast("Loading patient page…"));
  });

  applyFilters();
})();
