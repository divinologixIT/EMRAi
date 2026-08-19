/* ============================================================
   Divinexa — Doctor Journey Hero
   Scroll position drives the story across 3 clips / 5 text beats.
   GSAP ScrollTrigger pins the stage and scrubs a pre-extracted frame
   sequence (drawn to canvas) + crossfade + text reveal from scroll —
   frame lookups are instant (no video seek/decode), so the scrub
   tracks the scrollbar exactly. Same technique as cinematic-hero.js.
   Fallback (stacked autoplay video, no ScrollTrigger) is used only
   for prefers-reduced-motion or when GSAP/ScrollTrigger failed to
   load — never based on screen width alone.
   ============================================================ */
(() => {
  "use strict";

  const heroSection = document.getElementById("dheroSection");
  const fallbackSection = document.getElementById("dheroFallback");
  const siteHeader = document.querySelector(".site-header.scroll-hero-header");
  if (!heroSection || !fallbackSection) return;

  const setHeroHeaderActive = (active) => {
    siteHeader?.classList.toggle("hero-active", Boolean(active));
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  if (reduceMotion || !hasGsap) {
    initFallback();
  } else {
    initPinnedExperience();
  }

  /* ---------------- Fallback: reduced-motion / no GSAP only ---------------- */

  function initFallback() {
    setHeroHeaderActive(false);
    heroSection.hidden = true;
    heroSection.style.display = "none";
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
    if (video && !video.src && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  }

  /* ---------------- Pinned, scroll-scrubbed experience ---------------- */

  function initPinnedExperience() {
    fallbackSection.hidden = true;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

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

    let isMobileMode = false;
    let fxEnabled = true;

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
      const maxDpr = isMobileMode ? 1.5 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    resizeCanvas();
    window.addEventListener("resize", () => {
      resizeCanvas();
      render(lastProgress);
    });

    // No scroll-driven dolly/zoom — the wide diorama composition (doctor,
    // full monitor, desk, floating UI) must stay entirely visible and at a
    // near-fixed scale throughout. Scroll drives frame progression only.
    const DOLLY_AMOUNT = 0;

    // Desktop: full-bleed cover fit — the hero visual is a background
    // layer that always fills the pinned stage edge to edge (object-fit:
    // cover equivalent), never a small image floating inside a larger
    // white container. The source frames are plain, unpadded close-ups
    // of the diorama, so this crops only the outer edges of the scene,
    // never the doctor/monitor/UI at their normal on-screen size — on a
    // normal desktop/tablet aspect ratio.
    // Mobile: that assumption breaks on a narrow portrait phone, where
    // cover-fit against a 16:9 frame crops deep into the subject instead
    // of just the edges. Pure contain-fit fixed that but, combined with
    // the mobile stage now being sized to roughly the frame's own aspect
    // ratio (see doctor-hero.css), left an unnecessary sliver of white on
    // the long axis. MOBILE_FIT_SCALE nudges just past contain — a fixed
    // framing constant, not a scroll-driven zoom — trading a small, safe
    // amount of edge crop (roughly the outer 10%) for a frame that fills
    // its compact stage far closer to edge-to-edge.
    const MOBILE_FIT_SCALE = 1.12;

    function drawCover(image, extraScale) {
      const cw = canvas.width, ch = canvas.height;
      const iw = image.naturalWidth || image.width;
      const ih = image.naturalHeight || image.height;
      if (!iw || !ih) return;
      const scale = isMobileMode
        ? Math.min(cw / iw, ch / ih) * MOBILE_FIT_SCALE
        : Math.max(cw / iw, ch / ih) * (extraScale || 1);
      const dw = iw * scale, dh = ih * scale;
      const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
      ctx.drawImage(image, dx, dy, dw, dh);
    }

    function clamp01(n) {
      return Math.max(0, Math.min(1, n));
    }

    // Camera stays fixed: no zoom, no rotation, no velocity-driven tilt or
    // blur. The only movement allowed is a slow, tiny translate drift
    // (well under the 10-20px ceiling) so the shot doesn't feel like a
    // perfectly static image — everything else about the story is told
    // by the frame sequence and text, never by moving/scaling the camera.
    function applyCameraFeel(progress) {
      const amp = fxEnabled ? 1 : 0.4;
      const driftX = Math.sin(progress * 9.4) * 6 * amp;
      const driftY = Math.cos(progress * 6.7) * 4 * amp;
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

    // Five text beats, each with its own absolute scroll window so text
    // always lands on the matching real content in the footage (e.g. the
    // "Verified" beat begins right as clip 1 shows its Approved card and
    // continues into clip 2's verification badges) rather than dividing
    // the scroll evenly.
    const TEXT_WINDOWS = [
      { inStart: -0.001, inEnd: 0, outStart: 0.065, outEnd: 0.09 },
      { inStart: 0.10, inEnd: 0.14, outStart: 0.27, outEnd: 0.31 },
      { inStart: 0.32, inEnd: 0.36, outStart: 0.48, outEnd: 0.52 },
      { inStart: 0.73, inEnd: 0.77, outStart: 0.885, outEnd: 0.915 },
      { inStart: 0.93, inEnd: 0.965, outStart: null, outEnd: null },
    ];

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
        text.style.transform =
          (isMobileMode ? "translateX(-50%) " : "") +
          "translateY(calc(-50% + " + ty.toFixed(1) + "px))";
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

      render(smoothProgress, velocityPerSec);

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

    // Mobile pin duration is a fixed pixel distance, not tied to the
    // section's own CSS height. The mobile stage is now compact (sized to
    // the frame's aspect ratio, not 100dvh — see doctor-hero.css), so
    // "end: bottom bottom" against the section's declared height created
    // a huge dead-scroll gap: the pin held the small stage on screen for
    // far more scroll distance than the story actually needed. ScrollTrigger
    // builds its own pin-spacer sized to whatever `end` resolves to, so the
    // section's mobile height no longer needs to match — it's left at
    // `auto` in CSS and just wraps the compact stage in normal flow.
    const MOBILE_PIN_DISTANCE = 1800;

    const mm = gsap.matchMedia();
    mm.add(
      {
        isDesktop: "(min-width: 901px)",
        isMobile: "(max-width: 900px)",
      },
      (context) => {
        const { isDesktop } = context.conditions;
        isMobileMode = !isDesktop;
        fxEnabled = isDesktop;
        resizeCanvas();

        ScrollTrigger.create({
          trigger: heroSection,
          start: "top top",
          end: isDesktop ? "bottom bottom" : "+=" + MOBILE_PIN_DISTANCE,
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
            render(rawProgress, 0);
          },
        });
      }
    );

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
})();
