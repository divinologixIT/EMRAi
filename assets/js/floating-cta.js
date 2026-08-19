/* ============================================================
   Divinexa — Floating Trial CTA
   Reveals once the user is ~6% through the pinned doctor-hero
   sequence, then stays visible (ScrollTrigger's own progress stays
   clamped at 1 once you've scrolled past the hero, so a single
   threshold check both reveals it early and keeps it shown for the
   rest of the page — no separate "after hero" state needed).
   Purely a fade/translateY on its own element — never touches the
   hero canvas, never scales, never pins.
   ============================================================ */
(() => {
  "use strict";

  const cta = document.getElementById("floatingCta");
  const heroSection = document.getElementById("dheroSection");
  if (!cta) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  if (!heroSection || !hasGsap) {
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
  ScrollTrigger.create({
    trigger: heroSection,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      cta.classList.toggle("is-visible", self.progress >= REVEAL_AT);
    },
  });
})();
