/* Used by: SmartConfigurationForClinics.html (Clinic Plan step 3: Add Doctors) */

(() => {
  const requestedPlan = (new URLSearchParams(window.location.search).get("plan") || "clinic").toLowerCase();
  const planKey = requestedPlan === "organization" ? "organization" : "clinic";
  const planLabel = planKey === "organization" ? "Organization Plan" : "Clinic Plan";
  const finishDestination = `individual-clinic-setup.html?step=4&plan=${encodeURIComponent(planKey)}`;
  document.title = `CliniFlow - ${planLabel} Add Doctors`;
  document.getElementById("doctorPlanLabel").textContent = planLabel;

  const form = document.getElementById("doctorForm");
  const doctorRows = document.getElementById("doctorRows");
  const doctorCount = document.getElementById("doctorCount");
  const overviewDoctorCount = document.getElementById("overviewDoctorCount");
  const importCount = document.getElementById("importCount");
  const fileInput = document.getElementById("excelFileInput");
  const dropzone = document.getElementById("excelDropzone");
  const selectedFilePanel = document.getElementById("selectedFile");
  const selectedFileName = document.getElementById("selectedFileName");
  const selectedFileSize = document.getElementById("selectedFileSize");
  const importButton = document.getElementById("importDoctors");
  const toast = document.getElementById("toast");
  let toastTimer;
  let selectedFile = null;
  let excelImports = 0;

  const avatarIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path>
    </svg>`;
  const trashIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"></path>
    </svg>`;

  const defaultDoctors = [
    {
      name: "Dr. Arjun Mehta",
      specialization: "General Physician",
      registration: "WBMC-42816",
      phone: "+91 98765 43210",
      email: "arjunmehta@example.com",
      qualification: "MBBS, MD",
      experience: "12",
      clinic: "City Health Clinic"
    },
    {
      name: "Dr. Riya Sen",
      specialization: "Cardiologist",
      registration: "WBMC-56302",
      phone: "+91 98765 43125",
      email: "riyasen@example.com",
      qualification: "MBBS, DM",
      experience: "9",
      clinic: "Wellness Care Center"
    }
  ];

  const readStoredDoctors = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("cliniflowClinicDoctors") || "null");
      return Array.isArray(saved) ? saved : defaultDoctors;
    } catch {
      return defaultDoctors;
    }
  };

  let doctors = readStoredDoctors();

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  };

  const saveDoctors = () => {
    sessionStorage.setItem("cliniflowClinicDoctors", JSON.stringify(doctors));
  };

  const renderDoctors = () => {
    doctorRows.innerHTML = doctors.map((doctor, index) => `
      <tr>
        <td>
          <span class="doctor-name-cell">
            <span class="doctor-avatar">${avatarIcon}</span>
            <span><strong>${escapeHtml(doctor.name)}</strong><small>${escapeHtml(doctor.email)}</small></span>
          </span>
        </td>
        <td>${escapeHtml(doctor.specialization)}</td>
        <td>${escapeHtml(doctor.registration)}</td>
        <td>${escapeHtml(doctor.clinic)}</td>
        <td><span class="doctor-status">Active</span></td>
        <td><button class="remove-doctor" type="button" data-remove-doctor="${index}" aria-label="Remove ${escapeHtml(doctor.name)}">${trashIcon}</button></td>
      </tr>
    `).join("");
    doctorCount.textContent = String(doctors.length);
    overviewDoctorCount.textContent = String(doctors.length);
  };

  const refreshControls = () => {
    window.CliniFlowFormControls?.refresh();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    doctors.push({
      name: document.getElementById("doctorName").value.trim(),
      specialization: document.getElementById("doctorSpecialization").value,
      registration: document.getElementById("doctorRegistration").value.trim(),
      phone: `${document.getElementById("doctorPhoneCode").value} ${document.getElementById("doctorPhone").value.trim()}`,
      email: document.getElementById("doctorEmail").value.trim(),
      qualification: document.getElementById("doctorQualification").value.trim(),
      experience: document.getElementById("doctorExperience").value,
      clinic: [...document.getElementById("doctorClinic").selectedOptions]
        .map((option) => option.value)
        .join(", ")
    });
    saveDoctors();
    renderDoctors();
    showToast("Doctor added successfully.");
    form.reset();
    window.setTimeout(refreshControls);
  });

  document.getElementById("clearDoctorForm").addEventListener("click", () => {
    form.reset();
    window.setTimeout(refreshControls);
  });

  doctorRows.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-doctor]");
    if (!removeButton) return;
    const [removed] = doctors.splice(Number(removeButton.dataset.removeDoctor), 1);
    saveDoctors();
    renderDoctors();
    showToast(`${removed.name} removed.`);
  });

  document.getElementById("doctorPhone").addEventListener("input", (event) => {
    event.currentTarget.value = event.currentTarget.value.replace(/[^\d\s-]/g, "").slice(0, 15);
  });

  const formatFileSize = (bytes) => bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const setSelectedFile = (file) => {
    if (!file) return;
    const extension = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(extension)) {
      showToast("Choose an XLSX, XLS or CSV file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("The selected file is larger than 5 MB.");
      return;
    }
    selectedFile = file;
    selectedFileName.textContent = file.name;
    selectedFileSize.textContent = formatFileSize(file.size);
    selectedFilePanel.hidden = false;
    importButton.disabled = false;
    showToast("Doctor file selected.");
  };

  const clearSelectedFile = () => {
    selectedFile = null;
    fileInput.value = "";
    selectedFilePanel.hidden = true;
    importButton.disabled = true;
  };

  document.getElementById("chooseExcelFile").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => setSelectedFile(fileInput.files[0]));
  document.getElementById("removeSelectedFile").addEventListener("click", clearSelectedFile);

  ["dragenter", "dragover"].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add("drag-over");
  }));
  ["dragleave", "drop"].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove("drag-over");
  }));
  dropzone.addEventListener("drop", (event) => setSelectedFile(event.dataTransfer.files[0]));

  const normalizeHeader = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const parseCsvDoctors = (text) => {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(normalizeHeader);
    const get = (values, aliases) => {
      const index = headers.findIndex((header) => aliases.includes(header));
      return index >= 0 ? (values[index] || "").trim().replace(/^"|"$/g, "") : "";
    };
    return lines.slice(1).map((line) => {
      const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || line.split(",");
      return {
        name: get(values, ["doctorname", "name"]),
        specialization: get(values, ["specialization", "speciality"]),
        registration: get(values, ["registrationno", "medicalregistrationno", "registration"]),
        phone: get(values, ["mobile", "mobilenumber", "phone"]),
        email: get(values, ["email", "emailaddress"]),
        qualification: get(values, ["qualification"]),
        experience: get(values, ["experience", "experienceyears"]),
        clinic: get(values, ["clinic", "clinicname"])
      };
    }).filter((doctor) => doctor.name && doctor.specialization && doctor.registration);
  };

  importButton.addEventListener("click", () => {
    if (!selectedFile) return;
    const extension = selectedFile.name.split(".").pop().toLowerCase();
    if (extension !== "csv") {
      excelImports += 1;
      importCount.textContent = String(excelImports);
      showToast("Excel file uploaded. Doctor rows are ready for server import.");
      clearSelectedFile();
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const importedDoctors = parseCsvDoctors(reader.result);
      if (!importedDoctors.length) {
        showToast("No valid doctor rows were found. Use the sample format.");
        return;
      }
      doctors.push(...importedDoctors);
      excelImports += 1;
      importCount.textContent = String(excelImports);
      saveDoctors();
      renderDoctors();
      clearSelectedFile();
      showToast(`${importedDoctors.length} doctors imported successfully.`);
    });
    reader.readAsText(selectedFile);
  });

  document.getElementById("downloadDoctorTemplate").addEventListener("click", () => {
    const csv = [
      "Doctor Name,Specialization,Registration No.,Mobile,Email,Qualification,Experience Years,Clinic",
      "Dr. Sample Doctor,General Physician,WBMC-00000,+91 90000 00000,doctor@example.com,MBBS MD,5,City Health Clinic"
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "cliniflow-doctors-template.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Sample doctor sheet downloaded.");
  });

  document.getElementById("doctorSupport").addEventListener("click", () => {
    showToast("Support chat is ready to connect.");
  });

  document.getElementById("headerNext").addEventListener("click", () => {
    showToast("Doctor setup saved. Opening finish page…");
    window.setTimeout(() => {
      window.location.href = finishDestination;
    }, 650);
  });

  document.addEventListener("click", (event) => {
    const stepButton = event.target.closest("[data-clinic-tour-step]");
    if (!stepButton) return;
    const step = Number(stepButton.dataset.clinicTourStep);
    if (step === 1) window.location.href = `clinic-tour.html?plan=${encodeURIComponent(planKey)}`;
    if (step === 2) window.location.href = `clinic-setup-tour.html?plan=${encodeURIComponent(planKey)}`;
    if (step === 4) window.location.href = finishDestination;
  });

  renderDoctors();
})();
