/* ============================================================
   Divinexa — About Us: Mission / Vision Scroll Story
   Scroll position drives the story across 2 clips / 2 text beats.
   GSAP ScrollTrigger pins the stage and scrubs a pre-extracted frame
   sequence (drawn to canvas) + crossfade + text reveal from scroll —
   frame lookups are instant (no video seek/decode), so the scrub
   tracks the scrollbar exactly. Same technique as doctor-hero.js.
   Fallback (stacked autoplay video, no ScrollTrigger) is used for
   prefers-reduced-motion, when GSAP/ScrollTrigger failed to load, OR
   on narrow/mobile viewports — this section's brief explicitly calls
   for a non-scrubbed stacked layout on mobile rather than a lighter
   version of the same pinned canvas experience.
   ============================================================ */
(() => {
  "use strict";

  const heroSection = document.getElementById("aheroSection");
  const fallbackSection = document.getElementById("aheroFallback");
  const siteHeader = document.querySelector(".site-header.scroll-hero-header");
  if (!heroSection || !fallbackSection) return;

  const setHeroHeaderActive = (active) => {
    siteHeader?.classList.toggle("hero-active", Boolean(active));
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const isNarrow = window.matchMedia("(max-width: 900px)").matches;

  if (reduceMotion || !hasGsap || isNarrow) {
    initFallback();
  } else {
    initPinnedExperience();
  }

  /* ---------------- Fallback: mobile / reduced-motion / no GSAP ---------------- */

  function initFallback() {
    setHeroHeaderActive(false);
    heroSection.hidden = true;
    heroSection.style.display = "none";
    fallbackSection.hidden = false;

    const scenes = Array.from(fallbackSection.querySelectorAll(".ahero-fallback-scene"));
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
          const video = scene.querySelector(".ahero-fallback-video");
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
    const video = scene.querySelector(".ahero-fallback-video");
    if (video && !video.src && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  }

  /* ---------------- Pinned, scroll-scrubbed experience (desktop/tablet) ---------------- */

  function initPinnedExperience() {
    fallbackSection.hidden = true;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const SCENE_COUNT = 2;
    const FRAMES_PER_SCENE = 72;
    const CROSS = 0.04; // crossfade window ≈ 46%–54%, centered on the 50% scene boundary

    const bounds = [0, 0.5, 1];
    // Mission holds a fixed camera throughout; Vision is allowed the
    // spec's tiny 1.5% push-in by its own end — never more.
    const DOLLY_BY_SCENE = [0, 0.015];

    const canvas = document.getElementById("aheroCanvas");
    const ctx = canvas.getContext("2d");
    const visual = document.getElementById("aheroVisual");
    const bottomFade = document.getElementById("aheroBottomFade");
    const texts = Array.from(heroSection.querySelectorAll(".ahero-scene-text"));
    const progressFill = document.getElementById("aheroProgressFill");

    const frames = [];
    for (let s = 0; s < SCENE_COUNT; s++) {
      frames.push(new Array(FRAMES_PER_SCENE).fill(null));
    }

    const SCENE_DIRS = ["mission", "vision"];
    let lastProgress = 0;
    const loadedScenes = new Set();
    function ensureLoaded(sceneIndex) {
      if (sceneIndex < 0 || sceneIndex >= SCENE_COUNT || loadedScenes.has(sceneIndex)) return;
      loadedScenes.add(sceneIndex);
      for (let f = 0; f < FRAMES_PER_SCENE; f++) {
        const img = new Image();
        const entry = { img, loaded: false };
        img.onload = () => { entry.loaded = true; render(lastProgress); };
        img.src = "assets/video/about/frames/" + SCENE_DIRS[sceneIndex] + "/f" + String(f).padStart(3, "0") + ".jpg";
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

    // Full-bleed cover fit — the visual is a background layer that always
    // fills the pinned stage edge to edge, never a small image floating
    // inside a larger white container. Source frames are plain unpadded
    // captures of the diorama, so this only ever crops the outer edges.
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
    window.addEventListener("resize", () => {
      resizeCanvas();
      render(lastProgress);
    });

    function clamp01(n) {
      return Math.max(0, Math.min(1, n));
    }

    // Camera stays fixed: no zoom, no rotation, no velocity-driven tilt or
    // blur — only a slow, tiny translate drift so the shot doesn't feel
    // like a perfectly static image. Everything else is told by the
    // frame sequence and text, never by moving/scaling the camera.
    function applyCameraFeel(progress) {
      const driftX = Math.sin(progress * 8.6) * 6;
      const driftY = Math.cos(progress * 6.1) * 4;
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
          const dollyAmount = DOLLY_BY_SCENE[i] || 0;
          const dollyScale = 1 + localT * dollyAmount;
          drawSceneFrame(i, localT, opacity, dollyScale);
        }
      }

      // Over the final stretch, grow the bottom fade so it reads as
      // "almost completely white" right as the pin is about to release,
      // and let the whole visual drift up by a few px — a hint of
      // settling, never a scale/zoom — so the release itself is masked
      // by a scene that's already dissolving into the page background.
      const RELEASE_START = 0.90;
      if (progress > RELEASE_START) {
        const t = clamp01((progress - RELEASE_START) / (1 - RELEASE_START));
        bottomFade.style.height = (34 + t * 30).toFixed(1) + "%";
        bottomFade.style.opacity = String(0.9 + t * 0.1);
        visual.style.transform = "translateY(-" + (t * 10).toFixed(1) + "px)";
      } else {
        bottomFade.style.height = "34%";
        bottomFade.style.opacity = "0.9";
        visual.style.transform = "translateY(0)";
      }
    }

    // Two text beats, each timed to land on real content in its clip:
    // Mission is readable immediately and clears before the crossfade;
    // Vision arrives once the ecosystem shot is established and holds
    // until the very end, leaving the last stretch as a clean, static
    // hold on the finished healthcare ecosystem with no text over it.
    const TEXT_WINDOWS = [
      { inStart: -0.001, inEnd: 0, outStart: 0.40, outEnd: 0.48 },
      { inStart: 0.55, inEnd: 0.62, outStart: 0.90, outEnd: 0.97 },
    ];

    function renderTexts(progress) {
      texts.forEach((text, i) => {
        const w = TEXT_WINDOWS[i];
        if (!w) return;

        let alpha = 0;
        let ty = 25;

        if (progress < w.inStart) {
          alpha = 0; ty = 25;
        } else if (progress < w.inEnd) {
          const t = clamp01((progress - w.inStart) / (w.inEnd - w.inStart));
          alpha = t; ty = 25 * (1 - t);
        } else if (progress <= w.outStart) {
          alpha = 1; ty = 0;
        } else if (progress <= w.outEnd) {
          const t = clamp01((progress - w.outStart) / (w.outEnd - w.outStart));
          alpha = 1 - t; ty = (i === 0 ? -20 : -15) * t;
        } else {
          alpha = 0; ty = i === 0 ? -20 : -15;
        }

        text.style.opacity = String(alpha);
        text.style.transform = "translateY(calc(-50% + " + ty.toFixed(1) + "px))";
        text.classList.toggle("is-interactive", alpha > 0.5);
      });
    }

    function render(progress) {
      lastProgress = progress;
      applyCameraFeel(progress);
      renderScenes(progress);
      renderTexts(progress);
      if (progressFill) progressFill.style.width = (progress * 100).toFixed(2) + "%";
    }

    render(0);

    // ---- Momentum layer: lerps toward the raw scroll-derived progress
    // every frame so frame/text transitions never hard-cut. -------------
    const LERP_FACTOR = 0.12;
    const SETTLE_EPSILON = 0.0003;

    let rawProgress = 0;
    let smoothProgress = 0;
    let rafId = null;

    function tick() {
      smoothProgress += (rawProgress - smoothProgress) * LERP_FACTOR;
      render(smoothProgress);

      if (Math.abs(rawProgress - smoothProgress) < SETTLE_EPSILON) {
        rafId = null;
      } else {
        rafId = requestAnimationFrame(tick);
      }
    }

    function kick() {
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    ScrollTrigger.create({
      trigger: heroSection,
      start: "top top",
      end: "bottom bottom",
      pin: "#aheroStage",
      anticipatePin: 1,
      scrub: 1,
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
        render(rawProgress);
      },
    });

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
