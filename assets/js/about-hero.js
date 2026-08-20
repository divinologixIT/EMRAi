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
  const mobileScrollSection = document.getElementById("aboutMobileScroll");
  const siteHeader = document.querySelector(".site-header.scroll-hero-header");
  if (!heroSection || !fallbackSection) return;

  const setHeroHeaderActive = (active) => {
    siteHeader?.classList.toggle("hero-active", Boolean(active));
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const isNarrow = window.matchMedia("(max-width: 900px)").matches;
  // Separate, tighter breakpoint than the tablet-gap `isNarrow` (900px)
  // above — this is the premium scrubbed video experience; 769-900px
  // (small tablets) still gets the older non-scrubbed stacked fallback.
  const isMobileScrollBreakpoint = mobileScrollSection && window.matchMedia("(max-width: 768px)").matches;

  // One-time routing decision, same as the rest of this file (no
  // reactive hand-off between these three modes on resize — matches the
  // existing canvas/fallback split's own behavior, not a new limitation).
  if (reduceMotion || !hasGsap) {
    initFallback();
  } else if (isMobileScrollBreakpoint) {
    heroSection.hidden = true;
    initMobileScrollVideos();
  } else if (isNarrow) {
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

  /* ---------------- Mobile (<=768px): premium white-based video scrub ---------------- */
  // One continuous virtual timeline (about1 + about2's real durations
  // summed), a single ScrollTrigger, and a single RAF smoothing loop —
  // same architecture as the home page's mobile doctor-journey hero (see
  // doctor-hero.js initMobileExperience) but simplified to 2 clips / 1
  // transition and entirely white-based per this section's own spec (no
  // black anywhere; an unpainted/unready video just shows the white
  // background underneath it, which is the deliberate safe fallback).
  function initMobileScrollVideos() {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add("(max-width: 768px)", () => {
      const section = mobileScrollSection;
      const stage = document.getElementById("aboutMobileStage");
      const v1 = document.getElementById("about-video-1");
      const v2 = document.getElementById("about-video-2");
      const bottomBlend = document.getElementById("aboutVideoBottomBlend");
      if (!section || !stage || !v1 || !v2) return;

      const videos = [v1, v2];
      const SRC = ["assets/video/about/about1.mp4", "assets/video/about/about2.mp4"];
      // Fractions of the total virtual duration (0-46% about1, 46-54%
      // crossfade, 54-100% about2) — not a fixed-second window — per spec.
      const TRANSITION_START = 0.46;
      const TRANSITION_END = 0.54;
      const EASE = gsap.parseEase("power1.inOut");
      // Bottom white dissolve is present at its CSS baseline opacity (.82)
      // throughout — both clips' own light-grey studio floor otherwise
      // reads as a hard edge at every scroll position, not just the end.
      // This only strengthens it slightly over the final stretch, right
      // before the pin releases, matching the desktop hero's own
      // end-of-scroll release. Computed directly here (no tween object),
      // consistent with the rest of this render loop.
      const BLEND_STRENGTHEN_START = 0.92;
      const BLEND_BASELINE_OPACITY = .82;
      const scrollDistance = () => window.innerHeight * 2.5;

      let destroyed = false;
      const ready = [false, false];
      const durations = [0, 0];
      let totalDuration = 0;
      let boundary = 0; // durations[0] — real content boundary used for seeking

      section.hidden = false;

      function primeCompositor(video) {
        video.play().then(() => video.pause()).catch(() => {});
      }

      function waitForMetadata(video) {
        return new Promise((resolve) => {
          if (video.readyState >= 1) { resolve(); return; }
          video.addEventListener("loadedmetadata", resolve, { once: true });
        });
      }

      // The single place currentTime is ever written. Clamps to the
      // video's real decodable duration and skips the write when already
      // within one sub-frame of the target, so a settled clip isn't
      // re-seeked every RAF tick for no reason.
      function safeSeek(video, time, isReady) {
        if (!video || !isReady || video.readyState < 2) return;
        const duration = video.duration;
        if (!Number.isFinite(duration)) return;
        const target = gsap.utils.clamp(0, Math.max(0, duration - 0.04), time);
        if (Math.abs(video.currentTime - target) > 1 / 48) {
          try { video.currentTime = target; } catch (e) { /* not seekable yet */ }
        }
      }

      // src assigned and load() called exactly once per video, up front —
      // never reassigned/reloaded again, never repeatedly seeked to a
      // throwaway "preload" time in the render loop.
      videos.forEach((video, i) => {
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.pause();
        video.addEventListener(
          "loadedmetadata",
          () => { if (!destroyed) { ready[i] = true; durations[i] = video.duration; } },
          { once: true }
        );
        video.src = SRC[i];
        video.load();
      });

      // Computes both videos' opacity for this instant directly from the
      // virtual timeline (no tweens created here) and seeks whichever
      // video(s) are currently visible — both outgoing and incoming
      // during the crossfade window, every call, not once at fade-start.
      function updateSequence(virtualTime) {
        const tStart = TRANSITION_START * totalDuration;
        const tEnd = TRANSITION_END * totalDuration;

        let o1 = 0, o2 = 0;

        if (virtualTime <= tStart) {
          o1 = 1;
          safeSeek(v1, virtualTime, ready[0]);
        } else if (virtualTime < tEnd) {
          const raw = gsap.utils.clamp(0, 1, gsap.utils.mapRange(tStart, tEnd, 0, 1, virtualTime));
          // Never fade about2 in over a frame it hasn't actually decoded
          // yet — hold about1 fully visible until about2 confirms
          // readyState >= 2, so the incoming clip is always either
          // moving or not-yet-shown, never a blank/undecoded gap.
          const v2Ready = ready[1] && v2.readyState >= 2;
          const eased = v2Ready ? EASE(raw) : 0;
          o1 = 1 - eased;
          o2 = eased;
          safeSeek(v1, virtualTime, ready[0]);
          safeSeek(v2, virtualTime - boundary, ready[1]);
        } else {
          // Final leg, including the last stretch where about2 has
          // already reached its own end — safeSeek's own clamp holds it
          // at its last decodable frame (a natural end-of-timeline hold,
          // no extra state needed) before the pin releases.
          o2 = 1;
          safeSeek(v2, virtualTime - boundary, ready[1]);
        }

        v1.style.opacity = o1;
        v2.style.opacity = o2;
      }

      function render(progress) {
        const p = gsap.utils.clamp(0, 1, progress);
        updateSequence(p * totalDuration);

        if (bottomBlend) {
          const t = p > BLEND_STRENGTHEN_START
            ? gsap.utils.mapRange(BLEND_STRENGTHEN_START, 1, 0, 1, p)
            : 0;
          bottomBlend.style.opacity = String(BLEND_BASELINE_OPACITY + t * (1 - BLEND_BASELINE_OPACITY));
        }
      }

      // ---- Touch-following smoothness: ONE smoothing layer. `scrub`
      // below is `true` (no built-in GSAP-side catch-up delay) so this
      // RAF lerp is the only place smoothing happens — stacking a second
      // delay on top of it is what reads as sluggish/disconnected from
      // the finger. See doctor-hero.js for the same fix applied there. --
      let targetProgress = 0;
      let smoothProgress = 0;
      let rafId = null;
      const SMOOTH_FACTOR = 0.16;
      const SETTLE_EPSILON = 0.0004;

      function tick() {
        smoothProgress += (targetProgress - smoothProgress) * SMOOTH_FACTOR;
        render(smoothProgress);

        if (Math.abs(targetProgress - smoothProgress) < SETTLE_EPSILON) {
          smoothProgress = targetProgress;
          render(smoothProgress);
          rafId = null;
          return;
        }
        rafId = requestAnimationFrame(tick);
      }

      function kick() {
        if (destroyed) return;
        if (!rafId) rafId = requestAnimationFrame(tick);
      }

      let scrollTriggerInstance = null;
      function createScrollTrigger() {
        scrollTriggerInstance = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => "+=" + scrollDistance(),
          pin: stage,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => { targetProgress = self.progress; kick(); },
          onRefresh: (self) => {
            targetProgress = self.progress;
            smoothProgress = targetProgress;
            render(smoothProgress);
          },
        });
      }

      // Don't create the ScrollTrigger until both clips' metadata (and
      // therefore real duration) is known — the pinned experience must
      // never go live against an uninitialized video.
      Promise.all(videos.map(waitForMetadata)).then(() => {
        if (destroyed) return;
        durations[0] = v1.duration;
        durations[1] = v2.duration;
        ready[0] = ready[1] = true;
        totalDuration = durations[0] + durations[1];
        boundary = durations[0];

        videos.forEach((video) => primeCompositor(video));
        safeSeek(v1, 0, true);
        safeSeek(v2, 0, true);

        render(0);
        createScrollTrigger();
      });

      // gsap.matchMedia() reverts this automatically when the query
      // stops matching (e.g. rotating a tablet past 768px), but the
      // videos/RAF loop need explicit teardown.
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
        section.hidden = true;
        // No reactive hand-off to the canvas/fallback modes on resize —
        // matches the rest of this file (see the one-time routing check
        // above). Restore the desktop hero's visibility so the page
        // isn't left blank if this does fire; a full reload is the
        // reliable path back into the pinned canvas experience.
        heroSection.hidden = false;
      };
    });
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
