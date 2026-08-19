/* Used by: clinic-tour.html, clinic-setup-tour.html, SmartConfigurationForClinics.html */

(() => {
  const page = document.body;
  const currentStep = Number(page.dataset.setupStep || 1);
  const requestedPlan = (new URLSearchParams(window.location.search).get("plan") || "clinic").toLowerCase();
  const planKey = requestedPlan === "organization" ? "organization" : "clinic";
  const planLabel = planKey === "organization" ? "Organization Plan" : "Clinic Plan";
  const clinicName = planKey === "organization" ? "CliniFlow Health Network" : "City Health Clinic";
  const header = document.querySelector("body > header");
  const sidebar = document.querySelector(".tour-shell > .tour-sidebar, .page-shell > .tour-sidebar:not(.legacy-clinic-tour-sidebar)");

  const icon = (paths, className = "") => `
    <svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>
  `;

  const arrowIcon = icon('<path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>');
  const nextControl = currentStep === 1
    ? `<button class="button button-primary" id="nextStep" type="button">Next ${arrowIcon}</button>`
    : currentStep === 2
      ? `<a class="button button-primary" id="nextStepLink" href="SmartConfigurationForClinics.html?plan=${encodeURIComponent(planKey)}">Next ${arrowIcon}</a>`
      : `<button class="button button-primary" id="headerNext" type="button">Next ${arrowIcon}</button>`;

  header.className = "topbar";
  header.innerHTML = `
    <div class="brand-panel">
      <a class="brand" href="home2.html" aria-label="Divinexa home">
        <span class="brand-mark"><img class="divinexa-brand-mark" src="assets/images/divinexa-mark-web.png" alt=""></span>
        <span class="brand-copy"><strong class="divinexa-brand-name"><img class="divinexa-brand-wordmark" src="assets/images/divinexa-wordmark-web.png" alt="Divinexa"></strong><small>Prescription Platform</small></span>
      </a>
    </div>
    <div class="topbar-main">
      <div class="progress-block">
        <strong id="progressTitle">Tour Progress</strong>
        <div class="progress-track"><div class="progress-fill" id="progressFill" style="width:${currentStep * 25}%"></div></div>
        <span class="progress-label" id="progressLabel">Step ${currentStep} of 4</span>
      </div>
      <div class="top-actions">
        <a class="button button-outline" href="clinic-dashboard.html">Skip Tour</a>
        ${nextControl}
      </div>
      <div class="profile-wrap">
        <button class="profile-button" id="profileButton" type="button" aria-expanded="false" aria-haspopup="menu">
          <span class="avatar">${icon('<circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path>')}</span>
          <span class="profile-copy"><strong id="headerClinicName">${clinicName}</strong><small>${planLabel}</small></span>
          ${icon('<path d="m8 10 4 4 4-4"></path>', "profile-chevron")}
        </button>
        <div class="profile-menu" id="profileMenu" role="menu" hidden>
          <a href="clinic-dashboard.html" role="menuitem">${icon('<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>')}Dashboard</a>
          <a href="profile.html" role="menuitem">${icon('<circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path>')}My Profile</a>
          <a href="login.html" role="menuitem">${icon('<path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path><path d="M15 3h5v18h-5"></path>')}Sign Out</a>
        </div>
      </div>
    </div>
  `;

  const steps = [
    ["Welcome", "Introduction to CliniFlow"],
    ["Clinic Setup", "Add and manage your clinics"],
    ["Add Doctors", "Add doctors or upload Excel"],
    ["Finish & Dashboard", "You're all set!"]
  ];

  if (sidebar && page.dataset.sharedSidebar !== "false") {
    sidebar.innerHTML = `
      <div class="side-card">
        <strong class="side-card-title">Tour Steps</strong>
        <nav class="steps-list" aria-label="Setup tour steps">
          ${steps.map(([title, description], index) => {
            const step = index + 1;
            const stateClass = step === currentStep ? " active" : step < currentStep ? " completed" : "";
            const current = step === currentStep ? ' aria-current="step"' : "";
            return `
              <button class="tour-step${stateClass}" type="button" data-tour-step="${step}" data-clinic-tour-step="${step}"${current}>
                <span class="step-number">${step}</span>
                <span><strong>${title}</strong><small>${description}</small></span>
              </button>
            `;
          }).join("")}
        </nav>
        <div class="clinic-tour-support">
          <img src="assets/images/clinic-network-support.png" alt="">
          <strong>Manage every clinic<br>from one place</strong>
          <p>Connect your locations and keep your practice organized.</p>
        </div>
      </div>
      <div class="side-card help-card">
        <h3>Need Help?</h3>
        <p>Our support team is here for you.</p>
        <button class="button button-outline button-small" type="button" data-demo-action>Chat with Support</button>
      </div>
    `;
  }

  const profileButton = document.getElementById("profileButton");
  const profileMenu = document.getElementById("profileMenu");
  profileButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = profileMenu.hidden;
    profileMenu.hidden = !open;
    profileButton.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".profile-wrap")) return;
    profileMenu.hidden = true;
    profileButton.setAttribute("aria-expanded", "false");
  });
})();
