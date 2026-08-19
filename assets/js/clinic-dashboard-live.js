/* Used by: clinic-dashboard.html */

(() => {
  "use strict";

  const DATA_URL = "assets/data/clinic-dashboard.json";
  const fallbackData = {
    generatedAt: new Date().toISOString(),
    refreshIntervalMs: 6000,
    kpis: [
      { key: "patients", label: "Total Patients", value: 2356, format: "integer", trend: 18 },
      { key: "appointments", label: "Appointments", value: 256, format: "integer", trend: 12 },
      { key: "consultations", label: "Consultations", value: 186, format: "integer", trend: 15 },
      { key: "prescriptions", label: "AI Prescriptions", value: 173, format: "integer", trend: 22 },
      { key: "revenue", label: "Revenue (This Week)", value: 248000, format: "compactCurrency", trend: 19 },
      { key: "timeSaved", label: "Time Saved (AI)", value: 755, format: "duration", trend: 28 }
    ],
    clinics: [
      { name: "City Health Clinic", branch: "Main", patients: 128, consultations: 110, revenue: 145000, growth: 21, color: "teal" },
      { name: "Wellness Care Center", branch: "", patients: 64, consultations: 58, revenue: 72500, growth: 16, color: "purple" },
      { name: "HealthyLife Clinic", branch: "", patients: 38, consultations: 33, revenue: 41200, growth: 11, color: "orange" },
      { name: "Sunshine Clinic", branch: "", patients: 26, consultations: 22, revenue: 28600, growth: 3, color: "pink" }
    ],
    consultationTrend: {
      labels: ["Mon", "", "Tue", "", "Wed", "", "Thu", "", "Fri", "", "Sat", "", "Sun"],
      values: [18, 34, 23, 41, 63, 52, 41, 51, 61, 54, 48, 59, 69],
      max: 100
    },
    revenue: {
      total: 842300,
      trend: 23,
      series: [48, 63, 74, 55, 79, 62, 67, 41, 54, 71, 50, 66, 58, 76, 45, 65, 72, 56, 61, 82]
    },
    demographics: {
      total: 2356,
      ageGroups: [
        { label: "0 - 18 Yrs", percent: 18, color: "#247bd4" },
        { label: "19 - 40 Yrs", percent: 42, color: "#079b91" },
        { label: "41 - 60 Yrs", percent: 28, color: "#399ac1" },
        { label: "60+ Yrs", percent: 12, color: "#8b68d6" }
      ],
      male: 57,
      female: 43
    },
    glance: { appointments: 12, prescriptions: 9, reports: 6, followups: 11, tasks: 7 }
  };

  const state = {
    data: structuredClone(fallbackData),
    previousTrend: [...fallbackData.consultationTrend.values],
    chartView: "day",
    chartViews: {},
    chartPoints: [],
    animationFrame: 0,
    demographicFrame: 0,
    timer: 0
  };

  const integerFormatter = new Intl.NumberFormat("en-IN");
  const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const formatValue = (value, format = "integer") => {
    if (format === "compactCurrency") {
      if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
      if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
      return currencyFormatter.format(value);
    }
    if (format === "duration") {
      const hours = Math.floor(value / 60);
      const minutes = Math.round(value % 60);
      return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    }
    if (format === "fullCurrency") return currencyFormatter.format(Math.round(value));
    return integerFormatter.format(Math.round(value));
  };

  const animateNumber = (element, nextValue, format) => {
    if (!element) return;
    const isInitialCount = element.dataset.liveValue == null;
    const previous = Number(element.dataset.liveValue ?? 0);
    element.dataset.liveValue = String(nextValue);
    const start = performance.now();
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : isInitialCount ? 1100 : 620;

    const frame = (now) => {
      const progress = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatValue(previous + ((nextValue - previous) * eased), format);
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const renderKpis = () => {
    const cards = [...document.querySelectorAll(".kpi-card")];
    state.data.kpis.forEach((metric, index) => {
      const card = cards[index];
      if (!card) return;
      card.dataset.metricKey = metric.key;
      card.querySelector(".kpi-copy small").textContent = metric.label;
      animateNumber(card.querySelector(".kpi-copy strong"), metric.value, metric.format);
      const trend = card.querySelector(".kpi-copy span");
      trend.innerHTML = `<b>${metric.trend >= 0 ? "↑" : "↓"} ${Math.abs(metric.trend)}%</b> vs last week`;
      trend.classList.toggle("negative", metric.trend < 0);
      card.classList.remove("live-updated");
      void card.offsetWidth;
      card.classList.add("live-updated");
    });
  };

  const renderClinics = () => {
    const tbody = document.querySelector(".clinic-table tbody");
    if (!tbody) return;
    tbody.innerHTML = state.data.clinics.map((clinic) => {
      const colorClass = clinic.color === "teal" ? "" : ` ${clinic.color}`;
      const growthClass = clinic.growth >= 0 ? "growth-up" : "growth-down";
      return `
        <tr>
          <td><span class="clinic-name"><span class="clinic-badge${colorClass}"><i data-lucide="${clinic.color === "purple" || clinic.color === "pink" ? "hospital" : "building-2"}"></i></span>${clinic.name}${clinic.branch ? ` <span class="main-pill">${clinic.branch}</span>` : ""}</span></td>
          <td>${integerFormatter.format(clinic.patients)}</td>
          <td>${integerFormatter.format(clinic.consultations)}</td>
          <td>${formatValue(clinic.revenue, "compactCurrency")}</td>
          <td><span class="${growthClass}">${clinic.growth >= 0 ? "↑" : "↓"} ${Math.abs(clinic.growth)}%</span></td>
        </tr>`;
    }).join("");
    window.lucide?.createIcons();
  };

  const drawConsultationChart = (progress = 1) => {
    const canvas = document.getElementById("consultationChart");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(220, rect.width);
    const height = Math.max(150, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);

    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const chart = state.data.consultationTrend;
    const previous = state.previousTrend;
    const values = chart.values.map((value, index) => {
      const from = previous[index] ?? value;
      return from + ((value - from) * progress);
    });
    const pad = { left: 29, right: 11, top: 12, bottom: 25 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const max = chart.max || Math.ceil(Math.max(...values) / 20) * 20;

    context.font = "9px Inter, sans-serif";
    context.fillStyle = "#52627f";
    context.strokeStyle = "#e3ecef";
    context.lineWidth = 1;
    for (let index = 0; index <= 5; index += 1) {
      const y = pad.top + (plotHeight * index / 5);
      context.beginPath();
      context.moveTo(pad.left, y);
      context.lineTo(width - pad.right, y);
      context.stroke();
      context.fillText(String(max - (index * max / 5)), 0, y + 3);
    }

    const points = values.map((value, index) => ({
      x: pad.left + (plotWidth * index / Math.max(1, values.length - 1)),
      y: pad.top + plotHeight - (value / max * plotHeight),
      value
    }));
    state.chartPoints = points;

    const gradient = context.createLinearGradient(0, pad.top, 0, height - pad.bottom);
    gradient.addColorStop(0, "rgba(0, 143, 135, .28)");
    gradient.addColorStop(1, "rgba(0, 143, 135, .02)");
    context.beginPath();
    context.moveTo(points[0].x, height - pad.bottom);
    points.forEach((point) => context.lineTo(point.x, point.y));
    context.lineTo(points.at(-1).x, height - pad.bottom);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();

    context.beginPath();
    points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.strokeStyle = "#008f87";
    context.lineWidth = 2;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();

    points.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      context.fillStyle = "#008f87";
      context.fill();
      context.strokeStyle = "#fff";
      context.lineWidth = 1.5;
      context.stroke();
    });

    context.fillStyle = "#334766";
    chart.labels.forEach((label, index) => {
      if (!label) return;
      const x = pad.left + (plotWidth * index / Math.max(1, chart.labels.length - 1));
      context.fillText(label, x - 8, height - 7);
    });
  };

  const animateChart = () => {
    cancelAnimationFrame(state.animationFrame);
    const started = performance.now();
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 760;
    const frame = (now) => {
      const linear = duration ? Math.min(1, (now - started) / duration) : 1;
      const eased = 1 - Math.pow(1 - linear, 3);
      drawConsultationChart(eased);
      if (linear < 1) state.animationFrame = requestAnimationFrame(frame);
      else state.previousTrend = [...state.data.consultationTrend.values];
    };
    state.animationFrame = requestAnimationFrame(frame);
  };

  const renderRevenue = () => {
    animateNumber(document.querySelector(".revenue-total"), state.data.revenue.total, "fullCurrency");
    const change = document.querySelector(".revenue-change");
    if (change) change.textContent = `↑ ${state.data.revenue.trend}% vs last month`;
    const chart = document.querySelector(".bar-chart");
    if (!chart) return;
    chart.innerHTML = state.data.revenue.series.map((value) => `<span style="height:0" data-height="${clamp(value, 5, 100)}"></span>`).join("");
    requestAnimationFrame(() => {
      chart.querySelectorAll("span").forEach((bar, index) => {
        window.setTimeout(() => { bar.style.height = `${bar.dataset.height}%`; }, index * 24);
      });
    });
  };

  const animateDemographicDonut = (donut, ageGroups) => {
    if (!donut) return;
    cancelAnimationFrame(state.demographicFrame);
    const started = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = donut.dataset.animated ? .9 : 0;
    const duration = reducedMotion ? 0 : 850;
    donut.dataset.animated = "true";

    const paint = (progress) => {
      const segments = [];
      let cursor = 0;
      ageGroups.forEach((group) => {
        const start = cursor * progress;
        cursor += group.percent;
        const end = cursor * progress;
        segments.push(`${group.color} ${start}% ${end}%`);
      });
      segments.push(`#edf3f4 ${cursor * progress}% 100%`);
      donut.style.background = `conic-gradient(${segments.join(",")})`;
    };

    const frame = (now) => {
      const linear = duration ? Math.min(1, (now - started) / duration) : 1;
      const eased = 1 - Math.pow(1 - linear, 3);
      paint(from + ((1 - from) * eased));
      if (linear < 1) state.demographicFrame = requestAnimationFrame(frame);
    };
    state.demographicFrame = requestAnimationFrame(frame);
    if (!reducedMotion) {
      donut.animate([
        { transform: "scale(.92) rotate(-10deg)", opacity: .72 },
        { transform: "scale(1) rotate(0)", opacity: 1 }
      ], { duration: 720, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
  };

  const renderDemographics = () => {
    const demographic = state.data.demographics;
    const donut = document.querySelector(".donut");
    animateDemographicDonut(donut, demographic.ageGroups);
    animateNumber(document.querySelector(".donut-center strong"), demographic.total, "integer");
    document.querySelectorAll(".legend-item").forEach((item, index) => {
      const group = demographic.ageGroups[index];
      if (!group) return;
      item.querySelector(".legend-dot").style.background = group.color;
      item.querySelector("span").textContent = group.label;
      item.querySelector("strong").textContent = `${group.percent}%`;
    });
    const genderValues = [demographic.male, demographic.female];
    document.querySelectorAll(".gender-stat span").forEach((element, index) => {
      const label = index === 0 ? "Male" : "Female";
      element.innerHTML = `${genderValues[index]}%<small>${label}</small>`;
    });
  };

  const renderGlance = () => {
    const keys = ["appointments", "prescriptions", "reports", "followups", "tasks"];
    document.querySelectorAll(".glance-number").forEach((element, index) => {
      animateNumber(element, state.data.glance[keys[index]], "integer");
    });
    const aiCenterCopy = document.querySelector(".ai-center p");
    if (aiCenterCopy) aiCenterCopy.textContent = `AI has drafted ${state.data.glance.prescriptions} prescriptions ready for your review and approval.`;
  };

  const updateLiveStatus = () => {
    const clock = document.getElementById("dashboardClock");
    const now = new Date();
    if (clock) {
      clock.textContent = now.toLocaleString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    const lastUpdated = document.getElementById("lastUpdated");
    if (lastUpdated) {
      lastUpdated.dateTime = now.toISOString();
      lastUpdated.textContent = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
  };

  const renderDashboard = ({ animate = true } = {}) => {
    renderKpis();
    renderClinics();
    renderRevenue();
    renderDemographics();
    renderGlance();
    updateLiveStatus();
    if (animate) animateChart();
    else drawConsultationChart(1);
  };

  const setupChartViews = () => {
    const weekLabels = ["Mon", "", "Tue", "", "Wed", "", "Thu", "", "Fri", "", "Sat", "", "Sun"];
    const dayLabels = ["8am", "", "10am", "", "12pm", "", "2pm", "", "4pm", "", "6pm", "", "8pm"];
    const weekValues = [...state.data.consultationTrend.values];
    const dayValues = weekValues.map((value, index) => clamp(Math.round((value * .72) + (index * 1.3)), 8, 96));
    state.chartViews = {
      day: { labels: dayLabels, values: dayValues },
      week: { labels: weekLabels, values: weekValues }
    };
    state.chartView = "day";
    state.data.consultationTrend.labels = [...dayLabels];
    state.data.consultationTrend.values = [...dayValues];
    state.previousTrend = dayValues.map(() => 0);
  };

  const applyLiveTick = () => {
    state.previousTrend = [...state.data.consultationTrend.values];
    const metrics = Object.fromEntries(state.data.kpis.map((metric) => [metric.key, metric]));
    metrics.patients.value += randomInt(1, 3);
    metrics.appointments.value += randomInt(1, 2);
    metrics.consultations.value += randomInt(1, 2);
    metrics.prescriptions.value += 1;
    metrics.revenue.value += randomInt(350, 2200);
    metrics.timeSaved.value += randomInt(1, 3);
    state.data.demographics.total = metrics.patients.value;

    const trend = state.data.consultationTrend.values;
    const nextPoint = clamp((trend.at(-1) || 50) + randomInt(1, 5), 20, 100);
    trend.shift();
    trend.push(nextPoint);
    state.chartViews[state.chartView] = {
      labels: [...state.data.consultationTrend.labels],
      values: [...trend]
    };

    const revenueSeries = state.data.revenue.series;
    revenueSeries.shift();
    revenueSeries.push(clamp((revenueSeries.at(-1) || 60) + randomInt(-12, 14), 24, 96));
    state.data.revenue.total += randomInt(900, 4200);

    state.data.clinics.forEach((clinic) => {
      clinic.patients += randomInt(1, 2);
      clinic.consultations += 1;
      clinic.revenue += randomInt(200, 1500);
      clinic.growth = Math.max(0, clinic.growth) + 1;
    });

    state.data.glance.appointments += 1;
    state.data.glance.prescriptions += 1;
    state.data.glance.reports += 1;
    state.data.glance.followups += 1;
    state.data.glance.tasks += 1;
    state.data.generatedAt = new Date().toISOString();
    renderDashboard({ animate: true });
  };

  const loadDashboardData = async () => {
    if (location.protocol === "file:") return clone(fallbackData);
    const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Dashboard data request failed: ${response.status}`);
    return response.json();
  };

  const keepValuesIncreasing = (incoming) => {
    const current = state.data;
    incoming.kpis.forEach((metric) => {
      const previous = current.kpis.find((item) => item.key === metric.key);
      if (previous) {
        metric.value = Math.max(metric.value, previous.value);
        metric.trend = Math.max(0, metric.trend, previous.trend);
      }
    });
    incoming.clinics.forEach((clinic) => {
      const previous = current.clinics.find((item) => item.name === clinic.name);
      if (!previous) return;
      clinic.patients = Math.max(clinic.patients, previous.patients);
      clinic.consultations = Math.max(clinic.consultations, previous.consultations);
      clinic.revenue = Math.max(clinic.revenue, previous.revenue);
      clinic.growth = Math.max(0, clinic.growth, previous.growth);
    });
    incoming.consultationTrend.values = incoming.consultationTrend.values.map((value, index) => (
      Math.max(value, current.consultationTrend.values[index] || 0)
    ));
    incoming.revenue.total = Math.max(incoming.revenue.total, current.revenue.total);
    incoming.revenue.trend = Math.max(0, incoming.revenue.trend, current.revenue.trend);
    incoming.revenue.series = incoming.revenue.series.map((value, index) => (
      Math.max(value, current.revenue.series[index] || 0)
    ));
    Object.keys(incoming.glance).forEach((key) => {
      incoming.glance[key] = Math.max(incoming.glance[key], current.glance[key] || 0);
    });
    return incoming;
  };

  const startLiveUpdates = () => {
    clearInterval(state.timer);
    const interval = Math.max(3000, Number(state.data.refreshIntervalMs) || 6000);
    state.timer = window.setInterval(applyLiveTick, interval);
  };

  const bindChartTooltip = () => {
    const canvas = document.getElementById("consultationChart");
    const tooltip = document.querySelector(".chart-tooltip");
    if (!canvas || !tooltip) return;
    canvas.addEventListener("pointermove", (event) => {
      if (!state.chartPoints.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const index = state.chartPoints.reduce((nearest, point, pointIndex) => (
        Math.abs(point.x - x) < Math.abs(state.chartPoints[nearest].x - x) ? pointIndex : nearest
      ), 0);
      const point = state.chartPoints[index];
      const label = state.data.consultationTrend.labels[index] || "Live";
      tooltip.innerHTML = `${label}<strong>${Math.round(point.value)} Consultations</strong>`;
      tooltip.style.left = `${clamp(point.x + 10, 8, rect.width - 112)}px`;
      tooltip.style.top = `${clamp(point.y - 58, 6, rect.height - 54)}px`;
      tooltip.classList.add("visible");
    });
    canvas.addEventListener("pointerleave", () => tooltip.classList.remove("visible"));
  };

  const bindControls = () => {
    const sidebarCollapseButton = document.getElementById("sidebarCollapseButton");
    const topbarSidebarButton = document.getElementById("sidebarToggle");
    const syncSidebarControls = () => {
      const expanded = !document.body.classList.contains("sidebar-collapsed");
      sidebarCollapseButton?.setAttribute("aria-expanded", String(expanded));
      topbarSidebarButton?.setAttribute("aria-expanded", String(expanded));
    };

    sidebarCollapseButton?.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-collapsed");
      syncSidebarControls();
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 680);
    });
    topbarSidebarButton?.addEventListener("click", () => {
      window.setTimeout(syncSidebarControls, 0);
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 680);
    });

    const refreshButton = document.getElementById("refreshDashboard");
    refreshButton?.addEventListener("click", async () => {
      refreshButton.disabled = true;
      refreshButton.querySelector("svg")?.classList.add("spin");
      try {
        const freshData = await loadDashboardData();
        state.previousTrend = [...state.data.consultationTrend.values];
        state.data = keepValuesIncreasing(freshData);
        setupChartViews();
        applyLiveTick();
        window.CliniFlowDashboardUI?.showToast("Live dashboard data refreshed.");
      } catch {
        applyLiveTick();
        window.CliniFlowDashboardUI?.showToast("Using the latest locally cached dashboard data.");
      } finally {
        refreshButton.disabled = false;
        refreshButton.querySelector("svg")?.classList.remove("spin");
      }
    });

    document.querySelectorAll(".welcome-controls .compact-select").forEach((select) => {
      select.addEventListener("change", () => {
        state.previousTrend = [...state.data.consultationTrend.values];
        const multiplier = select.value.includes("Month") ? 1.22 : select.value.includes("Quarter") ? 1.45 : .94;
        state.data.consultationTrend.values = state.data.consultationTrend.values.map((value) => clamp(Math.round(value * multiplier), 10, 98));
        animateChart();
      });
    });

    const viewButtons = [...document.querySelectorAll("[data-chart-view]")];
    viewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextView = button.dataset.chartView;
        if (!state.chartViews[nextView] || nextView === state.chartView) return;
        state.chartViews[state.chartView] = {
          labels: [...state.data.consultationTrend.labels],
          values: [...state.data.consultationTrend.values]
        };
        state.previousTrend = [...state.data.consultationTrend.values];
        state.chartView = nextView;
        state.data.consultationTrend.labels = [...state.chartViews[nextView].labels];
        state.data.consultationTrend.values = [...state.chartViews[nextView].values];
        viewButtons.forEach((control) => {
          const active = control === button;
          control.classList.toggle("active", active);
          control.setAttribute("aria-pressed", String(active));
        });
        animateChart();
      });
    });
  };

  const init = async () => {
    try {
      state.data = await loadDashboardData();
      setupChartViews();
    } catch {
      state.data = clone(fallbackData);
      setupChartViews();
    }
    renderDashboard({ animate: true });
    bindChartTooltip();
    bindControls();
    startLiveUpdates();

    const resizeObserver = new ResizeObserver(() => drawConsultationChart(1));
    const chart = document.getElementById("consultationChart");
    if (chart?.parentElement) resizeObserver.observe(chart.parentElement);
    window.addEventListener("beforeunload", () => clearInterval(state.timer), { once: true });
  };

  init();
})();
