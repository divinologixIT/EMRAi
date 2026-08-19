/* Shared mobile-only close behavior for the compact floating navigation. */
(() => {
  "use strict";

  const nav = document.getElementById("mainNav");
  const toggle = document.querySelector("#menuToggle, #menuButton, #mobileMenu");
  if (!nav || !toggle) return;

  const mobileQuery = window.matchMedia("(max-width: 767px)");
  const overlays = document.querySelectorAll("#mobileOverlay, #mobileNavOverlay, .mobile-overlay, .mobile-nav-overlay");

  const renderIcons = () => window.lucide?.createIcons();

  const closeMenu = () => {
    if (!nav.classList.contains("open")) return;
    nav.classList.remove("open");
    document.body.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
    toggle.innerHTML = '<i data-lucide="menu"></i>';
    overlays.forEach((overlay) => {
      overlay.classList.remove("show");
      overlay.setAttribute("aria-hidden", "true");
    });
    renderIcons();
  };

  document.addEventListener("pointerdown", (event) => {
    if (!mobileQuery.matches || !nav.classList.contains("open")) return;
    if (nav.contains(event.target) || toggle.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileQuery.matches) closeMenu();
  });

  const handleBreakpointChange = (event) => {
    if (!event.matches) closeMenu();
  };

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", handleBreakpointChange);
  } else {
    mobileQuery.addListener(handleBreakpointChange);
  }
})();
