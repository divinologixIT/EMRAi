/* Used by: doctor-dashboard.html */

(() => {
  "use strict";

  const collapseButton = document.getElementById("doctorSidebarCollapse");
  const topbarButton = document.getElementById("sidebarToggle");

  const syncControls = () => {
    const expanded = !document.body.classList.contains("sidebar-collapsed");
    collapseButton?.setAttribute("aria-expanded", String(expanded));
    topbarButton?.setAttribute("aria-expanded", String(expanded));
  };

  collapseButton?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
    syncControls();
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 680);
  });

  topbarButton?.addEventListener("click", () => {
    window.setTimeout(syncControls, 0);
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 680);
  });
})();
