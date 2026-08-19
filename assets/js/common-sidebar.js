/* Used by: appointments.html, BookingDetails.html, health-records.html, schedule.html */

(() => {
  const root = document.getElementById("commonSidebar");
  if (!root) return;

  const activePage = root.dataset.active || "";
  const item = (name, href, icon, label) => `
    <a class="side-nav-link side-link${activePage === name ? " active" : ""}" href="${href}" title="${label}"${activePage === name ? ' aria-current="page"' : ""}>
      <i data-lucide="${icon}"></i><span>${label}</span>
    </a>`;

  root.outerHTML = `
    <aside class="side-nav card sidebar common-patient-sidebar" id="patientSidebar" aria-label="Patient portal navigation">
      <nav class="side-nav-list" aria-label="Patient menu">
        ${item("dashboard", "home.html", "house", "Dashboard")}
        ${item("doctors", "doctors.html", "user-round-search", "Find Doctors")}
        ${item("schedule", "schedule.html", "calendar-days", "My Schedule")}
        ${item("appointments", "appointments.html", "calendar-check", "Appointments")}
        ${item("health", "health-records.html", "file-heart", "Medical Records")}
        ${item("prescriptions", "#prescriptions", "notebook-tabs", "Prescriptions")}
        ${item("payments", "#payments", "receipt-text", "Invoices &amp; Payments")}
        ${item("summary", "#summary", "heart-pulse", "Health Summary")}
        ${item("settings", "#settings", "settings", "Profile Settings")}
        ${item("help", "#help", "circle-help", "Help &amp; Support")}
      </nav>

      <section class="assistant-box assistant-card" aria-label="AI Health Assistant">
        <div class="assistant-title"><span>AI Health Assistant</span><span class="beta">BETA</span></div>
        <p>Get smart insights, schedule suggestions and answers to your health questions.</p>
        <button class="assistant-button primary-button" type="button" data-common-ai data-open-tab="analysis">
          <i data-lucide="sparkles"></i>Ask AI
        </button>
      </section>

      <a class="side-logout" href="home.html"><i data-lucide="log-out"></i><span>Logout</span></a>
    </aside>`;

  const sidebar = document.getElementById("patientSidebar");
  sidebar.querySelector("[data-common-ai]")?.addEventListener("click", () => {
    if (activePage !== "health") window.location.href = "health-records.html#analysis";
  });

  if (window.lucide) window.lucide.createIcons();
})();
