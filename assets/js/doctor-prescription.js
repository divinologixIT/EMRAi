/* Used by: doctor-prescription.html */
(() => {
  "use strict";

  window.lucide?.createIcons();

  const body = document.body;
  const sidebarToggle = document.getElementById("sidebarToggle");
  const mobileOverlay = document.getElementById("mobileOverlay");
  const profile = document.getElementById("doctorProfile");
  const profileButton = document.getElementById("doctorProfileButton");
  const search = document.getElementById("doctorSearch");
  const toast = document.getElementById("doctorToast");
  const patientIdentityEditor = document.querySelector(".patient-identity-no-photo");
  const summaryPreviewModal = document.getElementById("summaryPreviewModal");
  const summaryPreviewPatient = document.getElementById("summaryPreviewPatient");
  const summaryPreviewFacts = document.getElementById("summaryPreviewFacts");
  const summaryPreviewCurrent = document.getElementById("summaryPreviewCurrent");
  const summaryPreviewInsights = document.getElementById("summaryPreviewInsights");
  const summaryExportButton = document.querySelector("[data-export-summary]");
  const summaryDownloadButton = document.querySelector("[data-summary-preview-download]");
  const patientVitalSummaryView = document.getElementById("patientVitalSummaryView");
  const patientVitalsUpdated = document.getElementById("patientVitalsUpdated");
  const patientVoiceRecordingsView = document.getElementById("patientVoiceRecordingsView");
  const patientVideosView = document.getElementById("patientVideosView");
  const patientImagesView = document.getElementById("patientImagesView");
  const patientDocumentsView = document.getElementById("patientDocumentsView");
  const patientRecordingsAction = document.querySelector("[data-recordings-open]");
  const patientVideosAction = document.querySelector("[data-videos-open]");
  const patientImagesAction = document.querySelector("[data-images-open]");
  const patientDocumentsAction = document.querySelector("[data-documents-open]");
  const voiceInputModal = document.getElementById("voiceInputModal");
  const voiceListeningVisual = document.getElementById("voiceListeningVisual");
  const voiceWaveform = document.getElementById("voiceWaveform");
  const voiceTimer = document.getElementById("voiceTimer");
  const voiceStatus = document.getElementById("voiceStatus");
  const voicePause = voiceInputModal?.querySelector("[data-voice-pause]");
  const voiceStop = voiceInputModal?.querySelector("[data-voice-stop]");
  const voiceDelete = voiceInputModal?.querySelector("[data-voice-delete]");
  const captureVoiceButton = document.getElementById("captureVoiceButton");
  const captureVoiceTimer = document.getElementById("captureVoiceTimer");
  const captureVoicePlayback = document.getElementById("captureVoicePlayback");
  const captureVideoButton = document.querySelector("[data-capture-video]");
  const captureVideoPreview = document.getElementById("captureVideoPreview");
  const captureVideoTimer = document.getElementById("captureVideoTimer");
  const patientCapture = document.querySelector(".patient-capture");
  const patientCaptureToggle = document.querySelector("[data-capture-toggle]");
  const captureImageUpload = document.getElementById("captureImageUpload");
  const captureUploadZone = document.getElementById("captureUploadZone");
  const captureImagePreviews = document.getElementById("captureImagePreviews");
  const capturePhotoButton = document.querySelector("[data-capture-photo]");
  const captureBrowseButton = document.querySelector("[data-capture-upload]");
  const captureImageLightbox = document.getElementById("captureImageLightbox");
  const captureImageLightboxImage = document.getElementById("captureImageLightboxImage");
  const cameraInputModal = document.getElementById("cameraInputModal");
  const cameraInputTitle = document.getElementById("cameraInputTitle");
  const cameraInputSubtitle = document.getElementById("cameraInputSubtitle");
  const cameraLiveVideo = document.getElementById("cameraLiveVideo");
  const cameraStatus = document.getElementById("cameraStatus");
  const cameraRecBadge = document.getElementById("cameraRecBadge");
  const cameraLiveTimer = document.getElementById("cameraLiveTimer");
  const cameraPauseButton = cameraInputModal?.querySelector("[data-camera-pause]");
  const cameraStopButton = cameraInputModal?.querySelector("[data-camera-stop]");
  const cameraCaptureButton = cameraInputModal?.querySelector("[data-camera-capture]");
  const cameraDeleteButton = cameraInputModal?.querySelector("[data-camera-delete]");
  let voiceElapsed = 0;
  let voiceTimerInterval;
  let voicePaused = false;
  let voiceMediaStream;
  let voiceMediaRecorder;
  let voiceSpeechRecognition;
  let voiceFinalTranscript = "";
  let voiceRecordingBlob;
  let voiceRecordingObjectUrl = "";
  let captureVideoElapsed = 0;
  let captureVideoInterval;
  let cameraMediaStream;
  let cameraMediaRecorder;
  let captureVideoObjectUrl = "";
  let cameraMode = "video";
  let cameraPaused = false;
  let captureImageUrls = [];
  let toastTimer;

  const showToast = (message) => {
    if (!message || !toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2500);
  };

  let activePatientInlineEditor = null;
  let activePatientDateEditor = null;
  let activePatientAgeEditor = null;

  const patientDateToIso = (value) => {
    const parsed = new Date(String(value || "").trim());
    if (Number.isNaN(parsed.getTime())) return "";
    return [
      parsed.getFullYear(),
      String(parsed.getMonth() + 1).padStart(2, "0"),
      String(parsed.getDate()).padStart(2, "0")
    ].join("-");
  };

  const patientDateToDisplay = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const closePatientDateEditor = ({ selectedDate = null, focusButton = false } = {}) => {
    if (!activePatientDateEditor) return;
    const { button, field, originalValue, outsideHandler, escapeHandler, positionHandler } = activePatientDateEditor;
    activePatientDateEditor = null;
    document.removeEventListener("pointerdown", outsideHandler, true);
    document.removeEventListener("keydown", escapeHandler, true);
    window.removeEventListener("scroll", positionHandler, true);
    window.removeEventListener("resize", positionHandler);
    if (selectedDate) {
      const isoValue = [
        selectedDate.getFullYear(),
        String(selectedDate.getMonth() + 1).padStart(2, "0"),
        String(selectedDate.getDate()).padStart(2, "0")
      ].join("-");
      const displayValue = patientDateToDisplay(isoValue);
      button.textContent = displayValue;
      if (displayValue !== originalValue) showToast("Patient date of birth updated");
    }
    field.remove();
    button.hidden = false;
    if (focusButton) button.focus();
  };

  const openPatientDateEditor = (button, originalValue) => {
    closePatientDateEditor();
    const parsedIso = patientDateToIso(originalValue);
    const parsedDate = parsedIso
      ? new Date(`${parsedIso}T00:00:00`)
      : new Date(1990, 0, 1);
    const field = document.createElement("span");
    field.className = "patient-inline-date-field";
    field.setAttribute("data-common-date-field", "");

    const input = document.createElement("input");
    input.className = "patient-inline-input patient-inline-date-input";
    input.type = "text";
    input.readOnly = true;
    input.value = window.DivinexaDatePicker?.formatDate(parsedDate) || originalValue;
    input.dataset.iso = parsedIso;
    input.setAttribute("aria-label", "Edit patient date of birth");
    input.setAttribute("aria-haspopup", "dialog");
    input.setAttribute("aria-expanded", "false");

    const icon = document.createElement("span");
    icon.className = "patient-inline-date-icon";
    icon.innerHTML = '<i data-lucide="calendar-days"></i>';

    const calendar = document.createElement("span");
    calendar.className = "patient-date-calendar";
    calendar.setAttribute("data-common-date-calendar", "");
    calendar.setAttribute("role", "dialog");
    calendar.setAttribute("aria-label", "Choose patient date of birth");
    calendar.hidden = true;

    field.append(input, icon, calendar);
    button.hidden = true;
    button.insertAdjacentElement("afterend", field);

    const outsideHandler = (event) => {
      if (!field.contains(event.target)) closePatientDateEditor();
    };
    const escapeHandler = (event) => {
      if (event.key === "Escape") closePatientDateEditor({ focusButton: true });
    };
    const positionHandler = () => {
      if (calendar.hidden) return;
      const rect = field.getBoundingClientRect();
      const viewportGap = 12;
      const anchorGap = 7;
      const width = Math.min(360, window.innerWidth - (viewportGap * 2));
      calendar.style.position = "fixed";
      calendar.style.width = `${width}px`;
      calendar.style.maxWidth = `${width}px`;
      const height = calendar.offsetHeight;
      const roomBelow = window.innerHeight - rect.bottom - anchorGap - viewportGap;
      const preferredTop = roomBelow >= height
        ? rect.bottom + anchorGap
        : rect.top - height - anchorGap;
      calendar.style.top = `${Math.max(viewportGap, Math.min(preferredTop, window.innerHeight - height - viewportGap))}px`;
      calendar.style.left = `${Math.max(viewportGap, Math.min(rect.left, window.innerWidth - width - viewportGap))}px`;
      calendar.style.right = "auto";
    };
    activePatientDateEditor = {
      button, field, originalValue, outsideHandler, escapeHandler, positionHandler
    };

    const picker = window.DivinexaDatePicker?.bind(input, {
      field,
      trigger: field,
      calendar,
      classPrefix: "patient-date",
      fixed: true,
      minAge: 0,
      maxAge: 120,
      width: 360,
      onSelect: (date) => closePatientDateEditor({ selectedDate: date })
    });
    window.lucide?.createIcons();
    window.setTimeout(() => {
      document.addEventListener("pointerdown", outsideHandler, true);
      document.addEventListener("keydown", escapeHandler, true);
      window.addEventListener("scroll", positionHandler, true);
      window.addEventListener("resize", positionHandler);
      picker?.open();
      window.requestAnimationFrame(positionHandler);
    }, 0);
  };

  const removeInlineCommonSelect = (select) => {
    const control = select?._commonSelect;
    if (!control) return;
    const controlIndex = commonSelects.indexOf(control);
    if (controlIndex >= 0) commonSelects.splice(controlIndex, 1);
    control.root.remove();
    delete select._commonSelect;
  };

  const closePatientAgeEditor = ({ save = true, focusButton = false } = {}) => {
    if (!activePatientAgeEditor) return;
    const {
      button, wrapper, numberInput, unitSelect, originalValue, outsideHandler, escapeHandler
    } = activePatientAgeEditor;
    activePatientAgeEditor = null;
    document.removeEventListener("pointerdown", outsideHandler, true);
    document.removeEventListener("keydown", escapeHandler, true);
    const numberValue = numberInput.value.trim();
    const nextValue = `${numberValue} ${unitSelect.value}`;
    if (save && numberValue) {
      button.textContent = nextValue;
      if (nextValue !== originalValue) showToast("Patient age updated");
    }
    removeInlineCommonSelect(unitSelect);
    wrapper.remove();
    button.hidden = false;
    if (focusButton) button.focus();
  };

  const openPatientAgeEditor = (button, originalValue) => {
    closePatientAgeEditor();
    const match = originalValue.match(/^(\d+)\s*(Years?|Months?|Days?)?/i);
    const initialNumber = match?.[1] || "0";
    const initialUnit = match?.[2]
      ? `${match[2].charAt(0).toUpperCase()}${match[2].slice(1).toLowerCase()}`.replace(/s?$/, "s")
      : "Years";

    const wrapper = document.createElement("span");
    wrapper.className = "patient-inline-age-field";
    const numberInput = document.createElement("input");
    numberInput.className = "patient-inline-input patient-inline-age-input";
    numberInput.type = "number";
    numberInput.min = "0";
    numberInput.max = "120";
    numberInput.value = initialNumber;
    numberInput.setAttribute("aria-label", "Patient age");
    const unitSelect = document.createElement("select");
    unitSelect.setAttribute("aria-label", "Patient age unit");
    ["Years", "Months", "Days"].forEach((unit) => {
      const option = new Option(unit, unit, false, unit === initialUnit);
      unitSelect.add(option);
    });
    const saveButton = document.createElement("button");
    saveButton.className = "patient-inline-age-save";
    saveButton.type = "button";
    saveButton.setAttribute("aria-label", "Save patient age");
    saveButton.innerHTML = '<i data-lucide="check"></i>';
    wrapper.append(numberInput, unitSelect, saveButton);
    button.hidden = true;
    button.insertAdjacentElement("afterend", wrapper);
    enhanceCommonSelect(unitSelect);
    unitSelect._commonSelect?.root.classList.add("patient-age-unit-select");

    const outsideHandler = (event) => {
      if (!wrapper.contains(event.target)) closePatientAgeEditor();
    };
    const escapeHandler = (event) => {
      if (event.key === "Escape") closePatientAgeEditor({ save: false, focusButton: true });
    };
    activePatientAgeEditor = {
      button, wrapper, numberInput, unitSelect, originalValue, outsideHandler, escapeHandler
    };
    window.setTimeout(() => {
      document.addEventListener("pointerdown", outsideHandler, true);
      document.addEventListener("keydown", escapeHandler, true);
    }, 0);
    numberInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        closePatientAgeEditor();
      }
    });
    saveButton.addEventListener("click", () => closePatientAgeEditor());
    numberInput.focus();
    numberInput.select();
    window.lucide?.createIcons();
  };

  const patientLocationSuggestions = [
    "New Delhi, India", "Mumbai, India", "Bengaluru, India", "Chennai, India",
    "Hyderabad, India", "Kolkata, India", "Pune, India", "Ahmedabad, India",
    "Jaipur, India", "Lucknow, India", "Chandigarh, India", "Kochi, India",
    "London, United Kingdom", "New York, United States", "Toronto, Canada",
    "Dubai, United Arab Emirates", "Singapore, Singapore", "Sydney, Australia"
  ];

  const closePatientInlineEditor = ({ save = true } = {}) => {
    if (!activePatientInlineEditor) return;
    const { button, input, originalValue, container } = activePatientInlineEditor;
    activePatientInlineEditor = null;
    const nextValue = input.value.trim();
    const displayedValue = button.dataset.patientField === "dob"
      ? patientDateToDisplay(nextValue)
      : nextValue;
    const valueChanged = save && displayedValue && displayedValue !== originalValue;
    if (save && displayedValue) button.textContent = displayedValue;
    removeInlineCommonSelect(input);
    (container || input).remove();
    button.hidden = false;
    if (valueChanged) showToast("Patient detail updated");
  };

  const openPatientInlineEditor = (button) => {
    if (!button || button.hidden) return;
    closePatientInlineEditor();
    const originalValue = button.textContent.trim();
    if (button.dataset.patientField === "dob") {
      openPatientDateEditor(button, originalValue);
      return;
    }
    if (button.dataset.patientField === "age") {
      openPatientAgeEditor(button, originalValue);
      return;
    }
    const isGender = button.dataset.patientField === "gender";
    const isLocation = button.dataset.patientField === "location";
    const input = document.createElement(isGender ? "select" : "input");
    input.className = "patient-inline-input";
    if (isGender) {
      ["Male", "Female", "Other", "Prefer not to say"].forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        option.selected = optionValue === originalValue;
        input.append(option);
      });
      input.classList.add("patient-inline-select");
    } else {
      input.type = button.dataset.patientField === "email" ? "email" : "text";
      input.value = originalValue;
      if (button.dataset.patientField === "email") {
        input.placeholder = "xxx@xxx.com";
      } else if (button.dataset.patientField === "phone") {
        input.placeholder = "000000000";
      }
      if (isLocation) {
        input.placeholder = "City, Country";
        input.autocomplete = "off";
        input.classList.add("patient-location-input");
      }
    }
    input.setAttribute("aria-label", `Edit ${button.dataset.patientField || "patient detail"}`);
    input.style.width = `${isLocation ? 210 : Math.max(90, Math.min(250, button.offsetWidth + 38))}px`;
    button.hidden = true;
    let container = null;
    let locationResults = null;
    if (isLocation) {
      container = document.createElement("span");
      container.className = "patient-location-editor";
      locationResults = document.createElement("span");
      locationResults.className = "patient-location-suggestions";
      locationResults.setAttribute("role", "listbox");
      container.append(input, locationResults);
      button.insertAdjacentElement("afterend", container);
    } else {
      button.insertAdjacentElement("afterend", input);
    }
    activePatientInlineEditor = { button, input, originalValue, container };

    if (isLocation) {
      let highlightedLocationIndex = -1;
      const renderLocationSuggestions = () => {
        const customValue = input.value.trim();
        const query = customValue.toLowerCase();
        const matches = patientLocationSuggestions
          .filter((location) => !query || location.toLowerCase().includes(query))
          .slice(0, 6);
        const hasExactMatch = patientLocationSuggestions
          .some((location) => location.toLowerCase() === query);
        highlightedLocationIndex = -1;
        const suggestionButtons = matches.map((location) => {
          const option = document.createElement("button");
          option.type = "button";
          option.setAttribute("role", "option");
          option.dataset.locationValue = location;
          option.innerHTML = `<i data-lucide="map-pin"></i><span>${location}</span>`;
          return option;
        });
        if (customValue && !hasExactMatch) {
          const customOption = document.createElement("button");
          customOption.type = "button";
          customOption.className = "patient-location-custom";
          customOption.setAttribute("role", "option");
          customOption.dataset.locationValue = customValue;
          const customIcon = document.createElement("i");
          customIcon.setAttribute("data-lucide", "plus");
          const customCopy = document.createElement("span");
          const customTitle = document.createElement("strong");
          customTitle.textContent = `Use “${customValue}”`;
          const customHint = document.createElement("small");
          customHint.textContent = "Custom city / country";
          customCopy.append(customTitle, customHint);
          customOption.append(customIcon, customCopy);
          suggestionButtons.unshift(customOption);
        }
        locationResults.replaceChildren(...suggestionButtons);
        locationResults.classList.toggle("open", suggestionButtons.length > 0);
        window.lucide?.createIcons();
      };
      const highlightLocation = (nextIndex) => {
        const options = [...locationResults.querySelectorAll("button")];
        if (!options.length) return;
        highlightedLocationIndex = (nextIndex + options.length) % options.length;
        options.forEach((option, index) => option.classList.toggle("highlighted", index === highlightedLocationIndex));
        options[highlightedLocationIndex].scrollIntoView({ block: "nearest" });
      };
      input.addEventListener("input", renderLocationSuggestions);
      input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          event.stopImmediatePropagation();
          highlightLocation(highlightedLocationIndex + 1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          event.stopImmediatePropagation();
          highlightLocation(highlightedLocationIndex - 1);
        } else if (event.key === "Enter" && highlightedLocationIndex >= 0) {
          event.preventDefault();
          event.stopImmediatePropagation();
          const option = locationResults.querySelectorAll("button")[highlightedLocationIndex];
          input.value = option?.dataset.locationValue || input.value;
          closePatientInlineEditor();
        }
      });
      locationResults.addEventListener("pointerdown", (event) => event.preventDefault());
      locationResults.addEventListener("click", (event) => {
        const option = event.target.closest("[data-location-value]");
        if (!option) return;
        input.value = option.dataset.locationValue;
        closePatientInlineEditor();
      });
      renderLocationSuggestions();
    }

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        closePatientInlineEditor();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closePatientInlineEditor({ save: false });
        button.focus();
      }
    });
    if (isGender) {
      input.addEventListener("change", () => window.setTimeout(() => closePatientInlineEditor(), 0));
      enhanceCommonSelect(input);
      input._commonSelect?.root.classList.add("patient-inline-common-select");
      window.requestAnimationFrame(() => input._commonSelect?.trigger.click());
    } else {
      input.addEventListener("blur", () => window.setTimeout(() => closePatientInlineEditor(), 0));
      input.focus();
      input.select();
    }
  };

  patientIdentityEditor?.addEventListener("click", (event) => {
    const editableValue = event.target.closest(".patient-inline-value");
    if (editableValue) openPatientInlineEditor(editableValue);
  });

  const exportPatientSummaryPdf = () => {
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) {
      showToast("PDF library is unavailable. Check your internet connection and try again.");
      return false;
    }

    const normalizePdfText = (value = "") => String(value)
      .replace(/\u00a0/g, " ")
      .replace(/[–—]/g, "-")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/°/g, " deg ")
      .replace(/²/g, "2")
      .replace(/[^\x20-\x7E\n]/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim();
    const textOf = (selector, root = document) => normalizePdfText(root.querySelector(selector)?.textContent || "");
    const allText = (selector, root = document) => [...root.querySelectorAll(selector)]
      .map((item) => normalizePdfText(item.textContent))
      .filter(Boolean);

    const patientName = textOf("#patientName").replace(/\s+/g, " ").trim() || "Patient";
    const patientDetails = textOf(".patient-profile-copy > p");
    const patientMrn = textOf(".patient-mrn");
    const patientContacts = allText(".patient-contact li");
    const otherInfo = [...document.querySelectorAll(".patient-info-list > div")].map((item) => [
      textOf("small", item),
      textOf("strong", item)
    ]).filter(([label, value]) => label && value);
    const vitals = [...document.querySelectorAll(".patient-vital-card")].map((card) => {
      const label = textOf("small", card);
      const value = textOf("strong", card);
      const unit = textOf("em", card);
      return [label, normalizePdfText(`${value} ${unit}`)];
    }).filter(([label]) => label);
    const attachmentSummary = [
      ["Voice Recordings", textOf(".patient-recordings-view .patient-recording-count") || "0 Recordings"],
      ["Videos", textOf(".patient-videos-view .patient-resource-count") || "0 Videos"],
      ["Images", textOf(".patient-images-view .patient-resource-count") || "0 Images"],
      ["Documents", `${document.querySelectorAll(".patient-document-row").length} Files`]
    ];
    const documentHistory = [...document.querySelectorAll(".patient-document-row")].map((row) => {
      const title = textOf(":scope > div strong", row);
      const description = textOf(":scope > div small", row);
      const date = textOf("time", row);
      const size = textOf(":scope > span:nth-child(3) small", row);
      return [title, description, date, size].filter(Boolean).join(" | ");
    }).filter(Boolean);
    const history = [...document.querySelectorAll(".history-grid select")].map((select) => [
      normalizePdfText(select.getAttribute("aria-label") || "History"),
      normalizePdfText(select.value)
    ]);
    const currentMedicines = normalizePdfText(document.getElementById("currentMedicinesValue")?.value || "None recorded");
    const clinicalCard = document.querySelector(".clinical-grid")?.closest(".result-card");
    const clinicalSummary = clinicalCard
      ? [...clinicalCard.querySelectorAll(".clinical-grid > div")].map((column) => ({
          title: textOf("h4", column),
          body: normalizePdfText([
            ...allText("p", column),
            ...allText("li", column)
          ].join("\n"))
        }))
      : [];
    const diagnosisCard = document.querySelector(".diagnosis-pill")?.closest(".result-card");
    const likelyDiagnosis = textOf(".diagnosis-pill", diagnosisCard || document);
    const diagnosisConfidence = textOf(".confidence-copy", diagnosisCard || document);
    const differential = diagnosisCard
      ? [...diagnosisCard.querySelectorAll(".probability-list li")].map((item) => {
          const name = textOf("span", item);
          const probability = textOf("em", item);
          return `${name}${probability ? ` (${probability})` : ""}`;
        })
      : [];
    const investigations = [...document.querySelectorAll("#investigationTags [data-investigation-name]")]
      .map((item) => normalizePdfText(item.dataset.investigationName))
      .filter(Boolean);
    const treatment = [...document.querySelectorAll(".treatment-card [data-medicine-row]")].map((row) => {
      const name = textOf(".medicine-name strong", row);
      const generic = textOf(".medicine-name small", row);
      const details = [...row.querySelectorAll("[data-medicine-detail]")].map((detail) => {
        const label = textOf("small", detail);
        const value = textOf("strong", detail);
        return label && value ? `${label}: ${value}` : "";
      }).filter(Boolean);
      return `${name}${generic ? ` ${generic}` : ""}\n${details.join(" | ")}`;
    }).filter(Boolean);
    const advice = allText("#adviceGrid .advice-item > span");
    const selectedFollowDateButton = document.querySelector(".next-visit-options button.selected");
    const customFollowDate = document.getElementById("followCustomDateLabel")?.textContent.trim();
    const followDate = selectedFollowDateButton?.dataset.followDate === "Custom"
      ? normalizePdfText(customFollowDate && customFollowDate !== "Choose a date" ? customFollowDate : "Custom date not selected")
      : textOf(".next-visit-options button.selected") || "Not selected";
    const followType = textOf(".follow-type-options button.selected") || "Not selected";
    const followChecklist = [...document.querySelectorAll(".follow-checklist input:checked")]
      .map((input) => normalizePdfText(input.value));
    const followSpecialist = normalizePdfText(document.getElementById("followSpecialist")?.value || "Not required");
    const followNotes = normalizePdfText(document.getElementById("followupNotes")?.value || "No instructions recorded");

    const historyMap = Object.fromEntries(history);
    const knownDisease = historyMap["Known Disease"] || "Not recorded";
    const surgery = historyMap["Surgical History"] || "Not recorded";
    const allergies = historyMap.Allergies || "Not recorded";
    const historyAnalysis = [
      knownDisease.toLowerCase() === "none"
        ? "No chronic disease is currently recorded."
        : `Chronic conditions (${knownDisease}) should be reviewed during follow-up and considered when adjusting treatment.`,
      /nkda|none/i.test(allergies)
        ? "No known drug allergy is recorded; reconfirm allergy status before issuing new medicines."
        : `Recorded allergy information (${allergies}) requires medicine and interaction screening.`,
      /no past|none/i.test(surgery)
        ? "No significant surgical history is currently recorded."
        : `Previous surgery (${surgery}) should be considered in the clinical review.`,
      currentMedicines
        ? `Medication reconciliation includes: ${currentMedicines}. Check adherence, duplication and interactions.`
        : "No current medicines are recorded; verify this with the patient."
    ];

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 45;

    doc.setProperties({
      title: `${patientName} - Patient Summary`,
      subject: "Clinical history, prescription and follow-up summary",
      author: "Divinexa",
      creator: "Divinexa AI Healthcare"
    });

    const drawHeader = () => {
      doc.setFillColor(0, 143, 135);
      doc.rect(0, 0, pageWidth, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("DIVINEXA", margin, 14);
      doc.setFontSize(11);
      doc.text("PATIENT CLINICAL SUMMARY", margin, 23);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 29);
      doc.setTextColor(20, 43, 65);
    };

    const ensureSpace = (height = 16) => {
      if (y + height <= pageHeight - 18) return;
      doc.addPage();
      drawHeader();
      y = 45;
    };

    const addSectionTitle = (title) => {
      ensureSpace(24);
      doc.setFillColor(233, 248, 246);
      doc.roundedRect(margin, y, contentWidth, 9, 2, 2, "F");
      doc.setTextColor(0, 113, 108);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(normalizePdfText(title).toUpperCase(), margin + 4, y + 6);
      doc.setTextColor(20, 43, 65);
      y += 13;
    };

    const addParagraph = (value, options = {}) => {
      const text = normalizePdfText(value);
      if (!text) return;
      doc.setFont("helvetica", options.bold ? "bold" : "normal");
      doc.setFontSize(options.size || 8.5);
      doc.setTextColor(...(options.color || [38, 64, 88]));
      const lines = doc.splitTextToSize(text, options.width || contentWidth);
      const height = lines.length * (options.lineHeight || 4.3);
      ensureSpace(height + 3);
      doc.text(lines, options.x || margin, y, { lineHeightFactor: 1.25 });
      y += height + (options.after ?? 2);
    };

    const addKeyValues = (rows, columns = 2) => {
      const validRows = rows.filter(([label, value]) => label && value);
      const cellWidth = contentWidth / columns;
      validRows.forEach(([label, value], index) => {
        const column = index % columns;
        if (column === 0) ensureSpace(13);
        const x = margin + column * cellWidth;
        const rowY = y;
        doc.setFillColor(index % (columns * 2) < columns ? 248 : 252, 251, 252);
        doc.roundedRect(x, rowY - 1.5, cellWidth - 2, 10, 1.2, 1.2, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(100, 122, 143);
        doc.text(normalizePdfText(label), x + 3, rowY + 2);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.4);
        doc.setTextColor(22, 48, 73);
        const valueLines = doc.splitTextToSize(normalizePdfText(value), cellWidth - 7);
        doc.text(valueLines.slice(0, 2), x + 3, rowY + 6);
        if (column === columns - 1 || index === validRows.length - 1) y += 12;
      });
      y += 1;
    };

    const addBullets = (items) => {
      items.filter(Boolean).forEach((item) => {
        const lines = doc.splitTextToSize(normalizePdfText(item), contentWidth - 7);
        const height = Math.max(5, lines.length * 4.1);
        ensureSpace(height + 1);
        doc.setFillColor(0, 143, 135);
        doc.circle(margin + 1.6, y - 1.2, .8, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.2);
        doc.setTextColor(38, 64, 88);
        doc.text(lines, margin + 5, y, { lineHeightFactor: 1.25 });
        y += height;
      });
      y += 1;
    };

    drawHeader();
    addSectionTitle("Patient Details");
    addParagraph(patientName, { bold: true, size: 14, color: [12, 75, 80], after: 1 });
    addParagraph([patientMrn, patientDetails, ...patientContacts].filter(Boolean).join("  |  "), { size: 8 });

    addSectionTitle("Vital Summary");
    addKeyValues(vitals, 2);

    addSectionTitle("Other Patient Information");
    addKeyValues(otherInfo, 2);

    addSectionTitle("Attachments & Documents");
    addKeyValues(attachmentSummary, 2);
    addParagraph("Documents & History", { bold: true, size: 9, color: [0, 115, 109], after: 1 });
    addBullets(documentHistory.length ? documentHistory : ["No documents recorded"]);

    addSectionTitle("Previous History & Clinical Analysis");
    addKeyValues([...history, ["Current Medicines", currentMedicines]], 2);
    addBullets(historyAnalysis);

    addSectionTitle("Current Clinical Summary");
    clinicalSummary.forEach((section) => {
      addParagraph(section.title, { bold: true, size: 9, color: [0, 115, 109], after: 1 });
      addParagraph(section.body);
    });

    addSectionTitle("Diagnosis");
    addKeyValues([["Likely Diagnosis", likelyDiagnosis || "Not recorded"], ["AI Confidence", diagnosisConfidence || "Not recorded"]], 2);
    if (differential.length) {
      addParagraph("Differential Diagnosis", { bold: true, size: 9, color: [0, 115, 109], after: 1 });
      addBullets(differential);
    }

    addSectionTitle("Investigations");
    addBullets(investigations.length ? investigations : ["No investigations selected"]);

    addSectionTitle("Treatment Plan");
    treatment.forEach((medicine, index) => {
      addParagraph(`${index + 1}. ${medicine}`, { size: 8.2, after: 3 });
    });

    addSectionTitle("Advice");
    addBullets(advice.length ? advice : ["No advice recorded"]);

    addSectionTitle("Follow-up Plan");
    addKeyValues([
      ["Next Visit", followDate],
      ["Follow-up Type", followType],
      ["Referral", followSpecialist],
      ["Checklist", followChecklist.join(", ") || "No checklist items selected"]
    ], 2);
    addParagraph("Instructions", { bold: true, size: 9, color: [0, 115, 109], after: 1 });
    addParagraph(followNotes);

    ensureSpace(22);
    doc.setDrawColor(197, 216, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    addParagraph(
      "Clinical note: This summary consolidates information recorded on the Divinexa prescription screen. It supports clinical review and does not replace the treating doctor's professional judgment.",
      { size: 7.3, color: [86, 107, 127] }
    );

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(104, 123, 140);
      doc.text("Divinexa AI Healthcare - Confidential Patient Record", margin, pageHeight - 8);
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }

    const filename = `${patientName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "Patient"}-Clinical-Summary.pdf`;
    doc.save(filename);
    showToast("Patient history analyzed and PDF summary downloaded");
    return true;
  };

  const cleanPreviewText = (value = "") => String(value).replace(/\s+/g, " ").trim();
  const getHistoryValue = (label) => {
    const select = [...document.querySelectorAll(".history-grid select")]
      .find((item) => item.getAttribute("aria-label") === label);
    return cleanPreviewText(select?.value || "Not recorded");
  };

  const renderSummaryPreview = () => {
    const patientName = cleanPreviewText(document.getElementById("patientName")?.textContent || "Patient");
    const knownDisease = getHistoryValue("Known Disease");
    const surgery = getHistoryValue("Surgical History");
    const allergies = getHistoryValue("Allergies");
    const currentMedicines = cleanPreviewText(document.getElementById("currentMedicinesValue")?.value || "None recorded");
    const lastCheckup = cleanPreviewText(document.querySelector('[data-patient-vital="last-checkup"] strong')?.textContent || "Not recorded");
    const documentCount = document.querySelectorAll(".patient-document-row").length;
    const previousPrescriptions = document.querySelectorAll('.patient-document-row[data-document-type="prescription"]').length;
    const complaint = cleanPreviewText(
      document.getElementById("chiefComplaintValue")?.value
      || document.querySelector(".chief-complaint-grid button.selected")?.textContent
      || "Not selected"
    );
    const duration = cleanPreviewText(document.querySelector(".duration-choice-grid button.selected")?.textContent || "Duration not selected");
    const onset = cleanPreviewText(document.querySelector(".chief-complaint-section > .chip-grid.two button.selected")?.textContent || "Onset not selected");
    const painGroups = [...document.querySelectorAll(".pain-quality-layout > .pain-quality-group")];
    const painLocations = [...document.querySelectorAll(".pain-location-options button.selected")]
      .map((button) => cleanPreviewText(button.dataset.painLocation))
      .filter(Boolean);
    const customRadiation = painGroups[1]?.querySelector('[data-factor-dropdown="radiation"] [data-factor-value]')?.value;
    const radiation = cleanPreviewText(customRadiation || painGroups[1]?.querySelector(".pain-choice-grid button.selected")?.textContent || "Not selected");
    const painNature = cleanPreviewText(painGroups[2]?.querySelector("button.selected")?.textContent || "Not selected");
    const associatedSymptoms = [...document.querySelectorAll(".check-grid input:checked")]
      .map((input) => cleanPreviewText(input.closest("label")?.textContent))
      .filter(Boolean);

    if (summaryPreviewPatient) summaryPreviewPatient.textContent = patientName;
    const facts = [
      ["Known Disease", knownDisease],
      ["Surgical History", surgery],
      ["Allergies", allergies],
      ["Current Medicines", currentMedicines || "None recorded"],
      ["Last Checkup", lastCheckup],
      ["Previous Records", `${documentCount} files, including ${previousPrescriptions} prescription${previousPrescriptions === 1 ? "" : "s"}`]
    ];
    if (summaryPreviewFacts) {
      summaryPreviewFacts.replaceChildren(...facts.map(([label, value]) => {
        const card = document.createElement("article");
        card.className = "summary-preview-fact";
        const caption = document.createElement("small");
        const detail = document.createElement("strong");
        caption.textContent = label;
        detail.textContent = value;
        card.append(caption, detail);
        return card;
      }));
    }

    const presentation = [
      `${complaint} - ${duration}, ${onset} onset.`,
      painLocations.length ? `Pain location: ${painLocations.join(", ")}.` : "",
      radiation !== "Not selected" ? `Radiation: ${radiation}.` : "",
      painNature !== "Not selected" ? `Pain nature: ${painNature}.` : "",
      associatedSymptoms.length ? `Associated symptoms: ${associatedSymptoms.join(", ")}.` : ""
    ].filter(Boolean).join(" ");
    if (summaryPreviewCurrent) summaryPreviewCurrent.textContent = presentation;

    const insights = [
      /none/i.test(knownDisease)
        ? "No chronic disease is currently recorded; confirm this during consultation."
        : `Chronic conditions (${knownDisease}) should be considered in diagnosis, medicine selection and follow-up planning.`,
      /nkda|none/i.test(allergies)
        ? "No known drug allergy is recorded; reconfirm allergy status before finalizing the prescription."
        : `Recorded allergy information (${allergies}) requires medicine and interaction screening.`,
      /no past|none/i.test(surgery)
        ? "No significant surgical history is currently recorded."
        : `Previous surgery (${surgery}) should be considered in the clinical assessment.`,
      currentMedicines && !/none/i.test(currentMedicines)
        ? `Medication reconciliation includes ${currentMedicines}; check adherence, duplication and interactions.`
        : "No current medicines are recorded; verify this directly with the patient.",
      documentCount
        ? `${documentCount} previous records are available for AI-supported history comparison and report generation.`
        : "No previous records are available; the generated report will rely on current patient input."
    ];
    if (summaryPreviewInsights) {
      summaryPreviewInsights.replaceChildren(...insights.map((insight) => {
        const item = document.createElement("li");
        item.textContent = insight;
        return item;
      }));
    }
    window.lucide?.createIcons();
  };

  const openSummaryPreview = () => {
    if (!summaryPreviewModal) return;
    renderSummaryPreview();
    summaryPreviewModal.hidden = false;
    body.classList.add("summary-preview-open");
    window.requestAnimationFrame(() => summaryDownloadButton?.focus());
  };

  const closeSummaryPreview = () => {
    if (!summaryPreviewModal) return;
    summaryPreviewModal.hidden = true;
    body.classList.remove("summary-preview-open");
    summaryExportButton?.focus({ preventScroll: true });
  };

  summaryExportButton?.addEventListener("click", openSummaryPreview);
  document.querySelectorAll("[data-summary-preview-close]").forEach((button) => {
    button.addEventListener("click", closeSummaryPreview);
  });
  summaryDownloadButton?.addEventListener("click", () => {
    if (exportPatientSummaryPdf()) closeSummaryPreview();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && summaryPreviewModal && !summaryPreviewModal.hidden) closeSummaryPreview();
  });

  const patientSummaryViews = [
    patientVitalSummaryView,
    patientVoiceRecordingsView,
    patientVideosView,
    patientImagesView,
    patientDocumentsView,
  ].filter(Boolean);
  const patientResourceActions = [
    patientRecordingsAction,
    patientVideosAction,
    patientImagesAction,
    patientDocumentsAction,
  ].filter(Boolean);

  const showPatientSummaryView = (targetView, activeAction) => {
    if (!targetView) return;
    patientSummaryViews.forEach((view) => {
      view.hidden = view !== targetView;
    });
    patientResourceActions.forEach((button) => {
      button.classList.toggle("active", button === activeAction);
    });
    window.lucide?.createIcons();
  };

  const patientVitalCards = [...(patientVitalSummaryView?.querySelectorAll(".patient-vital-card") || [])];
  let activeVitalCard = null;

  const updateCalculatedBmi = () => {
    const weightValue = Number.parseFloat(document.querySelector('[data-patient-vital="weight"] strong')?.textContent);
    const heightValue = Number.parseFloat(document.querySelector('[data-patient-vital="height"] strong')?.textContent);
    const bmiValue = document.querySelector('[data-patient-vital="bmi"] strong');
    if (weightValue > 0 && heightValue > 0 && bmiValue) {
      const heightMeters = heightValue / 100;
      bmiValue.textContent = (weightValue / (heightMeters * heightMeters)).toFixed(1);
    }
  };

  const updateVitalsTimestamp = () => {
    if (patientVitalsUpdated) {
      patientVitalsUpdated.textContent = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      }).format(new Date());
    }
  };

  const closeVitalCardEditor = (card, { save = true } = {}) => {
    const value = card?.querySelector("strong");
    if (!card || !value) return;

    const previousValue = card.dataset.previousVitalValue || value.textContent.trim();
    if (save) {
      value.textContent = value.textContent.replace(/\s+/g, " ").trim() || previousValue || "\u2014";
      if (["weight", "height"].includes(card.dataset.patientVital)) updateCalculatedBmi();
      updateVitalsTimestamp();
      showToast(`${card.querySelector("small")?.textContent.trim() || "Vital"} updated`);
    } else {
      value.textContent = previousValue;
    }

    value.setAttribute("contenteditable", "false");
    card.classList.remove("is-editing");
    card.setAttribute("aria-label", `Edit ${card.querySelector("small")?.textContent.trim() || "vital"}`);
    delete card.dataset.previousVitalValue;
    if (activeVitalCard === card) activeVitalCard = null;
  };

  const openVitalCardEditor = (card) => {
    const value = card?.querySelector("strong");
    if (!card || !value) return;
    if (activeVitalCard && activeVitalCard !== card) closeVitalCardEditor(activeVitalCard);

    activeVitalCard = card;
    card.dataset.previousVitalValue = value.textContent.trim();
    card.classList.add("is-editing");
    card.setAttribute("aria-label", `Editing ${card.querySelector("small")?.textContent.trim() || "vital"}`);
    value.setAttribute("contenteditable", "true");
    value.setAttribute("spellcheck", "false");
    window.requestAnimationFrame(() => {
      value.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(value);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  };

  patientVitalCards.forEach((card) => {
    const value = card.querySelector("strong");
    const select = card.querySelector(".patient-vital-select");
    const label = card.querySelector("small")?.textContent.trim() || "vital";
    if (select) {
      const closeBloodGroupEditor = ({ save = false } = {}) => {
        if (!card.classList.contains("is-selecting")) return;
        if (save && value) {
          value.textContent = select.options[select.selectedIndex]?.textContent || "--";
          updateVitalsTimestamp();
          showToast(`${label} updated`);
        }
        card.classList.remove("is-selecting");
        card.setAttribute("aria-label", `Edit ${label}`);
        if (value) value.hidden = false;
        select._commonSelect?.root.classList.remove("open");
        select._commonSelect?.trigger.setAttribute("aria-expanded", "false");
      };

      const openBloodGroupEditor = () => {
        if (card.classList.contains("is-selecting")) return;
        card.classList.add("is-selecting");
        card.setAttribute("aria-label", `Select ${label}`);
        if (value) value.hidden = true;
        window.requestAnimationFrame(() => select._commonSelect?.trigger.click());
      };

      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Edit ${label}`);
      card.addEventListener("click", (event) => {
        if (event.target.closest(".common-select")) return;
        openBloodGroupEditor();
      });
      card.addEventListener("keydown", (event) => {
        if (event.target !== card || !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        openBloodGroupEditor();
      });
      select.addEventListener("change", () => {
        closeBloodGroupEditor({ save: true });
      });
      document.addEventListener("click", (event) => {
        if (card.classList.contains("is-selecting") && !card.contains(event.target)) closeBloodGroupEditor();
      });
      return;
    }
    if (!value) return;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Edit ${label}`);

    card.addEventListener("click", () => {
      if (card.classList.contains("is-editing")) return;
      openVitalCardEditor(card);
    });

    card.addEventListener("keydown", (event) => {
      if (event.target !== card || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      if (!card.classList.contains("is-editing")) openVitalCardEditor(card);
    });

    value.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        closeVitalCardEditor(card);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeVitalCardEditor(card, { save: false });
      }
    });
    value.addEventListener("blur", () => {
      if (card.classList.contains("is-editing")) closeVitalCardEditor(card);
    });
  });

  patientRecordingsAction?.addEventListener("click", () => showPatientSummaryView(patientVoiceRecordingsView, patientRecordingsAction));
  patientVideosAction?.addEventListener("click", () => showPatientSummaryView(patientVideosView, patientVideosAction));
  patientImagesAction?.addEventListener("click", () => showPatientSummaryView(patientImagesView, patientImagesAction));
  patientDocumentsAction?.addEventListener("click", () => showPatientSummaryView(patientDocumentsView, patientDocumentsAction));
  document.querySelectorAll("[data-document-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.documentFilter;
      document.querySelectorAll("[data-document-filter]").forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll("[data-document-type]").forEach((row) => {
        row.hidden = filter !== "all" && row.dataset.documentType !== filter;
      });
    });
  });

  const setPatientMediaIcon = (button, iconName) => {
    const icon = document.createElement("i");
    icon.dataset.lucide = iconName;
    button.replaceChildren(icon);
    window.lucide?.createIcons();
  };

  document.querySelectorAll(".patient-recording-play").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const row = button.closest(".patient-recording-row");
      const shouldPlay = !row?.classList.contains("playing");
      document.querySelectorAll(".patient-recording-row.playing").forEach((playingRow) => {
        playingRow.classList.remove("playing");
        const playingButton = playingRow.querySelector(".patient-recording-play");
        if (playingButton) {
          playingButton.setAttribute("aria-pressed", "false");
          setPatientMediaIcon(playingButton, "play");
        }
      });
      if (!shouldPlay || !row) return;
      row.classList.add("playing");
      button.setAttribute("aria-pressed", "true");
      setPatientMediaIcon(button, "pause");
    });
  });

  const setPatientVideoIcon = (button, iconName) => {
    const overlay = button?.querySelector(".video-play-overlay");
    if (!overlay) return;
    const icon = document.createElement("i");
    icon.dataset.lucide = iconName;
    overlay.replaceChildren(icon);
  };

  const closePatientMediaZoom = () => {
    const lightbox = document.getElementById("patientMediaLightbox");
    if (!lightbox) return;
    lightbox.hidden = true;
    lightbox.classList.remove("video-mode", "video-paused");
    document.querySelectorAll(".patient-video-row.playing").forEach((row) => {
      row.classList.remove("playing");
      const button = row.querySelector(".patient-video-thumbnail");
      if (button) {
        button.setAttribute("aria-pressed", "false");
        setPatientVideoIcon(button, "play");
      }
    });
    body.classList.remove("patient-media-lightbox-open");
    window.lucide?.createIcons();
  };

  const getPatientMediaLightbox = () => {
    let lightbox = document.getElementById("patientMediaLightbox");
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.id = "patientMediaLightbox";
      lightbox.className = "patient-media-lightbox";
      lightbox.innerHTML = `
        <button class="patient-media-lightbox-backdrop" type="button" aria-label="Close image preview"></button>
        <div class="patient-media-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Patient image preview">
          <button class="patient-media-lightbox-close" type="button" aria-label="Close image preview"><i data-lucide="x"></i></button>
          <div class="patient-media-lightbox-preview"></div>
        </div>`;
      document.body.appendChild(lightbox);
      lightbox.querySelector(".patient-media-lightbox-backdrop")?.addEventListener("click", closePatientMediaZoom);
      lightbox.querySelector(".patient-media-lightbox-close")?.addEventListener("click", closePatientMediaZoom);
    }
    return lightbox;
  };

  const showPatientMediaLightbox = (lightbox) => {
    lightbox.hidden = false;
    body.classList.add("patient-media-lightbox-open");
    window.lucide?.createIcons();
    lightbox.querySelector(".patient-media-lightbox-close")?.focus();
  };

  const openPatientImageZoom = (source) => {
    const lightbox = getPatientMediaLightbox();
    lightbox.classList.remove("video-mode", "video-paused");
    lightbox.querySelector(".patient-media-lightbox-dialog")?.setAttribute("aria-label", "Patient image preview");
    const preview = lightbox.querySelector(".patient-media-lightbox-preview");
    const clone = source.cloneNode(true);
    clone.removeAttribute("data-message");
    clone.removeAttribute("aria-label");
    clone.disabled = true;
    preview?.replaceChildren(clone);
    showPatientMediaLightbox(lightbox);
  };

  const openPatientVideoZoom = (source, row) => {
    const lightbox = getPatientMediaLightbox();
    lightbox.classList.add("video-mode");
    lightbox.classList.remove("video-paused");
    lightbox.querySelector(".patient-media-lightbox-dialog")?.setAttribute("aria-label", "Patient video player");
    const preview = lightbox.querySelector(".patient-media-lightbox-preview");
    const stage = document.createElement("div");
    stage.className = "patient-video-zoom-stage";
    const clone = source.cloneNode(true);
    clone.classList.add("zoom-video-thumbnail");
    clone.removeAttribute("data-message");
    clone.setAttribute("aria-label", "Pause video");
    setPatientVideoIcon(clone, "pause");
    const meta = document.createElement("div");
    meta.className = "patient-video-zoom-meta";
    meta.innerHTML = `<strong>${row.querySelector(".patient-video-copy strong")?.textContent || "Patient Video"}</strong>
      <span>${row.querySelector(".patient-video-copy small")?.textContent || ""}</span>
      <time>${row.querySelector("time")?.textContent || ""}</time>`;
    stage.append(clone, meta);
    preview?.replaceChildren(stage);
    clone.addEventListener("click", () => {
      const paused = lightbox.classList.toggle("video-paused");
      clone.setAttribute("aria-label", paused ? "Play video" : "Pause video");
      row.classList.toggle("playing", !paused);
      source.setAttribute("aria-pressed", String(!paused));
      setPatientVideoIcon(clone, paused ? "play" : "pause");
      setPatientVideoIcon(source, paused ? "play" : "pause");
      window.lucide?.createIcons();
    });
    showPatientMediaLightbox(lightbox);
  };

  document.querySelectorAll(".patient-video-thumbnail").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const row = button.closest(".patient-video-row");
      if (!row) return;
      document.querySelectorAll(".patient-video-row.playing").forEach((playingRow) => {
        playingRow.classList.remove("playing");
        const playingButton = playingRow.querySelector(".patient-video-thumbnail");
        if (playingButton) {
          playingButton.setAttribute("aria-pressed", "false");
          setPatientVideoIcon(playingButton, "play");
        }
      });
      row.classList.add("playing");
      button.setAttribute("aria-pressed", "true");
      setPatientVideoIcon(button, "pause");
      openPatientVideoZoom(button, row);
      window.lucide?.createIcons();
    });
  });

  document.querySelectorAll(".patient-image-thumb").forEach((button) => {
    button.addEventListener("click", () => openPatientImageZoom(button));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.getElementById("patientMediaLightbox")?.hidden) closePatientMediaZoom();
  });
  const formatVoiceTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  const updateVoiceTimer = () => {
    if (voiceTimer) voiceTimer.textContent = formatVoiceTime(voiceElapsed);
  };

  const stopVoiceTimer = () => {
    window.clearInterval(voiceTimerInterval);
    voiceTimerInterval = undefined;
  };

  const startVoiceTimer = () => {
    stopVoiceTimer();
    voiceTimerInterval = window.setInterval(() => {
      voiceElapsed += 1;
      updateVoiceTimer();
    }, 1000);
  };

  const setVoicePauseButton = (paused) => {
    if (!voicePause) return;
    voicePause.innerHTML = paused ? '<i data-lucide="play"></i>' : '<i data-lucide="mic"></i>';
    voicePause.setAttribute("aria-label", paused ? "Resume recording" : "Pause recording");
    window.lucide?.createIcons();
  };

  const stopVoiceMedia = ({ discard = false } = {}) => {
    if (voiceSpeechRecognition) {
      voiceSpeechRecognition.onend = null;
      try {
        voiceSpeechRecognition.stop();
      } catch {
        // Chrome may already have ended recognition after a period of silence.
      }
      voiceSpeechRecognition = undefined;
    }
    if (voiceMediaRecorder && voiceMediaRecorder.state !== "inactive") {
      voiceMediaRecorder._discardCapture = discard;
      voiceMediaRecorder.stop();
    }
    voiceMediaRecorder = undefined;
    voiceMediaStream?.getTracks().forEach((track) => track.stop());
    voiceMediaStream = undefined;
    if (discard) {
      voiceFinalTranscript = "";
      voiceRecordingBlob = undefined;
    }
  };

  const resetVoiceSession = () => {
    voiceElapsed = 0;
    voicePaused = false;
    voiceFinalTranscript = "";
    updateVoiceTimer();
    voiceListeningVisual?.classList.remove("paused", "stopped");
    if (voiceStatus) voiceStatus.textContent = "Requesting microphone access...";
    if (voicePause) voicePause.disabled = true;
    setVoicePauseButton(false);
    if (voiceStop) {
      voiceStop.disabled = true;
      voiceStop.textContent = "Stop & Analyse";
    }
    window.lucide?.createIcons();
  };

  const openVoiceInput = async () => {
    if (!voiceInputModal) return;
    if (cameraInputModal && !cameraInputModal.hidden) closeCameraInput();
    stopVoiceMedia({ discard: true });
    resetVoiceSession();
    voiceInputModal.hidden = false;
    body.classList.add("voice-input-open");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is unavailable in this browser");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      if (voiceInputModal.hidden) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      voiceMediaStream = stream;
      if (window.MediaRecorder) {
        const recorder = new MediaRecorder(stream);
        const recordedChunks = [];
        recorder._discardCapture = false;
        recorder.addEventListener("dataavailable", (event) => {
          if (event.data?.size) recordedChunks.push(event.data);
        });
        recorder.addEventListener("stop", () => {
          if (recorder._discardCapture || !recordedChunks.length) return;
          voiceRecordingBlob = new Blob(recordedChunks, {
            type: recorder.mimeType || recordedChunks[0].type || "audio/webm",
          });
          if (voiceRecordingObjectUrl) URL.revokeObjectURL(voiceRecordingObjectUrl);
          voiceRecordingObjectUrl = URL.createObjectURL(voiceRecordingBlob);
          if (captureVoicePlayback) captureVoicePlayback.src = voiceRecordingObjectUrl;
          if (captureVoiceButton) {
            captureVoiceButton.dataset.voiceReady = "true";
            captureVoiceButton.innerHTML = '<i data-lucide="volume-2"></i> Listen Recording';
          }
          if (captureVoiceTimer) {
            captureVoiceTimer.textContent = `${formatVoiceTime(voiceElapsed)} / 02:00`;
          }
          window.lucide?.createIcons();
        });
        voiceMediaRecorder = recorder;
        recorder.start();
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        voiceSpeechRecognition = new SpeechRecognition();
        voiceSpeechRecognition.continuous = true;
        voiceSpeechRecognition.interimResults = true;
        voiceSpeechRecognition.lang = "en-IN";
        voiceSpeechRecognition.addEventListener("result", (event) => {
          let interimTranscript = "";
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const transcript = event.results[index][0].transcript;
            if (event.results[index].isFinal) voiceFinalTranscript += `${transcript} `;
            else interimTranscript += transcript;
          }
          const spokenText = `${voiceFinalTranscript}${interimTranscript}`.trim();
          if (voiceStatus) voiceStatus.textContent = spokenText || "Listening... speak now";
        });
        voiceSpeechRecognition.addEventListener("error", (event) => {
          if (!["no-speech", "aborted"].includes(event.error)) {
            showToast("Speech recognition paused; audio recording is still active");
          }
        });
        voiceSpeechRecognition.start();
      }
      if (voiceStatus) voiceStatus.textContent = "Listening... speak now";
      if (voicePause) voicePause.disabled = false;
      if (voiceStop) voiceStop.disabled = false;
      startVoiceTimer();
      window.requestAnimationFrame(() => voicePause?.focus());
    } catch (error) {
      voiceListeningVisual?.classList.add("stopped");
      if (voiceStatus) voiceStatus.textContent = "Microphone blocked — allow access in browser settings";
      if (voicePause) voicePause.disabled = true;
      if (voiceStop) voiceStop.disabled = true;
      showToast(error?.message || "Microphone permission was not granted");
    }
  };

  const closeVoiceInput = () => {
    if (!voiceInputModal) return;
    stopVoiceTimer();
    stopVoiceMedia({ discard: true });
    voiceInputModal.hidden = true;
    body.classList.remove("voice-input-open");
  };

  if (voiceWaveform && !voiceWaveform.children.length) {
    const heights = [8,13,20,29,18,35,23,42,28,16,31,20,11,25,38,19,9,27,36,17,31,13,7,19,32,41,23,15,29,37,18,11,24,34,20,8];
    voiceWaveform.innerHTML = heights.map((height, index) =>
      `<span style="--bar-height:${height}px;--bar-delay:-${(index * .047).toFixed(3)}s"></span>`
    ).join("");
  }

  document.querySelector("[data-voice-input-open]")?.addEventListener("click", openVoiceInput);
  captureVoiceButton?.addEventListener("click", () => {
    if (captureVoiceButton.dataset.voiceReady !== "true" || !captureVoicePlayback?.src) {
      void openVoiceInput();
      return;
    }
    if (captureVoicePlayback.paused) {
      void captureVoicePlayback.play();
      captureVoiceButton.innerHTML = '<i data-lucide="pause"></i> Pause Recording';
    } else {
      captureVoicePlayback.pause();
      captureVoiceButton.innerHTML = '<i data-lucide="volume-2"></i> Listen Recording';
    }
    window.lucide?.createIcons();
  });
  captureVoicePlayback?.addEventListener("ended", () => {
    if (!captureVoiceButton) return;
    captureVoiceButton.innerHTML = '<i data-lucide="volume-2"></i> Listen Recording';
    window.lucide?.createIcons();
  });
  document.querySelectorAll("[data-voice-input-close]").forEach((button) => button.addEventListener("click", closeVoiceInput));
  voicePause?.addEventListener("click", () => {
    if (!voiceMediaStream) return;
    voicePaused = !voicePaused;
    voiceMediaStream.getAudioTracks().forEach((track) => { track.enabled = !voicePaused; });
    if (voiceMediaRecorder?.state === "recording" && voicePaused) voiceMediaRecorder.pause();
    else if (voiceMediaRecorder?.state === "paused" && !voicePaused) voiceMediaRecorder.resume();
    voiceListeningVisual?.classList.toggle("paused", voicePaused);
    if (voiceStatus) voiceStatus.textContent = voicePaused ? "Recording paused" : "Listening… speak now";
    setVoicePauseButton(voicePaused);
    if (voicePaused) stopVoiceTimer();
    else startVoiceTimer();
  });
  voiceStop?.addEventListener("click", () => {
    stopVoiceTimer();
    stopVoiceMedia();
    voicePaused = false;
    voiceListeningVisual?.classList.remove("paused");
    voiceListeningVisual?.classList.add("stopped");
    const capturedTranscript = voiceFinalTranscript.trim();
    if (capturedTranscript) {
      const complaintValueField = document.getElementById("chiefComplaintValue");
      if (complaintValueField) complaintValueField.value = capturedTranscript;
    }
    if (voiceStatus) voiceStatus.textContent = capturedTranscript || "Voice captured for analysis";
    if (voicePause) voicePause.disabled = true;
    voiceStop.disabled = true;
    voiceStop.textContent = "Analysis Complete";
    window.lucide?.createIcons();
    showToast("Voice complaint captured");
    closeVoiceInput();
  });
  voiceDelete?.addEventListener("click", () => {
    stopVoiceTimer();
    stopVoiceMedia({ discard: true });
    voiceElapsed = 0;
    updateVoiceTimer();
    voiceListeningVisual?.classList.remove("paused");
    voiceListeningVisual?.classList.add("stopped");
    if (voiceStatus) voiceStatus.textContent = "Recording deleted";
    if (voicePause) voicePause.disabled = true;
    if (voiceStop) voiceStop.disabled = true;
    showToast("Voice recording deleted");
  });

  const getDeviceErrorMessage = (kind, error) => {
    const label = kind === "microphone" ? "Microphone" : "Camera";
    if (!window.isSecureContext) {
      return `${label} access requires HTTPS or localhost.`;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return `${label} access is not available in this browser.`;
    }
    if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
      return `${label} permission was blocked. Allow it in the browser and try again.`;
    }
    if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
      return `No compatible ${kind} was found on this device.`;
    }
    return `${label} could not be opened. Close other recording apps and try again.`;
  };

  const updateCaptureVideoTimer = () => {
    const value = `${formatVoiceTime(captureVideoElapsed)} / 02:00`;
    if (captureVideoTimer) captureVideoTimer.textContent = value;
    if (cameraLiveTimer) cameraLiveTimer.textContent = formatVoiceTime(captureVideoElapsed);
  };

  const stopCaptureVideoTimer = () => {
    window.clearInterval(captureVideoInterval);
    captureVideoInterval = undefined;
  };

  const stopCameraMedia = () => {
    cameraMediaStream?.getTracks().forEach((track) => track.stop());
    cameraMediaStream = undefined;
    if (cameraLiveVideo) {
      cameraLiveVideo.pause();
      cameraLiveVideo.srcObject = null;
    }
  };

  const renderCapturedVideo = (url) => {
    if (!captureVideoPreview) return;
    if (captureVideoObjectUrl) URL.revokeObjectURL(captureVideoObjectUrl);
    captureVideoObjectUrl = url;
    captureVideoPreview.classList.remove("active");
    captureVideoPreview.classList.add("has-recording");
    captureVideoPreview.innerHTML = `
      <video src="${url}" controls autoplay muted playsinline preload="metadata" aria-label="Recorded patient video"></video>
      <span class="capture-video-ready"><i data-lucide="play-circle"></i> Recorded Video</span>
    `;
    if (captureVideoButton) {
      captureVideoButton.classList.remove("active");
      captureVideoButton.innerHTML = '<i data-lucide="video"></i><span>Record Again</span>';
    }
    window.lucide?.createIcons();
  };

  const resetCameraControls = () => {
    cameraPaused = false;
    if (cameraPauseButton) {
      cameraPauseButton.disabled = false;
      cameraPauseButton.innerHTML = '<i data-lucide="pause"></i>';
      cameraPauseButton.setAttribute("aria-label", "Pause video");
    }
    if (cameraStopButton) cameraStopButton.disabled = false;
    if (cameraCaptureButton) cameraCaptureButton.disabled = true;
    if (cameraDeleteButton) cameraDeleteButton.disabled = false;
    if (cameraStatus) {
      cameraStatus.classList.remove("hidden");
      cameraStatus.innerHTML = '<i data-lucide="camera"></i><strong>Starting camera...</strong><span>Please allow camera access when prompted</span>';
    }
    window.lucide?.createIcons();
  };

  const closeCameraInput = ({ saveVideo = false } = {}) => {
    if (!cameraInputModal) return;
    stopCaptureVideoTimer();
    if (cameraMediaRecorder && cameraMediaRecorder.state !== "inactive") {
      cameraMediaRecorder._discardCapture = !saveVideo;
      cameraMediaRecorder.stop();
    }
    cameraMediaRecorder = undefined;
    stopCameraMedia();
    cameraInputModal.hidden = true;
    cameraInputModal.classList.remove("photo-mode");
    body.classList.remove("camera-input-open");
    captureVideoButton?.classList.remove("active");
    captureVideoPreview?.classList.remove("active");
    if (!saveVideo && cameraMode === "video" && captureVideoButton) {
      captureVideoElapsed = 0;
      updateCaptureVideoTimer();
      captureVideoButton.innerHTML = captureVideoObjectUrl
        ? '<i data-lucide="video"></i><span>Record Again</span>'
        : '<i data-lucide="video"></i><span>Start Video</span>';
    }
    window.lucide?.createIcons();
  };

  const openCameraInput = async (mode = "video") => {
    if (!cameraInputModal || !cameraLiveVideo) return;
    closeVoiceInput();
    closeCameraInput();
    cameraMode = mode;
    captureVideoElapsed = 0;
    updateCaptureVideoTimer();
    resetCameraControls();
    cameraInputModal.hidden = false;
    cameraInputModal.dataset.mode = mode;
    cameraInputModal.classList.toggle("photo-mode", mode === "photo");
    body.classList.add("camera-input-open");
    if (cameraInputTitle) cameraInputTitle.textContent = mode === "photo"
      ? "Take Patient Photo"
      : "Video Input - Patient Explanation";
    if (cameraInputSubtitle) cameraInputSubtitle.textContent = mode === "photo"
      ? "Position the concern clearly inside the camera frame."
      : "Record the patient explaining their concern.";
    if (cameraPauseButton) cameraPauseButton.hidden = mode === "photo";
    if (cameraStopButton) cameraStopButton.hidden = mode === "photo";
    if (cameraDeleteButton) cameraDeleteButton.hidden = mode === "photo";
    if (cameraCaptureButton) cameraCaptureButton.hidden = mode !== "photo";
    if (cameraRecBadge) cameraRecBadge.hidden = mode === "photo";
    if (cameraLiveTimer) cameraLiveTimer.hidden = mode === "photo";

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is unavailable");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode === "photo" ? "environment" : "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: mode === "video"
          ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          : false,
      });
      if (cameraInputModal.hidden) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraMediaStream = stream;
      cameraLiveVideo.srcObject = stream;
      await cameraLiveVideo.play();
      cameraStatus?.classList.add("hidden");
      if (cameraCaptureButton) cameraCaptureButton.disabled = false;

      if (mode === "video") {
        if (!window.MediaRecorder) throw new Error("Video recording is unavailable in this browser");
        const recorder = new MediaRecorder(stream);
        const recordedChunks = [];
        recorder._discardCapture = false;
        recorder.addEventListener("dataavailable", (event) => {
          if (event.data?.size) recordedChunks.push(event.data);
        });
        recorder.addEventListener("stop", () => {
          if (recorder._discardCapture || !recordedChunks.length) return;
          const type = recorder.mimeType || recordedChunks[0].type || "video/webm";
          renderCapturedVideo(URL.createObjectURL(new Blob(recordedChunks, { type })));
          showToast("Patient video recorded");
        });
        cameraMediaRecorder = recorder;
        recorder.start();
        captureVideoButton?.classList.add("active");
        captureVideoPreview?.classList.add("active");
        if (captureVideoButton) captureVideoButton.innerHTML = '<i data-lucide="square"></i><span>Recording...</span>';
        captureVideoInterval = window.setInterval(() => {
          captureVideoElapsed += 1;
          updateCaptureVideoTimer();
          if (captureVideoElapsed >= 120) closeCameraInput({ saveVideo: true });
        }, 1000);
      }
      window.lucide?.createIcons();
    } catch (error) {
      stopCaptureVideoTimer();
      stopCameraMedia();
      if (cameraStatus) {
        cameraStatus.classList.remove("hidden");
        cameraStatus.innerHTML = `<i data-lucide="camera-off"></i><strong>Device unavailable</strong><span>${getDeviceErrorMessage("camera", error)}</span>`;
      }
      if (cameraPauseButton) cameraPauseButton.disabled = true;
      if (cameraStopButton) cameraStopButton.disabled = true;
      if (cameraCaptureButton) cameraCaptureButton.disabled = true;
      showToast(getDeviceErrorMessage("camera", error));
      window.lucide?.createIcons();
    }
  };

  captureVideoButton?.addEventListener("click", () => void openCameraInput("video"));
  capturePhotoButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    void openCameraInput("photo");
  });
  document.querySelectorAll("[data-camera-close]").forEach((button) => {
    button.addEventListener("click", () => closeCameraInput());
  });
  cameraPauseButton?.addEventListener("click", () => {
    if (!cameraMediaStream || cameraMode !== "video") return;
    cameraPaused = !cameraPaused;
    cameraMediaStream.getTracks().forEach((track) => { track.enabled = !cameraPaused; });
    if (cameraMediaRecorder?.state === "recording" && cameraPaused) cameraMediaRecorder.pause();
    else if (cameraMediaRecorder?.state === "paused" && !cameraPaused) cameraMediaRecorder.resume();
    if (cameraPauseButton) {
      cameraPauseButton.innerHTML = cameraPaused ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';
      cameraPauseButton.setAttribute("aria-label", cameraPaused ? "Resume video" : "Pause video");
    }
    if (cameraPaused) stopCaptureVideoTimer();
    else {
      captureVideoInterval = window.setInterval(() => {
        captureVideoElapsed += 1;
        updateCaptureVideoTimer();
        if (captureVideoElapsed >= 120) closeCameraInput({ saveVideo: true });
      }, 1000);
    }
    cameraRecBadge?.classList.toggle("paused", cameraPaused);
    window.lucide?.createIcons();
  });
  cameraStopButton?.addEventListener("click", () => closeCameraInput({ saveVideo: true }));
  cameraDeleteButton?.addEventListener("click", () => {
    closeCameraInput();
    showToast("Video recording cancelled");
  });
  cameraCaptureButton?.addEventListener("click", () => {
    if (cameraMode !== "photo") return;
    if (!cameraLiveVideo?.videoWidth || !cameraLiveVideo.videoHeight) {
      showToast("The camera is still loading. Please try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = cameraLiveVideo.videoWidth;
    canvas.height = cameraLiveVideo.videoHeight;
    canvas.getContext("2d").drawImage(cameraLiveVideo, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return showToast("The photo could not be captured. Please try again.");
      captureImageUrls.push(URL.createObjectURL(blob));
      renderCaptureImageUrls();
      closeCameraInput();
      showToast("Patient photo captured");
    }, "image/jpeg", .92);
  });

  patientCaptureToggle?.addEventListener("click", () => {
    const collapsed = patientCapture?.classList.toggle("collapsed") || false;
    patientCaptureToggle.setAttribute("aria-expanded", String(!collapsed));
    patientCaptureToggle.setAttribute("aria-label", collapsed ? "Expand patient input" : "Collapse patient input");
    patientCaptureToggle.innerHTML = collapsed
      ? '<i data-lucide="chevron-down"></i>'
      : '<i data-lucide="chevron-up"></i>';
    if (collapsed && cameraInputModal && !cameraInputModal.hidden) closeCameraInput();
    window.lucide?.createIcons();
  });

  const renderCaptureImageUrls = () => {
    if (!captureImagePreviews) return;
    const visible = captureImageUrls.slice(0, 3)
      .map((url, index) => `<button type="button" data-capture-image-index="${index}" aria-label="Enlarge patient upload ${index + 1}"><img src="${url}" alt="Patient upload ${index + 1}"></button>`);
    if (captureImageUrls.length > 3) {
      visible.push(`<span class="capture-more">+${captureImageUrls.length - 3}<br>More</span>`);
    }
    captureImagePreviews.innerHTML = visible.join("");
  };

  const closeCaptureImageLightbox = () => {
    if (!captureImageLightbox) return;
    captureImageLightbox.hidden = true;
    body.classList.remove("capture-image-lightbox-open");
    if (captureImageLightboxImage) captureImageLightboxImage.src = "";
  };

  const openCaptureImageLightbox = (index) => {
    const url = captureImageUrls[index];
    if (!url || !captureImageLightbox || !captureImageLightboxImage) return;
    captureImageLightboxImage.src = url;
    captureImageLightboxImage.alt = `Enlarged patient upload ${index + 1}`;
    captureImageLightbox.hidden = false;
    body.classList.add("capture-image-lightbox-open");
    window.requestAnimationFrame(() => {
      captureImageLightbox.querySelector(".capture-image-lightbox-close")?.focus();
    });
  };

  captureImagePreviews?.addEventListener("click", (event) => {
    const preview = event.target.closest("[data-capture-image-index]");
    if (!preview) return;
    openCaptureImageLightbox(Number(preview.dataset.captureImageIndex));
  });
  document.querySelectorAll("[data-image-lightbox-close]").forEach((button) => {
    button.addEventListener("click", closeCaptureImageLightbox);
  });

  const renderCaptureImages = (fileList) => {
    if (!captureImagePreviews) return;
    const files = [...fileList].filter((file) =>
      ["image/jpeg", "image/png"].includes(file.type) && file.size <= 10 * 1024 * 1024
    );
    if (!files.length) return showToast("Choose JPG or PNG images up to 10MB");
    captureImageUrls.push(...files.map((file) => URL.createObjectURL(file)));
    renderCaptureImageUrls();
    showToast(`${files.length} patient image${files.length === 1 ? "" : "s"} added`);
  };

  captureBrowseButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!captureImageUpload) return;
    captureImageUpload.value = "";
    captureImageUpload.click();
  });
  captureImageUpload?.addEventListener("change", () => renderCaptureImages(captureImageUpload.files));
  ["dragenter", "dragover"].forEach((type) => captureUploadZone?.addEventListener(type, (event) => {
    event.preventDefault();
    captureUploadZone.classList.add("dragover");
  }));
  ["dragleave", "drop"].forEach((type) => captureUploadZone?.addEventListener(type, (event) => {
    event.preventDefault();
    captureUploadZone.classList.remove("dragover");
  }));
  captureUploadZone?.addEventListener("drop", (event) => renderCaptureImages(event.dataTransfer.files));

  const closeMobileSidebar = () => {
    body.classList.remove("sidebar-open");
    if (window.innerWidth <= 900) sidebarToggle?.setAttribute("aria-expanded", "false");
  };

  sidebarToggle?.addEventListener("click", () => {
    if (window.innerWidth <= 900) {
      const open = !body.classList.contains("sidebar-open");
      body.classList.toggle("sidebar-open", open);
      sidebarToggle.setAttribute("aria-expanded", String(open));
      return;
    }

    body.classList.toggle("sidebar-collapsed");
    sidebarToggle.setAttribute("aria-expanded", String(!body.classList.contains("sidebar-collapsed")));
  });

  mobileOverlay?.addEventListener("click", closeMobileSidebar);

  profileButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = !profile.classList.contains("open");
    profile.classList.toggle("open", open);
    profileButton.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".doctor-profile")) {
      profile?.classList.remove("open");
      profileButton?.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      search?.focus();
    }
    if (event.key === "Escape") {
      if (captureImageLightbox && !captureImageLightbox.hidden) {
        closeCaptureImageLightbox();
        return;
      }
      if (cameraInputModal && !cameraInputModal.hidden) {
        closeCameraInput();
        return;
      }
      if (voiceInputModal && !voiceInputModal.hidden) {
        closeVoiceInput();
        return;
      }
      search?.blur();
      closeMobileSidebar();
    }
  });

  search?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && search.value.trim()) showToast(`Searching Divinexa for “${search.value.trim()}”`);
  });

  document.querySelectorAll("[data-message]").forEach((control) => {
    control.addEventListener("click", () => showToast(control.dataset.message));
  });

  document.querySelectorAll("[data-single-select]").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      group.querySelectorAll("button").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });

  document.querySelectorAll("[data-multi-select]").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button || button.matches("[data-factor-other]")) return;
      button.classList.toggle("selected");
    });
  });

  document.querySelectorAll("[data-factor-dropdown]").forEach((panel) => {
    const factorType = panel.dataset.factorDropdown;
    const trigger = document.querySelector(`[data-factor-other="${factorType}"]`);
    const input = panel.querySelector("[data-factor-input]");
    const addButton = panel.querySelector("[data-factor-add]");
    const selectedList = panel.querySelector("[data-factor-selected]");
    const optionsWrap = panel.querySelector("[data-factor-options]");
    const valueField = panel.querySelector("[data-factor-value]");
    const factorLabel = panel.dataset.factorLabel || "factors";
    const selectedFactors = new Set();
    const section = panel.closest(".input-section");
    section?.classList.add("has-factor-dropdown");

    const positionPanel = () => {
      if (panel.hidden || !trigger || !section) return;
      const triggerRect = trigger.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      const panelWidth = panel.offsetWidth || 238;
      panel.style.top = `${triggerRect.bottom - sectionRect.top + 6}px`;
      panel.style.left = `${Math.max(0, Math.min(triggerRect.left - sectionRect.left, section.clientWidth - panelWidth))}px`;
    };

    const closeFactorDropdown = () => {
      panel.hidden = true;
      trigger?.classList.toggle("selected", selectedFactors.size > 0);
    };

    const renderFactors = () => {
      selectedList.replaceChildren(...[...selectedFactors].map((value) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.dataset.factorRemove = value;
        const label = document.createElement("span");
        label.textContent = value;
        const icon = document.createElement("i");
        icon.setAttribute("data-lucide", "x");
        chip.append(label, icon);
        chip.setAttribute("aria-label", `Remove ${value}`);
        return chip;
      }));
      selectedList.classList.toggle("has-values", selectedFactors.size > 0);
      panel.querySelectorAll("[data-factor-option]").forEach((option) => {
        const selected = selectedFactors.has(option.dataset.factorOption);
        option.classList.toggle("selected", selected);
        option.setAttribute("aria-pressed", String(selected));
      });
      if (valueField) valueField.value = [...selectedFactors].join(", ");
      const countBadge = trigger?.querySelector("[data-factor-count]");
      if (countBadge) {
        countBadge.textContent = String(selectedFactors.size);
        countBadge.hidden = selectedFactors.size === 0;
      }
      trigger?.setAttribute(
        "aria-label",
        selectedFactors.size
          ? `Other ${factorLabel}, ${selectedFactors.size} selected`
          : `Other ${factorLabel}`
      );
      trigger?.classList.toggle("selected", selectedFactors.size > 0 || !panel.hidden);
      window.lucide?.createIcons();
    };

    const filterFactors = () => {
      const query = input.value.trim().toLowerCase();
      optionsWrap.querySelectorAll("[data-factor-option]").forEach((option) => {
        option.hidden = Boolean(query) && !option.dataset.factorOption.toLowerCase().includes(query);
      });
    };

    const addCustomFactor = () => {
      const value = input.value.trim().replace(/,$/, "");
      if (!value) {
        input.focus();
        showToast("Type a factor, then click Add");
        return;
      }
      selectedFactors.add(value);
      input.value = "";
      filterFactors();
      renderFactors();
      input.focus();
    };

    trigger?.addEventListener("click", (event) => {
      event.stopPropagation();
      const shouldOpen = panel.hidden;
      document.querySelectorAll("[data-factor-dropdown]").forEach((otherPanel) => {
        if (otherPanel !== panel) otherPanel._factorDropdownControl?.close();
      });
      panel.hidden = !shouldOpen;
      renderFactors();
      if (shouldOpen) {
        window.requestAnimationFrame(() => {
          positionPanel();
          input.focus();
        });
      }
    });

    optionsWrap?.addEventListener("click", (event) => {
      const option = event.target.closest("[data-factor-option]");
      if (!option) return;
      const value = option.dataset.factorOption;
      if (selectedFactors.has(value)) selectedFactors.delete(value);
      else selectedFactors.add(value);
      renderFactors();
      input.focus();
    });

    selectedList?.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-factor-remove]");
      if (!chip) return;
      selectedFactors.delete(chip.dataset.factorRemove);
      renderFactors();
      input.focus();
    });

    input?.addEventListener("input", filterFactors);
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        addCustomFactor();
      } else if (event.key === "Escape") {
        closeFactorDropdown();
        trigger?.focus();
      }
    });
    addButton?.addEventListener("click", addCustomFactor);
    panel.querySelector("[data-factor-close]")?.addEventListener("click", () => {
      closeFactorDropdown();
      trigger?.focus();
    });
    panel._factorDropdownControl = { close: closeFactorDropdown, position: positionPanel, trigger };
    renderFactors();
  });

  document.addEventListener("click", (event) => {
    document.querySelectorAll("[data-factor-dropdown]").forEach((panel) => {
      const control = panel._factorDropdownControl;
      if (!control || panel.hidden) return;
      const clickPath = event.composedPath();
      if (!clickPath.includes(panel) && !clickPath.includes(control.trigger)) control.close();
    });
  });

  window.addEventListener("resize", () => {
    document.querySelectorAll("[data-factor-dropdown]:not([hidden])").forEach((panel) => {
      panel._factorDropdownControl?.position();
    });
  });

  document.querySelector(".chief-complaint-grid")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-complaint-choice]");
    if (!button) return;
    if (button.dataset.complaintChoice === "Other") {
      const morePanel = document.getElementById("complaintMorePanel");
      const shouldOpen = button.classList.contains("selected");
      if (morePanel) morePanel.hidden = !shouldOpen;
      if (shouldOpen) {
        window.setTimeout(() => {
          complaintInput?.focus();
          renderComplaintResults();
        }, 0);
      } else {
        selectedComplaints.clear();
        renderComplaintChips();
        closeComplaintResults();
      }
    }
    syncComplaintValue();
  });

  const syncPainBodyMap = () => {
    const selectedLocations = new Set(
      [...document.querySelectorAll(".pain-location-options button.selected")].map((button) => button.dataset.painLocation)
    );
    document.querySelectorAll("[data-pain-point]").forEach((point) => {
      const active = selectedLocations.has(point.dataset.painPoint);
      point.classList.toggle("active", active);
      point.setAttribute("aria-pressed", String(active));
    });
  };
  document.querySelector(".pain-location-options")?.addEventListener("click", (event) => {
    if (event.target.closest("button")) window.requestAnimationFrame(syncPainBodyMap);
  });
  document.querySelector(".pain-body-map")?.addEventListener("click", (event) => {
    const point = event.target.closest("[data-pain-point]");
    if (!point) return;
    const option = [...document.querySelectorAll(".pain-location-options [data-pain-location]")]
      .find((button) => button.dataset.painLocation === point.dataset.painPoint);
    if (!option) return;
    option.classList.toggle("selected");
    syncPainBodyMap();
    option.focus({ preventScroll: true });
  });
  syncPainBodyMap();

  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".result-card");
      const editing = card.classList.toggle("editing");
      button.innerHTML = editing
        ? '<i data-lucide="check"></i> Done'
        : '<i data-lucide="pencil"></i> Edit';
      card.querySelectorAll("p, strong:not(.medicine-number), li").forEach((item) => {
        item.contentEditable = editing ? "true" : "false";
      });
      window.lucide?.createIcons();
      showToast(editing ? "This section is now editable" : "Section changes saved");
    });
  });

  const treatmentCard = document.querySelector(".treatment-card");
  const medicineEditor = document.getElementById("medicineEditor");
  const treatmentTemplateModal = document.getElementById("treatmentTemplateModal");
  const treatmentTemplatesButton = document.querySelector("[data-treatment-templates]");
  const treatmentTemplateSearch = document.getElementById("treatmentTemplateSearch");
  const treatmentTemplateOptions = document.getElementById("treatmentTemplateOptions");
  const treatmentTemplatePreviewTitle = document.getElementById("treatmentTemplatePreviewTitle");
  const treatmentTemplatePreviewDescription = document.getElementById("treatmentTemplatePreviewDescription");
  const treatmentTemplatePreviewMedicines = document.getElementById("treatmentTemplatePreviewMedicines");
  const treatmentTemplateUseButton = document.querySelector("[data-template-modal-use]");
  const treatmentTemplateMoreMenu = document.querySelector(".treatment-template-more-menu");
  const treatmentTemplateMoreToggle = document.querySelector("[data-template-more-toggle]");
  const saveTreatmentTemplateModal = document.getElementById("saveTreatmentTemplateModal");
  const saveTreatmentTemplateButton = document.querySelector("[data-treatment-save-template]");
  const saveTreatmentTemplateForm = document.getElementById("saveTreatmentTemplateForm");
  const saveTemplateName = document.getElementById("saveTemplateName");
  const saveTemplateCategory = document.getElementById("saveTemplateCategory");
  const saveTemplateDescription = document.getElementById("saveTemplateDescription");
  const saveTemplateTags = document.getElementById("saveTemplateTags");
  const saveTemplateTagInput = document.getElementById("saveTemplateTagInput");
  const saveTemplateMedicineCount = document.getElementById("saveTemplateMedicineCount");
  const saveTemplateMedicinePreview = document.getElementById("saveTemplateMedicinePreview");
  const treatmentPlanSource = document.getElementById("treatmentPlanSource");
  const inputPanel = document.querySelector(".input-panel");
  const complaintControl = document.getElementById("complaintControl");
  const complaintInput = document.getElementById("chiefComplaint");
  const complaintResults = document.getElementById("complaintResults");
  const complaintValue = document.getElementById("chiefComplaintValue");
  const currentMedicineControl = document.getElementById("currentMedicineControl");
  const currentMedicineInput = document.getElementById("currentMedicineSearch");
  const currentMedicineResults = document.getElementById("currentMedicineResults");
  const currentMedicinesValue = document.getElementById("currentMedicinesValue");
  const addMedicineForm = document.getElementById("addMedicineForm");
  const addMedicineInput = document.getElementById("addMedicineSearch");
  const addMedicineResults = document.getElementById("addMedicineResults");
  const addCategorySelect = document.getElementById("addCategory");
  const addDoseInput = document.getElementById("addDose");
  const addDoseUnitSelect = document.getElementById("addDoseUnit");
  const addFrequencySelect = document.getElementById("addFrequency");
  const addDurationInput = document.getElementById("addDuration");
  const addDurationUnitSelect = document.getElementById("addDurationUnit");
  const addRouteSelect = document.getElementById("addRoute");
  const addPurposeSelect = document.getElementById("addPurpose");
  const addAdditionalInput = document.getElementById("addAdditional");
  const addNotes = document.getElementById("addNotes");
  const addNotesCount = document.getElementById("addNotesCount");
  const medicineInput = document.getElementById("editMedicine");
  const medicineAutocomplete = document.getElementById("medicineAutocomplete");
  const medicineResults = document.getElementById("medicineResults");
  const categorySelect = document.getElementById("editCategory");
  const doseInput = document.getElementById("editDose");
  const doseUnitSelect = document.getElementById("editDoseUnit");
  const frequencySelect = document.getElementById("editFrequency");
  const durationInput = document.getElementById("editDuration");
  const durationUnitSelect = document.getElementById("editDurationUnit");
  const routeSelect = document.getElementById("editRoute");
  const purposeSelect = document.getElementById("editPurpose");
  const notesInput = document.getElementById("editNotes");
  const notesCount = document.getElementById("notesCount");
  let medicineCatalogue = Array.isArray(window.DIVINEXA_MEDICINES) ? window.DIVINEXA_MEDICINES : [];
  let selectedMedicineRecord = null;
  let activeMedicineResult = -1;
  let showAllMedicineResults = false;
  let selectedAddMedicineRecord = null;
  let activeAddMedicineResult = -1;
  let complaintCatalogue = Array.isArray(window.DIVINEXA_CHIEF_COMPLAINTS) ? window.DIVINEXA_CHIEF_COMPLAINTS : [];
  let activeComplaintResult = -1;
  const selectedComplaints = new Set(
    [...document.querySelectorAll("[data-complaint-value]")].map((chip) => chip.dataset.complaintValue)
  );
  let activeCurrentMedicineResult = -1;
  let selectedTreatmentTemplate = "fever";
  let activeTreatmentCategory = "all";
  const selectedSaveTemplateTags = new Set();
  const selectedCurrentMedicineIds = new Set(
    [...document.querySelectorAll("[data-current-medicine-id]")].map((chip) => chip.dataset.currentMedicineId)
  );
  let selectedMedicineRow = treatmentCard?.querySelector("[data-medicine-row]") || null;

  if (window.location.protocol !== "file:") {
    window.fetch("assets/data/medicines.json")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Medicine data unavailable")))
      .then((records) => {
        if (Array.isArray(records) && records.length) medicineCatalogue = records;
      })
      .catch(() => {});
    window.fetch("assets/data/clinical-options.json")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Clinical options unavailable")))
      .then((records) => {
        if (Array.isArray(records) && records.length) complaintCatalogue = records;
      })
      .catch(() => {});
  }

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);

  const selectAvailableValue = (select, value) => {
    if (!select || !value) return;
    let option = [...select.options].find((item) => item.value.toLowerCase() === String(value).toLowerCase());
    if (!option) {
      option = new Option(value, value);
      select.add(option);
    }
    select.value = option.value;
    select._commonSelect?.refresh();
  };

  const commonSelects = [];

  const closeCommonSelects = (except = null) => {
    commonSelects.forEach((control) => {
      if (control.root !== except) {
        control.root.classList.remove("open");
        control.trigger.setAttribute("aria-expanded", "false");
        if (control.root.closest(".history-grid")) {
          control.root.closest(".input-panel")?.classList.remove("history-select-open");
        }
        control.root.closest(".investigation-card")?.classList.remove("investigation-select-open");
      }
    });
  };

  const enhanceCommonSelect = (select) => {
    if (!select || select._commonSelect) return;
    select.classList.add("common-select-native");

    const root = document.createElement("div");
    root.className = "common-select";
    root.innerHTML = `
      <button class="common-select-trigger" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false">
        <span></span><i data-lucide="chevron-down"></i>
      </button>
      <div class="common-select-menu" role="listbox"></div>
    `;
    select.insertAdjacentElement("afterend", root);

    const trigger = root.querySelector(".common-select-trigger");
    const valueLabel = trigger.querySelector("span");
    const menu = root.querySelector(".common-select-menu");

    const refresh = () => {
      const selected = select.options[select.selectedIndex] || select.options[0];
      valueLabel.textContent = selected?.textContent || "";
      menu.innerHTML = [...select.options].map((option) => `
        <button class="common-select-option${option.selected ? " selected" : ""}" type="button" role="option" aria-selected="${option.selected}" data-common-value="${escapeHtml(option.value)}">
          <span>${escapeHtml(option.textContent)}</span><i data-lucide="check"></i>
        </button>
      `).join("");
      window.lucide?.createIcons();
    };

    const setOpen = (open) => {
      closeCommonSelects(open ? root : null);
      root.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
      if (root.closest(".history-grid")) {
        root.closest(".input-panel")?.classList.toggle("history-select-open", open);
      }
      root.closest(".investigation-card")?.classList.toggle("investigation-select-open", open);
      if (open) window.requestAnimationFrame(() => menu.querySelector(".selected")?.focus());
    };

    trigger.addEventListener("click", () => setOpen(!root.classList.contains("open")));
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    });

    menu.addEventListener("click", (event) => {
      const option = event.target.closest("[data-common-value]");
      if (!option) return;
      select.value = option.dataset.commonValue;
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

    const control = { root, trigger, refresh };
    select._commonSelect = control;
    commonSelects.push(control);
    refresh();
  };

  document.querySelectorAll("#patientBloodGroup, #medicineEditor select, #addMedicineForm select, .history-grid select, #investigationEditor select, #investigationAddForm select, #saveTemplateCategory").forEach(enhanceCommonSelect);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".common-select")) closeCommonSelects();
  });

  const followPlanner = document.getElementById("followPlanner");
  const followSpecialistAutocomplete = document.getElementById("followSpecialistAutocomplete");
  const followSpecialistSearch = document.getElementById("followSpecialistSearch");
  const followSpecialistValue = document.getElementById("followSpecialist");
  const followSpecialistResults = document.getElementById("followSpecialistResults");
  const followupNotes = document.getElementById("followupNotes");
  const followCustomDate = document.getElementById("followCustomDate");
  const followCustomDateInput = document.getElementById("followCustomDateInput");
  const followCustomDateLabel = document.getElementById("followCustomDateLabel");
  const followCustomDateCalendar = document.getElementById("followCustomDateCalendar");
  let followSpecialists = Array.isArray(window.DIVINEXA_DOCTORS) ? window.DIVINEXA_DOCTORS : [];
  let activeFollowSpecialist = -1;
  let showAllFollowSpecialists = false;

  if (window.location.protocol !== "file:") {
    window.fetch("assets/data/doctors.json")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Doctor directory unavailable")))
      .then((records) => {
        if (!Array.isArray(records) || !records.length) return;
        followSpecialists = records;
        if (followSpecialistAutocomplete?.classList.contains("open")) {
          renderFollowSpecialists(followSpecialistSearch?.value || "");
        }
      })
      .catch(() => {});
  }

  const findFollowSpecialists = (query = "") => {
    const term = query.trim().toLowerCase();
    return followSpecialists
      .map((doctor) => {
        const searchable = [
          doctor.name, doctor.department, doctor.qualification, doctor.hospital,
          doctor.city, doctor.consultationType
        ].map((value) => String(value || "").toLowerCase());
        let score = doctor.popular ? 1 : 0;
        if (!term) score += doctor.popular ? 20 : 0;
        else if (searchable[0].startsWith(term)) score += 100;
        else if (searchable[1].startsWith(term)) score += 85;
        else if (searchable[0].includes(term)) score += 70;
        else if (searchable[1].includes(term)) score += 60;
        else if (searchable.some((value) => value.includes(term))) score += 35;
        else return null;
        return { doctor, score };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score || left.doctor.name.localeCompare(right.doctor.name))
      .map(({ doctor }) => doctor);
  };

  const renderFollowSpecialists = (query = "") => {
    if (!followSpecialistResults) return [];
    const matches = findFollowSpecialists(query);
    const visible = showAllFollowSpecialists ? matches : matches.slice(0, 7);
    activeFollowSpecialist = -1;
    followSpecialistResults.innerHTML = visible.length
      ? visible.map((doctor) => `
          <button class="follow-specialist-result" type="button" role="option"
            data-follow-specialist="${escapeHtml(doctor.name)}" data-follow-department="${escapeHtml(doctor.department)}">
            <span class="follow-specialist-main"><strong>${escapeHtml(doctor.name)}</strong><i data-lucide="badge-check"></i></span>
            <span class="follow-specialist-department">${escapeHtml(doctor.department)}</span>
            <span class="follow-specialist-meta">
              <b>${escapeHtml(doctor.qualification)}</b><span>•</span><span>${escapeHtml(doctor.experience)}</span>
              <span>•</span><span>${escapeHtml(doctor.hospital)}, ${escapeHtml(doctor.city)}</span>
              ${doctor.popular ? '<em class="popular-badge">Popular</em>' : ""}
            </span>
          </button>
        `).join("")
      : '<div class="follow-specialist-empty">No matching specialist found</div>';
    if (!showAllFollowSpecialists && matches.length > visible.length) {
      followSpecialistResults.insertAdjacentHTML("beforeend", `
        <button class="medicine-results-footer" type="button" data-show-all-follow-specialists>
          <span>See all ${matches.length} matching doctors</span><i data-lucide="chevron-right"></i>
        </button>
      `);
    }
    window.lucide?.createIcons();
    return matches;
  };

  const openFollowSpecialists = () => {
    showAllFollowSpecialists = false;
    renderFollowSpecialists(followSpecialistValue?.value ? "" : followSpecialistSearch?.value || "");
    followSpecialistAutocomplete?.classList.add("open");
    followSpecialistSearch?.setAttribute("aria-expanded", "true");
  };

  const closeFollowSpecialists = () => {
    followSpecialistAutocomplete?.classList.remove("open");
    followSpecialistSearch?.setAttribute("aria-expanded", "false");
    activeFollowSpecialist = -1;
  };

  const selectFollowSpecialist = (name, department = "") => {
    if (!name) return;
    followSpecialistSearch.value = department ? `${name} - ${department}` : name;
    followSpecialistValue.value = department ? `${name} (${department})` : name;
    closeFollowSpecialists();
    showToast(`${name}${department ? `, ${department}` : ""} selected for referral`);
  };

  followSpecialistSearch?.addEventListener("focus", openFollowSpecialists);
  followSpecialistSearch?.addEventListener("input", () => {
    followSpecialistValue.value = "";
    showAllFollowSpecialists = false;
    openFollowSpecialists();
  });
  followSpecialistSearch?.addEventListener("keydown", (event) => {
    const options = [...followSpecialistResults.querySelectorAll("[data-follow-specialist]")];
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!followSpecialistAutocomplete.classList.contains("open")) openFollowSpecialists();
      if (!options.length) return;
      activeFollowSpecialist = event.key === "ArrowDown"
        ? (activeFollowSpecialist + 1) % options.length
        : (activeFollowSpecialist - 1 + options.length) % options.length;
      options.forEach((item, index) => item.classList.toggle("active", index === activeFollowSpecialist));
      options[activeFollowSpecialist]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && activeFollowSpecialist >= 0) {
      event.preventDefault();
      const option = options[activeFollowSpecialist];
      selectFollowSpecialist(option?.dataset.followSpecialist, option?.dataset.followDepartment);
    } else if (event.key === "Escape") {
      closeFollowSpecialists();
    }
  });
  followSpecialistResults?.addEventListener("click", (event) => {
    if (event.target.closest("[data-show-all-follow-specialists]")) {
      showAllFollowSpecialists = true;
      renderFollowSpecialists(followSpecialistSearch?.value || "");
      return;
    }
    const option = event.target.closest("[data-follow-specialist]");
    if (option) selectFollowSpecialist(option.dataset.followSpecialist, option.dataset.followDepartment);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#followSpecialistAutocomplete")) closeFollowSpecialists();
  });

  document.querySelectorAll("[data-follow-single]").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      group.querySelectorAll("button").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      if (group.classList.contains("next-visit-options") && followCustomDate) {
        const isCustom = button.dataset.followDate === "Custom";
        followCustomDate.hidden = !isCustom;
        if (isCustom) {
          window.setTimeout(() => {
            followCustomDateInput?.focus();
            openFollowDateCalendar();
          }, 20);
        } else {
          closeFollowDateCalendar();
        }
      }
      window.lucide?.createIcons();
    });
  });

  const followMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const followDayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const followToday = new Date();
  followToday.setHours(0, 0, 0, 0);
  const followMaximumDate = new Date(followToday);
  followMaximumDate.setFullYear(followMaximumDate.getFullYear() + 2);
  const followDateState = {
    month: followToday.getMonth(),
    year: followToday.getFullYear(),
    selected: null
  };
  const sameFollowDate = (left, right) => left && right
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
  const formatFollowDisplayDate = (date) => [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear()
  ].join("/");
  const formatFollowLongDate = (date) => new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "2-digit", month: "short", year: "numeric"
  }).format(date);
  const isAllowedFollowDate = (date) => date >= followToday && date <= followMaximumDate;
  const followDatePicker = window.DivinexaDatePicker?.bind(followCustomDateInput, {
    field: followCustomDate,
    trigger: followCustomDate?.querySelector(".follow-custom-date-control"),
    calendar: followCustomDateCalendar,
    classPrefix: "follow-date",
    fixed: true,
    width: 340,
    minDate: followToday,
    maxDate: followMaximumDate,
    ignoreSelector: "[data-follow-date-clear]",
    onSelect(date) {
      followCustomDateLabel.textContent = formatFollowLongDate(date);
      showToast(`Custom follow-up set for ${followCustomDateLabel.textContent}`);
    },
    onClear() {
      followCustomDateLabel.textContent = "Choose a date";
    }
  });

  function closeFollowDateCalendar() {
    if (followDatePicker) {
      followDatePicker.close();
      return;
    }
    if (!followCustomDateCalendar) return;
    followCustomDateCalendar.hidden = true;
    followCustomDateInput?.setAttribute("aria-expanded", "false");
  }

  function positionFollowDateCalendar() {
    if (!followCustomDateCalendar || followCustomDateCalendar.hidden) return;
    const control = followCustomDate?.querySelector(".follow-custom-date-control");
    if (!control) return;
    const controlRect = control.getBoundingClientRect();
    const viewportGap = 12;
    const anchorGap = 7;
    const calendarWidth = Math.min(340, window.innerWidth - (viewportGap * 2));
    followCustomDateCalendar.style.width = `${calendarWidth}px`;
    const calendarHeight = followCustomDateCalendar.offsetHeight;
    const roomBelow = window.innerHeight - controlRect.bottom - anchorGap - viewportGap;
    const placeAbove = roomBelow < calendarHeight && controlRect.top > calendarHeight + anchorGap + viewportGap;
    const preferredTop = placeAbove
      ? controlRect.top - calendarHeight - anchorGap
      : controlRect.bottom + anchorGap;
    const top = Math.max(viewportGap, Math.min(preferredTop, window.innerHeight - calendarHeight - viewportGap));
    const left = Math.max(
      viewportGap,
      Math.min(controlRect.left, window.innerWidth - calendarWidth - viewportGap)
    );
    followCustomDateCalendar.style.top = `${top}px`;
    followCustomDateCalendar.style.left = `${left}px`;
  }

  function renderFollowDateCalendar() {
    if (!followCustomDateCalendar) return;
    const firstDay = new Date(followDateState.year, followDateState.month, 1).getDay();
    const daysInMonth = new Date(followDateState.year, followDateState.month + 1, 0).getDate();
    const months = followMonthNames.map((month, index) => (
      `<option value="${index}"${index === followDateState.month ? " selected" : ""}>${month}</option>`
    )).join("");
    const years = [];
    for (let year = followToday.getFullYear(); year <= followMaximumDate.getFullYear(); year += 1) years.push(year);
    const yearOptions = years.map((year) => (
      `<option value="${year}"${year === followDateState.year ? " selected" : ""}>${year}</option>`
    )).join("");
    let days = followDayNames.map((day) => `<span class="follow-date-weekday">${day}</span>`).join("");
    days += '<span class="follow-date-empty"></span>'.repeat(firstDay);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(followDateState.year, followDateState.month, day);
      const selected = sameFollowDate(date, followDateState.selected);
      const today = sameFollowDate(date, followToday);
      days += `<button type="button" class="follow-date-day${selected ? " is-selected" : ""}${today ? " is-today" : ""}" data-follow-calendar-day="${day}"${isAllowedFollowDate(date) ? "" : " disabled"}>${day}</button>`;
    }
    const previous = new Date(followDateState.year, followDateState.month - 1, 1);
    const next = new Date(followDateState.year, followDateState.month + 1, 1);
    const previousDisabled = previous < new Date(followToday.getFullYear(), followToday.getMonth(), 1);
    const nextDisabled = next > new Date(followMaximumDate.getFullYear(), followMaximumDate.getMonth(), 1);
    followCustomDateCalendar.innerHTML = `
      <div class="follow-date-head">
        <button type="button" class="follow-date-nav" data-follow-calendar-prev aria-label="Previous month"${previousDisabled ? " disabled" : ""}><i data-lucide="chevron-left"></i></button>
        <div class="follow-date-jump">
          <select data-follow-calendar-month aria-label="Month">${months}</select>
          <select data-follow-calendar-year aria-label="Year">${yearOptions}</select>
        </div>
        <button type="button" class="follow-date-nav" data-follow-calendar-next aria-label="Next month"${nextDisabled ? " disabled" : ""}><i data-lucide="chevron-right"></i></button>
      </div>
      <div class="follow-date-grid">${days}</div>
    `;
    window.lucide?.createIcons();
  }

  function openFollowDateCalendar() {
    if (followDatePicker) {
      followDatePicker.open();
      return;
    }
    if (!followCustomDateCalendar) return;
    renderFollowDateCalendar();
    followCustomDateCalendar.hidden = false;
    followCustomDateInput?.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(positionFollowDateCalendar);
  }

  const moveFollowCalendar = (offset) => {
    const next = new Date(followDateState.year, followDateState.month + offset, 1);
    followDateState.year = next.getFullYear();
    followDateState.month = next.getMonth();
    renderFollowDateCalendar();
    window.requestAnimationFrame(positionFollowDateCalendar);
  };

  if (!followDatePicker) followCustomDate?.querySelector(".follow-custom-date-control")?.addEventListener("click", (event) => {
    if (event.target.closest("[data-follow-date-clear]") || event.target.closest(".follow-date-calendar")) return;
    openFollowDateCalendar();
  });
  if (!followDatePicker) followCustomDateCalendar?.addEventListener("change", (event) => {
    if (event.target.matches("[data-follow-calendar-month]")) followDateState.month = Number(event.target.value);
    if (event.target.matches("[data-follow-calendar-year]")) followDateState.year = Number(event.target.value);
    renderFollowDateCalendar();
  });
  if (!followDatePicker) followCustomDateCalendar?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.target.closest("[data-follow-calendar-prev]")) moveFollowCalendar(-1);
    if (event.target.closest("[data-follow-calendar-next]")) moveFollowCalendar(1);
    const dayButton = event.target.closest("[data-follow-calendar-day]");
    if (!dayButton || dayButton.disabled) return;
    followDateState.selected = new Date(followDateState.year, followDateState.month, Number(dayButton.dataset.followCalendarDay));
    followCustomDateInput.value = formatFollowDisplayDate(followDateState.selected);
    followCustomDateInput.dataset.iso = [
      followDateState.selected.getFullYear(),
      String(followDateState.selected.getMonth() + 1).padStart(2, "0"),
      String(followDateState.selected.getDate()).padStart(2, "0")
    ].join("-");
    followCustomDateLabel.textContent = formatFollowLongDate(followDateState.selected);
    closeFollowDateCalendar();
    showToast(`Custom follow-up set for ${followCustomDateLabel.textContent}`);
  });
  followCustomDate?.querySelector("[data-follow-date-clear]")?.addEventListener("click", (event) => {
    if (followDatePicker) {
      event.stopPropagation();
      followDatePicker.clear();
      followCustomDateInput.focus();
      return;
    }
    followCustomDateInput.value = "";
    delete followCustomDateInput.dataset.iso;
    followDateState.selected = null;
    followCustomDateLabel.textContent = "Choose a date";
    closeFollowDateCalendar();
    followCustomDateInput.focus();
  });
  if (!followDatePicker) document.addEventListener("click", (event) => {
    if (!event.composedPath().includes(followCustomDate)) closeFollowDateCalendar();
  });
  if (!followDatePicker) {
    window.addEventListener("scroll", positionFollowDateCalendar, true);
    window.addEventListener("resize", positionFollowDateCalendar);
  }

  followPlanner?.querySelector("[data-follow-apply]")?.addEventListener("click", () => {
    followPlanner.querySelectorAll("[data-follow-single]").forEach((group) => {
      group.querySelectorAll("button").forEach((button) => {
        const selected = button.dataset.followDate === "3 Days" || button.dataset.followType === "In Clinic";
        button.classList.toggle("selected", selected);
      });
    });
    const suggestedChecklist = new Set(["Review Lab Reports", "Review Symptoms", "Medication Review"]);
    followPlanner.querySelectorAll(".follow-checklist input").forEach((input) => {
      input.checked = suggestedChecklist.has(input.value);
    });
    if (followupNotes) {
      followupNotes.value = "Continue antibiotics for 3 days and use paracetamol if fever persists.\nMaintain hydration and steam inhalation twice daily.\nReview symptoms, vitals and lab reports at the follow-up visit.\nSeek urgent care for breathing difficulty or fever above 101°F.";
    }
    if (followCustomDate) followCustomDate.hidden = true;
    showToast("AI follow-up suggestion applied");
  });

  followPlanner?.querySelector("[data-follow-add-note]")?.addEventListener("click", () => {
    followupNotes?.focus();
    followupNotes?.setSelectionRange(followupNotes.value.length, followupNotes.value.length);
  });
  followPlanner?.querySelector("[data-follow-ai-note]")?.addEventListener("click", () => {
    if (followupNotes) {
      followupNotes.value = "Continue prescribed medicines and maintain adequate hydration.\nReview symptoms, vital signs and pending lab reports in 3 days.\nReturn earlier for worsening fever, chest pain or breathing difficulty.";
      followupNotes.focus();
    }
    showToast("AI follow-up note generated");
  });
  followPlanner?.querySelector("[data-follow-template]")?.addEventListener("click", () => {
    if (followupNotes) {
      followupNotes.value = "Medication: Continue as prescribed.\nMonitoring: Track temperature and symptoms daily.\nFollow-up: Attend the selected follow-up appointment.\nUrgent advice: Seek immediate care if symptoms worsen.";
      followupNotes.focus();
    }
    showToast("Follow-up template applied");
  });
  followPlanner?.querySelector("[data-follow-voice-note]")?.addEventListener("click", () => {
    void openVoiceInput();
    showToast("Voice note recording opened");
  });

  const investigationCard = document.getElementById("investigationCard");
  const investigationTags = document.getElementById("investigationTags");
  const investigationEditor = document.getElementById("investigationEditor");
  const investigationAddForm = document.getElementById("investigationAddForm");
  const investigationEditButton = investigationCard?.querySelector("[data-investigation-edit]");
  const investigationEditorIcon = document.getElementById("investigationEditorIcon");
  const investigationEditorName = document.getElementById("investigationEditorName");
  const investigationEditorFullName = document.getElementById("investigationEditorFullName");
  const investigationShortName = document.getElementById("investigationShortName");
  const investigationShortCount = document.getElementById("investigationShortCount");
  const investigationPriority = document.getElementById("investigationPriority");
  const investigationFasting = document.getElementById("investigationFasting");
  const newInvestigationName = document.getElementById("newInvestigationName");
  const newInvestigationResults = document.getElementById("newInvestigationResults");
  const newInvestigationShort = document.getElementById("newInvestigationShort");
  const newInvestigationPriority = document.getElementById("newInvestigationPriority");
  const newInvestigationFasting = document.getElementById("newInvestigationFasting");
  let selectedInvestigationChip = investigationTags?.querySelector(".investigation-chip") || null;
  let activeInvestigationResult = -1;

  const investigationDefinitions = {
    "CBC": { full: "Complete Blood Count", icon: "test-tube-2", short: "CBC" },
    "CRP": { full: "C-Reactive Protein", icon: "test-tube-2", short: "CRP" },
    "ESR": { full: "Erythrocyte Sedimentation Rate", icon: "syringe", short: "ESR" },
    "Chest X-Ray": { full: "Chest Radiograph", icon: "scan-line", short: "Chest X-Ray" },
    "Blood Sugar (F)": { full: "Fasting Blood Sugar", icon: "droplet", short: "Blood Sugar (F)" },
    "Sputum Routine": { full: "Sputum Routine Examination", icon: "microscope", short: "Sputum Routine" },
    "Urine Routine": { full: "Urine Routine Examination", icon: "test-tube", short: "Urine Routine" },
    "Liver Function Test": { full: "Liver Function Test", icon: "activity", short: "LFT" },
    "Kidney Function Test": { full: "Kidney Function Test", icon: "flask-conical", short: "KFT" },
    "ECG": { full: "Electrocardiogram", icon: "heart-pulse", short: "ECG" }
  };

  const findInvestigationDefinition = (value) => {
    const term = value.trim().toLowerCase();
    const entry = Object.entries(investigationDefinitions)
      .find(([name, definition]) => name.toLowerCase() === term || definition.short.toLowerCase() === term);
    return entry ? { name: entry[0], ...entry[1] } : null;
  };

  const closeInvestigationResults = () => {
    newInvestigationResults?.classList.remove("open");
    newInvestigationName?.setAttribute("aria-expanded", "false");
    activeInvestigationResult = -1;
  };

  const renderInvestigationResults = (query = "") => {
    if (!newInvestigationResults || !newInvestigationName) return;
    const term = query.trim().toLowerCase();
    const matches = Object.entries(investigationDefinitions)
      .map(([name, definition]) => ({ name, ...definition }))
      .filter((item) => !term
        || item.name.toLowerCase().includes(term)
        || item.full.toLowerCase().includes(term)
        || item.short.toLowerCase().includes(term));

    newInvestigationResults.innerHTML = matches.length
      ? matches.map((item) => `
          <button class="investigation-search-option" type="button" role="option"
            data-investigation-option="${escapeHtml(item.name)}">
            <i data-lucide="${escapeHtml(item.icon)}"></i>
            <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.full)}</small></span>
            <em>${escapeHtml(item.short)}</em>
          </button>
        `).join("")
      : '<div class="investigation-search-empty">No matching investigation found</div>';

    newInvestigationResults.classList.add("open");
    newInvestigationName.setAttribute("aria-expanded", "true");
    activeInvestigationResult = -1;
    window.lucide?.createIcons();
  };

  const selectInvestigationSuggestion = (name) => {
    const definition = investigationDefinitions[name];
    if (!definition || !newInvestigationName) return;
    newInvestigationName.value = name;
    if (newInvestigationShort) newInvestigationShort.value = definition.short;
    closeInvestigationResults();
    newInvestigationShort?.focus();
  };

  const setInvestigationEditLabel = (editing) => {
    if (!investigationEditButton) return;
    investigationEditButton.innerHTML = editing
      ? '<i data-lucide="check"></i> Done'
      : '<i data-lucide="pencil"></i> Edit';
    window.lucide?.createIcons();
  };

  const closeInvestigationEditor = () => {
    investigationCard?.classList.remove("investigation-editing");
    setInvestigationEditLabel(false);
  };

  const closeInvestigationAdd = () => {
    investigationCard?.classList.remove("investigation-adding");
    investigationAddForm?.reset();
    [newInvestigationPriority, newInvestigationFasting].forEach((select) => select?._commonSelect?.refresh());
    closeInvestigationResults();
  };

  const openInvestigationEditor = (chip = selectedInvestigationChip) => {
    if (!chip || !investigationCard) return;
    closeInvestigationAdd();
    selectedInvestigationChip = chip;
    investigationTags.querySelectorAll(".investigation-chip").forEach((item) => item.classList.toggle("selected", item === chip));
    investigationEditorName.textContent = chip.dataset.investigationName;
    investigationEditorFullName.textContent = chip.dataset.investigationFull;
    investigationShortName.value = chip.dataset.investigationName;
    investigationShortCount.textContent = String(investigationShortName.value.length);
    investigationEditorIcon.setAttribute("data-lucide", chip.dataset.investigationIcon || "test-tube-2");
    selectAvailableValue(investigationPriority, chip.dataset.investigationPriority || "Routine");
    selectAvailableValue(investigationFasting, chip.dataset.investigationFasting || "No");
    investigationCard.classList.add("investigation-editing");
    setInvestigationEditLabel(true);
    window.lucide?.createIcons();
  };

  const removeInvestigation = (chip = selectedInvestigationChip) => {
    if (!chip) return;
    const next = chip.nextElementSibling || chip.previousElementSibling;
    chip.remove();
    selectedInvestigationChip = next?.classList.contains("investigation-chip") ? next : null;
    if (selectedInvestigationChip) openInvestigationEditor(selectedInvestigationChip);
    else closeInvestigationEditor();
    showToast("Investigation removed");
  };

  investigationEditButton?.addEventListener("click", () => {
    if (investigationCard.classList.contains("investigation-editing")) closeInvestigationEditor();
    else openInvestigationEditor(selectedInvestigationChip || investigationTags.querySelector(".investigation-chip"));
  });

  investigationTags?.addEventListener("click", (event) => {
    const chip = event.target.closest(".investigation-chip");
    if (!chip) return;
    if (event.target.closest(".investigation-chip-remove")) removeInvestigation(chip);
    else if (event.target.closest("[data-investigation-select]")) openInvestigationEditor(chip);
  });

  investigationShortName?.addEventListener("input", () => {
    investigationShortCount.textContent = String(investigationShortName.value.length);
  });

  investigationEditor?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedInvestigationChip || !investigationShortName.value.trim()) return;
    const shortName = investigationShortName.value.trim();
    selectedInvestigationChip.dataset.investigationName = shortName;
    selectedInvestigationChip.dataset.investigationPriority = investigationPriority.value;
    selectedInvestigationChip.dataset.investigationFasting = investigationFasting.value;
    selectedInvestigationChip.querySelector("[data-investigation-select] span").textContent = shortName;
    investigationEditorName.textContent = shortName;
    closeInvestigationEditor();
    showToast("Investigation updated");
  });

  investigationEditor?.querySelector("[data-investigation-remove]")?.addEventListener("click", () => removeInvestigation());
  investigationEditor?.querySelector("[data-investigation-close]")?.addEventListener("click", closeInvestigationEditor);

  investigationCard?.querySelector("[data-investigation-add]")?.addEventListener("click", () => {
    closeInvestigationEditor();
    investigationCard.classList.add("investigation-adding");
    window.requestAnimationFrame(() => newInvestigationName?.focus());
  });

  investigationCard?.querySelectorAll("[data-investigation-add-cancel]").forEach((button) => {
    button.addEventListener("click", closeInvestigationAdd);
  });

  newInvestigationName?.addEventListener("focus", () => renderInvestigationResults(newInvestigationName.value));
  newInvestigationName?.addEventListener("input", () => {
    const definition = findInvestigationDefinition(newInvestigationName.value);
    if (definition && newInvestigationShort) newInvestigationShort.value = definition.short;
    renderInvestigationResults(newInvestigationName.value);
  });
  newInvestigationName?.addEventListener("keydown", (event) => {
    const options = [...newInvestigationResults.querySelectorAll(".investigation-search-option")];
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      activeInvestigationResult = Math.min(activeInvestigationResult + 1, options.length - 1);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      activeInvestigationResult = Math.max(activeInvestigationResult - 1, 0);
    } else if (event.key === "Enter" && activeInvestigationResult >= 0) {
      event.preventDefault();
      return selectInvestigationSuggestion(options[activeInvestigationResult].dataset.investigationOption);
    } else if (event.key === "Escape") {
      return closeInvestigationResults();
    } else {
      return;
    }
    options.forEach((option, index) => option.classList.toggle("active", index === activeInvestigationResult));
    options[activeInvestigationResult]?.scrollIntoView({ block: "nearest" });
  });

  newInvestigationResults?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-investigation-option]");
    if (option) selectInvestigationSuggestion(option.dataset.investigationOption);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".investigation-autocomplete")) closeInvestigationResults();
  });

  investigationAddForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const selectedDefinition = findInvestigationDefinition(newInvestigationName.value);
    const sourceName = selectedDefinition?.name || "";
    const shortName = newInvestigationShort.value.trim();
    const definition = investigationDefinitions[sourceName];
    if (!sourceName || !shortName || !definition) return showToast("Select an investigation and enter its short name");
    const duplicate = [...investigationTags.querySelectorAll(".investigation-chip")]
      .some((chip) => chip.dataset.investigationFull.toLowerCase() === definition.full.toLowerCase());
    if (duplicate) return showToast("This investigation is already added");

    const chip = document.createElement("div");
    chip.className = "investigation-chip";
    chip.dataset.investigationName = shortName;
    chip.dataset.investigationFull = definition.full;
    chip.dataset.investigationIcon = definition.icon;
    chip.dataset.investigationPriority = newInvestigationPriority.value;
    chip.dataset.investigationFasting = newInvestigationFasting.value;
    chip.innerHTML = `<button type="button" data-investigation-select><i data-lucide="${escapeHtml(definition.icon)}"></i><span>${escapeHtml(shortName)}</span></button><button class="investigation-chip-remove" type="button" aria-label="Remove ${escapeHtml(shortName)}"><i data-lucide="x"></i></button>`;
    investigationTags.append(chip);
    selectedInvestigationChip = chip;
    closeInvestigationAdd();
    window.lucide?.createIcons();
    showToast("Investigation added");
  });

  const adviceCard = document.getElementById("adviceCard");
  const adviceGrid = document.getElementById("adviceGrid");
  const adviceEditorList = document.getElementById("adviceEditorList");
  const adviceSearch = document.getElementById("adviceSearch");
  const adviceSuggestions = document.getElementById("adviceSuggestions");
  const adviceQuickAdd = document.getElementById("adviceQuickAdd");
  const adviceAddSelectedButton = adviceCard?.querySelector("[data-advice-add-selected]");
  const adviceEditButton = adviceCard?.querySelector("[data-advice-edit]");
  let adviceCategory = "All";
  let adviceSource = "suggestions";
  let draggedAdviceId = "";
  let selectedAdviceSuggestions = new Set();
  let adviceTemplateFormOpen = false;
  let editingAdviceTemplateId = "";
  let adviceItems = [
    { id: "warm-fluids", text: "Drink plenty of warm fluids", icon: "droplets" },
    { id: "steam", text: "Steam inhalation twice daily", icon: "waves" },
    { id: "after-food", text: "Take medicines after food", icon: "pill" },
    { id: "full-course", text: "Complete full course of antibiotics", icon: "shield-check" },
    { id: "no-smoking", text: "Avoid smoking and cold drinks", icon: "cigarette-off" },
    { id: "follow-up", text: "Follow up if not better in 3 days", icon: "clock-3" }
  ];
  let adviceDraft = [];

  const adviceCatalogue = [
    { id: "gargle", text: "Gargle with warm salt water", category: "General", icon: "glass-water", source: "suggestions" },
    { id: "avoid-cold", text: "Avoid cold beverages", category: "Diet & Lifestyle", icon: "cup-soda", source: "suggestions" },
    { id: "fluids", text: "Increase fluid intake", category: "General", icon: "droplets", source: "suggestions" },
    { id: "mask", text: "Use mask in public", category: "Hygiene", icon: "shield", source: "suggestions" },
    { id: "light-diet", text: "Eat light and healthy diet", category: "Diet & Lifestyle", icon: "salad", source: "suggestions" },
    { id: "rest-stress", text: "Take rest and avoid stress", category: "General", icon: "bed", source: "suggestions" },
    { id: "cover-mouth", text: "Cover mouth while coughing or sneezing", category: "Hygiene", icon: "hand", source: "suggestions" },
    { id: "warm-fluids-quick", text: "Warm fluids", category: "Diet & Lifestyle", icon: "droplets", source: "frequent", quick: true },
    { id: "steam-quick", text: "Steam inhalation", category: "General", icon: "waves", source: "frequent", quick: true },
    { id: "bed-rest", text: "Bed rest", category: "General", icon: "bed", source: "frequent", quick: true },
    { id: "ors", text: "ORS", category: "Diet & Lifestyle", icon: "cup-soda", source: "frequent", quick: true },
    { id: "vitamin-c", text: "Vitamin C", category: "Medication", icon: "shield-check", source: "templates", quick: true },
    { id: "soft-diet", text: "Soft diet", category: "Diet & Lifestyle", icon: "salad", source: "templates", quick: true },
    { id: "no-smoking-quick", text: "No smoking", category: "Diet & Lifestyle", icon: "cigarette-off", source: "frequent", quick: true },
    { id: "follow-up-quick", text: "Follow-up", category: "Follow-up", icon: "clock-3", source: "frequent", quick: true },
    { id: "sleep", text: "Adequate sleep", category: "General", icon: "moon-star", source: "templates", quick: true }
  ];

  const makeAdviceId = () => `advice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const renderAdviceGrid = (items = adviceCard?.classList.contains("advice-editing") ? adviceDraft : adviceItems) => {
    if (!adviceGrid) return;
    adviceGrid.innerHTML = items.map((item) => `
      <div class="advice-item" data-advice-id="${escapeHtml(item.id)}">
        <i data-lucide="${escapeHtml(item.icon)}"></i>
        <span>${escapeHtml(item.text)}</span>
        <button class="advice-item-remove" type="button" aria-label="Remove ${escapeHtml(item.text)}" data-advice-card-remove>
          <i data-lucide="x"></i>
        </button>
      </div>
    `).join("");
    window.lucide?.createIcons();
  };

  const renderAdviceEditor = () => {
    if (!adviceEditorList) return;
    adviceEditorList.innerHTML = adviceDraft.map((item) => `
      <div class="advice-editor-row" draggable="true" data-advice-editor-id="${escapeHtml(item.id)}">
        <i class="advice-drag" data-lucide="grip-vertical"></i>
        <i data-lucide="${escapeHtml(item.icon)}"></i>
        <input value="${escapeHtml(item.text)}" aria-label="Advice text">
        <button class="advice-row-action" type="button" aria-label="Save advice"><i data-lucide="check"></i></button>
        <button class="advice-row-action delete" type="button" aria-label="Delete advice" data-advice-row-delete><i data-lucide="trash-2"></i></button>
      </div>
    `).join("");
    window.lucide?.createIcons();
  };

  const closeAdviceEditor = (save = false) => {
    if (!adviceCard) return;
    if (save) {
      adviceItems = adviceDraft.filter((item) => item.text.trim()).map((item) => ({ ...item, text: item.text.trim() }));
      showToast("Advice updated");
    }
    adviceCard.classList.remove("advice-editing");
    renderAdviceGrid(adviceItems);
  };

  const openAdviceEditor = () => {
    if (!adviceCard) return;
    adviceCard.classList.remove("advice-adding");
    adviceDraft = adviceItems.map((item) => ({ ...item }));
    adviceCard.classList.add("advice-editing");
    renderAdviceGrid(adviceDraft);
    renderAdviceEditor();
  };

  const updateAdviceSelectedCount = () => {
    if (adviceAddSelectedButton) adviceAddSelectedButton.textContent = `Add Selected (${selectedAdviceSuggestions.size})`;
  };

  const renderAdvicePicker = () => {
    if (!adviceSuggestions || !adviceQuickAdd) return;
    const term = adviceSearch?.value.trim().toLowerCase() || "";
    const visible = adviceCatalogue.filter((item) => (adviceSource === "suggestions" ? !item.quick : item.source === adviceSource)
      && (adviceCategory === "All" || item.category === adviceCategory)
      && (!term || item.text.toLowerCase().includes(term) || item.category.toLowerCase().includes(term)));

    if (adviceSource === "templates") {
      const editing = adviceCatalogue.find((item) => item.id === editingAdviceTemplateId);
      adviceSuggestions.innerHTML = `
        <div class="advice-template-heading">
          <h5>My Templates</h5>
          <button type="button" data-advice-new-template><i data-lucide="plus"></i> New Template</button>
        </div>
        <div class="advice-template-list">
          ${visible.length ? visible.map((item) => `
            <div class="advice-template-row${selectedAdviceSuggestions.has(item.id) ? " selected" : ""}">
              <button class="advice-template-pick" type="button" data-advice-pick="${escapeHtml(item.id)}">
                <span class="check"><i data-lucide="check"></i></span>
                <span>${escapeHtml(item.name || item.text)}</span>
              </button>
              <button class="advice-template-action" type="button" data-advice-template-edit="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(item.name || item.text)}"><i data-lucide="pencil"></i></button>
              <button class="advice-template-action delete" type="button" data-advice-template-delete="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.name || item.text)}"><i data-lucide="trash-2"></i></button>
            </div>
          `).join("") : '<div class="advice-suggestion-empty">No matching templates found</div>'}
        </div>
        <form class="advice-template-form${adviceTemplateFormOpen ? " open" : ""}" id="adviceTemplateForm">
          <header><i data-lucide="file-plus-2"></i><strong>${editing ? "Edit Template" : "Save New Template"}</strong><button type="button" data-advice-template-collapse aria-label="Close template form"><i data-lucide="chevron-up"></i></button></header>
          <div class="advice-template-form-grid">
            <label><span>Template Name <sup>*</sup></span><input id="adviceTemplateName" value="${escapeHtml(editing?.name || editing?.text || "")}" placeholder="Enter template name" required></label>
            <label><span>Category <sup>*</sup></span>
              <select id="adviceTemplateCategory">
                ${["General", "Diet & Lifestyle", "Medication", "Hygiene", "Follow-up"].map((category) => `<option${(editing?.category || "General") === category ? " selected" : ""}>${escapeHtml(category)}</option>`).join("")}
              </select>
            </label>
            <label class="wide"><span>Advice / Content <sup>*</sup></span><textarea id="adviceTemplateContent" maxlength="500" placeholder="Enter advice or instruction..." required>${escapeHtml(editing?.text || "")}</textarea><small><span data-advice-template-count>${(editing?.text || "").length}</span>/500</small></label>
          </div>
          <footer><button type="button" data-advice-template-cancel>Cancel</button><button class="save" type="submit">${editing ? "Update Template" : "Save Template"}</button></footer>
        </form>`;
      adviceSuggestions.classList.add("template-mode");
      const categorySelect = document.getElementById("adviceTemplateCategory");
      if (categorySelect) enhanceCommonSelect(categorySelect);
    } else {
      adviceSuggestions.classList.remove("template-mode");
      adviceSuggestions.innerHTML = visible.length
        ? visible.map((item) => `
            <button class="advice-suggestion${selectedAdviceSuggestions.has(item.id) ? " selected" : ""}" type="button" data-advice-pick="${escapeHtml(item.id)}">
              <span class="check"><i data-lucide="check"></i></span><span>${escapeHtml(item.text)}</span><i data-lucide="plus"></i>
            </button>
          `).join("")
        : '<div class="advice-suggestion-empty">No matching advice found</div>';
    }

    adviceQuickAdd.innerHTML = adviceCatalogue.filter((item) => item.quick).map((item) => `
      <button class="advice-quick-option${selectedAdviceSuggestions.has(item.id) ? " selected" : ""}" type="button" data-advice-pick="${escapeHtml(item.id)}">
        <i data-lucide="${escapeHtml(item.icon)}"></i><span>${escapeHtml(item.text)}</span>
      </button>
    `).join("");
    updateAdviceSelectedCount();
    window.lucide?.createIcons();
  };

  const closeAdviceAdd = () => {
    adviceCard?.classList.remove("advice-adding");
    selectedAdviceSuggestions = new Set();
    adviceTemplateFormOpen = false;
    editingAdviceTemplateId = "";
    updateAdviceSelectedCount();
  };

  const openAdviceAdd = () => {
    if (!adviceCard) return;
    adviceCard.classList.remove("advice-editing");
    renderAdviceGrid(adviceItems);
    selectedAdviceSuggestions = new Set();
    adviceCategory = "All";
    adviceSource = "suggestions";
    adviceTemplateFormOpen = false;
    editingAdviceTemplateId = "";
    if (adviceSearch) adviceSearch.value = "";
    adviceCard.querySelectorAll("[data-advice-category]").forEach((button) => button.classList.toggle("active", button.dataset.adviceCategory === "All"));
    adviceCard.querySelectorAll("[data-advice-tab]").forEach((button) => button.classList.toggle("active", button.dataset.adviceTab === "suggestions"));
    adviceCard.classList.add("advice-adding");
    renderAdvicePicker();
    window.requestAnimationFrame(() => adviceSearch?.focus());
  };

  adviceEditButton?.addEventListener("click", () => {
    if (adviceCard.classList.contains("advice-editing")) closeAdviceEditor(true);
    else openAdviceEditor();
  });
  adviceCard?.querySelector("[data-advice-edit-cancel]")?.addEventListener("click", () => closeAdviceEditor(false));
  adviceCard?.querySelector("[data-advice-edit-done]")?.addEventListener("click", () => closeAdviceEditor(true));
  adviceCard?.querySelector("[data-advice-add]")?.addEventListener("click", openAdviceAdd);
  adviceCard?.querySelector("[data-advice-editor-add]")?.addEventListener("click", () => {
    adviceDraft.push({ id: makeAdviceId(), text: "New advice", icon: "lightbulb" });
    renderAdviceGrid(adviceDraft);
    renderAdviceEditor();
    window.requestAnimationFrame(() => {
      const input = adviceEditorList?.querySelector("[data-advice-editor-id]:last-child input");
      input?.select();
      input?.focus();
    });
  });
  adviceCard?.querySelector("[data-advice-add-cancel]")?.addEventListener("click", closeAdviceAdd);

  adviceGrid?.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-advice-card-remove]");
    if (!remove || !adviceCard.classList.contains("advice-editing")) return;
    const id = remove.closest("[data-advice-id]").dataset.adviceId;
    adviceDraft = adviceDraft.filter((item) => item.id !== id);
    renderAdviceGrid(adviceDraft);
    renderAdviceEditor();
  });

  adviceEditorList?.addEventListener("input", (event) => {
    const row = event.target.closest("[data-advice-editor-id]");
    if (!row || !event.target.matches("input")) return;
    const item = adviceDraft.find((entry) => entry.id === row.dataset.adviceEditorId);
    if (item) item.text = event.target.value;
    renderAdviceGrid(adviceDraft);
  });

  adviceEditorList?.addEventListener("click", (event) => {
    const row = event.target.closest("[data-advice-editor-id]");
    if (!row) return;
    if (event.target.closest("[data-advice-row-delete]")) {
      adviceDraft = adviceDraft.filter((item) => item.id !== row.dataset.adviceEditorId);
      renderAdviceGrid(adviceDraft);
      renderAdviceEditor();
    } else if (event.target.closest(".advice-row-action")) {
      showToast("Advice item saved");
    }
  });

  adviceEditorList?.addEventListener("dragstart", (event) => {
    const row = event.target.closest("[data-advice-editor-id]");
    if (!row) return;
    draggedAdviceId = row.dataset.adviceEditorId;
    row.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
  });
  adviceEditorList?.addEventListener("dragover", (event) => event.preventDefault());
  adviceEditorList?.addEventListener("drop", (event) => {
    event.preventDefault();
    const target = event.target.closest("[data-advice-editor-id]");
    if (!target || !draggedAdviceId || target.dataset.adviceEditorId === draggedAdviceId) return;
    const from = adviceDraft.findIndex((item) => item.id === draggedAdviceId);
    const to = adviceDraft.findIndex((item) => item.id === target.dataset.adviceEditorId);
    const [moved] = adviceDraft.splice(from, 1);
    adviceDraft.splice(to, 0, moved);
    renderAdviceGrid(adviceDraft);
    renderAdviceEditor();
  });
  adviceEditorList?.addEventListener("dragend", () => {
    draggedAdviceId = "";
    adviceEditorList.querySelectorAll(".dragging").forEach((row) => row.classList.remove("dragging"));
  });

  adviceCard?.querySelectorAll("[data-advice-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      adviceSource = button.dataset.adviceTab;
      adviceTemplateFormOpen = false;
      editingAdviceTemplateId = "";
      adviceCard.querySelectorAll("[data-advice-tab]").forEach((item) => item.classList.toggle("active", item === button));
      renderAdvicePicker();
    });
  });
  adviceCard?.querySelectorAll("[data-advice-category]").forEach((button) => {
    button.addEventListener("click", () => {
      adviceCategory = button.dataset.adviceCategory;
      adviceCard.querySelectorAll("[data-advice-category]").forEach((item) => item.classList.toggle("active", item === button));
      renderAdvicePicker();
    });
  });
  adviceSearch?.addEventListener("input", renderAdvicePicker);
  [adviceSuggestions, adviceQuickAdd].forEach((container) => container?.addEventListener("click", (event) => {
    const newTemplate = event.target.closest("[data-advice-new-template]");
    if (newTemplate) {
      adviceTemplateFormOpen = true;
      editingAdviceTemplateId = "";
      renderAdvicePicker();
      window.requestAnimationFrame(() => document.getElementById("adviceTemplateName")?.focus());
      return;
    }
    const editTemplate = event.target.closest("[data-advice-template-edit]");
    if (editTemplate) {
      adviceTemplateFormOpen = true;
      editingAdviceTemplateId = editTemplate.dataset.adviceTemplateEdit;
      renderAdvicePicker();
      window.requestAnimationFrame(() => document.getElementById("adviceTemplateName")?.focus());
      return;
    }
    const deleteTemplate = event.target.closest("[data-advice-template-delete]");
    if (deleteTemplate) {
      const id = deleteTemplate.dataset.adviceTemplateDelete;
      const index = adviceCatalogue.findIndex((item) => item.id === id);
      if (index >= 0) adviceCatalogue.splice(index, 1);
      selectedAdviceSuggestions.delete(id);
      if (editingAdviceTemplateId === id) {
        editingAdviceTemplateId = "";
        adviceTemplateFormOpen = false;
      }
      renderAdvicePicker();
      showToast("Advice template deleted");
      return;
    }
    if (event.target.closest("[data-advice-template-collapse], [data-advice-template-cancel]")) {
      adviceTemplateFormOpen = false;
      editingAdviceTemplateId = "";
      renderAdvicePicker();
      return;
    }
    const option = event.target.closest("[data-advice-pick]");
    if (!option) return;
    const id = option.dataset.advicePick;
    if (selectedAdviceSuggestions.has(id)) selectedAdviceSuggestions.delete(id);
    else selectedAdviceSuggestions.add(id);
    renderAdvicePicker();
  }));
  adviceSuggestions?.addEventListener("input", (event) => {
    if (!event.target.matches("#adviceTemplateContent")) return;
    const count = adviceSuggestions.querySelector("[data-advice-template-count]");
    if (count) count.textContent = String(event.target.value.length);
  });
  adviceSuggestions?.addEventListener("submit", (event) => {
    if (!event.target.matches("#adviceTemplateForm")) return;
    event.preventDefault();
    const name = document.getElementById("adviceTemplateName")?.value.trim();
    const category = document.getElementById("adviceTemplateCategory")?.value;
    const text = document.getElementById("adviceTemplateContent")?.value.trim();
    if (!name || !category || !text) return showToast("Complete all template fields");
    const existing = adviceCatalogue.find((item) => item.id === editingAdviceTemplateId);
    if (existing) Object.assign(existing, { name, category, text });
    else adviceCatalogue.push({ id: makeAdviceId(), name, text, category, icon: "file-text", source: "templates", quick: false });
    adviceTemplateFormOpen = false;
    editingAdviceTemplateId = "";
    renderAdvicePicker();
    showToast(existing ? "Advice template updated" : "Advice template saved");
  });
  adviceAddSelectedButton?.addEventListener("click", () => {
    if (!selectedAdviceSuggestions.size) return showToast("Select at least one advice");
    const existing = new Set(adviceItems.map((item) => item.text.toLowerCase()));
    selectedAdviceSuggestions.forEach((id) => {
      const source = adviceCatalogue.find((item) => item.id === id);
      if (source && !existing.has(source.text.toLowerCase())) {
        adviceItems.push({ id: makeAdviceId(), text: source.text, icon: source.icon });
        existing.add(source.text.toLowerCase());
      }
    });
    closeAdviceAdd();
    renderAdviceGrid(adviceItems);
    showToast("Selected advice added");
  });

  renderAdviceGrid(adviceItems);

  const medicineDetail = (row, name) => row?.querySelector(`[data-medicine-detail="${name}"] strong`)?.textContent.trim() || "";

  const closeMedicineResults = () => {
    medicineResults?.classList.remove("open");
    medicineInput?.setAttribute("aria-expanded", "false");
    activeMedicineResult = -1;
  };

  const findMedicines = (query) => {
    const term = query.trim().toLowerCase();
    const ranked = medicineCatalogue.map((medicine) => {
      const brand = medicine.brandName.toLowerCase();
      const generic = medicine.genericName.toLowerCase();
      const manufacturer = medicine.manufacturer.toLowerCase();
      const category = medicine.category.toLowerCase();
      let score = medicine.popular ? 1 : 0;
      if (!term) score += medicine.popular ? 20 : 0;
      else if (brand.startsWith(term)) score += 100;
      else if (generic.startsWith(term)) score += 80;
      else if (brand.includes(term)) score += 65;
      else if (generic.includes(term)) score += 55;
      else if (manufacturer.includes(term)) score += 35;
      else if (category.includes(term)) score += 20;
      else return null;
      return { medicine, score };
    }).filter(Boolean);

    return ranked.sort((a, b) => b.score - a.score || a.medicine.brandName.localeCompare(b.medicine.brandName)).map((item) => item.medicine);
  };

  const closeComplaintResults = () => {
    complaintResults?.classList.remove("open");
    complaintInput?.setAttribute("aria-expanded", "false");
    inputPanel?.classList.remove("complaint-open");
    activeComplaintResult = -1;
  };

  const syncComplaintValue = () => {
    if (!complaintValue) return;
    const primaryComplaints = [...document.querySelectorAll(".chief-complaint-grid [data-complaint-choice].selected")]
      .map((item) => item.dataset.complaintChoice)
      .filter((value) => value && value !== "Other");
    complaintValue.value = [...new Set([...primaryComplaints, ...selectedComplaints])].join(", ");
  };

  const renderComplaintChips = () => {
    if (!complaintControl) return;
    complaintControl.querySelectorAll(".complaint-chip").forEach((chip) => chip.remove());
    const search = complaintControl.querySelector(".complaint-search");
    [...selectedComplaints].forEach((value) => {
      const chip = document.createElement("span");
      chip.className = "complaint-chip";
      chip.dataset.complaintValue = value;
      chip.innerHTML = `<span>${escapeHtml(value)}</span><button type="button" aria-label="Remove ${escapeHtml(value)}"><i data-lucide="x"></i></button>`;
      search.insertAdjacentElement("beforebegin", chip);
    });
    syncComplaintValue();
    window.lucide?.createIcons();
  };

  const renderComplaintResults = (query = complaintInput?.value || "") => {
    if (!complaintResults) return;
    const customValue = query.trim();
    const term = customValue.toLowerCase();
    const matches = complaintCatalogue
      .filter((item) => !term || item.value.toLowerCase().includes(term) || item.category.toLowerCase().includes(term))
      .slice(0, 10);
    const hasExactMatch = complaintCatalogue.some((item) => item.value.toLowerCase() === term);
    const customOption = customValue && !hasExactMatch
      ? `
        <button class="complaint-custom-option" type="button" role="option" data-complaint-custom="${escapeHtml(customValue)}">
          <span class="complaint-custom-icon"><i data-lucide="plus"></i></span>
          <span><strong>Add “${escapeHtml(customValue)}”</strong><small>Use as a custom complaint</small></span>
        </button>
      `
      : "";

    const catalogueOptions = matches.length
      ? matches.map((item) => {
          const selected = selectedComplaints.has(item.value);
          return `
            <button class="complaint-option${selected ? " selected" : ""}" type="button" role="option"
              aria-selected="${selected}" data-complaint-option="${escapeHtml(item.value)}">
              <span class="complaint-checkbox"><i data-lucide="check"></i></span>
              <span><strong>${escapeHtml(item.value)}</strong><small>${escapeHtml(item.category)}</small></span>
              <span class="complaint-selected-label">${selected ? "Selected" : ""}</span>
            </button>
          `;
        }).join("")
      : customOption
        ? ""
        : '<div class="complaint-empty">No matching complaint found. Type a complaint and press Enter to add it.</div>';
    complaintResults.innerHTML = `${customOption}${catalogueOptions}`;

    complaintResults.classList.add("open");
    complaintInput.setAttribute("aria-expanded", "true");
    inputPanel?.classList.add("complaint-open");
    activeComplaintResult = -1;
    window.lucide?.createIcons();
  };

  const toggleComplaint = (value) => {
    if (!value) return;
    if (selectedComplaints.has(value)) selectedComplaints.delete(value);
    else selectedComplaints.add(value);
    if (complaintInput) complaintInput.value = "";
    renderComplaintChips();
    renderComplaintResults("");
    window.requestAnimationFrame(() => complaintInput?.focus());
  };

  complaintInput?.addEventListener("focus", () => renderComplaintResults(complaintInput.value));
  complaintInput?.addEventListener("input", () => {
    renderComplaintResults(complaintInput.value);
  });
  complaintInput?.addEventListener("keydown", (event) => {
    const options = [...complaintResults.querySelectorAll(".complaint-option, .complaint-custom-option")];
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      activeComplaintResult = Math.min(activeComplaintResult + 1, options.length - 1);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      activeComplaintResult = Math.max(activeComplaintResult - 1, 0);
    } else if (event.key === "Enter" && activeComplaintResult >= 0) {
      event.preventDefault();
      options[activeComplaintResult].click();
      return;
    } else if ((event.key === "Enter" || event.key === ",") && complaintInput.value.trim()) {
      event.preventDefault();
      toggleComplaint(complaintInput.value.trim().replace(/,$/, ""));
      return;
    } else if (event.key === "Escape") {
      closeComplaintResults();
      return;
    } else {
      return;
    }
    options.forEach((option, index) => option.classList.toggle("active", index === activeComplaintResult));
    options[activeComplaintResult]?.scrollIntoView({ block: "nearest" });
  });

  complaintResults?.addEventListener("pointerdown", (event) => event.preventDefault());
  complaintResults?.addEventListener("click", (event) => {
    const customOption = event.target.closest("[data-complaint-custom]");
    if (customOption) {
      toggleComplaint(customOption.dataset.complaintCustom);
      return;
    }
    const option = event.target.closest("[data-complaint-option]");
    if (option) toggleComplaint(option.dataset.complaintOption);
  });

  complaintControl?.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".complaint-chip button");
    if (!removeButton) return;
    selectedComplaints.delete(removeButton.closest(".complaint-chip").dataset.complaintValue);
    renderComplaintChips();
    renderComplaintResults(complaintInput.value);
    complaintInput.focus();
  });

  document.addEventListener("click", (event) => {
    const clickedInsideComplaintSelector = event.composedPath()
      .some((element) => element?.id === "complaintAutocomplete");
    if (!clickedInsideComplaintSelector) closeComplaintResults();
  });

  const closeCurrentMedicineResults = () => {
    currentMedicineResults?.classList.remove("open");
    currentMedicineInput?.setAttribute("aria-expanded", "false");
    inputPanel?.classList.remove("current-medicine-open");
    activeCurrentMedicineResult = -1;
  };

  const syncCurrentMedicinesValue = () => {
    if (!currentMedicinesValue || !currentMedicineControl) return;
    currentMedicinesValue.value = [...currentMedicineControl.querySelectorAll(".current-medicine-chip > span")]
      .map((label) => label.textContent.trim())
      .join(", ");
  };

  const renderCurrentMedicineResults = (query = currentMedicineInput?.value || "") => {
    if (!currentMedicineResults) return;
    const matches = findMedicines(query).filter((medicine) => !selectedCurrentMedicineIds.has(medicine.id)).slice(0, 7);
    if (!matches.length) {
      currentMedicineResults.innerHTML = `<div class="medicine-empty">No additional medicine found</div>`;
    } else {
      currentMedicineResults.innerHTML = matches.map((medicine) => `
        <button class="medicine-result" type="button" role="option" data-current-result-id="${escapeHtml(medicine.id)}">
          <span class="medicine-result-main"><strong>${escapeHtml(medicine.brandName)} ${escapeHtml(medicine.strength)}</strong><i data-lucide="badge-check"></i></span>
          <span class="medicine-result-category">${escapeHtml(medicine.category)}</span>
          <span class="medicine-result-meta"><b>${escapeHtml(medicine.genericName)}</b><span>•</span><span>${escapeHtml(medicine.dosageForm)}</span><span>•</span><span>${escapeHtml(medicine.manufacturer)}</span>${medicine.popular ? '<em class="popular-badge">Popular</em>' : ""}</span>
        </button>
      `).join("");
    }
    currentMedicineResults.classList.add("open");
    currentMedicineInput.setAttribute("aria-expanded", "true");
    inputPanel?.classList.add("current-medicine-open");
    activeCurrentMedicineResult = -1;
    window.lucide?.createIcons();
  };

  const addCurrentMedicine = (medicine) => {
    if (!medicine || selectedCurrentMedicineIds.has(medicine.id)) return;
    const frequencyCode = {
      "Once daily": "OD",
      "Twice daily": "BD",
      "TDS": "TDS",
      "As needed": "SOS"
    }[medicine.frequency] || medicine.frequency;
    const chip = document.createElement("span");
    chip.className = "current-medicine-chip";
    chip.dataset.currentMedicineId = medicine.id;
    chip.title = `${medicine.genericName} • ${medicine.manufacturer}`;
    chip.innerHTML = `<span>${escapeHtml(medicine.genericName)} ${escapeHtml(medicine.strength)} ${escapeHtml(frequencyCode)}</span><button type="button" aria-label="Remove ${escapeHtml(medicine.genericName)}"><i data-lucide="x"></i></button>`;
    currentMedicineControl.querySelector(".current-medicine-search").insertAdjacentElement("beforebegin", chip);
    selectedCurrentMedicineIds.add(medicine.id);
    currentMedicineInput.value = "";
    syncCurrentMedicinesValue();
    closeCurrentMedicineResults();
    window.lucide?.createIcons();
  };

  currentMedicineInput?.addEventListener("focus", () => renderCurrentMedicineResults(currentMedicineInput.value));
  currentMedicineInput?.addEventListener("input", () => renderCurrentMedicineResults(currentMedicineInput.value));
  currentMedicineInput?.addEventListener("keydown", (event) => {
    const options = [...currentMedicineResults.querySelectorAll(".medicine-result")];
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      activeCurrentMedicineResult = Math.min(activeCurrentMedicineResult + 1, options.length - 1);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      activeCurrentMedicineResult = Math.max(activeCurrentMedicineResult - 1, 0);
    } else if (event.key === "Enter" && activeCurrentMedicineResult >= 0) {
      event.preventDefault();
      options[activeCurrentMedicineResult].click();
      return;
    } else if (event.key === "Escape") {
      closeCurrentMedicineResults();
      return;
    } else {
      return;
    }
    options.forEach((option, index) => option.classList.toggle("active", index === activeCurrentMedicineResult));
    options[activeCurrentMedicineResult]?.scrollIntoView({ block: "nearest" });
  });

  currentMedicineResults?.addEventListener("click", (event) => {
    const result = event.target.closest("[data-current-result-id]");
    if (!result) return;
    addCurrentMedicine(medicineCatalogue.find((medicine) => medicine.id === result.dataset.currentResultId));
  });

  currentMedicineControl?.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".current-medicine-chip button");
    if (!removeButton) return;
    const chip = removeButton.closest(".current-medicine-chip");
    selectedCurrentMedicineIds.delete(chip.dataset.currentMedicineId);
    chip.remove();
    syncCurrentMedicinesValue();
    currentMedicineInput.focus();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#currentMedicineAutocomplete")) closeCurrentMedicineResults();
  });

  const renderMedicineResults = (query = medicineInput?.value || "") => {
    if (!medicineResults) return;
    const matches = findMedicines(query);
    const visible = showAllMedicineResults ? matches : matches.slice(0, 7);

    if (!visible.length) {
      medicineResults.innerHTML = `<div class="medicine-empty">No medicine found for “${escapeHtml(query)}”</div>`;
    } else {
      medicineResults.innerHTML = visible.map((medicine) => `
        <button class="medicine-result" type="button" role="option" data-medicine-id="${escapeHtml(medicine.id)}">
          <span class="medicine-result-main"><strong>${escapeHtml(medicine.brandName)} ${escapeHtml(medicine.strength)}</strong><i data-lucide="badge-check"></i></span>
          <span class="medicine-result-category">${escapeHtml(medicine.category)}</span>
          <span class="medicine-result-meta"><b>${escapeHtml(medicine.genericName)}</b><span>•</span><span>${escapeHtml(medicine.dosageForm)}</span><span>•</span><span>${escapeHtml(medicine.manufacturer)}</span>${medicine.popular ? '<em class="popular-badge">Popular</em>' : ""}</span>
        </button>
      `).join("");

      if (!showAllMedicineResults && matches.length > visible.length) {
        medicineResults.insertAdjacentHTML("beforeend", `<button class="medicine-results-footer" type="button" data-show-all-medicines><span>See all ${matches.length} results for “${escapeHtml(query)}”</span><i data-lucide="chevron-right"></i></button>`);
      }
    }

    medicineResults.classList.add("open");
    medicineInput?.setAttribute("aria-expanded", "true");
    activeMedicineResult = -1;
    window.lucide?.createIcons();
  };

  const applyMedicineDefaults = (medicine) => {
    if (!medicine) return;
    selectedMedicineRecord = medicine;
    medicineInput.value = `${medicine.brandName} ${medicine.strength}`;
    selectAvailableValue(categorySelect, medicine.category);
    doseInput.value = medicine.defaultDose;
    selectAvailableValue(doseUnitSelect, medicine.doseUnit);
    selectAvailableValue(frequencySelect, medicine.frequency);
    durationInput.value = medicine.duration;
    selectAvailableValue(durationUnitSelect, medicine.durationUnit);
    selectAvailableValue(routeSelect, medicine.route);
    selectAvailableValue(purposeSelect, medicine.purpose);
    medicineEditor.querySelectorAll("[data-instruction-options] button").forEach((button) => {
      button.classList.toggle("selected", button.textContent.trim().toLowerCase() === medicine.instruction.toLowerCase());
    });
    closeMedicineResults();
  };

  medicineInput?.addEventListener("focus", () => {
    showAllMedicineResults = false;
    renderMedicineResults(medicineInput.value);
  });

  medicineInput?.addEventListener("input", () => {
    selectedMedicineRecord = null;
    showAllMedicineResults = false;
    renderMedicineResults(medicineInput.value);
  });

  medicineInput?.addEventListener("keydown", (event) => {
    const options = [...medicineResults.querySelectorAll(".medicine-result")];
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      activeMedicineResult = Math.min(activeMedicineResult + 1, options.length - 1);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      activeMedicineResult = Math.max(activeMedicineResult - 1, 0);
    } else if (event.key === "Enter" && activeMedicineResult >= 0) {
      event.preventDefault();
      options[activeMedicineResult].click();
      return;
    } else if (event.key === "Escape") {
      closeMedicineResults();
      return;
    } else {
      return;
    }
    options.forEach((option, index) => option.classList.toggle("active", index === activeMedicineResult));
    options[activeMedicineResult]?.scrollIntoView({ block: "nearest" });
  });

  medicineResults?.addEventListener("click", (event) => {
    const showAll = event.target.closest("[data-show-all-medicines]");
    if (showAll) {
      showAllMedicineResults = true;
      renderMedicineResults(medicineInput.value);
      return;
    }
    const result = event.target.closest("[data-medicine-id]");
    if (!result) return;
    const medicine = medicineCatalogue.find((item) => item.id === result.dataset.medicineId);
    applyMedicineDefaults(medicine);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#medicineAutocomplete")) closeMedicineResults();
  });

  const closeAddMedicineResults = () => {
    addMedicineResults?.classList.remove("open");
    addMedicineInput?.setAttribute("aria-expanded", "false");
    activeAddMedicineResult = -1;
  };

  const renderAddMedicineResults = (query = addMedicineInput?.value || "") => {
    if (!addMedicineResults) return;
    const matches = findMedicines(query).slice(0, 7);
    if (!matches.length) {
      addMedicineResults.innerHTML = `<div class="medicine-empty">No medicine found for “${escapeHtml(query)}”</div>`;
    } else {
      addMedicineResults.innerHTML = matches.map((medicine) => `
        <button class="medicine-result" type="button" role="option" data-add-medicine-id="${escapeHtml(medicine.id)}">
          <span class="medicine-result-main"><strong>${escapeHtml(medicine.brandName)} ${escapeHtml(medicine.strength)}</strong><i data-lucide="badge-check"></i></span>
          <span class="medicine-result-category">${escapeHtml(medicine.category)}</span>
          <span class="medicine-result-meta"><b>${escapeHtml(medicine.genericName)}</b><span>•</span><span>${escapeHtml(medicine.dosageForm)}</span><span>•</span><span>${escapeHtml(medicine.manufacturer)}</span>${medicine.popular ? '<em class="popular-badge">Popular</em>' : ""}</span>
        </button>
      `).join("");
    }
    addMedicineResults.classList.add("open");
    addMedicineInput.setAttribute("aria-expanded", "true");
    activeAddMedicineResult = -1;
    window.lucide?.createIcons();
  };

  const applyAddMedicineDefaults = (medicine) => {
    if (!medicine) return;
    selectedAddMedicineRecord = medicine;
    addMedicineInput.value = `${medicine.brandName} ${medicine.strength}`;
    selectAvailableValue(addCategorySelect, medicine.category);
    addDoseInput.value = medicine.defaultDose;
    selectAvailableValue(addDoseUnitSelect, medicine.doseUnit);
    selectAvailableValue(addFrequencySelect, medicine.frequency);
    addDurationInput.value = medicine.duration;
    selectAvailableValue(addDurationUnitSelect, medicine.durationUnit);
    selectAvailableValue(addRouteSelect, medicine.route);
    selectAvailableValue(addPurposeSelect, medicine.purpose);
    addMedicineForm.querySelectorAll("[data-add-instruction-options] button").forEach((button) => {
      button.classList.toggle("selected", button.textContent.trim().toLowerCase() === medicine.instruction.toLowerCase());
    });
    closeAddMedicineResults();
  };

  addMedicineInput?.addEventListener("focus", () => renderAddMedicineResults(addMedicineInput.value));
  addMedicineInput?.addEventListener("input", () => {
    selectedAddMedicineRecord = null;
    renderAddMedicineResults(addMedicineInput.value);
  });
  addMedicineInput?.addEventListener("keydown", (event) => {
    const options = [...addMedicineResults.querySelectorAll(".medicine-result")];
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      activeAddMedicineResult = Math.min(activeAddMedicineResult + 1, options.length - 1);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      activeAddMedicineResult = Math.max(activeAddMedicineResult - 1, 0);
    } else if (event.key === "Enter" && activeAddMedicineResult >= 0) {
      event.preventDefault();
      options[activeAddMedicineResult].click();
      return;
    } else if (event.key === "Escape") {
      closeAddMedicineResults();
      return;
    } else {
      return;
    }
    options.forEach((option, index) => option.classList.toggle("active", index === activeAddMedicineResult));
    options[activeAddMedicineResult]?.scrollIntoView({ block: "nearest" });
  });
  addMedicineResults?.addEventListener("click", (event) => {
    const result = event.target.closest("[data-add-medicine-id]");
    if (!result) return;
    applyAddMedicineDefaults(medicineCatalogue.find((medicine) => medicine.id === result.dataset.addMedicineId));
  });
  addMedicineForm?.querySelector("[data-add-instruction-options]")?.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    addMedicineForm.querySelectorAll("[data-add-instruction-options] button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
  });
  addNotes?.addEventListener("input", () => {
    addNotesCount.textContent = String(addNotes.value.length);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#addMedicineAutocomplete")) closeAddMedicineResults();
  });

  const populateMedicineEditor = (row) => {
    if (!row || !medicineEditor) return;
    const title = row.querySelector(".medicine-name strong")?.textContent.replace(/^Tab\.\s*/i, "").trim() || "";
    const category = row.querySelector(".medicine-name em")?.textContent.trim() || "";
    const doseParts = medicineDetail(row, "dose").split(/\s+/);
    const durationParts = medicineDetail(row, "duration").split(/\s+/);
    const instruction = medicineDetail(row, "instruction");

    const normalizedTitle = title.toLowerCase();
    selectedMedicineRecord = medicineCatalogue.find((medicine) => {
      const fullName = `${medicine.brandName} ${medicine.strength}`.toLowerCase();
      return fullName === normalizedTitle || normalizedTitle.includes(medicine.brandName.toLowerCase());
    }) || null;
    medicineInput.value = selectedMedicineRecord ? `${selectedMedicineRecord.brandName} ${selectedMedicineRecord.strength}` : title;
    selectAvailableValue(categorySelect, category);
    doseInput.value = doseParts[0] || "";
    selectAvailableValue(doseUnitSelect, doseParts[1] || "mg");
    selectAvailableValue(frequencySelect, medicineDetail(row, "frequency"));
    durationInput.value = durationParts[0] || "";
    selectAvailableValue(durationUnitSelect, durationParts[1] || "Days");
    selectAvailableValue(routeSelect, medicineDetail(row, "route"));
    selectAvailableValue(purposeSelect, category);

    medicineEditor.querySelectorAll("[data-instruction-options] button").forEach((button) => {
      button.classList.toggle("selected", button.textContent.trim().toLowerCase() === instruction.toLowerCase());
    });
  };

  const openMedicineEditor = (row = treatmentCard?.querySelector("[data-medicine-row]")) => {
    if (!treatmentCard || !medicineEditor || !row) return;
    treatmentCard.classList.remove("adding-medicine");
    closeAddMedicineResults();
    treatmentCard.querySelectorAll("[data-medicine-row]").forEach((item) => {
      item.classList.remove("active-medicine");
      const chevron = item.querySelector(".row-chevron");
      if (chevron) {
        chevron.setAttribute("aria-expanded", "false");
        chevron.setAttribute("aria-label", "Expand medicine editor");
        chevron.innerHTML = '<i data-lucide="chevron-down"></i>';
      }
    });
    selectedMedicineRow = row;
    row.classList.add("active-medicine");
    const activeChevron = row.querySelector(".row-chevron");
    if (activeChevron) {
      activeChevron.setAttribute("aria-expanded", "true");
      activeChevron.setAttribute("aria-label", "Collapse medicine editor");
      activeChevron.innerHTML = '<i data-lucide="chevron-up"></i>';
    }
    row.insertAdjacentElement("afterend", medicineEditor);
    populateMedicineEditor(row);
    treatmentCard.classList.add("treatment-editing");
    window.lucide?.createIcons();
  };

  const closeMedicineEditor = () => {
    treatmentCard?.classList.remove("treatment-editing");
    closeCommonSelects();
    closeMedicineResults();
    treatmentCard?.querySelectorAll("[data-medicine-row]").forEach((item) => {
      item.classList.remove("active-medicine");
      const chevron = item.querySelector(".row-chevron");
      if (chevron) {
        chevron.setAttribute("aria-expanded", "false");
        chevron.setAttribute("aria-label", "Expand medicine editor");
        chevron.innerHTML = '<i data-lucide="chevron-down"></i>';
      }
    });
    window.lucide?.createIcons();
  };

  const updateMedicineRow = () => {
    if (!selectedMedicineRow) return;
    const medicineLabel = medicineInput.value.trim().replace(/\s*\([^)]*\)\s*$/, "");
    const genericName = selectedMedicineRecord?.genericName || medicineLabel.split(/\s+/)[0];
    const instruction = medicineEditor.querySelector("[data-instruction-options] button.selected")?.textContent.trim() || "As Directed";

    selectedMedicineRow.querySelector(".medicine-name strong").textContent = `Tab. ${medicineLabel}`;
    selectedMedicineRow.querySelector(".medicine-name small").textContent = `(${genericName})`;
    selectedMedicineRow.querySelector(".medicine-name em").textContent = purposeSelect.value;
    const manufacturer = selectedMedicineRow.querySelector("[data-medicine-manufacturer]");
    if (manufacturer) manufacturer.textContent = selectedMedicineRecord?.manufacturer || "Custom medicine";
    selectedMedicineRow.querySelector('[data-medicine-detail="dose"] strong').textContent = `${doseInput.value || "0"} ${doseUnitSelect.value}`;
    selectedMedicineRow.querySelector('[data-medicine-detail="frequency"] strong').textContent = frequencySelect.value;
    selectedMedicineRow.querySelector('[data-medicine-detail="duration"] strong').textContent = `${durationInput.value || "0"} ${durationUnitSelect.value}`;
    selectedMedicineRow.querySelector('[data-medicine-detail="route"] strong').textContent = routeSelect.value;
    selectedMedicineRow.querySelector('[data-medicine-detail="purpose"] strong').textContent = purposeSelect.value;
    selectedMedicineRow.querySelector('[data-medicine-detail="instruction"] strong').textContent = instruction;
  };

  const treatmentTemplateMedicines = {
    fever: [
      { name: "Paracetamol 650 mg", generic: "Paracetamol", manufacturer: "Cipla", dose: "650 mg", frequency: "TDS", duration: "3 Days", purpose: "Fever / Pain", instruction: "After Food" },
      { name: "Pantoprazole 40 mg", generic: "Pantoprazole", manufacturer: "Sun Pharma", dose: "40 mg", frequency: "Once daily", duration: "5 Days", purpose: "Gastric Protection", instruction: "Before Food" },
      { name: "ORS Sachet", generic: "Oral Rehydration Salts", manufacturer: "FDC", dose: "1 Sachet", frequency: "TDS", duration: "3 Days", purpose: "Hydration", instruction: "As Directed" }
    ],
    cold: [
      { name: "Paracetamol 500 mg", generic: "Paracetamol", manufacturer: "Cipla", dose: "500 mg", frequency: "TDS", duration: "3 Days", purpose: "Fever / Pain", instruction: "After Food" },
      { name: "Levocetirizine 5 mg", generic: "Levocetirizine", manufacturer: "Glenmark", dose: "5 mg", frequency: "Once daily", duration: "5 Days", purpose: "Allergy", instruction: "At Bed Time" },
      { name: "Vitamin C 500 mg", generic: "Ascorbic Acid", manufacturer: "Abbott", dose: "500 mg", frequency: "Once daily", duration: "7 Days", purpose: "Supplement", instruction: "After Food" }
    ],
    cough: [
      { form: "Syp.", name: "Ambroxol + Levosalbutamol", generic: "Ambroxol Combination", manufacturer: "Cipla", dose: "5 ml", frequency: "TDS", duration: "5 Days", purpose: "Cough", instruction: "After Food" },
      { name: "Cetirizine 10 mg", generic: "Cetirizine", manufacturer: "Dr. Reddy's", dose: "10 mg", frequency: "Once daily", duration: "5 Days", purpose: "Allergy", instruction: "At Bed Time" },
      { name: "Paracetamol 500 mg", generic: "Paracetamol", manufacturer: "Cipla", dose: "500 mg", frequency: "TDS", duration: "3 Days", purpose: "Fever / Pain", instruction: "After Food" },
      { name: "Vitamin C 500 mg", generic: "Ascorbic Acid", manufacturer: "Abbott", dose: "500 mg", frequency: "Once daily", duration: "7 Days", purpose: "Supplement", instruction: "After Food" }
    ],
    pain: [
      { name: "Diclofenac 50 mg", generic: "Diclofenac", manufacturer: "Novartis", dose: "50 mg", frequency: "Twice daily", duration: "3 Days", purpose: "Pain Relief", instruction: "After Food" },
      { name: "Pantoprazole 40 mg", generic: "Pantoprazole", manufacturer: "Sun Pharma", dose: "40 mg", frequency: "Once daily", duration: "3 Days", purpose: "Gastric Protection", instruction: "Before Food" },
      { name: "Paracetamol 650 mg", generic: "Paracetamol", manufacturer: "Cipla", dose: "650 mg", frequency: "TDS", duration: "3 Days", purpose: "Pain Relief", instruction: "After Food" }
    ],
    allergy: [
      { name: "Levocetirizine 5 mg", generic: "Levocetirizine", manufacturer: "Glenmark", dose: "5 mg", frequency: "Once daily", duration: "5 Days", purpose: "Allergy", instruction: "At Bed Time" },
      { name: "Montelukast 10 mg", generic: "Montelukast", manufacturer: "Cipla", dose: "10 mg", frequency: "Once daily", duration: "5 Days", purpose: "Allergy", instruction: "At Bed Time" }
    ],
    gastro: [
      { name: "Omeprazole 20 mg", generic: "Omeprazole", manufacturer: "Dr. Reddy's", dose: "20 mg", frequency: "Once daily", duration: "5 Days", purpose: "Acidity", instruction: "Before Food" },
      { name: "Domperidone 10 mg", generic: "Domperidone", manufacturer: "Sun Pharma", dose: "10 mg", frequency: "Twice daily", duration: "3 Days", purpose: "Nausea", instruction: "Before Food" },
      { form: "Syp.", name: "Antacid 10 ml", generic: "Aluminium Hydroxide Combination", manufacturer: "Abbott", dose: "10 ml", frequency: "TDS", duration: "5 Days", purpose: "Acidity", instruction: "After Food" }
    ],
    infection: [
      { name: "Amoxicillin + Clavulanate 625 mg", generic: "Amoxicillin Clavulanate", manufacturer: "GSK", dose: "625 mg", frequency: "TDS", duration: "5 Days", purpose: "Antibiotic", instruction: "After Food" },
      { name: "Paracetamol 650 mg", generic: "Paracetamol", manufacturer: "Cipla", dose: "650 mg", frequency: "TDS", duration: "3 Days", purpose: "Fever / Pain", instruction: "After Food" },
      { name: "Pantoprazole 40 mg", generic: "Pantoprazole", manufacturer: "Sun Pharma", dose: "40 mg", frequency: "Once daily", duration: "5 Days", purpose: "Gastric Protection", instruction: "Before Food" }
    ],
    diabetes: [
      { name: "Metformin 500 mg", generic: "Metformin", manufacturer: "USV", dose: "500 mg", frequency: "Twice daily", duration: "30 Days", purpose: "Diabetes", instruction: "After Food" },
      { name: "Glimepiride 1 mg", generic: "Glimepiride", manufacturer: "Sanofi", dose: "1 mg", frequency: "Once daily", duration: "30 Days", purpose: "Diabetes", instruction: "Before Food" }
    ],
    hypertension: [
      { name: "Amlodipine 5 mg", generic: "Amlodipine", manufacturer: "Cipla", dose: "5 mg", frequency: "Once daily", duration: "30 Days", purpose: "Hypertension", instruction: "After Food" },
      { name: "Telmisartan 40 mg", generic: "Telmisartan", manufacturer: "Glenmark", dose: "40 mg", frequency: "Once daily", duration: "30 Days", purpose: "Hypertension", instruction: "After Food" }
    ],
    respiratory: [
      { form: "Inh.", name: "Budesonide + Formoterol", generic: "Budesonide Formoterol", manufacturer: "Cipla", dose: "1 Puff", frequency: "Twice daily", duration: "14 Days", purpose: "Respiratory Care", instruction: "As Directed" },
      { name: "Montelukast 10 mg", generic: "Montelukast", manufacturer: "Cipla", dose: "10 mg", frequency: "Once daily", duration: "14 Days", purpose: "Respiratory Care", instruction: "At Bed Time" }
    ],
    skin: [
      { form: "Cream", name: "Clotrimazole 1%", generic: "Clotrimazole", manufacturer: "Glenmark", dose: "Thin Layer", frequency: "Twice daily", duration: "14 Days", purpose: "Skin Infection", instruction: "As Directed" },
      { name: "Cetirizine 10 mg", generic: "Cetirizine", manufacturer: "Dr. Reddy's", dose: "10 mg", frequency: "Once daily", duration: "7 Days", purpose: "Itching Relief", instruction: "At Bed Time" }
    ],
    ent: [
      { name: "Amoxicillin + Clavulanate 625 mg", generic: "Amoxicillin Clavulanate", manufacturer: "GSK", dose: "625 mg", frequency: "TDS", duration: "5 Days", purpose: "ENT Infection", instruction: "After Food" },
      { name: "Paracetamol 500 mg", generic: "Paracetamol", manufacturer: "Cipla", dose: "500 mg", frequency: "TDS", duration: "3 Days", purpose: "Fever / Pain", instruction: "After Food" }
    ]
  };

  const savedTemplateStorageKey = "divinexa.saved-treatment-templates";
  const templateCategoryVisuals = {
    fever: ["thermometer", "red"],
    cough: ["lungs", "pink"],
    pain: ["activity", "purple"],
    gastro: ["flame", "rose"],
    infection: ["virus", "blue"],
    allergy: ["flower-2", "green"],
    diabetes: ["droplets", "purple"],
    hypertension: ["heart-pulse", "red"],
    respiratory: ["lungs", "blue"],
    skin: ["sparkles", "pink"],
    ent: ["ear", "orange"]
  };

  const getTreatmentMedicines = () => [...(treatmentCard?.querySelectorAll("[data-medicine-row]") || [])].map((row) => {
    const fullName = row.querySelector(".medicine-name strong")?.textContent.trim() || "Medicine";
    const formMatch = fullName.match(/^(Tab\.|Syp\.|Inh\.|Cream)\s*/i);
    return {
      form: formMatch?.[1] || "Tab.",
      name: fullName.replace(/^(Tab\.|Syp\.|Inh\.|Cream)\s*/i, "").trim(),
      generic: (row.querySelector(".medicine-name small")?.textContent || "").replace(/[()]/g, "").trim() || "Generic medicine",
      manufacturer: row.querySelector("[data-medicine-manufacturer]")?.textContent.trim() || "Custom medicine",
      dose: row.querySelector('[data-medicine-detail="dose"] strong')?.textContent.trim() || "As directed",
      frequency: row.querySelector('[data-medicine-detail="frequency"] strong')?.textContent.trim() || "As directed",
      duration: row.querySelector('[data-medicine-detail="duration"] strong')?.textContent.trim() || "As directed",
      purpose: row.querySelector('[data-medicine-detail="purpose"] strong')?.textContent.trim() || "Treatment",
      instruction: row.querySelector('[data-medicine-detail="instruction"] strong')?.textContent.trim() || "As Directed"
    };
  });

  const renderSaveTemplatePreview = () => {
    if (!saveTemplateMedicinePreview) return;
    const medicines = getTreatmentMedicines();
    if (saveTemplateMedicineCount) {
      saveTemplateMedicineCount.textContent = `${medicines.length} medicine${medicines.length === 1 ? "" : "s"}`;
    }
    saveTemplateMedicinePreview.replaceChildren(...medicines.map((medicine) => {
      const row = document.createElement("article");
      row.className = "save-template-medicine";
      row.innerHTML = `
        <span><i data-lucide="pill"></i></span>
        <div><strong>${escapeHtml(medicine.form)} ${escapeHtml(medicine.name)}</strong><small>${escapeHtml(medicine.dose)} · ${escapeHtml(medicine.frequency)} · ${escapeHtml(medicine.duration)}</small></div>
        <em>${escapeHtml(medicine.purpose)}</em>`;
      return row;
    }));
    window.lucide?.createIcons();
  };

  const appendSavedTemplateOption = ({ id, name, description, category, medicines, tags = [] }) => {
    if (!treatmentTemplateOptions || !id || !name || !Array.isArray(medicines)) return;
    treatmentTemplateMedicines[id] = medicines;
    if (treatmentTemplateOptions.querySelector(`[data-template-option="${id}"]`)) return;
    const [icon, color] = templateCategoryVisuals[category] || ["bookmark", "green"];
    const option = document.createElement("button");
    option.type = "button";
    option.dataset.templateOption = id;
    option.dataset.templateGroup = category || "all";
    option.dataset.templateTags = Array.isArray(tags) ? tags.join(" ") : "";
    option.innerHTML = `<span class="${color}"><i data-lucide="${icon}"></i></span><div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(description || "Saved treatment plan")}</small></div><em>Use Template</em>`;
    treatmentTemplateOptions.append(option);
  };

  const readSavedTreatmentTemplates = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(savedTemplateStorageKey) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  readSavedTreatmentTemplates().forEach(appendSavedTemplateOption);
  window.lucide?.createIcons();

  const renderSaveTemplateTags = () => {
    if (!saveTemplateTags || !saveTemplateTagInput) return;
    saveTemplateTags.querySelectorAll(".save-template-tag").forEach((chip) => chip.remove());
    [...selectedSaveTemplateTags].forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "save-template-tag";
      chip.dataset.saveTemplateTag = tag;
      chip.innerHTML = `<span>${escapeHtml(tag)}</span><button type="button" aria-label="Remove ${escapeHtml(tag)}"><i data-lucide="x"></i></button>`;
      saveTemplateTags.insertBefore(chip, saveTemplateTagInput);
    });
    window.lucide?.createIcons();
  };

  const addSaveTemplateTag = (value) => {
    const tag = String(value || "").trim().replace(/\s+/g, " ");
    if (!tag) return;
    selectedSaveTemplateTags.add(tag);
    if (saveTemplateTagInput) saveTemplateTagInput.value = "";
    renderSaveTemplateTags();
  };

  const seedSaveTemplateTags = () => {
    selectedSaveTemplateTags.clear();
    [...document.querySelectorAll(".chief-complaint-grid [data-complaint-choice].selected")]
      .slice(0, 3)
      .forEach((button) => selectedSaveTemplateTags.add(button.dataset.complaintChoice));
    getTreatmentMedicines().map((medicine) => medicine.purpose).filter(Boolean).forEach((purpose) => {
      if (selectedSaveTemplateTags.size < 3) selectedSaveTemplateTags.add(purpose);
    });
    renderSaveTemplateTags();
  };

  const setSaveTreatmentTemplateOpen = (open) => {
    if (!saveTreatmentTemplateModal || !saveTreatmentTemplateButton) return;
    saveTreatmentTemplateModal.hidden = !open;
    saveTreatmentTemplateButton.classList.toggle("active", open);
    saveTreatmentTemplateButton.setAttribute("aria-expanded", String(open));
    body.classList.toggle("save-treatment-template-open", open);
    if (open) {
      setTreatmentTemplatesOpen(false);
      saveTreatmentTemplateForm?.reset();
      saveTemplateCategory?._commonSelect?.refresh();
      renderSaveTemplatePreview();
      seedSaveTemplateTags();
      window.requestAnimationFrame(() => saveTemplateName?.focus());
    } else if (document.activeElement?.closest(".save-treatment-template-modal")) {
      saveTreatmentTemplateButton.focus({ preventScroll: true });
    }
  };

  const createTemplateMedicineRow = (medicine) => {
    const row = document.createElement("div");
    row.className = "medicine-row";
    row.setAttribute("data-medicine-row", "");
    row.innerHTML = `
      <b class="medicine-number"></b>
      <div class="medicine-name"><strong>${escapeHtml(medicine.form || "Tab.")} ${escapeHtml(medicine.name)}</strong><small>(${escapeHtml(medicine.generic)})</small><span class="medicine-tags"><b data-medicine-manufacturer>${escapeHtml(medicine.manufacturer)}</b><em>${escapeHtml(medicine.purpose)}</em></span></div>
      <div class="medicine-detail" data-medicine-detail="dose"><small><i data-lucide="pills"></i>Dose</small><span><i data-lucide="capsule"></i><strong>${escapeHtml(medicine.dose)}</strong></span></div>
      <div class="medicine-detail" data-medicine-detail="frequency"><small><i data-lucide="history"></i>Frequency</small><span><i data-lucide="clock-3"></i><strong>${escapeHtml(medicine.frequency)}</strong></span></div>
      <div class="medicine-detail" data-medicine-detail="duration"><small><i data-lucide="calendar-days"></i>Duration</small><span><i data-lucide="calendar-check"></i><strong>${escapeHtml(medicine.duration)}</strong></span></div>
      <div class="medicine-detail" data-medicine-detail="route"><small><i data-lucide="git-branch"></i>Route</small><span><i data-lucide="route"></i><strong>Oral</strong></span></div>
      <div class="medicine-detail" data-medicine-detail="purpose"><small><i data-lucide="orbit"></i>Purpose</small><span><i data-lucide="goal"></i><strong>${escapeHtml(medicine.purpose)}</strong></span></div>
      <div class="medicine-detail food" data-medicine-detail="instruction"><small><i data-lucide="utensils"></i>Instructions</small><span><i data-lucide="utensils"></i><strong>${escapeHtml(medicine.instruction)}</strong></span></div>
      <button class="row-chevron" type="button" aria-label="Expand medicine editor" aria-expanded="false"><i data-lucide="chevron-down"></i></button>
      <button class="row-action delete" type="button" aria-label="Delete medicine"><i data-lucide="trash-2"></i></button>`;
    return row;
  };

  const renderTreatmentTemplatePreview = () => {
    const option = treatmentTemplateOptions?.querySelector(`[data-template-option="${selectedTreatmentTemplate}"]`);
    const medicines = treatmentTemplateMedicines[selectedTreatmentTemplate] || [];
    if (treatmentTemplatePreviewTitle) {
      treatmentTemplatePreviewTitle.textContent = option?.querySelector("strong")?.textContent || "Treatment Template";
    }
    if (treatmentTemplatePreviewDescription) {
      treatmentTemplatePreviewDescription.textContent = option?.querySelector("small")?.textContent || "Template medicines";
    }
    if (treatmentTemplatePreviewMedicines) {
      treatmentTemplatePreviewMedicines.replaceChildren(...medicines.map((medicine) => {
        const row = document.createElement("article");
        row.className = "template-preview-medicine";
        const icon = document.createElement("span");
        icon.innerHTML = '<i data-lucide="pill"></i>';
        const copy = document.createElement("div");
        const name = document.createElement("strong");
        const detail = document.createElement("small");
        name.textContent = `${medicine.form || "Tab."} ${medicine.name}`;
        detail.textContent = `${medicine.dose} - ${medicine.frequency} - ${medicine.duration}`;
        copy.append(name, detail);
        row.append(icon, copy);
        return row;
      }));
    }
    window.lucide?.createIcons();
  };

  const filterTreatmentTemplates = () => {
    const query = treatmentTemplateSearch?.value.trim().toLowerCase() || "";
    const category = activeTreatmentCategory;
    treatmentTemplateOptions?.querySelectorAll("[data-template-option]").forEach((option) => {
      const matchesCategory = category === "all" || option.dataset.templateGroup === category;
      const searchableText = `${option.textContent} ${option.dataset.templateTags || ""}`.toLowerCase();
      const matchesQuery = !query || searchableText.includes(query);
      option.hidden = !matchesCategory || !matchesQuery;
    });
  };

  const setTreatmentMoreOpen = (open) => {
    treatmentTemplateMoreMenu?.classList.toggle("open", open);
    treatmentTemplateMoreToggle?.setAttribute("aria-expanded", String(open));
  };

  const setTreatmentTemplatesOpen = (open) => {
    if (!treatmentTemplateModal || !treatmentTemplatesButton) return;
    treatmentTemplateModal.hidden = !open;
    treatmentTemplatesButton.classList.toggle("active", open);
    treatmentTemplatesButton.setAttribute("aria-expanded", String(open));
    body.classList.toggle("treatment-template-open", open);
    if (open) {
      closeMedicineEditor();
      treatmentCard?.classList.remove("adding-medicine");
      if (treatmentTemplateSearch) treatmentTemplateSearch.value = "";
      activeTreatmentCategory = "all";
      setTreatmentMoreOpen(false);
      document.querySelectorAll(".treatment-template-tabs button").forEach((button) => {
        button.classList.toggle("active", button.dataset.templateCategory === "all");
      });
      treatmentTemplateOptions?.querySelectorAll("[data-template-option]").forEach((option) => {
        option.classList.toggle("selected", option.dataset.templateOption === selectedTreatmentTemplate);
      });
      filterTreatmentTemplates();
      renderTreatmentTemplatePreview();
      window.requestAnimationFrame(() => treatmentTemplateSearch?.focus());
    } else {
      treatmentTemplatesButton.focus({ preventScroll: true });
    }
  };

  const applyTreatmentTemplate = () => {
    const medicines = treatmentTemplateMedicines[selectedTreatmentTemplate] || [];
    const existingNames = new Set(
      [...treatmentCard.querySelectorAll(".medicine-name strong")]
        .map((item) => item.textContent.replace(/^(Tab\.|Syp\.)\s*/i, "").trim().toLowerCase())
    );
    let added = 0;
    medicines.forEach((medicine) => {
      if (existingNames.has(medicine.name.toLowerCase())) return;
      const row = createTemplateMedicineRow(medicine);
      treatmentCard.querySelector("[data-add-medicine-open]").insertAdjacentElement("beforebegin", row);
      existingNames.add(medicine.name.toLowerCase());
      added += 1;
    });
    renumberMedicineRows();
    window.lucide?.createIcons();
    const templateName = treatmentTemplateOptions?.querySelector(`[data-template-option="${selectedTreatmentTemplate}"] strong`)?.textContent || "Treatment";
    if (treatmentPlanSource) treatmentPlanSource.textContent = "(From Template)";
    showToast(added ? `${templateName} template added (${added} medicines)` : `${templateName} medicines are already in the plan`);
    setTreatmentTemplatesOpen(false);
  };

  treatmentTemplatesButton?.addEventListener("click", () => {
    setTreatmentTemplatesOpen(treatmentTemplateModal?.hidden !== false);
  });
  saveTreatmentTemplateButton?.addEventListener("click", () => {
    setSaveTreatmentTemplateOpen(true);
  });
  document.querySelectorAll("[data-save-template-close]").forEach((button) => {
    button.addEventListener("click", () => setSaveTreatmentTemplateOpen(false));
  });
  saveTemplateTagInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSaveTemplateTag(saveTemplateTagInput.value.replace(/,$/, ""));
      return;
    }
    if (event.key === "Backspace" && !saveTemplateTagInput.value && selectedSaveTemplateTags.size) {
      const tags = [...selectedSaveTemplateTags];
      selectedSaveTemplateTags.delete(tags[tags.length - 1]);
      renderSaveTemplateTags();
    }
  });
  saveTemplateTagInput?.addEventListener("blur", () => addSaveTemplateTag(saveTemplateTagInput.value));
  saveTemplateTags?.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".save-template-tag button");
    if (!removeButton) return;
    selectedSaveTemplateTags.delete(removeButton.closest(".save-template-tag").dataset.saveTemplateTag);
    renderSaveTemplateTags();
    saveTemplateTagInput?.focus();
  });
  saveTreatmentTemplateForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    addSaveTemplateTag(saveTemplateTagInput?.value);
    const name = saveTemplateName?.value.trim() || "";
    const category = saveTemplateCategory?.value || "fever";
    const description = saveTemplateDescription?.value.trim() || "Saved treatment plan";
    const medicines = getTreatmentMedicines();
    const tags = [...selectedSaveTemplateTags];
    if (!name) {
      saveTemplateName?.focus();
      showToast("Enter a template name");
      return;
    }
    if (!medicines.length) {
      showToast("Add at least one medicine before saving a template");
      return;
    }
    const id = `custom-${Date.now()}`;
    const savedTemplate = { id, name, category, description, medicines, tags };
    appendSavedTemplateOption(savedTemplate);
    const savedTemplates = readSavedTreatmentTemplates();
    savedTemplates.push(savedTemplate);
    try {
      window.localStorage.setItem(savedTemplateStorageKey, JSON.stringify(savedTemplates));
    } catch {
      // The template remains available for the current session when storage is unavailable.
    }
    selectedTreatmentTemplate = id;
    treatmentTemplateOptions?.querySelectorAll("[data-template-option]").forEach((item) => {
      item.classList.toggle("selected", item.dataset.templateOption === id);
    });
    window.lucide?.createIcons();
    setSaveTreatmentTemplateOpen(false);
    showToast(`${name} saved as a reusable template`);
  });
  document.querySelectorAll("[data-template-modal-close]").forEach((button) => {
    button.addEventListener("click", () => setTreatmentTemplatesOpen(false));
  });
  treatmentTemplateOptions?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-template-option]");
    if (!option) return;
    selectedTreatmentTemplate = option.dataset.templateOption;
    treatmentTemplateOptions.querySelectorAll("[data-template-option]").forEach((item) => {
      item.classList.toggle("selected", item === option);
    });
    renderTreatmentTemplatePreview();
  });
  treatmentTemplateMoreToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    setTreatmentMoreOpen(!treatmentTemplateMoreMenu?.classList.contains("open"));
  });
  document.querySelectorAll("[data-template-category]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTreatmentCategory = button.dataset.templateCategory || "all";
      const fromMore = Boolean(button.closest(".treatment-template-more-dropdown"));
      document.querySelectorAll("[data-template-category]").forEach((item) => item.classList.toggle("active", item === button));
      treatmentTemplateMoreToggle?.classList.toggle("active", fromMore);
      setTreatmentMoreOpen(false);
      filterTreatmentTemplates();
    });
  });
  treatmentTemplateSearch?.addEventListener("input", filterTreatmentTemplates);
  treatmentTemplateUseButton?.addEventListener("click", applyTreatmentTemplate);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".treatment-template-more-menu")) setTreatmentMoreOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (saveTreatmentTemplateModal && !saveTreatmentTemplateModal.hidden) {
      setSaveTreatmentTemplateOpen(false);
      return;
    }
    if (treatmentTemplateMoreMenu?.classList.contains("open")) {
      setTreatmentMoreOpen(false);
      treatmentTemplateMoreToggle?.focus();
      return;
    }
    if (treatmentTemplateModal && !treatmentTemplateModal.hidden) setTreatmentTemplatesOpen(false);
  });

  document.querySelector("[data-treatment-open]")?.addEventListener("click", () => {
    setTreatmentTemplatesOpen(false);
    openMedicineEditor();
  });
  document.querySelector("[data-editor-cancel]")?.addEventListener("click", closeMedicineEditor);

  medicineEditor?.addEventListener("submit", (event) => {
    event.preventDefault();
    updateMedicineRow();
    closeMedicineEditor();
    showToast("Medicine updated");
  });

  medicineEditor?.querySelector("[data-instruction-options]")?.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    medicineEditor.querySelectorAll("[data-instruction-options] button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
  });

  notesInput?.addEventListener("input", () => {
    notesCount.textContent = String(notesInput.value.length);
  });

  const renumberMedicineRows = () => {
    treatmentCard?.querySelectorAll("[data-medicine-row]").forEach((row, index) => {
      const number = row.querySelector(".medicine-number");
      if (number) number.textContent = String(index + 1);
    });
  };

  const closeAddMedicineForm = (reset = false) => {
    treatmentCard?.classList.remove("adding-medicine");
    closeAddMedicineResults();
    closeCommonSelects();
    if (reset && addMedicineForm) {
      addMedicineForm.reset();
      selectedAddMedicineRecord = null;
      addMedicineForm.querySelectorAll("select").forEach((select) => select._commonSelect?.refresh());
      addMedicineForm.querySelectorAll("[data-add-instruction-options] button").forEach((button, index) => {
        button.classList.toggle("selected", index === 0);
      });
      if (addNotesCount) addNotesCount.textContent = "0";
    }
  };

  document.querySelector("[data-add-medicine-open]")?.addEventListener("click", () => {
    closeMedicineEditor();
    treatmentCard?.classList.add("adding-medicine");
    window.setTimeout(() => {
      addMedicineInput?.focus();
      addMedicineForm?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 30);
  });

  document.querySelector("[data-add-medicine-cancel]")?.addEventListener("click", () => closeAddMedicineForm(true));

  addMedicineForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const requiredValues = [
      addMedicineInput.value.trim(),
      addDoseInput.value,
      addFrequencySelect.value,
      addDurationInput.value,
      addRouteSelect.value
    ];
    if (requiredValues.some((value) => !value)) {
      showToast("Complete all required medicine fields");
      return;
    }

    const searchedMedicine = addMedicineInput.value.trim();
    const medicineName = selectedAddMedicineRecord
      ? `${selectedAddMedicineRecord.brandName} ${selectedAddMedicineRecord.strength}`
      : `${searchedMedicine} ${addDoseInput.value} ${addDoseUnitSelect.value}`;
    const genericName = selectedAddMedicineRecord?.genericName || searchedMedicine;
    const manufacturer = selectedAddMedicineRecord?.manufacturer || "Custom medicine";
    const purpose = addPurposeSelect.value || addCategorySelect.value || "General";
    const instruction = addMedicineForm.querySelector("[data-add-instruction-options] button.selected")?.textContent.trim() || "As Directed";
    const dose = `${addDoseInput.value} ${addDoseUnitSelect.value}`;
    const duration = `${addDurationInput.value} ${addDurationUnitSelect.value}`;

    const row = document.createElement("div");
    row.className = "medicine-row";
    row.setAttribute("data-medicine-row", "");
    row.innerHTML = `
      <b class="medicine-number"></b>
      <div class="medicine-name"><strong>Tab. ${escapeHtml(medicineName)}</strong><small>(${escapeHtml(genericName)})</small><span class="medicine-tags"><b data-medicine-manufacturer>${escapeHtml(manufacturer)}</b><em>${escapeHtml(purpose)}</em></span></div>
      <div class="medicine-detail" data-medicine-detail="dose"><small><i data-lucide="pills"></i>Dose</small><span><i data-lucide="capsule"></i><strong>${escapeHtml(dose)}</strong></span></div>
      <div class="medicine-detail" data-medicine-detail="frequency"><small><i data-lucide="history"></i>Frequency</small><span><i data-lucide="clock-3"></i><strong>${escapeHtml(addFrequencySelect.value)}</strong></span></div>
      <div class="medicine-detail" data-medicine-detail="duration"><small><i data-lucide="calendar-days"></i>Duration</small><span><i data-lucide="calendar-check"></i><strong>${escapeHtml(duration)}</strong></span></div>
      <div class="medicine-detail" data-medicine-detail="route"><small><i data-lucide="git-branch"></i>Route</small><span><i data-lucide="route"></i><strong>${escapeHtml(addRouteSelect.value)}</strong></span></div>
      <div class="medicine-detail" data-medicine-detail="purpose"><small><i data-lucide="orbit"></i>Purpose</small><span><i data-lucide="goal"></i><strong>${escapeHtml(purpose)}</strong></span></div>
      <div class="medicine-detail food" data-medicine-detail="instruction"><small><i data-lucide="utensils"></i>Instructions</small><span><i data-lucide="utensils"></i><strong>${escapeHtml(instruction)}</strong></span></div>
      <button class="row-chevron" type="button" aria-label="Expand medicine editor" aria-expanded="false"><i data-lucide="chevron-down"></i></button>
      <button class="row-action delete" type="button" aria-label="Delete medicine"><i data-lucide="trash-2"></i></button>
    `;

    treatmentCard.querySelector("[data-add-medicine-open]").insertAdjacentElement("beforebegin", row);
    renumberMedicineRows();
    closeAddMedicineForm(true);
    window.lucide?.createIcons();
    showToast(`${searchedMedicine} added to the treatment plan`);
  });

  treatmentCard?.addEventListener("click", (event) => {
    const editButton = event.target.closest(".row-action.edit");
    if (editButton) {
      openMedicineEditor(editButton.closest("[data-medicine-row]"));
      return;
    }

    const chevronButton = event.target.closest(".row-chevron");
    if (chevronButton) {
      const row = chevronButton.closest("[data-medicine-row]");
      if (treatmentCard.classList.contains("treatment-editing") && row.classList.contains("active-medicine")) closeMedicineEditor();
      else openMedicineEditor(row);
      return;
    }

    const deleteButton = event.target.closest(".row-action.delete");
    if (deleteButton) {
      const rows = treatmentCard.querySelectorAll("[data-medicine-row]");
      if (rows.length === 1) return showToast("At least one medicine must remain");
      const row = deleteButton.closest("[data-medicine-row]");
      const deletingActiveRow = row === selectedMedicineRow;
      row.remove();
      if (deletingActiveRow) {
        selectedMedicineRow = treatmentCard.querySelector("[data-medicine-row]");
        closeMedicineEditor();
      }
      renumberMedicineRows();
      showToast("Medicine removed");
    }
  });

  document.querySelectorAll("[data-action='regenerate']").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.add("loading");
      showToast("AI is regenerating the prescription...");
      window.setTimeout(() => {
        button.classList.remove("loading");
        showToast("Prescription suggestions refreshed");
      }, 1200);
    });
  });

  document.querySelector("[data-action='clear']")?.addEventListener("click", () => {
    if (complaintInput) complaintInput.value = "";
    if (complaintValue) complaintValue.value = "";
    document.querySelectorAll(".chief-complaint-grid button.selected").forEach((button) => button.classList.remove("selected"));
    closeComplaintResults();
    document.querySelectorAll(".input-panel input[type='checkbox']").forEach((input) => { input.checked = false; });
    document.querySelectorAll(".input-panel .selected").forEach((item) => item.classList.remove("selected"));
    syncPainBodyMap();
    showToast("Doctor input cleared");
  });

  document.querySelector("[data-action='approve']")?.addEventListener("click", () => {
    showToast("Prescription approved and generated successfully");
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMobileSidebar();
  });

  window.addEventListener("beforeunload", () => {
    stopVoiceTimer();
    stopVoiceMedia({ discard: true });
    stopCaptureVideoTimer();
    if (cameraMediaRecorder && cameraMediaRecorder.state !== "inactive") {
      cameraMediaRecorder._discardCapture = true;
      cameraMediaRecorder.stop();
    }
    stopCameraMedia();
    captureImageUrls.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    if (voiceRecordingObjectUrl) URL.revokeObjectURL(voiceRecordingObjectUrl);
    if (captureVideoObjectUrl) URL.revokeObjectURL(captureVideoObjectUrl);
  });
})();
