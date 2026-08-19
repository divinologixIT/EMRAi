/* ============================================================
   Divinexa — Floating Trial CTA
   Reveals once the user is ~6% through the pinned doctor-hero
   sequence, then stays visible (ScrollTrigger's own progress stays
   clamped at 1 once you've scrolled past the hero, so a single
   threshold check both reveals it early and keeps it shown for the
   rest of the page — no separate "after hero" state needed).
   Purely a fade/translateY on its own element — never touches the
   hero canvas, never scales, never pins.

   home3.html has two mutually-exclusive hero sections (desktop canvas
   vs. mobile video, see doctor-hero.js) — whichever one is display:none
   for the current breakpoint has zero layout height, so timing against
   a single fixed section would break on one side of the 768px split.
   gsap.matchMedia() re-targets this trigger at the same breakpoint.
   ============================================================ */
(() => {
  "use strict";

  const cta = document.getElementById("floatingCta");
  const desktopHero = document.getElementById("dheroSection");
  const mobileHero = document.getElementById("mheroSection");
  if (!cta) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  if (!desktopHero || !mobileHero || !hasGsap) {
    // No hero to time against (or GSAP unavailable) — just show it.
    cta.classList.add("is-visible");
    return;
  }

  if (reduceMotion) {
    cta.classList.add("is-visible");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const REVEAL_AT = 0.06;
  const mm = gsap.matchMedia();

  mm.add("(min-width: 769px)", () => {
    ScrollTrigger.create({
      trigger: desktopHero,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        cta.classList.toggle("is-visible", self.progress >= REVEAL_AT);
      },
    });
  });

  mm.add("(max-width: 768px)", () => {
    // Must track the same viewport-relative distance as the mobile hero's
    // own ScrollTrigger (doctor-hero.js initMobileExperience) or this
    // reveal threshold drifts out of sync with it across phone sizes.
    ScrollTrigger.create({
      trigger: mobileHero,
      start: "top top",
      end: () => "+=" + window.innerHeight * 3.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        cta.classList.toggle("is-visible", self.progress >= REVEAL_AT);
      },
    });
  });
})();
