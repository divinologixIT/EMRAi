/* ============================================================
   Divinexa — Cinematic Scroll Hero
   Scroll position drives the story timeline across 7 scenes.
   GSAP ScrollTrigger pins the stage and scrubs a pre-extracted frame
   sequence (drawn to canvas) + crossfade + text reveal from scroll —
   frame lookups are instant (no video seek/decode), so the scrub
   tracks the scrollbar exactly, on BOTH desktop and mobile.
   gsap.matchMedia() swaps a few performance/scroll-distance knobs
   between the two (see initPinnedExperience) — the pin, canvas frame
   sequence, and scroll logic itself is identical on every device.
   Fallback (stacked autoplay video, no ScrollTrigger) is used only
   for prefers-reduced-motion or when GSAP/ScrollTrigger failed to
   load — never based on screen width alone.
   ============================================================ */
(() => {
  "use strict";

  const heroSection = document.getElementById("cineHero");
  const fallbackSection = document.getElementById("cineFallback");
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

    const scenes = Array.from(fallbackSection.querySelectorAll(".cine-fallback-scene"));
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
          const video = scene.querySelector(".cine-fallback-video");
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
    const video = scene.querySelector(".cine-fallback-video");
    if (video && !video.src && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  }

  /* ---------------- Pinned, scroll-scrubbed experience (desktop + mobile) ---------------- */

  function initPinnedExperience() {
    fallbackSection.hidden = true;
    gsap.registerPlugin(ScrollTrigger);

    // Stops ScrollTrigger's own internal auto-refresh from firing on the
    // height-only viewport changes caused by the address bar showing/hiding
    // on mobile browsers — that spurious "resize" was what broke the pin.
    ScrollTrigger.config({ ignoreMobileResize: true });

    const SCENE_COUNT = 7;
    const FRAMES_PER_SCENE = 240; // native ~24fps over each 10s source clip (was 72 sampled frames)
    const CROSS = 0.15;

    // Relative scroll length per scene — identical on desktop and mobile.
    // The actual scroll *distance* in vh differs per device via a CSS media
    // query on .cine-hero (mobile is much shorter), but since ScrollTrigger
    // always reports progress as 0..1 regardless of the pinned section's
    // pixel height, these proportions alone are enough; no device branching
    // needed here.
    const SCENE_WEIGHTS = [6, 2, 2, 2, 2, 2, 2];
    const bounds = [0];
    SCENE_WEIGHTS.forEach((w) => bounds.push(bounds[bounds.length - 1] + w));
    const total = bounds[bounds.length - 1];

    const canvas = document.getElementById("cineCanvas");
    const ctx = canvas.getContext("2d");
    const stage = document.getElementById("cineStage");
    const texts = Array.from(heroSection.querySelectorAll(".cine-scene-text"));
    const dots = Array.from(heroSection.querySelectorAll(".cine-dot"));
    const progressFill = document.getElementById("cineProgressFill");
    const chromeEl = heroSection.querySelector(".cine-chrome");
    const scrollCue = document.getElementById("cineScrollCue");

    // Toggled by gsap.matchMedia() below — read by resizeCanvas() (DPR cap)
    // and applyCameraFeel() (blur/tilt on or off) so the exact same render
    // loop and frame cache serve both breakpoints without duplicating them.
    let isMobileMode = false;
    let fxEnabled = true;

    // frames[sceneIndex] = array of {img, loaded} for that scene's sequence.
    // Shared across breakpoints so switching between them (resize, rotation)
    // never re-fetches frames already in memory.
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
        img.src = "assets/video/hero/frames/scene-" + sceneNumber + "/f" + String(f).padStart(3, "0") + ".webp";
        frames[sceneIndex][f] = entry;
      }
    }
    // Only the current + next scene are ever requested (here, and again from
    // inside render() as progress advances) — the other 5 scenes' 1200 frames
    // stay unrequested until scroll actually reaches them.
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

    // Draws the frame at fractional position `localT` (0..1) within a scene's
    // sequence. Snaps to the single nearest frame rather than cross-blending
    // two different frames — blending two stills of a moving subject creates
    // a soft double-exposure/ghosting look, which reads as blurrier than the
    // source footage. A single frame at full opacity stays sharp.
    // `dollyScale` is baked into the canvas draw itself (not a CSS transform
    // on the whole canvas) so each scene gets its own independent push-in —
    // during a crossfade the outgoing and incoming scenes are each mid-way
    // through their own dolly move at once, which a single shared transform
    // could never express.
    function drawSceneFrame(sceneIndex, localT, opacity, dollyScale) {
      const frameIndex = Math.round(clamp01(localT) * (FRAMES_PER_SCENE - 1));
      const img = frameOrNearest(sceneIndex, frameIndex);
      if (img) {
        ctx.globalAlpha = opacity;
        drawCover(img, dollyScale);
        ctx.globalAlpha = 1;
      }
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      // Mobile GPUs push far fewer pixels comfortably at 60fps; capping DPR
      // lower there keeps the canvas sharp enough while staying responsive.
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

    // Small extra zoom beyond a plain "cover" fit. At most viewport aspect
    // ratios cover-fit only crops the left/right edges and leaves the source
    // frame's top/bottom edges fully visible — including any faint shadow or
    // vignette baked into the original footage right at those edges. This
    // pushes a thin margin off every side so those edges never show.
    // Desktop only — a narrow portrait phone against a 16:9 frame is such an
    // extreme aspect mismatch that cover-fit (even without this extra zoom)
    // crops deep into the doctor/patient/UI, not just the edges, which is
    // exactly the bug this file fixes for mobile below.
    const EDGE_ZOOM = 1.06;
    // How far each scene dollies in across its own runtime (6% push-in) —
    // desktop only, see isMobileMode branch below ("no additional zoom" on
    // mobile per the fitting-mode fix).
    const DOLLY_AMOUNT = 0.06;

    // Desktop: cover-fit (+ the small edge-zoom above) so the frame fills
    // the hero edge to edge, matching the immersive full-bleed composition.
    // Mobile: contain-fit, nudged past 1.0 by a small fixed constant (not
    // a scroll-driven zoom) — the mobile stage is now sized to roughly the
    // frame's own aspect ratio (see cinematic-hero.css), so pure contain
    // left an unnecessary sliver of white on the long axis. This trades a
    // small, safe amount of edge crop (roughly the outer 10%) for a frame
    // that fills its compact stage far closer to edge-to-edge, while still
    // never cropping anywhere near as deep as desktop cover-fit would on a
    // portrait phone.
    const MOBILE_FIT_SCALE = 1.12;

    function drawCover(image, extraScale) {
      const cw = canvas.width, ch = canvas.height;
      const iw = image.naturalWidth || image.width;
      const ih = image.naturalHeight || image.height;
      if (!iw || !ih) return;
      const scale = isMobileMode
        ? Math.min(cw / iw, ch / ih) * MOBILE_FIT_SCALE
        : Math.max(cw / iw, ch / ih) * EDGE_ZOOM * (extraScale || 1);
      const dw = iw * scale, dh = ih * scale;
      const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
      ctx.drawImage(image, dx, dy, dw, dh);
    }

    function clamp01(n) {
      return Math.max(0, Math.min(1, n));
    }

    function clamp(n, lo, hi) {
      return Math.max(lo, Math.min(hi, n));
    }

    // Global camera feel applied to the whole canvas element via GPU-friendly
    // CSS transform/filter (never touches layout): a slow organic drift so
    // the shot never feels perfectly static, a velocity-driven bank/pitch so
    // fast scrolling reads as the camera swinging through the scene, and a
    // matching motion-blur that sharpens back up the instant scrolling eases.
    // On mobile (fxEnabled=false) the expensive blur filter is dropped
    // entirely and drift/tilt are cut to a fraction — GPU-transform-only,
    // no filter compositing pass, keeps the canvas sharp and responsive.
    function applyCameraFeel(progress, velocityPerSec) {
      if (!fxEnabled) {
        const driftX = Math.sin(progress * 9.4) * 2;
        const driftY = Math.cos(progress * 6.7) * 1.2;
        canvas.style.transform = "translate3d(" + driftX.toFixed(2) + "px," + driftY.toFixed(2) + "px,0)";
        canvas.style.filter = "none";
        return;
      }
      const driftX = Math.sin(progress * 9.4) * 5;
      const driftY = Math.cos(progress * 6.7) * 3;
      const tilt = clamp(velocityPerSec * 6, -2, 2);
      const pitch = clamp(velocityPerSec * 4.5, -1.4, 1.4);
      canvas.style.transform =
        "translate3d(" + driftX.toFixed(2) + "px," + driftY.toFixed(2) + "px,0) " +
        "rotateX(" + pitch.toFixed(2) + "deg) rotateZ(" + tilt.toFixed(2) + "deg)";
      const blurAmt = Math.min(5, Math.abs(velocityPerSec) * 12);
      canvas.style.filter = blurAmt > 0.12 ? "blur(" + blurAmt.toFixed(2) + "px)" : "none";
    }

    function render(progress, velocityPerSec) {
      lastProgress = progress;
      const scaled = progress * total;

      applyCameraFeel(progress, velocityPerSec || 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < SCENE_COUNT; i++) {
        const sceneStart = bounds[i];
        const sceneEnd = bounds[i + 1];
        const hasPrev = i > 0;
        const hasNext = i < SCENE_COUNT - 1;
        const fadeInStart = hasPrev ? sceneStart - CROSS : sceneStart;
        const fadeOutEnd = hasNext ? sceneEnd + CROSS : sceneEnd;

        let opacity = 0;
        if (scaled >= fadeInStart && scaled <= fadeOutEnd) {
          if (hasPrev && scaled < sceneStart) {
            opacity = clamp01((scaled - fadeInStart) / CROSS);
          } else if (hasNext && scaled > sceneEnd) {
            opacity = 1 - clamp01((scaled - sceneEnd) / CROSS);
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
          const dollyScale = 1 + localT * (isMobileMode ? 0 : DOLLY_AMOUNT);
          drawSceneFrame(i, localT, opacity, dollyScale);
        }
      }

      // The source footage renders on a light-gray studio backdrop, not pure
      // white, so cutting straight into the page's white section below left
      // a visible seam. Dissolve the last stretch of scroll to solid white
      // instead, so the hero hands off to the page seamlessly.
      const FADE_TO_WHITE_START = 0.94;
      if (progress > FADE_TO_WHITE_START) {
        const fadeAlpha = clamp01((progress - FADE_TO_WHITE_START) / (1 - FADE_TO_WHITE_START));
        ctx.globalAlpha = fadeAlpha;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        // The progress dots/bar don't live on the canvas, so they don't
        // dissolve with it — without this they're the one thing still
        // visibly floating over the now-white frame (and briefly over the
        // next section while the unpinned stage's own height scrolls past)
        // right at the handoff. Fade them out over the same stretch.
        if (chromeEl) chromeEl.style.opacity = String(1 - fadeAlpha);
      } else if (chromeEl) {
        chromeEl.style.opacity = "1";
      }

      for (let i = 0; i < SCENE_COUNT; i++) {
        const text = texts[i];
        if (!text) continue;
        const sceneStart = bounds[i];
        const sceneLen = bounds[i + 1] - sceneStart;
        const inStart = sceneStart + 0.06 * sceneLen;
        const inEnd = sceneStart + 0.3 * sceneLen;
        const outStart = sceneStart + 0.74 * sceneLen;
        const outEnd = sceneStart + 0.94 * sceneLen;

        let alpha = 0;
        let ty = 24;
        let blur = 14;

        if (scaled < inStart) {
          alpha = 0; ty = 24; blur = 14;
        } else if (scaled < inEnd) {
          const t = clamp01((scaled - inStart) / (inEnd - inStart));
          alpha = t; ty = 24 * (1 - t); blur = 14 * (1 - t);
        } else if (scaled <= outStart) {
          alpha = 1; ty = 0; blur = 0;
        } else if (scaled <= outEnd) {
          const t = clamp01((scaled - outStart) / (outEnd - outStart));
          alpha = 1 - t; ty = -16 * t; blur = 10 * t;
        } else {
          alpha = 0; ty = -16; blur = 10;
        }

        text.style.opacity = String(alpha);
        text.style.transform =
          (isMobileMode ? "translateX(-50%) " : "") +
          "translateY(calc(-50% + " + ty.toFixed(1) + "px))";
        text.style.filter = blur > 0.05 ? "blur(" + blur.toFixed(1) + "px)" : "none";
      }

      if (progressFill) progressFill.style.width = (progress * 100).toFixed(2) + "%";

      let activeIndex = SCENE_COUNT - 1;
      for (let i = 0; i < SCENE_COUNT; i++) {
        if (scaled < bounds[i + 1]) { activeIndex = i; break; }
      }
      dots.forEach((dot, i) => dot.classList.toggle("is-active", i === activeIndex));

      if (scrollCue) scrollCue.classList.toggle("is-hidden", progress > 0.02);
    }

    render(0, 0);

    // ---- Momentum layer (shared by both breakpoints) --------------------
    // GSAP's own `scrub` easing is switched off (scrub: true = 1:1 with the
    // scrollbar) and replaced with our own requestAnimationFrame loop that
    // lerps toward the raw scroll-derived progress every frame. That's what
    // gives the camera actual momentum/easing with no hard cuts (both
    // forward and in reverse), and it's also where the time-normalized
    // velocity for the dolly-blur/tilt above comes from — normalizing by
    // real elapsed time (not raw per-frame scroll deltas) keeps the effect
    // consistent across refresh rates and across the desktop/mobile switch.
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
        // Reset so the next kick() doesn't compute dt against a stale
        // timestamp from however long the loop sat idle — that was
        // artificially crushing velocity toward zero right after a fast
        // scroll resumed from a settled state.
        lastTime = 0;
      } else {
        rafId = requestAnimationFrame(tick);
      }
    }

    function kick() {
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    // ---- Breakpoint-specific ScrollTrigger (desktop vs mobile) ----------
    // gsap.matchMedia() creates/tears down the ScrollTrigger itself as the
    // viewport crosses 900px (resize or orientation change) — GSAP tracks
    // and auto-reverts anything created inside this callback when its
    // condition stops matching, so there is never more than one pin/trigger
    // alive at once. The shared frame cache, canvas, and momentum loop
    // above are untouched by that swap; only isMobileMode/fxEnabled change,
    // and the callback below re-measures the canvas for the new DPR cap.
    // Mobile pin duration is a fixed pixel distance, not tied to the
    // section's own CSS height. The mobile stage is now compact (sized to
    // the frame's aspect ratio, not 100dvh — see cinematic-hero.css), so
    // "end: bottom bottom" against the section's declared height created
    // a huge dead-scroll gap: the pin held the small stage on screen for
    // far more scroll distance than the 7-scene story actually needed.
    // ScrollTrigger builds its own pin-spacer sized to whatever `end`
    // resolves to, so the section's mobile height no longer needs to
    // match — it's left at `auto` in CSS and just wraps the compact stage
    // in normal flow. Longer than doctor-hero's 1800 / about-hero's 2-scene
    // range since this story has 7 scenes worth of frames and captions to
    // read, not 2-3 — a flat ~1400-2200px here would rush every scene to
    // a fraction of a second each.
    const MOBILE_PIN_DISTANCE = 4000;

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
          pin: "#cineStage",
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

    // ---- Refresh triggers (registered once — not inside matchMedia, so
    // switching breakpoints never adds duplicate listeners) ---------------
    function refreshAll() {
      ScrollTrigger.refresh();
    }

    window.addEventListener("load", refreshAll);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refreshAll);
    }
    window.addEventListener("orientationchange", () => {
      // Give the browser a beat to finish reflowing after rotation before
      // re-measuring; refreshing mid-rotation reads stale dimensions.
      setTimeout(refreshAll, 250);
    });

    // Mobile browsers fire "resize" for address-bar show/hide too (height
    // changes, width doesn't) — ignoreMobileResize above already tells
    // ScrollTrigger's own internal listener to ignore that, and this one
    // mirrors the same rule so *our* refresh doesn't undo it.
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
