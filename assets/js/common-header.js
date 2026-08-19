/* Used by: appointments.html, BookingDetails.html, health-records.html, schedule.html */

(() => {
  const root = document.getElementById("commonHeader");
  if (!root) return;

  const activePage = root.dataset.active || "";
  const active = (name) => activePage === name ? ' class="active" aria-current="page"' : "";
  const drawerState = (name) => activePage === name ? ' active" aria-current="page"' : '"';

  root.innerHTML = `
    <header class="site-header cf-site-header">
      <div class="header-inner cf-header-inner">
        <button class="mobile-menu cf-mobile-menu" id="mobileMenu" type="button" aria-label="Toggle navigation" aria-controls="mainNav patientSidebar sidebar" aria-expanded="false">
          <i data-lucide="menu"></i>
        </button>
        <a class="brand cf-brand" href="home.html" aria-label="Divinexa home">
          <span class="brand-mark cf-brand-mark"><img class="divinexa-brand-mark" src="assets/images/divinexa-mark-web.png" alt=""></span>
          <span class="brand-copy cf-brand-copy"><strong class="divinexa-brand-name"><img class="divinexa-brand-wordmark" src="assets/images/divinexa-wordmark-web.png" alt="Divinexa"></strong><small>Patient Portal</small></span>
        </a>
        <nav class="main-nav cf-main-nav" id="mainNav" aria-label="Primary navigation">
          <a href="home.html"${active("dashboard")}><i data-lucide="house"></i><span>Dashboard</span></a>
          <a href="doctors.html"${active("doctors")}><i data-lucide="user-round-search"></i><span>Find Doctors</span></a>
          <a href="schedule.html"${active("schedule")}><i data-lucide="calendar-days"></i><span>My Schedule</span></a>
          <a href="health-records.html"${active("health")}><i data-lucide="heart-pulse"></i><span>Health Records</span></a>
          <a href="health-records.html#analysis"${active("ai")}><i data-lucide="sparkles"></i><span>AI Health Assistant</span> <span class="cf-beta">BETA</span></a>
          <div class="cf-mobile-drawer-menu">
            <div class="cf-drawer-links">
              <a class="cf-drawer-link${drawerState("dashboard")} href="home.html"><i data-lucide="house"></i><span>Dashboard</span></a>
              <a class="cf-drawer-link${drawerState("doctors")} href="doctors.html"><i data-lucide="user-round-search"></i><span>Find Doctors</span></a>
              <a class="cf-drawer-link${drawerState("schedule")} href="schedule.html"><i data-lucide="calendar-days"></i><span>My Schedule</span></a>
              <a class="cf-drawer-link${drawerState("appointments")} href="appointments.html"><i data-lucide="calendar-check"></i><span>Appointments</span></a>
              <a class="cf-drawer-link${drawerState("health")} href="health-records.html"><i data-lucide="notebook-tabs"></i><span>Medical Records</span></a>
              <a class="cf-drawer-link${drawerState("prescriptions")} href="health-records.html#prescriptions"><i data-lucide="notebook"></i><span>Prescriptions</span></a>
              <a class="cf-drawer-link${drawerState("billing")} href="health-records.html#documents"><i data-lucide="receipt-text"></i><span>Invoices &amp; Payments</span></a>
              <a class="cf-drawer-link${drawerState("summary")} href="health-records.html#overview"><i data-lucide="heart-pulse"></i><span>Health Summary</span></a>
              <a class="cf-drawer-link${drawerState("profile")} href="health-records.html#profile"><i data-lucide="settings"></i><span>Profile Settings</span></a>
              <a class="cf-drawer-link${drawerState("support")} href="mailto:support@cliniflow.example"><i data-lucide="circle-help"></i><span>Help &amp; Support</span></a>
            </div>
            <section class="cf-drawer-ai-card" aria-label="AI Health Assistant">
              <span class="cf-drawer-ai-title"><strong>AI Health Assistant</strong><small>BETA</small></span>
              <p>Get smart insights, schedule suggestions and answers to your health questions.</p>
              <a class="cf-drawer-ai-button" href="health-records.html#analysis"><i data-lucide="sparkles"></i><span>Ask AI</span></a>
            </section>
            <a class="cf-drawer-logout" href="patient-login.html"><i data-lucide="log-out"></i><span>Logout</span></a>
          </div>
          <span class="mobile-auth cf-mobile-auth">
            <a href="#profile">My Profile</a>
            <a href="home.html">Logout</a>
          </span>
        </nav>
        <div class="header-actions cf-header-actions">
          <button class="notification-button cf-notification-button" type="button" aria-label="Open 3 notifications" data-toast="You have 3 new notifications." data-message="You have 3 new notifications.">
            <i data-lucide="bell"></i>
            <span class="notification-badge cf-notification-badge">3</span>
          </button>
          <span class="header-divider cf-header-divider" aria-hidden="true"></span>
          <div class="profile-menu cf-profile-menu" id="profile">
            <button class="profile-button cf-profile-button" id="profileButton" type="button" aria-label="Open Rahul Sharma patient menu" aria-controls="profileDropdown" aria-expanded="false">
              <img class="profile-avatar cf-profile-avatar" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&amp;fit=crop&amp;w=120&amp;h=120&amp;q=82" alt="">
              <span class="profile-copy cf-profile-copy"><strong>Rahul Sharma</strong><small>Patient</small></span>
              <i data-lucide="chevron-down"></i>
            </button>
            <div class="profile-dropdown cf-profile-dropdown" id="profileDropdown" role="menu" aria-hidden="true">
              <a href="#profile" role="menuitem"><i data-lucide="user-round"></i><span>My Profile</span></a>
              <a href="appointments.html" role="menuitem"><i data-lucide="calendar-check"></i><span>My Appointments</span></a>
              <a href="#settings" role="menuitem"><i data-lucide="settings"></i><span>Profile Settings</span></a>
              <div class="profile-dropdown-divider cf-profile-dropdown-divider" aria-hidden="true"></div>
              <a class="logout-option cf-logout-option" href="home.html" role="menuitem"><i data-lucide="log-out"></i><span>Logout</span></a>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;

  if (window.lucide) window.lucide.createIcons();
})();
