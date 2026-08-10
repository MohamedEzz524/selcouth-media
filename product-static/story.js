/* ============================================================
   SELCOUTH — OUR STORY (قصتنا) animations. Verbatim from the reference
   about-us.html: Lenis smooth-scroll synced to GSAP + the pinned
   scroll-scrubbed banner (au-s2), plus the section-3 bar-chart reveal.
   Vendor libs (lenis, gsap, ScrollTrigger) are loaded before this file.
   ============================================================ */
(function () {
  "use strict";
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Lenis smooth scroll, driven by GSAP's ticker and kept in sync with
  // ScrollTrigger so the pin/scrub never drifts.
  if (!reduce && window.Lenis) {
    var lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.2,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }

  var content = document.querySelector(".au-s2__content");
  if (content) {
    if (reduce) {
      gsap.set(content, { xPercent: -50, yPercent: -50, y: 0 });
    } else {
      // start hidden below the banner's bottom edge, then rise to centred
      var startY = function () {
        return window.innerHeight / 2 + content.offsetHeight / 2 + 10;
      };
      gsap.fromTo(
        content,
        { xPercent: -50, yPercent: -50, y: startY, force3D: true },
        {
          xPercent: -50, yPercent: -50, y: 0, ease: "none", force3D: true,
          scrollTrigger: {
            trigger: ".au-s2",
            start: "top top",
            end: "+=100%",
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      );
      // recompute pin distances after late layout changes settle
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
      }
      window.addEventListener("load", function () { ScrollTrigger.refresh(); });
      var s1video = document.querySelector(".au-s1__video video");
      if (s1video) {
        s1video.addEventListener("loadedmetadata", function () { ScrollTrigger.refresh(); });
      }
    }
  }

  // Section 3 — fill the bars once the panel scrolls into view.
  (function () {
    var right = document.querySelector(".au-s3__right");
    if (!right) return;
    if (reduce || !("IntersectionObserver" in window)) { right.classList.add("is-in"); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { right.classList.add("is-in"); io.disconnect(); }
      });
    }, { threshold: 0.25 });
    io.observe(right);
    // safety: reveal after 1.5s no matter what
    setTimeout(function () { right.classList.add("is-in"); }, 1500);
  })();
})();
