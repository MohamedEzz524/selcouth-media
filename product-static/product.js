
/* ---- inline block ---- */

      (function () {
        "use strict";
        if (!window.gsap) return;
        if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduce && window.Lenis) {
          var lenis = new Lenis({
            duration: 1.1,
            easing: function (t) {
              return Math.min(1, 1.001 - Math.pow(2, -10 * t));
            },
            smoothWheel: true,
            touchMultiplier: 1.2,
          });
          if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
          gsap.ticker.add(function (time) {
            lenis.raf(time * 1000);
          });
          gsap.ticker.lagSmoothing(0);
          window.__lenis = lenis;
        }
      })();
    

/* ---- inline block ---- */

      (function () {
        "use strict";
        var section = document.querySelector(".mp");
        if (!section) return;
        var layers = Array.prototype.slice.call(
          section.querySelectorAll(".mp-gallery__layer")
        );
        var dots = Array.prototype.slice.call(
          section.querySelectorAll(".mp-gallery__dot")
        );
        if (layers.length < 2) return;

        var REVEALS = layers.length - 1; // layer 0 is the always-on base
        var reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        var hasGsap = !!window.gsap;
        var hasST = !!window.ScrollTrigger;

        // Apply a continuous progress value p in [0 .. REVEALS].
        // Each non-base layer i reveals (rises up) as p passes (i-1)->i.
        var state = { p: 0 };
        function applyProgress(p) {
          for (var i = 0; i < layers.length; i++) {
            if (i === 0) {
              layers[i].style.clipPath = "inset(0 0 0 0)";
              continue;
            }
            var r = Math.min(1, Math.max(0, p - (i - 1)));
            layers[i].style.clipPath = "inset(" + (1 - r) * 100 + "% 0 0 0)";
          }
          // active dot = the top-most fully/most-revealed layer
          var act = Math.round(Math.min(REVEALS, Math.max(0, p)));
          for (var d = 0; d < dots.length; d++) {
            dots[d].classList.toggle("is-active", d === act);
          }
        }

        var desktopMQ = window.matchMedia("(min-width: 768px)");
        var st = null;
        var autoTimer = null;
        var active = 0;
        var dir = 1;
        var userStopped = false;

        function teardown() {
          if (st) {
            st.kill();
            st = null;
          }
          if (autoTimer) {
            clearInterval(autoTimer);
            autoTimer = null;
          }
          if (hasGsap) gsap.killTweensOf(state);
        }

        /* ---------- desktop: pin + scrub reveal ---------- */
        // Scroll distance each backdrop gets, as a fraction of the viewport.
        // The reveal used to scrub across "bottom bottom", i.e. the section's
        // own length — which is set by the details column. A short details
        // column meant the whole gallery raced past in a few hundred pixels.
        // Now every image costs the same fixed scroll, whatever is beside it.
        var SCROLL_PER_IMAGE = 0.65;
        function revealDistance() {
          return REVEALS * window.innerHeight * SCROLL_PER_IMAGE;
        }

        function setupDesktop() {
          // undo anything the mobile carousel set inline
          for (var i = 0; i < layers.length; i++) {
            layers[i].style.opacity = "";
            layers[i].style.transition = "";
            layers[i].style.zIndex = i + 1; // restore base stack order
          }
          section.style.minHeight = ""; // pinSpacing supplies the scroll room
          if (!hasGsap || !hasST || reduce) {
            applyProgress(reduce ? REVEALS : 0);
            return;
          }
          applyProgress(0);
          // Pin the whole section — gallery AND details — for exactly the
          // reveal budget, so the right column holds still until every
          // backdrop has been stepped through. Past that the pin releases and
          // the page scrolls normally: the details column moves on while the
          // gallery keeps its place via CSS position:sticky.
          st = ScrollTrigger.create({
            trigger: section,
            start: "top top",
            end: function () {
              return "+=" + revealDistance();
            },
            pin: true,
            pinSpacing: true,
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: function (self) {
              applyProgress(self.progress * REVEALS);
            },
            onRefresh: function (self) {
              applyProgress(self.progress * REVEALS);
            },
          });
        }

        /* ---------- mobile: per-slide clip-path WIPE + arrows ----------
           Horizontal wipe (desktop's scrub stays vertical): the incoming
           backdrop lifts on top and wipes across in the direction of travel —
           next comes in from the right, prev from the left. Self-contained
           per step, so nothing accumulates and looping/reversing never
           "unwinds".
           Clicks are QUEUED, not applied instantly: pressing an arrow while
           a wipe is running just adds a step that plays when the current one
           finishes, so mashing plays each wipe in order with no snap/jump. */
        var busy = false;
        var queued = 0;

        // r = 0 fully hidden, r = 1 fully shown. Insetting the leading edge
        // means the new image is uncovered from that side.
        function wipeClip(dir, r) {
          var v = (1 - r) * 100;
          return dir > 0
            ? "inset(0 0 0 " + v + "%)" // next: reveal from the right
            : "inset(0 " + v + "% 0 0)"; // prev: reveal from the left
        }

        function renderWipe(cur, old, dir, done) {
          // z-order (all below the bottle at z:10): incoming on top, the
          // outgoing fully shown just beneath, the rest at base.
          for (var i = 0; i < layers.length; i++) {
            layers[i].style.zIndex = i === cur ? 8 : i === old ? 7 : 1;
          }
          layers[old].style.clipPath = "inset(0 0 0 0)"; // stays put behind
          layers[cur].style.clipPath = wipeClip(dir, 0); // hidden → wipe across
          for (var d = 0; d < dots.length; d++) {
            dots[d].classList.toggle("is-active", d === cur);
          }
          if (hasGsap && !reduce) {
            state.r = 0;
            gsap.to(state, {
              r: 1,
              duration: 0.7,
              ease: "power2.inOut",
              overwrite: true,
              onUpdate: function () {
                layers[cur].style.clipPath = wipeClip(dir, state.r);
              },
              onComplete: done,
            });
          } else {
            layers[cur].style.clipPath = "inset(0 0 0 0)";
            done();
          }
        }

        // play one queued step, then chain to the next when it settles
        function pump() {
          if (busy || queued === 0) return;
          var dir = queued > 0 ? 1 : -1;
          queued -= dir;
          var old = active;
          active = (active + dir + layers.length) % layers.length;
          busy = true;
          renderWipe(active, old, dir, function () {
            busy = false;
            pump();
          });
        }

        function requestStep(dir) {
          queued += dir;
          var cap = layers.length - 1; // bound the backlog (no runaway loops)
          if (queued > cap) queued = cap;
          if (queued < -cap) queued = -cap;
          pump();
        }

        function stopAuto() {
          userStopped = true;
          if (autoTimer) {
            clearInterval(autoTimer);
            autoTimer = null;
          }
        }
        function setupMobile() {
          active = 0;
          busy = false;
          queued = 0;
          userStopped = false;
          section.style.minHeight = ""; // desktop-only scroll budget
          // base state: layer 0 shown on top, the rest hidden below it
          for (var i = 0; i < layers.length; i++) {
            layers[i].style.opacity = "";
            layers[i].style.transition = ""; // gsap drives the wipe
            layers[i].style.zIndex = i === 0 ? 8 : 1;
            // parked off to the right, matching the default (next) direction
            layers[i].style.clipPath =
              i === 0 ? "inset(0 0 0 0)" : "inset(0 0 0 100%)";
          }
          for (var d = 0; d < dots.length; d++) {
            dots[d].classList.toggle("is-active", d === 0);
          }

          var prev = section.querySelector(".mp-gallery__arrow--prev");
          var next = section.querySelector(".mp-gallery__arrow--next");
          if (prev)
            prev.onclick = function () {
              stopAuto();
              requestStep(-1);
            };
          if (next)
            next.onclick = function () {
              stopAuto();
              requestStep(1);
            };

          if (reduce) return;
          autoTimer = setInterval(function () {
            if (!userStopped) requestStep(1);
          }, 3600);
        }

        function apply() {
          teardown();
          if (desktopMQ.matches) setupDesktop();
          else setupMobile();
          if (hasST) ScrollTrigger.refresh();
        }

        apply();
        if (desktopMQ.addEventListener)
          desktopMQ.addEventListener("change", apply);
        else if (desktopMQ.addListener) desktopMQ.addListener(apply);

        // Recompute pin distance after late layout shifts settle.
        if (hasST) {
          if (document.fonts && document.fonts.ready)
            document.fonts.ready.then(function () {
              ScrollTrigger.refresh();
            });
          window.addEventListener("load", function () {
            ScrollTrigger.refresh();
          });
        }
      })();
    

/* ---- inline block ---- */

      (function () {
        "use strict";
        var BASE_PRICE = (typeof window.MP_BASE_PRICE === "number" ? window.MP_BASE_PRICE : 391.3);
        function selLbl(ar, en) { return window.SelLang === "ar" ? ar : en; }
        // Active-currency symbol. The amount is already converted server-side
        // (product.price re-renders on currency change), so only the symbol
        // needs to follow the shopper's currency — not stay pinned to ر.س.
        function selCur() {
          var c = window.SEL_CURRENCY || "";
          try { if (!c && window.salla && salla.config && salla.config.get) c = salla.config.get("user.currency_code") || ""; } catch (e) {}
          var ar = window.SelLang === "ar";
          var M = { SAR: ar ? "ر.س" : "SAR", USD: "$", EUR: "€", GBP: "£", AED: ar ? "د.إ" : "AED",
            KWD: ar ? "د.ك" : "KWD", BHD: ar ? "د.ب" : "BHD", QAR: ar ? "ر.ق" : "QAR",
            OMR: ar ? "ر.ع" : "OMR", EGP: ar ? "ج.م" : "EGP", JOD: ar ? "د.أ" : "JOD" };
          return M[c] || c || (ar ? "ر.س" : "SAR");
        }
        function CURRENCY() { return selCur() + " "; }

        // recommended grid: same staggered reveal as the collection page
        var recGrid = document.getElementById("rec-grid");
        if (recGrid) {
          if (
            window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
            !("IntersectionObserver" in window)
          ) {
            recGrid.classList.add("is-in");
          } else {
            var recIO = new IntersectionObserver(
              function (entries) {
                entries.forEach(function (e) {
                  if (e.isIntersecting) {
                    recGrid.classList.add("is-in");
                    recIO.disconnect();
                  }
                });
              },
              { threshold: 0.15 }
            );
            recIO.observe(recGrid);
          }
        }
        var priceEl = document.getElementById("mp-price");
        var addPriceEl = document.getElementById("mp-add-price");
        var qty = 1;
        var unit = BASE_PRICE;

        // "Pair it with" quick-add. Ticking a row expands its quantity
        // stepper; the row's line total is added to the button's total only —
        // the product's own price line stays the product's price.
        var PAIR_MAX = 9;
        var pairRows = Array.prototype.slice
          .call(document.querySelectorAll("[data-pair]"))
          .map(function (row) {
            var p = {
              row: row,
              cb: row.querySelector(".mp-pair__cb"),
              meta: row.querySelector("[data-pair-meta]"),
              label: row.querySelector("[data-pair-price-label]"),
              qval: row.querySelector("[data-pair-qval]"),
              minus: row.querySelector("[data-pair-minus]"),
              plus: row.querySelector("[data-pair-plus]"),
              qty: 1,
              unit: parseInt(row.getAttribute("data-price"), 10) || 0,
            };
            return p;
          });

        function paintPair(p) {
          p.row.classList.toggle("is-on", !!(p.cb && p.cb.checked));
          if (p.qval) p.qval.textContent = p.qty;
          if (p.minus) p.minus.disabled = p.qty <= 1;
          if (p.plus) p.plus.disabled = p.qty >= PAIR_MAX;
          // the row label shows the line total for what's selected
          if (p.label) p.label.textContent = CURRENCY() + p.unit * p.qty;
        }

        function pairTotal() {
          return pairRows.reduce(function (sum, p) {
            return sum + (p.cb && p.cb.checked ? p.unit * p.qty : 0);
          }, 0);
        }

        function render() {
          var base = unit * qty;
          if (priceEl) priceEl.textContent = CURRENCY() + base;
          if (addPriceEl) addPriceEl.textContent = CURRENCY() + (base + pairTotal());
        }

        // the shared toggle only swaps [data-ar] markup — these strings are
        // generated here, so repaint them too
        document.addEventListener("sel:lang", function () {
          pairRows.forEach(paintPair);
          render();
        });

        pairRows.forEach(function (p) {
          if (p.cb)
            p.cb.addEventListener("change", function () {
              if (!p.cb.checked) p.qty = 1; // unticking resets the row
              paintPair(p);
              render();
            });
          if (p.minus)
            p.minus.addEventListener("click", function () {
              p.qty = Math.max(1, p.qty - 1);
              paintPair(p);
              render();
            });
          if (p.plus)
            p.plus.addEventListener("click", function () {
              p.qty = Math.min(PAIR_MAX, p.qty + 1);
              paintPair(p);
              render();
            });
          paintPair(p);
        });


        /* quantity: −/+ counter, clamped to 1..MAX */
        var qtyRoot = document.querySelector("[data-qty]");
        if (qtyRoot) {
          var valueEl = qtyRoot.querySelector("[data-qty-value]");
          var minus = qtyRoot.querySelector("[data-qty-minus]");
          var plus = qtyRoot.querySelector("[data-qty-plus]");
          var MIN = 1;
          var MAX = 99;

          var setQty = function (n) {
            qty = Math.max(MIN, Math.min(MAX, n));
            if (valueEl) valueEl.textContent = qty;
            if (minus) minus.disabled = qty <= MIN;
            if (plus) plus.disabled = qty >= MAX;
            render();
          };

          if (minus)
            minus.addEventListener("click", function () {
              setQty(qty - 1);
            });
          if (plus)
            plus.addEventListener("click", function () {
              setQty(qty + 1);
            });
          setQty(1);
        }

        var add = document.getElementById("mp-add");
        function addLabel() { return selLbl("أضف إلى السلة", "Add to Cart"); }
        if (add) {
          var initTxt = add.querySelector(".mp-add__txt");
          if (initTxt) initTxt.textContent = addLabel();
        }
        if (add)
          add.addEventListener("click", function () {
            if (window.salla && salla.cart && window.MP_PRODUCT_ID) {
              try { salla.cart.addItem({ id: window.MP_PRODUCT_ID, quantity: qty }); } catch (e) {}
            }
            add.classList.add("is-added");
            var txt = add.querySelector(".mp-add__txt");
            if (txt) {
              txt.textContent = selLbl("أُضيف ✓", "Added ✓");
              setTimeout(function () {
                txt.textContent = addLabel();
                add.classList.remove("is-added");
              }, 1600);
            }
          });

        // Out of stock → replace the bespoke button with Salla's NATIVE
        // <salla-add-product-button>, which renders the real "notify me when
        // available" flow (incl. guest email) exactly like the Raed theme.
        // Detect via the SDK (same data the native button uses) so it's reliable
        // regardless of which twig stock field is populated.
        (function resolveStock() {
          if (!add || !window.MP_PRODUCT_ID) return;
          function ensureStyle() {
            if (document.getElementById("mp-native-css")) return;
            var s = document.createElement("style"); s.id = "mp-native-css";
            s.textContent = ".mp-add-native{display:block;margin-top:6px}.mp-add-native salla-add-product-button{display:block;width:100%}";
            document.head.appendChild(s);
          }
          function showNative() {
            if (add._nativeShown) return; add._nativeShown = true;
            ensureStyle();
            add.style.display = "none";
            var host = document.createElement("div");
            host.className = "mp-add-native";
            host.innerHTML = '<salla-add-product-button product-id="' + window.MP_PRODUCT_ID + '" fill="solid" width="wide"></salla-add-product-button>';
            add.parentNode.insertBefore(host, add.nextSibling);
          }
          if (window.MP_OUT === true) { showNative(); return; }
          if (window.salla && salla.product && salla.product.getDetails) {
            try {
              salla.product.getDetails(window.MP_PRODUCT_ID, ["notify_availability"]).then(function (res) {
                var p = res && (res.data || res);
                if (p && (p.is_out_of_stock === true || p.is_available === false)) showNative();
              }).catch(function () {});
            } catch (e) {}
          }
        })();

        // tabs: Description / Notes / Ingredients
        var tabLinks = Array.prototype.slice.call(
          document.querySelectorAll(".mp-tab-link")
        );
        var panels = Array.prototype.slice.call(
          document.querySelectorAll(".mp-tab")
        );
        tabLinks.forEach(function (link) {
          link.addEventListener("click", function () {
            var idx = link.getAttribute("data-tab");
            tabLinks.forEach(function (l) {
              var on = l === link;
              l.classList.toggle("is-active", on);
              l.setAttribute("aria-selected", on ? "true" : "false");
            });
            panels.forEach(function (p) {
              p.classList.toggle(
                "is-active",
                p.getAttribute("data-panel") === idx
              );
            });
          });
        });

        render();
      })();
    