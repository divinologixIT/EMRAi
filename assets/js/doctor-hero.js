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

  // A discrete scene state machine, not a continuous scroll-position
  // crossfade. The previous approach faded the outgoing clip out and the
  // incoming clip in purely as a function of scroll position — if the
  // incoming video's frame wasn't decoded yet (a fresh seek across a scene
  // boundary can take a real, variable amount of time), both clips could
  // be partially transparent at once and the white/near-black stage behind
  // them would show through as a black flash. Scene changes now only ever
  // happen through requestSceneChange() below, which keeps the outgoing
  // clip fully visible — holding its last good frame — until the incoming
  // clip has actually confirmed a decodable frame at the right time, and
  // only then runs a short, fixed-duration GSAP crossfade. Time-based, not
  // scroll-linked, so it can't stall or reverse mid-fade.
  function initMobileExperience() {
    const SCENE_COUNT = 3;
    // A fixed pixel distance doesn't scale across phones (360x800 vs.
    // 430x932 etc.) — sized off the viewport's own height instead, so the
    // scroll-to-complete-the-story distance feels consistent everywhere.
    // Re-evaluated by ScrollTrigger on every refresh (function value +
    // invalidateOnRefresh below), so rotating the device or the browser
    // chrome resizing the viewport keeps it correct without a manual
    // recalculation loop.
    const mobileScrollDistance = () => window.innerHeight * 3.5;
    const CROSSFADE_SECONDS = 0.18;
    // Used only for a clip whose real duration isn't known yet (metadata
    // still loading) — timelinePosition() below switches to the real
    // video.duration the instant it's available, so this only ever
    // affects the earliest fraction of a second after activation.
    const FALLBACK_SCENE_SECONDS = 10;
    const SRC = [
      "assets/video/hero/docreg-mobile/1.mp4",
      "assets/video/hero/docreg-mobile/2.mp4",
      "assets/video/hero/docreg-mobile/3.mp4",
    ];

    const whiteOverlay = document.getElementById("mheroWhiteOverlay");
    const texts = Array.from(mobileSection.querySelectorAll(".mhero-scene-text"));
    const progressFill = document.getElementById("mheroProgressFill");
    const scrollCue = document.getElementById("mheroScrollCue");
    const videos = Array.from(mobileSection.querySelectorAll(".mhero-video"));

    let destroyed = false;
    const ready = videos.map(() => false); // metadata (duration) known
    const loaded = videos.map(() => false); // src assigned, load() called

    // Same browsers-won't-paint-a-never-played-video quirk as before: a
    // muted play()+pause() the moment metadata is available establishes
    // the video's compositor layer once, up front, so later currentTime
    // seeks actually paint instead of silently staying on a black frame.
    function primeCompositor(video) {
      video.play().then(() => video.pause()).catch(() => {});
    }

    // Preload every scene up front rather than lazily on approach — only
    // 3 short clips here, and preloading all of them (not just current +
    // next) is what makes reverse scrolling (scene 3 -> 2 -> 1) hit an
    // already-buffered video instead of a fresh, slow seek. src is set
    // exactly once per video for the life of this breakpoint activation —
    // never reassigned mid-scroll, and load() is never called again after
    // this, since re-pointing src/reloading mid-scroll is itself a source
    // of decode stalls and black frames.
    function ensureLoaded(sceneIndex) {
      if (sceneIndex < 0 || sceneIndex >= SCENE_COUNT || loaded[sceneIndex]) return;
      loaded[sceneIndex] = true;
      const video = videos[sceneIndex];
      video.addEventListener(
        "loadedmetadata",
        () => {
          if (destroyed) return;
          ready[sceneIndex] = true;
          primeCompositor(video);
        },
        { once: true }
      );
      video.src = SRC[sceneIndex];
      video.load();
    }
    for (let i = 0; i < SCENE_COUNT; i++) ensureLoaded(i);

    // ---- Scene state machine ----
    let activeIndex = 0;
    let transitioning = false;
    let pendingIndex = 0;
    let pendingLocalSeconds = 0;
    let lastProgress = 0;

    // The three clips are one continuous virtual film, not three
    // independently-thirded scroll ranges — total length is the sum of
    // the clips' own durations (read live off video.duration, falling
    // back to an estimate for any clip whose metadata hasn't loaded yet),
    // and scroll progress (0-1) maps onto "which second of that film" is
    // showing. Recomputed on every call rather than cached once: cheap
    // arithmetic, and it self-corrects the moment each clip's real
    // duration becomes known instead of ever locking in a wrong guess.
    function sceneDuration(i) {
      const d = videos[i].duration;
      return ready[i] && isFinite(d) && d > 0 ? d : FALLBACK_SCENE_SECONDS;
    }

    function totalDuration() {
      let sum = 0;
      for (let i = 0; i < SCENE_COUNT; i++) sum += sceneDuration(i);
      return sum;
    }

    function timelinePosition(progress) {
      const virtualTime = clamp01(progress) * totalDuration();
      let acc = 0;
      for (let i = 0; i < SCENE_COUNT; i++) {
        const d = sceneDuration(i);
        const isLast = i === SCENE_COUNT - 1;
        if (virtualTime < acc + d || isLast) {
          return { idx: i, localSeconds: Math.max(0, Math.min(d, virtualTime - acc)) };
        }
        acc += d;
      }
      // Unreachable — the isLast branch above always returns — kept only
      // so this function can never silently fall through to undefined.
      return { idx: SCENE_COUNT - 1, localSeconds: sceneDuration(SCENE_COUNT - 1) };
    }

    // Continuous fine scrub for whichever clip is already fully visible —
    // no readiness gating needed here since it's already on-screen; a
    // sub-frame stutter mid-scrub is normal video-scrub behavior, never a
    // blank/black stage.
    function scrubActive(localSeconds) {
      const video = videos[activeIndex];
      if (!ready[activeIndex]) return;
      const duration = video.duration;
      if (!duration || !isFinite(duration)) return;
      const t = Math.max(0, Math.min(duration, localSeconds));
      if (Math.abs(video.currentTime - t) > 0.02) {
        try { video.currentTime = t; } catch (e) { /* not seekable yet */ }
      }
    }

    // Seeks `video` to `time` and calls onReady only once a decodable
    // frame at that position is confirmed — never fires early off a stale
    // readyState left over from a previous position. Listens for all three
    // of seeked/loadeddata/canplay (not just "seeked"): when the target
    // time is the same as the video's current position (notably the very
    // first reveal, seeking to time 0 on a video already at 0), some
    // browsers treat it as a no-op and never fire "seeked" at all, which
    // would otherwise hang this forever.
    function seekAndReveal(video, time, onReady) {
      if (destroyed) return;
      const alreadyThere = Math.abs(video.currentTime - time) < 0.02;
      if (alreadyThere && video.readyState >= 2) {
        onReady();
        return;
      }

      let settled = false;
      const events = ["seeked", "loadeddata", "canplay"];
      const cleanup = () => events.forEach((ev) => video.removeEventListener(ev, check));
      const check = () => {
        if (settled || destroyed) return;
        if (video.readyState < 2) return; // frame not actually decodable yet — keep waiting
        settled = true;
        cleanup();
        onReady();
      };

      events.forEach((ev) => video.addEventListener(ev, check));
      try {
        video.currentTime = time;
      } catch (e) {
        cleanup();
        // Seek call itself failed (video not seekable yet) — wait for it
        // to become ready instead of revealing a wrong/undecoded frame.
        video.addEventListener(
          "loadedmetadata",
          () => { if (!destroyed) seekAndReveal(video, time, onReady); },
          { once: true }
        );
        return;
      }
      // The seek may already have landed on a buffered/decoded frame
      // synchronously (e.g. re-requesting the same position) — re-check
      // readyState directly rather than waiting on an event that may
      // never fire in that case.
      check();
    }

    function crossfadeTo(targetIndex) {
      if (destroyed) return;
      const fromIndex = activeIndex;
      const fromVideo = videos[fromIndex];
      const toVideo = videos[targetIndex];

      // Only one crossfade tween per video at a time — prevents opacity
      // race conditions from overlapping transitions (e.g. a fast flick
      // that changes target again before the previous fade finished).
      gsap.killTweensOf([fromVideo, toVideo]);
      if (fromIndex !== targetIndex) {
        // True simultaneous crossfade (not an instant swap underneath a
        // fade-out): at every instant their opacities sum to 1, so a real
        // decoded frame is always at least partially on screen from both
        // clips — never a black gap, and never a hard cut either.
        gsap.to(toVideo, { opacity: 1, duration: CROSSFADE_SECONDS, ease: "none", overwrite: "auto" });
        gsap.to(fromVideo, {
          opacity: 0,
          duration: CROSSFADE_SECONDS,
          ease: "none",
          overwrite: "auto",
          onComplete: () => { if (!destroyed) fromVideo.pause(); },
        });
      } else {
        gsap.set(toVideo, { opacity: 1 });
      }

      activeIndex = targetIndex;
      transitioning = false;

      // If scroll kept moving while we were waiting/fading, chase the
      // latest target immediately rather than waiting for another render
      // tick — otherwise a fast flick could visibly lag the scrollbar.
      const latest = timelinePosition(lastProgress);
      if (latest.idx !== activeIndex) {
        requestSceneChange(latest.idx, latest.localSeconds);
      } else {
        scrubActive(latest.localSeconds);
      }
    }

    function attemptTransition() {
      const targetIndex = pendingIndex;
      const targetLocalSeconds = pendingLocalSeconds;
      const video = videos[targetIndex];
      ensureLoaded(targetIndex);

      const proceed = () => {
        if (destroyed) return;
        // The desired scene may have changed again while this seek was
        // in flight (user kept scrolling) — chase the newest target
        // instead of committing to a now-stale one.
        if (pendingIndex !== targetIndex) {
          attemptTransition();
          return;
        }
        crossfadeTo(targetIndex);
      };

      if (!ready[targetIndex]) {
        video.addEventListener(
          "loadedmetadata",
          () => { if (!destroyed) attemptTransition(); },
          { once: true }
        );
        return;
      }

      const duration = video.duration;
      const time = isFinite(duration) ? Math.max(0, Math.min(duration, targetLocalSeconds)) : 0;
      seekAndReveal(video, time, proceed);
    }

    // The only entry point that may change which scene is on screen. The
    // currently-visible clip is never touched until the target clip has
    // confirmed a real, decoded frame ready to show.
    function requestSceneChange(targetIndex, targetLocalSeconds) {
      pendingIndex = targetIndex;
      pendingLocalSeconds = targetLocalSeconds;
      if (transitioning) return; // already chasing a target; it'll pick up the latest one
      transitioning = true;
      attemptTransition();
    }

    function renderScenes(progress) {
      const { idx, localSeconds } = timelinePosition(progress);
      if (transitioning) {
        // A transition is already resolving — just keep it pointed at the
        // freshest target; the outgoing clip stays visible untouched.
        pendingIndex = idx;
        pendingLocalSeconds = localSeconds;
      } else if (idx !== activeIndex) {
        requestSceneChange(idx, localSeconds);
      } else {
        scrubActive(localSeconds);
      }

      // Apple-style white release at the very end, same as desktop, for a
      // consistent handoff into the (white) section that follows. This is
      // a separate overlay layer, independent of the video crossfade —
      // never drives any video's opacity below the crossfade's own floor.
      const RELEASE_START = 0.93;
      if (progress > RELEASE_START) {
        const t = clamp01((progress - RELEASE_START) / (1 - RELEASE_START));
        whiteOverlay.style.opacity = String(t * t);
      } else {
        whiteOverlay.style.opacity = "0";
      }
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
      lastProgress = progress;
      renderScenes(progress);
      renderTexts(progress);

      if (progressFill) progressFill.style.width = (progress * 100).toFixed(2) + "%";
      if (scrollCue) scrollCue.classList.toggle("is-hidden", progress > 0.02);
    }

    // Do not create the ScrollTrigger (or run render() against real
    // progress) until scene 0's first frame is confirmed decodable — the
    // spec requirement that the pinned experience never becomes
    // interactive over an empty/black stage. Text stays at its CSS
    // default (opacity: 0) and the stage shows the page's own white
    // background during this brief wait, never a black one.
    function revealFirstFrame() {
      if (destroyed) return;
      if (!ready[0]) {
        // Metadata (and therefore duration/seekability) not loaded yet —
        // wait for it rather than seeking blind.
        videos[0].addEventListener("loadedmetadata", revealFirstFrame, { once: true });
        return;
      }
      seekAndReveal(videos[0], 0, () => {
        if (destroyed) return;
        videos[0].style.opacity = "1";
        activeIndex = 0;
        render(0);
        createScrollTrigger();
      });
    }
    revealFirstFrame();

    // ---- Touch-following smoothness ----
    // ScrollTrigger's own progress is the raw scroll position — driving
    // video.currentTime from it directly (even with `scrub` set, which
    // only smooths a *tween's* playhead, not a bare onUpdate readout)
    // reads every small touch-scroll jitter straight into the seek, which
    // is what reads as "jerky" on a phone. Instead onUpdate only ever
    // records targetProgress; a single RAF loop eases smoothProgress
    // toward it every frame and that eased value is the only thing that
    // ever drives the scene/video/text render. One RAF loop total for the
    // whole mobile experience — it's what actually calls render().
    let targetProgress = 0;
    let smoothProgress = 0;
    let rafId = null;
    const SMOOTH_FACTOR = 0.08;
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
    // — only once the first frame is confirmed ready — which happens
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
        scrub: 0.8,
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
      gsap.killTweensOf(videos);
      videos.forEach((video, i) => {
        video.pause();
        video.removeAttribute("src");
        video.load();
        loaded[i] = false;
        ready[i] = false;
      });
    };
  }
})();
