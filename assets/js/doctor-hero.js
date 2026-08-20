/* ============================================================
   Divinexa — Doctor Journey Hero
   Scroll position drives the story across 3 clips / 5 text beats.

   Two independent, mutually-exclusive responsive systems, switched via
   gsap.matchMedia() so only one ScrollTrigger is ever alive at a time:

   - Desktop / tablet (>=769px): GSAP ScrollTrigger pins the stage and
     scrubs a pre-extracted frame sequence (drawn to canvas) — frame
     lookups are instant (no video seek/decode), so the scrub tracks the
     scrollbar exactly. Landscape source footage. Unchanged from the
     original implementation.
   - Mobile (<=768px): GSAP ScrollTrigger pins a compact 9:16 stage and
     scrubs real <video> elements (currentTime) with a crossfade between
     clips. Portrait source footage, sized for a phone viewport.

   Fallback (stacked autoplay video, no ScrollTrigger) is used only for
   prefers-reduced-motion or when GSAP/ScrollTrigger failed to load —
   never based on screen width alone — and itself picks portrait or
   landscape sources based on viewport width.
   ============================================================ */
(() => {
  "use strict";

  const heroSection = document.getElementById("dheroSection");
  const mobileSection = document.getElementById("mheroSection");
  const fallbackSection = document.getElementById("dheroFallback");
  const siteHeader = document.querySelector(".site-header.scroll-hero-header");
  if (!heroSection || !mobileSection || !fallbackSection) return;

  // Mobile header logo: white over the hero video, teal once the header
  // goes solid. Swapped in lockstep with the same .hero-active class below
  // — driven only by real ScrollTrigger boundary callbacks (onEnter/
  // onLeave/onEnterBack/onLeaveBack, see initDesktopExperience and
  // initMobileExperience), never a scrollY threshold. The <img> itself is
  // display:none above 768px (doctor-hero.css/inline styles), so setting
  // its src on desktop is harmless — no width check needed here.
  const mobileHeaderLogo = document.getElementById("mobileHeaderLogo");
  const MOBILE_LOGO_SRC = {
    hero: "assets/images/divinexa-header-logo-white.png",
    scrolled: "assets/images/divinexa-header-logo-teal.png",
  };
  // Preloaded up front so the swap below is instant — no flash of a
  // half-loaded image right as the header crosses the boundary.
  Object.values(MOBILE_LOGO_SRC).forEach((src) => {
    const preload = new Image();
    preload.src = src;
  });

  let headerLogoState = null; // "hero" | "scrolled" — set only by setHeroHeaderActive
  const setHeroHeaderActive = (active) => {
    siteHeader?.classList.toggle("hero-active", Boolean(active));

    if (!mobileHeaderLogo) return;
    const nextState = active ? "hero" : "scrolled";
    if (nextState === headerLogoState) return; // already correct — never re-set src per call
    headerLogoState = nextState;
    mobileHeaderLogo.src = MOBILE_LOGO_SRC[nextState];
  };

  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  // Five text beats, each with its own absolute scroll window so text always
  // lands on the matching real content in the footage rather than dividing
  // the scroll evenly. Shared by desktop and mobile — same footage, same
  // narrative timing.
  const TEXT_WINDOWS = [
    { inStart: -0.001, inEnd: 0, outStart: 0.065, outEnd: 0.09 },
    { inStart: 0.10, inEnd: 0.14, outStart: 0.27, outEnd: 0.31 },
    { inStart: 0.32, inEnd: 0.36, outStart: 0.48, outEnd: 0.52 },
    { inStart: 0.73, inEnd: 0.77, outStart: 0.885, outEnd: 0.915 },
    { inStart: 0.93, inEnd: 0.965, outStart: null, outEnd: null },
  ];

  if (reduceMotion || !hasGsap) {
    initFallback();
  } else {
    initScrollExperience();
  }

  /* ---------------- Fallback: reduced-motion / no GSAP only ---------------- */

  function initFallback() {
    setHeroHeaderActive(false);
    heroSection.hidden = true;
    heroSection.style.display = "none";
    mobileSection.hidden = true;
    mobileSection.style.display = "none";
    fallbackSection.hidden = false;

    const scenes = Array.from(fallbackSection.querySelectorAll(".dhero-fallback-scene"));
    if (!("IntersectionObserver" in window)) {
      scenes.forEach((scene) => {
        activateFallbackScene(scene);
        scene.classList.add("is-visible");
      });
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const scene = entry.target;
          const video = scene.querySelector(".dhero-fallback-video");
          if (entry.isIntersecting) {
            scene.classList.add("is-visible");
            activateFallbackScene(scene);
            if (video && !reduceMotion) video.play().catch(() => {});
          } else if (video) {
            video.pause();
          }
        });
      },
      { threshold: 0.35 }
    );

    scenes.forEach((scene) => io.observe(scene));
  }

  function activateFallbackScene(scene) {
    const video = scene.querySelector(".dhero-fallback-video");
    if (!video || video.src) return;
    const isMobileViewport = window.innerWidth <= 768;
    const src = (isMobileViewport && video.dataset.srcMobile) || video.dataset.src;
    if (src) {
      video.src = src;
      video.load();
    }
  }

  /* ---------------- Scroll-scrubbed experiences ---------------- */

  function initScrollExperience() {
    mobileSection.hidden = false;
    fallbackSection.hidden = true;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => initDesktopExperience());
    mm.add("(max-width: 768px)", () => initMobileExperience());

    function refreshAll() {
      ScrollTrigger.refresh();
    }

    window.addEventListener("load", refreshAll);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refreshAll);
    }
    window.addEventListener("orientationchange", () => {
      setTimeout(refreshAll, 250);
    });

    let lastWidth = window.innerWidth;
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth !== lastWidth) {
          lastWidth = window.innerWidth;
          refreshAll();
        }
      }, 150);
    });
  }

  /* ---------------- Desktop / tablet: pinned canvas frame sequence ---------------- */

  function initDesktopExperience() {
    const SCENE_COUNT = 3;
    const FRAMES_PER_SCENE = 72;
    const CROSS = 0.02;

    // Three equal-weight segments — the clips are all ~10s, unlike home1's
    // narratively-weighted scenes — so bounds land at exact thirds.
    const bounds = [0, 1 / 3, 2 / 3, 1];

    const canvas = document.getElementById("dheroCanvas");
    const ctx = canvas.getContext("2d");
    const visual = document.getElementById("dheroVisual");
    const whiteOverlay = document.getElementById("dheroWhiteOverlay");
    const texts = Array.from(heroSection.querySelectorAll(".dhero-scene-text"));
    const progressFill = document.getElementById("dheroProgressFill");
    const scrollCue = document.getElementById("dheroScrollCue");

    const frames = [];
    for (let s = 0; s < SCENE_COUNT; s++) {
      frames.push(new Array(FRAMES_PER_SCENE).fill(null));
    }

    let lastProgress = 0;
    const loadedScenes = new Set();
    function ensureLoaded(sceneIndex) {
      if (sceneIndex < 0 || sceneIndex >= SCENE_COUNT || loadedScenes.has(sceneIndex)) return;
      loadedScenes.add(sceneIndex);
      const sceneNumber = sceneIndex + 1;
      for (let f = 0; f < FRAMES_PER_SCENE; f++) {
        const img = new Image();
        const entry = { img, loaded: false };
        img.onload = () => { entry.loaded = true; render(lastProgress); };
        img.src = "assets/video/hero/frames/dhero-" + sceneNumber + "/f" + String(f).padStart(3, "0") + ".jpg";
        frames[sceneIndex][f] = entry;
      }
    }
    ensureLoaded(0);
    ensureLoaded(1);

    function nearestLoadedFrame(sceneIndex, frameIndex) {
      const arr = frames[sceneIndex];
      if (!arr) return null;
      for (let d = 0; d < FRAMES_PER_SCENE; d++) {
        const lo = frameIndex - d;
        const hi = frameIndex + d;
        if (lo >= 0 && arr[lo] && arr[lo].loaded) return arr[lo].img;
        if (hi < FRAMES_PER_SCENE && arr[hi] && arr[hi].loaded) return arr[hi].img;
      }
      return null;
    }

    function frameOrNearest(sceneIndex, frameIndex) {
      const arr = frames[sceneIndex];
      if (arr && arr[frameIndex] && arr[frameIndex].loaded) return arr[frameIndex].img;
      return nearestLoadedFrame(sceneIndex, frameIndex);
    }

    function drawSceneFrame(sceneIndex, localT, opacity, extraScale) {
      const frameIndex = Math.round(clamp01(localT) * (FRAMES_PER_SCENE - 1));
      const img = frameOrNearest(sceneIndex, frameIndex);
      if (img) {
        ctx.globalAlpha = opacity;
        drawCover(img, extraScale);
        ctx.globalAlpha = 1;
      }
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    resizeCanvas();
    const onWindowResize = () => {
      resizeCanvas();
      render(lastProgress);
    };
    window.addEventListener("resize", onWindowResize);

    // No scroll-driven dolly/zoom — the wide diorama composition (doctor,
    // full monitor, desk, floating UI) must stay entirely visible and at a
    // near-fixed scale throughout. Scroll drives frame progression only.
    const DOLLY_AMOUNT = 0;

    // Full-bleed cover fit — the hero visual is a background layer that
    // always fills the pinned stage edge to edge (object-fit: cover
    // equivalent), never a small image floating inside a larger white
    // container. The source frames are plain, unpadded close-ups of the
    // diorama, so this crops only the outer edges of the scene, never the
    // doctor/monitor/UI at their normal on-screen size — on a normal
    // desktop/tablet aspect ratio.
    function drawCover(image, extraScale) {
      const cw = canvas.width, ch = canvas.height;
      const iw = image.naturalWidth || image.width;
      const ih = image.naturalHeight || image.height;
      if (!iw || !ih) return;
      const scale = Math.max(cw / iw, ch / ih) * (extraScale || 1);
      const dw = iw * scale, dh = ih * scale;
      const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
      ctx.drawImage(image, dx, dy, dw, dh);
    }

    // Camera stays fixed: no zoom, no rotation, no velocity-driven tilt or
    // blur. The only movement allowed is a slow, tiny translate drift
    // (well under the 10-20px ceiling) so the shot doesn't feel like a
    // perfectly static image — everything else about the story is told
    // by the frame sequence and text, never by moving/scaling the camera.
    function applyCameraFeel(progress) {
      const driftX = Math.sin(progress * 9.4) * 6;
      const driftY = Math.cos(progress * 6.7) * 4;
      canvas.style.transform = "translate3d(" + driftX.toFixed(2) + "px," + driftY.toFixed(2) + "px,0)";
    }

    function renderScenes(progress) {
      const scaled = progress * SCENE_COUNT;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < SCENE_COUNT; i++) {
        const sceneStart = bounds[i] * SCENE_COUNT;
        const sceneEnd = bounds[i + 1] * SCENE_COUNT;
        const hasPrev = i > 0;
        const hasNext = i < SCENE_COUNT - 1;
        const crossScaled = CROSS * SCENE_COUNT;
        const fadeInStart = hasPrev ? sceneStart - crossScaled : sceneStart;
        const fadeOutEnd = hasNext ? sceneEnd + crossScaled : sceneEnd;

        let opacity = 0;
        if (scaled >= fadeInStart && scaled <= fadeOutEnd) {
          if (hasPrev && scaled < sceneStart) {
            opacity = clamp01((scaled - fadeInStart) / crossScaled);
          } else if (hasNext && scaled > sceneEnd) {
            opacity = 1 - clamp01((scaled - sceneEnd) / crossScaled);
          } else {
            opacity = 1;
          }
        } else if (!hasPrev && scaled < sceneStart) {
          opacity = 1;
        } else if (!hasNext && scaled > sceneEnd) {
          opacity = 1;
        }

        if (opacity > 0) {
          ensureLoaded(i);
          ensureLoaded(i + 1);
          const localT = clamp01((scaled - fadeInStart) / (fadeOutEnd - fadeInStart));
          const dollyScale = 1 + localT * DOLLY_AMOUNT;
          drawSceneFrame(i, localT, opacity, dollyScale);
        }
      }

      // Apple-style release: over the final stretch, dissolve the frame to
      // white so the pinned hero hands off to the next (white) section
      // with no seam or flash. The scale here is capped at 3% — a hint of
      // pulling back, not a zoom — the dissolve does the actual work.
      const RELEASE_START = 0.93;
      if (progress > RELEASE_START) {
        const t = clamp01((progress - RELEASE_START) / (1 - RELEASE_START));
        // Eased (t*t) rather than linear: the scene stays crisp and
        // readable through most of this window and only rushes to white
        // right at the very end, instead of visibly washing out for the
        // whole final 7% of the scroll.
        const eased = t * t;
        ctx.globalAlpha = eased;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        visual.style.transform = "scale(" + (1 - eased * 0.03).toFixed(4) + ")";
        whiteOverlay.style.opacity = String(eased);
      } else {
        visual.style.transform = "scale(1)";
        whiteOverlay.style.opacity = "0";
      }
    }

    function renderTexts(progress) {
      texts.forEach((text, i) => {
        const w = TEXT_WINDOWS[i];
        if (!w) return;

        let alpha = 0;
        let ty = 16;
        let blur = 10;

        if (progress < w.inStart) {
          alpha = 0; ty = 16; blur = 10;
        } else if (progress < w.inEnd) {
          const t = clamp01((progress - w.inStart) / (w.inEnd - w.inStart));
          alpha = t; ty = 16 * (1 - t); blur = 10 * (1 - t);
        } else if (w.outStart === null || progress <= w.outStart) {
          alpha = 1; ty = 0; blur = 0;
        } else if (progress <= w.outEnd) {
          const t = clamp01((progress - w.outStart) / (w.outEnd - w.outStart));
          alpha = 1 - t; ty = -14 * t; blur = 8 * t;
        } else {
          alpha = 0; ty = -14; blur = 8;
        }

        text.style.opacity = String(alpha);
        text.style.transform = "translateY(calc(-50% + " + ty.toFixed(1) + "px))";
        text.style.filter = blur > 0.05 ? "blur(" + blur.toFixed(1) + "px)" : "none";
        text.classList.toggle("is-interactive", alpha > 0.5);
      });
    }

    function render(progress) {
      lastProgress = progress;
      applyCameraFeel(progress);
      renderScenes(progress);
      renderTexts(progress);

      if (progressFill) progressFill.style.width = (progress * 100).toFixed(2) + "%";
      if (scrollCue) scrollCue.classList.toggle("is-hidden", progress > 0.02);
    }

    render(0);

    // ---- Momentum layer: lerps toward the raw scroll-derived progress
    // every frame so frame/text transitions never hard-cut, and tracks
    // scroll velocity purely to detect when scrolling has truly settled
    // (below) — the camera itself no longer reacts to velocity. --------
    const LERP_FACTOR = 0.12;
    const VELOCITY_SMOOTHING = 0.2;
    const SETTLE_EPSILON = 0.0003;

    let rawProgress = 0;
    let smoothProgress = 0;
    let lastRawProgress = 0;
    let velocityPerSec = 0;
    let lastTime = 0;
    let rafId = null;

    function tick(now) {
      const dt = lastTime ? Math.max(0.001, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;

      const instVelocity = (rawProgress - lastRawProgress) / dt;
      lastRawProgress = rawProgress;
      velocityPerSec += (instVelocity - velocityPerSec) * VELOCITY_SMOOTHING;

      smoothProgress += (rawProgress - smoothProgress) * LERP_FACTOR;

      render(smoothProgress);

      const settled =
        Math.abs(rawProgress - smoothProgress) < SETTLE_EPSILON &&
        Math.abs(velocityPerSec) < 0.001;

      if (settled) {
        rafId = null;
        lastTime = 0;
      } else {
        rafId = requestAnimationFrame(tick);
      }
    }

    function kick() {
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    const st = ScrollTrigger.create({
      trigger: heroSection,
      start: "top top",
      end: "bottom bottom",
      pin: "#dheroStage",
      anticipatePin: 1,
      scrub: true,
      invalidateOnRefresh: true,
      onEnter: () => setHeroHeaderActive(true),
      onLeave: () => setHeroHeaderActive(false),
      onEnterBack: () => setHeroHeaderActive(true),
      onLeaveBack: () => setHeroHeaderActive(false),
      onUpdate: (self) => {
        rawProgress = self.progress;
        kick();
      },
      onRefresh: (self) => {
        setHeroHeaderActive(self.isActive || self.progress === 0);
        rawProgress = self.progress;
        smoothProgress = rawProgress;
        lastRawProgress = rawProgress;
        velocityPerSec = 0;
        render(rawProgress);
      },
    });

    // gsap.matchMedia() auto-reverts the ScrollTrigger created above (and
    // restores the pin-spacer) when this breakpoint stops matching — this
    // cleanup only needs to handle the plain DOM listener and RAF loop.
    return () => {
      window.removeEventListener("resize", onWindowResize);
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    };
  }

  /* ---------------- Mobile: pinned 9:16 video scrub ---------------- */

  // REWRITTEN — was a discrete scene state machine: only videos[activeIndex]
  // ever received a currentTime update, and crossfades were driven by a
  // fixed-duration GSAP opacity tween running in parallel while BOTH clips
  // sat frozen on whichever single frame they'd been seeked to when the
  // fade started. That's what read as a freeze/jump/wrong-frame at every
  // scene boundary. Fixed architecture below:
  //   - ONE continuous virtual timeline (seconds = sum of the three real
  //     clip durations), not three independently-thirded scroll ranges.
  //   - Every render tick recomputes opacity directly from progress (no
  //     GSAP tweens created in onUpdate/RAF — see "DO NOT CREATE GSAP
  //     TWEENS IN onUpdate" below) and calls safeSeek() on EVERY video
  //     that's currently visible (opacity > 0) — during a crossfade that
  //     is both the outgoing and incoming clip, every frame, for the
  //     entire overlap window, not once at the start of the fade.
  //   - Videos are loaded and metadata-waited ONCE up front; the
  //     ScrollTrigger isn't created until all three durations are known.
  //   - No repeated currentTime = 0.01 preload seeking and no video.load()
  //     calls inside the render loop.
  function initMobileExperience() {
    // A fixed pixel distance doesn't scale across phones (360x800 vs.
    // 430x932 etc.) — sized off the viewport's own height instead, so the
    // scroll-to-complete-the-story distance feels consistent everywhere.
    // Re-evaluated by ScrollTrigger on every refresh (function value +
    // invalidateOnRefresh below), so rotating the device or the browser
    // chrome resizing the viewport keeps it correct without a manual
    // recalculation loop.
    const mobileScrollDistance = () => window.innerHeight * 3.5;
    // ~1s of virtual timeline shared by each MOB(n) -> MOB(n+1) crossfade
    // (clamped per-pair against the shorter clip's own duration so a very
    // short clip can never get an overlap longer than itself).
    const OVERLAP_SECONDS = 1.0;
    const SRC = [
      "assets/video/hero/docreg-mobile/1.mp4",
      "assets/video/hero/docreg-mobile/2.mp4",
      "assets/video/hero/docreg-mobile/3.mp4",
    ];
    const EASE = gsap.parseEase("power1.inOut");

    const whiteOverlay = document.getElementById("mheroWhiteOverlay");
    const texts = Array.from(mobileSection.querySelectorAll(".mhero-scene-text"));
    const progressFill = document.getElementById("mheroProgressFill");
    const scrollCue = document.getElementById("mheroScrollCue");
    const videos = Array.from(mobileSection.querySelectorAll(".mhero-video"));

    let destroyed = false;
    const ready = videos.map(() => false); // metadata (duration) known
    const durations = videos.map(() => 0); // real video.duration, filled in once ready

    // Same browsers-won't-paint-a-never-played-video quirk as before: a
    // muted play()+pause() the moment metadata is available establishes
    // the video's compositor layer once, up front, so later currentTime
    // seeks actually paint instead of silently staying on a black frame.
    // This is a ONE-TIME init warm-up, not the prohibited pattern of
    // calling play()/pause() to drive scroll-scrubbing — currentTime is
    // the only thing that ever drives playback below.
    function primeCompositor(video) {
      video.play().then(() => video.pause()).catch(() => {});
    }

    function waitForMetadata(video) {
      return new Promise((resolve) => {
        if (video.readyState >= 1) {
          resolve();
          return;
        }
        video.addEventListener("loadedmetadata", resolve, { once: true });
      });
    }

    // Used only for the very first reveal (scene 0, below) — waits for an
    // actually decodable frame (readyState >= 2) rather than just metadata,
    // so the stage never shows an undecoded/blank video the instant its
    // opacity is set to 1. Later scenes don't need this: updateSequence()
    // already gates its own crossfade-in on the same readyState check.
    function waitForFrame(video) {
      return new Promise((resolve) => {
        if (video.readyState >= 2) {
          resolve();
          return;
        }
        const events = ["loadeddata", "canplay"];
        const done = () => {
          events.forEach((ev) => video.removeEventListener(ev, done));
          resolve();
        };
        events.forEach((ev) => video.addEventListener(ev, done, { once: true }));
      });
    }

    // safeSeek: the single place currentTime is ever written. Clamps to
    // the video's real decodable duration (never assumes exactly 10s) and
    // skips the write entirely if already within one sub-frame of the
    // target, so a settled clip isn't re-seeked every RAF tick for no
    // reason.
    function safeSeek(video, time, isReady) {
      if (!video || !isReady || video.readyState < 2) return;
      const duration = video.duration;
      if (!Number.isFinite(duration)) return;
      const target = gsap.utils.clamp(0, Math.max(0, duration - 0.04), time);
      if (Math.abs(video.currentTime - target) > 1 / 48) {
        try { video.currentTime = target; } catch (e) { /* not seekable yet */ }
      }
    }

    // Src assigned and load() called exactly once per video, up front —
    // never reassigned and never reloaded again for the life of this
    // breakpoint activation (re-pointing src / reloading mid-scroll is
    // itself a source of decode stalls and black frames).
    videos.forEach((video, i) => {
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.pause();
      video.addEventListener(
        "loadedmetadata",
        () => {
          if (destroyed) return;
          ready[i] = true;
          durations[i] = video.duration;
          primeCompositor(video);
        },
        { once: true }
      );
      video.src = SRC[i];
      video.load();
    });

    // ---- One continuous virtual timeline: length = sum of the three
    // clips' real durations. Computed once metadata for all three has
    // resolved (see boot() below) and never recomputed after — the
    // ScrollTrigger itself isn't created until this is known, so nothing
    // downstream ever has to guess with a fallback duration.
    let totalDuration = 0;
    let boundary1 = 0; // virtual second where MOB1 -> MOB2 is centered
    let boundary2 = 0; // virtual second where MOB2 -> MOB3 is centered

    // Computes each video's opacity for this instant directly from the
    // virtual timeline position (no tweens) and seeks EVERY video that's
    // currently visible — both outgoing and incoming during a crossfade —
    // every single call. This is the core fix: previously only
    // videos[activeIndex] was ever seeked.
    function updateSequence(virtualTime) {
      const d0 = durations[0], d1 = durations[1], d2 = durations[2];
      const overlap1 = Math.min(OVERLAP_SECONDS, d0, d1);
      const overlap2 = Math.min(OVERLAP_SECONDS, d1, d2);
      const t1Start = boundary1 - overlap1 / 2, t1End = boundary1 + overlap1 / 2;
      const t2Start = boundary2 - overlap2 / 2, t2End = boundary2 + overlap2 / 2;

      let o0 = 0, o1 = 0, o2 = 0;

      if (virtualTime < t1End && virtualTime > t1Start) {
        // MOB1 -> MOB2 crossfade. Local time for each clip falls out of
        // the virtual timeline naturally (local0 = virtualTime, local1 =
        // virtualTime - boundary1), so MOB2 is already a fraction of a
        // second into its own motion the instant it starts appearing —
        // never revealed and then snapped back to frame 0.
        const raw = gsap.utils.clamp(0, 1, gsap.utils.mapRange(t1Start, t1End, 0, 1, virtualTime));
        // Never fade MOB2 in over a frame it hasn't actually decoded yet —
        // hold MOB1 fully visible until MOB2 confirms readyState >= 2, so
        // the incoming clip is always either moving or not-yet-shown,
        // never a black/blank gap.
        const mob2Ready = ready[1] && videos[1].readyState >= 2;
        const eased = mob2Ready ? EASE(raw) : 0;
        o0 = 1 - eased;
        o1 = eased;
        safeSeek(videos[0], virtualTime, ready[0]);
        safeSeek(videos[1], virtualTime - boundary1, ready[1]);
      } else if (virtualTime <= t1Start) {
        o0 = 1;
        safeSeek(videos[0], virtualTime, ready[0]);
      } else if (virtualTime < t2End && virtualTime > t2Start) {
        // MOB2 -> MOB3 crossfade — same treatment.
        const raw = gsap.utils.clamp(0, 1, gsap.utils.mapRange(t2Start, t2End, 0, 1, virtualTime));
        const mob3Ready = ready[2] && videos[2].readyState >= 2;
        const eased = mob3Ready ? EASE(raw) : 0;
        o1 = 1 - eased;
        o2 = eased;
        safeSeek(videos[1], virtualTime - boundary1, ready[1]);
        safeSeek(videos[2], virtualTime - boundary2, ready[2]);
      } else if (virtualTime <= t2Start) {
        o1 = 1;
        safeSeek(videos[1], virtualTime - boundary1, ready[1]);
      } else {
        // Final leg, including the last stretch of scroll where MOB3 has
        // already reached its own end — safeSeek's own clamp holds it at
        // its last decodable frame instead of seeking past duration, so
        // there's a natural end-of-timeline hold with no extra state.
        o2 = 1;
        safeSeek(videos[2], virtualTime - boundary2, ready[2]);
      }

      videos[0].style.opacity = o0;
      videos[1].style.opacity = o1;
      videos[2].style.opacity = o2;
    }

    function renderTexts(progress) {
      texts.forEach((text, i) => {
        const w = TEXT_WINDOWS[i];
        if (!w) return;

        let alpha = 0;
        let ty = 16;

        if (progress < w.inStart) {
          alpha = 0; ty = 16;
        } else if (progress < w.inEnd) {
          const t = clamp01((progress - w.inStart) / (w.inEnd - w.inStart));
          alpha = t; ty = 16 * (1 - t);
        } else if (w.outStart === null || progress <= w.outStart) {
          alpha = 1; ty = 0;
        } else if (progress <= w.outEnd) {
          const t = clamp01((progress - w.outStart) / (w.outEnd - w.outStart));
          alpha = 1 - t; ty = -14 * t;
        } else {
          alpha = 0; ty = -14;
        }

        text.style.opacity = String(alpha);
        text.style.transform = "translate(-50%, " + ty.toFixed(1) + "px)";
        text.classList.toggle("is-interactive", alpha > 0.5);
      });
    }

    function render(progress) {
      updateSequence(clamp01(progress) * totalDuration);
      renderTexts(progress);

      if (progressFill) progressFill.style.width = (progress * 100).toFixed(2) + "%";
      if (scrollCue) scrollCue.classList.toggle("is-hidden", progress > 0.02);

      // Apple-style white release at the very end, same as desktop, for a
      // consistent handoff into the (white) section that follows —
      // independent of the video crossfade opacities above.
      const RELEASE_START = 0.93;
      if (progress > RELEASE_START) {
        const t = clamp01((progress - RELEASE_START) / (1 - RELEASE_START));
        whiteOverlay.style.opacity = String(t * t);
      } else {
        whiteOverlay.style.opacity = "0";
      }
    }

    // ---- Touch-following smoothness ----
    // ONE smoothing layer only. ScrollTrigger's own `scrub: <number>` adds
    // its own internal tween that takes that many seconds to catch up to
    // the scrollbar — stacked on top of the RAF lerp below, the two delays
    // compound (each one waiting on the other to settle), which read as a
    // sluggish, laggy catch-up between finger and video. Fixed by setting
    // `scrub: true` below (raw progress, no extra GSAP-side delay) and
    // letting this RAF loop be the only place smoothing happens. Because
    // it's the only layer now (nothing else adding delay on top of it),
    // SMOOTH_FACTOR can be tuned purely for feel: lower = smoother/more
    // float, higher = snappier/tighter to the finger. 0.12 favors smooth.
    let targetProgress = 0;
    let smoothProgress = 0;
    let rafId = null;
    const SMOOTH_FACTOR = 0.12;
    const SETTLE_EPSILON = 0.0004;

    function tick() {
      smoothProgress += (targetProgress - smoothProgress) * SMOOTH_FACTOR;
      render(smoothProgress);

      if (Math.abs(targetProgress - smoothProgress) < SETTLE_EPSILON) {
        smoothProgress = targetProgress;
        render(smoothProgress);
        rafId = null; // converged — stop ticking instead of spinning forever
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    function kick() {
      if (destroyed) return;
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    // Tracked explicitly (not left to gsap.matchMedia()'s automatic
    // context capture) because this ScrollTrigger is created asynchronously
    // — only once all three clips' metadata has resolved — which happens
    // *after* the synchronous mm.add() callback that GSAP's auto-tracking
    // watches has already returned. An auto-tracked trigger reverts itself
    // on breakpoint change for free; this one won't, so the cleanup below
    // kills it explicitly instead.
    let scrollTriggerInstance = null;

    function createScrollTrigger() {
      const st = ScrollTrigger.create({
        trigger: mobileSection,
        start: "top top",
        end: () => "+=" + mobileScrollDistance(),
        pin: "#mheroStage",
        anticipatePin: 1,
        // true, not a number: no built-in GSAP-side catch-up delay — the
        // RAF lerp above (SMOOTH_FACTOR) is the only smoothing layer. See
        // "Touch-following smoothness" comment below for why stacking a
        // second delay here was the cause of the laggy/slow scroll feel.
        scrub: true,
        invalidateOnRefresh: true,
        onEnter: () => setHeroHeaderActive(true),
        onLeave: () => setHeroHeaderActive(false),
        onEnterBack: () => setHeroHeaderActive(true),
        onLeaveBack: () => setHeroHeaderActive(false),
        onUpdate: (self) => {
          targetProgress = self.progress;
          kick();
        },
        onRefresh: (self) => {
          setHeroHeaderActive(self.isActive || self.progress === 0);
          targetProgress = self.progress;
          smoothProgress = targetProgress;
          render(smoothProgress);
        },
      });
      scrollTriggerInstance = st;
      return st;
    }

    // Boot sequence: load all three videos once (above), wait for every
    // one's metadata (and therefore real duration) before computing the
    // virtual timeline or creating the ScrollTrigger — the pinned
    // experience must never go live against an uninitialized video. Each
    // clip's own first frame is also seeked once here (safeSeek, still
    // invisible at opacity: 0 except scene 0) so the very first reveal and
    // the first crossfade never have to pay for a fresh seek.
    Promise.all(videos.map(waitForMetadata)).then(() => {
      if (destroyed) return;

      durations[0] = videos[0].duration;
      durations[1] = videos[1].duration;
      durations[2] = videos[2].duration;
      ready[0] = ready[1] = ready[2] = true;
      totalDuration = durations[0] + durations[1] + durations[2];
      boundary1 = durations[0];
      boundary2 = durations[0] + durations[1];

      videos.forEach((video) => primeCompositor(video));
      safeSeek(videos[1], 0, true);
      safeSeek(videos[2], 0, true);

      return waitForFrame(videos[0]);
    }).then(() => {
      if (destroyed) return;
      safeSeek(videos[0], 0, true);
      videos[0].style.opacity = "1";
      render(0);
      createScrollTrigger();
    });

    // This ScrollTrigger is created asynchronously (see createScrollTrigger
    // above), so gsap.matchMedia() cannot auto-revert it — killed explicitly
    // here instead. Everything else this branch creates synchronously
    // (none, currently) would still be auto-reverted as normal.
    return () => {
      destroyed = true;
      if (scrollTriggerInstance) {
        scrollTriggerInstance.kill();
        scrollTriggerInstance = null;
      }
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      videos.forEach((video, i) => {
        video.pause();
        video.removeAttribute("src");
        video.load();
        ready[i] = false;
        durations[i] = 0;
      });
    };
  }
})();
