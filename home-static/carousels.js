/* ============================================================
   SELCOUTH — fill the bespoke 3D perfume/sample carousels with LIVE
   category products. Each .pf-carousel[data-category] fetches its
   category via the Salla SDK, builds .pf-card elements (linking to the
   real product.url), injects them, then re-inits the carousel through
   the SelFillCarousel hook exposed by home.js.
   ============================================================ */
(function () {
  // --- i18n + active-currency helpers ------------------------------------
  // window.SelLang / window.SEL_CURRENCY are set by index.twig (server-side,
  // so SEL_CURRENCY already reflects the shopper's chosen currency).
  function selL(ar, en) { return window.SelLang === "ar" ? ar : en; }
  function selCur() {
    var c = window.SEL_CURRENCY || "";
    try { if (!c && window.salla && salla.config && salla.config.get) c = salla.config.get("user.currency_code") || ""; } catch (e) {}
    var ar = window.SelLang === "ar";
    var M = { SAR: ar ? "ر.س" : "SAR", USD: "$", EUR: "€", GBP: "£", AED: ar ? "د.إ" : "AED",
      KWD: ar ? "د.ك" : "KWD", BHD: ar ? "د.ب" : "BHD", QAR: ar ? "ر.ق" : "QAR",
      OMR: ar ? "ر.ع" : "OMR", EGP: ar ? "ج.م" : "EGP", JOD: ar ? "د.أ" : "JOD" };
    return M[c] || c || (ar ? "ر.س" : "SAR");
  }
  function priceText(p) {
    var v = (p.sale_price != null && p.sale_price !== 0) ? p.sale_price : p.price;
    if (v == null) return "";
    // salla.money() returns HTML (an <i class="sicon-sar"> icon) and home.js
    // sets the price via textContent, so it would leak as markup. Format the
    // number ourselves and append the ACTIVE currency symbol (not a fixed ر.س).
    var n = (typeof v === "number") ? v : parseFloat(v);
    if (isNaN(n)) return v + " " + selCur();
    return (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)) + " " + selCur();
  }
  function isOut(p) {
    return p.is_out_of_stock === true || p.is_available === false || p.status === "out" || p.status === "sold";
  }
  function imgOf(p) {
    if (p.image && p.image.url) return p.image.url;
    if (typeof p.image === "string") return p.image;
    if (p.thumbnail) return p.thumbnail;
    if (p.images && p.images[0]) return p.images[0].url || p.images[0];
    return "";
  }
  function buildCard(p, i) {
    var name = p.name || "";
    var desc = p.subtitle || p.promotion_title || "";
    var price = priceText(p);
    var card = document.createElement("div");
    card.className = "pf-card";
    card.setAttribute("data-i", i);
    card.setAttribute("data-id", p.id != null ? p.id : "");
    card.setAttribute("data-status", p.status || "");
    card.setAttribute("data-out", isOut(p) ? "1" : "");
    card.setAttribute("data-href", p.url || "#");
    card.setAttribute("data-name-ar", name);
    card.setAttribute("data-desc-ar", desc);
    card.setAttribute("data-price-ar", price);
    card.setAttribute("data-desc", desc);
    card.setAttribute("data-price", price);
    card.innerHTML =
      '<div class="pf-media"><img class="pf-bottle" src="' + imgOf(p) +
      '" alt="' + name + '" loading="lazy" decoding="async" /></div>' +
      '<div class="pf-name">' + name + "</div>";
    return card;
  }
  function extractProducts(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.products)) return res.data.products;
    if (Array.isArray(res.products)) return res.products;
    return [];
  }
  function fill(root) {
    var cat = root.getAttribute("data-category");
    if (!cat || !window.salla || !salla.product || !salla.product.fetch) return;
    salla.product
      .fetch({ source: "categories", source_value: [Number(cat)], per_page: 12 })
      .then(function (res) {
        var products = extractProducts(res);
        var stage = root.querySelector(".pf-stage");
        if (!stage || !products.length) return;
        stage.innerHTML = "";
        products.forEach(function (p, i) { stage.appendChild(buildCard(p, i)); });
        if (window.SelFillCarousel) window.SelFillCarousel(root);
        wireShop(root);
      })
      .catch(function (e) {
        if (window.console) console.warn("[selcouth] carousel fetch failed for category " + cat, e);
      });
  }

  function activeCard(root) {
    return root.querySelector(".pf-card.is-active") || root.querySelector(".pf-card");
  }

  // Keep the shop button label in sync with the CENTERED card: "add to cart"
  // normally, "notify me" when that card is out of stock. home.js flips
  // .is-active as the carousel rotates, so we observe the stage for it.
  function syncShopLabel(root) {
    var shop = root.querySelector(".pf-shop");
    var txt = shop && shop.querySelector(".pf-shop__txt");
    if (!txt) return;
    var active = activeCard(root);
    var out = active && active.getAttribute("data-out") === "1";
    shop.setAttribute("data-out", out ? "1" : "");
    txt.textContent = out ? selL("أعلمني عند التوفر", "Notify me") : selL("أضف إلى السلة", "Add to Cart");
  }

  // Wire the carousel's button to the CENTERED product. In stock → add to the
  // real Salla cart (with a loading state); out of stock → subscribe the
  // shopper to a back-in-stock notification instead of adding.
  function wireShop(root) {
    var shop = root.querySelector(".pf-shop");
    if (!shop || shop._selWired) return;
    shop._selWired = true;

    syncShopLabel(root);
    var stage = root.querySelector(".pf-stage");
    if (stage && window.MutationObserver) {
      var mo = new MutationObserver(function () { syncShopLabel(root); });
      mo.observe(stage, { attributes: true, subtree: true, attributeFilter: ["class"] });
    }

    shop.addEventListener("click", function () {
      var active = activeCard(root);
      if (!active) return;
      var id = active.getAttribute("data-id");
      if (!id || !window.salla) return;
      var txt = shop.querySelector(".pf-shop__txt");
      var restore = txt ? txt.textContent : "";
      var out = active.getAttribute("data-out") === "1";

      if (shop._busy) return;
      shop._busy = true;
      shop.classList.add("is-loading");
      shop.setAttribute("aria-busy", "true");
      function done() { shop._busy = false; shop.classList.remove("is-loading"); shop.removeAttribute("aria-busy"); }

      if (out) {
        // Back-in-stock subscription (native Salla availability notification).
        var req = (salla.product && salla.product.availabilitySubscribe)
          ? salla.product.availabilitySubscribe(Number(id))
          : Promise.reject();
        req.then(function () {
          if (txt) { txt.textContent = selL("سنُعلمك ✓", "We'll notify you ✓"); setTimeout(function () { syncShopLabel(root); }, 1800); }
        }).catch(function () {
          try { salla.notify && salla.notify.error(selL("تعذّر تسجيل التنبيه", "Couldn't set the alert")); } catch (e) {}
          syncShopLabel(root);
        }).finally(done);
        return;
      }

      salla.cart.addItem({ id: Number(id), quantity: 1 })
        .then(function () { if (txt) { txt.textContent = selL("أُضيف ✓", "Added ✓"); setTimeout(function () { txt.textContent = restore; }, 1500); } })
        .catch(function () {})
        .finally(done);
    });
  }

  // Self-contained loading-spinner style for the shop button (so it doesn't
  // depend on a separate app.css/home.css rebuild).
  function ensureStyle() {
    if (document.getElementById("sel-shop-loading-css")) return;
    var s = document.createElement("style");
    s.id = "sel-shop-loading-css";
    s.textContent =
      ".pf-shop{position:relative}" +
      ".pf-shop.is-loading{pointer-events:none;opacity:.8}" +
      ".pf-shop.is-loading .pf-shop__txt{visibility:hidden}" +
      ".pf-shop.is-loading::after{content:'';position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:sel-shop-spin .6s linear infinite}" +
      "@keyframes sel-shop-spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(s);
  }

  function run() {
    ensureStyle();
    Array.prototype.slice
      .call(document.querySelectorAll(".pf-carousel[data-category]"))
      .forEach(fill);
  }
  if (window.salla && salla.onReady) salla.onReady(run);
  else document.addEventListener("DOMContentLoaded", run);
})();
