(function () {
  "use strict";

  const chartCanvases = Array.from(document.querySelectorAll(".mini-chart"));
  const searchInput = document.getElementById("globalSearch");
  const queueTableBody = document.querySelector("#queueTable tbody");
  const callNextButton = document.getElementById("callNextPatient");

  function drawSparkline(canvas, progress) {
    const values = canvas.dataset.values.split(",").map(Number);
    const color = canvas.dataset.color || "#079389";
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(80, rect.width);
    const height = Math.max(30, rect.height);

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);

    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = 5;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    const points = values.map((value, index) => ({
      x: padding + (index / (values.length - 1)) * (width - padding * 2),
      y: height - padding - ((value - min) / range) * (height - padding * 2)
    }));

    context.save();
    context.beginPath();
    context.rect(0, 0, width * progress, height);
    context.clip();

    const fill = context.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0, color + "24");
    fill.addColorStop(1, color + "00");
    context.beginPath();
    context.moveTo(points[0].x, height - padding);
    points.forEach((point) => context.lineTo(point.x, point.y));
    context.lineTo(points[points.length - 1].x, height - padding);
    context.closePath();
    context.fillStyle = fill;
    context.fill();

    context.beginPath();
    points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.strokeStyle = color;
    context.lineWidth = 1.1;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();

    points.forEach((point) => {
      if (point.x > width * progress + 1) return;
      context.beginPath();
      context.arc(point.x, point.y, 2.6, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.lineWidth = 1.3;
      context.strokeStyle = "#ffffff";
      context.stroke();
    });
    context.restore();
  }

  function animateCharts() {
    const started = performance.now();
    const duration = 720;
    function frame(now) {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      chartCanvases.forEach((canvas) => drawSparkline(canvas, eased));
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function redrawCharts() {
    chartCanvases.forEach((canvas) => drawSparkline(canvas, 1));
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(redrawCharts, 90);
  });

  searchInput?.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    document.querySelectorAll("#queueTable tbody tr, .staff-row").forEach((row) => {
      row.classList.toggle("search-hidden", Boolean(query) && !row.textContent.toLowerCase().includes(query));
    });
  });

  callNextButton?.addEventListener("click", () => {
    const row = queueTableBody?.querySelector("tr");
    if (!row) {
      window.CliniFlow?.showToast("The reception queue is clear.");
      return;
    }
    const patient = row.querySelector(".person strong")?.textContent || "Patient";
    const token = row.children[2]?.textContent.trim() || "";
    row.animate([
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: "translateX(16px)" }
    ], { duration: 250, easing: "ease", fill: "forwards" }).finished.then(() => {
      row.remove();
      Array.from(queueTableBody.querySelectorAll("tr")).forEach((item, index) => {
        item.children[0].textContent = index + 1;
      });
    });
    window.CliniFlow?.showToast(`${patient} (${token}) has been called.`);
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(animateCharts);
  } else {
    animateCharts();
  }
})();
