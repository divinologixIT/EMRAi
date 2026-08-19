    (function () {
      var WEBHOOK_URL = "https://retina.app.n8n.cloud/webhook/doctor-appointment-chat";
      var SESSION_KEY = "dr-chat-session-id";
      // No file-upload endpoint exists yet for this raw-webhook setup —
      // the chat webhook only accepts {chatInput, sessionId} JSON, not
      // binary media. Recording works fully client-side; sending is
      // wired to POST here once a real endpoint is added. Until then,
      // "Send" tells the visitor honestly that it couldn't be delivered
      // instead of silently pretending it worked.
      var MEDIA_UPLOAD_URL = "";

      var sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        sessionId = (crypto.randomUUID ? crypto.randomUUID() : "dr-" + Date.now() + "-" + Math.random().toString(16).slice(2));
        localStorage.setItem(SESSION_KEY, sessionId);
      }

      var toggle = document.getElementById("drChatToggle");
      var closeBtn = document.getElementById("drChatClose");
      var panel = document.getElementById("drChatPanel");
      var messages = document.getElementById("drChatMessages");
      var form = document.getElementById("drChatForm");
      var input = document.getElementById("drChatInput");
      var sendBtn = document.getElementById("drChatSend");

      var micBtn = document.getElementById("drChatMicBtn");
      var videoBtn2 = document.getElementById("drChatVideoBtn");
      var imageBtn = document.getElementById("drChatImageBtn");
      var pendingAttachment = document.getElementById("drPendingAttachment");
      var pendingAttachmentIcon = document.getElementById("drPendingAttachmentIcon");
      var pendingAttachmentLabel = document.getElementById("drPendingAttachmentLabel");
      var pendingAttachmentRemove = document.getElementById("drPendingAttachmentRemove");

      var recorderOverlay = document.getElementById("drRecorderOverlay");
      var recorderClose = document.getElementById("drRecorderClose");
      var recorderModeSelect = document.getElementById("drRecorderModeSelect");
      var recorderStage = document.getElementById("drRecorderStage");
      var recorderVideoPreview = document.getElementById("drRecorderVideoPreview");
      var recorderAudioIndicator = document.getElementById("drRecorderAudioIndicator");
      var recorderTimer = document.getElementById("drRecorderTimer");
      var recorderWaiting = document.getElementById("drRecorderWaiting");
      var recorderRecordBtn = document.getElementById("drRecorderRecordBtn");
      var recorderGalleryBtn = document.getElementById("drRecorderGalleryBtn");
      var recorderGalleryInput = document.getElementById("drRecorderGalleryInput");
      var recorderReview = document.getElementById("drRecorderReview");
      var recorderReviewVideo = document.getElementById("drRecorderReviewVideo");
      var recorderReviewAudio = document.getElementById("drRecorderReviewAudio");
      var recorderReviewImage = document.getElementById("drRecorderReviewImage");
      var recorderRerecordBtn = document.getElementById("drRecorderRerecordBtn");
      var recorderUseBtn = document.getElementById("drRecorderUseBtn");

      var MAX_RECORD_SECONDS = 120;
      var recorderMode = null;
      var mediaStream = null;
      var mediaRecorder = null;
      var recordedChunks = [];
      var recordedBlob = null;
      var recordTimerInterval = null;
      var recordSeconds = 0;
      var pendingAttachmentBlob = null;
      var pendingAttachmentKind = null;
      var pendingImageFiles = [];

      function formatTimer(sec) {
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return m + ":" + (s < 10 ? "0" : "") + s;
      }

      function stopMediaStream() {
        if (mediaStream) {
          mediaStream.getTracks().forEach(function (t) { t.stop(); });
          mediaStream = null;
        }
      }

      function resetRecorderToModeSelect() {
        recorderModeSelect.hidden = false;
        recorderStage.hidden = true;
        recorderReview.hidden = true;
        recorderWaiting.hidden = true;
        recorderVideoPreview.hidden = true;
        recorderAudioIndicator.hidden = true;
        recorderAudioIndicator.classList.remove("dr-recording");
        recorderReviewVideo.hidden = true;
        recorderReviewAudio.hidden = true;
        recorderReviewImage.hidden = true;
        recorderTimer.hidden = true;
        recorderRecordBtn.hidden = true;
        recorderGalleryBtn.hidden = true;
        recorderRecordBtn.textContent = "Start Recording";
        recorderRecordBtn.classList.remove("dr-recording");
        recorderTimer.textContent = "0:00 / 2:00";
        recordSeconds = 0;
        recordedChunks = [];
        recordedBlob = null;
        clearInterval(recordTimerInterval);
        stopMediaStream();
      }

      function openRecorder() {
        recorderOverlay.hidden = false;
        resetRecorderToModeSelect();
      }

      // Skips the mode-select screen and jumps straight into recording —
      // used by the inline capture panel's own Voice/Video buttons, which
      // already commit to a mode before opening the shared recorder modal.
      function openRecorderDirect(mode) {
        recorderOverlay.hidden = false;
        resetRecorderToModeSelect();
        chooseRecorderMode(mode);
      }

      function closeRecorder() {
        clearInterval(recordTimerInterval);
        stopMediaStream();
        recorderOverlay.hidden = true;
      }

      async function chooseRecorderMode(mode) {
        recorderMode = mode;
        recorderModeSelect.hidden = true;
        recorderStage.hidden = false;
        recorderReview.hidden = true;
        recorderWaiting.hidden = false;
        recorderWaiting.textContent = "Requesting " + (mode === "audio" ? "microphone" : "camera") + " access…";
        recorderRecordBtn.hidden = true;
        recorderGalleryBtn.hidden = true;
        recorderTimer.hidden = true;
        recorderRecordBtn.textContent = mode === "photo" ? "Capture Photo" : "Start Recording";

        var constraints = mode === "audio" ? { audio: true } : { video: true, audio: mode === "video" };
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          closeRecorder();
          addMessage("Couldn't access your " + (mode === "audio" ? "microphone" : "camera") + ". Please check permissions and try again" + (mode === "photo" ? ", or choose a photo from your gallery instead." : "."), "bot");
          return;
        }

        recorderWaiting.hidden = true;
        recorderRecordBtn.hidden = false;

        if (mode === "video" || mode === "photo") {
          recorderVideoPreview.hidden = false;
          recorderVideoPreview.srcObject = mediaStream;
        } else {
          recorderAudioIndicator.hidden = false;
        }

        if (mode === "photo") {
          recorderGalleryBtn.hidden = false;
        } else {
          recorderTimer.hidden = false;
        }
      }

      function startRecording() {
        if (!mediaStream) return;
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(mediaStream);
        mediaRecorder.ondataavailable = function (e) {
          if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.onstop = function () {
          recordedBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || (recorderMode === "video" ? "video/webm" : "audio/webm") });
          showRecorderReview();
        };
        mediaRecorder.start();

        recordSeconds = 0;
        recorderTimer.textContent = "0:00 / 2:00";
        recorderRecordBtn.textContent = "Stop Recording";
        recorderRecordBtn.classList.add("dr-recording");
        recorderAudioIndicator.classList.add("dr-recording");

        recordTimerInterval = setInterval(function () {
          recordSeconds++;
          recorderTimer.textContent = formatTimer(recordSeconds) + " / 2:00";
          if (recordSeconds >= MAX_RECORD_SECONDS) stopRecording();
        }, 1000);
      }

      function stopRecording() {
        clearInterval(recordTimerInterval);
        recorderAudioIndicator.classList.remove("dr-recording");
        if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
        stopMediaStream();
      }

      function capturePhoto() {
        if (!mediaStream || !recorderVideoPreview.videoWidth) return;
        var canvas = document.createElement("canvas");
        canvas.width = recorderVideoPreview.videoWidth;
        canvas.height = recorderVideoPreview.videoHeight;
        canvas.getContext("2d").drawImage(recorderVideoPreview, 0, 0, canvas.width, canvas.height);
        stopMediaStream();
        canvas.toBlob(function (blob) {
          recordedBlob = blob;
          showRecorderReview();
        }, "image/jpeg", 0.9);
      }

      function showRecorderReview() {
        recorderStage.hidden = true;
        recorderReview.hidden = false;
        var url = URL.createObjectURL(recordedBlob);
        if (recorderMode === "video") {
          recorderReviewVideo.hidden = false;
          recorderReviewVideo.src = url;
        } else if (recorderMode === "photo") {
          recorderReviewImage.hidden = false;
          recorderReviewImage.src = url;
        } else {
          recorderReviewAudio.hidden = false;
          recorderReviewAudio.src = url;
        }
      }

      function showPendingAttachment(kind, duration) {
        pendingAttachment.hidden = false;
        pendingAttachmentIcon.innerHTML = kind === "video"
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0M12 19v3"></path></svg>';
        pendingAttachmentLabel.textContent = (kind === "video" ? "Video" : "Voice note") + " ready (" + duration + ")";
      }

      function clearPendingAttachment() {
        pendingAttachmentBlob = null;
        pendingAttachmentKind = null;
        pendingImageFiles = [];
        pendingAttachment.hidden = true;
      }

      function updatePendingImagesChip() {
        if (!pendingImageFiles.length) return;
        pendingAttachment.hidden = false;
        pendingAttachmentIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-5-5L5 21"></path></svg>';
        pendingAttachmentLabel.textContent = pendingImageFiles.length + (pendingImageFiles.length === 1 ? " image ready" : " images ready");
      }

      function useRecording() {
        if (recorderMode === "photo") {
          pendingImageFiles.push(new File([recordedBlob], "photo-" + Date.now() + ".jpg", { type: "image/jpeg" }));
          updatePendingImagesChip();
        } else {
          pendingAttachmentBlob = recordedBlob;
          pendingAttachmentKind = recorderMode;
          showPendingAttachment(recorderMode, formatTimer(recordSeconds));
        }
        closeRecorder();
      }

      async function attemptAttachmentUpload() {
        if (!pendingAttachmentBlob) return;
        if (!MEDIA_UPLOAD_URL) {
          addMessage("Your recording is ready, but this chat doesn't have an upload destination set up yet, so it couldn't be sent. Please describe your symptoms in words instead for now.", "bot");
          clearPendingAttachment();
          return;
        }
        try {
          var formData = new FormData();
          formData.append("file", pendingAttachmentBlob, "recording.webm");
          formData.append("sessionId", sessionId);
          formData.append("kind", pendingAttachmentKind);
          var res = await fetch(MEDIA_UPLOAD_URL, { method: "POST", body: formData });
          if (!res.ok) throw new Error("upload failed");
          clearPendingAttachment();
        } catch (err) {
          addMessage("Sorry, the recording couldn't be uploaded. Please try again.", "bot");
        }
      }

      async function attemptImageUpload() {
        if (!pendingImageFiles.length) return;
        if (!MEDIA_UPLOAD_URL) {
          var count = pendingImageFiles.length;
          addMessage((count === 1 ? "Your image is" : "Your " + count + " images are") + " ready, but this chat doesn't have an upload destination set up yet, so " + (count === 1 ? "it" : "they") + " couldn't be sent. Please describe your symptoms in words instead for now.", "bot");
          pendingImageFiles = [];
          return;
        }
        try {
          var formData = new FormData();
          pendingImageFiles.forEach(function (file, i) { formData.append("file" + i, file, file.name); });
          formData.append("sessionId", sessionId);
          formData.append("kind", "image");
          var res = await fetch(MEDIA_UPLOAD_URL, { method: "POST", body: formData });
          if (!res.ok) throw new Error("upload failed");
          pendingImageFiles = [];
        } catch (err) {
          addMessage("Sorry, the images couldn't be uploaded. Please try again.", "bot");
        }
      }

      micBtn.addEventListener("click", function () { openRecorderDirect("audio"); });
      videoBtn2.addEventListener("click", function () { openRecorderDirect("video"); });
      imageBtn.addEventListener("click", function () { openRecorderDirect("photo"); });
      recorderClose.addEventListener("click", closeRecorder);
      pendingAttachmentRemove.addEventListener("click", clearPendingAttachment);

      Array.prototype.forEach.call(recorderModeSelect.querySelectorAll(".dr-recorder-mode-btn"), function (btn) {
        btn.addEventListener("click", function () { chooseRecorderMode(btn.getAttribute("data-mode")); });
      });

      recorderRecordBtn.addEventListener("click", function () {
        if (recorderMode === "photo") {
          capturePhoto();
        } else if (mediaRecorder && mediaRecorder.state === "recording") {
          stopRecording();
        } else {
          startRecording();
        }
      });

      recorderRerecordBtn.addEventListener("click", function () {
        recorderReview.hidden = true;
        chooseRecorderMode(recorderMode);
      });

      recorderUseBtn.addEventListener("click", useRecording);

      recorderGalleryBtn.addEventListener("click", function () { recorderGalleryInput.click(); });
      recorderGalleryInput.addEventListener("change", function () {
        Array.prototype.forEach.call(recorderGalleryInput.files, function (file) {
          if (/^image\//.test(file.type)) pendingImageFiles.push(file);
        });
        recorderGalleryInput.value = "";
        updatePendingImagesChip();
        closeRecorder();
      });

      var greeted = false;

      function formatMsgTime() {
        return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      }

      function buildBotAvatar() {
        var avatar = document.createElement("span");
        avatar.className = "dr-msg-avatar";
        avatar.innerHTML = '<img src="assets/images/dr-chat-bot-avatar.png" alt="">';
        return avatar;
      }

      // Bot summaries sometimes come back as markdown-style "* Label: value"
      // lines (e.g. the pre-booking recap). Render those as a real bulleted
      // list with the label bolded, instead of showing literal "*" text.
      function renderBulletLines(bubble, text) {
        var lines = text.split(/\n/);
        var i = 0;
        while (i < lines.length) {
          var bulletMatch = lines[i].match(/^\s*\*\s+(.*)$/);
          if (bulletMatch) {
            var ul = document.createElement("ul");
            ul.className = "dr-msg-list";
            while (i < lines.length) {
              var m = lines[i].match(/^\s*\*\s+(.*)$/);
              if (!m) break;
              var li = document.createElement("li");
              var content = m[1];
              var colonIdx = content.indexOf(":");
              if (colonIdx > -1 && colonIdx < 30) {
                var label = document.createElement("strong");
                label.textContent = content.slice(0, colonIdx + 1);
                li.appendChild(label);
                li.appendChild(document.createTextNode(content.slice(colonIdx + 1)));
              } else {
                li.textContent = content;
              }
              ul.appendChild(li);
              i++;
            }
            bubble.appendChild(ul);
          } else if (lines[i].trim()) {
            var line = document.createElement("div");
            line.className = "dr-msg-line";
            line.textContent = lines[i];
            bubble.appendChild(line);
            i++;
          } else {
            i++;
          }
        }
      }

      function addMessage(text, who) {
        var bubble = document.createElement("div");
        bubble.className = "dr-msg dr-msg-" + who;
        if (/^\s*\*\s+.+\n\s*\*\s+/m.test(text)) {
          renderBulletLines(bubble, text);
        } else {
          bubble.textContent = text;
        }

        if (who === "user" || who === "bot") {
          var time = document.createElement("span");
          time.className = "dr-msg-time";
          time.textContent = formatMsgTime();
          bubble.appendChild(time);
        }

        if (who === "bot" || who === "typing") {
          var row = document.createElement("div");
          row.className = "dr-msg-row";
          row.appendChild(buildBotAvatar());
          row.appendChild(bubble);
          messages.appendChild(row);
          messages.scrollTop = messages.scrollHeight;
          return row;
        }

        messages.appendChild(bubble);
        messages.scrollTop = messages.scrollHeight;
        return bubble;
      }

      function openPanel() {
        panel.classList.add("dr-open");
        toggle.setAttribute("aria-expanded", "true");
        if (!greeted) {
          greeted = true;
          sendMessage("hello", { silent: true });
        }
        input.focus();
      }

      function closePanel() {
        panel.classList.remove("dr-open");
        toggle.setAttribute("aria-expanded", "false");
      }

      toggle.addEventListener("click", function () {
        if (panel.classList.contains("dr-open")) {
          closePanel();
        } else {
          openPanel();
        }
      });
      closeBtn.addEventListener("click", closePanel);

      input.addEventListener("input", function () {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 96) + "px";
      });

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          form.requestSubmit();
        }
      });

      // Detects a trailing "(Option A/Option B/Option C)" or
      // "(Options: A, B, or C)" hint in a bot message, strips it out of
      // the displayed bubble text (the buttons already show the choices,
      // so repeating them as a sentence is redundant), and returns the
      // parsed option labels. Falls back to a single "Skip" option when
      // the bot merely mentions skipping (no bracketed list), e.g.
      // "you can say 'skip' if you'd rather not share it".
      // The bot asks a free-text duration question with no bracketed
      // option list to parse, so this fills in the same grouped presets
      // the site's own symptom-checker tool uses (Duration section).
      var DURATION_GROUPS = [
        { label: "Short-term", options: ["Today / This Morning", "Since Yesterday", "For the last 2-3 Days", "For about 1 Week", "For a couple of Weeks"] },
        { label: "Long-term", options: ["About 3 Months", "About 6 Months", "About 1 Year", "Since Childhood", "Since Birth"] },
        { label: "Intermittent", options: ["Comes and goes", "Off and on for a few Months", "Off and on for a Year+", "Occurs Daily", "Occurs Weekly"] },
      ];
      var DURATION_QUESTION_RE = /how long\b.*\b(experiencing|had|have you had|has this)/i;

      // "Where is the pain located? You can pick more than one." — detects
      // the multi-select hint regardless of exact wording, strips it from
      // the displayed text, and lets the caller render toggleable buttons
      // instead of the default single-pick radiogroup.
      var MULTI_SELECT_RE = /\b(pick|select|choose)\b[^.?!]{0,20}\b(more than one|multiple)\b|\bmultiple options\b/i;
      var MULTI_SELECT_HINT_CLAUSE_RE = /\(?\s*[.,]?\s*(you can\s+)?(pick|select|choose)[^()?!]*\b(more than one|multiple)\b[^()?!]*\)?/gi;

      // The bot's offer to attach a short video/voice note (or the
      // follow-up reminder that you can skip it) gets its own rich inline
      // capture panel instead of going through the normal quick-reply
      // parser — the options here are actions (open the recorder, pick a
      // file), not text values to send.
      var ATTACH_OFFER_RE = /attachment\/paperclip button|voice\/audio note|video or voice note/i;

      function renderCapturePanel(messageEl) {
        var panel = document.createElement("div");
        panel.className = "dr-capture-panel";

        var header = document.createElement("div");
        header.className = "dr-capture-header";
        header.innerHTML =
          '<div><strong>Capture Patient Input <span class="dr-capture-optional">(Optional)</span></strong>' +
          "<p>Add voice, video or images to help the assistant understand better</p></div>";
        var toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "dr-capture-toggle";
        toggleBtn.setAttribute("aria-label", "Collapse");
        toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"></path></svg>';
        header.appendChild(toggleBtn);
        panel.appendChild(header);

        var body = document.createElement("div");
        body.className = "dr-capture-body";
        panel.appendChild(body);

        toggleBtn.addEventListener("click", function () {
          var collapsed = body.classList.toggle("dr-capture-collapsed");
          toggleBtn.classList.toggle("dr-capture-toggle-collapsed", collapsed);
        });

        var row = document.createElement("div");
        row.className = "dr-capture-row";
        body.appendChild(row);

        var voiceCard = document.createElement("div");
        voiceCard.className = "dr-capture-card";
        var waveformBars = "";
        for (var wb = 0; wb < 14; wb++) waveformBars += "<span></span>";
        voiceCard.innerHTML =
          '<div class="dr-capture-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0M12 19v3"></path></svg><span>Voice Input</span></div>' +
          "<div class=\"dr-capture-card-sub\">Record patient's concern</div>" +
          '<div class="dr-capture-waveform">' + waveformBars + "</div>";
        var voiceBtn = document.createElement("button");
        voiceBtn.type = "button";
        voiceBtn.className = "dr-capture-card-btn";
        voiceBtn.textContent = "Start Recording";
        voiceBtn.addEventListener("click", function () { openRecorderDirect("audio"); });
        voiceCard.appendChild(voiceBtn);
        row.appendChild(voiceCard);

        var videoCard = document.createElement("div");
        videoCard.className = "dr-capture-card";
        videoCard.innerHTML =
          '<div class="dr-capture-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg><span>Video Input</span></div>' +
          '<div class="dr-capture-card-sub">Record patient explaining</div>' +
          '<div class="dr-capture-video-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"></path><circle cx="12" cy="12" r="3"></circle></svg></div>';
        var videoBtn = document.createElement("button");
        videoBtn.type = "button";
        videoBtn.className = "dr-capture-card-btn";
        videoBtn.textContent = "Start Video";
        videoBtn.addEventListener("click", function () { openRecorderDirect("video"); });
        videoCard.appendChild(videoBtn);
        row.appendChild(videoCard);

        var imageCard = document.createElement("div");
        imageCard.className = "dr-capture-card dr-capture-image-card";
        imageCard.innerHTML =
          '<div class="dr-capture-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-5-5L5 21"></path></svg><span>Image Upload</span></div>' +
          '<div class="dr-capture-card-sub">Upload relevant images</div>';

        var dropzone = document.createElement("div");
        dropzone.className = "dr-capture-dropzone";
        dropzone.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"></path><circle cx="12" cy="13" r="4"></circle></svg>' +
          "<strong>Upload or take a photo</strong>" +
          "<span>of the patient's concern</span>";

        var dzActions = document.createElement("div");
        dzActions.className = "dr-capture-dropzone-actions";

        var cameraBtn = document.createElement("button");
        cameraBtn.type = "button";
        cameraBtn.className = "dr-capture-dz-btn";
        cameraBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"></path><circle cx="12" cy="13" r="4"></circle></svg><span>Camera</span>';

        var browseBtn = document.createElement("button");
        browseBtn.type = "button";
        browseBtn.className = "dr-capture-dz-btn";
        browseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M4 20V8a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10"></path></svg><span>Browse File</span>';

        dzActions.appendChild(cameraBtn);
        dzActions.appendChild(browseBtn);
        dropzone.appendChild(dzActions);
        imageCard.appendChild(dropzone);

        var thumbRow = document.createElement("div");
        thumbRow.className = "dr-capture-thumbnails";
        imageCard.appendChild(thumbRow);
        row.appendChild(imageCard);

        var browseInput = document.createElement("input");
        browseInput.type = "file";
        browseInput.accept = "image/*";
        browseInput.multiple = true;
        browseInput.hidden = true;

        panel.appendChild(browseInput);

        // Live camera preview (same recorder modal as Voice/Video) instead
        // of a file input's capture attribute, which only silently hands
        // off to the OS camera app on mobile and does nothing visible at
        // all on desktop.
        cameraBtn.addEventListener("click", function () { openRecorderDirect("photo"); });
        browseBtn.addEventListener("click", function () { browseInput.click(); });

        function handleImageFiles(fileList) {
          Array.prototype.forEach.call(fileList, function (file) {
            if (!/^image\//.test(file.type)) return;
            pendingImageFiles.push(file);
            var chip = document.createElement("div");
            chip.className = "dr-capture-thumb";
            var img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.setAttribute("aria-label", "Remove image");
            removeBtn.innerHTML = "&times;";
            removeBtn.addEventListener("click", function () {
              var idx = pendingImageFiles.indexOf(file);
              if (idx > -1) pendingImageFiles.splice(idx, 1);
              chip.remove();
            });
            chip.appendChild(img);
            chip.appendChild(removeBtn);
            thumbRow.appendChild(chip);
          });
        }

        browseInput.addEventListener("change", function () { handleImageFiles(browseInput.files); browseInput.value = ""; });

        var skipBtn = document.createElement("button");
        skipBtn.type = "button";
        skipBtn.className = "dr-skip-btn dr-capture-skip";
        skipBtn.textContent = "Skip for now";
        skipBtn.addEventListener("click", function () {
          skipBtn.disabled = true;
          sendMessage("Skip");
        });
        panel.appendChild(skipBtn);

        messageEl.insertAdjacentElement("afterend", panel);
        messages.scrollTop = messages.scrollHeight;
      }

      // n8n's AI-generated replies for these specific questions don't
      // reliably embed their own option list in the text (sometimes it's
      // just the bare question, sometimes a pipe list, sometimes
      // different wording each run) — so these always win with the
      // site's own curated pickers, the same way DURATION_QUESTION_RE
      // always wins for duration. Add more entries here as new
      // inconsistently-formatted questions turn up.
      var FIXED_MULTISELECT_QUESTIONS = [
        {
          re: /where.{0,15}(is|does)?.{0,10}pain.{0,15}located|which part.{0,15}(is|does)?.{0,10}(pain|hurt)/i,
          options: ["Neck", "Shoulder", "Upper Back", "Lower Back", "Chest", "Abdomen", "Hip", "Thigh", "Knee", "Leg", "Ankle", "Foot"],
        },
        {
          re: /what makes.{0,10}(the )?pain.{0,10}worse|aggravat/i,
          options: ["Movement", "Walking", "Sitting", "Lying Down", "After Eating", "Lifting Weight", "Others"],
        },
        {
          re: /what makes.{0,10}(the )?pain.{0,10}better|reliev/i,
          options: ["Rest", "Medicine", "Ice Pack", "Heat Pack", "Massage", "Nothing Helps", "Others"],
        },
      ];

      function parseQuickReplyOptions(rawText) {
        for (var fq = 0; fq < FIXED_MULTISELECT_QUESTIONS.length; fq++) {
          if (FIXED_MULTISELECT_QUESTIONS[fq].re.test(rawText)) {
            var fixedCleanText = rawText.split(/\n+/)[0].replace(/\([^()]*\)/g, "").replace(/\s+/g, " ").trim();
            return { options: FIXED_MULTISELECT_QUESTIONS[fq].options.slice(), groups: null, multiSelect: true, cleanText: fixedCleanText };
          }
        }

        var multiSelect = MULTI_SELECT_RE.test(rawText);
        // Strip the hint clause before parsing (not after) so the option
        // bracket/list still lands at the tail of the string whether the
        // bot puts the hint before or after it — the option-list patterns
        // below only match a trailing group.
        var textForParsing = multiSelect
          ? rawText
              .replace(MULTI_SELECT_HINT_CLAUSE_RE, " ")
              .split("\n")
              .map(function (line) { return line.replace(/[ \t]+/g, " ").trim(); })
              .filter(Boolean)
              .join("\n")
          : rawText;
        var result = parseQuickReplyOptionsCore(textForParsing);
        result.multiSelect = multiSelect;
        return result;
      }

      function parseQuickReplyOptionsCore(rawText) {
        // Duration questions win outright, checked before any other
        // pattern: n8n sometimes dumps its own ad-hoc option listing into
        // the message text (e.g. "Short-term: A | B\nLong-term: C | D"),
        // which would otherwise get half-parsed by the generic list
        // detectors below and leave the rest as raw unrendered text. The
        // curated DURATION_GROUPS picker always wins for these regardless
        // of how n8n formatted its own attempt at listing options — only
        // the question's first line is kept, the rest is discarded.
        if (DURATION_QUESTION_RE.test(rawText)) {
          return { options: [], groups: DURATION_GROUPS, cleanText: rawText.split(/\n+/)[0].trim() };
        }

        // "On a scale of 1 to 10, how severe is your pain?" also wins
        // outright — n8n sometimes embeds its own 2-item bracket list for
        // this (e.g. "(1 = No Pain / 10 = Worst Pain)"), which would
        // otherwise get caught by the generic bracket-list detector below
        // and rendered as two plain pills instead of the numbered scale.
        var scaleMatch = rawText.match(/scale of (\d{1,2})\s*(?:to|-)\s*(\d{1,2})/i);
        if (scaleMatch) {
          var isPainScale = /pain/i.test(rawText);
          return {
            options: [],
            groups: null,
            scale: {
              min: parseInt(scaleMatch[1], 10),
              max: parseInt(scaleMatch[2], 10),
              lowLabel: isPainScale ? "No pain" : "Low",
              highLabel: isPainScale ? "Worst pain" : "High",
            },
            cleanText: rawText.split(/\n+/)[0].replace(/\([^()]*\)/g, "").replace(/\s+/g, " ").trim(),
          };
        }

        // Matches a bracketed list at the tail of the message, tolerating
        // one trailing punctuation mark after the closing paren so it
        // catches both "...? (A/B/C)" and "...(A, B, or C)?" phrasings.
        var match = rawText.match(/\(([^()]+)\)\s*([?.!]?)\s*$/);
        // "(e.g., ...)" / "(for example, ...)" is an illustrative hint,
        // not an exhaustive list of choices — skip it so questions like
        // "how long ago? (e.g., Today / This Morning, etc)" fall through
        // to the duration-groups fallback instead of being split apart,
        // and strip the hint from the displayed text either way since
        // whatever renders below (buttons or free-text prompt) covers it.
        var textWithoutHint = rawText;
        if (match && /^\s*(e\.?g\.?|for example)\b/i.test(match[1])) {
          textWithoutHint = (rawText.slice(0, match.index).trim() + match[2]).trim();
          match = null;
        }
        if (match) {
          var separator = match[1].indexOf("/") !== -1 ? "/" : ",";
          var options = match[1]
            .split(separator)
            .map(function (opt) {
              return opt
                .trim()
                .replace(/^(and|or)\s+/i, "")
                .replace(/^options?\s*:\s*/i, "")
                .replace(/\.$/, "")
                .trim();
            })
            .filter(Boolean);

          if (options.length >= 2) {
            var cleanText = (rawText.slice(0, match.index).trim() + match[2]).trim();
            return { options: options, groups: null, cleanText: cleanText };
          }
        }

        // Bare delimited list on its own trailing line, no brackets at all,
        // e.g. "What is your gender?\n\nMale | Female | Other".
        var lines = textWithoutHint.split(/\n+/);
        if (lines.length >= 2) {
          var lastLine = lines[lines.length - 1].trim();
          if (/[|/]/.test(lastLine) && !/[.?!]$/.test(lastLine)) {
            var lineSep = lastLine.indexOf("|") !== -1 ? "|" : "/";
            var lineOptions = lastLine
              .split(lineSep)
              .map(function (opt) { return opt.trim(); })
              .filter(Boolean);
            if (lineOptions.length >= 2 && lineOptions.every(function (opt) { return opt.length <= 30; })) {
              var lineCleanText = lines.slice(0, -1).join("\n").trim();
              return { options: lineOptions, groups: null, cleanText: lineCleanText };
            }
          }
        }

        // Inline pattern with a parenthetical detail after each choice,
        // e.g. "...suddenly (out of nowhere) or gradually (getting worse)?"
        // instead of one bracketed list at the end.
        var pairRe = /(\b[A-Za-z]+)\s*\(([^()]+)\)/g;
        var pairMatches = [];
        var pm;
        while ((pm = pairRe.exec(rawText))) {
          pairMatches.push({ word: pm[1], detail: pm[2].trim() });
        }
        if (pairMatches.length >= 2) {
          var pairCleanText = rawText
            .replace(/(\b[A-Za-z]+)\s*\(([^()]+)\)/g, "$1")
            .replace(/\s+([?.,])/g, "$1")
            .replace(/\s+/g, " ")
            .trim();
          return { options: [], groups: null, pairs: pairMatches, cleanText: pairCleanText };
        }

        if (/\bskip\b/i.test(rawText)) {
          return { options: ["Skip"], groups: null, cleanText: textWithoutHint };
        }

        return { options: [], groups: null, cleanText: textWithoutHint };
      }

      // Per-category icon + tint colors, keyed by the lowercased option
      // label, so quick-reply cards look like the site's own department /
      // symptom picker instead of one generic icon for every option.
      var ICON_LIBRARY = {
        male: { bg: "#e3f2fd", fg: "#1565c0", svg: '<circle cx="10" cy="14" r="5"/><path d="M15.5 8.5 21 3M21 3h-5M21 3v5"/>' },
        female: { bg: "#fde7f3", fg: "#c2185b", svg: '<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/>' },
        pain: { bg: "#fff3e0", fg: "#ef6c00", svg: '<path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>' },
        fever: { bg: "#ffebee", fg: "#c62828", svg: '<path d="M12 2a2 2 0 0 0-2 2v9.3a4 4 0 1 0 4 0V4a2 2 0 0 0-2-2Z"/><path d="M12 13V7"/>' },
        cough: { bg: "#e3f2fd", fg: "#1565c0", svg: '<path d="M4 8h11a3 3 0 1 1-3 3M4 13h13a3 3 0 1 1-3 3M4 18h8"/>' },
        dizziness: { bg: "#f3e5f5", fg: "#7b1fa2", svg: '<path d="M12 3c-3 3-3 6 0 9s3 6 0 9"/><path d="M8 7c-2 2-2 4 0 6"/>' },
        weakness: { bg: "#fff8e1", fg: "#f9a825", svg: '<rect x="2" y="9" width="15" height="6" rx="1.5"/><path d="M20 10v4M5.5 9v6"/>' },
        vomiting: { bg: "#e0f2f1", fg: "#00796b", svg: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>' },
        "skin rash": { bg: "#f3e5f5", fg: "#8e24aa", svg: '<circle cx="7" cy="8" r="1.4" fill="currentColor" stroke="none"/><circle cx="13" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="17" cy="11" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="1.4" fill="currentColor" stroke="none"/>' },
        "shortness of breath": { bg: "#fce4ec", fg: "#d81b60", svg: '<path d="M4 7h11a3 3 0 1 1-3 3M4 12h14a3 3 0 1 1-3 3M4 17h9"/>' },
        other: { bg: "#eceff1", fg: "#546e7a", svg: '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>' },
        "general physician": { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M9 2v5a3 3 0 0 0 6 0V2M7 8a5 5 0 0 0 10 0"/><circle cx="19" cy="15" r="2.2"/>' },
        cardiology: { bg: "#fce4ec", fg: "#e53935", svg: '<path d="M20.8 8.6a4.6 4.6 0 0 0-7.8-3.3L12 6.3l-1-1a4.6 4.6 0 0 0-6.5 6.5L12 19l6.5-6.5a4.6 4.6 0 0 0 2.3-3.9Z"/>' },
        orthopedic: { bg: "#e3f2fd", fg: "#1e88e5", svg: '<path d="M6.5 17.5 17.5 6.5"/><path d="M5 5a2.5 2.5 0 1 1 3.5 3.5L7 10"/><path d="M19 19a2.5 2.5 0 1 0-3.5-3.5L14 17"/>' },
        gynecology: { bg: "#fde7f3", fg: "#d81b60", svg: '<circle cx="12" cy="8" r="4"/><path d="M12 12v8M8 17h8"/>' },
        dermatology: { bg: "#f3e5f5", fg: "#8e24aa", svg: '<path d="M12 3v3M5 8l2 2M19 8l-2 2"/><path d="M12 21c-4 0-6-3-6-6 0-3 6-9 6-9s6 6 6 9c0 3-2 6-6 6Z"/>' },
        pediatrics: { bg: "#fff3e0", fg: "#fb8c00", svg: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/><path d="M8 15c1.5 1.5 6.5 1.5 8 0"/>' },
        gastroenterology: { bg: "#e8f5e9", fg: "#2e7d32", svg: '<path d="M3 12h4l2-6 4 12 2-6h6"/>' },
        ent: { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M8 13a5 5 0 0 1 10 0c0 3-2 4-2 7a2 2 0 0 1-4 0v-2"/><path d="M8 13c-2 0-3 1-3 3"/>' },
        neurology: { bg: "#ede7f6", fg: "#5e35b1", svg: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" stroke="none"/>' },
        "eye care": { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>' },
        pulmonology: { bg: "#fce4ec", fg: "#d81b60", svg: '<path d="M4 7h11a3 3 0 1 1-3 3M4 12h14a3 3 0 1 1-3 3M4 17h9"/>' },
        endocrinology: { bg: "#fff3e0", fg: "#ef6c00", svg: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v4h12V8M12 12v4"/>' },
        rheumatology: { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M6.5 17.5 17.5 6.5"/><path d="M5 5a2.5 2.5 0 1 1 3.5 3.5L7 10"/><path d="M19 19a2.5 2.5 0 1 0-3.5-3.5L14 17"/>' },
        nephrology: { bg: "#f3e5f5", fg: "#8e24aa", svg: '<path d="M12 3c-4 1-6 5-6 9a6 6 0 0 0 12 0c0-4-2-8-6-9Z"/>' },
        urology: { bg: "#e0f2f1", fg: "#00897b", svg: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>' },
        suddenly: { bg: "#fff3e0", fg: "#ef6c00", svg: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" stroke="none"/>' },
        gradually: { bg: "#e3f2fd", fg: "#1565c0", svg: '<path d="M3 17l4-4 3 3 7-7"/><path d="M17 9h4v4"/>' },
        "today / this morning": { bg: "#fff3e0", fg: "#ef6c00", svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>' },
        "since childhood": { bg: "#ede7f6", fg: "#5e35b1", svg: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>' },
        "since birth": { bg: "#fff3e0", fg: "#fb8c00", svg: '<circle cx="12" cy="13" r="7"/><circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M9.5 15.5c1.5 1.2 3.5 1.2 5 0M9 4.5c1-1 2-1.5 3-1.5s2 .5 3 1.5"/>' },
        "not sure": { bg: "#eceff1", fg: "#546e7a", svg: '<path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 4"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="9"/>' },
        neck: { bg: "#ede7f6", fg: "#5e35b1", svg: '<circle cx="12" cy="7" r="3.5"/><path d="M9.5 10.3v2.2a2.5 2.5 0 0 0 5 0v-2.2"/>' },
        shoulder: { bg: "#e3f2fd", fg: "#1565c0", svg: '<circle cx="12" cy="6" r="3"/><path d="M6 20c0-4.5 3-7.5 6-7.5s6 3 6 7.5"/>' },
        "upper back": { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M9 3h6l1 7-1.5 11h-5L8 10Z"/>' },
        "lower back": { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M9 3h6l1 7-1.5 11h-5L8 10Z"/>' },
        chest: { bg: "#fce4ec", fg: "#d81b60", svg: '<path d="M12 5c-2 0-3.5 1.5-3.5 3.5S10 12.5 12 14.5c2-2 3.5-4 3.5-6S14 5 12 5Z"/>' },
        abdomen: { bg: "#e8f5e9", fg: "#2e7d32", svg: '<path d="M9 3c-2 1-3 3-3 6 0 5 3 8 6 8s6-3 6-8c0-3-1-5-3-6"/>' },
        hip: { bg: "#fff3e0", fg: "#ef6c00", svg: '<circle cx="9" cy="12" r="3"/><circle cx="15" cy="12" r="3"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>' },
        thigh: { bg: "#f3e5f5", fg: "#8e24aa", svg: '<path d="M10 3h4l1 9-1 9h-2l-1-8-1 8H8l1-9Z"/>' },
        knee: { bg: "#e3f2fd", fg: "#1565c0", svg: '<path d="M12 3v7M9 13a3 3 0 0 0 6 0M12 13v8"/>' },
        leg: { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M10 3h4l1 9-1 9h-2l-1-8-1 8H8l1-9Z"/>' },
        ankle: { bg: "#fff8e1", fg: "#f9a825", svg: '<path d="M10 3v10l-3 4a2 2 0 0 0 2 3h6a2 2 0 0 0 1-3.7L14 13V3"/>' },
        foot: { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M6 20c0-6 2-10 2-13a2 2 0 0 1 4 0c0 2 1 3 3 3a3 3 0 0 1 3 3c0 4-2 7-2 7Z"/>' },
        no: { bg: "#eceff1", fg: "#546e7a", svg: '<circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/>' },
        "to left leg": { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M10 3h4l1 9-1 9h-2l-1-8-1 8H8l1-9Z"/>' },
        "to right leg": { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M10 3h4l1 9-1 9h-2l-1-8-1 8H8l1-9Z"/>' },
        "to left arm": { bg: "#f3e5f5", fg: "#8e24aa", svg: '<path d="M7 5c0 3 1 5.5 3.5 6.8l5.5 2.7-1 2-5.5-2.7C6 12.7 5 9.5 5 5Z"/>' },
        "to right arm": { bg: "#f3e5f5", fg: "#8e24aa", svg: '<path d="M7 5c0 3 1 5.5 3.5 6.8l5.5 2.7-1 2-5.5-2.7C6 12.7 5 9.5 5 5Z"/>' },
        sharp: { bg: "#fff3e0", fg: "#ef6c00", svg: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" stroke="none"/>' },
        "dull ache": { bg: "#eceff1", fg: "#546e7a", svg: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/><path d="M9 16c1-1.3 5-1.3 6 0"/>' },
        throbbing: { bg: "#e8f5e9", fg: "#2e7d32", svg: '<path d="M3 12h4l2-6 4 12 2-6h6"/>' },
        "burning sensation": { bg: "#ffebee", fg: "#e53935", svg: '<path d="M12 2c-2 3-5 6-5 10a5 5 0 0 0 10 0c0-1.3-.5-2-.5-2s-.2 1.3-1.5 1.3S13.5 8 12 2Z" fill="currentColor" stroke="none"/>' },
        cramping: { bg: "#f3e5f5", fg: "#8e24aa", svg: '<path d="M9 3v7M12 3v8M15 4v6M7 10v3a5 5 0 0 0 10 0v-2l-2-2"/>' },
        "pressure-like": { bg: "#e0f2f1", fg: "#00897b", svg: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>' },
        movement: { bg: "#e0f2f1", fg: "#00897b", svg: '<circle cx="12" cy="4" r="1.8" fill="currentColor" stroke="none"/><path d="M12 6.5v5l-3 6.5M12 11.5l3 6.5M9 10l-3 3M15 10l3 3"/>' },
        walking: { bg: "#e0f2f1", fg: "#00897b", svg: '<circle cx="12" cy="4" r="1.8" fill="currentColor" stroke="none"/><path d="M12 6.5v5l-3 6.5M12 11.5l3 6.5M9 10l-3 3M15 10l3 3"/>' },
        sitting: { bg: "#eceff1", fg: "#546e7a", svg: '<path d="M6 4v9a3 3 0 0 0 3 3h6M6 13H4a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2M18 4v13"/>' },
        "lying down": { bg: "#e3f2fd", fg: "#1565c0", svg: '<rect x="3" y="11" width="18" height="7" rx="2"/><path d="M5 11V8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1M12 7h5a2 2 0 0 1 2 2v2"/>' },
        "after eating": { bg: "#fff3e0", fg: "#ef6c00", svg: '<circle cx="12" cy="12" r="7"/><path d="M9 8v3.5a1.5 1.5 0 0 0 3 0V8M9 8v16M15 8c-1.5 0-2 1-2 2.5s.5 2.5 2 2.5v-5Z"/>' },
        "lifting weight": { bg: "#f3e5f5", fg: "#8e24aa", svg: '<path d="M4 9v6M20 9v6M7 7v10M17 7v10M7 12h10"/>' },
        rest: { bg: "#e3f2fd", fg: "#1565c0", svg: '<rect x="3" y="11" width="18" height="7" rx="2"/><path d="M5 11V8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1M12 7h5a2 2 0 0 1 2 2v2"/>' },
        medicine: { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M4.9 4.9a4.5 4.5 0 0 1 6.4 0l7.8 7.8a4.5 4.5 0 1 1-6.4 6.4L4.9 11.3a4.5 4.5 0 0 1 0-6.4Z"/><path d="M9 9l6 6"/>' },
        "ice pack": { bg: "#e3f2fd", fg: "#1565c0", svg: '<path d="M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1M2 12h20"/>' },
        "heat pack": { bg: "#ffebee", fg: "#e53935", svg: '<path d="M12 2c-2 3-5 6-5 10a5 5 0 0 0 10 0c0-1.3-.5-2-.5-2s-.2 1.3-1.5 1.3S13.5 8 12 2Z" fill="currentColor" stroke="none"/>' },
        massage: { bg: "#e0f2f1", fg: "#00897b", svg: '<path d="M3 12c2-2.5 4 2.5 6 0s4-2.5 6 0 4 2.5 6 0M3 17c2-2.5 4 2.5 6 0s4-2.5 6 0 4 2.5 6 0"/>' },
        "nothing helps": { bg: "#ffebee", fg: "#e53935", svg: '<circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/>' },
        others: { bg: "#eceff1", fg: "#546e7a", svg: '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>' },
      };
      var DEFAULT_ICON = { bg: "#e8f8f6", fg: "#05796f", svg: '<path d="M12 5v14M5 12h14"/>' };
      var CALENDAR_ICON = { bg: "#e8f8f6", fg: "#05796f", svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' };
      DURATION_GROUPS.forEach(function (group) {
        group.options.forEach(function (opt) {
          var key = opt.trim().toLowerCase();
          if (!ICON_LIBRARY[key]) ICON_LIBRARY[key] = CALENDAR_ICON;
        });
      });

      function buildIconSpan(key) {
        var entry = ICON_LIBRARY[key.trim().toLowerCase()] || DEFAULT_ICON;
        var icon = document.createElement("span");
        icon.className = "dr-qr-icon";
        icon.style.background = entry.bg;
        icon.style.color = entry.fg;
        icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + entry.svg + "</svg>";
        return icon;
      }

      function createQuickReplyButton(opt, onPick, withIcon) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dr-quick-reply-btn";
        btn.setAttribute("role", "radio");
        btn.setAttribute("aria-checked", "false");

        if (withIcon) {
          btn.appendChild(buildIconSpan(opt));
        }

        var label = document.createElement("span");
        label.className = "dr-qr-label";
        label.textContent = opt;
        btn.appendChild(label);

        var check = document.createElement("span");
        check.className = "dr-qr-check";
        check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>';
        btn.appendChild(check);

        btn.addEventListener("click", function () { onPick(btn); });
        return btn;
      }

      // Two-line stacked card (bold choice + smaller detail line) for the
      // "suddenly (out of nowhere) or gradually (getting worse)" style
      // questions — matches the site's own "Onset" picker layout.
      function createPairButton(pair, onPick) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dr-quick-reply-btn dr-qr-pair";
        btn.setAttribute("role", "radio");
        btn.setAttribute("aria-checked", "false");

        btn.appendChild(buildIconSpan(pair.word));

        var labelStack = document.createElement("span");
        labelStack.className = "dr-qr-label-stack";

        var main = document.createElement("span");
        main.className = "dr-qr-label-main";
        main.textContent = pair.word.charAt(0).toUpperCase() + pair.word.slice(1);

        var sub = document.createElement("span");
        sub.className = "dr-qr-label-sub";
        sub.textContent = "(" + pair.detail + ")";

        labelStack.appendChild(main);
        labelStack.appendChild(sub);
        btn.appendChild(labelStack);

        btn.addEventListener("click", function () { onPick(btn); });
        return btn;
      }

      function renderPairQuickReplies(messageEl, pairs) {
        if (!pairs.length) return;

        var wrap = document.createElement("div");
        wrap.className = "dr-quick-replies dr-quick-replies-pair";
        wrap.setAttribute("role", "radiogroup");

        function onPick(pair, btn) {
          wrap.querySelectorAll(".dr-quick-reply-btn").forEach(function (b) {
            b.disabled = true;
            b.setAttribute("aria-checked", String(b === btn));
          });
          sendMessage(pair.word.charAt(0).toUpperCase() + pair.word.slice(1) + " (" + pair.detail + ")");
        }

        pairs.forEach(function (pair) {
          wrap.appendChild(createPairButton(pair, function (btn) { onPick(pair, btn); }));
        });

        messageEl.insertAdjacentElement("afterend", wrap);
        messages.scrollTop = messages.scrollHeight;
      }

      function createPillButton(opt, onPick) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dr-qr-pill";
        btn.setAttribute("role", "radio");
        btn.setAttribute("aria-checked", "false");

        var entry = ICON_LIBRARY[opt.trim().toLowerCase()] || DEFAULT_ICON;
        var icon = document.createElement("span");
        icon.className = "dr-qr-pill-icon";
        icon.style.color = entry.fg;
        icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + entry.svg + "</svg>";

        var label = document.createElement("span");
        label.textContent = opt;

        btn.appendChild(icon);
        btn.appendChild(label);
        btn.addEventListener("click", function () { onPick(btn); });
        return btn;
      }

      // Short lists (gender, yes/no, skip) read better as a compact row
      // of pills like the reference design; longer lists (departments,
      // symptoms) keep the bigger icon-card grid.
      function isShortOptionSet(options) {
        return options.length <= 4 && options.every(function (opt) { return opt.length <= 12; });
      }

      function appendQrHint(afterEl, text) {
        var hint = document.createElement("div");
        hint.className = "dr-qr-hint";
        hint.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 16v-4M12 8h.01"></path></svg><span></span>';
        hint.querySelector("span").textContent = text;
        afterEl.insertAdjacentElement("afterend", hint);
        return hint;
      }

      function renderQuickReplies(messageEl, options, multiSelect) {
        if (!options.length) return;

        // A single "Skip" option gets a small standalone chip instead of
        // the multi-option card grid, which would otherwise stretch one
        // lone card across the full row.
        if (options.length === 1 && !multiSelect) {
          var chip = document.createElement("button");
          chip.type = "button";
          chip.className = "dr-skip-btn";
          chip.textContent = options[0];
          chip.addEventListener("click", function () {
            chip.disabled = true;
            sendMessage(options[0]);
          });
          messageEl.insertAdjacentElement("afterend", chip);
          messages.scrollTop = messages.scrollHeight;
          return;
        }

        var wrap = document.createElement("div");
        wrap.setAttribute("role", multiSelect ? "group" : "radiogroup");

        function onPick(opt, btn) {
          if (multiSelect) {
            // Stays live: toggling doesn't lock the group, and every new
            // selection is sent on its own the moment it's checked.
            var nowChecked = btn.getAttribute("aria-checked") !== "true";
            btn.setAttribute("aria-checked", String(nowChecked));
            if (nowChecked) sendMessage(opt);
            return;
          }
          wrap.querySelectorAll("[role=radio]").forEach(function (b) {
            b.disabled = true;
            b.setAttribute("aria-checked", String(b === btn));
          });
          sendMessage(opt);
        }

        if (!multiSelect && isShortOptionSet(options)) {
          wrap.className = "dr-quick-replies-pills";
          options.forEach(function (opt) {
            wrap.appendChild(createPillButton(opt, function (btn) { onPick(opt, btn); }));
          });
          messageEl.insertAdjacentElement("afterend", wrap);
          messages.scrollTop = messages.scrollHeight;
          return;
        }

        wrap.className = multiSelect ? "dr-quick-replies dr-quick-replies-multi" : "dr-quick-replies";
        // Long lists (e.g. the 16-item department list) start collapsed to
        // the first 8 with a "View all" toggle, instead of dumping every
        // card on screen at once.
        var COLLAPSE_AFTER = 10;
        var INITIAL_VISIBLE = 8;
        var needsCollapse = !multiSelect && options.length > COLLAPSE_AFTER;

        options.forEach(function (opt, i) {
          var btn = createQuickReplyButton(opt, function (b) { onPick(opt, b); }, true);
          if (needsCollapse && i >= INITIAL_VISIBLE) {
            btn.classList.add("dr-qr-hidden");
          }
          wrap.appendChild(btn);
        });

        messageEl.insertAdjacentElement("afterend", wrap);

        if (needsCollapse) {
          var toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "dr-qr-toggle";
          var toggleLabel = document.createElement("span");
          toggleLabel.textContent = "View all options";
          var chevron = document.createElement("span");
          chevron.className = "dr-qr-toggle-chevron";
          chevron.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>';
          toggle.appendChild(toggleLabel);
          toggle.appendChild(chevron);

          var hiddenButtons = Array.prototype.slice.call(wrap.querySelectorAll(".dr-qr-hidden"));
          var expanded = false;
          toggle.addEventListener("click", function () {
            expanded = !expanded;
            hiddenButtons.forEach(function (btn) {
              btn.classList.toggle("dr-qr-hidden", !expanded);
            });
            toggleLabel.textContent = expanded ? "Show less" : "View all options";
            toggle.classList.toggle("dr-qr-toggle-open", expanded);
          });

          wrap.insertAdjacentElement("afterend", toggle);
        }

        var hintAnchor = needsCollapse ? toggle : wrap;
        if (multiSelect) {
          appendQrHint(hintAnchor, "You can select multiple options");
        } else if (!needsCollapse) {
          // Long, already-collapsed lists (departments) get their own
          // "view all" affordance instead of this generic nudge.
          appendQrHint(hintAnchor, "You can also type your own answer");
        }

        messages.scrollTop = messages.scrollHeight;
      }

      function renderScalePicker(messageEl, scale) {
        var box = document.createElement("div");
        box.className = "dr-scale-box";

        var numbers = document.createElement("div");
        numbers.className = "dr-scale-numbers";
        numbers.setAttribute("role", "radiogroup");

        var buttons = [];
        for (var n = scale.min; n <= scale.max; n++) {
          (function (value) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "dr-scale-num";
            btn.textContent = String(value);
            btn.setAttribute("role", "radio");
            btn.setAttribute("aria-checked", "false");
            btn.addEventListener("click", function () {
              buttons.forEach(function (b) {
                b.disabled = true;
                b.setAttribute("aria-checked", String(b === btn));
              });
              sendMessage(String(value));
            });
            buttons.push(btn);
            numbers.appendChild(btn);
          })(n);
        }
        box.appendChild(numbers);

        var labels = document.createElement("div");
        labels.className = "dr-scale-labels";
        var lowSpan = document.createElement("span");
        lowSpan.textContent = scale.lowLabel;
        var line = document.createElement("span");
        line.className = "dr-scale-line";
        var highSpan = document.createElement("span");
        highSpan.textContent = scale.highLabel;
        labels.appendChild(lowSpan);
        labels.appendChild(line);
        labels.appendChild(highSpan);
        box.appendChild(labels);

        messageEl.insertAdjacentElement("afterend", box);
        var hintText = scale.min + " being " + scale.lowLabel.toLowerCase() + ", " + scale.max + " being the " + scale.highLabel.toLowerCase();
        appendQrHint(box, hintText);
        messages.scrollTop = messages.scrollHeight;
      }

      function renderGroupedQuickReplies(messageEl, groups) {
        var container = document.createElement("div");
        container.className = "dr-qr-groups";
        container.setAttribute("role", "radiogroup");

        function onPick(opt, btn) {
          container.querySelectorAll(".dr-quick-reply-btn").forEach(function (b) {
            b.disabled = true;
            b.setAttribute("aria-checked", String(b === btn));
          });
          sendMessage(opt);
        }

        groups.forEach(function (group) {
          var section = document.createElement("div");
          section.className = "dr-qr-group";

          var title = document.createElement("div");
          title.className = "dr-qr-group-title";
          var titleText = document.createElement("span");
          titleText.textContent = group.label;
          var titleRule = document.createElement("span");
          titleRule.className = "dr-qr-group-rule";
          title.appendChild(titleText);
          title.appendChild(titleRule);
          section.appendChild(title);

          var grid = document.createElement("div");
          grid.className = "dr-quick-replies";
          group.options.forEach(function (opt) {
            grid.appendChild(createQuickReplyButton(opt, function (btn) { onPick(opt, btn); }, true));
          });
          section.appendChild(grid);

          container.appendChild(section);
        });

        var notSure = createQuickReplyButton("Not sure", function (btn) { onPick("Not sure", btn); }, true);
        notSure.classList.add("dr-qr-notsure");
        container.appendChild(notSure);

        messageEl.insertAdjacentElement("afterend", container);
        messages.scrollTop = messages.scrollHeight;
      }

      async function sendMessage(text, opts) {
        text = text.trim();
        if (!text) return;

        var silent = !!(opts && opts.silent);
        if (!silent) {
          addMessage(text, "user");
        }
        sendBtn.disabled = true;

        var typingEl = addMessage("Typing...", "typing");

        try {
          var res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatInput: text, sessionId: sessionId }),
          });

          if (!res.ok) throw new Error("Request failed with status " + res.status);

          var data = await res.json();
          typingEl.remove();
          var replyText = data && data.reply ? data.reply : "Sorry, I didn't get a response. Please try again.";

          if (ATTACH_OFFER_RE.test(replyText)) {
            var attachBotEl = addMessage(replyText, "bot");
            renderCapturePanel(attachBotEl);
          } else {
            var parsed = parseQuickReplyOptions(replyText);
            var botEl = addMessage(parsed.cleanText, "bot");
            if (parsed.groups) {
              renderGroupedQuickReplies(botEl, parsed.groups);
            } else if (parsed.scale) {
              renderScalePicker(botEl, parsed.scale);
            } else if (parsed.pairs) {
              renderPairQuickReplies(botEl, parsed.pairs);
            } else {
              renderQuickReplies(botEl, parsed.options, parsed.multiSelect);
            }
          }
        } catch (err) {
          typingEl.remove();
          addMessage("Sorry, something went wrong reaching the assistant. Please try again in a moment.", "bot");
        } finally {
          sendBtn.disabled = false;
        }
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var text = input.value.trim();
        if (!text && !pendingAttachmentBlob && !pendingImageFiles.length) return;
        input.value = "";
        input.style.height = "auto";
        if (pendingAttachmentBlob) {
          attemptAttachmentUpload();
        }
        if (pendingImageFiles.length) {
          attemptImageUpload();
        }
        if (text) {
          sendMessage(text);
        }
      });
    })();
